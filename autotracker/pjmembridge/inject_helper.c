// inject_helper.c — 32-bit helper for injecting pjmembridge.dll into a WOW64 process.
// Build: cl /nologo /O2 /GS- inject_helper.c /Fe:inject_helper.exe
#define _CRT_SECURE_NO_WARNINGS
#include <windows.h>
#include <stdio.h>

int main(int argc, char* argv[])
{
    if (argc < 3) { fprintf(stderr, "Usage: inject_helper <pid> <dllpath>\n"); return 1; }
    DWORD pid = (DWORD)atol(argv[1]);
    const char* dllPath = argv[2];

    HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
    if (!hProcess) { fprintf(stderr, "OpenProcess failed (%lu)\n", GetLastError()); return 2; }

    size_t pathLen = strlen(dllPath) + 1;
    void* remoteMem = VirtualAllocEx(hProcess, NULL, pathLen, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    if (!remoteMem) { fprintf(stderr, "VirtualAllocEx failed (%lu)\n", GetLastError()); CloseHandle(hProcess); return 3; }

    SIZE_T written;
    WriteProcessMemory(hProcess, remoteMem, dllPath, (SIZE_T)pathLen, &written);

    FARPROC loadLib = GetProcAddress(GetModuleHandleA("kernel32.dll"), "LoadLibraryA");
    if (!loadLib) { fprintf(stderr, "GetProcAddress failed\n"); CloseHandle(hProcess); return 4; }

    HANDLE hThread = CreateRemoteThread(hProcess, NULL, 0, (LPTHREAD_START_ROUTINE)loadLib, remoteMem, 0, NULL);
    if (!hThread) { fprintf(stderr, "CreateRemoteThread failed (%lu)\n", GetLastError()); CloseHandle(hProcess); return 5; }

    WaitForSingleObject(hThread, 10000);
    DWORD exitCode;
    GetExitCodeThread(hThread, &exitCode);
    CloseHandle(hThread);
    VirtualFreeEx(hProcess, remoteMem, 0, MEM_RELEASE);
    CloseHandle(hProcess);

    return (exitCode != 0) ? 0 : 6;
}
