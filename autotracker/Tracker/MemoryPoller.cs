using System.Diagnostics;
using Autotracker.Memory;

namespace Autotracker.Tracker;

sealed class MemoryPoller
{
    readonly Action<object> _emit;
    ProcessMemory? _mem;
    GameState _state = new();

    const int PollIntervalMs = 100; // 10Hz

    public MemoryPoller(Action<object> emit)
    {
        _emit = emit;
    }

    public async Task RunAsync(CancellationToken ct)
    {
        Console.WriteLine("[autotracker] Starting — waiting for Project64...");

        while (!ct.IsCancellationRequested)
        {
            if (_mem is null)
            {
                _mem = TryAttach();
                if (_mem is null)
                {
                    await Task.Delay(2000, ct);
                    continue;
                }
                Console.WriteLine("[autotracker] Attached to Project64.");
                _state = new GameState();
            }

            try
            {
                Poll();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[autotracker] Lost connection: {ex.Message}");
                _mem.Dispose();
                _mem = null;
                _state = new GameState();
                _emit(new { type = "disconnected" });
            }

            await Task.Delay(PollIntervalMs, ct);
        }
    }

    static ProcessMemory? TryAttach()
    {
        var candidates = new[] { "Project64", "Project64d", "Project64-EM", "Project64EM" };
        foreach (var name in candidates)
        {
            var procs = Process.GetProcessesByName(name);
            if (procs.Length == 0) continue;
            Console.WriteLine($"[autotracker] Found process {name} (PID {procs[0].Id}), scanning RDRAM...");
            var mem = ProcessMemory.TryAttach(procs[0]);
            if (mem is not null) return mem;
            Console.WriteLine("[autotracker] RDRAM not found in this process — magic string absent. Load a save file and retry.");
        }
        return null;
    }

    void Poll()
    {
        // Ensure ComboContext is located.
        if (_state.ComboContextAddress is null)
        {
            if (!TryFindComboContext()) return;
        }

        DetectActiveGame();
        PollEntrance();
        PollSaveContext();
    }

    bool TryFindComboContext()
    {
        // gComboCtx address was located during RDRAM detection — no extra scan needed.
        var addr = _mem!.ComboCtxN64Addr;
        var magic = _mem.ReadString(addr, 8);
        if (magic != "OoT+MM<3")
        {
            // Magic gone: game may have reset. Re-attach on next cycle.
            Console.WriteLine($"[autotracker] ComboContext magic missing at 0x{addr:X8} — game may have reset.");
            return false;
        }

        _state.ComboContextAddress = addr;
        Console.WriteLine($"[autotracker] ComboContext confirmed at 0x{addr:X8} (swapped={_mem.IsSwapped})");
        _emit(new { type = "connected" });
        return true;
    }

    void DetectActiveGame()
    {
        // Read magic from each game's gSaveContext to determine which is loaded.
        var ootMagic = _mem!.ReadString(N64Addresses.SaveContextOot, 6);
        var mmMagic  = _mem.ReadString(N64Addresses.SaveContextMm,  6);

        bool ootValid = ootMagic == N64Addresses.SaveMagicOot;
        bool mmValid  = mmMagic  == N64Addresses.SaveMagicMm;

        ActiveGame game;
        if (ootValid && !mmValid)       game = ActiveGame.Oot;
        else if (mmValid && !ootValid)  game = ActiveGame.Mm;
        else                            game = _state.Game; // both or neither: keep last known

        if (game != _state.Game)
        {
            _state.Game = game;
            Console.WriteLine($"[autotracker] Active game: {game}");
            _emit(new { type = "game", game = game.ToString().ToLower() });
        }
    }

    void PollEntrance()
    {
        var ctx = _state.ComboContextAddress!.Value;
        // entrance is at offset 0x10 in ComboContext (after magic[8], valid, saveIndex).
        var entrance = _mem!.ReadU32(ctx + (uint)N64Addresses.ComboEntranceOffset);
        if (entrance is null || entrance == 0xFFFFFFFF || entrance == 0) return;

        if (entrance != _state.LastEntrance)
        {
            _state.LastEntrance = entrance.Value;
            Console.WriteLine($"[autotracker] Entrance: 0x{entrance:X4}");
            _emit(new { type = "entrance", value = entrance.Value });
        }
    }

    void PollSaveContext()
    {
        // Always poll both games — OoTMM keeps both saves live in RDRAM.
        PollOotSave();
        PollMmSave();
    }

    void PollOotSave()
    {
        // Read a chunk of gSaveContext large enough to cover inventory + quest items.
        const int saveChunkSize = 0x200;
        var buf = _mem!.Read(N64Addresses.SaveContextOot, saveChunkSize);
        if (buf is null) return;

        if (_state.OotSaveSnapshot is not null && buf.SequenceEqual(_state.OotSaveSnapshot))
            return;

        _state.OotSaveSnapshot = buf;
        _emit(new { type = "oot_save", data = Convert.ToBase64String(buf) });
    }

    void PollMmSave()
    {
        const int saveChunkSize = 0x200;
        var buf = _mem!.Read(N64Addresses.SaveContextMm, saveChunkSize);
        if (buf is null) return;

        if (_state.MmSaveSnapshot is not null && buf.SequenceEqual(_state.MmSaveSnapshot))
            return;

        _state.MmSaveSnapshot = buf;
        _emit(new { type = "mm_save", data = Convert.ToBase64String(buf) });
    }
}
