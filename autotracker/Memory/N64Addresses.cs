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
}
