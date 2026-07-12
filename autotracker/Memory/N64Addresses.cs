namespace Autotracker.Memory;

static class N64Addresses
{
    // Fixed addresses — stable across all OoTMM builds (ROM 1.0 linker values).
    public const uint ComboContextOot = 0x80006584;
    public const uint ComboContextOot_RdramOffset = ComboContextOot & 0x007FFFFF; // 0x006584
    public const uint ComboContextMm  = 0x80098280;
    public const uint SaveContextOot  = 0x8011A5D0;
    public const uint SaveContextMm   = 0x801EF670;

    // ComboContext field offsets (see include/combo/context.h).
    public const int ComboMagicOffset     = 0x00; // char[8] "OoT+MM<3"
    public const int ComboValidOffset     = 0x08; // u32
    public const int ComboSaveIndexOffset = 0x0C; // u32
    public const int ComboEntranceOffset  = 0x10; // u32
    public const int ComboIsFwSpawnOffset = 0x14; // s32

    // Save-context magic strings.
    public const string SaveMagicOot = "ZELDAZ";
    public const string SaveMagicMm  = "ZELDA3";

    // OoT gSaveContext offsets (from SaveContextOot).
    // Source: ASSERT_OFFSET macros in include/combo/oot/save.h
    // OotSave.entrance is at 0x00; OotSave.info is at 0x1C.
    public static class OotSave
    {
        public const int MagicOffset = 0x1C; // "ZELDAZ" = OotSave.info.playerData.newf
        public const int Items       = 0x74; // u8[24]  OotInventory.items
        public const int Ammo        = 0x8C; // u8[15]  OotInventory.ammo
        public const int Beans       = 0x9B; // u8
        public const int Equipment   = 0x9C; // u16     OotEquipment (boots:4,tunics:4,shields:4,swords:4)
        public const int Upgrades    = 0xA0; // u32     OotSaveUpgrades
        public const int QuestItems  = 0xA4; // u32     OotSaveQuest
        public const int DungItems   = 0xA8; // u8[20]  OotDungeonItems
        public const int DungKeys    = 0xBC; // s8[19]
        public const int GoldTokens  = 0xD0; // u16     gold skulltula count
        public const int SceneFlags  = 0xD4; // struct[124]
        // SAVE_EXTRA_RECORD(u32, 19) = perm[19].raw + 0x10 = 0xD4 + 19*0x1C + 0x10
        public const int TriforceOff = 0x2F8; // u32 gTriforceCount — requires 0x300 save read
    }

    // SharedCustomSave coins array — coins[4] at SharedCustomSave+0x7E0, 4 × u16 = 8 bytes.
    public const int SharedCustomSaveCoinOff  = 0x7E0;
    public const int SharedCustomSaveCoinSize = 8;

    // OotCustomSave xflags[762] — at SharedCustomSave+0 (first field of OotCustomSave = SharedCustomSave).
    // MmCustomSave xflags[848]  — at SharedCustomSave+sizeof(OotCustomSave) = SharedCustomSave+0x380.
    // Bitmaps set by comboXflagsSetOot/Mm for pots, grass, crates, barrels, etc.
    // sizeof(OotCustomSave) derivation (XFLAGS_COUNT_OOT=762): xflags[762]+npc[32]+shops[8]+scrubs[8]+sr[16]+
    //   pad2+fwRespawnDungeonEntrance[2×28]+powderKegTimer[2]+bitfields[2] = 888 → ALIGNED(16) = 0x380.
    public const int SharedCustomSaveOotXflagsOff  = 0x000;
    public const int SharedCustomSaveOotXflagsSize = 0x2FA; // XFLAGS_COUNT_OOT = 762
    public const int SharedCustomSaveMmXflagsOff   = 0x380; // sizeof(OotCustomSave)
    public const int SharedCustomSaveMmXflagsSize  = 0x350; // XFLAGS_COUNT_MM  = 848

    // OotCustomSave npc[32] flag bitmap — at SharedCustomSave+0x2FA (offset of npc within OotCustomSave).
    // Each bit corresponds to one NPC slot in npc.yml; slot index = bit position.
    public const int OotNpcFlagsOff  = 0x2FA;
    public const int OotNpcFlagsSize = 32;

    // Ocarina button mask (SharedCustomSave.ocarinaButtonMaskOot) at SharedCustomSave+0x7E8.
    // Set to 0xFFFF by comboCreateSave ONLY when ocarina buttons are NOT randomized (CFG_OOT_OCARINA_BUTTONS unset).
    // When buttons are randomized, starts at 0x0000 and accumulates bits as buttons are collected.
    // NOT a reliable universal initialization sentinel — do not use as sole guard for xflags reads.
    public const int SharedCustomSaveOcarinaBtnOff  = 0x7E8;
    public const int SharedCustomSaveOcarinaBtnSize = 2;

    // SharedCustomSave souls arrays — soulsEnemyOot[8] starts at SharedCustomSave+0x7EC.
    // Layout (41 bytes): soulsEnemyOot[8], soulsEnemyMm[8], soulsBossOot[2], soulsBossMm[1],
    //   soulsNpcOot[8], soulsNpcMm[8], soulsAnimalsOot[2], soulsAnimalsMm[2], soulsMiscOot[1], soulsMiscMm[1].
    // Offset derivation: sizeof(OotCustomSave)=0x380 + sizeof(MmCustomSave)=0x440 + netGiSkip[16]=0x20 +
    //   coins[4]=0x08 + ocarinaButtonMaskOot=0x02 + ocarinaButtonMaskMm=0x02 = 0x7EC.
    public const int SharedCustomSaveSoulsOff  = 0x7EC;
    public const int SharedCustomSaveSoulsSize = 41;
    // rustyKeysOot[4] and rustyKeysMm[5] within SharedCustomSave.
    // Derivation: soulsEnd(0x815) + fish[40] + flags[5] + align2 + RespawnData(0x20) + bits[2] + traps[7] + notes[0x26] = 0x893.
    public const int SharedCustomSaveRkOff  = 0x893; // u8[4] rustyKeysOot + u8[5] rustyKeysMm
    public const int SharedCustomSaveRkSize = 9;     // 4 + 5 bytes

    // Payload BSS scan — OoT combo payload starts at 0x80400000.
    // We scan for the payload copy of gMmSave (distinct from SaveContextMm at 0x801EF670)
    // by looking for "ZELDA3" at offset +0x24 (MmSave.info.playerData.newf) from a
    // 16-byte aligned address. gSharedCustomSave sits at gMmSave_payload + sizeof(MmSave).
    // OoT payload BSS: scan for payload gMmSave ("ZELDA3" at +0x24, 16-byte aligned).
    // gSharedCustomSave follows at +sizeof(MmSave) = +0x3CA0.
    public const uint PayloadOotStart           = 0x80400000u;
    public const uint PayloadOotEnd             = 0x80720000u; // MM payload start
    public const int  PayloadMmSaveMagicOffset  = 0x24;        // "ZELDA3" offset in MmSave
    public const int  PayloadMmSaveSize         = 0x3CA0;      // sizeof(MmSave) → OoT payload offset to SharedCustomSave
    public const int  PayloadOotSaveSize         = 0x1360;      // sizeof(OotSave) padded to ALIGNED(16) — gOotSave + 0x1360 = gSharedCustomSave in MM payload BSS
    public const int  SharedCustomSaveSongOff   = 0x376;       // hasSong* byte in OotCustomSave (= SharedCustomSave.oot)

    // MM payload BSS: scan for payload gOotSave ("ZELDAZ" at +0x1C, 16-byte aligned).
    public const uint PayloadMmStart            = 0x80720000u;
    public const uint PayloadMmEnd              = 0x80800000u; // RDRAM ceiling
    public const int  PayloadOotSaveMagicOffset = 0x1C;        // "ZELDAZ" offset in OotSave

    // gComboConfig is exactly sizeof(ComboConfig) = 0x2EC bytes before gComboCtx in BSS.
    // config.c (gComboConfig) immediately precedes context.c (gComboCtx) alphabetically in
    // src/common/, and nothing else falls between them — so they're adjacent in the sorted BSS.
    // sizeof(ComboConfig) = 748 = 0x2EC (struct padded to 4-byte alignment).
    public const uint ComboConfigOffsetFromCtx = 0x2ECu;

    // Legacy scan range constants — kept for reference, no longer used for scanning.
    public const uint ComboConfigScanStart = 0x80100000u;
    public const uint ComboConfigScanEnd   = 0x80800000u;

    // gComboConfig scan + read (OoT payload BSS).
    // Identified by: byte[0]=playerId(1-8), bytes[1-3]=0x00 (padding), bytes[4-5]=0x00 (high
    // bytes of dungeonWarps[0] u32 — entrance IDs < 0x10000 so upper bytes are always 0).
    //
    // We read the full ComboConfig header (0x12C = 300 bytes from offset 0) to include:
    //   dungeonWarps[12]   u32[12] at offset   4 (48 bytes)
    //   dungeonEntrances[26] u32[26] at offset 52 (104 bytes) ← shuffled dungeon ER mappings
    //   mq, preCompleted   u32[2]  at offset 156 (8 bytes)
    //   entrancesSong[6]   u32[6]  at offset 164 (24 bytes)
    //   entrancesOwl[10]   u32[10] at offset 188 (40 bytes)
    //   entrancesSpawns[2] u32[2]  at offset 228 (8 bytes)
    //   config[0x40]       u8[64]  at offset 236 (64 bytes = 512 confvar bits)
    //   songEventsOot[18]  u8[18]  at offset 0x2CA (song index per OoT event slot, dev only)
    //   songEventsMm[13]   u8[13]  at offset 0x2DC (song index per MM event slot, dev only)
    //   Release has songEvents[0x12] at 0x2C9 and no songEventsMm.
    public const int ComboConfigReadOffset        = 0;
    public const int ComboConfigReadSizeDev       = 0x2E9; // 745 bytes (dev, includes songEventsMm[13])
    public const int ComboConfigReadSizeRelease   = 0x2DC; // 732 bytes (release, struct ends at songEvents[0x12])
    public const int ComboConfigDungeonEntrOff    = 52;    // offset of dungeonEntrances[26] in buffer
    public const int ComboConfigDungeonEntrCount  = 26;
    public const int ComboConfigBitsOff           = 0xEC;  // offset of config[0x40] in buffer

    // ROM version discriminant (dev vs release).
    // Dev: byte at 0x2DC = songEventsMm[0] (song index 0-19, always <= 19).
    // Release: memory past struct end (no field at 0x2DC).
    // Reading as u16 at 0x2A4: dev = giZoraSapphire (GI index, typically >= 0x10),
    //   release = staticHintsImportance[0..1] (s8 values 0-3, so u16 = 0x0000-0x0303).
    public const int ComboConfigVersionDiscOff    = 0x2A4; // u16 — giZoraSapphire (dev) vs importance[0..1] (release)
    public const int ComboConfigSongEventsMmCheck = 0x2DC; // byte — songEventsMm[0] (dev) vs garbage (release)

    // Dev song event offsets.
    public const int ComboConfigSongEventsOotOff  = 0x2CA; // u8[18] (dev)
    public const int ComboConfigSongEventsOotCnt  = 18;
    public const int ComboConfigSongEventsMmOff   = 0x2DC; // u8[13] (dev)
    public const int ComboConfigSongEventsMmCnt   = 13;

    // Release song event offset (single array at 0x2C9).
    public const int ComboConfigSongEventsReleaseOff   = 0x2C9;
    public const int ComboConfigSongEventsReleaseCnt   = 18;

    // Hardcoded field offsets that differ between versions.
    // Dev: strayFairy=0x2C7, bombchuOot=0x2C8, bombchuMm=0x2C9
    // Release: strayFairy=0x2C6, bombchuOot=0x2C7, bombchuMm=0x2C8
    public const int ComboConfigStrayFairyOffDev     = 0x2C7;
    public const int ComboConfigBombchuOotOffDev     = 0x2C8;
    public const int ComboConfigBombchuMmOffDev      = 0x2C9;
    public const int ComboConfigStrayFairyOffRelease = 0x2C6;
    public const int ComboConfigBombchuOotOffRelease = 0x2C7;
    public const int ComboConfigBombchuMmOffRelease  = 0x2C8;

    // gMmSave candidate validation offsets.
    // After Save_CreateMM(), playerForm is set to 4 (init marker, never used in real gameplay).
    // playerName in gMmSave is copyName(gSave.info.playerData.playerName) — used to cross-check
    // that the found "ZELDA3" belongs to the current session, not stale PJ64 RDRAM from a prior one.
    public const int OotPlayerNameOff  = 0x24; // OotSave.info.playerData.playerName (after newf[6]+deathCount[2])
    public const int MmPlayerFormOff   = 0x20; // MmSave.playerForm u8 (set to 4 by Save_CreateMM)
    public const int MmPlayerNameOff   = 0x2C; // MmSave.info.playerData.playerName (0x24 info + 0x08 after newf+songOfTimeCount)

    // MM gSaveContext offsets (from SaveContextMm).
    // Source: ASSERT_OFFSET macros in include/combo/mm/save.h
    // MmSave.entrance is at 0x00; MmSave.info (MmSaveInfo) is at 0x24.
    // MmSaveInfo.playerData (0x28 bytes) → MmSaveInfo.itemEquips (0x22 bytes, 2 pad) → MmSaveInfo.inventory
    // skullCount* derivation: MmSaveInfo.scenesVisible[7] ends at 0xEC0, skullCountSwamp u16 follows.
    public static class MmSave
    {
        public const int MagicOffset       = 0x24;  // "ZELDA3" = MmSave.info.playerData.newf
        public const int EquipBits         = 0x6C;  // u16  MmItemEquips bitfield (boots:4,tunic:4,shield:4,sword:4)
        public const int Items             = 0x70;  // u8[48]  MmInventory.items
        public const int Ammo              = 0xA0;  // s8[24]  MmInventory.ammo
        public const int Upgrades          = 0xB8;  // u32     MmUpgrades
        public const int QuestItems        = 0xBC;  // u32     MmQuestItems
        public const int DungItems         = 0xC0;  // u8[10]  MmDungeonItems
        public const int DungKeys          = 0xCA;  // s8[9]
        public const int StrayFairies      = 0xD3;  // s8[10]  per-dungeon stray fairy counts (0=WF,1=SH,2=GB,3=ST,4=Town)
        public const int SkullCountSwamp   = 0xEE4; // u16 MmSaveInfo.skullCountSwamp (at MmSave+0x24+0xEC0)
        public const int SkullCountOcean   = 0xEE6; // u16 MmSaveInfo.skullCountOcean
    }

    // Permanent scene flags — OotPermanentSceneFlags/MmPermanentSceneFlags are both 0x1C bytes.
    // chest u32 is at offset 0 within each block.
    // OoT: OotSave.SceneFlags at OotSave+0xD4 = SaveContextOot+0xD4, 124 scenes.
    // MM:  MmSave.info.permanentSceneFlags at MmSave+0x24(info)+0xD2(perm) = SaveContextMm+0xF6, 120 scenes.
    //      Derivation: MmSaveInfo.playerData(0x28)+itemEquips(0x24)+inventory(0x86) = 0xD2 from MmSaveInfo.
    public const uint OotSceneFlagsAddr = SaveContextOot + 0xD4;
    public const int  OotSceneFlagsSize = 124 * 0x1C; // 0x89C
    public const uint MmSceneFlagsAddr  = SaveContextMm + 0xF6;
    public const int  MmSceneFlagsSize  = 120 * 0x1C; // 0x870

    // gComboConfig.maxCoins[4] — u16 array at offset 0x154 in gComboConfig.
    // Non-zero = coin shuffle enabled for that color, value = number of coins in the pool.
    public const int ComboConfigMaxCoinsOff   = 0x154;
    public const int ComboConfigMaxCoinsCount = 4;

    // gComboConfig.prices[] — u16 array at offset 0x15C in gComboConfig.
    // PRICE_RANGES: OOT_SHOPS=0 (64 items, indices 0-63), MM_SHOPS=106 (22 items, indices 106-127).
    // Total entries: 141 → 282 bytes.
    public const int ComboConfigPricesOff   = 0x15C;
    public const int ComboConfigPricesCount = 141;
    public const int MmShopsPriceBase       = 106; // PRICE_RANGES.MM_SHOPS offset into prices[]

    // gComboConfig.hints (ComboDataHints) — located after prices + triforcePieces/Goal.
    // Layout: prices[141](282) + triforcePieces(2) + triforceGoal(2) = 0x27A from config start.
    // ComboDataHints = dungeonRewards[13](26) + lightArrows(2) + oathToOrder[6](12) + ganonBossKey(2) = 42 bytes.
    // dungeonRewards order: STONE_EMERALD, STONE_RUBY, STONE_SAPPHIRE (indices 0-2, child altar),
    //   MEDALLION_LIGHT..SHADOW (indices 3-8, adult altar), MM boss remains ODOLWA..TWINMOLD (indices 9-12, MM panel).
    // Each ItemHint = { u8 region, u8 world } where regionId 1-38 = OoT, 129-174 = MM.
    public const int ComboConfigHintsOff  = 0x27A;
    public const int ComboConfigHintsSize = 42;

    // play->msgCtx.font.msgBuf — written by comboTextAppendHeader when hint is displayed in OoT.
    // Path: PlayState + msgCtx(0x020D8) + font(0x0128 within MsgContext) + msgBuf(0xDC88 within Font).
    // Font layout: msgOffset(4)+msgLength(4)+charTexBuf(0x3C00)+iconBuf(0x80)+fontBuf(0xA000) = 0xDC88 to msgBuf.
    // First byte written = 0x08 (TEXT_FAST from comboTextAppendStr in OoT mode).
    public const uint OotMsgBufOff = 0x020D8u + 0x0128u + 0xDC88u; // 0xFE88

    // Message context — used to detect which gossip stone the player is reading.
    // OoT: PlayState.msgCtx at +0x020D8 (ASSERT_OFFSET confirmed); textId at msgCtx+0xE2F8; talkActor at msgCtx+0xE408.
    //      msgMode at msgCtx+0xE304 — MSGMODE_NONE=0 when no dialog, non-zero while textbox is open.
    //      OoTMM gossip stones set textId=0 (custom sentinel for "use pre-filled msgBuf"), so msgMode
    //      is the only reliable "dialog open" indicator for OoT (textId stays 0 in all states).
    // MM:  PlayState.msgCtx at +0x04908 (ASSERT_OFFSET confirmed); currentTextId at msgCtx+0x11F04; unkActor at msgCtx+0x12040.
    // Gossip hint text ID: 0x20D0 in both games (PlayerDisplayTextBox called with this value).
    public const int  OotMsgCtxMsgModeOff   = 0x020D8 + 0xE304; // 0x103DC — PlayState.msgCtx.msgMode (u8)
    public const int  OotMsgCtxTextIdOff    = 0x020D8 + 0xE2F8; // 0x103D0 — PlayState.msgCtx.textId (u16)
    public const int  OotMsgCtxTalkActorOff = 0x020D8 + 0xE408; // 0x104E0 — PlayState.msgCtx.talkActor (Actor*)
    public const int  MmMsgCtxTextIdOff     = 0x04908 + 0x11F04; // 0x1680C — PlayState.msgCtx.currentTextId (u16)
    public const int  MmMsgCtxTalkActorOff  = 0x04908 + 0x12040; // 0x16948 — PlayState.msgCtx.unkActor (Actor*)
    public const uint GossipHintTextId      = 0x20D0;

    // OoT gGrottoData = gSaveContext.respawn[1].data.
    // OotSaveContext.respawn is at 0x1368; OotRespawnData[1] starts at +0x1C; .data (s8) is at +0x13.
    public const int OotGrottoDataOff = 0x1397; // s8 at SaveContextOot+0x1397

    // Actor struct field offsets (identical in both games).
    public const int ActorIdOff     = 0x00; // u16 id
    public const int ActorParamsOff = 0x1C; // s16 params

    // Actor IDs.
    // OoTMM uses the MM En_Gs ID (0x1B9) in both games — OoT's vanilla 0x0EF is remapped.
    public const uint ActorEnGsOot      = 0x1B9;
    public const uint ActorEnGsMm       = 0x1B9;
    // En_Wonder_Talk (OoT altar sign, params & 0xF800 == 0x0800 → dungeon reward hints).
    public const uint ActorEnWonderTalk = 0x147;
    // En_Talk (MM altar sign, params & 0x3F == 0x18 → boss remains hints).
    public const uint ActorEnTalk       = 0x261;

    // gSaveContext.gameMode — s32 that distinguishes title screen / file select from real gameplay.
    // GAMEMODE_NORMAL=0 (playing), GAMEMODE_TITLE_SCREEN=1, GAMEMODE_FILE_SELECT=2.
    // OoT: gSaveContext.gameMode at OotSaveContext+0x135C.
    // MM:  gSaveContext.gameMode at MmSaveContext+0x3CA8.
    // Source: ASSERT_OFFSET(OotSaveContext, gameMode, 0x135c) and ASSERT_OFFSET(MmSaveContext, gameMode, 0x3ca8).
    public const int OotGameModeOff = 0x135C;
    public const int MmGameModeOff  = 0x3CA8;
    public const int GameModeNormal = 0;

    // OotSave.age (u32 at SaveContextOot+0x04): 0=adult, 1=child.
    public const int OotSaveAgeOff = 0x04;

    // MM En_Gs actor-specific fields (actor-local, relative to actor base pointer).
    // unk_195 (u8): gossip key base for regular stones (params != 1 and params != 2).
    // unk_198 (s16): gossip key base for params==1 or params==2 stones.
    public const int MmEnGsUnk195Off = 0x195;
    public const int MmEnGsUnk198Off = 0x198;

    // OoT scene ID for Ganon's beast battle (OOT_GANON_BATTLE_ARENA in data-scenes.json).
    // Entering this scene triggers the light arrow hint display.
    public const int OotGanonBattleArenaSceneId = 79; // 0x4F

    // MM scene IDs for Moon trial areas — gossip stones there get key |= 0x40.
    // Values from z64decomp MM: SCENE_INISIE_R/N/B/BS (Deku=0x36, Goron=0x3A, Zora=0x3E, Link=0x45).
    public static readonly int[] MmMoonSceneIds = { 0x36, 0x3A, 0x3E, 0x45 };

    // sComboOverrides — heap-allocated sorted array of 16-byte override entries.
    // Entry layout: key(u32 BE) + player(u16 BE) + gi(u16 BE) + giCloak(u16 BE) + pad(6 bytes).
    // The key's high byte is the OV_* type constant below.
    public const int  OverrideEntrySize     = 16;
    public const int  OverrideKeyOffset     = 0;
    public const int  OverridePlayerOffset  = 4;
    public const int  OverrideGiOffset      = 6;
    public const int  OverrideGiCloakOffset = 8;

    // OV_* type constants (high byte of 32-bit key).
    public const byte OvGs       = 0x04; // Gold Skulltula
    public const byte OvSf       = 0x05; // Stray Fairy
    public const byte OvCow      = 0x06; // Cow
    public const byte OvShop     = 0x07; // Shop item
    public const byte OvScrub    = 0x08; // Scrub
    public const byte OvFish     = 0x0a; // Fishing pond fish
    public const byte OvXflagMin = 0x10; // First XFLAG type (pots, crates, grass, barrels, etc.)
    public const byte OvXflagMax = 0x1f; // Last XFLAG type: 0x10 + sliceId, sliceId ∈ [0,15]

    // Live OoT/MM scene flags — play->actorCtx.flags.chest, updated immediately on chest open.
    // Both games keep permanent flags in gSaveContext and only sync at scene exit.
    // PlayState addresses are static BSS symbols at fixed ROM locations (NTSC 1.0).
    // OoTMM does not shift these — additions (SaveContextMm, payload) are appended after vanilla BSS.
    //
    // Offsets from tlt/packs/ootmm/src/autotracker/rawFrameParser.ts and
    // OOTMMCombo-Tracker/PJ64Tracking/PJ64OoTMMTracker/Hooking.h:
    //   OoT: gGlobalCtx=0x801C84A0, sceneId@+0xA4=0x801C8544, chest@+0x1D38
    //   MM:  gGlobalCtx=0x803E6B20, sceneId@+0xA4=0x803E6BC4, chest@+0x1E68
    public const uint OotPlayStateAddr     = 0x801C84A0u;
    public const uint MmPlayStateAddr      = 0x803E6B20u;
    public const int  PlayStateSceneOff    = 0x0A4;        // play->sceneId (u16 big-endian) — same offset in both games
    public const int  OotPlayStateSwchOff  = 0x1D28;       // OoT play->actorCtx.flags.swch  (u32) — set by Flags_SetSwitch
    public const int  OotPlayStateChestOff = 0x1D38;       // OoT play->actorCtx.flags.chest (u32)
    public const int  MmPlayStateChestOff  = 0x1E68;       // MM  play->actorCtx.flags.chest (u32)
}
