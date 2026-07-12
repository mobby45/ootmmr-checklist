# PowerShell script to test pjmembridge.dll injection
Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;

public class Injector
{
    [DllImport("kernel32.dll")]
    public static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, int dwProcessId);
    
    [DllImport("kernel32.dll")]
    public static extern bool CloseHandle(IntPtr hObject);
    
    [DllImport("kernel32.dll")]
    public static extern IntPtr VirtualAllocEx(IntPtr hProcess, IntPtr lpAddress, uint dwSize, uint flAllocationType, uint flProtect);
    
    [DllImport("kernel32.dll")]
    public static extern bool WriteProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, int nSize, out int lpNumberOfBytesWritten);
    
    [DllImport("kernel32.dll")]
    public static extern IntPtr CreateRemoteThread(IntPtr hProcess, IntPtr lpThreadAttributes, uint dwStackSize, IntPtr lpStartAddress, IntPtr lpParameter, uint dwCreationFlags, IntPtr lpThreadId);
    
    [DllImport("kernel32.dll")]
    public static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);
    
    [DllImport("kernel32.dll", CharSet = CharSet.Ansi)]
    public static extern IntPtr GetProcAddress(IntPtr hModule, string lpProcName);
    
    [DllImport("kernel32.dll", CharSet = CharSet.Ansi)]
    public static extern IntPtr GetModuleHandle(string lpModuleName);
    
    [DllImport("kernel32.dll", CharSet = CharSet.Ansi)]
    public static extern IntPtr LoadLibraryA(string lpFileName);
    
    [DllImport("kernel32.dll")]
    public static extern bool ReadProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, int nSize, out int lpNumberOfBytesRead);
    
    public const uint PROCESS_ALL_ACCESS = 0x1F0FFF;
    public const uint MEM_COMMIT = 0x1000;
    public const uint MEM_RESERVE = 0x2000;
    public const uint PAGE_READWRITE = 0x04;
    public const uint INFINITE = 0xFFFFFFFF;
    
    public static int InjectDll(int pid, string dllPath)
    {
        IntPtr hProcess = OpenProcess(PROCESS_ALL_ACCESS, false, pid);
        if (hProcess == IntPtr.Zero) return -1;
        
        // Allocate memory for DLL path
        byte[] dllPathBytes = System.Text.Encoding.ASCII.GetBytes(dllPath + "\0");
        IntPtr remoteMem = VirtualAllocEx(hProcess, IntPtr.Zero, (uint)dllPathBytes.Length, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
        if (remoteMem == IntPtr.Zero) { CloseHandle(hProcess); return -2; }
        
        // Write DLL path
        int written;
        WriteProcessMemory(hProcess, remoteMem, dllPathBytes, dllPathBytes.Length, out written);
        
        // Get LoadLibraryA address
        IntPtr kernel32 = GetModuleHandle("kernel32.dll");
        IntPtr loadLibAddr = GetProcAddress(kernel32, "LoadLibraryA");
        
        // Create remote thread
        IntPtr hThread = CreateRemoteThread(hProcess, IntPtr.Zero, 0, loadLibAddr, remoteMem, 0, IntPtr.Zero);
        if (hThread == IntPtr.Zero) { CloseHandle(hProcess); return -3; }
        
        WaitForSingleObject(hThread, 5000);
        CloseHandle(hThread);
        CloseHandle(hProcess);
        return 0;
    }
    
    public static byte[] ReadViaPipe(int pid, ulong addr, int size, int timeoutMs)
    {
        string pipeName = "pjmembridge-" + pid;
        using (var pipe = new NamedPipeClientStream(".", pipeName, PipeDirection.InOut, PipeOptions.None))
        {
            pipe.Connect(timeoutMs);
            // Send request: [addr:8][size:4]
            byte[] req = new byte[12];
            for (int i = 0; i < 8; i++) req[i] = (byte)((addr >> (i * 8)) & 0xFF);
            for (int i = 0; i < 4; i++) req[8 + i] = (byte)((size >> (i * 8)) & 0xFF);
            pipe.Write(req, 0, 12);
            pipe.Flush();
            
            // Read response
            byte[] resp = new byte[size];
            int totalRead = 0;
            while (totalRead < size)
            {
                int r = pipe.Read(resp, totalRead, size - totalRead);
                if (r <= 0) break;
                totalRead += r;
            }
            return resp;
        }
    }
}
"@

# Find PJ64 process
$p = Get-Process -Name "Project64-EM" -ErrorAction SilentlyContinue
if (-not $p) { Write-Host "PJ64-EM not running"; exit 1 }

$pid = $p.Id
$dllPath = "D:\Autre\ROMN64\ootmmr-checklist\autotracker\pjmembridge\pjmembridge.dll"

Write-Host "PJ64-EM PID: $pid"
Write-Host "Injecting DLL: $dllPath"

# Also need to open with PROCESS_CREATE_THREAD | PROCESS_VM_OPERATION | PROCESS_VM_WRITE | PROCESS_VM_READ | PROCESS_QUERY_INFORMATION
$result = [Injector]::InjectDll($pid, $dllPath)
if ($result -ne 0) {
    Write-Host "Injection failed with code $result — try running as admin"
    exit 1
}

Write-Host "Injected! Waiting 2s for pipe server to start..."
Start-Sleep -Seconds 2

# Test: read from a known address (e.g., PEB address or any address)
$testAddr = [System.GC]::GetTotalMemory($false)  # dummy
# Actually read from a known good address: the DLL's own text section is always readable
$testAddr = 0x7FFE0000  # KUSER_SHARED_DATA is readable in all processes

Write-Host "Testing pipe read from address 0x$('{0:X}' -f $testAddr)..."
try {
    $data = [Injector]::ReadViaPipe($pid, $testAddr, 16, 5000)
    Write-Host ("Read " + $data.Length + " bytes: " + ($data | ForEach-Object { '{0:X2}' -f $_ }) -join ' ')
    Write-Host "Pipe works!"
} catch {
    Write-Host "Pipe read failed: $_"
}

# Also try reading from the RDRAM area
Write-Host "`nNow testing with actual RDRAM scan (reusing pjtest logic)..."
Write-Host "Run pjtest.exe to verify xflags via pipe"