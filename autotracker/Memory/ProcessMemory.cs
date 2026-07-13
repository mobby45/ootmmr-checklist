using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace Autotracker.Memory;

sealed class ProcessMemory : IDisposable
{
    readonly nint _handle;
    public readonly nint  RdramBase;        // host address for N64 addrs 0x80000000-0x803FFFFF
    public readonly nint  UpperRdramBase;   // host address for N64 addrs 0x80400000-0x807FFFFF (0 if not found)
    public readonly nint  RomBase;          // host address of PJ64 ROM buffer (0 if not found)
    public readonly bool  IsSwapped;        // true = PJ64 stores RDRAM with 32-bit word-swap
    public readonly uint  ComboCtxN64Addr;  // N64 address of gComboCtx, found during scan

    ProcessMemory(nint handle, nint rdramBase, nint upperRdramBase, nint romBase, bool isSwapped, uint comboCtxN64Addr)
    {
        _handle          = handle;
        RdramBase        = rdramBase;
        UpperRdramBase   = upperRdramBase;
        RomBase          = romBase;
        IsSwapped        = isSwapped;
        ComboCtxN64Addr  = comboCtxN64Addr;
    }

    public static ProcessMemory? TryAttach(Process process)
    {
        var handle = WinApi.OpenProcess(
            WinApi.PROCESS_VM_READ | WinApi.PROCESS_VM_WRITE | WinApi.PROCESS_VM_OPERATION | WinApi.PROCESS_QUERY_INFORMATION,
            false,
            process.Id);

        if (handle == 0)
        {
            Console.WriteLine("[autotracker] OpenProcess failed — try running as administrator.");
            return null;
        }

        if (!FindRdramBase(handle, out var rdramBase, out var upperRdramBase, out var romBase, out var isSwapped, out var comboCtxN64Addr))
        {
            WinApi.CloseHandle(handle);
            return null;
        }

        Console.WriteLine($"[autotracker] RDRAM lower=0x{rdramBase:X}, upper={(upperRdramBase != 0 ? $"0x{upperRdramBase:X}" : "not found")}, rom={(romBase != 0 ? $"0x{romBase:X}" : "not found")}, swapped={isSwapped}, gComboCtx=0x{comboCtxN64Addr:X8}");
        return new ProcessMemory(handle, rdramBase, upperRdramBase, romBase, isSwapped, comboCtxN64Addr);
    }

    // "OoT+MM<3" in normal ASCII byte order.
    static readonly byte[] MagicNormal = "OoT+MM<3"u8.ToArray();

    // Same string stored with 32-bit word-swap (each 4-byte group reversed):
    // "OoT+" → "+ToO", "MM<3" → "3<MM"
    static readonly byte[] MagicSwapped = [ 0x2B, 0x54, 0x6F, 0x4F, 0x33, 0x3C, 0x4D, 0x4D ];


    // Scans all writable committed regions >= 1MB for the magic string.
    // Both normal and 32-bit-word-swapped variants are checked so we work
    // regardless of PJ64's internal RDRAM byte-order mode.
    // PJ64-EM may map N64 RDRAM as TWO separate 4MB VirtualAlloc blocks:
    //   lower (N64 0x80000000-0x803FFFFF) and upper (N64 0x80400000-0x807FFFFF).
    // We locate the lower block via gComboCtx magic, then find the upper block.
    static bool FindRdramBase(nint handle, out nint rdramBase, out nint upperRdramBase, out nint romBase, out bool isSwapped, out uint comboCtxN64Addr)
    {
        rdramBase       = 0;
        upperRdramBase  = 0;
        romBase         = 0;
        isSwapped       = false;
        comboCtxN64Addr = 0;

        var mbiSize = (nint)Marshal.SizeOf<MemoryBasicInformation>();
        nint address = 0;
        int regionsChecked = 0;

        // Known static N64 offsets for gComboCtx — OoT game reads from OOT addr, MM game reads from MM addr.
        // Matches at these offsets are the authoritative RDRAM base; any other match is a fallback.
        long[] staticCtxOffsets =
        [
            N64Addresses.ComboContextOot & 0x7FFFFF, // 0x6584
            N64Addresses.ComboContextMm  & 0x7FFFFF, // 0x98280
        ];

        // ── PASS 1: find the lower RDRAM block via "OoT+MM<3" magic ──
        // Scan ALL regions; prefer a match at a known static address over any other hit.
        // (First-match strategy caused false positives when unrelated memory contained the magic.)
        nint  bestRdramBase       = 0;
        bool  bestSwapped         = false;
        uint  bestComboCtxN64Addr = 0;
        bool  foundStatic         = false; // whether bestX is at a static N64 address

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

                            if (!match) continue;
                            if (i + 0x14 > toRead) continue;

                            long rdramOffset = (mbi.BaseAddress - mbi.AllocationBase) + scanned + i;
                            if (rdramOffset > 0x7FFFFF)
                            {
                                Console.WriteLine($"[autotracker] Magic at 0x{mbi.BaseAddress + scanned + i:X} skipped (rdramOffset=0x{rdramOffset:X} exceeds 8MB)");
                                continue;
                            }

                            uint rawValid = swapped
                                ? BitConverter.ToUInt32(chunk, i + 8)
                                : (uint)(chunk[i+8] << 24 | chunk[i+9] << 16 | chunk[i+10] << 8 | chunk[i+11]);
                            if (rawValid > 1)
                            {
                                Console.WriteLine($"[autotracker] Magic at rdramOff=0x{rdramOffset:X} skipped (valid=0x{rawValid:X})");
                                continue;
                            }

                            bool entranceIsAscii = true;
                            for (int k = i + 0x10; k < i + 0x14; k++)
                                if (chunk[k] < 0x20 || chunk[k] > 0x7E) { entranceIsAscii = false; break; }
                            if (entranceIsAscii)
                            {
                                Console.WriteLine($"[autotracker] Magic at rdramOff=0x{rdramOffset:X} skipped (entrance looks like ASCII)");
                                continue;
                            }

                            bool isStaticAddr = Array.IndexOf(staticCtxOffsets, rdramOffset) >= 0;
                            uint candidateN64 = (uint)(0x80000000L | rdramOffset);
                            Console.WriteLine($"[autotracker] Magic ({(swapped ? "swapped" : "normal")}) at rdramOff=0x{rdramOffset:X} gComboCtx=0x{candidateN64:X8} static={isStaticAddr}");

                            // Update best candidate: static address beats any non-static.
                            if (!foundStatic || isStaticAddr)
                            {
                                bestRdramBase       = mbi.AllocationBase;
                                bestSwapped         = swapped;
                                bestComboCtxN64Addr = candidateN64;
                                if (isStaticAddr) foundStatic = true;
                            }
                        }
                    }

                    scanned += toRead;
                }
            }

            address = next;
            if ((ulong)address >= 0x7FFF_FFFF_0000UL) break;
        }

        if (bestRdramBase == 0)
        {
            Console.WriteLine($"[autotracker] Magic not found after scanning {regionsChecked} writable region(s) >= 1MB.");
            return false;
        }

        if (!foundStatic)
            Console.WriteLine($"[autotracker] Warning: gComboCtx at non-static address 0x{bestComboCtxN64Addr:X8} — may be a false positive.");

        rdramBase       = bestRdramBase;
        isSwapped       = bestSwapped;
        comboCtxN64Addr = bestComboCtxN64Addr;
        Console.WriteLine($"[autotracker] Magic found ({(isSwapped ? "byte-swapped" : "normal")}) → gComboCtx=0x{comboCtxN64Addr:X8} rdramBase=0x{rdramBase:X}");

        // ── PASS 2: find the upper RDRAM block (N64 0x80400000-0x807FFFFF) ──
        // PJ64-EM may commit the upper half lazily in a separate region at lowerBase+0x400000
        // (same VirtualAlloc reservation), or in a completely separate allocation.
        // Strategy:
        //   A) Quick check: look for a committed region at lowerBase + 0x400000.
        //   B) Fallback: scan all other large committed regions for "ZELDA3" at offset
        //      +0x24 from 16-byte-aligned positions (identifies the payload gMmSave copy).
        upperRdramBase = TryFindUpperRdram(handle, rdramBase, isSwapped, mbiSize);
        if (upperRdramBase != 0)
            Console.WriteLine($"[autotracker] Upper RDRAM block found at host 0x{upperRdramBase:X}");
        else
            Console.WriteLine("[autotracker] Upper RDRAM block not yet committed — payload BSS unavailable until game loads.");

        // PASS 3: find the ROM buffer (large allocation starting with the N64 ROM header).
        // The first 4 bytes of an N64 ROM are 0x80 0x37 0x12 0x40 (PI Domain 1 register init).
        // With 32-bit word-swap: 0x40 0x12 0x37 0x80.
        // We look for any committed region ≥ 32MB that begins with this header
        // (but is neither the lower nor upper RDRAM block).
        var rom = TryFindRomBuffer(handle, rdramBase, upperRdramBase, isSwapped, mbiSize);
        if (rom != 0)
            Console.WriteLine($"[autotracker] ROM buffer found at host 0x{rom:X}");
        else
            Console.WriteLine("[autotracker] ROM buffer not found — override table will be unavailable.");

        romBase = rom;
        return true;
    }

    // Tries to locate the host block for N64 RDRAM upper half (0x80400000-0x807FFFFF).
    // PJ64-EM may commit the upper 4MB in the same VirtualAlloc reservation as the lower block
    // (at lowerBase+0x400000) or in a completely separate allocation.
    static nint TryFindUpperRdram(nint handle, nint lowerRdramBase, bool isSwapped, nint mbiSize)
    {
        // Quick-check A: try ReadProcessMemory directly at lowerBase+0x400000.
        // VirtualQueryEx may report it as MEM_RESERVE even if PJ64-EM has mapped it via
        // AWE, large pages, or other mechanisms that make it readable.
        nint directCandidate = lowerRdramBase + 0x400000;
        {
            var probe = new byte[16];
            if (WinApi.ReadProcessMemory(handle, directCandidate, probe, 16, out var probeRead) && probeRead == 16)
            {
                Console.WriteLine($"[autotracker] Upper RDRAM: direct read at 0x{directCandidate:X} succeeded — using as upper base");
                return directCandidate;
            }
        }

        // Fallback B: scan all writable committed regions EXCEPT the lower RDRAM region
        // for "ZELDA3" at MmSave.info.newf (offset +0x24 from 16-byte aligned positions).
        // We skip only the specific committed region that IS the lower block (base == lowerRdramBase),
        // not the entire VirtualAlloc — other committed regions in the same allocation (e.g. the
        // upper 4MB at lowerBase+0x400000 if separately committed) must be scanned.
        //
        // Pattern matching accounts for 32-bit word-swap:
        //   Normal:  chunk[i+0x24..0x29] == "ZELDA3"
        //   Swapped: chunk[i+0x24..0x27] == [D,L,E,Z], chunk[i+0x2A] == '3', chunk[i+0x2B] == 'A'
        //            (bytes 0x28-0x29 hold variable save fields and are not checked)
        nint addr = 0;
        while (true)
        {
            var result = WinApi.VirtualQueryEx(handle, addr, out var mbi, mbiSize);
            if (result == 0) break;

            var next = mbi.BaseAddress + mbi.RegionSize;

            bool isLowerRegion = mbi.BaseAddress == lowerRdramBase; // skip the specific lower RDRAM region
            bool writable = mbi.State == WinApi.MEM_COMMIT
                         && (mbi.Protect & WinApi.PAGE_GUARD)         == 0
                         && (mbi.Protect & WinApi.PAGE_NOACCESS)      == 0
                         && (mbi.Protect & WinApi.PAGE_WRITABLE_MASK) != 0
                         && (long)mbi.RegionSize >= 1 * 1024 * 1024;

            if (writable && !isLowerRegion)
            {
                long regionSize = (long)mbi.RegionSize;
                int toRead = (int)Math.Min(4 * 1024 * 1024L, regionSize);
                var chunk = new byte[toRead];
                if (WinApi.ReadProcessMemory(handle, mbi.BaseAddress, chunk, toRead, out var bytesRead) && bytesRead >= 0x2C)
                {
                    int limit = (int)bytesRead;
                    for (int i = 0; i + 0x2C <= limit; i += 16)
                    {
                        bool match;
                        if (isSwapped)
                        {
                            // First word at 0x24: [D,L,E,Z]
                            match = chunk[i+0x24] == 0x44 && chunk[i+0x25] == 0x4C
                                 && chunk[i+0x26] == 0x45 && chunk[i+0x27] == 0x5A
                                 // Bytes 0x28-0x29 skipped (variable save fields)
                                 && chunk[i+0x2A] == 0x33 && chunk[i+0x2B] == 0x41;
                        }
                        else
                        {
                            match = chunk[i+0x24] == 0x5A && chunk[i+0x25] == 0x45
                                 && chunk[i+0x26] == 0x4C && chunk[i+0x27] == 0x44
                                 && chunk[i+0x28] == 0x41 && chunk[i+0x29] == 0x33;
                        }

                        if (match)
                        {
                            Console.WriteLine($"[autotracker] Upper RDRAM: 'ZELDA3' at region 0x{mbi.BaseAddress:X}+0x{i:X} → UpperRdramBase=0x{mbi.BaseAddress:X} (gMmSave≈N64 0x{0x80400000+i:X8})");
                            return mbi.BaseAddress;
                        }
                    }
                }
            }

            addr = next;
            if ((ulong)addr >= 0x7FFF_FFFF_0000UL) break;
        }

        return 0;
    }

    // Finds the PJ64 ROM buffer by looking for the N64 ROM header (PI Domain 1 register = 0x80371240)
    // at offset 0 of large committed regions (>= 32MB).
    // The ROM buffer holds the entire N64 ROM image and uses the same 32-bit word-swap as RDRAM.
    static nint TryFindRomBuffer(nint handle, nint lowerRdramBase, nint upperRdramBase, bool isSwapped, nint mbiSize)
    {
        // N64 ROM header first 4 bytes (PI Domain 1 register): 0x80 0x37 0x12 0x40 (big-endian)
        // With 32-bit word-swap: 0x40 0x12 0x37 0x80
        byte b0, b1, b2, b3;
        if (isSwapped) { b0 = 0x40; b1 = 0x12; b2 = 0x37; b3 = 0x80; }
        else           { b0 = 0x80; b1 = 0x37; b2 = 0x12; b3 = 0x40; }

        nint addr = 0;
        while (true)
        {
            var result = WinApi.VirtualQueryEx(handle, addr, out var mbi, mbiSize);
            if (result == 0) break;
            var next = mbi.BaseAddress + mbi.RegionSize;

            bool candidate = mbi.State == WinApi.MEM_COMMIT
                          && (mbi.Protect & WinApi.PAGE_NOACCESS) == 0
                          && (long)mbi.RegionSize >= 32L * 1024 * 1024  // >= 32MB
                          && mbi.BaseAddress != lowerRdramBase
                          && mbi.BaseAddress != upperRdramBase;

            if (candidate)
            {
                var probe = new byte[4];
                if (WinApi.ReadProcessMemory(handle, mbi.BaseAddress, probe, 4, out var r) && r == 4
                    && probe[0] == b0 && probe[1] == b1 && probe[2] == b2 && probe[3] == b3)
                {
                    return mbi.BaseAddress;
                }
            }

            addr = next;
            if ((ulong)addr >= 0x7FFF_FFFF_0000UL) break;
        }
        return 0;
    }

    // Reads bytes from the ROM buffer at a given ROM file offset, un-swapping if needed.
    // romOffset is the raw byte offset within the ROM file (i.e. e.pstart from the DMA table,
    // which equals sComboOverridesDevAddr & ~PI_DOM1_ADDR2).
    public byte[]? ReadRom(uint romOffset, int length)
    {
        if (RomBase == 0) return null;

        if (!IsSwapped)
        {
            var buf = new byte[length];
            if (WinApi.ReadProcessMemory(_handle, RomBase + (nint)romOffset, buf, length, out var r) && r == length)
                return buf;
            return null;
        }

        // Same 32-bit word-swap de-interleaving as Read() / ReadRaw().
        uint alignedOff = romOffset & ~3u;
        int  prefix     = (int)(romOffset - alignedOff);
        int  alignedLen = ((prefix + length + 3) / 4) * 4;

        var raw = new byte[alignedLen];
        if (!WinApi.ReadProcessMemory(_handle, RomBase + (nint)alignedOff, raw, alignedLen, out var rr) || rr == 0)
            return null;

        for (int i = 0; i < raw.Length; i += 4)
        {
            if (i + 3 < raw.Length)
                Array.Reverse(raw, i, 4);
        }

        var result = new byte[length];
        Array.Copy(raw, prefix, result, 0, length);
        return result;
    }

    // Reads raw bytes from host memory at the RDRAM offset for n64Address.
    // Does NOT un-swap — use Read() for logical N64 byte order.
    //
    // N64 RDRAM may be split into two separate host blocks:
    //   lower (N64 0x80000000-0x803FFFFF) → RdramBase
    //   upper (N64 0x80400000-0x807FFFFF) → UpperRdramBase (if found)
    // Each chunk in the 64KB fallback loop is routed independently so cross-boundary
    // reads (e.g. ReadAllRdram) work correctly.
    public byte[]? ReadRaw(uint n64Address, int length)
    {
        var buf = new byte[length];

        // Fast path: single ReadProcessMemory when the range stays within one RDRAM block.
        nint fastBase; nint fastOff;
        bool crossesBoundary = UpperRdramBase != 0
                             && n64Address < 0x80400000u
                             && (n64Address + (uint)length) > 0x80400000u;
        if (!crossesBoundary)
        {
            (fastBase, fastOff) = UpperRdramBase != 0 && n64Address >= 0x80400000u
                ? (UpperRdramBase, (nint)(n64Address & 0x003FFFFF))
                : (RdramBase,      (nint)(n64Address & 0x007FFFFF));
            if (WinApi.ReadProcessMemory(_handle, fastBase + fastOff, buf, length, out var read) && read == length)
                return buf;
        }

        // Fallback: 64KB chunks — each chunk routed to the correct RDRAM block.
        const int ChunkSize = 64 * 1024;
        bool anyRead = false;
        for (int i = 0; i < length; i += ChunkSize)
        {
            uint  chunkN64  = n64Address + (uint)i;
            nint  chunkBase = UpperRdramBase != 0 && chunkN64 >= 0x80400000u ? UpperRdramBase : RdramBase;
            nint  chunkOff  = UpperRdramBase != 0 && chunkN64 >= 0x80400000u
                            ? (nint)(chunkN64 & 0x003FFFFF)
                            : (nint)(chunkN64 & 0x007FFFFF);
            int   toRead    = Math.Min(ChunkSize, length - i);
            var   chunk     = new byte[toRead];
            if (WinApi.ReadProcessMemory(_handle, chunkBase + chunkOff, chunk, toRead, out var r) && r > 0)
            {
                Buffer.BlockCopy(chunk, 0, buf, i, r);
                anyRead = true;
            }
        }
        return anyRead ? buf : null;
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
            if (i + 3 < raw.Length)
                Array.Reverse(raw, i, 4);
        }

        var result = new byte[length];
        Array.Copy(raw, prefix, result, 0, length);
        return result;
    }

    // Writes bytes to RDRAM at the given N64 virtual address in N64 logical order.
    // When IsSwapped, byte-swaps each 32-bit word before writing.
    public bool Write(uint n64Address, byte[] data)
    {
        var dst = N64ToHost(n64Address);
        if (dst == 0) return false;
        byte[] buf = data;
        if (IsSwapped)
        {
            buf = (byte[])data.Clone();
            int len = buf.Length & ~3;
            for (int i = 0; i < len; i += 4)
                (buf[i], buf[i + 3], buf[i + 1], buf[i + 2]) = (buf[i + 3], buf[i], buf[i + 2], buf[i + 1]);
        }
        return WinApi.WriteProcessMemory(_handle, dst, buf, buf.Length, out _);
    }

    // Convert a N64 virtual address (0x80000000-0x807FFFFF) to the host address in the
    // emulator process, or 0 if the mapping is not available.
    nint N64ToHost(uint n64Address)
    {
        if (n64Address < 0x80400000)
            return RdramBase + (nint)(n64Address & 0x3FFFFF);
        if (UpperRdramBase != 0)
            return UpperRdramBase + (nint)(n64Address & 0x3FFFFF);
        return 0;
    }

    public uint? ReadU32(uint n64Address)
    {
        // ReadRaw gives us the host bytes. With 32-bit word-swap, those bytes are
        // already in little-endian order (no extra reversal needed). Without swap,
        // they are big-endian (N64 native) and need reversal for BitConverter.
        var raw = ReadRaw(n64Address, 4);
        if (raw is null) return null;
        if (IsSwapped)
        {
            Array.Reverse(raw);
        }
        else
        {
            Array.Reverse(raw);
        }
        return BitConverter.ToUInt32(raw);
    }

    // Reads all 8MB of RDRAM in N64 logical byte order.
    // Used for one-shot scans (e.g. gossip hint array).
    public byte[]? ReadAllRdram() => Read(0x80000000u, 8 * 1024 * 1024);

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
