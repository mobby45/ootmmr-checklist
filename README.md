# OoTMM Co-op Checklist Tracker

An online/co-op capable checklist tracker for the [OoTMM Randomizer](https://ootmm.com/).
Join the same room to mark off checks collaboratively with other players.

[**Try it here →**](https://mobby45.github.io/ootmmr-checklist)

---

## Features

### Checks
- All OoT and MM checks with full type filtering (chests, Gold Skulltulas, pots, grass, scrubs, shops, stray fairies, silver rupees, cows, and more)
- Shift-click to toggle a range of checks
- Right-click to mark a check for special attention
- Click a group name to toggle all checks in the group
- Auto-collapse groups when all checks are completed
- Filter/search checks by name (Ctrl+F)
- Compact mode (Alt+C)
- Alphabetical sort

### Spoiler Log
- Import a spoiler log to auto-configure settings and display found items
- Spoiler search — find which location holds an item (Ctrl+Shift+S)
- Seed info panel with hash and settings string (with copy buttons)

### Trackers
- **Item Tracker** — track collected items with visual icons
- **Entrance Rando Tracker** — map entrances for randomized entrance settings
- **Hint Tracker / Notes** — track Way of the Hero, barren zones, and custom notes

### Co-op
- Real-time collaborative checking via WebRTC (P2P, no server required)
- Room codes with optional password protection
- Watch mode (`?watch=roomcode`) — read-only view for spectators
- Chat and map pings
- Author badges on checks (shows who checked what)
- UUID-based room codes — no accidental collisions between groups

### Save & Settings
- Multiple save slots — snapshot and restore full run state
- Auto-save slot on room disconnect
- Export/Import save as JSON
- Settings presets (with default presets for common configurations)
- Undo/Redo (Ctrl+Z / Ctrl+Y)
- Multiple themes (Dark, Light, OoT Gold, MM Purple, Forest)

### Map
- Visual map for each zone with check markers
- Map pings visible to all co-op players

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+F | Focus filter |
| Ctrl+Shift+S | Focus spoiler search |
| Escape | Clear filter / spoiler search |
| Alt+C | Toggle compact mode |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Click | Toggle check |
| Shift+Click | Toggle range |
| Right-click | Mark check |
| Shift+Right-click | Mark range |
| Ctrl+Right-click | Edit note / shop item |

---

## Development

The app is a [Vite](https://vitejs.dev/) / [Svelte](https://svelte.dev/) app written in TypeScript.

Check and item data is processed at compile time from the [OoTMM repo](https://github.com/OoTMM/OoTMM) item pools.
Run `npm run process-data` to regenerate `src/data/dist/structured-checks[-lite].json`.

**Stack:**
- [yjs](https://yjs.dev/) — shared collaborative state (CRDT)
- [y-indexeddb](https://github.com/yjs/y-indexeddb) — local persistence
- [y-webrtc](https://github.com/yjs/y-webrtc) — P2P sync via WebRTC
- Signaling server based on [ngryman's implementation](https://github.com/ngryman/signaling), deployed on [Fly.io](https://fly.io)

```bash
npm install
npm run dev     # development server
npm run build   # production build
```

---

*Built with the help of [Claude](https://claude.ai) (Anthropic).*  
*Built with the help of Loupimo Map Tracker, link [here](https://github.com/Loupimo/OoTMMCombo-Tracker)*
