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

    // Payload BSS addresses found by scanning (null until scan succeeds).
    // Candidate is set on first "ZELDA3" match; Addr is set only after validation.
    public uint? PayloadMmSaveCandidateAddr { get; set; }
    public uint? PayloadMmSaveAddr          { get; set; }
    public uint? SharedCustomSaveAddr       { get; set; }
    public uint? PayloadOotSaveAddr   { get; set; }
    public uint? ComboConfigAddr      { get; set; }

    public byte[]? PayloadOotSaveSnapshot   { get; set; }
    public byte[]? ComboConfigSnapshot     { get; set; }
    // Signature covers only the fields the tracker uses (dungeonEntrances, mq, config[0x40]).
    // Volatile noise in entrancesSong/Owl/Spawns is excluded to prevent spam re-emission.
    public byte[]? ComboConfigSignature    { get; set; }
    public byte[]? OotSceneFlagsSnapshot  { get; set; }
    public byte[]? MmSceneFlagsSnapshot   { get; set; }

    // Entrance fields from each save context — used to detect OoT vs MM when gComboCtx.valid=1.
    // Null until first poll with valid=1; reset to null whenever valid drops to 0.
    public uint? OotSaveEntrance { get; set; }
    public uint? MmSaveEntrance  { get; set; }

    public byte[]? OotLiveSceneFlagsSnapshot { get; set; }
    public byte[]? MmLiveSceneFlagsSnapshot  { get; set; }
}
