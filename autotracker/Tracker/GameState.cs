namespace Autotracker.Tracker;

enum ActiveGame { Unknown, Oot, Mm }

record struct EntranceTransition(uint From, uint To);

sealed class GameState
{
    public ActiveGame Game { get; set; } = ActiveGame.Unknown;
    public uint? ComboContextAddress { get; set; }
    public uint LastEntrance { get; set; }

    // Raw save context snapshots — compared each poll to detect changes.
    public byte[]? OotSaveSnapshot          { get; set; }
    public byte[]? MmSaveSnapshot           { get; set; }
    public byte[]? PayloadMmSaveSnapshot    { get; set; }
    public byte[]? SharedCustomSaveSnapshot { get; set; }
    public byte[]? OotNpcFlagsSnapshot     { get; set; }
    public byte[]? SoulsDataSnapshot        { get; set; }
    public byte[]? MmSkullTokensSnapshot   { get; set; }
    public byte[]? RustyKeysSnapshot       { get; set; }
    public byte[]? CoinsSnapshot           { get; set; }
    public byte[]? CoinsMaxSnapshot        { get; set; }

    // Cached shop_data payloads keyed by shopKey ((isOot?0:0x10000)|sceneId).
    // Re-emitted on resync so the frontend can reapply shop hints without re-entering the shop.
    public Dictionary<int, object> ShopDataCache { get; } = new();

    // gHints malloc'd addresses in RDRAM — found by scanning for the hint array pattern.
    // Null until the scan succeeds.
    public uint? GossipHintsOotAddr { get; set; }
    public uint? GossipHintsMmAddr  { get; set; }
    public byte[]? GossipHintsOotSnapshot { get; set; }
    public byte[]? GossipHintsMmSnapshot  { get; set; }

    // gEntrances malloc'd addresses in RDRAM — found by scanning for key/value pair pattern.
    // Null until the scan succeeds.
    public uint? EntranceTableOotAddr { get; set; }
    public uint? EntranceTableMmAddr  { get; set; }
    public byte[]? EntranceTableOotSnapshot { get; set; }
    public byte[]? EntranceTableMmSnapshot  { get; set; }

    // Payload BSS addresses found by scanning (null until scan succeeds).
    // Candidate is set on first "ZELDA3" match; Addr is set only after validation.
    public uint? PayloadMmSaveCandidateAddr { get; set; }
    public uint? PayloadMmSaveAddr          { get; set; }
    public uint? SharedCustomSaveAddr       { get; set; }
    public uint? PayloadOotSaveAddr   { get; set; }
    public uint? MmPayloadSharedCustomSaveAddr { get; set; }  // MM payload: gOotSave + sizeof(OotSave) = 0x1354
    public uint? ComboConfigAddr      { get; set; }

    public byte[]? PayloadOotSaveSnapshot   { get; set; }
    public byte[]? ComboConfigSnapshot     { get; set; }
    // Signature covers only the fields the tracker uses (dungeonEntrances, mq, config[0x40]).
    // Volatile noise in entrancesSong/Owl/Spawns is excluded to prevent spam re-emission.
    public byte[]? ComboConfigSignature    { get; set; }
    public byte[]? OotSceneFlagsSnapshot  { get; set; }
    public byte[]? MmSceneFlagsSnapshot   { get; set; }
    public byte[]? OotXflagsSnapshot      { get; set; }
    public byte[]? MmXflagsSnapshot       { get; set; }

    // Entrance fields from each save context — used to detect OoT vs MM when gComboCtx.valid=1.
    // Null until first poll with valid=1; reset to null whenever valid drops to 0.
    public uint? OotSaveEntrance { get; set; }
    public uint? MmSaveEntrance  { get; set; }

    public byte[]? OotLiveSceneFlagsSnapshot { get; set; }
    public byte[]? MmLiveSceneFlagsSnapshot  { get; set; }

    // True once native gMmSave (0x801EF670) has been validated for this session.
    // Used to unlock mm_save reading in OoT before the payload BSS copy is synced.
    public bool NativeMmSaveValidated { get; set; }

    // sComboOverrides table — located by BSS scan for sComboOverridesDevAddr (PI_DOM1_ADDR2 prefix).
    // OverrideTableAddr stores the ROM byte offset (devAddr & ~0x10000000); data read via ReadRom().
    // OverrideTableScanned is set to true after one successful full-table read and emit.
    // Reset to false on WebSocket reconnect so shuffle_settings is re-emitted to the new client.
    public uint? OverrideTableAddr    { get; set; }
    public int   OverrideTableCount   { get; set; }
    public bool  OverrideTableScanned { get; set; }

    // Detected shuffle flags derived from override table entry types.
    public bool ScrubShuffle  { get; set; }
    public bool CowShuffle    { get; set; }
    public bool ShopShuffle   { get; set; }
    public bool GsShuffle     { get; set; }
    public bool SfShuffle     { get; set; }
    public bool FishShuffle   { get; set; }
    public bool XflagShuffle  { get; set; }
}
