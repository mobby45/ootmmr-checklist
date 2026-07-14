using System.IO.Pipes;
using System.Runtime.InteropServices;

namespace Autotracker.Memory;

sealed class PipeMemory : IDisposable
{
    NamedPipeClientStream? _pipe;
    readonly int _pid;
    bool _connected;

    public PipeMemory(int pid) { _pid = pid; }

    [StructLayout(LayoutKind.Sequential)]
    struct MODULEINFO
    {
        public nint lpBaseOfDll;
        public uint SizeOfImage;
        public nint EntryPoint;
    }

    static class Native
    {
        const string K = "kernel32.dll";

        [DllImport(K, SetLastError = true)]
        public static extern nint OpenProcess(uint dwDesiredAccess, bool bInheritHandle, uint dwProcessId);

        [DllImport(K, SetLastError = true)]
        public static extern nint VirtualAllocEx(nint hProcess, nint lpAddress, nuint dwSize, uint flAllocationType, uint flProtect);

        [DllImport(K, SetLastError = true)]
        public static extern bool VirtualFreeEx(nint hProcess, nint lpAddress, nuint dwSize, uint dwFreeType);

        [DllImport(K, SetLastError = true)]
        public static extern bool WriteProcessMemory(nint hProcess, nint lpBaseAddress, byte[] lpBuffer, nuint nSize, out nuint lpNumberOfBytesWritten);

        [DllImport(K, SetLastError = true)]
        public static extern bool ReadProcessMemory(nint hProcess, nint lpBaseAddress, byte[] lpBuffer, nuint nSize, out nuint lpNumberOfBytesRead);

        [DllImport(K, SetLastError = true)]
        public static extern nint CreateRemoteThread(nint hProcess, nint lpThreadAttributes, nuint dwStackSize, nint lpStartAddress, nint lpParameter, uint dwCreationFlags, out nint lpThreadId);

        [DllImport(K, SetLastError = true)]
        public static extern uint WaitForSingleObject(nint hHandle, uint dwMilliseconds);

        [DllImport(K, SetLastError = true)]
        public static extern bool GetExitCodeThread(nint hThread, out uint lpExitCode);

        [DllImport(K, SetLastError = true)]
        public static extern bool CloseHandle(nint hObject);

        [DllImport("psapi.dll", SetLastError = true)]
        public static extern bool EnumProcessModulesEx(nint hProcess, [Out] nint[]? lphModule, uint cb, out uint lpcbNeeded, uint dwFilterFlag);

        [DllImport("psapi.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        public static extern uint GetModuleBaseNameW(nint hProcess, nint hModule, System.Text.StringBuilder lpBaseName, uint nSize);

        [DllImport("psapi.dll", SetLastError = true)]
        public static extern bool GetModuleInformation(nint hProcess, nint hModule, out MODULEINFO lpmodinfo, uint cb);
    }

    static nint FindKernel32InWow64(nint hProcess)
    {
        const uint LIST_MODULES_32BIT = 0x01;

        // Query size
        uint needed;
        if (!Native.EnumProcessModulesEx(hProcess, null, 0, out needed, LIST_MODULES_32BIT))
            return 0;

        uint count = needed / (uint)nint.Size;
        nint[] modules = new nint[count];
        if (!Native.EnumProcessModulesEx(hProcess, modules, needed, out _, LIST_MODULES_32BIT))
            return 0;

        for (int i = 0; i < count; i++)
        {
            if (!Native.GetModuleInformation(hProcess, modules[i], out var info, (uint)Marshal.SizeOf<MODULEINFO>()))
                continue;
            var sb = new System.Text.StringBuilder(260);
            if (Native.GetModuleBaseNameW(hProcess, modules[i], sb, (uint)sb.Capacity) == 0)
                continue;
            if (sb.ToString().Equals("kernel32.dll", StringComparison.OrdinalIgnoreCase))
                return info.lpBaseOfDll;
        }
        return 0;
    }

    static nint FindExport(nint hProcess, nint moduleBase, string exportName)
    {
        byte[] hdr = new byte[0x1000];
        if (!Native.ReadProcessMemory(hProcess, moduleBase, hdr, (nuint)hdr.Length, out _))
            return 0;
        if (hdr[0] != 'M' || hdr[1] != 'Z') return 0;

        uint e_lfanew = BitConverter.ToUInt32(hdr, 0x3C);
        if (e_lfanew > 0xFC) return 0;

        uint sig = BitConverter.ToUInt32(hdr, (int)e_lfanew);
        if (sig != 0x00004550) return 0;

        int optOff = (int)e_lfanew + 24;
        ushort optMagic = BitConverter.ToUInt16(hdr, optOff);
        if (optMagic != 0x10B) return 0;

        uint exportRva = BitConverter.ToUInt32(hdr, optOff + 96);
        if (exportRva == 0) return 0;

        byte[] expBuf = new byte[65536];
        if (!Native.ReadProcessMemory(hProcess, moduleBase + (nint)(long)exportRva, expBuf, (nuint)expBuf.Length, out _))
            return 0;

        uint numNames = BitConverter.ToUInt32(expBuf, 24);
        uint addrOfFuncs = BitConverter.ToUInt32(expBuf, 28);
        uint addrOfNames = BitConverter.ToUInt32(expBuf, 32);
        uint addrOfOrdinals = BitConverter.ToUInt32(expBuf, 36);

        int RvaOff(uint rva) => (int)(rva - exportRva);

        byte[] nameBytes = System.Text.Encoding.ASCII.GetBytes(exportName);
        uint nameLen = (uint)nameBytes.Length;

        for (uint i = 0; i < numNames; i++)
        {
            uint nameRva = BitConverter.ToUInt32(expBuf, RvaOff(addrOfNames) + (int)i * 4);
            ushort ordinal = BitConverter.ToUInt16(expBuf, RvaOff(addrOfOrdinals) + (int)i * 2);

            byte[] ename = new byte[nameLen];
            if (!Native.ReadProcessMemory(hProcess, moduleBase + (nint)(long)nameRva, ename, nameLen, out _))
                continue;
            if (!ename.AsSpan().SequenceEqual(nameBytes))
                continue;

            uint funcRva = BitConverter.ToUInt32(expBuf, RvaOff(addrOfFuncs) + ordinal * 4);
            return moduleBase + (nint)(long)funcRva;
        }

        return 0;
    }

    public bool Inject(string dllPath)
    {
        nint hProcess = Native.OpenProcess(0x1FFFFF, false, (uint)_pid);
        if (hProcess == 0)
        {
            Console.WriteLine($"[pjmembridge] OpenProcess failed ({Marshal.GetLastPInvokeError()})");
            return false;
        }

        try
        {
            nint k32Base = FindKernel32InWow64(hProcess);
            if (k32Base == 0)
            {
                Console.WriteLine("[pjmembridge] Failed to find kernel32.dll in target");
                return false;
            }
            nint loadLibAddr = FindExport(hProcess, k32Base, "LoadLibraryA");
            if (loadLibAddr == 0)
            {
                Console.WriteLine("[pjmembridge] Failed to find LoadLibraryA export");
                return false;
            }

            byte[] pathBytes = System.Text.Encoding.ASCII.GetBytes(dllPath + "\0");
            nint remoteMem = Native.VirtualAllocEx(hProcess, 0, (nuint)pathBytes.Length, 0x1000 | 0x2000, 0x04);
            if (remoteMem == 0)
            {
                Console.WriteLine($"[pjmembridge] VirtualAllocEx failed (err={Marshal.GetLastPInvokeError()})");
                return false;
            }

            try
            {
                if (!Native.WriteProcessMemory(hProcess, remoteMem, pathBytes, (nuint)pathBytes.Length, out _))
                {
                    Console.WriteLine($"[pjmembridge] WriteProcessMemory failed (err={Marshal.GetLastPInvokeError()})");
                    return false;
                }

                nint hThread = Native.CreateRemoteThread(hProcess, 0, 0, loadLibAddr, remoteMem, 0, out _);
                if (hThread == 0)
                {
                    Console.WriteLine($"[pjmembridge] CreateRemoteThread failed (err={Marshal.GetLastPInvokeError()})");
                    return false;
                }

                uint waitResult = Native.WaitForSingleObject(hThread, 10000);
                Native.GetExitCodeThread(hThread, out uint exitCode);
                Native.CloseHandle(hThread);

                if (exitCode == 0)
                    Console.WriteLine($"[pjmembridge] LoadLibraryA returned NULL in remote process (waitResult={waitResult}, dllPath={dllPath})");
                return exitCode != 0;
            }
            finally { Native.VirtualFreeEx(hProcess, remoteMem, 0, 0x8000); }
        }
        finally { Native.CloseHandle(hProcess); }
    }

    public bool Connect(int timeoutMs = 5000)
    {
        if (_connected) return true;
        _pipe = new NamedPipeClientStream(".", $"pjmembridge-{_pid}", PipeDirection.InOut, PipeOptions.None);
        try
        {
            _pipe.Connect(timeoutMs);
            _connected = true;
            return true;
        }
        catch { return false; }
    }

    public byte[]? ReadHost(ulong hostAddress, int size)
    {
        if (_pipe is null || !_connected) return null;
        try
        {
            byte[] req = new byte[12];
            for (int i = 0; i < 8; i++)
                req[i] = (byte)((hostAddress >> (i * 8)) & 0xFF);
            for (int i = 0; i < 4; i++)
                req[8 + i] = (byte)((size >> (i * 8)) & 0xFF);
            _pipe.Write(req, 0, 12);

            byte[] resp = new byte[size];
            int totalRead = 0;
            while (totalRead < size)
            {
                int r = _pipe.Read(resp, totalRead, size - totalRead);
                if (r <= 0) break;
                totalRead += r;
            }
            return totalRead == size ? resp : null;
        }
        catch { return null; }
    }

    public byte[]? ReadN64(uint n64Address, int size, nint rdramBase, nint upperRdramBase, bool isSwapped)
    {
        nint hostBase;
        if (upperRdramBase != 0 && n64Address >= 0x80400000u)
            hostBase = upperRdramBase + (nint)(n64Address & 0x003FFFFF);
        else
            hostBase = rdramBase + (nint)(n64Address & 0x007FFFFF);
        var buf = ReadHost((ulong)(long)hostBase, size);
        if (buf is null || !isSwapped) return buf;
        int alignedLen = buf.Length / 4 * 4;
        for (int i = 0; i < alignedLen; i += 4)
        {
            (buf[i + 0], buf[i + 3]) = (buf[i + 3], buf[i + 0]);
            (buf[i + 1], buf[i + 2]) = (buf[i + 2], buf[i + 1]);
        }
        return buf;
    }

    // CMD 0x01: install/add xflag hooks in PJ64's JIT code.
    // PJ64-EM is 32-bit WOW64, so host addresses fit in 32 bits.
    // rdramBaseLo: lower 32 bits of the RDRAM block host base.
    // extraPairs: additional (ootOff, ootSz, mmOff, mmSz) ranges beyond the first.
    // Returns total hook sites found (0 = JIT not compiled yet, retry later; -1 = pipe error).
    public int InstallHook(uint rdramBaseLo,
                           uint ootOff, ushort ootSz, uint mmOff, ushort mmSz,
                           (uint ootOff, ushort ootSz, uint mmOff, ushort mmSz)[]? extraPairs = null)
    {
        if (_pipe is null || !_connected) return -1;
        try
        {
            int extraCount = extraPairs?.Length ?? 0;
            int payloadLen = 17 + extraCount * 12;   // 1+4+4+2+4+2 = 17 base, 4+2+4+2 = 12 each extra
            byte[] req = new byte[12 + payloadLen];

            for (int i = 0; i < 8; i++) req[i] = 0xFF;   // addr sentinel
            req[8] = (byte)payloadLen; req[9] = 0; req[10] = 0; req[11] = 0;

            int p = 12;
            req[p++] = 0x01;
            void WriteU32(uint v) { for (int i = 0; i < 4; i++) req[p++] = (byte)((v >> (i*8)) & 0xFF); }
            void WriteU16(ushort v) { req[p++] = (byte)(v & 0xFF); req[p++] = (byte)(v >> 8); }

            WriteU32(rdramBaseLo);
            WriteU32(ootOff); WriteU16(ootSz); WriteU32(mmOff); WriteU16(mmSz);
            foreach (var ep in extraPairs ?? [])
            {
                WriteU32(ep.ootOff); WriteU16(ep.ootSz); WriteU32(ep.mmOff); WriteU16(ep.mmSz);
            }

            _pipe.Write(req, 0, req.Length);

            byte[] lenBuf = new byte[4];
            if (_pipe.Read(lenBuf, 0, 4) != 4) return -1;
            int replyLen = lenBuf[0] | (lenBuf[1] << 8) | (lenBuf[2] << 16) | (lenBuf[3] << 24);
            if (replyLen < 1) return -1;
            byte[] data = new byte[replyLen];
            int got = _pipe.Read(data, 0, replyLen);
            return got >= 1 ? data[0] : -1;
        }
        catch { _connected = false; return -1; }
    }

    // CMD 0x02: poll and atomically clear dirty flag.
    // Returns bitmask: bit0 = OoT xflag written since last poll, bit1 = MM xflag written.
    // Returns -1 on pipe error.
    public int PollDirty()
    {
        if (_pipe is null || !_connected) return -1;
        try
        {
            byte[] req = new byte[13];
            for (int i = 0; i < 8; i++) req[i] = 0xFF;   // addr sentinel
            req[8] = 1; req[9] = 0; req[10] = 0; req[11] = 0; // size = 1
            req[12] = 0x02;                                // cmd

            _pipe.Write(req, 0, req.Length);

            byte[] lenBuf = new byte[4];
            if (_pipe.Read(lenBuf, 0, 4) != 4) return -1;
            int replyLen = lenBuf[0] | (lenBuf[1] << 8) | (lenBuf[2] << 16) | (lenBuf[3] << 24);
            if (replyLen < 1) return -1;
            byte[] data = new byte[replyLen];
            int got = _pipe.Read(data, 0, replyLen);
            return got >= 1 ? data[0] : -1;
        }
        catch { _connected = false; return -1; }
    }

    // CMD 0x03: arm the MIPS PC hook inside PJ64-EM's interpreter.
    // ootMipsPc / mmMipsPc: MIPS virtual entry addresses of comboXflagsSetOot / comboXflagsSetMm.
    // Returns 1 if the hook was installed, 0 if the interpreter site was not found, -1 on pipe error.
    public int SetMipsPcHook(uint ootMipsPc, uint mmMipsPc)
    {
        if (_pipe is null || !_connected) return -1;
        try
        {
            // header: [addr=0xFFFF...:8][size=9:4]  payload: [cmd=3:1][oot_pc:4][mm_pc:4]
            byte[] req = new byte[12 + 9];
            for (int i = 0; i < 8; i++) req[i] = 0xFF;
            req[8] = 9; req[9] = 0; req[10] = 0; req[11] = 0;
            req[12] = 0x03;
            req[13] = (byte)(ootMipsPc       & 0xFF); req[14] = (byte)((ootMipsPc >>  8) & 0xFF);
            req[15] = (byte)((ootMipsPc >> 16) & 0xFF); req[16] = (byte)((ootMipsPc >> 24) & 0xFF);
            req[17] = (byte)(mmMipsPc        & 0xFF); req[18] = (byte)((mmMipsPc  >>  8) & 0xFF);
            req[19] = (byte)((mmMipsPc  >> 16) & 0xFF); req[20] = (byte)((mmMipsPc  >> 24) & 0xFF);
            _pipe.Write(req, 0, req.Length);

            byte[] lenBuf = new byte[4];
            if (_pipe.Read(lenBuf, 0, 4) != 4) return -1;
            int replyLen = lenBuf[0] | (lenBuf[1] << 8) | (lenBuf[2] << 16) | (lenBuf[3] << 24);
            if (replyLen < 1) return -1;
            byte[] data = new byte[replyLen];
            int got = _pipe.Read(data, 0, replyLen);
            return got >= 1 ? data[0] : -1;
        }
        catch { _connected = false; return -1; }
    }

    long  _virtualOotCumulative = 0;
    long  _virtualMmCumulative  = 0;

    // CMD 0x04: poll MIPS PC hook event counters and last captured ComboItemQuery* virtual address.
    // New DLL (12-byte reply): counters are cumulative (not cleared).
    // Old DLL  (8-byte reply): counters clear after read (InterlockedExchange) — we
    //   accumulate them locally into _virtualOot/MmCumulative so the caller always
    //   sees a monotonic cumulative value.
    // Returns (-1, -1, 0) on pipe error.
    public (int oot, int mm, uint queryAddr) PollMipsPcEvents()
    {
        if (_pipe is null || !_connected) return (-1, -1, 0);
        try
        {
            byte[] req = new byte[13];
            for (int i = 0; i < 8; i++) req[i] = 0xFF;
            req[8] = 1; req[9] = 0; req[10] = 0; req[11] = 0;
            req[12] = 0x04;
            _pipe.Write(req, 0, req.Length);

            byte[] lenBuf = new byte[4];
            if (_pipe.Read(lenBuf, 0, 4) != 4) return (-1, -1, 0);
            int replyLen = lenBuf[0] | (lenBuf[1] << 8) | (lenBuf[2] << 16) | (lenBuf[3] << 24);
            if (replyLen < 8) return (-1, -1, 0);
            byte[] data = new byte[replyLen];
            int got = 0;
            while (got < replyLen) { int r = _pipe.Read(data, got, replyLen - got); if (r <= 0) break; got += r; }
            if (got < replyLen) return (-1, -1, 0);
            int rawOot = data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24);
            int rawMm  = data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24);
            uint queryAddr = 0;
            if (replyLen >= 12)
                queryAddr = (uint)(data[8] | (data[9] << 8) | (data[10] << 16) | (data[11] << 24));

            if (replyLen < 12)
            {
                // Old DLL: counter clears via InterlockedExchange → raw is delta
                _virtualOotCumulative += rawOot;
                _virtualMmCumulative  += rawMm;
                return ((int)_virtualOotCumulative, (int)_virtualMmCumulative, 0);
            }
            else
            {
                // New DLL: cumulative counter
                _virtualOotCumulative = rawOot;
                _virtualMmCumulative  = rawMm;
                return (rawOot, rawMm, queryAddr);
            }
        }
        catch { _connected = false; return (-1, -1, 0); }
    }

    public void Dispose() => _pipe?.Dispose();
}
