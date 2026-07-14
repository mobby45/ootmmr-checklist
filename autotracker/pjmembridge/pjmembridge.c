// pjmembridge.dll - injected into PJ64-EM process.
// Fully CRT-free. Protocol: client sends [addr:8][size:4], server replies [data].
// Special command: addr=0xFFFFFFFFFFFFFFFF -> [size bytes payload] then [reply_len:4][reply]
//   CMD 0x01 (any):  reserved / no-op; reply=[1 byte: 0]
//   CMD 0x02 (1 byte): reserved / no-op; reply=[1 byte: 0]
//   CMD 0x03 (9 bytes): arm MIPS PC hook; payload=[cmd:1][oot_pc:4][mm_pc:4]
//     reply=[status:1]  1=hook installed OK, 0=interpreter site not found
//   CMD 0x04 (1 byte): poll MIPS PC hook events + last query addr; reply=[oot:4][mm:4][query_vaddr:4]
//     oot/mm are raw counters (not cleared); query_vaddr is MIPS virtual addr of ComboItemQuery* from $a1.
//
// Build: cl.exe /nologo /O1 /LD /GS- /Zl pjmembridge.c /Fe:pjmembridge.dll /link /NODEFAULTLIB /ENTRY:EntryPoint kernel32.lib
#include <windows.h>

DWORD WINAPI PipeThread(LPVOID param);

void* __cdecl memset(void* dst, int val, unsigned int n)
{
    BYTE* d = (BYTE*)dst; while (n--) *d++ = (BYTE)val; return dst;
}

// SetMipsPcHook is exported by the PJ64-EM executable (EVIL API).
typedef int (__cdecl *SetMipsPcHook_t)(DWORD pc, int enable, int index);
static SetMipsPcHook_t evil_SetMipsPcHook = NULL;

static BOOL do_attach(HINSTANCE hinst)
{
    DisableThreadLibraryCalls(hinst);

    // Resolve PJ64-EM's SetMipsPcHook (EVIL API).
    // Must be done once at attach because we only get one shot at the DLL load.
    HMODULE hExe = GetModuleHandleW(NULL);
    if (hExe)
        evil_SetMipsPcHook = (SetMipsPcHook_t)GetProcAddress(hExe, "SetMipsPcHook");

    HANDLE h = CreateThread(NULL, 0, PipeThread, NULL, 0, NULL);
    if (h) CloseHandle(h);
    return TRUE;
}

BOOL WINAPI EntryPoint(HINSTANCE hinst, DWORD reason, LPVOID reserved)
{
    (void)reserved;
    return (reason == DLL_PROCESS_ATTACH) ? do_attach(hinst) : TRUE;
}

#pragma optimize("", off)
static void mem_copy(void* dst, const void* src, SIZE_T n)
{
    BYTE* d = (BYTE*)dst; const BYTE* s = (const BYTE*)src; while (n--) *d++ = *s++;
}
static void mem_zero(void* dst, SIZE_T n)
{
    BYTE* d = (BYTE*)dst; while (n--) *d++ = 0;
}
#pragma optimize("", on)

static void build_pipe_name(WCHAR* buf, DWORD pid)
{
    static const WCHAR prefix[] = L"\\\\.\\pipe\\pjmembridge-";
    int i; for (i = 0; prefix[i]; i++) buf[i] = prefix[i];
    WCHAR digits[12]; int nd = 0;
    if (pid == 0) digits[nd++] = L'0';
    else while (pid) { digits[nd++] = L'0' + (pid % 10); pid /= 10; }
    while (nd) buf[i++] = digits[--nd]; buf[i] = 0;
}

static int is_readable(const void* addr, SIZE_T size)
{
    (void)size;
    MEMORY_BASIC_INFORMATION mbi;
    if (!VirtualQuery(addr, &mbi, sizeof(mbi))) return 0;
    if (mbi.State != MEM_COMMIT) return 0;
    DWORD p = mbi.Protect & 0xFF;
    return (p != PAGE_NOACCESS) && !(p & PAGE_GUARD);
}

// ===== MIPS PC HOOK SUBSYSTEM =====
//
// PJ64-EM runs an x86 interpreter loop that dispatches every N64 MIPS instruction.
// At the dispatch entry point, ESI is a pointer to the current MIPS PC variable:
//   [ESI] = current N64 instruction address (MIPS virtual, e.g. 0x8001XXXX).
//
// Unique 7-byte pattern at the dispatch entry (verified in Project64-EM.exe):
//   8B 0E       MOV ECX, [ESI]       ; load current MIPS PC
//   8D 41 04    LEA EAX, [ECX+4]     ; next PC = PC+4
//   89 06       MOV [ESI], EAX       ; advance PC
//
// We scan PJ64-EM's .text section for this pattern and install a 5-byte JMP (+ 2 NOPs)
// trampoline that compares [ESI] to the registered target MIPS addresses and atomically
// increments event counters before executing the original instruction sequence.

static const BYTE k_interp[7] = { 0x8B, 0x0E, 0x8D, 0x41, 0x04, 0x89, 0x06 };

static DWORD            g_mips_oot_pc  = 0;  // comboAddItemRawEx MIPS entry address (OoT)
static DWORD            g_mips_mm_pc   = 0;  // comboAddItemRawEx MIPS entry address (MM)
static volatile LONG    g_oot_events      = 0;  // event counter: comboAddItemRawEx OoT calls
static volatile LONG    g_mm_events       = 0;  // event counter: comboAddItemRawEx MM calls
static volatile DWORD   g_last_query_addr = 0;  // $a1 (ComboItemQuery*) from last OoT call
static BYTE             g_hook_orig[7];      // saved original bytes at hook site
static BYTE*            g_hook_site    = NULL;
static BYTE*            g_hook_gw      = NULL; // gateway page (trampoline code)

// Scan PJ64-EM's first executable PE section for the 7-byte interpreter pattern.
static BYTE* find_interp_site(void)
{
    BYTE* base = (BYTE*)(ULONG_PTR)GetModuleHandle(NULL);
    IMAGE_DOS_HEADER*  dos = (IMAGE_DOS_HEADER*)base;
    IMAGE_NT_HEADERS*  nt  = (IMAGE_NT_HEADERS*)(base + dos->e_lfanew);
    IMAGE_SECTION_HEADER* sec = IMAGE_FIRST_SECTION(nt);
    int nsec = (int)nt->FileHeader.NumberOfSections;

    for (int s = 0; s < nsec; s++, sec++)
    {
        if (!(sec->Characteristics & IMAGE_SCN_MEM_EXECUTE)) continue;
        BYTE*  p  = base + sec->VirtualAddress;
        SIZE_T sz = sec->Misc.VirtualSize;

        for (SIZE_T i = 0; i + 7 <= sz; i++)
        {
            int ok = 1;
            for (int j = 0; j < 7; j++)
                if (p[i + j] != k_interp[j]) { ok = 0; break; }
            if (ok) return p + i;
        }
    }
    return NULL;
}

// Install x86 trampoline at site, firing when [ESI] == oot_pc or mm_pc.
// ESI points to the MIPS PC field in PJ64-EM's CPU state.
// MIPS GPRs are at ESI+4: GPR[0] at +4, GPR[1] at +8, ..., GPR[4]($a0) at +0x14, GPR[5]($a1) at +0x18.
// Trampoline layout (53 bytes):
//   8B 06               MOV EAX,[ESI]           read MIPS PC
//   3B 05 [g_oot_pc]    CMP EAX,[g_mips_oot_pc]
//   75 10               JNE skip_oot            (skip 16 bytes)
//   F0 FF 05 [g_oot]    LOCK INC [g_oot_events]
//   8B 56 18            MOV EDX,[ESI+0x18]      capture $a1 (ComboItemQuery*)
//   89 15 [g_query]     MOV [g_last_query_addr],EDX
//   skip_oot:
//   3B 05 [g_mm_pc]     CMP EAX,[g_mips_mm_pc]
//   75 07               JNE skip_mm
//   F0 FF 05 [g_mm]     LOCK INC [g_mm_events]
//   skip_mm:
//   <original 7 bytes>
//   E9 rel32            JMP site+7
//
// Hook site: first 5 bytes replaced with JMP rel32, bytes 5-6 become NOP NOP.
static int install_hook_at(BYTE* site, DWORD oot_pc, DWORD mm_pc)
{
    if (g_hook_gw)
    {
        // Hook already installed; update targets in-place.
        // The trampoline reads g_mips_oot_pc/g_mips_mm_pc by address at run time,
        // so a 32-bit aligned store is sufficient - no reinstall needed.
        g_mips_oot_pc = oot_pc;
        g_mips_mm_pc  = mm_pc;
        return 1;
    }

    BYTE* gw = (BYTE*)VirtualAlloc(NULL, 64, MEM_COMMIT | MEM_RESERVE,
                                   PAGE_EXECUTE_READWRITE);
    if (!gw) return 0;

    BYTE* p = gw;

    // MOV EAX, [ESI]  (8B 06)
    *p++ = 0x8B; *p++ = 0x06;

    // CMP EAX, [g_mips_oot_pc]  (3B 05 addr32)
    *p++ = 0x3B; *p++ = 0x05;
    *(DWORD*)p = (DWORD)(ULONG_PTR)&g_mips_oot_pc; p += 4;

    // JNE +0x10  (skip LOCK INC + capture)
    *p++ = 0x75; *p++ = 0x10;

    // LOCK INC DWORD PTR [g_oot_events]
    *p++ = 0xF0; *p++ = 0xFF; *p++ = 0x05;
    *(DWORD*)p = (DWORD)(ULONG_PTR)&g_oot_events; p += 4;

    // MOV EDX, [ESI+0x18]  - capture $a1 (ComboItemQuery*)
    *p++ = 0x8B; *p++ = 0x56; *p++ = 0x18;

    // MOV [g_last_query_addr], EDX
    *p++ = 0x89; *p++ = 0x15;
    *(DWORD*)p = (DWORD)(ULONG_PTR)&g_last_query_addr; p += 4;

    // CMP EAX, [g_mips_mm_pc]
    *p++ = 0x3B; *p++ = 0x05;
    *(DWORD*)p = (DWORD)(ULONG_PTR)&g_mips_mm_pc; p += 4;

    // JNE +7
    *p++ = 0x75; *p++ = 0x07;

    // LOCK INC DWORD PTR [g_mm_events]
    *p++ = 0xF0; *p++ = 0xFF; *p++ = 0x05;
    *(DWORD*)p = (DWORD)(ULONG_PTR)&g_mm_events; p += 4;

    // Original 7 bytes
    mem_copy(p, site, 7); p += 7;

    // JMP rel32 back to site+7
    BYTE* jmp_tgt = site + 7;
    *p++ = 0xE9;
    *(DWORD*)p = (DWORD)((ULONG_PTR)jmp_tgt - (ULONG_PTR)(p + 4));
    p += 4;
    // Total gateway: 53 bytes - fits within our 64-byte allocation.

    // Save originals
    mem_copy(g_hook_orig, site, 7);

    // Patch site: JMP rel32 (5 bytes) + NOP + NOP
    BYTE patch[7];
    patch[0] = 0xE9;
    *(DWORD*)(patch + 1) = (DWORD)((ULONG_PTR)gw - (ULONG_PTR)(site + 5));
    patch[5] = 0x90;
    patch[6] = 0x90;

    DWORD old;
    if (!VirtualProtect(site, 7, PAGE_EXECUTE_READWRITE, &old))
    {
        VirtualFree(gw, 0, MEM_RELEASE);
        return 0;
    }
    mem_copy(site, patch, 7);
    FlushInstructionCache(GetCurrentProcess(), site, 7);
    VirtualProtect(site, 7, old, &old);

    g_mips_oot_pc = oot_pc;
    g_mips_mm_pc  = mm_pc;
    g_hook_site   = site;
    g_hook_gw     = gw;

    // Register the PC hook with PJ64-EM's EVIL API so the emulator will check
    // the program counter through the interpreter dispatch even when DynaRec is
    // active, giving our trampoline a chance to not fire.
    if (evil_SetMipsPcHook)
    {
        if (oot_pc) evil_SetMipsPcHook(oot_pc, 1, 0);
        if (mm_pc)  evil_SetMipsPcHook(mm_pc,  1, 0);
    }

    return 1;
}

// CMD 0x03 handler: arm MIPS PC hook with provided target addresses.
static int cmd_arm_hook(const BYTE* payload, DWORD size)
{
    if (size < 9) return 0;
    DWORD oot_pc, mm_pc;
    mem_copy(&oot_pc, payload + 1, 4);
    mem_copy(&mm_pc,  payload + 5, 4);

    // Use cached site or find it now
    BYTE* site = g_hook_site ? g_hook_site : find_interp_site();
    if (!site) return 0;

    return install_hook_at(site, oot_pc, mm_pc);
}

// ===== PIPE THREAD =====

DWORD WINAPI PipeThread(LPVOID param)
{
    (void)param;
    WCHAR pipeName[64];
    build_pipe_name(pipeName, GetCurrentProcessId());
    HANDLE heap = GetProcessHeap();

    // Pre-locate the interpreter site on startup (non-blocking, best effort).
    if (!g_hook_site)
        g_hook_site = find_interp_site();

    for (int attempt = 0; attempt < 120; attempt++)
    {
        HANDLE hPipe = CreateNamedPipeW(pipeName, PIPE_ACCESS_DUPLEX,
            PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
            1, 65536, 65536, 1000, NULL);
        if (hPipe == INVALID_HANDLE_VALUE) { Sleep(1000); continue; }

        BOOL ok = ConnectNamedPipe(hPipe, NULL) ? TRUE : (GetLastError() == ERROR_PIPE_CONNECTED);
        if (!ok) { CloseHandle(hPipe); Sleep(1000); continue; }

        while (1)
        {
            BYTE header[12]; DWORD rd;
            if (!ReadFile(hPipe, header, 12, &rd, NULL) || rd != 12) break;

            ULONGLONG addr; DWORD size;
            mem_copy(&addr, header, 8);
            mem_copy(&size, header + 8, 4);

            // --- Command packet -------------------------------------------------
            if (addr == 0xFFFFFFFFFFFFFFFFULL)
            {
                if (size == 0 || size > 128) break;
                BYTE payload[128]; DWORD pr = 0;
                if (!ReadFile(hPipe, payload, size, &pr, NULL) || pr != size) break;

                BYTE cmd = payload[0];
                DWORD writ;
                BYTE reply[20]; // up to 4 (strlen) + 16 bytes data

                if (cmd == 0x03 && size >= 9)
                {
                    int status = cmd_arm_hook(payload, size);
                    DWORD rlen = 1;
                    mem_copy(reply, &rlen, 4);
                    reply[4] = (BYTE)status;
                    WriteFile(hPipe, reply, 5, &writ, NULL);
                }
                else if (cmd == 0x04 && size == 1)
                {
                    // Read (do NOT clear) so C# can retry on stale RDRAM cache.
                    LONG oot       = g_oot_events;
                    LONG mm        = g_mm_events;
                    DWORD query_vaddr = g_last_query_addr;
                    DWORD rlen = 12;
                    mem_copy(reply,         &rlen, 4);
                    mem_copy(reply + 4,     &oot,  4);
                    mem_copy(reply + 8,     &mm,   4);
                    mem_copy(reply + 12, &query_vaddr, 4);
                    WriteFile(hPipe, reply, 16, &writ, NULL);
                }
                else
                {
                    // CMD 0x01, 0x02, or unknown: no-op reply
                    DWORD rlen = 1;
                    mem_copy(reply, &rlen, 4);
                    reply[4] = 0;
                    WriteFile(hPipe, reply, 5, &writ, NULL);
                }
                continue;
            }

            // --- Memory read [addr:8][size:4] -> [data:size] --------------------
            if (size == 0 || size > 65536) break;
            void* buf = HeapAlloc(heap, 0, size);
            if (!buf) break;
            if (is_readable((const void*)(ULONG_PTR)addr, size))
                mem_copy(buf, (const void*)(ULONG_PTR)addr, size);
            else
                mem_zero(buf, size);
            DWORD written;
            WriteFile(hPipe, buf, size, &written, NULL);
            HeapFree(heap, 0, buf);
        }

        DisconnectNamedPipe(hPipe); CloseHandle(hPipe);
    }
    return 0;
}
