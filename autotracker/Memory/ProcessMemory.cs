using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace Autotracker.Memory;

sealed class ProcessMemory : IDisposable
{
    readonly nint _handle;
    public readonly nint  RdramBase;
    public readonly bool  IsSwapped;         // true = PJ64 stores RDRAM with 32-bit word-swap
    public readonly uint  ComboCtxN64Addr;   // N64 address of gComboCtx, found during scan

    ProcessMemory(nint handle, nint rdramBase, bool isSwapped, uint comboCtxN64Addr)
    {
        _handle          = handle;
        RdramBase        = rdramBase;
        IsSwapped        = isSwapped;
        ComboCtxN64Addr  = comboCtxN64Addr;
    }

    public static ProcessMemory? TryAttach(Process process)
    {
        var handle = WinApi.OpenProcess(
            WinApi.PROCESS_VM_READ | WinApi.PROCESS_QUERY_INFORMATION,
            false,
            process.Id);

        if (handle == 0)
        {
            Console.WriteLine("[autotracker] OpenProcess failed — try running as administrator.");
            return null;
        }

        if (!FindRdramBase(handle, out var rdramBase, out var isSwapped, out var comboCtxN64Addr))
        {
            WinApi.CloseHandle(handle);
            return null;
        }

        Console.WriteLine($"[autotracker] RDRAM base=0x{rdramBase:X}, swapped={isSwapped}, gComboCtx=0x{comboCtxN64Addr:X8}");
        return new ProcessMemory(handle, rdramBase, isSwapped, comboCtxN64Addr);
    }

    // "OoT+MM<3" in normal ASCII byte order.
    static readonly byte[] MagicNormal = "OoT+MM<3"u8.ToArray();

    // Same string stored with 32-bit word-swap (each 4-byte group reversed):
    // "OoT+" → "+ToO", "MM<3" → "3<MM"
    static readonly byte[] MagicSwapped = [ 0x2B, 0x54, 0x6F, 0x4F, 0x33, 0x3C, 0x4D, 0x4D ];

    // Scans all writable committed regions >= 1MB for the magic string.
    // Both normal and 32-bit-word-swapped variants are checked so we work
    // regardless of PJ64's internal RDRAM byte-order mode.
    static bool FindRdramBase(nint handle, out nint rdramBase, out bool isSwapped, out uint comboCtxN64Addr)
    {
        rdramBase        = 0;
        isSwapped        = false;
        comboCtxN64Addr  = 0;

        var mbiSize = (nint)Marshal.SizeOf<MemoryBasicInformation>();
        nint address = 0;
        int regionsChecked = 0;

        while (true)
        {
            var result = WinApi.VirtualQueryEx(handle, address, out var mbi, mbiSize);
            if (result == 0) break;

            var next = mbi.BaseAddress + mbi.RegionSize;

            bool writable = mbi.State == WinApi.MEM_COMMIT
                         && (mbi.Protect & WinApi.PAGE_GUARD)         == 0
                         && (mbi.Protect & WinApi.PAGE_NOACCESS)      == 0
                         && (mbi.Protect & WinApi.PAGE_WRITABLE_MASK) != 0
                         && (long)mbi.RegionSize >= 1 * 1024 * 1024;

            if (writable)
            {
                regionsChecked++;
                long regionSize = (long)mbi.RegionSize;
                Console.WriteLine($"[autotracker] Scanning region base=0x{mbi.BaseAddress:X}, alloc=0x{mbi.AllocationBase:X}, size={regionSize / (1024 * 1024)}MB, prot=0x{mbi.Protect:X}");

                const int chunkSize = 4 * 1024 * 1024;
                long scanned = 0;

                while (scanned < regionSize)
                {
                    int toRead = (int)Math.Min(chunkSize, regionSize - scanned);
                    var chunk = new byte[toRead];
                    if (!WinApi.ReadProcessMemory(handle, mbi.BaseAddress + (nint)scanned, chunk, toRead, out var bytesRead) || bytesRead == 0)
                        break;
                    toRead = bytesRead;

                    foreach (var (magic, swapped) in new[] { (MagicNormal, false), (MagicSwapped, true) })
                    {
                        for (int i = 0; i <= toRead - magic.Length; i++)
                        {
                            bool match = true;
                            for (int j = 0; j < magic.Length; j++)
                                if (chunk[i + j] != magic[j]) { match = false; break; }

                            if (match)
                            {
                                // "OoT+MM<3" appears at least twice in the payload:
                                // once as a .rodata string literal (for memcmp) and once in the
                                // gComboCtx BSS struct (written by Context_Init at runtime).
                                // Distinguish them with two checks:
                                // 1. valid (u32 at +8) must be 0 or 1.
                                // 2. entrance (u32 at +0x10) must NOT be 4 consecutive printable
                                //    ASCII bytes — real entrance values are 0xFFFFFFFF or small
                                //    indices (≤0x1FFF), never readable text.
                                if (i + 0x14 > toRead) continue; // need 20 bytes (magic8 + valid4 + saveIdx4 + entrance4)

                                uint rawValid = swapped
                                    ? BitConverter.ToUInt32(chunk, i + 8)
                                    : (uint)(chunk[i+8] << 24 | chunk[i+9] << 16 | chunk[i+10] << 8 | chunk[i+11]);
                                if (rawValid > 1)
                                {
                                    Console.WriteLine($"[autotracker] Magic at chunk+0x{scanned+i:X} skipped (valid=0x{rawValid:X})");
                                    continue;
                                }

                                // Entropy check on entrance bytes: all printable ASCII = string literal.
                                bool entranceIsAscii = true;
                                for (int k = i + 0x10; k < i + 0x14; k++)
                                    if (chunk[k] < 0x20 || chunk[k] > 0x7E) { entranceIsAscii = false; break; }
                                if (entranceIsAscii)
                                {
                                    Console.WriteLine($"[autotracker] Magic at chunk+0x{scanned+i:X} skipped (entrance looks like ASCII text)");
                                    continue;
                                }

                                // rdramOffset = byte offset from the start of the VirtualAlloc block.
                                long rdramOffset = (mbi.BaseAddress - mbi.AllocationBase) + scanned + i;
                                rdramBase       = mbi.AllocationBase;
                                isSwapped       = swapped;
                                comboCtxN64Addr = (uint)(0x80000000L | rdramOffset);
                                Console.WriteLine($"[autotracker] Magic found ({(swapped ? "byte-swapped" : "normal")}) at rdramOffset=0x{rdramOffset:X} → gComboCtx=0x{comboCtxN64Addr:X8}");
                                return true;
                            }
                        }
                    }

                    scanned += toRead;
                }
            }

            address = next;
            if ((ulong)address >= 0x7FFF_FFFF_0000UL) break;
        }

        Console.WriteLine($"[autotracker] Magic not found after scanning {regionsChecked} writable region(s) >= 1MB.");
        return false;
    }

    // Reads raw bytes from host memory at the RDRAM offset for n64Address.
    // Does NOT un-swap — use Read() for logical N64 byte order.
    byte[]? ReadRaw(uint n64Address, int length)
    {
        var offset = (nint)(n64Address & 0x007FFFFF);
        var buf    = new byte[length];
        if (!WinApi.ReadProcessMemory(_handle, RdramBase + offset, buf, length, out var read) || read != length)
            return null;
        return buf;
    }

    // Reads bytes in N64 logical order. When IsSwapped, un-swaps 32-bit words so
    // callers always receive big-endian N64 bytes regardless of PJ64's storage format.
    public byte[]? Read(uint n64Address, int length)
    {
        if (!IsSwapped)
            return ReadRaw(n64Address, length);

        // Align down to 4-byte boundary, read a padded block, then un-swap each word.
        uint alignedAddr = n64Address & ~3u;
        int  prefix      = (int)(n64Address - alignedAddr);
        int  alignedLen  = ((prefix + length + 3) / 4) * 4;

        var raw = ReadRaw(alignedAddr, alignedLen);
        if (raw is null) return null;

        for (int i = 0; i < raw.Length; i += 4)
        {
            (raw[i + 0], raw[i + 3]) = (raw[i + 3], raw[i + 0]);
            (raw[i + 1], raw[i + 2]) = (raw[i + 2], raw[i + 1]);
        }

        var result = new byte[length];
        Array.Copy(raw, prefix, result, 0, length);
        return result;
    }

    public uint? ReadU32(uint n64Address)
    {
        // ReadRaw gives us the host bytes. With 32-bit word-swap, those bytes are
        // already in little-endian order (no extra reversal needed). Without swap,
        // they are big-endian (N64 native) and need reversal for BitConverter.
        var raw = ReadRaw(n64Address, 4);
        if (raw is null) return null;
        if (!IsSwapped) Array.Reverse(raw);
        return BitConverter.ToUInt32(raw);
    }

    public string? ReadString(uint n64Address, int maxLength)
    {
        var buf = Read(n64Address, maxLength); // un-swapped = N64 logical order
        if (buf is null) return null;
        var end = Array.IndexOf(buf, (byte)0);
        return Encoding.ASCII.GetString(buf, 0, end < 0 ? maxLength : end);
    }

    public void Dispose()
    {
        if (_handle != 0)
            WinApi.CloseHandle(_handle);
    }
}
