using System.Runtime.InteropServices;

namespace Autotracker.Memory;

[StructLayout(LayoutKind.Sequential)]
struct MemoryBasicInformation
{
    public nint  BaseAddress;
    public nint  AllocationBase;
    public uint  AllocationProtect;
    public nint  RegionSize;
    public uint  State;
    public uint  Protect;
    public uint  Type;
}

static class WinApi
{
    [DllImport("kernel32.dll")]
    public static extern nint OpenProcess(uint dwDesiredAccess, bool bInheritHandle, int dwProcessId);

    [DllImport("kernel32.dll")]
    public static extern bool ReadProcessMemory(nint hProcess, nint lpBaseAddress, byte[] lpBuffer, int nSize, out int lpNumberOfBytesRead);

    [DllImport("kernel32.dll")]
    public static extern bool WriteProcessMemory(nint hProcess, nint lpBaseAddress, byte[] lpBuffer, int nSize, out int lpNumberOfBytesWritten);

    [DllImport("kernel32.dll")]
    public static extern bool CloseHandle(nint hObject);

    [DllImport("kernel32.dll")]
    public static extern nint VirtualQueryEx(nint hProcess, nint lpAddress, out MemoryBasicInformation lpBuffer, nint dwLength);

    public const uint PROCESS_VM_READ           = 0x0010;
    public const uint PROCESS_VM_WRITE          = 0x0020;
    public const uint PROCESS_VM_OPERATION      = 0x0008;
    public const uint PROCESS_QUERY_INFORMATION = 0x0400;
    public const uint MEM_COMMIT               = 0x1000;
    public const uint PAGE_NOACCESS            = 0x01;
    public const uint PAGE_READONLY            = 0x02;
    public const uint PAGE_READWRITE           = 0x04;
    public const uint PAGE_WRITECOPY           = 0x08;
    public const uint PAGE_EXECUTE_READ        = 0x20;
    public const uint PAGE_EXECUTE_READWRITE   = 0x40;
    public const uint PAGE_EXECUTE_WRITECOPY   = 0x80;
    public const uint PAGE_GUARD               = 0x100;
    public const uint PAGE_NOCACHE             = 0x200;
    public const uint PAGE_WRITECOMBINE        = 0x400;

    // Mask for any protection that allows writes.
    public const uint PAGE_WRITABLE_MASK = PAGE_READWRITE | PAGE_WRITECOPY | PAGE_EXECUTE_READWRITE | PAGE_EXECUTE_WRITECOPY;
}
