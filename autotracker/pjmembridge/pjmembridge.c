// pjmembridge.dll — injected into PJ64-EM process.
// Fully CRT-free. Protocol: client sends [addr:8][size:4], server replies [data].
//
// Build: cl.exe /nologo /O1 /LD /GS- /Zl pjmembridge.c /Fe:pjmembridge.dll /link /NODEFAULTLIB /ENTRY:EntryPoint kernel32.lib
#include <windows.h>

// Forward declarations
DWORD WINAPI PipeThread(LPVOID param);

// CRT stubs needed by compiler-generated code
void* __cdecl memset(void* dst, int val, SIZE_T n)
{
    BYTE* d = (BYTE*)dst;
    while (n--) *d++ = (BYTE)val;
    return dst;
}

// Our entry point — behaves like DllMain
BOOL WINAPI DllMain(HINSTANCE hinst, DWORD reason, LPVOID reserved)
{
    (void)reserved;
    if (reason == DLL_PROCESS_ATTACH)
    {
        DisableThreadLibraryCalls(hinst);
        // Create a thread to run our pipe server
        HANDLE h = CreateThread(NULL, 0, PipeThread, NULL, 0, NULL);
        if (h) CloseHandle(h);
    }
    return TRUE;
}

// The actual entry point called by the loader
BOOL WINAPI EntryPoint(HINSTANCE hinst, DWORD reason, LPVOID reserved)
{
    return DllMain(hinst, reason, reserved);
}

// Manual memory operations (avoid compiler optimizing to CRT calls)
#pragma optimize("", off)
static void mem_copy(void* dst, const void* src, SIZE_T n)
{
    BYTE* d = (BYTE*)dst;
    const BYTE* s = (const BYTE*)src;
    while (n--) *d++ = *s++;
}
#pragma optimize("", on)

#pragma optimize("", off)
static void mem_zero(void* dst, SIZE_T n)
{
    BYTE* d = (BYTE*)dst;
    while (n--) *d++ = 0;
}
#pragma optimize("", on)

// Build pipe name: \\.\pipe\pjmembridge-<pid>
static void build_pipe_name(WCHAR* buf, DWORD pid)
{
    static const WCHAR prefix[] = L"\\\\.\\pipe\\pjmembridge-";
    int i;
    for (i = 0; prefix[i]; i++) buf[i] = prefix[i];
    WCHAR digits[12];
    int nd = 0;
    if (pid == 0) digits[nd++] = L'0';
    else while (pid) { digits[nd++] = L'0' + (pid % 10); pid /= 10; }
    while (nd) buf[i++] = digits[--nd];
    buf[i] = 0;
}

// Check if the start address is in a readable committed region.
// Does NOT enforce that the entire range fits in one VirtualAlloc region — N64 RDRAM is a single
// contiguous allocation so cross-region boundary reads don't occur in practice.
// The old boundary check caused silent zero-reads when PJ64-EM's MBI split the region.
static int is_readable(const void* addr, SIZE_T size)
{
    (void)size;
    MEMORY_BASIC_INFORMATION mbi;
    if (!VirtualQuery(addr, &mbi, sizeof(mbi))) return 0;
    if (mbi.State != MEM_COMMIT) return 0;
    DWORD prot = mbi.Protect & 0xFF;
    if (prot == PAGE_NOACCESS) return 0;
    if (prot & PAGE_GUARD) return 0;
    return 1;
}

DWORD WINAPI PipeThread(LPVOID param)
{
    (void)param;
    WCHAR pipeName[64];
    DWORD pid = GetCurrentProcessId();
    build_pipe_name(pipeName, pid);
    HANDLE heap = GetProcessHeap();

    for (int attempt = 0; attempt < 120; attempt++)
    {
        HANDLE hPipe = CreateNamedPipeW(
            pipeName, PIPE_ACCESS_DUPLEX,
            PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
            1, 65536, 65536, 1000, NULL);

        if (hPipe == INVALID_HANDLE_VALUE)
        {
            Sleep(1000);
            continue;
        }

        BOOL connected = ConnectNamedPipe(hPipe, NULL)
            ? TRUE : (GetLastError() == ERROR_PIPE_CONNECTED);

        if (!connected)
        {
            CloseHandle(hPipe);
            Sleep(1000);
            continue;
        }

        while (1)
        {
            BYTE header[12];
            DWORD bytesRead;
            if (!ReadFile(hPipe, header, 12, &bytesRead, NULL) || bytesRead != 12)
                break;

            // Parse: [addr:8][size:4] little-endian (use mem_copy to avoid 64-bit shifts on x86)
            ULONGLONG addr;
            DWORD size;
            mem_copy(&addr, header, 8);
            mem_copy(&size, header + 8, 4);

            if (size == 0 || size > 65536) break;

            void* buf = HeapAlloc(heap, 0, size);
            if (!buf) break;

            // Safely read from the address
            if (is_readable((const void*)(ULONG_PTR)addr, size))
                mem_copy(buf, (const void*)(ULONG_PTR)addr, size);
            else
                mem_zero(buf, size);

            DWORD written;
            WriteFile(hPipe, buf, size, &written, NULL);
            HeapFree(heap, 0, buf);
        }

        DisconnectNamedPipe(hPipe);
        CloseHandle(hPipe);
    }
    return 0;
}
