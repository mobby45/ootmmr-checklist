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

    // Save-context magic strings (first 6 bytes of gSaveContext in each game).
    public const string SaveMagicOot = "ZELDAZ";
    public const string SaveMagicMm  = "ZELDA3";

    // gSaveContext OoT offsets (from SaveContextOot).
    public static class OotSave
    {
        public const int Scene     = 0x00; // u16
        public const int Inventory = 0x80; // u8[24]
        public const int Ammo      = 0x98; // u8[15]
        public const int Upgrades  = 0xA7; // u32
        public const int QuestItems= 0xAB; // u32
        public const int DungItems = 0xAF; // u8[20]
        public const int Keys      = 0xC3; // u8[19]
        public const int SceneFlags= 0xD4; // struct[124]
    }
}
