using System.Diagnostics;
using Autotracker.Memory;

namespace Autotracker.Tracker;

sealed class MemoryPoller
{
    readonly Action<object> _emit;
    ProcessMemory? _mem;
    GameState _state = new();
    volatile bool _resetRequested;

    const int PollIntervalMs = 100; // 10Hz

    public MemoryPoller(Action<object> emit)
    {
        _emit = emit;
    }

    // Called from the WebSocket server when a new client connects.
    // Sets a flag so the next Poll() clears all snapshots and re-emits current state.
    // Safe to call from any thread — only sets a volatile bool.
    public void RequestReset() => _resetRequested = true;

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
        // If a new WebSocket client just connected, clear all snapshots so every piece of
        // current state is re-broadcast on this poll cycle.
        if (_resetRequested)
        {
            _resetRequested = false;
            ResetSnapshotsForReconnect();
        }

        // Ensure ComboContext is located.
        if (_state.ComboContextAddress is null)
        {
            if (!TryFindComboContext()) return;
        }

        if      (_state.PayloadMmSaveCandidateAddr is null) TryScanOotPayload();
        else if (_state.PayloadMmSaveAddr          is null) TryValidatePayloadMmSave();
        if (_state.PayloadOotSaveAddr is null) TryScanMmPayload();
        if (_state.ComboConfigAddr    is null) TryScanComboConfig();

        DetectActiveGame();
        PollEntrance();
        PollSaveContext();
    }

    // Phase 1 — scan the OoT payload BSS (0x80400000–0x80720000) for the payload copy of gMmSave.
    // Identified by "ZELDA3" at offset +0x24 from a 16-byte aligned address.
    // Sets PayloadMmSaveCandidateAddr (not PayloadMmSaveAddr) — validation happens in phase 2.
    // gSharedCustomSave is co-located at +sizeof(MmSave) = +0x3CA0 and is set immediately
    // since it is a separate reliable struct written by OoTMM independently of gMmSave validity.
    void TryScanOotPayload()
    {
        int scanLen = (int)(N64Addresses.PayloadOotEnd - N64Addresses.PayloadOotStart);
        var buf = _mem!.Read(N64Addresses.PayloadOotStart, scanLen);
        if (buf is null) return;

        if (ScanForMagic(buf, N64Addresses.PayloadMmSaveMagicOffset, "ZELDA3", out int idx))
        {
            _state.PayloadMmSaveCandidateAddr = N64Addresses.PayloadOotStart + (uint)idx;
            _state.SharedCustomSaveAddr       = _state.PayloadMmSaveCandidateAddr.Value + (uint)N64Addresses.PayloadMmSaveSize;
            Console.WriteLine($"[autotracker] OoT payload: gMmSave candidate=0x{_state.PayloadMmSaveCandidateAddr:X8}, gSharedCustomSave=0x{_state.SharedCustomSaveAddr:X8}, validating...");
        }
    }

    // Phase 2 — validate gMmSave candidate against two criteria, tried in order:
    //   1. playerForm == 4: Save_CreateMM() was just called (bzero + init, no stale items).
    //   2. MM player name == CopyName(OoT player name): the gMmSave was initialised for the
    //      current save file (either this session or loaded from flash).
    // PJ64 does not always zero RDRAM on ROM reload, so stale "ZELDA3" from a prior session can
    // sit at the same BSS address. Both checks reject that stale data in the common case.
    void TryValidatePayloadMmSave()
    {
        if (_state.PayloadMmSaveCandidateAddr is null) return;
        var addr = _state.PayloadMmSaveCandidateAddr.Value;

        // Check 1: playerForm == 4 → Save_CreateMM() was called for this session.
        var formBuf = _mem!.Read(addr + (uint)N64Addresses.MmPlayerFormOff, 1);
        if (formBuf is not null && formBuf[0] == 4)
        {
            _state.PayloadMmSaveAddr = addr;
            Console.WriteLine($"[autotracker] gMmSave validated at 0x{addr:X8} (playerForm=4, fresh init)");
            return;
        }

        // Check 2: copyName(OoT player name) == MM player name.
        var ootName = _mem.Read(N64Addresses.SaveContextOot + (uint)N64Addresses.OotPlayerNameOff, 8);
        var mmName  = _mem.Read(addr + (uint)N64Addresses.MmPlayerNameOff, 8);
        if (ootName is null || mmName is null) return;

        if (CopyName(ootName).SequenceEqual(mmName))
        {
            _state.PayloadMmSaveAddr = addr;
            Console.WriteLine($"[autotracker] gMmSave validated at 0x{addr:X8} (player name match)");
        }
    }

    // Converts an OoT player name (raw OoT char encoding) to MM encoding, mirroring Save_CreateMM().
    static byte[] CopyName(byte[] src)
    {
        var dst = new byte[8];
        for (int i = 0; i < 8; i++)
        {
            byte c0 = src[i];
            byte c1;
            if      (c0 <= 0x09)                         c1 = c0;
            else if (c0 >= 0xab && c0 < 0xab + 26)      c1 = (byte)(c0 - 0xab + 0x0a);
            else if (c0 >= 0xc5 && c0 < 0xc5 + 26)      c1 = (byte)(c0 - 0xc5 + 0x24);
            else if (c0 == 0xe4)                         c1 = 0x3f;
            else if (c0 == 0xea)                         c1 = 0x40;
            else                                         c1 = 0x3e;
            dst[i] = c1;
        }
        return dst;
    }

    // Scans the OoT payload BSS for gComboConfig.
    // Heuristic: 16-byte aligned, byte[0]=0x01 (playerId), bytes[1-3]=0x00 (padding),
    // bytes[4-5]=0x00 (high bytes of dungeonWarps[0] u32 in big-endian — entrance IDs < 0x10000).
    // Also validates bytes[8-9]=0x00 (high bytes of dungeonWarps[1]) for extra confidence.
    void TryScanComboConfig()
    {
        int scanLen = (int)(N64Addresses.PayloadOotEnd - N64Addresses.PayloadOotStart);
        var buf = _mem!.Read(N64Addresses.PayloadOotStart, scanLen);
        if (buf is null) return;

        for (int i = 0; i + N64Addresses.ComboConfigReadOffset + N64Addresses.ComboConfigReadSize <= buf.Length; i += 16)
        {
            if (buf[i]   != 0x01) continue; // playerId = 1 (single world)
            if (buf[i+1] != 0x00) continue; // padding
            if (buf[i+2] != 0x00) continue;
            if (buf[i+3] != 0x00) continue;
            // dungeonWarps[0..5] high bytes (entrance IDs are < 0x1000, so top 2 bytes = 0)
            if (buf[i+4]  != 0x00) continue;
            if (buf[i+5]  != 0x00) continue;
            if (buf[i+8]  != 0x00) continue;
            if (buf[i+9]  != 0x00) continue;
            if (buf[i+12] != 0x00) continue;
            if (buf[i+13] != 0x00) continue;
            if (buf[i+16] != 0x00) continue;
            if (buf[i+17] != 0x00) continue;
            if (buf[i+20] != 0x00) continue;
            if (buf[i+21] != 0x00) continue;
            if (buf[i+24] != 0x00) continue;
            if (buf[i+25] != 0x00) continue;
            // mq field (offset 156): only 12 dungeon bits valid — high 20 bits must be 0
            if (buf[i+156] != 0x00) continue;
            if ((buf[i+157] & 0xF0) != 0x00) continue;

            _state.ComboConfigAddr = N64Addresses.PayloadOotStart + (uint)i;
            Console.WriteLine($"[autotracker] Found gComboConfig at 0x{_state.ComboConfigAddr:X8}");
            return;
        }
    }

    // Scans the MM payload BSS (0x80720000–0x80800000) for the payload copy of gOotSave.
    // Identified by "ZELDAZ" at offset +0x1C from a 16-byte aligned address.
    void TryScanMmPayload()
    {
        int scanLen = (int)(N64Addresses.PayloadMmEnd - N64Addresses.PayloadMmStart);
        var buf = _mem!.Read(N64Addresses.PayloadMmStart, scanLen);
        if (buf is null) return;

        if (ScanForMagic(buf, N64Addresses.PayloadOotSaveMagicOffset, "ZELDAZ", out int idx))
        {
            _state.PayloadOotSaveAddr = N64Addresses.PayloadMmStart + (uint)idx;
            Console.WriteLine($"[autotracker] MM payload: gOotSave=0x{_state.PayloadOotSaveAddr:X8}");
        }
    }

    static bool ScanForMagic(byte[] buf, int magicOffset, string magic, out int index)
    {
        index = 0;
        var magicBytes = System.Text.Encoding.ASCII.GetBytes(magic);
        for (int i = 0; i + magicOffset + magicBytes.Length <= buf.Length; i += 16)
        {
            bool match = true;
            for (int j = 0; j < magicBytes.Length; j++)
                if (buf[i + magicOffset + j] != magicBytes[j]) { match = false; break; }
            if (match) { index = i; return true; }
        }
        return false;
    }

    // Clears all data snapshots so every field is re-emitted on the next poll.
    // Keeps scanned addresses (ComboContextAddress, payload scan results) intact to avoid
    // expensive RDRAM re-scans.  Re-emits "connected" and forces game re-detection so the
    // newly connected client receives the full current state.
    void ResetSnapshotsForReconnect()
    {
        _state.OotSaveSnapshot               = null;
        _state.MmSaveSnapshot                = null;
        _state.PayloadMmSaveSnapshot         = null;
        _state.SharedCustomSaveSnapshot      = null;
        _state.PayloadOotSaveSnapshot        = null;
        _state.ComboConfigSnapshot           = null;
        _state.ComboConfigSignature          = null;
        _state.OotSceneFlagsSnapshot         = null;
        _state.MmSceneFlagsSnapshot          = null;
        _state.OotLiveSceneFlagsSnapshot     = null;
        _state.MmLiveSceneFlagsSnapshot      = null;

        // Re-emit "connected" so the frontend clears stale items/checks.
        if (_state.ComboContextAddress is not null)
            _emit(new { type = "connected" });

        // Force game re-detection so "game: oot/mm" is re-emitted.
        _state.Game            = ActiveGame.Unknown;
        _state.OotSaveEntrance = null;
        _state.MmSaveEntrance  = null;
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
        // gComboCtx.valid is only set to 1 during OoT↔MM transitions (when Context_Init finds
        // a prior magic in gComboCtxRead). On cold OoT boot it stays 0, so valid is useless
        // as an "active game" indicator.
        //
        // Instead: detect OoT vs MM by watching which save context's entrance field (at
        // offset 0 in both OotSave and MmSave) changes between polls.  OoT always boots
        // first in OoTMM, so the first reading while ComboContext is present defaults to Oot.
        var ootEntr = _mem!.ReadU32(N64Addresses.SaveContextOot);
        var mmEntr  = _mem.ReadU32(N64Addresses.SaveContextMm);
        if (ootEntr is null || mmEntr is null) return;

        ActiveGame game;
        if (_state.OotSaveEntrance is null)
        {
            // First poll after attach: OoT always boots first in OoTMM.
            game = ActiveGame.Oot;
        }
        else
        {
            bool ootChanged = ootEntr.Value != _state.OotSaveEntrance.Value;
            bool mmChanged  = mmEntr.Value  != _state.MmSaveEntrance!.Value;

            if      (ootChanged && !mmChanged) game = ActiveGame.Oot;
            else if (mmChanged && !ootChanged) game = ActiveGame.Mm;
            else                               game = _state.Game; // neither or both changed: keep last known
        }

        _state.OotSaveEntrance = ootEntr;
        _state.MmSaveEntrance  = mmEntr;

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
        PollOotSave();
        PollMmSave();
        PollPayloadMmSave();
        PollSharedCustomSave();
        PollPayloadOotSave();
        PollComboConfig();
        PollOotSceneFlags();
        PollOotLiveSceneFlags();
        PollMmSceneFlags();
        PollMmLiveSceneFlags();
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

    // Polls the payload copy of gMmSave — authoritative for MM items obtained in OoT,
    // before the native MM gSaveContext (0x801EF670) is synced on transition.
    void PollPayloadMmSave()
    {
        if (_state.PayloadMmSaveAddr is null) return;

        const int saveChunkSize = 0x200;
        var buf = _mem!.Read(_state.PayloadMmSaveAddr.Value, saveChunkSize);
        if (buf is null) return;

        if (_state.PayloadMmSaveSnapshot is not null && buf.SequenceEqual(_state.PayloadMmSaveSnapshot))
            return;

        _state.PayloadMmSaveSnapshot = buf;
        _emit(new { type = "payload_mm_save", data = Convert.ToBase64String(buf) });
    }

    // Polls the MM payload copy of gOotSave — authoritative for OoT items obtained in MM.
    void PollPayloadOotSave()
    {
        if (_state.PayloadOotSaveAddr is null) return;

        const int saveChunkSize = 0x200;
        var buf = _mem!.Read(_state.PayloadOotSaveAddr.Value, saveChunkSize);
        if (buf is null) return;

        if (_state.PayloadOotSaveSnapshot is not null && buf.SequenceEqual(_state.PayloadOotSaveSnapshot))
            return;

        _state.PayloadOotSaveSnapshot = buf;
        _emit(new { type = "payload_oot_save", data = Convert.ToBase64String(buf) });
    }

    // Polls the first 0x12C bytes of gComboConfig, covering:
    //   - dungeonEntrances[26] at offset 52  → dungeon ER connections
    //   - config[0x40]         at offset 0xEC → all 512 confvar bits (settings)
    // Emitted once on first read and again only on change.
    // Comparison uses a signature of only the fields the tracker uses (not entrancesSong/Owl/Spawns
    // at offsets 164-235) to avoid re-emitting due to volatile noise in those fields.
    void PollComboConfig()
    {
        if (_state.ComboConfigAddr is null) return;

        var buf = _mem!.Read(_state.ComboConfigAddr.Value + (uint)N64Addresses.ComboConfigReadOffset,
                             N64Addresses.ComboConfigReadSize);
        if (buf is null) return;

        var sig = ComboConfigSignature(buf);
        if (_state.ComboConfigSignature is not null && sig.SequenceEqual(_state.ComboConfigSignature))
            return;

        _state.ComboConfigSignature = sig;
        _state.ComboConfigSnapshot  = buf;
        _emit(new { type = "combo_config", data = Convert.ToBase64String(buf) });
        Console.WriteLine("[autotracker] combo_config emitted.");
    }

    // Extracts a compact signature covering only the fields the tracker actually reads:
    // dungeonEntrances[26] (offset 52, 104 bytes) + mq (offset 156, 4 bytes) + config[0x40] (offset 236, 64 bytes).
    static byte[] ComboConfigSignature(byte[] buf)
    {
        var sig = new byte[104 + 4 + 64];
        Array.Copy(buf, N64Addresses.ComboConfigDungeonEntrOff,  sig, 0,   104); // dungeonEntrances
        Array.Copy(buf, 156,                                      sig, 104, 4);   // mq
        Array.Copy(buf, N64Addresses.ComboConfigBitsOff,         sig, 108, 64);  // config[0x40]
        return sig;
    }

    // Polls gSharedCustomSave.oot.hasSong* — set by item_add.c when MM songs are
    // obtained in OoT (these do not appear in the native MM gSaveContext quest bits).
    // Gated on PayloadMmSaveAddr (validated gMmSave): SharedCustomSave sits at the same BSS
    // base +0x3CA0.  If gMmSave is unvalidated, SharedCustomSave may hold stale RDRAM data
    // from a prior session (e.g. songs the player doesn't own yet).
    void PollSharedCustomSave()
    {
        if (_state.SharedCustomSaveAddr is null) return;
        if (_state.PayloadMmSaveAddr is null) return; // wait for gMmSave validation

        // Read 2 bytes at offset 0x362 within SharedCustomSave (OotCustomSave.hasSong* bitfield).
        var buf = _mem!.Read(_state.SharedCustomSaveAddr.Value + (uint)N64Addresses.SharedCustomSaveSongOff, 2);
        if (buf is null) return;

        if (_state.SharedCustomSaveSnapshot is not null && buf.SequenceEqual(_state.SharedCustomSaveSnapshot))
            return;

        _state.SharedCustomSaveSnapshot = buf;
        _emit(new { type = "shared_custom_save", b0 = (int)buf[0], b1 = (int)buf[1] });
    }

    // Polls OotSave.permanentSceneFlags[124] — chest bits set when a chest is opened.
    // Only emitted on change; the frontend builds a lookup to map (sceneId, bit) → check name.
    void PollOotSceneFlags()
    {
        var buf = _mem!.Read(N64Addresses.OotSceneFlagsAddr, N64Addresses.OotSceneFlagsSize);
        if (buf is null) return;
        if (_state.OotSceneFlagsSnapshot is not null && buf.SequenceEqual(_state.OotSceneFlagsSnapshot)) return;
        _state.OotSceneFlagsSnapshot = buf;
        _emit(new { type = "oot_scene_flags", data = Convert.ToBase64String(buf) });
    }

    // Polls live OoT chest flags from play->actorCtx.flags.chest (updated immediately on chest open).
    // gSaveContext.sceneFlags only syncs at scene exit; this catches changes in real time.
    // PlayState (gGlobalCtx) is a static BSS symbol at a fixed address — no scan needed.
    // Emits "oot_scene_flags" overlaying live chest flags for the current scene onto the
    // gSaveContext snapshot maintained by PollOotSceneFlags.
    void PollOotLiveSceneFlags()
    {
        const uint ps = N64Addresses.OotPlayStateAddr; // 0x801C84A0 — fixed BSS address

        var sceneRaw = _mem!.Read(ps + (uint)N64Addresses.PlayStateSceneOff, 2);
        if (sceneRaw is null) { _state.OotLiveSceneFlagsSnapshot = null; return; }
        int sceneId = (sceneRaw[0] << 8) | sceneRaw[1];
        if (sceneId >= 124) { _state.OotLiveSceneFlagsSnapshot = null; return; }

        var chestRaw = _mem.Read(ps + (uint)N64Addresses.OotPlayStateChestOff, 4);
        if (chestRaw is null) return;
        uint liveChest = (uint)(chestRaw[0]<<24|chestRaw[1]<<16|chestRaw[2]<<8|chestRaw[3]);

        var fullBuf = _state.OotSceneFlagsSnapshot is not null
            ? (byte[])_state.OotSceneFlagsSnapshot.Clone()
            : new byte[N64Addresses.OotSceneFlagsSize];
        int off = sceneId * 0x1C;
        fullBuf[off + 0] = (byte)(liveChest >> 24);
        fullBuf[off + 1] = (byte)(liveChest >> 16);
        fullBuf[off + 2] = (byte)(liveChest >>  8);
        fullBuf[off + 3] = (byte) liveChest;

        if (_state.OotLiveSceneFlagsSnapshot is not null && fullBuf.SequenceEqual(_state.OotLiveSceneFlagsSnapshot)) return;
        _state.OotLiveSceneFlagsSnapshot = fullBuf;
        Console.WriteLine($"[autotracker] oot_scene_flags emitted (live chest=0x{liveChest:X8} scene={sceneId})");
        _emit(new { type = "oot_scene_flags", data = Convert.ToBase64String(fullBuf) });
    }

    // Polls live MM chest flags from play->actorCtx.flags.chest (updated immediately on chest open).
    // Mirrors PollOotLiveSceneFlags — same pattern, different PlayState address and offsets.
    void PollMmLiveSceneFlags()
    {
        const uint ps = N64Addresses.MmPlayStateAddr; // 0x803E6B20 — fixed BSS address

        var sceneRaw = _mem!.Read(ps + (uint)N64Addresses.PlayStateSceneOff, 2);
        if (sceneRaw is null) { _state.MmLiveSceneFlagsSnapshot = null; return; }
        int sceneId = (sceneRaw[0] << 8) | sceneRaw[1];
        if (sceneId >= 120) { _state.MmLiveSceneFlagsSnapshot = null; return; }

        var chestRaw = _mem.Read(ps + (uint)N64Addresses.MmPlayStateChestOff, 4);
        if (chestRaw is null) return;
        uint liveChest = (uint)(chestRaw[0]<<24|chestRaw[1]<<16|chestRaw[2]<<8|chestRaw[3]);

        var fullBuf = _state.MmSceneFlagsSnapshot is not null
            ? (byte[])_state.MmSceneFlagsSnapshot.Clone()
            : new byte[N64Addresses.MmSceneFlagsSize];
        int off = sceneId * 0x1C;
        fullBuf[off + 0] = (byte)(liveChest >> 24);
        fullBuf[off + 1] = (byte)(liveChest >> 16);
        fullBuf[off + 2] = (byte)(liveChest >>  8);
        fullBuf[off + 3] = (byte) liveChest;

        if (_state.MmLiveSceneFlagsSnapshot is not null && fullBuf.SequenceEqual(_state.MmLiveSceneFlagsSnapshot)) return;
        _state.MmLiveSceneFlagsSnapshot = fullBuf;
        Console.WriteLine($"[autotracker] mm_scene_flags emitted (live chest=0x{liveChest:X8} scene={sceneId})");
        _emit(new { type = "mm_scene_flags", data = Convert.ToBase64String(fullBuf) });
    }

    // Polls MmSave.info.permanentSceneFlags[120] — chest bits set when a chest is opened in MM.
    void PollMmSceneFlags()
    {
        var buf = _mem!.Read(N64Addresses.MmSceneFlagsAddr, N64Addresses.MmSceneFlagsSize);
        if (buf is null) return;
        if (_state.MmSceneFlagsSnapshot is not null && buf.SequenceEqual(_state.MmSceneFlagsSnapshot)) return;
        _state.MmSceneFlagsSnapshot = buf;
        _emit(new { type = "mm_scene_flags", data = Convert.ToBase64String(buf) });
    }
}
