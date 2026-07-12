// pjtest — test if ReadProcessMemory vs in-process reads give different xflag data.
// Compile: cl.exe /nologo /O2 /MD main.c /Fe:pjtest.exe
#define _CRT_SECURE_NO_WARNINGS
#include <windows.h>
#include <stdio.h>
#include <psapi.h>
#include <tlhelp32.h>

#pragma comment(lib, "psapi.lib")

static const unsigned char MagicNormal[] = "OoT+MM<3";
static const unsigned char MagicSwapped[] = { 0x2B, 0x54, 0x6F, 0x4F, 0x33, 0x3C, 0x4D, 0x4D };

// Shellcode A: read dword from param -> eax; ret  (mov eax, [rcx]; ret)
static const unsigned char ShellcodeRead[] = { 0x8B, 0x01, 0xC3 };
// Shellcode B: return 1 (xor eax, eax; inc eax; ret)
static const unsigned char ShellcodeRet1[] = { 0x33, 0xC0, 0xFF, 0xC0, 0xC3 };
// Shellcode C: test param in rcx: return RCX value as 32-bit (mov rax, rcx; ret)
static const unsigned char ShellcodeRetRcx[] = { 0x48, 0x89, 0xC8, 0xC3 };
// Shellcode D: read from [rdx] (second param) and return
static const unsigned char ShellcodeReadRdx[] = { 0x8B, 0x02, 0xC3 };
// Shellcode E: return the low 32 bits of rdx (mov eax, edx; ret)
static const unsigned char ShellcodeRetRdx[] = { 0x89, 0xD0, 0xC3 };
// Shellcode F: return the low 32 bits of r8 (mov eax, r8d; ret)
static const unsigned char ShellcodeRetR8[] = { 0x44, 0x89, 0xC0, 0xC3 };

typedef struct {
    size_t rdramBase;
    size_t upperRdramBase;
    size_t gSharedCustomSaveHost;
    int    isSwapped;
} ScanResult;

static int ReadProcMem(HANDLE h, void* base, void* buf, size_t sz) {
    SIZE_T read;
    return ReadProcessMemory(h, base, buf, sz, &read) && read == sz;
}

// Scan for gSharedCustomSave using "ZELDA3" pattern in upper RDRAM
static int FindSharedCustomSave(HANDLE h, size_t lowerBase, int isSwapped, ScanResult* out) {
    out->gSharedCustomSaveHost = 0;
    out->upperRdramBase = 0;
    unsigned char zelda3_normal[] = "ZELDA3";
    unsigned char zelda3_swapped[6] = { 0x44, 0x4C, 0x45, 0x5A, 0x33, 0x41 };

    // Try direct read at lowerBase + 0x400000 first (upper RDRAM block)
    size_t upperCandidate = lowerBase + 0x400000;
    unsigned char probe[16];
    if (ReadProcMem(h, (void*)upperCandidate, probe, 16)) {
        unsigned char* buf = malloc(4 * 1024 * 1024);
        if (buf) {
            SIZE_T br;
            if (ReadProcessMemory(h, (void*)upperCandidate, buf, 4 * 1024 * 1024, &br) && br >= 0x2C) {
                for (int i = 0; i + 0x2C <= (int)br; i += 16) {
                    int match = 1;
                    if (isSwapped) {
                        for (int j = 0; j < 6; j++) {
                            int off = (j < 4) ? (0x24 + j) : (0x2A + (j - 4));
                            if (buf[i + off] != zelda3_swapped[j]) { match = 0; break; }
                        }
                    }
                    else {
                        for (int j = 0; j < 6; j++)
                            if (buf[i + 0x24 + j] != zelda3_normal[j]) { match = 0; break; }
                    }
                    if (match) {
                        out->gSharedCustomSaveHost = upperCandidate + i + 0x3CA0;
                        out->upperRdramBase = upperCandidate;
                        printf("[pjtest] gSharedCustomSave at 0x%zX (upper region 0x%zX, offset 0x%zX)\n",
                            out->gSharedCustomSaveHost, upperCandidate, upperCandidate + i + 0x3CA0 - upperCandidate);
                        free(buf);
                        return 1;
                    }
                }
            }
            free(buf);
        }
    }

    // Fallback: scan all writable committed regions >= 1MB (excluding lower RDRAM)
    size_t addr = 0;
    while (1) {
        MEMORY_BASIC_INFORMATION mbi;
        if (!VirtualQueryEx(h, (void*)addr, &mbi, sizeof(mbi))) break;
        size_t next = (size_t)mbi.BaseAddress + mbi.RegionSize;
        int isLower = (size_t)mbi.BaseAddress == lowerBase;
        BOOL writable = mbi.State == MEM_COMMIT &&
            !(mbi.Protect & PAGE_GUARD) &&
            !(mbi.Protect & PAGE_NOACCESS) &&
            (mbi.Protect & (PAGE_READWRITE | PAGE_WRITECOPY | PAGE_EXECUTE_READWRITE | PAGE_EXECUTE_WRITECOPY)) &&
            mbi.RegionSize >= 1024 * 1024;
        if (writable && !isLower) {
            long regionSize = (long)mbi.RegionSize;
            long scanned = 0;
            while (scanned < regionSize) {
                int toRead = (regionSize - scanned > 4 * 1024 * 1024) ? 4 * 1024 * 1024 : (int)(regionSize - scanned);
                unsigned char* chunk = malloc(toRead);
                if (!chunk) break;
                SIZE_T bytesRead;
                BOOL ok = ReadProcessMemory(h, (char*)mbi.BaseAddress + scanned, chunk, toRead, &bytesRead);
                if (!ok || bytesRead == 0) { free(chunk); break; }
                toRead = (int)bytesRead;
                for (int i = 0; i + 0x2C <= toRead; i += 16) {
                    int match = 1;
                    if (isSwapped) {
                        for (int j = 0; j < 6; j++) {
                            int off = (j < 4) ? (0x24 + j) : (0x2A + (j - 4));
                            if (chunk[i + off] != zelda3_swapped[j]) { match = 0; break; }
                        }
                    }
                    else {
                        for (int j = 0; j < 6; j++)
                            if (chunk[i + 0x24 + j] != zelda3_normal[j]) { match = 0; break; }
                    }
                    if (match) {
                        out->gSharedCustomSaveHost = (size_t)mbi.BaseAddress + scanned + i + 0x3CA0;
                        out->upperRdramBase = (size_t)mbi.BaseAddress + scanned;
                        printf("[pjtest] gSharedCustomSave at 0x%zX (region 0x%zX+0x%zX+0x%zX)\n",
                            out->gSharedCustomSaveHost, (size_t)mbi.BaseAddress, scanned, i);
                        free(chunk);
                        return 1;
                    }
                }
                scanned += toRead;
                free(chunk);
            }
        }
        addr = next;
        if (addr >= 0x7FFFFFFF0000ULL) break;
    }
    return 0;
}

static int FindRdram(HANDLE h, ScanResult* out) {
    out->rdramBase = 0;
    out->isSwapped = 0;
    out->gSharedCustomSaveHost = 0;
    out->upperRdramBase = 0;

    size_t stableOffsets[] = { 0x6584, 0x98280 };
    int foundStatic = 0;
    size_t bestBase = 0;
    int bestSwapped = 0;

    size_t addr = 0;
    int regionsChecked = 0;
    while (1) {
        MEMORY_BASIC_INFORMATION mbi;
        if (!VirtualQueryEx(h, (void*)addr, &mbi, sizeof(mbi))) break;
        size_t next = (size_t)mbi.BaseAddress + mbi.RegionSize;

        BOOL writable = mbi.State == MEM_COMMIT &&
            !(mbi.Protect & PAGE_GUARD) &&
            !(mbi.Protect & PAGE_NOACCESS) &&
            (mbi.Protect & (PAGE_READWRITE | PAGE_WRITECOPY | PAGE_EXECUTE_READWRITE | PAGE_EXECUTE_WRITECOPY)) &&
            mbi.RegionSize >= 1024 * 1024;

        if (writable) {
            regionsChecked++;
            long regionSize = (long)mbi.RegionSize;
            long scanned = 0;
            while (scanned < regionSize) {
                int toRead = (regionSize - scanned > 4 * 1024 * 1024) ? 4 * 1024 * 1024 : (int)(regionSize - scanned);
                unsigned char* chunk = malloc(toRead);
                if (!chunk) break;
                SIZE_T bytesRead;
                BOOL ok = ReadProcessMemory(h, (char*)mbi.BaseAddress + scanned, chunk, toRead, &bytesRead);
                if (!ok || bytesRead == 0) { free(chunk); break; }
                toRead = bytesRead;

                for (int sw = 0; sw < 2; sw++) {
                    const unsigned char* magic = sw ? MagicSwapped : MagicNormal;
                    for (int i = 0; i <= toRead - 8; i++) {
                        int match = 1;
                        for (int j = 0; j < 8; j++)
                            if (chunk[i + j] != magic[j]) { match = 0; break; }
                        if (!match) continue;
                        if (i + 0x14 > toRead) continue;

                        size_t rdramOff = ((size_t)mbi.BaseAddress - (size_t)mbi.AllocationBase) + scanned + i;
                        if (rdramOff > 0x7FFFFF) continue;

                        unsigned int rawValid = sw
                            ? *(unsigned int*)(chunk + i + 8)
                            : (unsigned int)(chunk[i + 8] << 24 | chunk[i + 9] << 16 | chunk[i + 10] << 8 | chunk[i + 11]);
                        if (rawValid > 1) continue;

                        BOOL entranceIsAscii = TRUE;
                        for (int k = i + 0x10; k < i + 0x14; k++)
                            if (chunk[k] < 0x20 || chunk[k] > 0x7E) { entranceIsAscii = FALSE; break; }
                        if (entranceIsAscii) continue;

                        BOOL isStatic = FALSE;
                        for (int s = 0; s < sizeof(stableOffsets) / sizeof(stableOffsets[0]); s++)
                            if (rdramOff == stableOffsets[s]) { isStatic = TRUE; break; }

                        if (!foundStatic || isStatic) {
                            bestBase = (size_t)mbi.AllocationBase;
                            bestSwapped = sw;
                            if (isStatic) foundStatic = 1;
                            printf("[pjtest] Magic found at rdramOff=0x%zX swapped=%d static=%d base=0x%zX\n",
                                rdramOff, sw, (int)isStatic, (size_t)mbi.AllocationBase);
                        }
                    }
                }
                scanned += toRead;
                free(chunk);
            }
        }
        addr = next;
        if (addr >= 0x7FFFFFFF0000ULL) break;
    }

    if (!bestBase) {
        printf("[pjtest] Magic not found after scanning %d region(s)\n", regionsChecked);
        return 0;
    }

    out->rdramBase = bestBase;
    out->isSwapped = bestSwapped;
    printf("[pjtest] RDRAM base=0x%zX swapped=%d\n", bestBase, bestSwapped);

    FindSharedCustomSave(h, bestBase, bestSwapped, out);
    return 1;
}

int main() {
    printf("=== pjtest: xflag read vs in-process read ===\n\n");

    DWORD pid = 0;
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snap != INVALID_HANDLE_VALUE) {
        PROCESSENTRY32W pe = { sizeof(pe) };
        for (BOOL ok = Process32FirstW(snap, &pe); ok; ok = Process32NextW(snap, &pe)) {
            if (wcsstr(pe.szExeFile, L"Project64") || wcsstr(pe.szExeFile, L"pj64")) {
                pid = pe.th32ProcessID;
                wprintf(L"[pjtest] Found: %s (pid=%d)\n", pe.szExeFile, pid);
                break;
            }
        }
        CloseHandle(snap);
    }
    if (!pid) { printf("[pjtest] Not found\n"); return 1; }

    HANDLE h = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
    if (!h) { printf("[pjtest] OpenProcess failed\n"); return 1; }

    ScanResult scan = { 0 };
    if (!FindRdram(h, &scan)) {
        printf("[pjtest] RDRAM scan failed\n");
        CloseHandle(h);
        return 1;
    }

    if (!scan.gSharedCustomSaveHost) {
        printf("[pjtest] gSharedCustomSave not found\n");
    }
    else {
        // Read via RPM
        unsigned int rpmXflags = 0;
        ReadProcMem(h, (void*)(scan.gSharedCustomSaveHost + 0x000), &rpmXflags, 4);
        unsigned char npc[32] = { 0 };
        ReadProcMem(h, (void*)(scan.gSharedCustomSaveHost + 0x2FA), npc, 32);
        unsigned short coins[4] = { 0 };
        ReadProcMem(h, (void*)(scan.gSharedCustomSaveHost + 0x7E0), coins, 8);

        printf("\n=== ReadProcessMemory ===\n");
        printf("xflags[0..3] = %02X %02X %02X %02X\n",
            ((unsigned char*)&rpmXflags)[0], ((unsigned char*)&rpmXflags)[1],
            ((unsigned char*)&rpmXflags)[2], ((unsigned char*)&rpmXflags)[3]);
        printf("npc[0..7]   = %02X %02X %02X %02X %02X %02X %02X %02X\n",
            npc[0], npc[1], npc[2], npc[3], npc[4], npc[5], npc[6], npc[7]);
        printf("coins[0..3] = %04X %04X %04X %04X\n", coins[0], coins[1], coins[2], coins[3]);

        // In-process read via CreateRemoteThread
        printf("\n=== In-process read (CreateRemoteThread + shellcode) ===\n");
        void* code = VirtualAllocEx(h, NULL, 4096, MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
        if (!code) { printf("[pjtest] VirtualAllocEx failed (%lu)\n", GetLastError()); }
        else {
            SIZE_T written;
            printf("[pjtest] code = 0x%p\n", code);

            // Test: use shellcode with HARDCODED address (no parameter needed)
            // Build: mov rax, ADDR; mov eax, [rax]; ret
            // Format: 48 B8 <8-byte-addr> 8B 00 C3
            size_t xflagsHaddr = scan.gSharedCustomSaveHost + 0x000;
            size_t npcHaddr    = scan.gSharedCustomSaveHost + 0x2FA;
            unsigned char hardcodeXflags[14], hardcodeNpc[14];
            int off = 0;
            hardcodeXflags[off++] = 0x48; hardcodeXflags[off++] = 0xB8;
            for (int b = 0; b < 8; b++) hardcodeXflags[off++] = (xflagsHaddr >> (b * 8)) & 0xFF;
            hardcodeXflags[off++] = 0x8B; hardcodeXflags[off++] = 0x00;
            hardcodeXflags[off++] = 0xC3;
            memcpy(hardcodeNpc, hardcodeXflags, 14);
            off = 2; // skip 48 B8
            for (int b = 0; b < 8; b++) hardcodeNpc[off++] = (npcHaddr >> (b * 8)) & 0xFF;

            // 1. Verify shellcode execution still works
            WriteProcessMemory(h, code, ShellcodeRet1, sizeof(ShellcodeRet1), &written);
            HANDLE t = CreateRemoteThread(h, NULL, 0, (LPTHREAD_START_ROUTINE)code, NULL, 0, NULL);
            if (t) {
                WaitForSingleObject(t, 5000);
                DWORD ec;
                GetExitCodeThread(t, &ec);
                printf("[pjtest] ShellcodeRet1 = 0x%08lX %s\n", ec, ec == 1 ? "OK" : "FAIL");
                CloseHandle(t);
            }

            // 2. Read xflags with hardcoded address
            WriteProcessMemory(h, code, hardcodeXflags, sizeof(hardcodeXflags), &written);
            t = CreateRemoteThread(h, NULL, 0, (LPTHREAD_START_ROUTINE)code, NULL, 0, NULL);
            if (t) {
                WaitForSingleObject(t, 5000);
                DWORD inXflags;
                GetExitCodeThread(t, &inXflags);
                printf("\nxflags[0..3] in-process (hardcoded) = %02X %02X %02X %02X (0x%08X)\n",
                    ((unsigned char*)&inXflags)[0], ((unsigned char*)&inXflags)[1],
                    ((unsigned char*)&inXflags)[2], ((unsigned char*)&inXflags)[3], inXflags);
                printf("xflags[0..3] RPM                    = %02X %02X %02X %02X (0x%08X)\n",
                    ((unsigned char*)&rpmXflags)[0], ((unsigned char*)&rpmXflags)[1],
                    ((unsigned char*)&rpmXflags)[2], ((unsigned char*)&rpmXflags)[3], rpmXflags);
                printf("Match: %s\n", inXflags == rpmXflags ? "YES" : "*** NO ***");
                CloseHandle(t);
            }

            // 3. Read NPC with hardcoded address
            WriteProcessMemory(h, code, hardcodeNpc, sizeof(hardcodeNpc), &written);
            t = CreateRemoteThread(h, NULL, 0, (LPTHREAD_START_ROUTINE)code, NULL, 0, NULL);
            if (t) {
                WaitForSingleObject(t, 5000);
                DWORD inNpc;
                GetExitCodeThread(t, &inNpc);
                DWORD rpmNpc = *(DWORD*)npc;
                printf("\nnpc[0..3] in-process (hardcoded) = %02X %02X %02X %02X (0x%08X)\n",
                    ((unsigned char*)&inNpc)[0], ((unsigned char*)&inNpc)[1],
                    ((unsigned char*)&inNpc)[2], ((unsigned char*)&inNpc)[3], inNpc);
                printf("npc[0..3] RPM                    = %02X %02X %02X %02X (0x%08X)\n",
                    ((unsigned char*)&rpmNpc)[0], ((unsigned char*)&rpmNpc)[1],
                    ((unsigned char*)&rpmNpc)[2], ((unsigned char*)&rpmNpc)[3], rpmNpc);
                printf("Match: %s\n", inNpc == rpmNpc ? "YES" : "*** NO ***");
                CloseHandle(t);
            }

            VirtualFreeEx(h, code, 0, MEM_RELEASE);
        }
    }

    CloseHandle(h);
    printf("\nDone.\n");
    return 0;
}
