using System.Diagnostics;
using System.Text.Json;
using System.Threading;
using Autotracker.Memory;

namespace Autotracker.Tracker;

sealed class MemoryPoller
{
    readonly Action<object> _emit;
    ProcessMemory? _mem;
    PipeMemory? _pipeMem;
    GameState _state = new();
    volatile bool _resetRequested;
    string? _romVersion; // "dev", "release", or null until detected
    int _lastShopKey            = -1; // (isOot?0:0x10000)|sceneId — avoids re-scanning same shop visit
    int   _prevOotLiveSceneId     = -1;
    int   _ootSceneSettleCounter  = 0;
    uint? _ootLiveChestBaseline   = null;
    int   _prevMmLiveSceneId      = -1;
    int   _mmSceneSettleCounter   = 0;
    uint? _mmLiveChestBaseline    = null;
    int   _songEventEmittedSceneOot = -1; // last OoT scene for which song_event_slot was emitted
    int   _songEventEmittedSceneMm  = -1; // last MM scene for which song_event_slot was emitted
    const int SceneSettlePolls  = 5; // 5 × 250ms = 1.25s after scene change before trusting chest flags

    const int PollIntervalMs = 250; // 4Hz
    int _gossipScanCooldown    = 0;  // polls remaining before next RDRAM gossip scan
    int _entranceScanCooldown  = 0;  // polls remaining before next RDRAM entrance scan
    int _overrideScanCooldown  = 0;  // polls remaining before next RDRAM override table scan
    byte[]? _overrideTableBuf = null; // cached sComboOverrides ROM data (for GI lookup)
    Dictionary<uint, string>? _xflagIndex;      // key32 → "game:csvtype:layout", null until loaded
    bool _xflagIndexLoaded = false;

    // Gossip stone read tracking — session cache of hint keys the player has talked to.
    // Persists across WebSocket reconnects; cleared only when PJ64 re-attaches (new game session).
    readonly HashSet<(string game, byte key)> _seenHintKeys = new();
    bool  _gossipTextWasActive      = false; // edge-trigger for MM: was textId==0x20D0 on last poll?
    bool  _ootGossipWasActive       = false; // edge-trigger for OoT: was msgMode != 0 on last poll?
    bool  _reemitSeenHintsNextPoll  = false; // set by ResetSnapshotsForReconnect, consumed by PollGossipStoneRead
    int   _gossipOotLastSceneId     = -1;    // OoT sceneId last seen by PollGossipStoneRead (for baseline reset)
    int   _ootGossipSceneSettle     = 0;     // polls to wait after scene change before detecting OoT gossip

    // Altar read tracking — similar to gossip stones but for dungeon reward hint signs.
    readonly HashSet<(string game, string age)> _seenAltarFlags = new();
    bool _reemitSeenAltarNextPoll  = false; // set by ResetSnapshotsForReconnect, consumed by PollAltarRead
    int _pollCount = 0; // poll counter (unused, kept for future use)
    int _comboCtxFailCount = 0; // rate-limiter for combo context missing log
    int  _healthCheckFails   = 0;      // consecutive failed health checks
    int  _nullAddrLogSkip    = 0;      // rate-limiter for "SharedCustomSaveAddr null" log spam
    bool _isRdramRelocation = false; // true when health check triggered silent reattach (OoT↔MM)
    int _reattachAttempts   = 0;    // reattach attempts since RDRAM relocation
    int  _comboConfigEmitCount = 0;  // consecutive emissions since confirmation (volatility guard)
    DateTime _comboConfigFirstEmit = DateTime.MinValue;
    byte[]? _ootNpcFlagsBaseline = null; // first poll discard: skip until data changes (detects bzero flush)
    int     _ootNpcFlagsStablePolls = 0;

    const int StableTimeoutPolls       = 10;  // NPC flags only

    // Xflag lookup tables (static files: xflag_table_{game}_{scenes/setups/rooms}.bin).
    // Used to compute bit position from ComboItemQuery key for frontend compatibility.
    byte[]? _ootXflagScenesTbl = null;
    byte[]? _ootXflagSetupsTbl = null;
    byte[]? _ootXflagRoomsTbl  = null;
    byte[]? _mmXflagScenesTbl  = null;
    byte[]? _mmXflagSetupsTbl  = null;
    byte[]? _mmXflagRoomsTbl   = null;

    // Xflag bitmap polling — diff-only (bits that just became 1) to avoid oscillations.
    byte[]? _ootXflagSnapshot = null;    // last emitted snapshot
    byte[]? _ootXflagPrevBuf  = null;    // previous raw read (2-consecutive guard)
    byte[]? _ootXflagSessionBaseline = null; // baseline at session start
    bool    _ootXflagBaselineFrozen = false;
    byte[]? _mmXflagSnapshot = null;
    byte[]? _mmXflagPrevBuf  = null;
    byte[]? _mmXflagSessionBaseline = null;
    bool    _mmXflagBaselineFrozen = false;

    // MIPS PC hook via pjmembridge — fires when comboAddItemRawEx enters interpreter.
    // Addresses found by scanning the OoT/MM combo payload for the prologue.
    uint? _mipsOotPc  = null;
    uint? _mipsMmPc   = null;
    bool   _mipsHookArmed = false;
    long   _lastOotPcEvents = 0;
    long   _lastMmPcEvents  = 0;
    uint   _lastOotQueryAddr = 0;
    uint   _lastMmQueryAddr  = 0;

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
                    if (_isRdramRelocation)
                    {
                        _reattachAttempts++;
                        if (_reattachAttempts >= 10) // ~20s — treat as real disconnect
                        {
                            Console.WriteLine("[autotracker] Reattach after RDRAM relocation timed out — disconnecting.");
                            _isRdramRelocation = false;
                            _reattachAttempts  = 0;
                            _state = new GameState();
                            _seenHintKeys.Clear();
                            _reemitSeenHintsNextPoll = false;
                            _emit(new { type = "disconnected" });
                        }
                    }
                    await Task.Delay(2000, ct);
                    continue;
                }
                _reattachAttempts = 0;

                if (_isRdramRelocation)
                {
                    // OoT↔MM transitions: RDRAM base stays constant but N64 virtual addresses
                    // all change (OoT vs MM have different BSS layouts). Full rescan is required.
                    // Skip "disconnected" to avoid a UI flash; "connected" fires once ComboContext
                    // is found by TryFindComboContext on the next Poll().
                    _isRdramRelocation    = false;
                    _comboConfigEmitCount = 0;
                    _comboConfigFirstEmit = DateTime.MinValue;
                    _entranceScanCooldown = 0;
                    _gossipScanCooldown   = 0;
                    Console.WriteLine("[autotracker] Reattached after game transition — full rescan (no disconnect emitted).");
                    _state = new GameState();
                    // Preserve _seenHintKeys: same save session, just crossing to the other game.
                    _reemitSeenHintsNextPoll = false;
                }
                else
                {
                    Console.WriteLine("[autotracker] Attached to Project64.");
                    _comboConfigEmitCount = 0;
                    _comboConfigFirstEmit = DateTime.MinValue;
                    _state = new GameState();
                    _seenHintKeys.Clear();          // new PJ64 session = new game, discard read cache
                    _reemitSeenHintsNextPoll = false;
                }
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
                _pipeMem?.Dispose();
                _pipeMem = null;
                _state = new GameState();
                _emit(new { type = "disconnected" });
            }

            await Task.Delay(PollIntervalMs, ct);
        }
    }

    ProcessMemory? TryAttach()
    {
        var candidates = new[] { "Project64", "Project64d", "Project64-EM", "Project64EM" };
        foreach (var name in candidates)
        {
            var procs = Process.GetProcessesByName(name);
            if (procs.Length == 0) continue;
            Console.WriteLine($"[autotracker] Found process {name} (PID {procs[0].Id}), scanning RDRAM...");
            var mem = ProcessMemory.TryAttach(procs[0]);
            if (mem is null)
            {
                Console.WriteLine("[autotracker] RDRAM not found in this process — magic string absent. Load a save file and retry.");
                continue;
            }
            // Inject pjmembridge.dll for in-process xflag reads (bypasses PJ64 write buffer).
            try
            {
                bool pipeOk = TryInjectPipe(procs[0].Id);
                if (pipeOk)
                    Console.WriteLine("[autotracker] pjmembridge pipe active");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[autotracker] pjmembridge injection error: {ex.Message}");
                _pipeMem?.Dispose();
                _pipeMem = null;
            }
            return mem;
        }
        return null;
    }

    bool TryInjectPipe(int pid)
    {
        string dllPath = Path.Combine(AppContext.BaseDirectory, "pjmembridge.dll");
        if (!File.Exists(dllPath))
        {
            Console.WriteLine($"[autotracker] pjmembridge.dll not found at {dllPath}");
            return false;
        }

        _pipeMem?.Dispose();
        _pipeMem = new PipeMemory(pid);
        if (!_pipeMem.Inject(dllPath))
        {
            Console.WriteLine("[autotracker] pjmembridge injection failed -- your antivirus may be blocking it.");
            Console.WriteLine("  To fix this, add an exclusion for the tracker folder in Windows Security:");
            Console.WriteLine("    Open Windows Security > Virus & threat protection > Manage settings");
            Console.WriteLine("    Under 'Exclusions', click 'Add or remove exclusions'");
            Console.WriteLine("    Click 'Add an exclusion' > 'Folder' and select the tracker's directory.");
            return false;
        }

        // Connect to the pipe
        for (int i = 0; i < 20; i++)
        {
            if (_pipeMem.Connect(500)) return true;
            Thread.Sleep(200);
        }
        Console.WriteLine("[autotracker] pjmembridge pipe connect timed out");
        _pipeMem.Dispose();
        _pipeMem = null;
        return false;
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

        // Health check on every poll (250ms). RDRAM relocation during OoT↔MM transitions
        // causes all ReadProcessMemory calls to fail on the old base address simultaneously.
        // 4 consecutive failures (~1s) → reconnect. A single transient failure resets on the
        // next successful read without reconnecting.
        _pollCount++;
        if (_state.ComboContextAddress is not null)
        {
            var magic = _mem!.ReadString(_state.ComboContextAddress!.Value, 8);
            if (magic != "OoT+MM<3")
            {
                _healthCheckFails++;
                if (_healthCheckFails == 1 || _healthCheckFails >= 4)
                    Console.WriteLine($"[autotracker] Health check #{_healthCheckFails}: ComboContext magic lost — {(magic is null ? "process dead?" : $"got \"{magic}\"")}");
                if (_healthCheckFails >= 4)
                {
                    Console.WriteLine("[autotracker] Health check failed 4× — RDRAM relocation assumed, reattaching silently.");
                    _healthCheckFails              = 0;
                    _isRdramRelocation             = true;
                    _mem!.Dispose();
                    _mem = null;
                    _pipeMem?.Dispose();
                    _pipeMem = null;
                    return; // preserve _state: N64 virtual addresses stay valid after RDRAM reloc
                }
                return; // Skip this poll — RDRAM may be mid-relocation, reads would return garbage
            }
            else if (_healthCheckFails > 0)
            {
                _healthCheckFails = 0;
                Console.WriteLine("[autotracker] Health check recovered.");
            }
        }

        // Ensure ComboContext is located.
        if (_state.ComboContextAddress is null)
        {
            if (!TryFindComboContext()) return;
        }

        CheckPayloadMmSaveStillValid(); // detect RDRAM relocation before scanning
        if      (_state.PayloadMmSaveCandidateAddr is null) TryScanOotPayload();
        else if (_state.PayloadMmSaveAddr          is null) TryValidatePayloadMmSave();
        // Only scan the MM payload (gOotSave copy inside MM's BSS) when actually playing MM.
        // In a pure OoT session this BSS retains a STALE "ZELDAZ" from a prior MM session
        // (PJ64-EM does not zero RDRAM), which would produce a garbage MmPayloadSharedCustomSaveAddr
        // and let the xflag merge OR that garbage into the OOT bitmap (false checks).
        if (_state.Game == ActiveGame.Mm && _state.PayloadOotSaveAddr is null) TryScanMmPayload();
        if (_state.ComboConfigAddr is null) TryLocateComboConfig();

        // Fallback: if OoT payload scan never found gMmSave (e.g. game started in MM, or PJ64
        // reconnected in MM mode), use the MM payload's gSharedCustomSave directly if safe.
        // Safe = fully initialized by comboCreateSave (0xFFFF) OR clean BSS (0x0000).
        // Rejects partial garbage (0x00F2) from transitional states.
        if (_state.SharedCustomSaveAddr is null && _state.MmPayloadSharedCustomSaveAddr is not null)
        {
            if (IsMmPayloadFallbackSafe())
            {
                _state.SharedCustomSaveAddr = _state.MmPayloadSharedCustomSaveAddr;
                Console.WriteLine("[autotracker] Using MM payload SharedCustomSave as fallback (OoT payload unavailable)");
                ResetXflagSession();
            }
        }

        DetectActiveGame();

        // Guard: only poll when a save file is loaded and the active game is known.
        // DetectActiveGame sets Game=Unknown at title screen / file select (no save magic).
        if (_state.Game == ActiveGame.Unknown) return;

        PollEntrance();

        // Gate: gSaveContext.gameMode is GAMEMODE_NORMAL (0) only during real gameplay.
        // GAMEMODE_TITLE_SCREEN (1) and GAMEMODE_FILE_SELECT (2) are set during the title/file select.
        // FileSelect_LoadGame() sets gameMode = GAMEMODE_NORMAL just before transitioning to PlayState.
        uint gameModeAddr = _state.Game == ActiveGame.Oot
            ? N64Addresses.SaveContextOot + (uint)N64Addresses.OotGameModeOff
            : N64Addresses.SaveContextMm  + (uint)N64Addresses.MmGameModeOff;
        var gameModeRaw = _mem!.Read(gameModeAddr, 4);
        if (gameModeRaw is null) return;
        int gameMode = (gameModeRaw[0] << 24) | (gameModeRaw[1] << 16) | (gameModeRaw[2] << 8) | gameModeRaw[3];
        if (gameMode != N64Addresses.GameModeNormal) return;

        PollSaveContext();
    }

    // Validates native gMmSave (fixed address 0x801EF670) against the current OoT save.
    // The OoT BSS payload copy may not be synced yet (new game, no MM visit), but native
    // gMmSave is written by comboCreateSave() at game start and always has starting items.
    // Only valid when actively playing OoT — in MM mode, 0x801EF670 is OoT BSS.
    void TryValidateNativeMmSave()
    {
        if (_state.NativeMmSaveValidated) return;
        if (_state.Game != ActiveGame.Oot) return;

        var magic = _mem!.Read(N64Addresses.SaveContextMm + (uint)N64Addresses.MmSave.MagicOffset, 6);
        if (magic is null || System.Text.Encoding.ASCII.GetString(magic) != N64Addresses.SaveMagicMm) return;

        var ootName      = _mem.Read(N64Addresses.SaveContextOot + (uint)N64Addresses.OotPlayerNameOff, 8);
        var nativeMmName = _mem.Read(N64Addresses.SaveContextMm  + (uint)N64Addresses.MmPlayerNameOff, 8);
        if (ootName is null || nativeMmName is null) return;
        if (!CopyName(ootName).SequenceEqual(nativeMmName)) return;

        _state.NativeMmSaveValidated = true;
        Console.WriteLine("[autotracker] native gMmSave validated (name match) — mm_save readable in OoT");
        _emit(new { type = "mm_validated" });
    }

    // Phase 1 — scan the OoT payload BSS (0x80400000–0x80720000) for the payload copy of gMmSave.
    // Identified by "ZELDA3" at offset +0x24 from a 16-byte aligned address.
    // Sets PayloadMmSaveCandidateAddr (not PayloadMmSaveAddr) — validation happens in phase 2.
    // gSharedCustomSave is co-located at +sizeof(MmSave) = +0x3CA0 and is set immediately
    // since it is a separate reliable struct written by OoTMM independently of gMmSave validity.
    void TryScanOotPayload()
    {
        var magicBytes = System.Text.Encoding.ASCII.GetBytes(N64Addresses.SaveMagicMm);

        int scanLen = (int)(N64Addresses.PayloadOotEnd - N64Addresses.PayloadOotStart);
        var buf = _mem!.Read(N64Addresses.PayloadOotStart, scanLen);
        if (buf is not null)
        {
            for (int i = 0; i + N64Addresses.PayloadMmSaveMagicOffset + magicBytes.Length <= buf.Length; i += 16)
            {
                bool match = true;
                for (int j = 0; j < magicBytes.Length; j++)
                    if (buf[i + N64Addresses.PayloadMmSaveMagicOffset + j] != magicBytes[j]) { match = false; break; }
                if (!match) continue;
                // Reject candidates where any MM player name byte > 0x40 — valid encoded names
                // use 0x00–0x40 only. Stale RDRAM from a prior PJ64 session often has out-of-range bytes.
                bool nameValid = i + N64Addresses.MmPlayerNameOff + 8 <= buf.Length;
                for (int j = 0; j < 8 && nameValid; j++)
                    if (buf[i + N64Addresses.MmPlayerNameOff + j] > 0x40) nameValid = false;
                if (!nameValid) continue;
                _state.PayloadMmSaveCandidateAddr = N64Addresses.PayloadOotStart + (uint)i;
                var scAddr = _state.PayloadMmSaveCandidateAddr.Value + (uint)N64Addresses.PayloadMmSaveSize;
                _state.SharedCustomSaveAddr ??= scAddr;
                Console.WriteLine($"[autotracker] OoT payload: gMmSave candidate=0x{_state.PayloadMmSaveCandidateAddr:X8}, gSharedCustomSave=0x{scAddr:X8}, validating...");
                return;
            }
        }

        // No match in upper RDRAM — scan lower RDRAM for dev builds where payload BSS starts below 0x80400000.
        // Skip the native gMmSave at SaveContextMm (handled separately by TryValidateNativeMmSave).
        const uint lowerScanBase = 0x80100000u;
        int lowerLen = (int)(N64Addresses.PayloadOotStart - lowerScanBase);
        var lowerBuf = _mem.Read(lowerScanBase, lowerLen);
        if (lowerBuf is null) return;

        for (int i = 0; i + N64Addresses.PayloadMmSaveMagicOffset + magicBytes.Length <= lowerBuf.Length; i += 16)
        {
            uint candidateAddr = lowerScanBase + (uint)i;
            if (candidateAddr == N64Addresses.SaveContextMm) continue; // skip native gMmSave
            bool match = true;
            for (int j = 0; j < magicBytes.Length; j++)
                if (lowerBuf[i + N64Addresses.PayloadMmSaveMagicOffset + j] != magicBytes[j]) { match = false; break; }
            if (!match) continue;
            bool nameValid = i + N64Addresses.MmPlayerNameOff + 8 <= lowerBuf.Length;
            for (int j = 0; j < 8 && nameValid; j++)
                if (lowerBuf[i + N64Addresses.MmPlayerNameOff + j] > 0x40) nameValid = false;
            if (!nameValid) continue;
            _state.PayloadMmSaveCandidateAddr = candidateAddr;
            var scAddr = candidateAddr + (uint)N64Addresses.PayloadMmSaveSize;
            _state.SharedCustomSaveAddr ??= scAddr;
            Console.WriteLine($"[autotracker] OoT payload (lower RDRAM): gMmSave candidate=0x{candidateAddr:X8}, gSharedCustomSave=0x{scAddr:X8}, validating...");
            break;
        }
    }

    // Resets all xflag/NPC baselines when a new game session is detected.
    void ResetXflagSession()
    {
        _ootNpcFlagsBaseline    = null;
        _ootNpcFlagsStablePolls = 0;
        _state.OotXflagsSnapshot   = null;
        _state.MmXflagsSnapshot    = null;
        _state.OotNpcFlagsSnapshot = null;
        _mipsOotPc  = null;
        _mipsMmPc   = null;
        _mipsHookArmed = false;
        _lastOotPcEvents  = 0;
        _lastMmPcEvents   = 0;
        _overrideTableBuf = null;
        _ootXflagBaselineFrozen  = false;
        _ootXflagPrevBuf         = null;
        _ootXflagSessionBaseline = null;
        _mmXflagBaselineFrozen   = false;
        _mmXflagPrevBuf          = null;
        _mmXflagSessionBaseline  = null;
        Console.WriteLine("[autotracker] xflag session reset");
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

        // Check 1: playerForm == 4 → Save_CreateMM() was called for this session (fresh init).
        var formBuf = _mem!.Read(addr + (uint)N64Addresses.MmPlayerFormOff, 1);
        if (formBuf is not null && formBuf[0] == 4)
        {
            _state.PayloadMmSaveAddr = addr;
            _state.SharedCustomSaveAddr = addr + (uint)N64Addresses.PayloadMmSaveSize;
            Console.WriteLine($"[autotracker] gMmSave validated at 0x{addr:X8} (playerForm=4, fresh init)");
            ResetXflagSession();
            return;
        }

        // Check 2: copyName(OoT player name) == MM player name (fallback when playerForm is invalid).
        var ootName = _mem.Read(N64Addresses.SaveContextOot + (uint)N64Addresses.OotPlayerNameOff, 8);
        var mmName  = _mem.Read(addr + (uint)N64Addresses.MmPlayerNameOff, 8);
        if (ootName is null || mmName is null) return;

        var converted = CopyName(ootName);
        if (converted.SequenceEqual(mmName))
        {
            _state.PayloadMmSaveAddr = addr;
            _state.SharedCustomSaveAddr = addr + (uint)N64Addresses.PayloadMmSaveSize;
            Console.WriteLine($"[autotracker] gMmSave validated at 0x{addr:X8} (player name match)");
            ResetXflagSession();
        }
        else
        {
            byte pf = formBuf is not null ? formBuf[0] : (byte)0xFF;
            Console.WriteLine($"[autotracker] gMmSave candidate 0x{addr:X8} rejected: playerForm=0x{pf:X2} ootName=[{BitConverter.ToString(ootName)}] conv=[{BitConverter.ToString(converted)}] mmName=[{BitConverter.ToString(mmName)}]");
            _state.PayloadMmSaveCandidateAddr = null; // allow re-scan for the next valid candidate
            // Also clear SharedCustomSaveAddr if it was set from this rejected candidate so the next
            // candidate can overwrite it. Don't clear if it was set via fallback (MmPayload address).
            var expectedScAddr = addr + (uint)N64Addresses.PayloadMmSaveSize;
            if (_state.SharedCustomSaveAddr == expectedScAddr)
                _state.SharedCustomSaveAddr = null;
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

    // Locates gComboConfig via its fixed offset from gComboCtx.
    // gComboConfig (config.c) immediately precedes gComboCtx (context.c) in BSS alphabetically
    // with nothing in between, so gComboConfig = gComboCtx - sizeof(ComboConfig) = gComboCtx - 0x2EC.
    void TryLocateComboConfig()
    {
        if (_state.ComboContextAddress is null) return;

        uint addr = _state.ComboContextAddress.Value - N64Addresses.ComboConfigOffsetFromCtx;

        var buf = _mem!.Read(addr, N64Addresses.ComboConfigReadSizeDev);
        if (buf is null)
        {
            Console.WriteLine($"[autotracker] TryLocateComboConfig: read failed at 0x{addr:X8}");
            return;
        }

        // Sanity check: playerId ≤ 8 (singleplayer=0 or 1, multiworld=1-8).
        if (buf[0] > 0x08)
        {
            Console.WriteLine($"[autotracker] TryLocateComboConfig: 0x{addr:X8} playerId=0x{buf[0]:X2} > 8 — struct layout mismatch?");
            return;
        }

        _state.ComboConfigAddr = addr;
        int bitsOff = N64Addresses.ComboConfigBitsOff;
        int nz = 0; for (int b = 0; b < 64; b++) if (buf[bitsOff + b] != 0) nz++;
        Console.WriteLine($"[autotracker] gComboConfig at 0x{addr:X8} (gComboCtx-0x2EC) playerId={buf[0]} configNonZero={nz}");
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
            _state.MmPayloadSharedCustomSaveAddr = _state.PayloadOotSaveAddr.Value + (uint)N64Addresses.PayloadOotSaveSize;
            Console.WriteLine($"[autotracker] MM payload: gOotSave=0x{_state.PayloadOotSaveAddr:X8}, gSharedCustomSave=0x{_state.MmPayloadSharedCustomSaveAddr:X8}");
        }
    }

    // Returns true if the SharedCustomSave was fully initialized by comboCreateSave (ocarinaButtonMaskOot == 0xFFFF).
    // Only valid when ocarina buttons are NOT randomized. Used for coins/souls guards where 0xFFFF signals
    // comboCreateSave has run. Do NOT use for xflags — see PollOotXflags comment.
    bool IsSharedCustomSaveInitialized(uint addr)
    {
        var btn = _mem!.Read(addr + (uint)N64Addresses.SharedCustomSaveOcarinaBtnOff, 2);
        return btn is not null && btn[0] == 0xFF && btn[1] == 0xFF;
    }

    // Convenience wrapper for the MM payload address.
    bool IsMmPayloadSharedCustomSaveValid() =>
        _state.MmPayloadSharedCustomSaveAddr is not null
        && IsSharedCustomSaveInitialized(_state.MmPayloadSharedCustomSaveAddr.Value);

    // Checks if a SharedCustomSave at any address is safe to read from.
    // Accepts 0xFFFF (fully initialized by comboCreateSave) or 0x0000 (clean BSS — all zeros are
    // correct default values). Rejects partial garbage (e.g. 0x00F2) seen during transitional
    // states when PJ64-EM relocates RDRAM and the old address now holds stale data.
    bool IsSharedCustomSaveTrustworthy(uint addr)
    {
        var btn = _mem!.Read(addr + (uint)N64Addresses.SharedCustomSaveOcarinaBtnOff, 2);
        if (btn is null) return false;
        return (btn[0] == 0x00 && btn[1] == 0x00) || (btn[0] == 0xFF && btn[1] == 0xFF);
    }

    // Verifies ZELDA3 is still present at PayloadMmSaveAddr (OoT payload gMmSave) on each poll.
    // Detects RDRAM relocation by PJ64-EM: if the magic disappeared, clears the validated addresses
    // so the next scan can re-locate the relocated gMmSave. Called once per poll before scanning.
    static readonly byte[] _zelda3Bytes = System.Text.Encoding.ASCII.GetBytes("ZELDA3");
    void CheckPayloadMmSaveStillValid()
    {
        if (_state.PayloadMmSaveAddr is null) return;
        var addr = _state.PayloadMmSaveAddr.Value;
        var magic = _mem!.Read(addr + (uint)N64Addresses.PayloadMmSaveMagicOffset, _zelda3Bytes.Length);
        if (magic is not null && magic.SequenceEqual(_zelda3Bytes)) return;

        Console.WriteLine($"[autotracker] ZELDA3 gone at PayloadMmSaveAddr 0x{addr:X8} — RDRAM relocated, re-scanning OoT payload");
        var expectedScAddr = addr + (uint)N64Addresses.PayloadMmSaveSize;
        if (_state.SharedCustomSaveAddr == expectedScAddr)
            _state.SharedCustomSaveAddr = null;
        _state.PayloadMmSaveAddr        = null;
        _state.PayloadMmSaveCandidateAddr = null;
    }

    // Checks if the MM payload's SharedCustomSave is safe to use as a fallback primary source.
    bool IsMmPayloadFallbackSafe() =>
        _state.MmPayloadSharedCustomSaveAddr is not null
        && IsSharedCustomSaveTrustworthy(_state.MmPayloadSharedCustomSaveAddr.Value);

    // Checks if the MM payload's SharedCustomSave is safe for the xflag/npc MERGE operation.
    // Stricter than IsMmPayloadFallbackSafe: also verifies "ZELDAZ" is still present at
    // PayloadOotSaveAddr — detects RDRAM relocation by PJ64-EM after a game switch. If ZELDAZ
    // is gone the addresses are cleared so TryScanMmPayload re-runs on the next poll.
    static readonly byte[] _zeldazBytes = System.Text.Encoding.ASCII.GetBytes("ZELDAZ");
    bool ValidateMmPayloadForMerge()
    {
        if (_state.PayloadOotSaveAddr is null || _state.MmPayloadSharedCustomSaveAddr is null) return false;

        // Verify ZELDAZ still at gOotSave (MM payload) — guards against RDRAM relocation.
        var magic = _mem!.Read(_state.PayloadOotSaveAddr.Value + (uint)N64Addresses.PayloadOotSaveMagicOffset,
                               _zeldazBytes.Length);
        if (magic is null || !magic.SequenceEqual(_zeldazBytes))
        {
            Console.WriteLine($"[autotracker] ZELDAZ gone at 0x{_state.PayloadOotSaveAddr.Value:X8} — RDRAM relocated, re-scanning MM payload");
            _state.PayloadOotSaveAddr        = null;
            _state.MmPayloadSharedCustomSaveAddr = null;
            return false;
        }

        return IsSharedCustomSaveTrustworthy(_state.MmPayloadSharedCustomSaveAddr.Value);
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
        _state.OotNpcFlagsSnapshot          = null;
        _state.PayloadOotSaveSnapshot        = null;
        _state.ComboConfigSnapshot           = null;
        _state.ComboConfigSignature          = null;
        _state.SoulsDataSnapshot             = null;
        _state.MmSkullTokensSnapshot         = null;
        _state.RustyKeysSnapshot             = null;
        _state.CoinsSnapshot                 = null;
        _state.CoinsMaxSnapshot             = null;
        _state.OotXflagsSnapshot            = null;
        _state.MmXflagsSnapshot             = null;
        _ootNpcFlagsBaseline    = null;
        _ootNpcFlagsStablePolls = 0;
        _state.GossipHintsOotSnapshot        = null;
        _state.GossipHintsMmSnapshot         = null;
        _gossipScanCooldown                  = 0;
        _state.EntranceTableOotSnapshot      = null;
        _state.EntranceTableMmSnapshot       = null;
        _entranceScanCooldown                = 0;
        _state.OverrideTableScanned          = false;
        _overrideScanCooldown                = 0;
        _gossipTextWasActive                 = false;
        _ootGossipWasActive                  = false;
        _gossipOotLastSceneId                = -1;
        _ootGossipSceneSettle                = 0;
        _reemitSeenHintsNextPoll             = true; // re-emit seen keys after gossip_hints is re-emitted
        _reemitSeenAltarNextPoll             = true; // re-emit altar reads after reconnect
        _state.OotSceneFlagsSnapshot         = null;
        _state.MmSceneFlagsSnapshot          = null;
        _state.OotLiveSceneFlagsSnapshot     = null;
        _state.MmLiveSceneFlagsSnapshot      = null;
        _prevOotLiveSceneId                  = -1;
        _ootSceneSettleCounter               = 0;
        _ootLiveChestBaseline                = null;
        _prevMmLiveSceneId                   = -1;
        _mmSceneSettleCounter                = 0;
        _mmLiveChestBaseline                 = null;
        _songEventEmittedSceneOot            = -1;
        _songEventEmittedSceneMm             = -1;
        _lastShopKey                         = -1;
        _ootXflagSnapshot                    = null;
        _ootXflagPrevBuf                     = null;
        _ootXflagSessionBaseline             = null;
        _ootXflagBaselineFrozen              = false;
        _mmXflagSnapshot                     = null;
        _mmXflagPrevBuf                      = null;
        _mmXflagSessionBaseline              = null;
        _mmXflagBaselineFrozen               = false;
        _mipsHookArmed                       = false; // force re-arm after reconnect
        _lastOotPcEvents                     = 0;
        _lastMmPcEvents                      = 0;
        _lastOotQueryAddr                    = 0;
        _lastMmQueryAddr                     = 0;

        // Re-emit "connected" so the frontend clears stale items/checks.
        if (_state.ComboContextAddress is not null)
            _emit(new { type = "connected" });

        // Re-emit cached shop data so the frontend can reapply shop hints without re-entering shops.
        foreach (var cached in _state.ShopDataCache.Values)
            _emit(cached);

        // Force game re-detection so "game: oot/mm" is re-emitted.
        _state.Game                  = ActiveGame.Unknown;
        _state.OotSaveEntrance       = null;
        _state.MmSaveEntrance        = null;
        _state.NativeMmSaveValidated = false;
    }

    bool TryFindComboContext()
    {
        // Check known static addresses first (the real combo context locations).
        foreach (var candidate in new[] { N64Addresses.ComboContextOot, N64Addresses.ComboContextMm })
        {
            var magic = _mem!.ReadString(candidate, 8);
            if (magic == "OoT+MM<3")
            {
                _state.ComboContextAddress = candidate;
                Console.WriteLine($"[autotracker] ComboContext confirmed at 0x{candidate:X8} (swapped={_mem.IsSwapped})");
                _emit(new { type = "connected" });
                return true;
            }
        }

        // If the previously detected address is different from the static ones, check it as fallback.
        var prevAddr = _mem!.ComboCtxN64Addr;
        if (prevAddr != N64Addresses.ComboContextOot && prevAddr != N64Addresses.ComboContextMm)
        {
            var magic = _mem.ReadString(prevAddr, 8);
            if (magic == "OoT+MM<3")
            {
                _state.ComboContextAddress = prevAddr;
                Console.WriteLine($"[autotracker] ComboContext confirmed at non-static 0x{prevAddr:X8} (swapped={_mem.IsSwapped})");
                _emit(new { type = "connected" });
                return true;
            }
        }

        // Debug: dump raw bytes at the static addresses every 60 polls.
        if (++_comboCtxFailCount == 1 || _comboCtxFailCount % 60 == 0)
        {
            foreach (var a in new[] { N64Addresses.ComboContextOot, N64Addresses.ComboContextMm, prevAddr })
            {
                var raw = _mem!.ReadRaw(a, 8);
                string hex = raw is null ? "null" : BitConverter.ToString(raw);
                Console.WriteLine($"[autotracker] ComboContext magic missing at 0x{a:X8}: bytes={hex}");
            }
            Console.WriteLine($"[autotracker] ComboContext magic missing — game may have reset");
        }
        return false;
    }

    // Returns true when OoT's msgCtx.talkActor is a valid En_Gs actor (id=0x1B9).
    // Used as the oscillation guard: En_Gs overlay loading writes to MM BSS, faking a game switch.
    bool OotTalkActorIsEnGs()
    {
        if (_mem is null) return false;
        var raw = _mem.Read(N64Addresses.OotPlayStateAddr + (uint)N64Addresses.OotMsgCtxTalkActorOff, 4);
        if (raw is null) return false;
        uint ptr = (uint)(raw[0]<<24|raw[1]<<16|raw[2]<<8|raw[3]);
        if (ptr < 0x80000000u || ptr >= 0x80800000u) return false;
        var idRaw = _mem.Read(ptr + (uint)N64Addresses.ActorIdOff, 2);
        if (idRaw is null) return false;
        return ((idRaw[0] << 8) | idRaw[1]) == (int)N64Addresses.ActorEnGsOot;
    }

    void DetectActiveGame()
    {
        // Detect OoT vs MM by reading save context magic — more reliable than watching scene IDs.
        // In OoT mode: SaveContextOot+0x1C = "ZELDAZ" (OotSave.info.playerData.newf).
        //   That address is MM BSS in MM mode — won't contain "ZELDAZ".
        // In MM mode:  SaveContextMm+0x24 = "ZELDA3" (MmSave.info.playerData.newf).
        // OoT is checked first: in OoT mode, "ZELDA3" may also appear at SaveContextMm
        //   (native gMmSave copy synced by TryValidateNativeMmSave), so "ZELDAZ" takes priority.
        // Magic absent in both → title screen / file select / mid-transition → inactive.

        var ootMagicRaw = _mem!.Read(N64Addresses.SaveContextOot + (uint)N64Addresses.OotSave.MagicOffset, 6);
        var mmMagicRaw  = _mem.Read(N64Addresses.SaveContextMm   + (uint)N64Addresses.MmSave.MagicOffset,  6);
        if (ootMagicRaw is null || mmMagicRaw is null) return;

        bool ootMagic = System.Text.Encoding.ASCII.GetString(ootMagicRaw) == N64Addresses.SaveMagicOot;
        bool mmMagic  = System.Text.Encoding.ASCII.GetString(mmMagicRaw)  == N64Addresses.SaveMagicMm;

        ActiveGame detected = ootMagic ? ActiveGame.Oot
                            : mmMagic  ? ActiveGame.Mm
                            :            ActiveGame.Unknown;

        // Update save entrances (used by PollOotSceneFlags, PollEntrance, and player_entrance events).
        var ootEntr = _mem.ReadU32(N64Addresses.SaveContextOot);
        var mmEntr  = _mem.ReadU32(N64Addresses.SaveContextMm);
        if (ootEntr is not null) _state.OotSaveEntrance = ootEntr;
        if (mmEntr  is not null) _state.MmSaveEntrance  = mmEntr;

        if (detected == _state.Game) return;

        _state.Game = detected;
        if (detected == ActiveGame.Unknown) return; // title screen — no event
        Console.WriteLine($"[autotracker] Active game: {detected}");
        _emit(new { type = "game", game = detected.ToString().ToLower() });
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
            // Log save entrance of the active game alongside combo entrance for cross-game diagnostics.
            uint? saveEntr = _state.Game == ActiveGame.Mm ? _state.MmSaveEntrance : _state.OotSaveEntrance;
            Console.WriteLine($"[autotracker] Entrance: 0x{entrance:X4} ({(_state.Game == ActiveGame.Mm ? "mm" : "oot")}Save=0x{saveEntr:X8})");
            _emit(new { type = "entrance", value = entrance.Value,
                        game = _state.Game == ActiveGame.Mm ? "mm" : "oot",
                        saveEntrance = saveEntr ?? 0u });
        }
    }

    void PollSaveContext()
    {
        TryValidateNativeMmSave();
        PollOotSave();
        PollMmSave();
        PollPayloadMmSave();
        PollSharedCustomSave();
        PollOotNpcFlags();
        PollOotXflags();
        PollMmXflags();
        TryArmComboAddItemHook();
        PollComboAddItemHookEvents();
        PollSoulsData();
        PollRustyKeys();
        PollCoins();
        PollMmSkullTokens();
        PollPayloadOotSave();
        PollComboConfig();
        PollGossipHints();
        PollGossipStoneRead();
        PollAltarRead();
        PollEntranceTable();
        PollOverrideTable();
        PollOotSceneFlags();
        PollOotLiveSceneFlags();
        PollMmSceneFlags();
        PollMmLiveSceneFlags();
        PollShopData();
    }

    void PollOotSave()
    {
        // Gate on OoT: in MM mode, 0x8011A5D0 is MM BSS, not the OoT save.
        // OoT items obtained in MM are covered by PollPayloadOotSave (payload_oot_save).
        if (_state.Game != ActiveGame.Oot) return;
        // Read 0x300 bytes to cover gTriforceCount at OotSave+0x2F8 (SAVE_EXTRA_RECORD index 19).
        const int saveChunkSize = 0x300;
        var buf = _mem!.Read(N64Addresses.SaveContextOot, saveChunkSize);
        if (buf is null) return;

        if (_state.OotSaveSnapshot is not null && buf.SequenceEqual(_state.OotSaveSnapshot))
            return;

        _state.OotSaveSnapshot = buf;
        _emit(new { type = "oot_save", data = Convert.ToBase64String(buf) });
    }

    void PollMmSave()
    {
        // Gate on MM: in OoT mode, 0x801EF670 is OoT BSS, not the MM save.
        // MM items obtained in OoT are covered by PollPayloadMmSave (payload_mm_save).
        if (_state.Game != ActiveGame.Mm) return;
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
    // Fallback: if the payload scan has not found gMmSave yet but native gMmSave is validated
    // (name+magic confirmed), read directly from SaveContextMm so MM items are visible in OoT.
    void PollPayloadMmSave()
    {
        uint addr;
        if (_state.PayloadMmSaveAddr is not null)
        {
            addr = _state.PayloadMmSaveAddr.Value;
        }
        else if (_state.NativeMmSaveValidated && _state.Game == ActiveGame.Oot)
        {
            addr = N64Addresses.SaveContextMm;
        }
        else
        {
            return;
        }

        const int saveChunkSize = 0x200;
        var buf = _mem!.Read(addr, saveChunkSize);
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

        // Match PollOotSave size so the frontend can read gTriforceCount at 0x2F8.
        const int saveChunkSize = 0x300;
        var buf = _mem!.Read(_state.PayloadOotSaveAddr.Value, saveChunkSize);
        if (buf is null) return;

        if (_state.PayloadOotSaveSnapshot is not null && buf.SequenceEqual(_state.PayloadOotSaveSnapshot))
            return;

        _state.PayloadOotSaveSnapshot = buf;
        _emit(new { type = "payload_oot_save", data = Convert.ToBase64String(buf) });
    }

    // Detects ROM version (dev vs release) from a combo config buffer.
    // Dev has giZoraSapphire (u16 >= 0x10) at offset 0x2A4 and songEventsMm[0] (0-19) at 0x2DC.
    // Release has staticHintsImportance[0..1] (u16 0x0000-0x0303) at 0x2A4 and garbage at 0x2DC.
    static string DetectRomVersion(byte[] buf)
    {
        if (buf.Length < N64Addresses.ComboConfigSongEventsMmCheck + 1)
            return "dev"; // can't determine, assume dev (current)

        // Primary: check byte at 0x2DC — dev has song index (0-19)
        byte songMm = buf[N64Addresses.ComboConfigSongEventsMmCheck];
        if (songMm <= 19)
            return "dev";

        // Secondary check: u16 at 0x2A4 — giZoraSapphire (dev) vs importance byte (release).
        // If 0, gComboConfig is not yet initialised; assume dev to avoid false "release" detection
        // (which would cause _devToRelease lookups for custom-fork-only settings to fail).
        int disc = (buf[N64Addresses.ComboConfigVersionDiscOff] << 8)
                 | buf[N64Addresses.ComboConfigVersionDiscOff + 1];
        if (disc == 0)   return "dev"; // not loaded yet
        if (disc >= 0x10) return "dev";

        return "release";
    }

    // Polls the combo config header from gComboConfig, covering:
    //   - dungeonEntrances[26] at offset 52  → dungeon ER connections
    //   - config[0x40]         at offset 0xEC → all confvar bits (settings)
    // Emitted once on first read and again only on change.
    // Comparison uses a signature of only the fields the tracker uses (not entrancesSong/Owl/Spawns
    // at offsets 164-235) to avoid re-emitting due to volatile noise in those fields.
    void PollComboConfig()
    {
        if (_state.ComboConfigAddr is null) return;

        int readSize = N64Addresses.ComboConfigReadSizeDev;
        if (_romVersion == "release")
            readSize = N64Addresses.ComboConfigReadSizeRelease;
        var buf = _mem!.Read(_state.ComboConfigAddr.Value + (uint)N64Addresses.ComboConfigReadOffset, readSize);
        if (buf is null) return;

        // Detect version on first read
        if (_romVersion is null && buf.Length >= N64Addresses.ComboConfigReadSizeRelease)
        {
            _romVersion = DetectRomVersion(buf);
            Console.WriteLine($"[autotracker] Detected ROM version: {_romVersion}");
        }

        var sig = ComboConfigSignature(buf);
        if (_state.ComboConfigSignature is not null && sig.SequenceEqual(_state.ComboConfigSignature))
        {
            _comboConfigEmitCount = 0; // stable read — reset volatility counter
            return;
        }

        // Volatility guard: if the signature keeps changing rapidly, the address is a false positive.
        // Real gComboConfig is written once at startup; volatile BSS or stack memory changes every poll.
        var now = DateTime.UtcNow;
        if (_comboConfigEmitCount == 0) _comboConfigFirstEmit = now;
        _comboConfigEmitCount++;
        if (_comboConfigEmitCount > 6 && (now - _comboConfigFirstEmit).TotalSeconds < 5.0)
        {
            Console.WriteLine($"[autotracker] gComboConfig at 0x{_state.ComboConfigAddr:X8} is volatile post-confirmation — clearing for re-derive.");
            _state.ComboConfigAddr      = null;
            _state.ComboConfigSignature = null;
            _comboConfigEmitCount       = 0;
            return;
        }

        _state.ComboConfigSignature = sig;
        _state.ComboConfigSnapshot  = buf;
        _emit(new { type = "combo_config", data = Convert.ToBase64String(buf), romVersion = _romVersion ?? "dev" });
        Console.WriteLine("[autotracker] combo_config emitted.");
    }

    // Extracts a compact signature covering only the fields the tracker actually reads.
    // Dev: dungeonEntrances[26] + mq + config[0x40] + songEventsOot[18] + songEventsMm[13].
    // Release: dungeonEntrances[26] + mq + config[0x40] + songEvents[18] (no songEventsMm).
    byte[] ComboConfigSignature(byte[] buf)
    {
        bool isDev = _romVersion != "release";
        int songEventsLen = isDev
            ? (N64Addresses.ComboConfigSongEventsOotCnt + N64Addresses.ComboConfigSongEventsMmCnt)
            : N64Addresses.ComboConfigSongEventsReleaseCnt;
        int songEventsOff = isDev
            ? N64Addresses.ComboConfigSongEventsOotOff
            : N64Addresses.ComboConfigSongEventsReleaseOff;
        int hintsSize = (buf.Length >= N64Addresses.ComboConfigHintsOff + N64Addresses.ComboConfigHintsSize)
            ? N64Addresses.ComboConfigHintsSize : 0;
        var sig = new byte[104 + 4 + 64 + songEventsLen + hintsSize];
        Array.Copy(buf, N64Addresses.ComboConfigDungeonEntrOff, sig, 0,   104); // dungeonEntrances
        Array.Copy(buf, 156,                                     sig, 104, 4);   // mq
        Array.Copy(buf, N64Addresses.ComboConfigBitsOff,        sig, 108, 64);  // config[0x40]
        Array.Copy(buf, songEventsOff,                           sig, 172, songEventsLen); // song events
        if (hintsSize > 0)
            Array.Copy(buf, N64Addresses.ComboConfigHintsOff,   sig, 172 + songEventsLen, hintsSize); // hints
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
        // gMmSave validation ensures OoT payload data isn't stale. Skip this gate when using
        // the MM payload directly (fallback) — that source uses its own validity check.
        if (_state.PayloadMmSaveAddr is null && _state.SharedCustomSaveAddr != _state.MmPayloadSharedCustomSaveAddr) return;

        // Read 2 bytes at offset 0x362 within SharedCustomSave (OotCustomSave.hasSong* bitfield).
        var buf = _mem!.Read(_state.SharedCustomSaveAddr.Value + (uint)N64Addresses.SharedCustomSaveSongOff, 2);
        if (buf is null) return;

        if (_state.SharedCustomSaveSnapshot is not null && buf.SequenceEqual(_state.SharedCustomSaveSnapshot))
            return;

        _state.SharedCustomSaveSnapshot = buf;
        _emit(new { type = "shared_custom_save", b0 = (int)buf[0], b1 = (int)buf[1] });
    }

    // Polls gSharedCustomSave.oot.npc[32] — 256-bit bitmap of NPC reward completions.
    // Each bit index corresponds to an NPC slot ID from data/defs/npc.yml.
    // Gated on PayloadMmSaveAddr validation — same guard as PollSharedCustomSave.
    void PollOotNpcFlags()
    {
        if (_state.SharedCustomSaveAddr is null)
        {
            if (_nullAddrLogSkip-- <= 0) { Console.Error.WriteLine("[autotrack] PollOotNpcFlags: SharedCustomSaveAddr null"); _nullAddrLogSkip = 400; }
            return;
        }
        if (_state.PayloadMmSaveAddr is null && _state.SharedCustomSaveAddr != _state.MmPayloadSharedCustomSaveAddr)
        {
            if (_nullAddrLogSkip-- <= 0) { Console.Error.WriteLine("[autotrack] PollOotNpcFlags: PayloadMmSaveAddr null"); _nullAddrLogSkip = 400; }
            return;
        }
        // In fallback mode (SharedCustomSaveAddr == MmPayloadSharedCustomSaveAddr but PayloadMmSaveAddr
        // not yet validated), still require ocarina mask sentinel. When fully validated, skip it:
        // ocarina buttons may be partially collected (mask 0x0007 etc.) and the address is already
        // confirmed by playerForm/name — calling IsSharedCustomSaveTrustworthy would block emission.
        if (_state.PayloadMmSaveAddr is null
            && !IsSharedCustomSaveTrustworthy(_state.SharedCustomSaveAddr.Value)) return;

        var npcAddr = _state.SharedCustomSaveAddr.Value + (uint)N64Addresses.OotNpcFlagsOff;
        var buf = ReadXflagSafe(npcAddr, N64Addresses.OotNpcFlagsSize);
        if (buf is null) { Console.Error.WriteLine("[autotrack] PollOotNpcFlags: read returned null"); return; }
        // Dump raw bytes for debugging
        if (_state.OotNpcFlagsSnapshot is null)
            Console.Error.WriteLine($"[autotrack] PollOotNpcFlags: raw read at 0x{npcAddr:X8}: {BitConverter.ToString(buf)}");

        // Merge with MM payload's SharedCustomSave.npc (same struct layout, offset 0x2E8).
        // Skip if both addresses point to the same data (fallback mode — no separate MM copy to merge).
        if (_state.MmPayloadSharedCustomSaveAddr is not null
            && _state.MmPayloadSharedCustomSaveAddr != _state.SharedCustomSaveAddr
            && IsMmPayloadSharedCustomSaveValid())
        {
            var mmBuf = ReadXflagSafe(_state.MmPayloadSharedCustomSaveAddr.Value + (uint)N64Addresses.OotNpcFlagsOff,
                                      N64Addresses.OotNpcFlagsSize);
            if (mmBuf is not null)
            {
                for (int i = 0; i < buf.Length; i++)
                    buf[i] |= mmBuf[i];
                if (_state.OotNpcFlagsSnapshot is null)
                    Console.Error.WriteLine($"[autotrack] PollOotNpcFlags: merged with MM payload");
            }
        }

        // Wait-for-change with timeout guard: first poll captures baseline, skip until
        // data changes (detects bzero flush). Timeout at StableTimeoutPolls (~2.5s)
        // prevents permanent block if PJ64 write buffer never flushes.
        if (_ootNpcFlagsBaseline is null) { _ootNpcFlagsBaseline = [..buf]; _ootNpcFlagsStablePolls = 0; return; }
        if (buf.AsSpan().SequenceEqual(_ootNpcFlagsBaseline))
        {
            if (++_ootNpcFlagsStablePolls < StableTimeoutPolls) return;
        }
        else
        {
            _ootNpcFlagsBaseline = [..buf];
            _ootNpcFlagsStablePolls = 0;
        }

        if (_state.OotNpcFlagsSnapshot is not null && buf.SequenceEqual(_state.OotNpcFlagsSnapshot))
            return;

        _state.OotNpcFlagsSnapshot = buf;
        int nonZero = buf.Count(b => b != 0);
        Console.Error.WriteLine($"[autotrack] PollOotNpcFlags: emitting {buf.Length} bytes, {nonZero} non-zero");
        _emit(new { type = "oot_npc_flags", data = Convert.ToBase64String(buf) });
    }

    // Poll OoT xflags bitmap (762 bits) — one-shot baseline sync only.
    // Real-time tracking is handled exclusively by the comboAddItemRawEx MIPS hook
    // (ProcessComboAddItemCapture). This function only captures "already collected before
    // attach" state once per session via the full-buffer oot_xflags message.
    void PollOotXflags()
    {
        if (_state.SharedCustomSaveAddr is null) return;
        if (_state.PayloadMmSaveAddr is null && _state.SharedCustomSaveAddr != _state.MmPayloadSharedCustomSaveAddr) return;
        if (_ootXflagBaselineFrozen) return;

        var addr = _state.SharedCustomSaveAddr.Value + (uint)N64Addresses.SharedCustomSaveOotXflagsOff;
        var buf = ReadXflagSafe(addr, N64Addresses.SharedCustomSaveOotXflagsSize);
        if (buf is null) return;

        // Two-consecutive-read guard before freezing baseline (avoid freezing on garbage).
        if (_ootXflagPrevBuf is null || !buf.AsSpan().SequenceEqual(_ootXflagPrevBuf))
        {
            _ootXflagPrevBuf = [..buf];
            return;
        }

        _ootXflagSessionBaseline = [..buf];
        _ootXflagSnapshot = [..buf];
        _ootXflagBaselineFrozen = true;

        int nonZero = buf.Count(b => b != 0);
        Console.Error.WriteLine($"[autotrack] PollOotXflags: baseline frozen ({nonZero} non-zero bytes) — sending one-shot full sync");

        _emit(new { type = "oot_xflags", data = Convert.ToBase64String(buf) });
    }

    // Poll MM xflags bitmap (848 bits) — one-shot baseline sync only.
    // Real-time tracking is handled exclusively by the comboAddItemRawEx MIPS hook
    // (ProcessComboAddItemCapture). See PollOotXflags for rationale.
    void PollMmXflags()
    {
        if (_state.SharedCustomSaveAddr is null) return;
        if (_state.PayloadMmSaveAddr is null && _state.SharedCustomSaveAddr != _state.MmPayloadSharedCustomSaveAddr) return;
        if (_mmXflagBaselineFrozen) return;

        var addr = _state.SharedCustomSaveAddr.Value + (uint)N64Addresses.SharedCustomSaveMmXflagsOff;
        var buf = ReadXflagSafe(addr, N64Addresses.SharedCustomSaveMmXflagsSize);
        if (buf is null) return;

        if (_mmXflagPrevBuf is null || !buf.AsSpan().SequenceEqual(_mmXflagPrevBuf))
        {
            _mmXflagPrevBuf = [..buf];
            return;
        }

        _mmXflagSessionBaseline = [..buf];
        _mmXflagSnapshot = [..buf];
        _mmXflagBaselineFrozen = true;

        int nonZero = buf.Count(b => b != 0);
        Console.Error.WriteLine($"[autotrack] PollMmXflags: baseline frozen ({nonZero} non-zero bytes) — sending one-shot full sync");

        _emit(new { type = "mm_xflags", data = Convert.ToBase64String(buf) });
    }

    // Returns a compact string listing set xflag bit indices, e.g. "3,17,42,..." (capped at maxBits).
    // BITMAP8 convention: byte b, bit p → xflag index b*8+p.
    static string FormatSetBits(byte[] buf, int maxBits = 32)
    {
        var sb = new System.Text.StringBuilder();
        int count = 0;
        for (int b = 0; b < buf.Length && count < maxBits; b++)
        {
            if (buf[b] == 0) continue;
            for (int p = 0; p < 8 && count < maxBits; p++)
            {
                if ((buf[b] & (1 << p)) != 0)
                {
                    if (sb.Length > 0) sb.Append(',');
                    sb.Append(b * 8 + p);
                    count++;
                }
            }
        }
        int total = 0;
        for (int b = 0; b < buf.Length; b++)
            for (int p = 0; p < 8; p++)
                if ((buf[b] & (1 << p)) != 0) total++;
        if (total > maxBits) sb.Append($"... (+{total - maxBits} more)");
        return sb.Length == 0 ? "(none)" : sb.ToString();
    }

    // Read N64 memory exclusively through the pjmembridge pipe (no ReadProcessMemory fallback).
    byte[]? ReadXflagSafe(uint n64Address, int size)
    {
        if (_pipeMem is null || _mem is null) return null;
        return _pipeMem.ReadN64(n64Address, size, _mem.RdramBase, _mem.UpperRdramBase, _mem.IsSwapped);
    }

    // Polls gSharedCustomSave.oot.xflags[762] — bitmap set by comboXflagsSetOot.
    // Two-consecutive + session baseline eliminate save-load false positives.
    // ── comboAddItemRawEx MIPS PC hook ──────────────────────────────────────────

    // Scan the OoT or MM combo payload for comboAddItemRawEx.
    // Tries exact prologue pattern first; falls back to ADDIU SP,-0x38 then checks saved regs.
    uint? ScanRdramForComboAddItemRawEx(bool isOot)
    {
        uint start = isOot ? N64Addresses.PayloadOotStart : N64Addresses.PayloadMmStart;
        uint end   = isOot ? N64Addresses.PayloadMmStart  : 0x80800000u;
        const int chunkSize = 0x8000;
        const int overlap   = 64;

        // comboAddItemRawEx prologue (28 bytes):
        // 27 BD FF C8  ADDIU SP, SP, -0x38
        // AF B3 00 30  SW S3, 0x30(SP)
        // 00 80 98 25  OR S3, A0, R0
        // 27 A4 00 18  ADDIU A0, SP, 0x18
        // AF B2 00 2C  SW S2, 0x2C(SP)
        // AF B0 00 24  SW S0, 0x24(SP)
        // AF BF 00 34  SW RA, 0x34(SP)
        byte[] patExact = [0x27,0xBD,0xFF,0xC8, 0xAF,0xB3,0x00,0x30, 0x00,0x80,0x98,0x25,
                           0x27,0xA4,0x00,0x18, 0xAF,0xB2,0x00,0x2C, 0xAF,0xB0,0x00,0x24,
                           0xAF,0xBF,0x00,0x34];

        // Fallback pattern: ADDIU SP, -0x38 + SW S3 at +4 + OR S3,A0 + ADDIU A0,SP,0x18 (16 bytes)
        byte[] patFallback = [0x27,0xBD,0xFF,0xC8, 0xAF,0xB3,0x00,0x30,
                              0x00,0x80,0x98,0x25, 0x27,0xA4,0x00,0x18];

        for (uint addr = start; addr < end; addr += (uint)(chunkSize - overlap))
        {
            int readSz = (int)Math.Min(chunkSize, end - addr);
            var chunk = ReadXflagSafe(addr, readSz);
            if (chunk is null) continue;

            for (int i = 0; i + patExact.Length <= chunk.Length; i += 4)
            {
                bool match = true;
                for (int j = 0; j < patExact.Length; j++)
                    if (chunk[i + j] != patExact[j]) { match = false; break; }
                if (!match) continue;
                uint pc = addr + (uint)i;
                Console.Error.WriteLine($"[autotrack] Found comboAddItemRawEx at 0x{pc:X8} ({isOot})");
                return pc;
            }
        }

        // Fallback: look for ADDIU SP, -0x38 + ADDIU A0, SP, 0x18 within next 40 bytes
        for (uint addr = start; addr < end; addr += (uint)(chunkSize - overlap))
        {
            int readSz = (int)Math.Min(chunkSize, end - addr);
            var chunk = _mem?.Read(addr, readSz & ~3);
            if (chunk is null) continue;

            for (int i = 0; i + 8 <= chunk.Length; i += 4)
            {
                if (chunk[i+0]!=0x27||chunk[i+1]!=0xBD||chunk[i+2]!=0xFF||chunk[i+3]!=0xC8) continue;
                // Look for ADDIU A0, SP, 0x18 within next 40 bytes
                int endJ = Math.Min(i + 40, chunk.Length - 4);
                bool foundA0 = false;
                for (int j = i + 4; j <= endJ; j += 4)
                    if (chunk[j+0]==0x27&&chunk[j+1]==0xA4&&chunk[j+2]==0x00&&chunk[j+3]==0x18)
                        { foundA0 = true; break; }
                if (!foundA0) continue;

                uint pc = addr + (uint)i;
                Console.Error.WriteLine($"[autotrack] Found comboAddItemRawEx at 0x{pc:X8} ({isOot}, fallback)");
                return pc;
            }
        }

        Console.Error.WriteLine($"[autotrack] ScanRdramForComboAddItemRawEx({isOot}): not found");
        return null;
    }

    int _hookScanCooldown = 0; // polls to skip between scans (reduce spam)

    void TryArmComboAddItemHook()
    {
        if (_pipeMem is null) return;
        if (_mem is null || _mem.RdramBase == 0) return;
        if (_mipsOotPc is not null && _mipsMmPc is not null) return; // both resolved

        if (_hookScanCooldown > 0) { _hookScanCooldown--; return; }
        _hookScanCooldown = 10; // retry scan every ~2.5s

        bool foundNew = false;
        if (_mipsOotPc is null)
        {
            _mipsOotPc = ScanRdramForComboAddItemRawEx(true);
            if (_mipsOotPc is not null) foundNew = true;
        }
        if (_mipsMmPc is null)
        {
            _mipsMmPc = ScanRdramForComboAddItemRawEx(false);
            if (_mipsMmPc is not null) foundNew = true;
        }

        if (_mipsOotPc is null && _mipsMmPc is null) return;
        if (_mipsHookArmed && !foundNew) return; // already armed, nothing new this poll

        int result = _pipeMem.SetMipsPcHook(_mipsOotPc ?? 0, _mipsMmPc ?? 0);
        if (result > 0)
        {
            _mipsHookArmed = true;
            Console.Error.WriteLine($"[autotrack] MIPS PC hook armed: oot=0x{_mipsOotPc:X8} mm=0x{_mipsMmPc:X8}");
        }
    }

    void PollComboAddItemHookEvents()
    {
        if (!_mipsHookArmed) return;
        if (_pipeMem is null || _mem is null || _mem.RdramBase == 0) return;

        var (ootCount, mmCount, queryAddr) = _pipeMem.PollMipsPcEvents();
        if (ootCount < 0) return;

        // pjmembridge returns a single shared queryAddr (the last captured one).
        // We track per-game queryAddr separately so that a stale addr from the
        // other game is not spuriously processed.
        if (ootCount != _lastOotPcEvents && queryAddr != _lastOotQueryAddr)
        {
            _lastOotPcEvents = ootCount;
            _lastOotQueryAddr = queryAddr;
            ProcessComboAddItemCapture(queryAddr, "oot");
        }
        if (mmCount != _lastMmPcEvents && queryAddr != _lastMmQueryAddr)
        {
            _lastMmPcEvents = mmCount;
            _lastMmQueryAddr = queryAddr;
            ProcessComboAddItemCapture(queryAddr, "mm");
        }
    }

    void ProcessComboAddItemCapture(uint queryAddr, string game)
    {
        if (queryAddr == 0) return;

        var buf = _mem!.Read(queryAddr, 12);
        if (buf is null || buf.Length < 12)
        {
            Console.Error.WriteLine($"[autotrack] ProcessComboAddItemCapture: read 12 bytes failed at 0x{queryAddr:X8}");
            return;
        }

        // ComboItemQuery (big-endian):
        // +0x00: gi (s16), +0x02: giRenew (s16), +0x04: ovFlags (u16)
        // +0x06: ovType (u8), +0x07: sceneId (u8), +0x08: roomEncoded (u8), +0x09: id (u8), +0x0A: from (u8)
        int  gi           = (buf[0] << 8) | buf[1];
        byte ovType       = buf[6];
        byte sceneId      = buf[7];
        byte roomEncoded  = buf[8];
        byte localId      = buf[9];
        uint key32 = (uint)((ovType << 24) | (sceneId << 16) | (roomEncoded << 8) | localId);

        int? overrideGi = GetGiFromXflag(key32);
        int actualGi = overrideGi ?? gi;

        int? bitPos = null;
        string? tag = null;
        _xflagIndex?.TryGetValue(key32, out tag);

        int sliceId = ovType - N64Addresses.OvXflagMin;
        int setupId = (roomEncoded >> 6) & 3;
        int actualRoomId = roomEncoded & 0x3f;

        if (game == "oot" && _ootXflagScenesTbl is not null && _ootXflagSetupsTbl is not null && _ootXflagRoomsTbl is not null)
            bitPos = ComputeXflagBitPos(sceneId, setupId, actualRoomId, sliceId, localId,
                                        _ootXflagScenesTbl, _ootXflagSetupsTbl, _ootXflagRoomsTbl);
        else if (game == "mm" && _mmXflagScenesTbl is not null && _mmXflagSetupsTbl is not null && _mmXflagRoomsTbl is not null)
            bitPos = ComputeXflagBitPos(sceneId, setupId, actualRoomId, sliceId, localId,
                                        _mmXflagScenesTbl, _mmXflagSetupsTbl, _mmXflagRoomsTbl);

        Console.Error.WriteLine($"[autotrack] comboAddItemRawEx: game={game} key=0x{key32:X8} gi={gi} overrideGi={overrideGi} bit={bitPos} tag={tag}");

        // GI_NOTHING (-1) means the override slot is empty (decorative pot/crate/grass) — skip.
        if (actualGi == -1)
        {
            Console.Error.WriteLine($"[autotrack] comboAddItemRawEx: GI_NOTHING (key=0x{key32:X8}) — skipping");
        }
        else if (bitPos.HasValue)
        {
            _emit(new { type = "xflag_collected", game, bit = bitPos.Value, gi = actualGi, tag });
        }
    }
    // ── PollOotXflags/PollMmXflags are now one-shot baseline sync only (see above) ──
    // Real-time xflag_collected events come exclusively from ProcessComboAddItemCapture.

    // Look up the GI value for a given xflag key32 from the cached override table.
    int? GetGiFromXflag(uint key32)
    {
        if (_overrideTableBuf is null || _state.OverrideTableCount == 0) return null;
        int entrySize = N64Addresses.OverrideEntrySize;
        int count = _state.OverrideTableCount;
        int lo = 0, hi = count - 1;
        while (lo <= hi)
        {
            int mid = (lo + hi) >> 1;
            int off = mid * entrySize;
            uint k = (uint)((_overrideTableBuf[off] << 24) | (_overrideTableBuf[off + 1] << 16)
                          | (_overrideTableBuf[off + 2] << 8) | _overrideTableBuf[off + 3]);
            if (k == key32)
                return (_overrideTableBuf[off + N64Addresses.OverrideGiOffset] << 8)
                     | _overrideTableBuf[off + N64Addresses.OverrideGiOffset + 1];
            if (k < key32) lo = mid + 1;
            else hi = mid - 1;
        }
        return null;
    }

    // Poll MIPS PC hook event counters and captured Xflag* address.
    // When a new comboXflagsSetOot call is detected, reads the 5-byte Xflag struct from
    // RDRAM at the captured address (which should have the correct data since the ~4KB
    // N64 data cache is almost certainly evicted by the time the player collects the check).
    // [DISABLED] PollMipsPcHookEvents — EVIL PJ64 API may corrupt DynaRec state for comboXflagsSetOot
    //void PollMipsPcHookEvents()
    //{ ... }

    // Polls all souls arrays from SharedCustomSave (41 bytes at offset 0x7DC).
    // Gated on PayloadMmSaveAddr validation — same guard as PollSharedCustomSave.
    void PollSoulsData()
    {
        if (_state.SharedCustomSaveAddr is null) return;
        if (_state.PayloadMmSaveAddr is null && _state.SharedCustomSaveAddr != _state.MmPayloadSharedCustomSaveAddr) return;
        if (!IsSharedCustomSaveTrustworthy(_state.SharedCustomSaveAddr.Value)) return;

        var buf = _mem!.Read(_state.SharedCustomSaveAddr.Value + (uint)N64Addresses.SharedCustomSaveSoulsOff,
                             N64Addresses.SharedCustomSaveSoulsSize);
        if (buf is null) return;

        // Merge with MM payload: take non-zero MM value unless OoT has it collected already.
        // Skip if fallback mode (same address).
        if (_state.MmPayloadSharedCustomSaveAddr is not null
            && _state.MmPayloadSharedCustomSaveAddr != _state.SharedCustomSaveAddr
            && IsMmPayloadSharedCustomSaveValid())
        {
            var mmBuf = _mem!.Read(_state.MmPayloadSharedCustomSaveAddr.Value + (uint)N64Addresses.SharedCustomSaveSoulsOff,
                                   N64Addresses.SharedCustomSaveSoulsSize);
            if (mmBuf is not null)
            {
                for (int i = 0; i < buf.Length; i++)
                {
                    if (mmBuf[i] == 0xFF)
                        buf[i] = 0xFF; // disabled takes priority
                    else if (mmBuf[i] != 0 && buf[i] == 0)
                        buf[i] = mmBuf[i]; // collected in MM but not in OoT
                }
            }
        }

        if (_state.SoulsDataSnapshot is not null && buf.SequenceEqual(_state.SoulsDataSnapshot))
            return;

        _state.SoulsDataSnapshot = buf;
        _emit(new { type = "souls_data", data = Convert.ToBase64String(buf) });
    }

    // Polls gSharedCustomSave.rustyKeysOot (4 bytes) and rustyKeysMm (5 bytes) — both are
    // bitmaps set by item_add.c when a rusty key is collected (BITMAP8_SET).
    // Gated on PayloadMmSaveAddr validation — same guard as PollSoulsData.
    void PollRustyKeys()
    {
        if (_state.SharedCustomSaveAddr is null) return;
        if (_state.PayloadMmSaveAddr is null && _state.SharedCustomSaveAddr != _state.MmPayloadSharedCustomSaveAddr) return;
        if (!IsSharedCustomSaveTrustworthy(_state.SharedCustomSaveAddr.Value)) return;

        var buf = _mem!.Read(_state.SharedCustomSaveAddr.Value + (uint)N64Addresses.SharedCustomSaveRkOff,
                             N64Addresses.SharedCustomSaveRkSize);
        if (buf is null) return;

        // Merge with MM payload (OR bitmaps). Skip in fallback mode.
        if (_state.MmPayloadSharedCustomSaveAddr is not null
            && _state.MmPayloadSharedCustomSaveAddr != _state.SharedCustomSaveAddr
            && IsMmPayloadSharedCustomSaveValid())
        {
            var mmBuf = _mem!.Read(_state.MmPayloadSharedCustomSaveAddr.Value + (uint)N64Addresses.SharedCustomSaveRkOff,
                                   N64Addresses.SharedCustomSaveRkSize);
            if (mmBuf is not null)
            {
                for (int i = 0; i < buf.Length; i++)
                    buf[i] |= mmBuf[i];
            }
        }

        if (_state.RustyKeysSnapshot is not null && buf.SequenceEqual(_state.RustyKeysSnapshot))
            return;

        _state.RustyKeysSnapshot = buf;
        _emit(new { type = "rusty_keys", data = Convert.ToBase64String(buf) });
    }

    // Polls gSharedCustomSave.coins[4] (4 × u16 big-endian) — set by item_add.c when items
    // with coin-give events are collected in either game. Gated on PayloadMmSaveAddr validation.
    void PollCoins()
    {
        if (_state.SharedCustomSaveAddr is null)
        {
            if (_nullAddrLogSkip-- <= 0) { Console.Error.WriteLine("[autotrack] PollCoins: SharedCustomSaveAddr null"); _nullAddrLogSkip = 400; }
            return;
        }
        if (_state.PayloadMmSaveAddr is null && _state.SharedCustomSaveAddr != _state.MmPayloadSharedCustomSaveAddr)
        {
            if (_nullAddrLogSkip-- <= 0) { Console.Error.WriteLine("[autotrack] PollCoins: PayloadMmSaveAddr null"); _nullAddrLogSkip = 400; }
            return;
        }
        // Reject reads when ocarinaButtonMask is neither 0x0000 nor 0xFFFF — indicates stale RDRAM
        // from an OoT↔MM transition where PJ64-EM relocated RDRAM to a new base address.
        if (!IsSharedCustomSaveTrustworthy(_state.SharedCustomSaveAddr.Value)) return;

        var coinAddr = _state.SharedCustomSaveAddr.Value + (uint)N64Addresses.SharedCustomSaveCoinOff;
        var buf = _mem!.Read(coinAddr, N64Addresses.SharedCustomSaveCoinSize);
        if (buf is null) { Console.Error.WriteLine("[autotrack] PollCoins: read returned null"); return; }
        if (_state.CoinsSnapshot is null)
            Console.Error.WriteLine($"[autotrack] PollCoins: raw read at 0x{coinAddr:X8}: {BitConverter.ToString(buf)}");

        // Merge with MM payload's SharedCustomSave.coins (same offset 0x7D0) — take max per color.
        // Skip in fallback mode or when MM data is uninitialized (ocarinaButtonMask == 0).
        if (_state.MmPayloadSharedCustomSaveAddr is not null
            && _state.MmPayloadSharedCustomSaveAddr != _state.SharedCustomSaveAddr
            && IsMmPayloadSharedCustomSaveValid())
        {
            var mmBuf = _mem!.Read(_state.MmPayloadSharedCustomSaveAddr.Value + (uint)N64Addresses.SharedCustomSaveCoinOff,
                                   N64Addresses.SharedCustomSaveCoinSize);
            if (mmBuf is not null)
            {
                for (int i = 0; i < buf.Length; i += 2)
                {
                    int ootVal = (buf[i] << 8) | buf[i + 1];
                    int mmVal  = (mmBuf[i] << 8) | mmBuf[i + 1];
                    int merged = Math.Max(ootVal, mmVal);
                    buf[i]     = (byte)(merged >> 8);
                    buf[i + 1] = (byte)merged;
                }
                if (_state.CoinsSnapshot is null)
                    Console.Error.WriteLine($"[autotrack] PollCoins: merged with MM payload");
            }
        }

        // First-read diagnostic — one-shot dump of SharedCustomSave prefix for debugging.
        if (_state.CoinsSnapshot is null) {
            var sAddr    = _state.SharedCustomSaveAddr.Value;
            var ootX     = _mem!.Read(sAddr, 30);
            if (ootX is not null)
                Console.Error.WriteLine($"[autotrack] oot_x[0..30]: {BitConverter.ToString(ootX)}");
        }

        // Also read maxCoins from gComboConfig for auto-detect (bypasses combo_config signature dedup)
        byte[]? maxBuf = null;
        if (_state.ComboConfigAddr is not null)
        {
            int mcLen = N64Addresses.ComboConfigMaxCoinsCount * 2;
            maxBuf = _mem!.Read(_state.ComboConfigAddr.Value + (uint)N64Addresses.ComboConfigMaxCoinsOff, mcLen);
        }

        if (_state.CoinsSnapshot is not null && buf.SequenceEqual(_state.CoinsSnapshot))
        {
            // Coins haven't changed, but we may still need to emit if maxCoins changed (first time with config)
            if (maxBuf is null || _state.CoinsMaxSnapshot is not null)
                return;
        }

        _state.CoinsSnapshot = buf;
        _state.CoinsMaxSnapshot = maxBuf;
        int r = (buf[0] << 8) | buf[1], g = (buf[2] << 8) | buf[3];
        int b = (buf[4] << 8) | buf[5], y = (buf[6] << 8) | buf[7];
        Console.Error.WriteLine($"[autotrack] PollCoins: emitting r={r} g={g} b={b} y={y} maxBuf={maxBuf is not null}");
        _emit(new { type = "coins_data", data = Convert.ToBase64String(buf), max = maxBuf is not null ? Convert.ToBase64String(maxBuf) : null });
    }

    // Polls MM spider house token counts: skullCountSwamp (u16) and skullCountOcean (u16)
    // at MmSave+0xEE4 (SaveContextMm+0xEE4). Gated on PayloadMmSaveAddr validation
    // since these live deep in MmSaveInfo and the address holds stale RDRAM before MM init.
    void PollMmSkullTokens()
    {
        if (_state.PayloadMmSaveAddr is null) return;

        var buf = _mem!.Read(N64Addresses.SaveContextMm + (uint)N64Addresses.MmSave.SkullCountSwamp, 4);
        if (buf is null) return;

        if (_state.MmSkullTokensSnapshot is not null && buf.SequenceEqual(_state.MmSkullTokensSnapshot))
            return;

        _state.MmSkullTokensSnapshot = buf;
        int swamp = (buf[0] << 8) | buf[1];
        int ocean = (buf[2] << 8) | buf[3];
        _emit(new { type = "mm_skull_tokens", swamp, ocean });
    }

    // Polls OotSave.permanentSceneFlags[124] — chest bits set when a chest is opened.
    // Only emitted on change; the frontend builds a lookup to map (sceneId, bit) → check name.
    // Gated on game == Oot: in MM mode, N64 address 0x8011A5D0 is MM BSS (not the OoT save),
    // so reading it would emit garbage chest flags that falsely mark OoT checks as done.
    void PollOotSceneFlags()
    {
        if (_state.Game != ActiveGame.Oot) return;
        var buf = _mem!.Read(N64Addresses.OotSceneFlagsAddr, N64Addresses.OotSceneFlagsSize);
        if (buf is null) return;
        if (_state.OotSceneFlagsSnapshot is not null && buf.SequenceEqual(_state.OotSceneFlagsSnapshot)) return;
        _state.OotSceneFlagsSnapshot = buf;
        _emit(new { type = "oot_scene_flags", data = Convert.ToBase64String(buf) });
    }

    // Polls live OoT chest flags from play->actorCtx.flags.chest (updated immediately on chest open).
    // gSaveContext.sceneFlags only syncs at scene exit; this catches changes in real time.
    // PlayState (gGlobalCtx) is a static BSS symbol at a fixed address — no scan needed.
    // Only runs when the active game is OoT — the MM PlayState address contains garbage in OoT.
    // Requires sceneId to be stable for two consecutive polls to avoid emitting during transitions.
    // Scene ID → song event (slot, trackerKey) pairs. Scene IDs match the OoTMM combined enum
    // (data-scenes.json values), identical to the RDRAM sceneId read from play->sceneId.
    // Multi-slot scenes (Great Fairy Spells/Upgrades by spawn, Spirit Temple by room) emit all
    // their slots on entry — spawn/room are not tracked separately in the autotracker.
    static readonly Dictionary<int, (int slot, string trackerKey)[]> _ootSceneToSongSlots = new()
    {
        [67] = new[] { (0, "oot_0") },                                    // TEMPLE_OF_TIME
        [72] = new[] { (1, "oot_7") },                                    // TOMB_DAMPE_WINDMILL
        [83] = new[] { (2, "oot_2") },                                    // GRAVEYARD
        [84] = new[] { (3, "oot_5") },                                    // ZORA_RIVER
        [98] = new[] { (4, "oot_3") },                                    // GORON_CITY
        [61] = new[] { (5, "oot_1"), (6, "oot_4"), (7, "oot_6") },       // GREAT_FAIRY_SPELLS (spawn 0/1/2)
        [59] = new[] { (8, "oot_9"), (9, "oot_11"), (10, "oot_16") },    // GREAT_FAIRY_UPGRADES (spawn 0/1/2)
        [ 5] = new[] { (11, "oot_10") },                                  // TEMPLE_WATER
        [ 7] = new[] { (12, "oot_15") },                                  // TEMPLE_SHADOW
        [ 6] = new[] { (13, "oot_12"), (14, "oot_13"), (15, "oot_14") }, // TEMPLE_SPIRIT (room 5/14/24)
        [ 8] = new[] { (16, "oot_8") },                                   // BOTTOM_OF_THE_WELL
        [13] = new[] { (17, "oot_17") },                                  // INSIDE_GANON_CASTLE
    };

    static readonly Dictionary<int, (int slot, string trackerKey)[]> _mmSceneToSongSlots = new()
    {
        [70] = new[] { (0, "mm_2") },   // MM_WOODFALL → TEMPLE_WOODFALL
        [92] = new[] { (1, "mm_6") },   // MM_SNOWHEAD → TEMPLE_SNOWHEAD
        [56] = new[] { (2, "mm_8") },   // MM_ZORA_CAPE → TEMPLE_GREATBAY
        [78] = new[] { (4, "mm_5") },   // MM_GORON_GRAVEYARD → HEALING_DARMANI
        [85] = new[] { (5, "mm_11") },  // MM_MUSIC_BOX_HOUSE → HEALING_PAMELA_FATHER
        [45] = new[] { (6, "mm_1") },   // MM_TERMINA_FIELD → HEALING_KAMARO
        [55] = new[] { (7, "mm_7") },   // MM_GREAT_BAY_COAST → HEALING_MIKAU
        [67] = new[] { (8, "mm_9") },   // MM_IKANA_GRAVEYARD → AWAKENING_KEETA
        [50] = new[] { (10, "mm_4") },  // MM_GORON_SHRINE → LULLABY_KID
        [19] = new[] { (11, "mm_10") }, // MM_IKANA_CANYON → STORMS_COMPOSER
        [25] = new[] { (12, "mm_0") },  // MM_CLOCK_TOWER_ROOFTOP → CLOCK_TOWER_ROOF
    };

    // Emits song_event_slot messages for each song event slot assigned to the given scene.
    // Reads slot→songIdx assignments from gComboConfig.songEventsOot/Mm (dev) or songEvents (release).
    // Release has no MM song event shuffle, so MM scenes are skipped there.
    void EmitSongEventForScene(int sceneId, bool isOot)
    {
        if (_state.ComboConfigSnapshot is null) return;
        bool isDev = _romVersion != "release";
        // Release has no MM song event shuffle — skip MM scene events.
        if (!isDev && !isOot) return;
        var map  = isOot ? _ootSceneToSongSlots : _mmSceneToSongSlots;
        if (!map.TryGetValue(sceneId, out var slots)) return;
        int baseOff, count;
        if (isDev)
        {
            baseOff = isOot ? N64Addresses.ComboConfigSongEventsOotOff : N64Addresses.ComboConfigSongEventsMmOff;
            count   = isOot ? N64Addresses.ComboConfigSongEventsOotCnt : N64Addresses.ComboConfigSongEventsMmCnt;
        }
        else
        {
            baseOff = N64Addresses.ComboConfigSongEventsReleaseOff;
            count   = N64Addresses.ComboConfigSongEventsReleaseCnt;
        }
        var buf = _state.ComboConfigSnapshot;
        if (buf.Length < baseOff + count) return;
        foreach (var (slot, trackerKey) in slots)
        {
            int songIdx = buf[baseOff + slot];
            _emit(new { type = "song_event_slot", trackerKey, songIdx });
            Console.WriteLine($"[autotracker] song_event_slot: {trackerKey} → songIdx={songIdx} (scene={sceneId}, oot={isOot})");
        }
    }

    void PollOotLiveSceneFlags()
    {
        if (_state.Game != ActiveGame.Oot) { _prevOotLiveSceneId = -1; _ootSceneSettleCounter = 0; _state.OotLiveSceneFlagsSnapshot = null; return; }

        const uint ps = N64Addresses.OotPlayStateAddr; // 0x801C84A0 — fixed BSS address

        var sceneRaw = _mem!.Read(ps + (uint)N64Addresses.PlayStateSceneOff, 2);
        if (sceneRaw is null) { _prevOotLiveSceneId = -1; _ootSceneSettleCounter = 0; _state.OotLiveSceneFlagsSnapshot = null; return; }
        int sceneId = (sceneRaw[0] << 8) | sceneRaw[1];
        if (sceneId >= 124) { _prevOotLiveSceneId = -1; _ootSceneSettleCounter = 0; _state.OotLiveSceneFlagsSnapshot = null; return; }

        // On scene change, reset settle counter and wait SceneSettlePolls before trusting chest flags.
        // This avoids reading leftover chest flags from the previous scene during actor context init.
        if (sceneId != _prevOotLiveSceneId) { _prevOotLiveSceneId = sceneId; _ootSceneSettleCounter = SceneSettlePolls; _ootLiveChestBaseline = null; return; }
        if (_ootSceneSettleCounter > 0) { _ootSceneSettleCounter--; return; }

        // First stable poll for this scene — emit scene_change and song event assignment.
        if (sceneId != _songEventEmittedSceneOot)
        {
            _songEventEmittedSceneOot = sceneId;
            _emit(new { type = "scene_change", game = "oot", sceneId });
            EmitSongEventForScene(sceneId, isOot: true);
            // Read gSave.entrance NOW (after settle) so Play_TransitionDone has had time to write it.
            var ootEntrance = _state.OotSaveEntrance;
            if (ootEntrance is not null && ootEntrance.Value != 0xFFFFFFFF)
            {
                Console.WriteLine($"[autotrack] player_entrance oot scene={sceneId} entrance=0x{ootEntrance.Value:X8}");
                _emit(new { type = "player_entrance", game = "oot", value = ootEntrance.Value });
            }
        }

        var chestRaw = _mem.Read(ps + (uint)N64Addresses.OotPlayStateChestOff, 4);
        if (chestRaw is null) return;
        uint liveChest = (uint)(chestRaw[0]<<24|chestRaw[1]<<16|chestRaw[2]<<8|chestRaw[3]);

        var fullBuf = _state.OotSceneFlagsSnapshot is not null
            ? (byte[])_state.OotSceneFlagsSnapshot.Clone()
            : new byte[N64Addresses.OotSceneFlagsSize];
        int off = sceneId * 0x1C;
        uint permanentChest = (uint)(fullBuf[off]<<24|fullBuf[off+1]<<16|fullBuf[off+2]<<8|fullBuf[off+3]);

        // Set baseline on the first stable poll after settle (5 × 100ms).
        // The settle window already covers the actorCtx init race (sceneId flips before reset).
        // Using liveChest directly means chests opened before connection are included in the
        // baseline so they don't fire as false positives; only bits that appear AFTER this poll
        // are treated as newly opened.
        if (_ootLiveChestBaseline is null)
        {
            _ootLiveChestBaseline = liveChest;
            return;
        }

        uint newBits = liveChest & ~_ootLiveChestBaseline.Value;
        if (newBits == 0) return;
        _ootLiveChestBaseline = _ootLiveChestBaseline.Value | newBits;
        uint effectiveChest = permanentChest | newBits;
        fullBuf[off + 0] = (byte)(effectiveChest >> 24);
        fullBuf[off + 1] = (byte)(effectiveChest >> 16);
        fullBuf[off + 2] = (byte)(effectiveChest >>  8);
        fullBuf[off + 3] = (byte) effectiveChest;

        if (_state.OotLiveSceneFlagsSnapshot is not null && fullBuf.SequenceEqual(_state.OotLiveSceneFlagsSnapshot)) return;
        _state.OotLiveSceneFlagsSnapshot = fullBuf;
        Console.WriteLine($"[autotracker] oot_scene_flags emitted (newBits=0x{newBits:X8} scene={sceneId})");
        _emit(new { type = "oot_scene_flags", data = Convert.ToBase64String(fullBuf) });
    }

    // Polls live MM chest flags from play->actorCtx.flags.chest (updated immediately on chest open).
    // Mirrors PollOotLiveSceneFlags — same pattern, different PlayState address and offsets.
    // Only runs when the active game is MM — the OoT PlayState address contains garbage in MM.
    // Requires sceneId to be stable for two consecutive polls to avoid emitting during transitions.
    void PollMmLiveSceneFlags()
    {
        if (_state.Game != ActiveGame.Mm) { _prevMmLiveSceneId = -1; _mmSceneSettleCounter = 0; _state.MmLiveSceneFlagsSnapshot = null; return; }

        const uint ps = N64Addresses.MmPlayStateAddr; // 0x803E6B20 — fixed BSS address

        var sceneRaw = _mem!.Read(ps + (uint)N64Addresses.PlayStateSceneOff, 2);
        if (sceneRaw is null) { _prevMmLiveSceneId = -1; _mmSceneSettleCounter = 0; _state.MmLiveSceneFlagsSnapshot = null; return; }
        int sceneId = (sceneRaw[0] << 8) | sceneRaw[1];
        if (sceneId >= 120) { _prevMmLiveSceneId = -1; _mmSceneSettleCounter = 0; _state.MmLiveSceneFlagsSnapshot = null; return; }

        // On scene change, reset settle counter and wait SceneSettlePolls before trusting chest flags.
        if (sceneId != _prevMmLiveSceneId) { _prevMmLiveSceneId = sceneId; _mmSceneSettleCounter = SceneSettlePolls; _mmLiveChestBaseline = null; return; }
        if (_mmSceneSettleCounter > 0) { _mmSceneSettleCounter--; return; }

        // First stable poll for this scene — emit scene_change and song event assignment.
        if (sceneId != _songEventEmittedSceneMm)
        {
            _songEventEmittedSceneMm = sceneId;
            _emit(new { type = "scene_change", game = "mm", sceneId });
            EmitSongEventForScene(sceneId, isOot: false);
            // Read gSave.entrance NOW (after settle) so Play_TransitionDone has had time to write it.
            var mmEntrance = _state.MmSaveEntrance;
            if (mmEntrance is not null && mmEntrance.Value != 0xFFFFFFFF)
            {
                Console.WriteLine($"[autotrack] player_entrance mm scene={sceneId} entrance=0x{mmEntrance.Value:X8}");
                _emit(new { type = "player_entrance", game = "mm", value = mmEntrance.Value });
            }
        }

        var chestRaw = _mem.Read(ps + (uint)N64Addresses.MmPlayStateChestOff, 4);
        if (chestRaw is null) return;
        uint liveChest = (uint)(chestRaw[0]<<24|chestRaw[1]<<16|chestRaw[2]<<8|chestRaw[3]);

        var fullBuf = _state.MmSceneFlagsSnapshot is not null
            ? (byte[])_state.MmSceneFlagsSnapshot.Clone()
            : new byte[N64Addresses.MmSceneFlagsSize];
        int off = sceneId * 0x1C;
        uint permanentChest = (uint)(fullBuf[off]<<24|fullBuf[off+1]<<16|fullBuf[off+2]<<8|fullBuf[off+3]);

        // Same settle-based baseline as OoT — see PollOotLiveSceneFlags for rationale.
        if (_mmLiveChestBaseline is null)
        {
            _mmLiveChestBaseline = liveChest;
            return;
        }

        uint newBits = liveChest & ~_mmLiveChestBaseline.Value;
        if (newBits == 0) return;
        _mmLiveChestBaseline = _mmLiveChestBaseline.Value | newBits;
        uint effectiveChest = permanentChest | newBits;
        fullBuf[off + 0] = (byte)(effectiveChest >> 24);
        fullBuf[off + 1] = (byte)(effectiveChest >> 16);
        fullBuf[off + 2] = (byte)(effectiveChest >>  8);
        fullBuf[off + 3] = (byte) effectiveChest;

        if (_state.MmLiveSceneFlagsSnapshot is not null && fullBuf.SequenceEqual(_state.MmLiveSceneFlagsSnapshot)) return;
        _state.MmLiveSceneFlagsSnapshot = fullBuf;
        Console.WriteLine($"[autotracker] mm_scene_flags emitted (newBits=0x{newBits:X8} scene={sceneId})");
        _emit(new { type = "mm_scene_flags", data = Convert.ToBase64String(fullBuf) });
    }

    // Polls MmSave.info.permanentSceneFlags[120] — chest bits set when a chest is opened in MM.
    // Gated on PayloadMmSaveAddr: gMmSave in OoT BSS is only validated (playerForm=4 or name match)
    // after MM has actually been initialised for this session. Before that, SaveContextMm+0xF6
    // holds stale RDRAM data from a prior session that must not be applied to checks.
    void PollMmSceneFlags()
    {
        if (_state.PayloadMmSaveAddr is null) return;
        var buf = _mem!.Read(N64Addresses.MmSceneFlagsAddr, N64Addresses.MmSceneFlagsSize);
        if (buf is null) return;
        if (_state.MmSceneFlagsSnapshot is not null && buf.SequenceEqual(_state.MmSceneFlagsSnapshot)) return;
        _state.MmSceneFlagsSnapshot = buf;
        _emit(new { type = "mm_scene_flags", data = Convert.ToBase64String(buf) });
    }

    // Detects when the player reads a gossip stone and emits gossip_hint_read { game, key }.
    // OoT detection: vanilla En_Gs calls Flags_SetSwitch(play, params & 0x1F) on talk; OoTMM only
    //   patches EnGs_TalkedTo so the switch flag write in EnGs_Update is preserved. We detect the new
    //   bit in actorCtx.flags.swch (PS+0x1D28) combined with msgBuf[0]==0x08 (TEXT_FAST) to confirm
    //   the hint was displayed. Key = bit position (0-31); bit 0x18 = grotto, actual key via gGrottoData.
    // OoT: msgMode rising edge + msgBuf[0]==0x08 (TEXT_FAST header from Hint_DisplayRaw) + talkActor==En_Gs.
    // MM:  textId==0x20D0 + talkActor (PlayerDisplayTextBox called with that value in MM En_Gs.c).
    // Emits once per unique stone per session; re-emits all on reconnect.
    void PollGossipStoneRead()
    {
        if (_state.ComboConfigAddr is null) return;

        // Re-emit cached seen keys on reconnect, after gossip_hints has been re-emitted (same poll).
        if (_reemitSeenHintsNextPoll)
        {
            _reemitSeenHintsNextPoll = false;
            _gossipTextWasActive = false;
            foreach (var (g, k) in _seenHintKeys)
                _emit(new { type = "gossip_hint_read", game = g, key = k });
            return;
        }

        if (_state.Game == ActiveGame.Unknown) return;

        bool isOot = _state.Game == ActiveGame.Oot;
        uint ps = isOot ? N64Addresses.OotPlayStateAddr : N64Addresses.MmPlayStateAddr;

        if (isOot)
        {
            // OoT gossip detection via msgMode rising edge + msgBuf[0]==0x08.
            // EnGs_TalkedTo (OoT En_Gs.c) calls Hint_Display → Hint_DisplayRaw, which writes
            // comboTextAppendHeader (byte 0x08 = TEXT_FAST) to play->msgCtx.font.msgBuf first.
            // We detect the rising edge of msgMode going non-zero with msgBuf[0]==0x08, then
            // confirm talkActor is En_Gs (0x1B9) and read actor.params to derive the hint key.
            // A settle delay after scene change prevents stale msgBuf+talkActor false positives.

            // Scene change: reset edge state and wait a few polls before detecting in new scene.
            var sceneRaw = _mem!.Read(ps + (uint)N64Addresses.PlayStateSceneOff, 2);
            if (sceneRaw is null) { _ootGossipWasActive = false; return; }
            int curScene = (sceneRaw[0] << 8) | sceneRaw[1];
            if (curScene != _gossipOotLastSceneId)
            {
                _gossipOotLastSceneId    = curScene;
                _ootGossipWasActive      = false;
                _ootGossipSceneSettle    = 4; // 4 × 250ms = 1s dead time after scene change
                return;
            }
            if (_ootGossipSceneSettle > 0) { _ootGossipSceneSettle--; return; }

            // Read msgMode — track rising edge (dialog just opened).
            var msgModeRaw = _mem.Read(ps + (uint)N64Addresses.OotMsgCtxMsgModeOff, 1);
            if (msgModeRaw is null) return;
            if (msgModeRaw[0] == 0) { _ootGossipWasActive = false; return; }

            // Dialog is open. Only fire on the first poll of the opening.
            if (_ootGossipWasActive) return;
            _ootGossipWasActive = true;

            // Confirm this dialog is a combo gossip hint: msgBuf[0] must be 0x08 (TEXT_FAST header
            // written by comboTextAppendHeader, called exclusively from Hint_DisplayRaw).
            var msgBufRaw = _mem.Read(ps + (uint)N64Addresses.OotMsgBufOff, 1);
            if (msgBufRaw is null || msgBufRaw[0] != 0x08) return;

            // Confirm talkActor is En_Gs (0x1B9) and read its params for the hint key.
            var talkActorRaw = _mem.Read(ps + (uint)N64Addresses.OotMsgCtxTalkActorOff, 4);
            if (talkActorRaw is null) return;
            uint talkActorPtr = (uint)(talkActorRaw[0]<<24|talkActorRaw[1]<<16|talkActorRaw[2]<<8|talkActorRaw[3]);
            if (talkActorPtr < 0x80000000u || talkActorPtr >= 0x80800000u) return;

            var actorIdRaw = _mem.Read(talkActorPtr + (uint)N64Addresses.ActorIdOff, 2);
            if (actorIdRaw is null) return;
            if (((actorIdRaw[0] << 8) | actorIdRaw[1]) != (int)N64Addresses.ActorEnGsOot) return;

            var ootParamsRaw = _mem.Read(talkActorPtr + (uint)N64Addresses.ActorParamsOff, 2);
            if (ootParamsRaw is null) return;
            short ootActorParams = (short)((ootParamsRaw[0] << 8) | ootParamsRaw[1]);

            byte key = (byte)(ootActorParams & 0x1F);
            if (key == 0x18)
            {
                var grottoRaw = _mem.Read(N64Addresses.SaveContextOot + (uint)N64Addresses.OotGrottoDataOff, 1);
                if (grottoRaw is null) return;
                key = (byte)((grottoRaw[0] & 0x1F) | 0x20);
            }

            _seenHintKeys.Add(("oot", key));
            Console.WriteLine($"[autotracker] gossip_hint_read (oot) key=0x{key:X2} params=0x{ootActorParams:X4} actor=0x{talkActorPtr:X8}");
            _emit(new { type = "gossip_hint_read", game = "oot", key });
            return;
        }

        // MM branch below — uses textId + talkActor (unchanged).
        uint actorPtr;
        {
            // MM: textId 0x20D0 is the fixed ID PlayerDisplayTextBox is called with for gossip stones.
            var textIdRaw = _mem!.Read(ps + (uint)N64Addresses.MmMsgCtxTextIdOff, 2);
            if (textIdRaw is null) { _gossipTextWasActive = false; return; }
            uint textId = (uint)((textIdRaw[0] << 8) | textIdRaw[1]);
            if (textId != N64Addresses.GossipHintTextId) { _gossipTextWasActive = false; return; }

            var ptrRaw = _mem.Read(ps + (uint)N64Addresses.MmMsgCtxTalkActorOff, 4);
            if (ptrRaw is null) { _gossipTextWasActive = false; return; }
            actorPtr = (uint)(ptrRaw[0] << 24 | ptrRaw[1] << 16 | ptrRaw[2] << 8 | ptrRaw[3]);
            if (actorPtr < 0x80000000u || actorPtr >= 0x80800000u) { _gossipTextWasActive = false; return; }
        }

        // Rising edge only: don't repeat while the MM textbox stays open.
        if (_gossipTextWasActive) return;
        _gossipTextWasActive = true;

        // Read Actor.params (s16 big-endian at Actor+0x14).
        var paramsRaw = _mem!.Read(actorPtr + (uint)N64Addresses.ActorParamsOff, 2);
        if (paramsRaw is null) return;
        short actorParams = (short)((paramsRaw[0] << 8) | paramsRaw[1]);

        // MM En_Gs: params==1 or 2 → key = (unk_198 & 0x1F) | 0x20; else key = unk_195 & 0x1F.
        byte mmKey;
        if (actorParams == 1 || actorParams == 2)
        {
            var unk198Raw = _mem.Read(actorPtr + (uint)N64Addresses.MmEnGsUnk198Off, 2);
            if (unk198Raw is null) return;
            short unk198 = (short)((unk198Raw[0] << 8) | unk198Raw[1]);
            mmKey = (byte)((unk198 & 0x1F) | 0x20);
        }
        else
        {
            var unk195Raw = _mem.Read(actorPtr + (uint)N64Addresses.MmEnGsUnk195Off, 1);
            if (unk195Raw is null) return;
            mmKey = (byte)(unk195Raw[0] & 0x1F);

            // Moon trial scenes: key |= 0x40
            var sceneRaw = _mem.Read(ps + (uint)N64Addresses.PlayStateSceneOff, 2);
            if (sceneRaw is not null)
            {
                int sceneId = (sceneRaw[0] << 8) | sceneRaw[1];
                if (Array.IndexOf(N64Addresses.MmMoonSceneIds, sceneId) >= 0)
                    mmKey |= 0x40;
            }
        }

        _seenHintKeys.Add(("mm", mmKey)); // keep for reconnect re-emission
        Console.WriteLine($"[autotracker] gossip_hint_read (mm) key=0x{mmKey:X2} actorParams=0x{actorParams:X4} actorPtr=0x{actorPtr:X8}");
        _emit(new { type = "gossip_hint_read", game = "mm", key = mmKey });
    }

    // Detects when the player reads a dungeon reward hint sign (altar) and emits altar_read { game, age }.
    // OoT: En_Wonder_Talk (0x0147) with params & 0xF800 == 0x0800 — shows stones (child) or medallions+Ganon BK (adult).
    // MM:  En_Talk (0x0261) with params & 0x3F == 0x18 — shows boss remains + light arrows.
    void PollAltarRead()
    {
        if (_state.ComboConfigAddr is null) return;

        if (_reemitSeenAltarNextPoll)
        {
            _reemitSeenAltarNextPoll = false;
            foreach (var (g, a) in _seenAltarFlags)
                _emit(new { type = "altar_read", game = g, age = a });
            return;
        }

        // Ganon Battle Arena scene detection: entering scene 79 (OOT_GANON_BATTLE_ARENA) reveals
        // the light arrow hint without needing to interact with any actor.
        if (_state.Game == ActiveGame.Oot)
        {
            var sceneRaw = _mem!.Read(N64Addresses.OotPlayStateAddr + (uint)N64Addresses.PlayStateSceneOff, 2);
            if (sceneRaw is not null)
            {
                int sceneId = (sceneRaw[0] << 8) | sceneRaw[1];
                if (sceneId == N64Addresses.OotGanonBattleArenaSceneId
                    && _seenAltarFlags.Add(("oot", "ganon")))
                {
                    Console.WriteLine("[autotracker] altar_read (oot, ganon) — entered Ganon Battle Arena (scene 79)");
                    _emit(new { type = "altar_read", game = "oot", age = "ganon" });
                }
            }
        }

        bool isOot = _state.Game == ActiveGame.Oot;
        var  ps    = isOot ? N64Addresses.OotPlayStateAddr : N64Addresses.MmPlayStateAddr;

        // Require an active textbox (textId != 0).
        uint textId;
        if (isOot)
        {
            var raw = _mem!.Read(ps + (uint)N64Addresses.OotMsgCtxTextIdOff, 2);
            if (raw is null) return;
            textId = (uint)((raw[0] << 8) | raw[1]);
        }
        else
        {
            var raw = _mem!.Read(ps + (uint)N64Addresses.MmMsgCtxTextIdOff, 2);
            if (raw is null) return;
            textId = (uint)((raw[0] << 8) | raw[1]);
        }
        if (textId == 0) return;

        // Read talkActor pointer.
        var ptrOff = isOot ? N64Addresses.OotMsgCtxTalkActorOff : N64Addresses.MmMsgCtxTalkActorOff;
        var ptrRaw = _mem!.Read(ps + (uint)ptrOff, 4);
        if (ptrRaw is null) return;
        uint actorPtr = (uint)(ptrRaw[0] << 24 | ptrRaw[1] << 16 | ptrRaw[2] << 8 | ptrRaw[3]);
        if (actorPtr < 0x80000000u || actorPtr >= 0x80800000u) return;

        // Check actor ID.
        uint targetId = isOot ? N64Addresses.ActorEnWonderTalk : N64Addresses.ActorEnTalk;
        var  idRaw    = _mem.Read(actorPtr + (uint)N64Addresses.ActorIdOff, 2);
        if (idRaw is null) return;
        uint actorId = (uint)((idRaw[0] << 8) | idRaw[1]);
        if (actorId != targetId) return;

        // Check actor params.
        var paramsRaw = _mem.Read(actorPtr + (uint)N64Addresses.ActorParamsOff, 2);
        if (paramsRaw is null) return;
        int paramsInt = (int)(short)((paramsRaw[0] << 8) | paramsRaw[1]);

        string game = isOot ? "oot" : "mm";
        string age;

        if (isOot)
        {
            if ((paramsInt & 0xF800) != 0x0800) return;
            // Read OotSave.age (u32 at +0x04): 0=adult, 1=child.
            var ageRaw = _mem.Read(N64Addresses.SaveContextOot + (uint)N64Addresses.OotSaveAgeOff, 4);
            if (ageRaw is null) return;
            uint ageVal = (uint)(ageRaw[0] << 24 | ageRaw[1] << 16 | ageRaw[2] << 8 | ageRaw[3]);
            age = ageVal == 1 ? "child" : "adult";
        }
        else
        {
            if ((paramsInt & 0x3F) != 0x18) return;
            age = "adult"; // MM altar shows boss remains + light arrows (single page set)
        }

        if (!_seenAltarFlags.Add((game, age))) return;
        Console.WriteLine($"[autotracker] altar_read ({game}, {age})");
        _emit(new { type = "altar_read", game, age });
    }

// Scans all of RDRAM for the gHints array loaded by Hint_Init().
    // Pattern: 15+ consecutive 16-byte blocks where byte[0] is a valid gossip key (0x00-0x5F)
    // and byte[1] is a valid hint type (0x00-0x04), followed by a terminator with byte[0]=0xFF.
    // Additional validation: world field (byte[3]) must be 1 or 2 for types 0-3.
    // Minimum 15 entries avoids false positives from non-heap data.
    // Returns the start address if found, or null.
    uint? ScanForGossipHintArray(byte[] rdram, bool isMm)
    {
        // Scan the OoTMM overlay BSS for a 32-bit pointer to gHints.
        // gHints = Hint* gHints (in hint.c), a BSS global whose value is the malloc'd address.
        // The OoTMM custom heap starts at 0x80700000 (OoT) / 0x806E0000 (MM).
        // OoT BSS: 0x80400000-0x80700000 (just below OoT heap)
        // MM  BSS: 0x80720000-0x80800000 (above OoT heap, below RAM end)
        uint bssStart, bssEnd;
        uint heapMin, heapMax;
        if (!isMm)
        {
            // OoT heap lives at 0x80700000-0x807FFFFF. Any BSS pointer targeting below 0x80700000
            // is payload BSS or actor memory — volatile and not a valid gHints address.
            // Scanning BSS from 0x80100000 to cover dev builds with lower-RDRAM payload.
            bssStart = 0x80100000u;
            bssEnd   = 0x80700000u;
            heapMin  = 0x80700000u; // OoT heap start — rejects false positives in payload BSS
            heapMax  = 0x80800000u;
        }
        else
        {
            // MM heap lives at 0x806E0000-0x8071FFFF.
            bssStart = 0x80100000u;
            bssEnd   = N64Addresses.PayloadMmEnd;
            heapMin  = 0x806E0000u; // MM heap start
            heapMax  = 0x80800000u;
        }

        int bssOffStart = (int)(bssStart - 0x80000000u);
        int bssOffEnd   = (int)(Math.Min(bssEnd, 0x80800000u) - 0x80000000u);
        bssOffEnd = Math.Min(bssOffEnd, rdram.Length);

        List<uint> matches = new List<uint>();
        for (int i = bssOffStart; i + 4 <= bssOffEnd; i += 4)
        {
            uint ptr = (uint)(rdram[i] << 24 | rdram[i+1] << 16 | rdram[i+2] << 8 | rdram[i+3]);
            if (ptr < heapMin || ptr >= heapMax) continue;

            uint off = ptr - 0x80000000u;
            if (off + 16 > (uint)rdram.Length) continue;

            // Quick check on the first entry
            if (rdram[(int)off] > 0x5F || rdram[(int)off] == 0xFF) continue;
            if (rdram[(int)off + 1] > 4) continue;
            // world (byte[3]): 0 in single-player, 1-indexed in multiworld (up to 127 players).
            byte w = rdram[(int)off + 3];
            if (rdram[(int)off + 1] < 4 && w > 127) continue;

            // Count consecutive valid entries
            int run = 0;
            uint j = off;
            bool hasMoon = false;
            uint limit = Math.Min((uint)rdram.Length, heapMax);
            while (j + 16 <= limit)
            {
                byte k = rdram[(int)j];
                byte t = rdram[(int)j + 1];
                byte ww = rdram[(int)j + 3];
                if (k == 0xFF) { j += 16; break; }
                if (k > 0x5F || t > 4) break;
                if (t < 4 && ww > 127) break;
                if ((k & 0x40) != 0) hasMoon = true;
                run++;
                j += 16;
            }
            if (run < 15) continue;
            // OoT: no moon keys; MM: must have at least one moon key
            if (!isMm && hasMoon) continue;
            if (isMm && !hasMoon) continue;

            // Exclude all-same-key patterns (e.g. zeroed BSS filler)
            bool allSameKey = true;
            byte firstKey = rdram[(int)off];
            for (uint k = off + 16; k < j && k < off + 256; k += 16)
                if (rdram[(int)k] != firstKey) { allSameKey = false; break; }
            if (allSameKey) continue;

            matches.Add(ptr);
        }
        // Return the last (most recently stored) match — likely the real gHints,
        // since the BSS variable is set after earlier init functions.
        if (matches.Count > 0)
        {
            uint ptr = matches[matches.Count - 1];
            return ptr;
        }
        return null;
    }

    // Polls gossip stone hint arrays (gHints for OoT and MM).
    // Scans RDRAM once every 5 s until the ACTIVE game's array is found, then just polls the known address.
    // Only the active game's hints are polled per cycle: OoT heap (0x80700000-0x807FFFFF) overlaps
    // with MM heap (0x806E0000-0x8071FFFF), so reading MM hints while in OoT would read live OoT
    // heap data and spam changes. Each game's hints are stable only when that game is active.
    void PollGossipHints()
    {
        if (_state.ComboConfigAddr is null) return;

        bool isOot  = _state.Game == ActiveGame.Oot;
        bool needOot = _state.GossipHintsOotAddr is null;
        bool needMm  = _state.GossipHintsMmAddr  is null;

        // Fast path: relevant address already found — just poll and emit on change.
        if (isOot && !needOot)
        {
            _state.GossipHintsOotSnapshot = ReadAndEmitGossipHints(_state.GossipHintsOotAddr!.Value, _state.GossipHintsOotSnapshot, "oot");
            return;
        }
        if (!isOot && !needMm)
        {
            _state.GossipHintsMmSnapshot = ReadAndEmitGossipHints(_state.GossipHintsMmAddr!.Value, _state.GossipHintsMmSnapshot, "mm");
            return;
        }

        // Scan needed — throttle to once every 50 polls (≈5 s) to avoid 8 MB reads every tick.
        if (_gossipScanCooldown > 0) { _gossipScanCooldown--; return; }
        _gossipScanCooldown = 50;

        var rdram = _mem!.ReadAllRdram();
        if (rdram is null) return;

        // Only scan for the current game's hints — scanning the other game's array from the wrong
        // heap context produces false positives from volatile actor/stack memory.
        if (isOot && needOot)
        {
            var addr = ScanForGossipHintArray(rdram, false);
            if (addr is not null)
            {
                _state.GossipHintsOotAddr = addr;
                Console.WriteLine($"[autotracker] gHints (OoT) found at 0x{addr:X8}");
                _state.GossipHintsOotSnapshot = ReadAndEmitGossipHints(addr.Value, _state.GossipHintsOotSnapshot, "oot");
            }
        }
        else if (!isOot && needMm)
        {
            var addr = ScanForGossipHintArray(rdram, true);
            if (addr is not null)
            {
                _state.GossipHintsMmAddr = addr;
                Console.WriteLine($"[autotracker] gHints (MM) found at 0x{addr:X8}");
                _state.GossipHintsMmSnapshot = ReadAndEmitGossipHints(addr.Value, _state.GossipHintsMmSnapshot, "mm");
            }
        }
    }

    // Reads the hint array at the given N64 address, emits gossip_hints if changed, and returns the new snapshot.
    byte[]? ReadAndEmitGossipHints(uint addr, byte[]? snapshot, string game)
    {
        // Read up to 256 hint records (16 bytes each) — generous upper bound
        const int MaxHints = 256;
        var buf = _mem!.Read(addr, MaxHints * 16);
        if (buf is null) return snapshot;

        // Find the actual length (up to the 0xFF terminator)
        int len = buf.Length;
        for (int i = 0; i < buf.Length; i += 16)
        {
            if (buf[i] == 0xFF) { len = i + 16; break; }
        }

        var slice = buf[..len];
        if (snapshot is not null && slice.SequenceEqual(snapshot)) return snapshot;
        _emit(new { type = "gossip_hints", game, data = Convert.ToBase64String(slice) });
        Console.WriteLine($"[autotracker] gossip_hints ({game}) emitted ({len / 16} entries)");
        return slice;
    }

    // Scans the given payload heap range for the gEntrances table (key/value u32 pairs terminated by 0xFFFFFFFF).
    // Valid srcId: 0 ≤ key ≤ 0x20000; valid dstId: (val & 0x7FFFFFFF) ≤ 0x20000 (bit31=cross-game allowed).
    // Requires 6+ consecutive valid pairs before the terminator to reject false positives.
    uint? ScanForEntranceTable(byte[] rdram, bool isMm)
    {
        int startOff = (int)((isMm ? N64Addresses.PayloadMmStart : N64Addresses.PayloadOotStart) - 0x80000000u);
        int endOff   = (int)((isMm ? N64Addresses.PayloadMmEnd   : N64Addresses.PayloadOotEnd)   - 0x80000000u);

        const int MinPairs = 6;
        int sequenceStart = -1;
        int pairCount     = 0;
        int nonZeroKeys   = 0; // number of pairs with key > 0 (guards against BSS zero runs)

        for (int i = startOff; i + 8 <= endOff; i += 8)
        {
            uint key = (uint)(rdram[i]<<24 | rdram[i+1]<<16 | rdram[i+2]<<8 | rdram[i+3]);
            uint val = (uint)(rdram[i+4]<<24 | rdram[i+5]<<16 | rdram[i+6]<<8 | rdram[i+7]);

            if (key == 0xFFFFFFFF)
            {
                if (pairCount >= MinPairs && nonZeroKeys >= MinPairs - 1)
                {
                    // Walk back to include any key=0 pairs (e.g. OOT_DEKU_TREE id=0) before sequenceStart.
                    int tableStart = sequenceStart;
                    while (tableStart - 8 >= startOff)
                    {
                        int prev = tableStart - 8;
                        uint pk = (uint)(rdram[prev]<<24 | rdram[prev+1]<<16 | rdram[prev+2]<<8 | rdram[prev+3]);
                        uint pv = (uint)(rdram[prev+4]<<24 | rdram[prev+5]<<16 | rdram[prev+6]<<8 | rdram[prev+7]);
                        if (pk == 0 && pv > 0 && (pv & 0x7FFFFFFFu) <= 0x20000u)
                            tableStart = prev;
                        else
                            break;
                    }
                    return 0x80000000u + (uint)tableStart;
                }
                sequenceStart = -1;
                pairCount     = 0;
                nonZeroKeys   = 0;
                continue;
            }

            bool validKey = key <= 0x20000u;
            bool validVal = (val & 0x7FFFFFFFu) <= 0x20000u;
            // Reject BSS zero pairs (would give a false sequence of all-zero matches)
            if (!validKey || !validVal || (key == 0 && val == 0))
            {
                sequenceStart = -1;
                pairCount     = 0;
                nonZeroKeys   = 0;
                continue;
            }

            if (sequenceStart < 0) sequenceStart = i;
            pairCount++;
            if (key > 0) nonZeroKeys++;
        }
        return null;
    }

    // Polls gEntrances arrays for OoT and MM.
    // Scans payload heap once every 5 s until both are found, then polls for content changes.
    void PollEntranceTable()
    {
        if (_state.ComboConfigAddr is null) return;

        bool needOot = _state.EntranceTableOotAddr is null;
        bool needMm  = _state.EntranceTableMmAddr  is null;
        if (!needOot && !needMm)
        {
            _state.EntranceTableOotSnapshot = ReadAndEmitEntranceTable(_state.EntranceTableOotAddr!.Value, _state.EntranceTableOotSnapshot, "oot");
            _state.EntranceTableMmSnapshot  = ReadAndEmitEntranceTable(_state.EntranceTableMmAddr!.Value,  _state.EntranceTableMmSnapshot,  "mm");
            return;
        }

        if (_entranceScanCooldown > 0) { _entranceScanCooldown--; return; }
        _entranceScanCooldown = 50;

        var rdram = _mem!.ReadAllRdram();
        if (rdram is null) return;

        if (needOot)
        {
            var addr = ScanForEntranceTable(rdram, false);
            if (addr is not null)
            {
                _state.EntranceTableOotAddr = addr;
                Console.WriteLine($"[autotrack] gEntrances (OoT) found at 0x{addr:X8}");
            }
        }
        if (needMm)
        {
            var addr = ScanForEntranceTable(rdram, true);
            if (addr is not null)
            {
                _state.EntranceTableMmAddr = addr;
                Console.WriteLine($"[autotrack] gEntrances (MM) found at 0x{addr:X8}");
            }
        }

        if (_state.EntranceTableOotAddr is not null)
            _state.EntranceTableOotSnapshot = ReadAndEmitEntranceTable(_state.EntranceTableOotAddr.Value, _state.EntranceTableOotSnapshot, "oot");
        if (_state.EntranceTableMmAddr is not null)
            _state.EntranceTableMmSnapshot  = ReadAndEmitEntranceTable(_state.EntranceTableMmAddr.Value,  _state.EntranceTableMmSnapshot,  "mm");
    }

    // Reads the gEntrances table at the given N64 address and emits entrance_table if changed.
    byte[]? ReadAndEmitEntranceTable(uint addr, byte[]? snapshot, string game)
    {
        // Read up to 1024 pairs (8 bytes each) — generous upper bound for a full ER seed
        const int MaxPairs = 1024;
        var buf = _mem!.Read(addr, MaxPairs * 8);
        if (buf is null) return snapshot;

        // Find the actual length up to the 0xFFFFFFFF terminator
        int len = buf.Length;
        for (int i = 0; i + 4 <= buf.Length; i += 8)
        {
            uint key = (uint)(buf[i]<<24 | buf[i+1]<<16 | buf[i+2]<<8 | buf[i+3]);
            if (key == 0xFFFFFFFF) { len = i + 8; break; }
        }

        var slice = buf[..len];
        if (snapshot is not null && slice.SequenceEqual(snapshot)) return snapshot;
        _emit(new { type = "entrance_table", game, data = Convert.ToBase64String(slice) });
        Console.WriteLine($"[autotrack] entrance_table ({game}) emitted ({(len - 8) / 8} pairs)");
        return slice;
    }

    // Polls shop slot data (item GI, player, price) when the player is in a shop scene.
    // Reads prices from gComboConfig.prices[] and scans the active payload BSS for
    // sComboOverridesCache entries with key 0x07000000|shopId (type=OV_SHOP, scene=0, room=0).
    // Only runs when the scene has settled (sceneSettleCounter == 0) to ensure actors are initialised.
    // Emits shop_data once per unique shop scene entry; re-emits on reconnect/resync.
    void PollShopData()
    {
        if (_state.ComboConfigAddr is null) return;
        if (_state.Game == ActiveGame.Unknown) return;

        bool isOot = _state.Game == ActiveGame.Oot;
        uint ps = isOot ? N64Addresses.OotPlayStateAddr : N64Addresses.MmPlayStateAddr;

        var sceneRaw = _mem!.Read(ps + (uint)N64Addresses.PlayStateSceneOff, 2);
        if (sceneRaw is null) return;
        int sceneId = (sceneRaw[0] << 8) | sceneRaw[1];

        // Require scene to be settled (same criteria as live chest flag polls).
        bool settled = isOot
            ? (_prevOotLiveSceneId == sceneId && _ootSceneSettleCounter == 0)
            : (_prevMmLiveSceneId  == sceneId && _mmSceneSettleCounter  == 0);
        if (!settled) return;

        if (!IsShopScene(isOot, sceneId)) { _lastShopKey = -1; return; }

        int shopKey = (isOot ? 0 : 0x10000) | sceneId;
        if (shopKey == _lastShopKey) return;

        // Build set of valid shopIds for this scene (may be non-contiguous, e.g. Bazaar).
        var validIds = new HashSet<int>();
        foreach (var (min, max) in ShopIdRanges(isOot, sceneId))
            for (int id = min; id <= max; id++) validIds.Add(id);

        if (validIds.Count == 0) { _lastShopKey = shopKey; return; }

        // Read prices: gComboConfig.prices[141] at offset 0x15C, u16 big-endian each.
        int priceBytes = N64Addresses.ComboConfigPricesCount * 2;
        var priceBuf = _mem.Read(_state.ComboConfigAddr.Value + (uint)N64Addresses.ComboConfigPricesOff, priceBytes);
        if (priceBuf is null) return;

        // Scan the active game's payload BSS for sComboOverridesCache entries.
        // Key layout (big-endian u32): byte[0]=0x07, byte[1]=0x00, byte[2]=0x00, byte[3]=shopId.
        // Struct (16 bytes): key(4) | player s16(2) | gi u16(2) | ...
        uint scanStart = isOot ? N64Addresses.PayloadOotStart : N64Addresses.PayloadMmStart;
        uint scanEnd   = isOot ? N64Addresses.PayloadOotEnd   : N64Addresses.PayloadMmEnd;
        var bss = _mem.Read(scanStart, (int)(scanEnd - scanStart));
        if (bss is null) return;

        var overrides = new Dictionary<int, (int Gi, int Player)>();
        // Step 4 bytes: OverrideData.key is u32-aligned, but the cache array may start at
        // any 4-byte boundary — stepping 16 would miss entries not on 16-byte boundaries.
        for (int i = 0; i + 16 <= bss.Length; i += 4)
        {
            if (bss[i] != 0x07 || bss[i+1] != 0x00 || bss[i+2] != 0x00) continue;
            int sid = bss[i+3];
            if (!validIds.Contains(sid)) continue;
            // bytes[4-5] = player (s16 big-endian, 1-8 for valid players)
            int player = (short)((bss[i+4] << 8) | bss[i+5]);
            if (player < 1 || player > 8) continue;
            // bytes[6-7] = GI (u16 big-endian, 1-933 for valid GI indices)
            int gi = (bss[i+6] << 8) | bss[i+7];
            if (gi < 1 || gi > 933) continue;
            overrides[sid] = (gi, player);
        }

        var slots = new List<object>(validIds.Count);
        foreach (int shopId in validIds.Order())
        {
            // OoT: priceIdx = shopId (PRICE_RANGES.OOT_SHOPS = 0)
            // MM:  priceIdx = MM_SHOPS_BASE (106) + shopId
            int priceIdx = isOot ? shopId : N64Addresses.MmShopsPriceBase + shopId;
            int priceOff = priceIdx * 2;
            int price    = priceOff + 2 <= priceBuf.Length
                ? (priceBuf[priceOff] << 8) | priceBuf[priceOff + 1]
                : 0;
            var ov = overrides.TryGetValue(shopId, out var v) ? v : (Gi: 0, Player: 0);
            slots.Add(new { shopId, gi = ov.Gi, player = ov.Player, price });
        }

        // If no overrides found, sComboOverridesCache hasn't been populated yet (actors haven't drawn).
        // Don't cache or update _lastShopKey so the scan retries next poll.
        if (overrides.Count == 0)
        {
            Console.WriteLine($"[autotracker] shop_data: {(isOot ? "oot" : "mm")} scene={sceneId} — no overrides yet, retrying next poll");
            return;
        }

        Console.WriteLine($"[autotracker] shop_data: {(isOot ? "oot" : "mm")} scene={sceneId}, {slots.Count} slots, {overrides.Count} overrides");
        var payload = new { type = "shop_data", game = isOot ? "oot" : "mm", sceneId, slots };
        _state.ShopDataCache[shopKey] = payload;
        _lastShopKey = shopKey;
        _emit(payload);
    }

    static bool IsShopScene(bool isOot, int sceneId) =>
        isOot ? sceneId is 44 or 45 or 46 or 47 or 48 or 49 or 50
              : sceneId is 10 or 13 or 52 or 61 or 76 or 104;

    // Returns the shopId ranges for the given (game, scene). Non-contiguous for Bazaar (scene 44).
    // ShopId→PRICE_RANGES mapping:
    //   OoT shops: OOT_SHOPS base=0, so priceIdx = shopId directly.
    //   MM shops:  MM_SHOPS  base=106, so priceIdx = 106 + shopId.
    static IEnumerable<(int Min, int Max)> ShopIdRanges(bool isOot, int sceneId)
    {
        if (isOot) switch (sceneId)
        {
            case 45: yield return (0x00, 0x07); break; // Kokiri Shop
            case 50: yield return (0x08, 0x0F); break; // Bombchu Shop
            case 47: yield return (0x10, 0x17); break; // Zora Shop
            case 46: yield return (0x18, 0x1F); break; // Goron Shop
            case 44: yield return (0x20, 0x27); yield return (0x30, 0x37); break; // Market + Kakariko Bazaar
            case 49: yield return (0x28, 0x2F); break; // Market Potion Shop
            case 48: yield return (0x38, 0x3F); break; // Kakariko Potion Shop
        }
        else switch (sceneId)
        {
            case 104: yield return (0x00, 0x03); break; // Bomb Shop
            case  13: yield return (0x04, 0x04); break; // Curiosity Shop
            case  52: yield return (0x05, 0x0C); break; // Trading Post
            case  10: yield return (0x0D, 0x0F); break; // Swamp Potion Shop
            case  61: yield return (0x10, 0x12); break; // Goron Shop
            case  76: yield return (0x13, 0x15); break; // Zora Hall Rooms
        }
    }

    // Read a big-endian unsigned 16-bit integer from buf at byte offset off.
    static int ReadU16BE(byte[] buf, int off) => (buf[off] << 8) | buf[off + 1];
    // Read a big-endian signed 16-bit integer from buf at byte offset off.
    static int ReadI16BE(byte[] buf, int off) => (short)((buf[off] << 8) | buf[off + 1]);

    // Compute the xflag bit position for one check using the three binary lookup tables.
    // Formula (mirrors xflags.c bitPosLookup):
    //   setupIndex = scenes[sceneId]        + setupId
    //   roomIndex  = setups[setupIndex]     + roomId * 12 + sliceId
    //   bitPos     = rooms[roomIndex]       + localId       (i16, can be negative)
    static int? ComputeXflagBitPos(int sceneId, int setupId, int roomId, int sliceId, int localId,
                                   byte[] scenes, byte[] setups, byte[] rooms)
    {
        try
        {
            int setupIndex = ReadU16BE(scenes, sceneId * 2) + setupId;
            int roomIndex  = ReadU16BE(setups, setupIndex * 2) + roomId * 12 + sliceId;
            int bitPos     = ReadI16BE(rooms,  roomIndex * 2) + localId;
            return bitPos >= 0 ? bitPos : null;
        }
        catch { return null; }
    }

    // Try to load one of the six xflag binary table files from the filesystem.
    static byte[]? LoadXflagTableFile(string filename)
    {
        var baseDir = AppContext.BaseDirectory;
        string[] candidates = [
            Path.Combine(baseDir, filename),
            Path.Combine(baseDir, "OoTMM", "packages", "generator", "data", "static", filename),
            Path.Combine(baseDir, "..", "OoTMM", "packages", "generator", "data", "static", filename),
            Path.Combine(baseDir, "..", "..", "OoTMM", "packages", "generator", "data", "static", filename),
            Path.Combine(baseDir, "..", "..", "..", "..", "OoTMM", "packages", "generator", "data", "static", filename),
        ];
        var path = candidates.FirstOrDefault(File.Exists);
        if (path is null) return null;
        try { return File.ReadAllBytes(path); }
        catch { return null; }
    }

    // Ensure all six xflag table files are loaded (called lazily before first filter use).
    void EnsureXflagTablesLoaded()
    {
        if (_ootXflagScenesTbl is not null) return;
        _ootXflagScenesTbl = LoadXflagTableFile("xflag_table_oot_scenes.bin");
        _ootXflagSetupsTbl = LoadXflagTableFile("xflag_table_oot_setups.bin");
        _ootXflagRoomsTbl  = LoadXflagTableFile("xflag_table_oot_rooms.bin");
        _mmXflagScenesTbl  = LoadXflagTableFile("xflag_table_mm_scenes.bin");
        _mmXflagSetupsTbl  = LoadXflagTableFile("xflag_table_mm_setups.bin");
        _mmXflagRoomsTbl   = LoadXflagTableFile("xflag_table_mm_rooms.bin");
        bool ok = _ootXflagScenesTbl is not null && _ootXflagSetupsTbl is not null && _ootXflagRoomsTbl is not null
               && _mmXflagScenesTbl  is not null && _mmXflagSetupsTbl  is not null && _mmXflagRoomsTbl  is not null;
        Console.Error.WriteLine(ok
            ? "[autotrack] xflag tables loaded — GI_NOTHING filter active"
            : "[autotrack] xflag tables incomplete — GI_NOTHING filter disabled");
    }

    // Build the valid-bitpos sets from the sComboOverrides buffer.
    // Only entries with xflag ovType (0x10-0x1F) are processed.
    // The game (oot/mm) is determined via the xflag-type-index loaded earlier.
    // Xflag tables are now loaded lazily by ProcessComboAddItemCapture.
    // BuildValidXflagBits removed — bit-to-GI maps are no longer needed.

    // Searches several paths relative to the exe for xflag-type-index.json (built by process-data).
    // Returns a dictionary mapping override key32 → "game:csvtype:layout" (e.g. "oot:pot:dungeon").
    // Returns null and logs a warning if the file is not found; per-type detection is skipped gracefully.
    Dictionary<uint, string>? LoadXflagIndex()
    {
        var baseDir = AppContext.BaseDirectory;
        string[] candidates = [
            Path.Combine(baseDir, "xflag-type-index.json"),
            Path.Combine(baseDir, "src", "data", "dist", "xflag-type-index.json"),
            Path.Combine(baseDir, "..", "src", "data", "dist", "xflag-type-index.json"),
            Path.Combine(baseDir, "..", "..", "src", "data", "dist", "xflag-type-index.json"),
            Path.Combine(baseDir, "..", "..", "..", "..", "src", "data", "dist", "xflag-type-index.json"),
        ];
        var path = candidates.FirstOrDefault(File.Exists);
        if (path is null)
        {
            Console.WriteLine("[autotrack] xflag-type-index.json not found — per-type xflag detection skipped");
            return null;
        }
        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(path));
            var index = new Dictionary<uint, string>();
            foreach (var prop in doc.RootElement.EnumerateObject())
                if (uint.TryParse(prop.Name, out var k))
                    index[k] = prop.Value.GetString() ?? "";
            Console.WriteLine($"[autotrack] xflag-type-index: {index.Count} entries from {Path.GetFullPath(path)}");
            return index;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[autotrack] xflag-type-index load failed: {ex.Message}");
            return null;
        }
    }

    // Locates the COMBO_VROM_CHECKS file in ROM via the OoTMM extra DMA table.
    // COMBO_META_ROM (physical offset 0x03FFF000) holds:
    //   u32 extraDmaRomOff — physical ROM offset of the extra DMA table
    //   u32 extraDmaCount  — number of 16-byte DmaEntry records in that table
    // Each DmaEntry is: { u32 vstart, u32 vend, u32 pstart, u32 pend }.
    // COMBO_VROM_CHECKS VROM address:
    //   OoT payload: 0xF0400000
    //   MM  payload: 0xF0500000
    // Returns the ROM byte offset (pstart) of the override table; count = (pend-pstart)/16.
    uint? FindOverrideTableViaDma(out int count)
    {
        count = 0;
        if (_mem is null || _mem.RomBase == 0) return null;

        const uint comboMetaRom = 0x03FFF000u;
        var meta = _mem.ReadRom(comboMetaRom, 8);
        if (meta is null)
        {
            Console.WriteLine("[autotrack] FindOverrideTableViaDma: ReadRom(COMBO_META_ROM) failed");
            return null;
        }

        uint extraDmaRomOff = (uint)(meta[0]<<24 | meta[1]<<16 | meta[2]<<8 | meta[3]);
        uint extraDmaCount  = (uint)(meta[4]<<24 | meta[5]<<16 | meta[6]<<8 | meta[7]);
        Console.WriteLine($"[autotrack] extraDma romOff=0x{extraDmaRomOff:X8} count={extraDmaCount}");

        if (extraDmaRomOff == 0 || extraDmaCount == 0 || extraDmaCount > 4096) return null;

        // COMBO_VROM_CHECKS vstart: OoT=0xF0400000, MM=0xF0500000 (COMBO_EXTRA_DMA_VROM|0x00400000/00500000)
        const uint checksVromOot = 0xF0400000u;
        const uint checksVromMm  = 0xF0500000u;

        const int dmaEntrySize = 16; // sizeof(DmaEntry)
        uint tableBytes = extraDmaCount * dmaEntrySize;
        var table = _mem.ReadRom(extraDmaRomOff, (int)tableBytes);
        if (table is null)
        {
            Console.WriteLine($"[autotrack] FindOverrideTableViaDma: ReadRom(extraDmaTable) failed at 0x{extraDmaRomOff:X8}");
            return null;
        }

        for (int i = 0; i < (int)extraDmaCount; i++)
        {
            int off = i * dmaEntrySize;
            uint vstart = (uint)(table[off+0]<<24 | table[off+1]<<16 | table[off+2]<<8 | table[off+3]);
            uint vend   = (uint)(table[off+4]<<24 | table[off+5]<<16 | table[off+6]<<8 | table[off+7]);
            uint pstart = (uint)(table[off+8]<<24  | table[off+9]<<16  | table[off+10]<<8 | table[off+11]);
            if (vstart != checksVromOot && vstart != checksVromMm) continue;
            if (pstart == 0 || pstart == 0xFFFFFFFF) continue;

            // Uncompressed files have pend=0; compressed have pend=pstart+compressedSize.
            // File size (count of 16-byte entries) comes from the virtual span (vend-vstart).
            uint fileSize = vend - vstart;
            int  cnt      = (int)(fileSize / N64Addresses.OverrideEntrySize);
            if (cnt < 10 || cnt > 30000) continue;

            uint pend = (uint)(table[off+12]<<24 | table[off+13]<<16 | table[off+14]<<8 | table[off+15]);
            Console.WriteLine($"[autotrack] COMBO_VROM_CHECKS vstart=0x{vstart:X8} vend=0x{vend:X8} pstart=0x{pstart:X8} pend=0x{pend:X8} count={cnt}");
            count = cnt;
            return pstart;
        }

        Console.WriteLine("[autotrack] FindOverrideTableViaDma: COMBO_VROM_CHECKS entry not found in extra DMA table");
        return null;
    }

    // Polls the sComboOverrides table once it has been located, collecting OV_* type bytes to
    // derive which check categories are shuffled.  Emits shuffle_settings once and stops polling.
    // On WebSocket reconnect, OverrideTableScanned is reset to false so the emit is repeated.
    void PollOverrideTable()
    {
        if (_state.OverrideTableScanned) return;
        if (_state.ComboConfigAddr is null) return;

        if (_state.OverrideTableAddr is null)
        {
            if (_overrideScanCooldown > 0) { _overrideScanCooldown--; return; }
            _overrideScanCooldown = 40; // ~10 s

            var ptr = FindOverrideTableViaDma(out int cnt);
            if (ptr is null)
            {
                Console.WriteLine("[autotrack] sComboOverrides: DMA lookup found no table (will retry)");
                return;
            }

            _state.OverrideTableAddr  = ptr;
            _state.OverrideTableCount = cnt;
            Console.WriteLine($"[autotrack] sComboOverrides romOff=0x{ptr:X8} count={cnt}");
            return; // will be read on next poll
        }

        // OverrideTableAddr stores the ROM file offset; read from the ROM buffer (not RDRAM).
        int byteCount = _state.OverrideTableCount * N64Addresses.OverrideEntrySize;
        var buf = _mem!.ReadRom(_state.OverrideTableAddr!.Value, byteCount);
        if (buf is null) return;
        _overrideTableBuf = buf;

        bool scrub = false, cow = false, shop = false;
        bool gs    = false, sf  = false, fish = false, xflag = false;
        // "game:csvtype" → hasDungeon (any dungeon entry → 'anywhere', else 'overworld')
        var xflagDetected = new Dictionary<string, bool>();

        if (!_xflagIndexLoaded) { _xflagIndex = LoadXflagIndex(); _xflagIndexLoaded = true; }

        for (int i = 0; i < _state.OverrideTableCount; i++)
        {
            int off = i * N64Addresses.OverrideEntrySize;
            byte t  = buf[off + N64Addresses.OverrideKeyOffset];
            switch (t)
            {
                case N64Addresses.OvGs:    gs    = true; break;
                case N64Addresses.OvSf:    sf    = true; break;
                case N64Addresses.OvCow:   cow   = true; break;
                case N64Addresses.OvShop:  shop  = true; break;
                case N64Addresses.OvScrub: scrub = true; break;
                case N64Addresses.OvFish:  fish  = true; break;
                default:
                    if (t >= N64Addresses.OvXflagMin && t <= N64Addresses.OvXflagMax)
                    {
                        xflag = true;
                        if (_xflagIndex is not null)
                        {
                            uint key = (uint)((buf[off] << 24) | (buf[off+1] << 16) | (buf[off+2] << 8) | buf[off+3]);
                            if (_xflagIndex.TryGetValue(key, out var tag))
                            {
                                // tag = "game:csvtype:layout" e.g. "oot:pot:dungeon"
                                int c2 = tag.LastIndexOf(':');
                                if (c2 > 0)
                                {
                                    string gameType = tag[..c2];
                                    bool isDungeon  = tag.AsSpan(c2 + 1).SequenceEqual("dungeon");
                                    xflagDetected[gameType] = (xflagDetected.TryGetValue(gameType, out bool prev) && prev) || isDungeon;
                                }
                            }
                        }
                    }
                    break;
            }
        }

        _state.ScrubShuffle  = scrub;
        _state.CowShuffle    = cow;
        _state.ShopShuffle   = shop;
        _state.GsShuffle     = gs;
        _state.SfShuffle     = sf;
        _state.FishShuffle   = fish;
        _state.XflagShuffle  = xflag;
        _state.OverrideTableScanned = true;

        // Ensure xflag tables are loaded (needed by ProcessComboAddItemCapture for bitPos computation).
        if (xflag) EnsureXflagTablesLoaded();

        // Helper: null = not detected, value otherwise.
        string? Sel(string gameType) =>
            !xflagDetected.TryGetValue(gameType, out bool hasDungeon) ? null :
            hasDungeon ? "anywhere" : "overworld";
        bool Bln(string gameType) => xflagDetected.ContainsKey(gameType);

        _emit(new {
            type         = "shuffle_settings",
            scrubShuffle = scrub,
            cowShuffle   = cow,
            shopShuffle  = shop,
            gsShuffle    = gs,
            sfShuffle    = sf,
            fishShuffle  = fish,
            xflagShuffle = xflag,
            // xflag per-type (null = not detected → frontend keeps its default)
            potShuffleOot        = Sel("oot:pot"),
            potShuffleMm         = Sel("mm:pot"),
            crateShuffleOot      = Sel("oot:crate"),
            crateShuffleMm       = Sel("mm:crate"),
            barrelsShuffleMm     = Sel("mm:barrel"),
            grassShuffleOot      = Sel("oot:grass"),
            grassShuffleMm       = Sel("mm:grass"),
            treeShuffleMm        = Sel("mm:tree"),
            soilShuffleMm        = Sel("mm:soil"),
            rupeeShuffleOot      = Sel("oot:rupee"),
            rupeeShuffleMm       = Sel("mm:rupee"),
            heartsShuffleOot     = Sel("oot:heart"),
            snowballShuffleMm    = Sel("mm:snowball"),
            bushShuffleMm        = Sel("mm:bush"),
            wonderShuffleOot     = Sel("oot:wonder"),
            rockShuffleMm        = Sel("mm:rock"),
            hivesShuffleOot      = Bln("oot:hive"),
            hivesShuffleMm       = Bln("mm:hive"),
            rockShuffleOot       = Bln("oot:rock"),
            treeShuffleOot       = Bln("oot:tree"),
            soilShuffleOot       = Bln("oot:soil"),
            heartShuffleMm       = Bln("mm:heart"),
            wonderShuffleMm      = Bln("mm:wonder"),
            butterflyShuffleOot  = Bln("oot:butterfly"),
            butterflyShuffleMm   = Bln("mm:butterfly"),
            redBoulderShuffleOot = Bln("oot:boulder-red"),
            redBoulderShuffleMm  = Bln("mm:boulder-red"),
            iciclesShuffleOot    = Bln("oot:icicle"),
            iciclesShuffleMm     = Bln("mm:icicle"),
            fairySpotShuffleOot  = Bln("oot:fairy_spot"),
            fairyFountainShuffleOot = Bln("oot:fairy"),
            fairyFountainShuffleMm  = Bln("mm:fairy"),
            bushShuffleOot       = Bln("oot:bush"),
            redIceShuffleOot     = Bln("oot:redice"),
        });
        Console.WriteLine($"[autotrack] shuffle_settings: scrub={scrub} cow={cow} shop={shop} gs={gs} sf={sf} fish={fish} xflag={xflag} xflagTypes={xflagDetected.Count}");
    }
}
