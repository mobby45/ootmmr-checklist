namespace Autotracker.Tracker;

enum ActiveGame { Unknown, Oot, Mm }

record struct EntranceTransition(uint From, uint To);

sealed class GameState
{
    public ActiveGame Game { get; set; } = ActiveGame.Unknown;
    public uint? ComboContextAddress { get; set; }
    public uint LastEntrance { get; set; }

    // Raw save context snapshots — compared each poll to detect changes.
    public byte[]? OotSaveSnapshot { get; set; }
    public byte[]? MmSaveSnapshot  { get; set; }
}
