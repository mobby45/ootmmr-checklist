// inject_test.c — test pjmembridge.dll injection
// Build: cl.exe /nologo /O2 /MD inject_test.c /Fe:inject_test.exe
#define _CRT_SECURE_NO_WARNINGS
#include <windows.h>
#include <stdio.h>
#include <tlhelp32.h>

#pragma comment(lib, "kernel32.lib")

static int inject_dll(DWORD pid, const char* dllPath)
{
    HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
    if (!hProcess) { printf("[test] OpenProcess failed (%lu)\n", GetLastError()); return -1; }

    size_t pathLen = strlen(dllPath) + 1;
    void* remoteMem = VirtualAllocEx(hProcess, NULL, pathLen, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    if (!remoteMem) { printf("[test] VirtualAllocEx failed (%lu)\n", GetLastError()); CloseHandle(hProcess); return -2; }

    SIZE_T written;
    WriteProcessMemory(hProcess, remoteMem, dllPath, (SIZE_T)pathLen, &written);

    HMODULE kernel32 = GetModuleHandleA("kernel32.dll");
    FARPROC loadLib = GetProcAddress(kernel32, "LoadLibraryA");
    if (!loadLib) { printf("[test] GetProcAddress failed\n"); CloseHandle(hProcess); return -3; }

    HANDLE hThread = CreateRemoteThread(hProcess, NULL, 0, (LPTHREAD_START_ROUTINE)loadLib, remoteMem, 0, NULL);
    if (!hThread) { printf("[test] CreateRemoteThread failed (%lu)\n", GetLastError()); CloseHandle(hProcess); return -4; }

    WaitForSingleObject(hThread, 10000);
    DWORD exitCode;
    GetExitCodeThread(hThread, &exitCode);
    printf("[test] LoadLibrary returned 0x%08lX (0 = fail, non-zero = module handle)\n", exitCode);
    CloseHandle(hThread);
    VirtualFreeEx(hProcess, remoteMem, 0, MEM_RELEASE);
    CloseHandle(hProcess);
    return (exitCode != 0) ? 0 : -5;
}

static int read_pipe(DWORD pid, ULONGLONG addr, DWORD size, void* buf)
{
    char pipeName[64];
    snprintf(pipeName, sizeof(pipeName), "\\\\.\\pipe\\pjmembridge-%lu", pid);

    HANDLE hPipe = CreateFileA(pipeName, GENERIC_READ | GENERIC_WRITE, 0, NULL,
        OPEN_EXISTING, 0, NULL);
    if (hPipe == INVALID_HANDLE_VALUE)
        return -1;

    // Send request: [addr:8][size:4]
    BYTE header[12];
    for (int i = 0; i < 8; i++) header[i] = (BYTE)((addr >> (i * 8)) & 0xFF);
    for (int i = 0; i < 4; i++) header[8 + i] = (BYTE)((size >> (i * 8)) & 0xFF);

    DWORD written;
    if (!WriteFile(hPipe, header, 12, &written, NULL) || written != 12) {
        CloseHandle(hPipe);
        return -2;
    }

    DWORD bytesRead;
    if (!ReadFile(hPipe, buf, size, &bytesRead, NULL) || bytesRead != size) {
        CloseHandle(hPipe);
        return -3;
    }

    // Try to read more to verify the connection is still alive
    FlushFileBuffers(hPipe);
    CloseHandle(hPipe);
    return 0;
}

int main()
{
    printf("=== pjmembridge injection test ===\n\n");

    // Find PJ64
    DWORD pid = 0;
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snap != INVALID_HANDLE_VALUE) {
        PROCESSENTRY32W pe = { sizeof(pe) };
        for (BOOL ok = Process32FirstW(snap, &pe); ok; ok = Process32NextW(snap, &pe)) {
            if (wcsstr(pe.szExeFile, L"Project64") || wcsstr(pe.szExeFile, L"pj64")) {
                pid = pe.th32ProcessID;
                wprintf(L"[test] Found: %s (pid=%d)\n", pe.szExeFile, pid);
                break;
            }
        }
        CloseHandle(snap);
    }
    if (!pid) { printf("[test] PJ64 not found\n"); return 1; }

    // Inject DLL
    const char* dllPath = "D:\\Autre\\ROMN64\\ootmmr-checklist\\autotracker\\pjmembridge\\pjmembridge.dll";
    printf("[test] Injecting %s\n", dllPath);
    int ret = inject_dll(pid, dllPath);
    if (ret != 0) {
        printf("[test] Injection failed (%d)\n", ret);
        return 1;
    }

    // Wait for pipe to be ready
    printf("[test] Waiting for pipe...\n");
    Sleep(2000);

    // Test pipe read from a known readable address
    ULONGLONG testAddr = 0x7FFE0000ULL; // KUSER_SHARED_DATA
    BYTE testBuf[16];
    ret = read_pipe(pid, testAddr, 16, testBuf);
    if (ret != 0) {
        printf("[test] Pipe read failed (%d)\n", ret);
        return 1;
    }
    printf("[test] Pipe read from 0x7FFE0000: ");
    for (int i = 0; i < 16; i++) printf("%02X ", testBuf[i]);
    printf("\n");

    // Now find RDRAM and read xflags
    printf("\n[test] Now scanning for RDRAM (will use pjtest logic)...\n");
    printf("[test] To read xflags via pipe, run the C# autotracker.\n");

    printf("\nDone. DLL injected successfully.\n");
    return 0;
}
