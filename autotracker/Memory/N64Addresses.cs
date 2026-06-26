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
        public const int SceneFlags  = 0xD4; // struct[124]
    }

    // Payload BSS scan — OoT combo payload starts at 0x80400000.
    // We scan for the payload copy of gMmSave (distinct from SaveContextMm at 0x801EF670)
    // by looking for "ZELDA3" at offset +0x24 (MmSave.info.playerData.newf) from a
    // 16-byte aligned address. gSharedCustomSave sits at gMmSave_payload + sizeof(MmSave).
    // OoT payload BSS: scan for payload gMmSave ("ZELDA3" at +0x24, 16-byte aligned).
    // gSharedCustomSave follows at +sizeof(MmSave) = +0x3CA0.
    public const uint PayloadOotStart           = 0x80400000u;
    public const uint PayloadOotEnd             = 0x80720000u; // MM payload start
    public const int  PayloadMmSaveMagicOffset  = 0x24;        // "ZELDA3" offset in MmSave
    public const int  PayloadMmSaveSize         = 0x3CA0;      // sizeof(MmSave) → offset to SharedCustomSave
    public const int  SharedCustomSaveSongOff   = 0x362;       // hasSong* byte in OotCustomSave (= SharedCustomSave.oot)

    // MM payload BSS: scan for payload gOotSave ("ZELDAZ" at +0x1C, 16-byte aligned).
    public const uint PayloadMmStart            = 0x80720000u;
    public const uint PayloadMmEnd              = 0x80800000u; // RDRAM ceiling
    public const int  PayloadOotSaveMagicOffset = 0x1C;        // "ZELDAZ" offset in OotSave

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
    public const int ComboConfigReadOffset        = 0;     // read from start of gComboConfig
    public const int ComboConfigReadSize          = 0x12C; // 300 bytes = up to end of config[0x40]
    public const int ComboConfigDungeonEntrOff    = 52;    // offset of dungeonEntrances[26] in buffer
    public const int ComboConfigDungeonEntrCount  = 26;
    public const int ComboConfigBitsOff           = 0xEC;  // offset of config[0x40] in buffer

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
    public static class MmSave
    {
        public const int MagicOffset = 0x24;  // "ZELDA3" = MmSave.info.playerData.newf
        public const int EquipBits   = 0x6C;  // u16  MmItemEquips bitfield (boots:4,tunic:4,shield:4,sword:4)
        public const int Items       = 0x70;  // u8[48]  MmInventory.items
        public const int Ammo        = 0xA0;  // s8[24]  MmInventory.ammo
        public const int Upgrades    = 0xB8;  // u32     MmUpgrades
        public const int QuestItems  = 0xBC;  // u32     MmQuestItems
        public const int DungItems   = 0xC0;  // u8[10]  MmDungeonItems
        public const int DungKeys    = 0xCA;  // s8[9]
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
    public const int  OotPlayStateChestOff = 0x1D38;       // OoT play->actorCtx.flags.chest (u32)
    public const int  MmPlayStateChestOff  = 0x1E68;       // MM  play->actorCtx.flags.chest (u32)
}
