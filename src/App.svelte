<script lang="ts">
  // ==========================================
  // IMPORTS
  // ==========================================
  import * as Y from 'yjs';
  import { readableArray, readableMap } from 'svelt-yjs';
  import { WebrtcProvider } from 'y-webrtc';
  import { IndexeddbPersistence } from 'y-indexeddb';

  import { initializeStructuredChecks } from './util/util';
  import { parseSpoilerLog } from './util/spoilerParser';
  import { importRandomizerSettings } from './util/importSettings';
  import type { ErSettings, SeedInfo } from './util/spoilerParser';
  import { defaultPresets, defaultPresetNames, presetBaseSettings } from './data/presets';
  import * as T from './data/types';

  import CheckGroup from './components/CheckGroup.svelte';
  import CheckItem from './components/CheckItem.svelte';
  import MapModal from './components/MapModal.svelte';
  import ERTracker from './components/ERTracker.svelte';
  import ItemTracker from './components/ItemTracker.svelte';
  import OverlayTracker from './components/OverlayTracker.svelte';
  import HintTracker from './components/HintTracker.svelte';
  import { allTrackerItems } from './data/itemData';

  import { buildMapData, type MapData, type SceneData } from './util/mapData';
  import type { MapCheck } from './util/mapData';

  const IMG_BASE = '/ootmmr-checklist/images/';
  setTimeout(() => {
    allTrackerItems.forEach(item => {
      const img = new Image();
      img.src = `${IMG_BASE}${item.icon}.png`;
    });
  }, 2000); // 2s after initial load

  // ==========================================
  // OVERLAY DETECTION
  // Overlay mode shows only the item tracker in a separate window,
  // synchronized via IndexeddbPersistence (same Yjs doc key = 'local')
  // ==========================================
  const isOverlay = new URLSearchParams(window.location.search).has('overlay');

  // ==========================================
  // YJS DOCUMENT & PERSISTENCE
  // ==========================================
  const ydoc = new Y.Doc();
  const persistenceProvider = new IndexeddbPersistence('local', ydoc);

  const yChecks: Y.Map<T.CheckState> = ydoc.getMap('checks');
  const ySettings: Y.Map<any> = ydoc.getMap('settings');
  const yMqSettings: Y.Map<boolean> = ydoc.getMap('mqSettings');
  const yVariantSettings: Y.Map<number> = ydoc.getMap('variantSettings');
  const yShopItems: Y.Map<string> = ydoc.getMap('shopItems');
  const yShopPrices: Y.Map<number> = ydoc.getMap('shopPrices');
  const yEntrances: Y.Map<string> = ydoc.getMap('entrances');
  const yItems: Y.Map<number> = ydoc.getMap('items');
  const yCheckAuthors: Y.Map<string> = ydoc.getMap('checkAuthors');
  const yNotes: Y.Map<string> = ydoc.getMap('notes');
  const yHints: Y.Array<any> = ydoc.getArray('hints');
const yMessages: Y.Array<any> = ydoc.getArray('messages');
  const yPings: Y.Map<any> = ydoc.getMap('pings');

  // ==========================================
  // PSEUDO (co-op attribution)
  // ==========================================
  let pseudo: string = localStorage.getItem('pseudo') ?? '';
  let pingColor: string = localStorage.getItem('pingColor') ?? '#ff6b6b';
  $: localStorage.setItem('pingColor', pingColor);

  function setPseudo(name: string) {
    pseudo = name.trim().slice(0, 20);
    localStorage.setItem('pseudo', pseudo);
  }
  function handlePseudoSubmit(e: Event) {
    const input = (e.target as HTMLFormElement).querySelector('input') as HTMLInputElement;
    if (input) setPseudo(input.value);
  }
  function setAuthor(checkName: string, state: T.CheckState) {
    if (state === T.CheckState.unchecked) yCheckAuthors.delete(checkName);
    else if (pseudo) yCheckAuthors.set(checkName, pseudo);
    // Remove any active ping for this check when it gets checked
    if (state === T.CheckState.checked) {
      for (const [scene, ping] of yPings.entries()) {
        const pn = typeof ping?.checkName === 'string' ? ping.checkName.replace(/^(OOT|MM) /, '') : null;
        if (pn === checkName) { yPings.delete(scene); break; }
      }
    }
  }

  // ==========================================
  // CHAT
  // ==========================================
  interface ChatMessage {
    pseudo: string;
    message: string;
    timestamp: number;
    isPing?: boolean;
    pingScene?: string;
    pingGroupName?: string;
  }

  let messages: ChatMessage[] = yMessages.toArray();
  yMessages.observe(() => { messages = yMessages.toArray(); });

  let chatMessage = '';
  let chatOpen = false;
  let chatUnread = 0;
  let prevMessageCount = messages.length;
  let chatFilter: 'all' | 'chat' | 'pings' = 'all';
  $: filteredMessages = chatFilter === 'all' ? messages
    : chatFilter === 'chat' ? messages.filter(m => !m.isPing)
    : messages.filter(m => m.isPing);

  function clearChat() {
    if (!window.confirm('Clear all messages?')) return;
    yMessages.delete(0, yMessages.length);
  }
  let chatScrollEl: HTMLElement | undefined;

  $: if (messages) {
    const count = messages.length;
    if (count > prevMessageCount) {
      if (!chatOpen) chatUnread += count - prevMessageCount;
      requestAnimationFrame(() => { if (chatScrollEl) chatScrollEl.scrollTop = chatScrollEl.scrollHeight; });
    }
    prevMessageCount = count;
  }

  function toggleChat() {
    chatOpen = !chatOpen;
    if (chatOpen) {
      chatUnread = 0;
      requestAnimationFrame(() => { if (chatScrollEl) chatScrollEl.scrollTop = chatScrollEl.scrollHeight; });
    }
  }

  function sendMessage() {
    const msg = chatMessage.trim();
    if (!msg) return;
    const entry: ChatMessage = { pseudo: pseudo || 'Anonymous', message: msg, timestamp: Date.now() };
    yMessages.push([entry]);
    while (yMessages.length > 100) yMessages.delete(0, 1);
    chatMessage = '';
  }

  function formatChatTime(ts: number): string {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // ==========================================
  // PING (map pings via Yjs)
  // ==========================================
  const sPings = readableMap(yPings);

  function handleMapPing(e: CustomEvent) {
    if (!connectionProvider) return;
    const { xPct, yPct, scene, subscene, checkName } = e.detail;
    const p = pseudo || 'Anonymous';
    const ts = Date.now();
    // One ping per scene — keyed by scene name → last-write-wins, no spam
    yPings.set(scene, { xPct, yPct, pseudo: p, subscene, ts, checkName: checkName ?? null, color: pingColor, groupName: currentGroupName });
    const label = checkName
      ? `📍 ${checkName.replace(/^(OOT|MM) /, '')}`
      : '📍 pinged the map';
    const pingMsg: ChatMessage = {
      pseudo: p,
      message: label,
      timestamp: ts,
      isPing: true,
      pingScene: scene,
      pingGroupName: currentGroupName,
    };
    yMessages.push([pingMsg]);
    while (yMessages.length > 100) yMessages.delete(0, 1);
    // Remove the ping after 30s, but only if it's still the same ping (not replaced)
    setTimeout(() => {
      const cur = yPings.get(scene);
      if (cur && cur.ts === ts) yPings.delete(scene);
    }, 30000);
  }

  // Pinged checks visible in the checklist: check name (no prefix) → color
  $: pinnedChecks = (() => {
    const map = new Map<string, string>();
    for (const [, ping] of ($sPings as Map<string, any>).entries()) {
      if (ping?.checkName) map.set(ping.checkName.replace(/^(OOT|MM) /, ''), ping.color ?? '#ff6b6b');
    }
    return map;
  })();

  // Pings are keyed by scene name — at most one active ping per scene
  $: scenePingsForMap = (() => {
    if (!showMapModal || !currentMapScene) return [];
    const raw = ($sPings as Map<string, any>).get(currentMapScene);
    if (!raw) return [];
    return [{ id: currentMapScene, xPct: raw.xPct as number, yPct: raw.yPct as number, pseudo: raw.pseudo as string, subscene: raw.subscene as string, checkName: raw.checkName as string | undefined ?? undefined, color: (raw.color as string | undefined) ?? '#ff6b6b' }];
  })();

  // ==========================================
  // UNDO / REDO
  // ==========================================
  const undoManager = new Y.UndoManager([yChecks, yItems], { captureTimeout: 500 });
  let canUndo = false;
  let canRedo = false;
  const updateUndoRedo = () => { canUndo = undoManager.canUndo(); canRedo = undoManager.canRedo(); };
  undoManager.on('stack-item-added', updateUndoRedo);
  undoManager.on('stack-item-popped', updateUndoRedo);
  function undo() { undoManager.undo(); }
  function redo() { undoManager.redo(); }
  let filterInputEl: HTMLInputElement | undefined;
  let spoilerSearchEl: HTMLInputElement | undefined;
  let spoilerSearchDetailsEl: HTMLDetailsElement | undefined;

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); filterInputEl?.focus(); return; }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (spoilerSearchDetailsEl && !spoilerSearchDetailsEl.open) spoilerSearchDetailsEl.open = true;
      spoilerSearchEl?.focus();
      return;
    }
    if (e.altKey && e.key.toLowerCase() === 'c') { e.preventDefault(); compact = !compact; return; }
    if (e.key === 'Escape') {
      if (filter) { filter = ''; filterInputEl?.blur(); return; }
      if (spoilerSearch) { spoilerSearch = ''; return; }
    }
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
  }

  const sChecks = readableMap(yChecks);
  const sCheckAuthors = readableMap(yCheckAuthors);
  let hints: any[] = yHints.toArray();
  yHints.observe(() => { hints = yHints.toArray(); });
  const sSettings = readableMap(ySettings);
  const sMqSettings = readableMap(yMqSettings);
  const sVariantSettings = readableMap(yVariantSettings);
  const sShopItems = readableMap(yShopItems);
  const sShopPrices = readableMap(yShopPrices);
  const sEntrances = readableMap(yEntrances);
  const sNotes = readableMap(yNotes);

  $: checkStatesMap = new Map($sChecks);
  $: shopItemsMap = new Map($sShopItems);
  $: shopPricesMap = new Map($sShopPrices);
  $: entranceValuesMap = new Map($sEntrances);
  $: checkToGroup = structuredChecks
    ? new Map(structuredChecks.flatMap(g => g.checks.map(c => [c.name, g.groupName])))
    : new Map<string, string>();
  $: notesEntries = [...($sNotes as Map<string, string>).entries()]
    .map(([id, text]) => ({ id, text, group: checkToGroup.get(id) ?? '' }));
  $: shopEntries = [...($sShopItems as Map<string, string>).entries()]
    .map(([id, item]) => ({ id, item, price: ($sShopPrices as Map<string, number>).get(id) ?? null, group: checkToGroup.get(id) ?? '' }));

  function handleShopEditByName(name: string) {
    if (!structuredChecks) { openShopEdit(name, true); return; }
    for (const group of structuredChecks) {
      const check = group.checks.find(c => c.name === name);
      if (check) { handleShopEdit(check.name, check.id); return; }
    }
    openShopEdit(name, true);
  }

  // Sync Yjs between tabs/windows via BroadcastChannel
  const bc = new BroadcastChannel('ootmm-ydoc-sync');

  ydoc.on('update', (update: Uint8Array, origin: any) => {
    // Don't re-broadcast updates that came from the channel
    if (origin !== 'bc') {
      bc.postMessage(Array.from(update));
    }
  });

  bc.onmessage = (event: MessageEvent) => {
    const update = new Uint8Array(event.data);
    Y.applyUpdate(ydoc, update, 'bc');
  };

  // ==========================================
  // CO-OP (WebRTC)
  // Two-room security model:
  //   Edit room  = fullCode (e.g. "abc123-secret") — shared privately
  //   Watch room = baseCode (e.g. "abc123")        — shown in ?watch= URL
  // Host connects to both rooms with the same ydoc, acting as a relay.
  // Viewers join only the watch room and cannot affect the edit room.
  // ==========================================
  let roomName: string | null = null;      // full edit code (includes password)
  let roomBaseCode: string | null = null;  // public base code (for watch URL)
  let connectionProvider: WebrtcProvider | null = null;
  let watchRelayProvider: WebrtcProvider | null = null;
  let connectedUsers: { name: string; color: string }[] = [];
  let newRoomPassword = '';

  // Only set hash for edit mode (never leak password via watch-mode hash)
  $: if (!isWatchMode) window.location.hash = roomName ?? '';

  function refreshConnectedUsers() {
    if (!connectionProvider) { connectedUsers = []; return; }
    connectedUsers = Array.from(connectionProvider.awareness.states.values())
      .filter((s: any) => s?.user)
      .map((s: any) => ({ name: s.user.name as string, color: s.user.color as string }));
  }

  // fullCode may be "basecode" or "basecode-password"
  function joinCoopRoom(name?: string, password?: string) {
    const base = name ?? crypto.randomUUID();
    const full = password ? `${base}-${password}` : base;
    roomName = full;

    // UUID codes are 36 chars (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).
    // For UUID rooms, password is appended after position 36 with a '-'.
    // For legacy short codes, split on the last '-' as before.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
    const isUUID = UUID_RE.test(full);
    const dashIdx = isUUID
      ? (full.length > 36 && full.charAt(36) === '-' ? 36 : -1)
      : full.lastIndexOf('-');
    roomBaseCode = dashIdx !== -1 ? full.slice(0, dashIdx) : full;
    const hasPassword = dashIdx !== -1;

    connectionProvider = new WebrtcProvider(full, ydoc, {
      signaling: ['https://ootmmr-checklist-signaling.fly.dev/'],
    });
    connectionProvider.awareness.setLocalStateField('user', { name: pseudo || 'Anonymous', color: pingColor });
    connectionProvider.awareness.on('change', refreshConnectedUsers);
    refreshConnectedUsers();

    // Bridge to watch room so viewers in ?watch=baseCode receive updates
    if (hasPassword && !isWatchMode) {
      watchRelayProvider = new WebrtcProvider(roomBaseCode, ydoc, {
        signaling: ['https://ootmmr-checklist-signaling.fly.dev/'],
      });
    }
  }

  $: if (connectionProvider) {
    connectionProvider.awareness.setLocalStateField('user', { name: pseudo || 'Anonymous', color: pingColor });
  }

  function autoSaveRoomSlot() {
    if (!roomBaseCode) return;
    const slotName = `Room: ${roomBaseCode}`;
    const existing = saveSlots.find(s => s.name === slotName);
    if (existing) {
      saveSlots = saveSlots.map(s =>
        s.id === existing.id ? { ...s, ...snapshotCurrentState(), updatedAt: Date.now() } : s
      );
    } else {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      saveSlots = [...saveSlots, { id, name: slotName, createdAt: Date.now(), updatedAt: Date.now(), ...snapshotCurrentState() }];
      currentSlotId = id;
      localStorage.setItem('currentSlotId', id);
    }
    persistSlots();
  }

  function leaveCoopRoom() {
    if (window.confirm('Are you sure you want to disconnect? Your progress will be preserved as it is now.')) {
      autoSaveRoomSlot();
      connectionProvider?.disconnect();
      connectionProvider = null;
      watchRelayProvider?.disconnect();
      watchRelayProvider = null;
      roomName = null;
      roomBaseCode = null;
      connectedUsers = [];
    }
  }

  // Auto-save room slot on page close/refresh while connected
  window.addEventListener('beforeunload', () => { if (connectionProvider) autoSaveRoomSlot(); });

  // Watch mode (read-only): ?watch=baseCode — joins watch relay room only
  const _watchParam = new URLSearchParams(window.location.search).get('watch');
  const isWatchMode = !!_watchParam;
  if (isWatchMode && _watchParam) {
    roomBaseCode = _watchParam;
    joinCoopRoom(_watchParam);
  }

  // Auto-join from URL hash on load (hash may include password: #baseCode-secret)
  if (!isWatchMode && window.location.hash.length > 0 && /#[a-z0-9-]+/.test(window.location.hash)) {
    joinCoopRoom(window.location.hash.slice(1));
  }

  // ==========================================
  // DISPLAY SETTINGS (synced via Yjs)
  // Migrated from localStorage on first load
  // ==========================================
  const _displayDefaults: Record<string, any> = {
    OOTMM: 'both', OOTMMDungeons: 'both',
    showUnshuffledGS: false, showUnshuffledDungeonSF: false,
    showUnshuffledFreeSF: false, showUnshuffledTownSF: false,
  };
  // Migrate old localStorage values on first load
  Object.entries(_displayDefaults).forEach(([k, def]) => {
    if (!ySettings.has(k)) {
      const old = localStorage.getItem(`gs_${k}`);
      ySettings.set(k, old !== null ? JSON.parse(old) : def);
    }
  });

  // ==========================================
  // SPOILER LOG
  // Locations are stored without OOT/MM prefix for check name lookup
  // erSettings controls which entrance types are shown in ERTracker
  // ==========================================

  // Known spoiler name → pool name differences (OoTMM spoiler output vs local CSV naming)
  const SPOILER_ALIASES: Record<string, string> = {
    'Kakariko Potion Shop Buy Blue Potion': 'Kakariko Potion Shop Odd Potion',
  };

  function applyAliases(raw: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) out[SPOILER_ALIASES[k] ?? k] = v;
    return out;
  }

  let spoilerLocations: Record<string, string> = applyAliases(JSON.parse(localStorage.getItem('spoilerLocations') ?? '{}'));
  let spoilerSeedInfo: SeedInfo | null = JSON.parse(localStorage.getItem('spoilerSeedInfo') ?? 'null');
  let showSpoilerItems = false;
  let spoilerSearch = '';
  let seedInfoOpen = localStorage.getItem('sec_seedinfo') === 'true';
  let spoilerSearchOpen = localStorage.getItem('sec_spoilersearch') === 'true';

  // Locations in the spoiler that don't match any check name in the full pool
  $: spoilerUnmatched = (() => {
    if (!structuredChecks || Object.keys(spoilerLocations).length === 0) return [];
    const allNames = new Set(structuredChecks.flatMap(g => g.checks.map(c => c.name)));
    return Object.keys(spoilerLocations).filter(loc => !allNames.has(loc));
  })();

  $: if (spoilerUnmatched.length > 0) {
    console.warn('[Spoiler] Unmatched locations (not in pool):', spoilerUnmatched);
  }

  function formatSpoilerItem(s: string): string {
    // Capitalize after spaces/underscores only — not after apostrophes (avoids "Kokiri'S Emerald")
    return s.toLowerCase().replace(/_/g, ' ').replace(/(?<!')\b\w/g, c => c.toUpperCase());
  }

  let hashCopied = false;
  function copyHash() {
    navigator.clipboard.writeText(spoilerSeedInfo?.hash ?? '');
    hashCopied = true;
    setTimeout(() => { hashCopied = false; }, 1500);
  }

  let settingsCopied = false;
  function copySettings() {
    navigator.clipboard.writeText(spoilerSeedInfo?.settingsString ?? '');
    settingsCopied = true;
    setTimeout(() => { settingsCopied = false; }, 1500);
  }

  $: spoilerSearchResults = spoilerSearch.trim().length >= 2
    ? Object.entries(spoilerLocations)
        .filter(([loc, item]) => {
          const lc = spoilerSearch.trim().toLowerCase();
          return item.toLowerCase().includes(lc) || loc.toLowerCase().includes(lc);
        })
        .map(([loc, item]) => {
          const lc = spoilerSearch.trim().toLowerCase();
          const matchedLoc = loc.toLowerCase().includes(lc) && !item.toLowerCase().includes(lc);
          return { loc, item, matchedLoc };
        })
    : [];
  let spoilerErSettings: ErSettings | null = JSON.parse(localStorage.getItem('spoilerErSettings') ?? 'null');

  function importSpoilerLog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const data = parseSpoilerLog(await file.text());

      Object.entries(data.settings).forEach(([k, v]) => ySettings.set(k, v));
      ySettings.set('OOTMM', data.OOTMM);
      ySettings.set('OOTMMDungeons', data.OOTMMDungeons);

      const raw: Record<string, string> = {};
      for (const [key, value] of Object.entries(data.locations)) {
        raw[key.replace(/^(OOT|MM) /, '')] = value;
      }
      spoilerLocations = applyAliases(raw);
      localStorage.setItem('spoilerLocations', JSON.stringify(spoilerLocations));

      spoilerErSettings = data.erSettings;
      localStorage.setItem('spoilerErSettings', JSON.stringify(data.erSettings));

      spoilerSeedInfo = data.seedInfo;
      localStorage.setItem('spoilerSeedInfo', JSON.stringify(data.seedInfo));
    };
    input.click();
  }

  // ==========================================
  // PRESETS
  // Default presets are read-only (marked with ⭐, cannot be deleted)
  // User presets are stored in localStorage under 'presets'
  // ==========================================
  let userPresets: Record<string, any> = JSON.parse(localStorage.getItem('presets') || '{}');
  $: allPresets = { ...defaultPresets, ...userPresets };
  let selectedPreset = '';
  let newPresetName = '';
  let presetMigrationWarning = '';

  $: if (Object.keys(allPresets).length > 0 && !selectedPreset) selectedPreset = Object.keys(allPresets)[0];

  function savePreset() {
    if (!newPresetName.trim()) return;
    userPresets[newPresetName] = {
      settings: Object.fromEntries(Array.from(ySettings.entries())),
      OOTMM: ySettings.get('OOTMM') ?? 'both',
      OOTMMDungeons: ySettings.get('OOTMMDungeons') ?? 'both',
    };
    localStorage.setItem('presets', JSON.stringify(userPresets));
    userPresets = { ...userPresets };
    selectedPreset = newPresetName;
    newPresetName = '';
  }

  function loadPreset(name: string) {
    const preset = allPresets[name];
    if (!preset) return;
    presetMigrationWarning = '';
    const missingKeys = Object.keys(presetBaseSettings).filter(k => !(k in preset.settings));
    if (missingKeys.length > 0 && !defaultPresetNames.has(name)) {
      presetMigrationWarning = `Preset migrated: ${missingKeys.length} setting(s) added since save — filled with defaults.`;
      missingKeys.forEach(k => ySettings.set(k, (presetBaseSettings as Record<string, any>)[k]));
    }
    Object.entries(preset.settings).forEach(([k, v]) => ySettings.set(k, v));
    ySettings.set('OOTMM', preset.OOTMM ?? 'both');
    ySettings.set('OOTMMDungeons', preset.OOTMMDungeons ?? 'both');
  }

  function exportPresets() {
    const blob = new Blob([JSON.stringify(userPresets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ootmm-presets.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function importPresets() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (typeof data === 'object' && data !== null) {
          userPresets = { ...userPresets, ...data };
          localStorage.setItem('presets', JSON.stringify(userPresets));
          userPresets = { ...userPresets };
        }
      } catch { alert('Invalid presets file!'); }
    };
    input.click();
  }

  function deletePreset(name: string) {
    if (defaultPresetNames.has(name)) return;
    delete userPresets[name];
    localStorage.setItem('presets', JSON.stringify(userPresets));
    userPresets = { ...userPresets };
    selectedPreset = Object.keys(allPresets)[0] ?? '';
  }

  // ==========================================
  // SHOP / SCRUB ITEM EDITING
  // Right-click on shop/scrub checks to set item name and price
  // shopScrubIds   = OoT scrubs (item + price)
  // itemOnlyIds    = MM scrubs (item only, no price)
  // priceEditIds   = all checks supporting price editing
  // ==========================================
  const shopScrubIds = new Set([
    'SCRUB_TELESCOPE',
    'SCRUB_SHOP_BEANS',
    'SCRUB_BOMB_BAG',
    'SCRUB_SHOP_POTION_GREEN',
    'SCRUB_SHOP_POTION_BLUE',
  ]);

  const priceEditIds = new Set([
    ...shopScrubIds,
    'TINGLE_MAP_CLOCK_TOWN',
    'TINGLE_MAP_WOODFALL',
    'TINGLE_MAP_SNOWHEAD',
    'TINGLE_MAP_ROMANI_RANCH',
    'TINGLE_MAP_GREAT_BAY',
    'TINGLE_MAP_STONE_TOWER',
    'TALON_MILK',
    'CARPET_MERCHANT',
    'WITCH_BLUE_POTION',
    'MEDIGORON',
  ]);

  const itemOnlyIds = new Set([
    'SCRUB_TELESCOPE',
    'SCRUB_SHOP_BEANS',
    'SCRUB_BOMB_BAG',
    'SCRUB_SHOP_POTION_GREEN',
    'SCRUB_SHOP_POTION_BLUE',
  ]);

  let noteEditOpen = false;
  let noteEditKey = '';
  let noteEditValue = '';

  function handleEditNote(checkName: string) {
    noteEditKey = checkName;
    noteEditValue = yNotes.get(checkName) ?? '';
    noteEditOpen = true;
  }

  function confirmNoteEdit() {
    if (noteEditValue.trim()) yNotes.set(noteEditKey, noteEditValue.trim());
    else yNotes.delete(noteEditKey);
    noteEditOpen = false;
  }

  let shopEditOpen = false;
  let shopEditKey = '';
  let shopEditAllowPrice = false;
  let shopEditItem = '';
  let shopEditPrice = '';

  function openShopEdit(key: string, allowPrice: boolean) {
    shopEditKey = key;
    shopEditAllowPrice = allowPrice;
    shopEditItem = yShopItems.get(key) ?? '';
    shopEditPrice = String(yShopPrices.get(key) ?? '');
    shopEditOpen = true;
  }

  function confirmShopEdit() {
    if (shopEditItem.trim()) yShopItems.set(shopEditKey, shopEditItem.trim());
    else yShopItems.delete(shopEditKey);
    if (shopEditAllowPrice) {
      const price = parseInt(String(shopEditPrice));
      if (!shopEditPrice || isNaN(price) || price <= 0) yShopPrices.delete(shopEditKey);
      else yShopPrices.set(shopEditKey, price);
    }
    shopEditOpen = false;
  }

  function handleShopEdit(checkName: string, checkId: string) {
    openShopEdit(checkName, !itemOnlyIds.has(checkId));
  }

  function handleMapShopEdit(key: string) {
    openShopEdit(key, true);
  }

  // ==========================================
  // MAP MODAL
  // ==========================================
  let mapData: MapData | null = null;
  let showMapModal = false;
  let currentMapScene = '';
  let currentSceneData: SceneData | null = null;
  let currentGroupName = '';
  let matchedScenes: string[] = [];
  let filteredCheckNames: Set<string> = new Set();
  let showAgeFilter = true;
  let ageFilter: 'child' | 'adult' = 'child';
  let scrollPosition = 0;

  // Rebuild map data when MQ settings change
  $: if ($sMqSettings) {
    buildMapData($sMqSettings).then(data => {
      mapData = data;
    });
  }

  // Some check names differ between CSV (map) and JSON (checklist)
  const checkNameMapping: Record<string, string> = {
    'Secret Shrine Dinolfos Chest': 'MM Secret Shrine Dinalfos Chest',
  };
  const checkNameMappingReverse = Object.fromEntries(Object.entries(checkNameMapping).map(([k, v]) => [v, k]));

  // Manual overrides for groups whose name doesn't auto-normalize to a scene key
  const groupToSceneMapping: Record<string, string[]> = {
    "Hyrule/Ganon's Castle Exterior": ['OOT_HYRULE_GANON_CASTLE'],
    "Jabu Jabu's Belly": ['OOT_INSIDE_JABU_JABU'],
    'Forest Temple': ['OOT_TEMPLE_FOREST'],
    'Fire Temple': ['OOT_TEMPLE_FIRE'],
    'Water Temple': ['OOT_TEMPLE_WATER'],
    'Shadow Temple': ['OOT_TEMPLE_SHADOW'],
    'Spirit Temple': ['OOT_TEMPLE_SPIRIT'],
    "Ganon's Castle": ['OOT_INSIDE_GANON_CASTLE'],
    'South Clock Town': ['MM_CLOCK_TOWN_SOUTH'],
    'North Clock Town': ['MM_CLOCK_TOWN_NORTH'],
    'East Clock Town': ['MM_CLOCK_TOWN_EAST'],
    'West Clock Town': ['MM_CLOCK_TOWN_WEST'],
    'Road To Southern Swamp': ['MM_ROAD_SOUTHERN_SWAMP'],
    'Swamp Spider House': ['MM_SPIDER_HOUSE_SWAMP'],
    'Path To Mountain Village': ['MM_PATH_MOUNTAIN_VILLAGE'],
    'Mountain Village': ['MM_MOUNTAIN_VILLAGE_SPRING'],
    'Path To Snowhead': ['MM_PATH_SNOWHEAD'],
    'Pirates Fortress': ['MM_PIRATE_FORTRESS'],
    'Ocean Spider House': ['MM_SPIDER_HOUSE_OCEAN'],
    'Road To Ikana': ['MM_ROAD_IKANA'],
    'Ikana Castle': ['MM_CASTLE_IKANA'],
    'Woodfall Temple': ['MM_TEMPLE_WOODFALL'],
    'Snowhead Temple': ['MM_TEMPLE_SNOWHEAD'],
    'Great Bay Temple': ['MM_TEMPLE_GREAT_BAY'],
    'Stone Tower Temple': ['MM_TEMPLE_STONE_TOWER', 'MM_TEMPLE_STONE_TOWER_INVERTED'],
    'The Moon': ['MM_MOON'],
  };

  $: groupPings = (() => {
    const map = new Map<string, string>();
    for (const [, ping] of ($sPings as Map<string, any>).entries()) {
      if (ping?.groupName) map.set(ping.groupName, ping.color ?? '#ff6b6b');
    }
    return map;
  })();

  // Lock body scroll while map modal is open
  $: if (showMapModal) {
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = '100%';
    document.body.style.left = '0';
    document.body.style.right = '0';
  } else {
    const saved = scrollPosition;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.left = '';
    document.body.style.right = '';
    if (saved > 0) requestAnimationFrame(() => window.scrollTo(0, saved));
    scrollPosition = 0;
  }

  function openMap(groupName: string) {
    scrollPosition = window.scrollY;
    currentGroupName = groupName;

    const group = sortedChecks?.find(g => g.groupName === groupName);
    filteredCheckNames = group
      ? new Set(
          group.checks.flatMap(c => {
            const mapped = checkNameMapping[c.name];
            return mapped ? [c.name, mapped] : [c.name];
          }),
        )
      : new Set();

    let foundScenes: string[] = [];

    // 1. Manual override
    if (groupToSceneMapping[groupName]) foundScenes = groupToSceneMapping[groupName].filter(s => mapData && mapData[s]);

    // 2. String normalization fallback
    if (foundScenes.length === 0) {
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .replace(/['']s\b/g, '')
          .replace(/[']/g, '')
          .replace(/_/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const parts = groupName.includes('/') ? groupName.split('/').map(p => p.trim()) : [groupName];
      for (const part of parts) {
        const np = normalize(part);
        const scene = Object.keys(mapData || {}).find(s => {
          const ns = normalize(s);
          return ns === np || ns.replace(/^(oot|mm) /, '') === np;
        });
        if (scene) foundScenes.push(scene);
      }
    }

    if (foundScenes.length > 0 && mapData) {
      matchedScenes = foundScenes;
      currentMapScene = foundScenes[0];
      currentSceneData = mapData[foundScenes[0]];
      showMapModal = true;
    } else {
      alert('Map not found for this area');
    }
  }

  function handleMapToggle(event: CustomEvent) {
    const fromMap = event.detail.checkName;
    const actual = checkNameMappingReverse[fromMap] ?? fromMap.replace(/^(OOT|MM) /, '');
    const newState = toggleState(yChecks.get(actual) ?? T.CheckState.unchecked);
    yChecks.set(actual, newState);
    setAuthor(actual, newState);
  }

  // ==========================================
  // DUNGEON LISTS
  // Used by checkPredicate to distinguish dungeon vs overworld checks
  // ==========================================
  const ootDungeons = [
    'DEKU_TREE',
    'LAIR_GOHMA',
    'DODONGO_CAVERN',
    'LAIR_KING_DODONGO',
    'INSIDE_JABU_JABU',
    'LAIR_BARINADE',
    'TEMPLE_FOREST',
    'LAIR_PHANTOM_GANON',
    'TEMPLE_FIRE',
    'LAIR_VOLVAGIA',
    'TEMPLE_WATER',
    'LAIR_MORPHA',
    'TEMPLE_SHADOW',
    'LAIR_BONGO_BONGO',
    'TEMPLE_SPIRIT',
    'LAIR_TWINROVA',
    'BOTTOM_OF_THE_WELL',
    'ICE_CAVERN',
    'GANON_TOWER',
    'INSIDE_GANON_CASTLE',
  ];

  const mmDungeons = [
    'TEMPLE_WOODFALL',
    'LAIR_ODOLWA',
    'TEMPLE_SNOWHEAD',
    'LAIR_GOHT',
    'TEMPLE_GREAT_BAY',
    'LAIR_GYORG',
    'TEMPLE_STONE_TOWER',
    'LAIR_TWINMOLD',
    'TEMPLE_STONE_TOWER_INVERTED',
    'BENEATH_THE_WELL',
    'CASTLE_IKANA',
    'LAIR_IKANA',
    'SPIDER_HOUSE_SWAMP',
    'SPIDER_HOUSE_OCEAN',
    'PIRATE_FORTRESS_INTERIOR',
    'PIRATE_FORTRESS_ENTRANCE',
    'PIRATE_FORTRESS_EXTERIOR',
    'LAIR_MAJORA',
  ];

  const allDungeons = [...ootDungeons, ...mmDungeons];

  // ==========================================
  // STRUCTURED CHECKS
  // ==========================================
  let structuredChecks: T.CheckGroup[] | null = null;
  initializeStructuredChecks().then((data: T.CheckGroup[]) => {
    structuredChecks = data;
  });

  const toggleState = (x: T.CheckState) => (x !== T.CheckState.checked ? T.CheckState.checked : T.CheckState.unchecked);

  let filter = '';
  let hideChecked = false;

  // ==========================================
  // CHECK FILTERING PREDICATE
  // Returns true if a check should be visible given current settings.
  // Each shuffle setting independently controls a subset of checks.
  // ==========================================
  $: checkPredicate = (group: T.CheckGroup, check: T.Check) => {
    const isDungeon = check.scene ? allDungeons.includes(check.scene) : false;

    // Helper: matches dungeon/overworld/all mode
    const matchMode = (inDungeon: boolean, mode: string) => {
      if (mode === 'none') return false;
      if (mode === 'dungeons') return inDungeon;
      if (mode === 'overworld') return !inDungeon;
      return true;
    };

    // --- Game filter ---
    let matchesOverworld = true;
    if (!isDungeon) {
      const m = ($sSettings.get('OOTMM') ?? 'both') as string;
      if (m === 'oot') matchesOverworld = check.game === T.Game.oot;
      else if (m === 'mm') matchesOverworld = check.game === T.Game.mm;
      else if (m === 'none') matchesOverworld = false;
    }
    let matchesDungeons = true;
    if (isDungeon) {
      const m = ($sSettings.get('OOTMMDungeons') ?? 'both') as string;
      if (m === 'ootdungeons') matchesDungeons = check.game === T.Game.oot;
      else if (m === 'mmdungeons') matchesDungeons = check.game === T.Game.mm;
      else if (m === 'none') matchesDungeons = false;
    }

    // --- Gold Skulltulas ---
    const gsMode = $sSettings.get('goldSkulltulaShuffleOOT') ?? 'all';
    let matchesGS = true;
    if (check.type === T.CheckType.gs && check.game === T.Game.oot) {
      const ind = check.scene ? ootDungeons.includes(check.scene) : false;
      const showGS = ($sSettings.get('showUnshuffledGS') ?? false) as boolean;
      if (gsMode === 'no_shuffle') matchesGS = showGS;
      else if (gsMode === 'dungeons') matchesGS = ind || (showGS && !ind);
      else if (gsMode === 'overworld') matchesGS = !ind || (showGS && ind);
    }

    // --- Tingle Maps ---
    const tingleMode = $sSettings.get('TingleMapShuffleMM') ?? 'vanilla';
    let matchesTingle = true;
    if (check.item?.startsWith('WORLD_MAP_')) matchesTingle = tingleMode !== 'vanilla';

    // --- Silver Rupees ---
    let matchesSR = true;
    if (check.item?.startsWith('RUPEE_SILVER_'))
      matchesSR = ($sSettings.get('SilverRupeeShuffleOOT') ?? 'vanilla') !== 'vanilla';

    // --- Treasure Chest Game ---
    let matchesTC = true;
    if (check.name?.startsWith('Treasure Chest Game Room '))
      matchesTC = ($sSettings.get('TreasureChestShuffleOOT') ?? 'vanilla') === 'anywhere';

    // --- Stray Fairies ---
    let matchesTownSF = true;
    if (check.item?.startsWith('STRAY_FAIRY_TOWN'))
      matchesTownSF =
        ($sSettings.get('TownSFShuffleMM') ?? 'vanilla') !== 'vanilla' || ($sSettings.get('showUnshuffledTownSF') ?? false);

    let matchesDungeonSF = true;
    if (check.type === T.CheckType.chest && check.item?.startsWith('STRAY_FAIRY_'))
      matchesDungeonSF =
        ($sSettings.get('DungeonChestSFShuffleMM') ?? 'own_dungeon') !== 'vanilla' ||
        ($sSettings.get('showUnshuffledDungeonSF') ?? false);

    let matchesFreeSF = true;
    if (check.type === T.CheckType.sf)
      matchesFreeSF =
        ($sSettings.get('DungeonFreeSFShuffleMM') ?? 'vanilla') !== 'vanilla' || ($sSettings.get('showUnshuffledFreeSF') ?? false);

    // --- Ganon Boss Key ---
    let matchesGanonBK = true;
    if (check.item?.startsWith('BOSS_KEY_GANON'))
      matchesGanonBK = ($sSettings.get('GanonBKShuffleOOT') ?? 'removed') !== 'vanilla';

    // --- Scrubs ---
    let matchesScrubsOOT = true;
    if (check.type === T.CheckType.scrub && !check.tags.includes(T.Tag.special_scrub))
      matchesScrubsOOT = $sSettings.get('ScrubsOOT') ?? false;

    let matchesScrubsMM = true;
    if (check.game === T.Game.mm && check.id?.startsWith('SCRUB_')) {
      const special = ['SCRUB_TELESCOPE', 'SCRUB_BOMB_BAG'];
      matchesScrubsMM = special.includes(check.id) ? true : ($sSettings.get('ScrubsMM') ?? false);
    }

    // --- Cows ---
    let matchesCowOOT = true;
    if (check.type === T.CheckType.cow && check.game === T.Game.oot)
      matchesCowOOT = $sSettings.get('CowShuffleOOT') ?? false;

    let matchesCowMM = true;
    if (check.type === T.CheckType.cow && check.game === T.Game.mm)
      matchesCowMM = $sSettings.get('CowShuffleMM') ?? false;

    // --- Shops ---
    let matchesShopOOT = true;
    if (check.type === T.CheckType.shop && check.game === T.Game.oot)
      matchesShopOOT = ($sSettings.get('ShopShuffleOOT') ?? 'none') !== 'none';

    let matchesShopMM = true;
    if (check.type === T.CheckType.shop && check.game === T.Game.mm)
      matchesShopMM = ($sSettings.get('ShopShuffleMM') ?? 'none') !== 'none';

    // --- Owl Statues ---
    let matchesOwl = true;
    if (check.id?.startsWith('OWL_') && check.game === T.Game.mm)
      matchesOwl = ($sSettings.get('OwlStatueShuffleMM') ?? 'none') !== 'none';

    // --- Pots, Crates, Barrels ---
    let matchesPotOOT = true;
    if (check.type === T.CheckType.pot && check.game === T.Game.oot)
      matchesPotOOT = matchMode(ootDungeons.includes(check.scene ?? ''), $sSettings.get('PotShuffleOOT') ?? 'none');

    let matchesPotMM = true;
    if (check.type === T.CheckType.pot && check.game === T.Game.mm)
      matchesPotMM = matchMode(mmDungeons.includes(check.scene ?? ''), $sSettings.get('PotShuffleMM') ?? 'none');

    let matchesCrateOOT = true;
    if (check.type === T.CheckType.crate && check.game === T.Game.oot)
      matchesCrateOOT = matchMode(ootDungeons.includes(check.scene ?? ''), $sSettings.get('CrateShuffleOOT') ?? 'none');

    let matchesCrateMM = true;
    if (check.type === T.CheckType.crate && check.game === T.Game.mm)
      matchesCrateMM = matchMode(mmDungeons.includes(check.scene ?? ''), $sSettings.get('CrateShuffleMM') ?? 'none');

    let matchesBarrelMM = true;
    if (check.type === T.CheckType.barrel && check.game === T.Game.mm)
      matchesBarrelMM = matchMode(mmDungeons.includes(check.scene ?? ''), $sSettings.get('BarrelsShuffleMM') ?? 'none');

    // --- Hives ---
    let matchesHiveOOT = true;
    if (check.type === T.CheckType.hive && check.game === T.Game.oot)
      matchesHiveOOT = $sSettings.get('HivesShuffleOOT') ?? false;

    let matchesHiveMM = true;
    if (check.type === T.CheckType.hive && check.game === T.Game.mm)
      matchesHiveMM = $sSettings.get('HivesShuffleMM') ?? false;

    // --- Grass ---
    let matchesGrassOOT = true;
    if (check.type === T.CheckType.grass && check.game === T.Game.oot)
      matchesGrassOOT = matchMode(ootDungeons.includes(check.scene ?? ''), $sSettings.get('GrassShuffleOOT') ?? 'none');

    const grassModeMM = $sSettings.get('GrassShuffleMM') ?? 'none';
    let matchesGrassMM = true;
    if (
      check.type === T.CheckType.grass &&
      check.game === T.Game.mm &&
      !check.name.includes('Termina Field Grass Pack')
    )
      matchesGrassMM = matchMode(mmDungeons.includes(check.scene ?? ''), grassModeMM);

    let matchesTerminaGrass = true;
    if (
      check.type === T.CheckType.grass &&
      check.game === T.Game.mm &&
      check.name.includes('Termina Field Grass Pack')
    ) {
      if (grassModeMM === 'none' || grassModeMM === 'dungeons') matchesTerminaGrass = false;
      else matchesTerminaGrass = $sSettings.get('TerminaGrassShuffleMM') ?? false;
    }

    // --- Rocks ---
    let matchesRockOOT = true;
    if (check.type === T.CheckType.rock && check.game === T.Game.oot)
      matchesRockOOT = $sSettings.get('RockShuffleOOT') ?? false;

    let matchesRockMM = true;
    if (check.type === T.CheckType.rock && check.game === T.Game.mm)
      matchesRockMM = matchMode(mmDungeons.includes(check.scene ?? ''), $sSettings.get('RockShuffleMM') ?? 'none');

    // --- Trees ---
    let matchesTreeOOT = true;
    if (check.type === T.CheckType.tree && check.game === T.Game.oot)
      matchesTreeOOT = $sSettings.get('TreeShuffleOOT') ?? false;

    let matchesTreeMM = true;
    if (check.type === T.CheckType.tree && check.game === T.Game.mm)
      matchesTreeMM = matchMode(mmDungeons.includes(check.scene ?? ''), $sSettings.get('TreeShuffleMM') ?? 'none');

    // --- Bushes ---
    let matchesBushOOT = true;
    if (check.type === T.CheckType.bush && check.game === T.Game.oot)
      matchesBushOOT = $sSettings.get('BushShuffleOOT') ?? false;

    let matchesBushMM = true;
    if (check.type === T.CheckType.bush && check.game === T.Game.mm)
      matchesBushMM = matchMode(mmDungeons.includes(check.scene ?? ''), $sSettings.get('BushShuffleMM') ?? 'none');

    // --- Soil ---
    let matchesSoilOOT = true;
    if (check.type === T.CheckType.soil && check.game === T.Game.oot)
      matchesSoilOOT = $sSettings.get('SoilShuffleOOT') ?? false;

    let matchesSoilMM = true;
    if (check.type === T.CheckType.soil && check.game === T.Game.mm)
      matchesSoilMM = matchMode(mmDungeons.includes(check.scene ?? ''), $sSettings.get('SoilShuffleMM') ?? 'none');

    // --- Rupees, Hearts, Wonder Items ---
    let matchesRupeeOOT = true;
    if (check.type === T.CheckType.rupee && check.game === T.Game.oot)
      matchesRupeeOOT = matchMode(ootDungeons.includes(check.scene ?? ''), $sSettings.get('RupeeShuffleOOT') ?? 'none');

    let matchesRupeeMM = true;
    if (check.type === T.CheckType.rupee && check.game === T.Game.mm)
      matchesRupeeMM = matchMode(mmDungeons.includes(check.scene ?? ''), $sSettings.get('RupeeShuffleMM') ?? 'none');

    let matchesHeartOOT = true;
    if (check.type === T.CheckType.heart && check.game === T.Game.oot)
      matchesHeartOOT = matchMode(
        ootDungeons.includes(check.scene ?? ''),
        $sSettings.get('HeartsShuffleOOT') ?? 'none',
      );

    let matchesHeartMM = true;
    if (check.type === T.CheckType.heart && check.game === T.Game.mm)
      matchesHeartMM = $sSettings.get('HeartsShuffleMM') ?? false;

    let matchesWonderOOT = true;
    if (check.type === T.CheckType.wonder && check.game === T.Game.oot)
      matchesWonderOOT = matchMode(
        ootDungeons.includes(check.scene ?? ''),
        $sSettings.get('WonderShuffleOOT') ?? 'none',
      );

    let matchesWonderMM = true;
    if (check.type === T.CheckType.wonder && check.game === T.Game.mm)
      matchesWonderMM = $sSettings.get('WonderShuffleMM') ?? false;

    // --- Snowballs ---
    let matchesSnowball = true;
    if (check.type === T.CheckType.snowball && check.game === T.Game.mm)
      matchesSnowball = matchMode(
        mmDungeons.includes(check.scene ?? ''),
        $sSettings.get('SnowballShuffleMM') ?? 'none',
      );

    // --- Butterflies ---
    let matchesButterflyOOT = true;
    if (check.type === T.CheckType.butterfly && check.game === T.Game.oot)
      matchesButterflyOOT = $sSettings.get('ButterflyShuffleOOT') ?? false;

    let matchesButterflyMM = true;
    if (check.type === T.CheckType.butterfly && check.game === T.Game.mm)
      matchesButterflyMM = $sSettings.get('ButterflyShuffleMM') ?? false;

    // --- Red Boulders ---
    let matchesRedBoulderOOT = true;
    if (check.type === T.CheckType.redboulder && check.game === T.Game.oot)
      matchesRedBoulderOOT = $sSettings.get('RedBoulderShuffleOOT') ?? false;

    let matchesRedBoulderMM = true;
    if (check.type === T.CheckType.redboulder && check.game === T.Game.mm)
      matchesRedBoulderMM = $sSettings.get('RedBoulderShuffleMM') ?? false;

    // --- Broken Actors (OoT) ---
    const brokenList = [
      'Hyrule Castle Pot 1',
      'Hyrule Castle Pot 2',
      'Lake Hylia Pot 1',
      'Lake Hylia Pot 2',
      'Lake Hylia Grass Child 5',
      'Dodongo Cavern Grass East Corridor Side Room',
      'MQ Dodongo Cavern Grass Vanilla Bomb Bag Room',
      'MQ Dodongo Cavern Grass Room Before Miniboss',
    ];
    let matchesBroken = true;
    if (check.game === T.Game.oot && brokenList.includes(check.name))
      matchesBroken = $sSettings.get('BrokenActorsOOT') ?? false;

    // --- Named check lists (Frogs, Lottery, Mask Trade, Merchants, etc.) ---
    const frogList = [
      'Zora River Frogs Zeldas Lullaby',
      'Zora River Frogs Eponas Song',
      'Zora River Frogs Sarias Song',
      'Zora River Frogs Suns Song',
      'Zora River Frogs Song of Time',
    ];
    let matchesFrogs = true;
    if (check.game === T.Game.oot && frogList.includes(check.name))
      matchesFrogs = $sSettings.get('FrogRupeesShuffleOOT') ?? false;

    const lotteryList = ['Lottery Prize Night 1', 'Lottery Prize Night 2', 'Lottery Prize Night 3'];
    let matchesLottery = true;
    if (check.game === T.Game.mm && lotteryList.includes(check.name))
      matchesLottery = $sSettings.get('LotteryShuffleMM') ?? false;

    let matchesIcicleOOT = true;
    if (check.type === T.CheckType.icicle && check.game === T.Game.oot)
      matchesIcicleOOT = $sSettings.get('IciclesShuffleOOT') ?? false;

    let matchesIcicleMM = true;
    if (check.type === T.CheckType.icicle && check.game === T.Game.mm)
      matchesIcicleMM = $sSettings.get('IciclesShuffleMM') ?? false;

    let matchesRedIce = true;
    if (check.type === T.CheckType.redice && check.game === T.Game.oot)
      matchesRedIce = $sSettings.get('RedIceShuffleOOT') ?? false;

    const maskTradeList = [
      'Lost Woods Sell Skull Mask',
      'Kakariko Sell Keaton Mask',
      'Graveyard Sell Spooky Mask',
      'Hyrule Field Sell Bunny Mask',
    ];
    let matchesMaskTrade = true;
    if (check.game === T.Game.oot && maskTradeList.includes(check.name))
      matchesMaskTrade = $sSettings.get('MaskTradeShuffleOOT') ?? false;

    const merchantOOTList = [
      'Haunted Wasteland Carpet Merchant',
      'Lon Lon Ranch Talon Buy Milk',
      'Kakariko Potion Shop Buy Blue Potion',
    ];
    let matchesMerchantOOT = true;
    if (check.game === T.Game.oot && merchantOOTList.includes(check.name))
      matchesMerchantOOT = $sSettings.get('MerchantShuffleOOT') ?? false;

    const merchantMMList = ['Milk Bar Purchase Milk', 'Milk Bar Purchase Chateau', 'Gorman Track Milk Purchase'];
    let matchesMerchantMM = true;
    if (check.game === T.Game.mm && merchantMMList.includes(check.name))
      matchesMerchantMM = $sSettings.get('MerchantShuffleMM') ?? false;

    let matchesFishPond = true;
    if (check.type === T.CheckType.fish && check.game === T.Game.oot)
      matchesFishPond = $sSettings.get('FishPondShuffleOOT') ?? false;

    const diveList = [
      'Zora Domain Diving Game Green Rupee',
      'Zora Domain Diving Game Blue Rupee',
      'Zora Domain Diving Game Red Rupee',
      'Zora Domain Diving Game Purple Rupee',
      'Zora Domain Diving Game Huge Rupee',
    ];
    let matchesDive = true;
    if (check.game === T.Game.oot && diveList.includes(check.name))
      matchesDive = $sSettings.get('DiveGameShuffleOOT') ?? false;

    let matchesFairyFountainOOT = true;
    if (check.game === T.Game.oot && check.type === T.CheckType.fairy)
      matchesFairyFountainOOT = $sSettings.get('FairyFountainShuffleOOT') ?? false;

    let matchesFairyFountainMM = true;
    if (check.game === T.Game.mm && check.type === T.CheckType.fairy)
      matchesFairyFountainMM = $sSettings.get('FairyFountainShuffleMM') ?? false;

    let matchesFairySpot = true;
    if (check.type === T.CheckType.fairy_spot && check.game === T.Game.oot)
      matchesFairySpot = $sSettings.get('FairySpotShuffleOOT') ?? false;

    let matchesEgg = true;
    if (check.game === T.Game.oot && ['Hatch Chicken', 'Hatch Pocket Cucco'].includes(check.name))
      matchesEgg = $sSettings.get('WeirdPocketEggShuffle') ?? false;

    let matchesSkipZelda = true;
    if (check.game === T.Game.oot && ["Zelda's Letter", "Zelda's Song"].includes(check.name))
      matchesSkipZelda = !($sSettings.get('SkipChildZeldaOOT') ?? false);

    // --- Text filter & MQ/Variant/HideChecked ---
    const lf = filter.toLowerCase();
    const matchesFilter =
      filter.length === 0 ||
      check.name.toLowerCase().includes(lf) ||
      check.shortName.toLowerCase().includes(lf) ||
      group.groupName.toLowerCase().includes(lf);

    const matchesMq = check.canBeMq ? ($sMqSettings.get(group.groupName) ?? false) === check.isMq : true;
    const matchesVariant = check.canHaveVariant
      ? ($sVariantSettings.get(group.groupName) ?? 0) === check.variantNumber
      : true;
    const matchesHide = hideChecked ? $sChecks.get(check.name) !== T.CheckState.checked : true;

    return (
      matchesOverworld &&
      matchesDungeons &&
      matchesGS &&
      matchesTingle &&
      matchesSR &&
      matchesTC &&
      matchesTownSF &&
      matchesDungeonSF &&
      matchesFreeSF &&
      matchesGanonBK &&
      matchesScrubsOOT &&
      matchesScrubsMM &&
      matchesCowOOT &&
      matchesCowMM &&
      matchesShopOOT &&
      matchesShopMM &&
      matchesOwl &&
      matchesPotOOT &&
      matchesPotMM &&
      matchesCrateOOT &&
      matchesCrateMM &&
      matchesBarrelMM &&
      matchesHiveOOT &&
      matchesHiveMM &&
      matchesGrassOOT &&
      matchesGrassMM &&
      matchesTerminaGrass &&
      matchesRockOOT &&
      matchesRockMM &&
      matchesTreeOOT &&
      matchesTreeMM &&
      matchesBushOOT &&
      matchesBushMM &&
      matchesSoilOOT &&
      matchesSoilMM &&
      matchesRupeeOOT &&
      matchesRupeeMM &&
      matchesBroken &&
      matchesHeartOOT &&
      matchesHeartMM &&
      matchesWonderOOT &&
      matchesWonderMM &&
      matchesSnowball &&
      matchesButterflyOOT &&
      matchesButterflyMM &&
      matchesRedBoulderOOT &&
      matchesRedBoulderMM &&
      matchesFrogs &&
      matchesLottery &&
      matchesIcicleOOT &&
      matchesIcicleMM &&
      matchesRedIce &&
      matchesMaskTrade &&
      matchesMerchantOOT &&
      matchesMerchantMM &&
      matchesFishPond &&
      matchesDive &&
      matchesFairyFountainOOT &&
      matchesFairyFountainMM &&
      matchesFairySpot &&
      matchesEgg &&
      matchesSkipZelda &&
      matchesFilter &&
      matchesMq &&
      matchesVariant &&
      matchesHide
    );
  };

  // ==========================================
  // FILTERED & SORTED CHECKS
  // ==========================================
  $: filteredChecks = structuredChecks?.flatMap(group => {
    const filtered = group.checks.filter(checkPredicate.bind(null, group));
    return filtered.length === 0 ? [] : [{ ...group, checks: filtered }];
  });

  $: groupCompletionStatus =
    filteredChecks?.reduce(
      (acc, group) => {
        acc[group.groupName] = group.checks.every(c => $sChecks.get(c.name) === T.CheckState.checked);
        return acc;
      },
      {} as Record<string, boolean>,
    ) ?? {};

  $: groupCheckCounts =
    filteredChecks?.reduce(
      (acc, group) => {
        acc[group.groupName] = {
          checked: group.checks.filter(c => $sChecks.get(c.name) === T.CheckState.checked).length,
          total: group.checks.length,
        };
        return acc;
      },
      {} as Record<string, { checked: number; total: number }>,
    ) ?? {};

  $: totalCheckCount = filteredChecks?.reduce(
    (acc, group) => {
      acc.checked += group.checks.filter(c => $sChecks.get(c.name) === T.CheckState.checked).length;
      acc.total += group.checks.length;
      return acc;
    },
    { checked: 0, total: 0 },
  ) ?? { checked: 0, total: 0 };

  $: ootCheckCount = filteredChecks?.reduce(
    (acc, group) => {
      const oot = group.checks.filter(c => c.game === T.Game.oot);
      acc.checked += oot.filter(c => $sChecks.get(c.name) === T.CheckState.checked).length;
      acc.total += oot.length;
      return acc;
    },
    { checked: 0, total: 0 },
  ) ?? { checked: 0, total: 0 };

  $: mmCheckCount = filteredChecks?.reduce(
    (acc, group) => {
      const mm = group.checks.filter(c => c.game === T.Game.mm);
      acc.checked += mm.filter(c => $sChecks.get(c.name) === T.CheckState.checked).length;
      acc.total += mm.length;
      return acc;
    },
    { checked: 0, total: 0 },
  ) ?? { checked: 0, total: 0 };

  let sortMode: 'default' | 'alpha' = 'default';
  $: sortedChecks = filteredChecks
    ? [...filteredChecks].sort((a, b) => (sortMode === 'alpha' ? a.groupName.localeCompare(b.groupName) : 0))
    : filteredChecks;

  $: visibleGroupCount = sortedChecks?.length ?? 0;
  $: visibleCheckCount = sortedChecks?.reduce((a, g) => a + g.checks.length, 0) ?? 0;

  let spoilerHighlight = '';
  async function jumpToCheck(loc: string) {
    spoilerHighlight = loc;
    const group = structuredChecks?.find(g => g.checks.some(c => c.name === loc));
    if (group) {
      groupStates.set(group.groupName, true);
      allGroupStatesMemory.set(group.groupName, true);
      groupStates = new Map(groupStates);
      forceOpenTimestamp = Date.now();
    }
    await new Promise(r => setTimeout(r, 80));
    const el = document.querySelector(`[data-check="${CSS.escape(loc)}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { spoilerHighlight = ''; }, 6000);
  }

  $: wothGroups = new Set(
    hints.filter(h => h.type === 'woth').flatMap(h => {
      const text = h.text.toLowerCase();
      return (sortedChecks ?? [])
        .filter(g => { const gn = g.groupName.toLowerCase(); return text.includes(gn) || gn.includes(text); })
        .map(g => g.groupName);
    })
  );
  $: barrenGroups = new Set(
    hints.filter(h => h.type === 'barren').flatMap(h => {
      const text = h.text.toLowerCase();
      return (sortedChecks ?? [])
        .filter(g => { const gn = g.groupName.toLowerCase(); return text.includes(gn) || gn.includes(text); })
        .map(g => g.groupName);
    }).filter(gn => !wothGroups.has(gn))
  );

  $: wothCheckNames = new Set(
    [...wothGroups].flatMap(gn => structuredChecks?.find(g => g.groupName === gn)?.checks.map(c => c.name) ?? [])
  );
  $: barrenCheckNames = new Set(
    [...barrenGroups].flatMap(gn => structuredChecks?.find(g => g.groupName === gn)?.checks.map(c => c.name) ?? [])
  );

  // Auto-mark unchecked checks in newly barren zones
  let _processedBarren = new Set<string>();
  $: {
    for (const gn of barrenGroups) {
      if (!_processedBarren.has(gn) && structuredChecks) {
        _processedBarren.add(gn);
        const group = structuredChecks.find(g => g.groupName === gn);
        if (group) {
          for (const check of group.checks) {
            if ((yChecks.get(check.name) ?? T.CheckState.unchecked) === T.CheckState.unchecked) {
              yChecks.set(check.name, T.CheckState.checked);
              setAuthor(check.name, T.CheckState.checked);
            }
          }
        }
      }
    }
    for (const gn of _processedBarren) {
      if (!barrenGroups.has(gn)) _processedBarren.delete(gn);
    }
  }

  // ==========================================
  // GROUP OPEN/CLOSE STATE (persisted in localStorage)
  // ==========================================
  let allGroupStatesMemory = new Map<string, boolean>(JSON.parse(localStorage.getItem('groupStates') || '[]'));
  let allGroupsExpanded = true;
  let groupStates = new Map<string, boolean>();
  let forceOpenTimestamp = Date.now();

  $: if (filteredChecks) {
    groupStates = new Map(
      filteredChecks.map(group => [
        group.groupName,
        allGroupStatesMemory.has(group.groupName) ? allGroupStatesMemory.get(group.groupName)! : allGroupsExpanded,
      ]),
    );
  }

  $: shouldShowCollapse = groupStates.size > 0 ? Array.from(groupStates.values()).some(s => s) : allGroupsExpanded;

  function toggleAllGroups() {
    allGroupsExpanded = !shouldShowCollapse;
    forceOpenTimestamp = Date.now();
    filteredChecks?.forEach(group => {
      groupStates.set(group.groupName, allGroupsExpanded);
      allGroupStatesMemory.set(group.groupName, allGroupsExpanded);
    });
    groupStates = new Map(groupStates);
    localStorage.setItem('groupStates', JSON.stringify([...allGroupStatesMemory]));
  }

  function handleIndividualToggle(event: CustomEvent) {
    const { groupName, isOpen } = event.detail;
    groupStates.set(groupName, isOpen);
    allGroupStatesMemory.set(groupName, isOpen);
    groupStates = new Map(groupStates);
    localStorage.setItem('groupStates', JSON.stringify([...allGroupStatesMemory]));
  }

  // ==========================================
  // CHECK RANGE SELECTION & GROUP ACTIONS
  // ==========================================
  interface CheckAction {
    group: T.CheckGroup;
    checkIndex: number;
    newState: T.CheckState;
  }
  let lastAction: CheckAction | null = null;
  let lastMarkAction: CheckAction | null = null;

  function toggleRangeTo(group: T.CheckGroup, checkIndex: number) {
    if (!lastAction || lastAction.group.groupName !== group.groupName) return;
    for (let i = lastAction.checkIndex + 1; i <= checkIndex; i++) {
      yChecks.set(group.checks[i].name, lastAction.newState);
      setAuthor(group.checks[i].name, lastAction.newState);
    }
  }

  function markRangeTo(group: T.CheckGroup, checkIndex: number) {
    if (!lastMarkAction || lastMarkAction.group.groupName !== group.groupName) return;
    for (let i = lastMarkAction.checkIndex + 1; i <= checkIndex; i++) {
      yChecks.set(group.checks[i].name, lastMarkAction.newState);
      setAuthor(group.checks[i].name, lastMarkAction.newState);
    }
  }

  function toggleWholeGroup(group: T.CheckGroup) {
    if (isWatchMode) return;
    const allChecked = group.checks.every(({ name }) => yChecks.get(name) === T.CheckState.checked);
    const val = allChecked ? T.CheckState.unchecked : T.CheckState.checked;
    group.checks.forEach(({ name }) => { yChecks.set(name, val); setAuthor(name, val); });
  }

  function markWholeGroup(group: T.CheckGroup) {
    if (isWatchMode) return;
    const allMarked = group.checks.every(({ name }) => yChecks.get(name) === T.CheckState.marked);
    const val = allMarked ? T.CheckState.unchecked : T.CheckState.marked;
    group.checks.forEach(({ name }) => { yChecks.set(name, val); setAuthor(name, val); });
  }

  // ==========================================
  // RESET / EXPORT / IMPORT
  // ==========================================
  function reset() {
    if (!window.confirm('Are you sure you want to clear all checks?')) return;
    [...yCheckAuthors.keys()].forEach(k => yCheckAuthors.delete(k));
    [...yChecks.keys()].forEach(k => yChecks.delete(k));
    [...yShopItems.keys()].forEach(k => yShopItems.delete(k));
    [...yShopPrices.keys()].forEach(k => yShopPrices.delete(k));
    [...yEntrances.keys()].forEach(k => yEntrances.delete(k));
    [...yItems.keys()].forEach(k => yItems.delete(k));
    [...yNotes.keys()].forEach(k => yNotes.delete(k));
    yHints.delete(0, yHints.length);
    spoilerLocations = {};
    localStorage.removeItem('spoilerLocations');
    spoilerErSettings = null;
    localStorage.removeItem('spoilerErSettings');
    spoilerSeedInfo = null;
    localStorage.removeItem('spoilerSeedInfo');
  }

  function resetSettings() {
    if (!window.confirm('Are you sure you want to reset all settings to default?')) return;
    [...ySettings.keys()].forEach(k => ySettings.delete(k));
    ySettings.set('OOTMM', 'both');
    [...yMqSettings.keys()].forEach(k => yMqSettings.set(k, false));
    [...yVariantSettings.keys()].forEach(k => yVariantSettings.set(k, 0));
    Object.entries(_displayDefaults).forEach(([k, v]) => ySettings.set(k, v));
  }

  function exportData() {
    const data = {
      checks: Object.fromEntries(yChecks.entries()),
      settings: Object.fromEntries(ySettings.entries()),
      mqSettings: Object.fromEntries([...yMqSettings.entries()].filter(([, v]) => v)),
      variantSettings: Object.fromEntries([...yVariantSettings.entries()].filter(([, v]) => v !== 0)),
      items: Object.fromEntries(yItems.entries()),
      shopItems: Object.fromEntries(yShopItems.entries()),
      shopPrices: Object.fromEntries(yShopPrices.entries()),
      entrances: Object.fromEntries(yEntrances.entries()),
      notes: Object.fromEntries(yNotes.entries()),
      hints: yHints.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    a.download = `ootmm-checklist-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  let randoImportOpen = false;
  let randoImportStr = '';
  let randoImportError = '';
  let randoImportOk = false;

  async function applyRandomizerSettings() {
    randoImportError = '';
    randoImportOk = false;
    try {
      const { appSettings, unmapped } = await importRandomizerSettings(randoImportStr);
      Object.entries(appSettings).forEach(([k, v]) => ySettings.set(k, v));
      randoImportOk = true;
      randoImportStr = '';
      if (unmapped.length) console.info('Unmapped settings:', unmapped);
      setTimeout(() => { randoImportOpen = false; randoImportOk = false; }, 1200);
    } catch (e: any) {
      randoImportError = e?.message ?? 'Unknown error';
    }
  }

  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (data.checks) Object.entries(data.checks).forEach(([k, v]) => yChecks.set(k, v as T.CheckState));
        if (data.settings) Object.entries(data.settings).forEach(([k, v]) => ySettings.set(k, v));
        if (data.mqSettings) Object.entries(data.mqSettings).forEach(([k, v]) => yMqSettings.set(k, v as boolean));
        if (data.variantSettings) Object.entries(data.variantSettings).forEach(([k, v]) => yVariantSettings.set(k, v as number));
        if (data.items) Object.entries(data.items).forEach(([k, v]) => yItems.set(k, v as number));
        if (data.shopItems) Object.entries(data.shopItems).forEach(([k, v]) => yShopItems.set(k, v as string));
        if (data.shopPrices) Object.entries(data.shopPrices).forEach(([k, v]) => yShopPrices.set(k, v as number));
        if (data.entrances) Object.entries(data.entrances).forEach(([k, v]) => yEntrances.set(k, v as string));
        if (data.notes) Object.entries(data.notes).forEach(([k, v]) => yNotes.set(k, v as string));
        if (Array.isArray(data.hints) && data.hints.length > 0) {
          yHints.delete(0, yHints.length);
          yHints.push(data.hints);
        }
      } catch {
        alert('Invalid file!');
      }
    };
    input.click();
  }

  // ==========================================
  // SAVE SLOTS
  // Snapshots of full run state stored in localStorage.
  // Current slot = last saved/loaded. Yjs doc is always the live state.
  // ==========================================
  interface SaveSlot {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    checks: Record<string, T.CheckState>;
    settings: Record<string, any>;
    mqSettings: Record<string, boolean>;
    variantSettings: Record<string, number>;
    shopItems: Record<string, string>;
    shopPrices: Record<string, number>;
    notes: Record<string, string>;
    items: Record<string, number>;
    entrances: Record<string, string>;
    hints: any[];
    spoilerLocations: Record<string, string>;
    spoilerSeedInfo: SeedInfo | null;
    spoilerErSettings: ErSettings | null;
  }

  let saveSlots: SaveSlot[] = JSON.parse(localStorage.getItem('saveSlots') ?? '[]');
  let currentSlotId: string | null = localStorage.getItem('currentSlotId');
  let slotRenameId: string | null = null;
  let slotRenameValue = '';

  function formatSlotDate(ts: number): string {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function snapshotCurrentState(): Omit<SaveSlot, 'id' | 'name' | 'createdAt' | 'updatedAt'> {
    return {
      checks: Object.fromEntries(yChecks.entries()),
      settings: Object.fromEntries(ySettings.entries()),
      mqSettings: Object.fromEntries(yMqSettings.entries()),
      variantSettings: Object.fromEntries(yVariantSettings.entries()),
      shopItems: Object.fromEntries(yShopItems.entries()),
      shopPrices: Object.fromEntries(yShopPrices.entries()),
      notes: Object.fromEntries(yNotes.entries()),
      items: Object.fromEntries(yItems.entries()),
      entrances: Object.fromEntries(yEntrances.entries()),
      hints: yHints.toArray(),
      spoilerLocations,
      spoilerSeedInfo,
      spoilerErSettings,
    };
  }

  function persistSlots() {
    localStorage.setItem('saveSlots', JSON.stringify(saveSlots));
  }

  function newSlot() {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const slot: SaveSlot = {
      id,
      name: `Slot ${saveSlots.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...snapshotCurrentState(),
    };
    saveSlots = [...saveSlots, slot];
    currentSlotId = id;
    localStorage.setItem('currentSlotId', id);
    persistSlots();
  }

  function saveToSlot(id: string) {
    saveSlots = saveSlots.map(s =>
      s.id === id ? { ...s, ...snapshotCurrentState(), updatedAt: Date.now() } : s
    );
    currentSlotId = id;
    localStorage.setItem('currentSlotId', id);
    persistSlots();
  }

  function loadSlot(slot: SaveSlot) {
    if (!window.confirm(`Load slot "${slot.name}"? This will replace the current state.`)) return;
    [...yChecks.keys()].forEach(k => yChecks.delete(k));
    Object.entries(slot.checks).forEach(([k, v]) => yChecks.set(k, v));
    [...ySettings.keys()].forEach(k => ySettings.delete(k));
    Object.entries(slot.settings).forEach(([k, v]) => ySettings.set(k, v));
    [...yMqSettings.keys()].forEach(k => yMqSettings.delete(k));
    Object.entries(slot.mqSettings).forEach(([k, v]) => yMqSettings.set(k, v));
    [...yVariantSettings.keys()].forEach(k => yVariantSettings.delete(k));
    Object.entries(slot.variantSettings).forEach(([k, v]) => yVariantSettings.set(k, v));
    [...yShopItems.keys()].forEach(k => yShopItems.delete(k));
    Object.entries(slot.shopItems).forEach(([k, v]) => yShopItems.set(k, v));
    [...yShopPrices.keys()].forEach(k => yShopPrices.delete(k));
    Object.entries(slot.shopPrices).forEach(([k, v]) => yShopPrices.set(k, v));
    [...yNotes.keys()].forEach(k => yNotes.delete(k));
    Object.entries(slot.notes).forEach(([k, v]) => yNotes.set(k, v));
    [...yItems.keys()].forEach(k => yItems.delete(k));
    Object.entries(slot.items).forEach(([k, v]) => yItems.set(k, v));
    [...yEntrances.keys()].forEach(k => yEntrances.delete(k));
    Object.entries(slot.entrances).forEach(([k, v]) => yEntrances.set(k, v));
    yHints.delete(0, yHints.length);
    if (slot.hints.length > 0) yHints.push(slot.hints);
    spoilerLocations = slot.spoilerLocations ?? {};
    localStorage.setItem('spoilerLocations', JSON.stringify(spoilerLocations));
    spoilerSeedInfo = slot.spoilerSeedInfo ?? null;
    localStorage.setItem('spoilerSeedInfo', JSON.stringify(spoilerSeedInfo));
    spoilerErSettings = slot.spoilerErSettings ?? null;
    localStorage.setItem('spoilerErSettings', JSON.stringify(spoilerErSettings));
    currentSlotId = slot.id;
    localStorage.setItem('currentSlotId', slot.id);
  }

  function deleteSlot(id: string) {
    const slot = saveSlots.find(s => s.id === id);
    if (!slot || !window.confirm(`Delete slot "${slot.name}"?`)) return;
    saveSlots = saveSlots.filter(s => s.id !== id);
    if (currentSlotId === id) {
      currentSlotId = saveSlots[0]?.id ?? null;
      localStorage.setItem('currentSlotId', currentSlotId ?? '');
    }
    persistSlots();
  }

  function renameSlot(id: string, name: string) {
    const trimmed = name.trim();
    if (trimmed) saveSlots = saveSlots.map(s => s.id === id ? { ...s, name: trimmed } : s);
    slotRenameId = null;
    persistSlots();
  }

  $: currentSlot = saveSlots.find(s => s.id === currentSlotId) ?? null;

  // ==========================================
  // UI PREFERENCES
  // ==========================================
  type Theme = 'light' | 'dark' | 'oot' | 'oot-light' | 'mm' | 'mm-light' | 'forest' | 'forest-light';
  const themes: { id: Theme; emoji: string; label: string }[] = [
    { id: 'light',       emoji: '☀️', label: 'Light' },
    { id: 'dark',        emoji: '🌙', label: 'Dark' },
    { id: 'oot',         emoji: '🏺', label: 'OoT Gold' },
    { id: 'oot-light',   emoji: '🏺', label: 'OoT Gold Light' },
    { id: 'mm',          emoji: '🎭', label: 'MM Purple' },
    { id: 'mm-light',    emoji: '🎭', label: 'MM Purple Light' },
    { id: 'forest',      emoji: '🌿', label: 'Forest' },
    { id: 'forest-light',emoji: '🌿', label: 'Forest Light' },
  ];

  const _savedTheme = localStorage.getItem('theme') as Theme | null;
  // backwards-compat: migrate old darkMode flag
  let theme: Theme = _savedTheme ?? (localStorage.getItem('darkMode') === 'true' ? 'dark' : 'light');

  $: {
    document.body.classList.remove('dark', 'theme-oot', 'theme-oot-light', 'theme-mm', 'theme-mm-light', 'theme-forest', 'theme-forest-light');
    if (theme === 'dark') document.body.classList.add('dark');
    else if (theme !== 'light') document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('theme', theme);
  }

  let activeTab: 'oot' | 'mm' | 'other' = 'oot';
  let compact = false;
  let showLegend = false;
  let showShortcuts = false;
  let scrollY = 0;

  const shortcuts = [
    { key: 'Ctrl+F',             desc: 'Focus filter' },
    { key: 'Ctrl+Shift+S',        desc: 'Focus spoiler search' },
    { key: 'Escape',             desc: 'Clear filter / spoiler search' },
    { key: 'Alt+C',              desc: 'Toggle compact mode' },
    { key: 'Ctrl+Z / Ctrl+Y',   desc: 'Undo / Redo' },
    { key: 'Click',              desc: 'Toggle check' },
    { key: 'Shift+Click',        desc: 'Toggle range' },
    { key: 'Right-click',        desc: 'Mark check' },
    { key: 'Shift+Right-click',  desc: 'Mark range' },
    { key: 'Ctrl+Right-click',   desc: 'Edit note / shop' },
    { key: 'Click group name',   desc: 'Toggle all checks in group' },
    { key: 'Right-click group',  desc: 'Mark all in group' },
  ];

  const checkTypeLegend = [
    { label: 'Chest',                    border: 'lightblue',  bg: '' },
    { label: 'Gold Skulltula',            border: '#c8960a',    bg: 'rgba(255,190,0,0.18)' },
    { label: 'Scrub / Shop',              border: '#2a9e50',    bg: 'rgba(40,180,80,0.18)' },
    { label: 'Cow',                       border: '#b08040',    bg: 'rgba(210,175,110,0.20)' },
    { label: 'Stray Fairy / Fairy',       border: '#00b8cc',    bg: 'rgba(0,210,230,0.16)' },
    { label: 'Silver Rupee',              border: '#8888cc',    bg: 'rgba(160,160,220,0.18)' },
    { label: 'Pot / Crate / Barrel',      border: '#9a6820',    bg: 'rgba(180,120,40,0.18)' },
    { label: 'Grass / Tree / Bush / Soil',border: '#4a9640',    bg: 'rgba(70,150,60,0.16)' },
    { label: 'Rock / Boulder / Icicle',   border: '#b04030',    bg: 'rgba(200,65,50,0.15)' },
    { label: 'Rupee / Heart / Wonder',    border: '#4488dd',    bg: 'rgba(65,135,255,0.15)' },
  ];

  const _loadSec = (k: string) => localStorage.getItem(k) === 'true';
  let secGeneral = _loadSec('sec_general');
  let secEr      = _loadSec('sec_er');
  let secItem    = _loadSec('sec_item');
  let secHint    = _loadSec('sec_hint');
  let secShuffle = _loadSec('sec_shuffle');
  let secSlots   = _loadSec('sec_slots');


  function toggleYmap(map: Y.Map<boolean>, key: string) {
    map.set(key, !(map.get(key) ?? false));
  }

  function cycleVariant(groupName: string, maxVariant: number) {
    yVariantSettings.set(groupName, ((yVariantSettings.get(groupName) ?? 0) + 1) % (maxVariant + 1));
  }

  // ==========================================
  // GAME SETTINGS OPTIONS
  // Each entry drives both the UI control and the setting ID used in checkPredicate
  // ==========================================
  const ootOptions = [
    {
      type: 'dropdown',
      id: 'goldSkulltulaShuffleOOT',
      label: 'Gold Skulltulas Tokens',
      default: 'no_shuffle',
      options: [
        { value: 'all', label: 'All Tokens' },
        { value: 'dungeons', label: 'Dungeons Only' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'no_shuffle', label: 'No Shuffle' },
      ],
    },
    {
      type: 'dropdown',
      id: 'SilverRupeeShuffleOOT',
      label: 'Silver Rupee Shuffle',
      default: 'vanilla',
      options: [
        { value: 'vanilla', label: 'Vanilla' },
        { value: 'own_dungeon', label: 'Own Dungeon' },
        { value: 'anywhere', label: 'Anywhere' },
      ],
    },
    {
      type: 'dropdown',
      id: 'TreasureChestShuffleOOT',
      label: 'Chest Game Small Key',
      default: 'vanilla',
      options: [
        { value: 'vanilla', label: 'Vanilla' },
        { value: 'own_minigame', label: 'Own Minigame' },
        { value: 'anywhere', label: 'Anywhere' },
      ],
    },
    {
      type: 'dropdown',
      id: 'GanonBKShuffleOOT',
      label: 'Ganon Boss Key',
      default: 'removed',
      options: [
        { value: 'removed', label: 'Removed' },
        { value: 'ganoncastle', label: 'Ganon Castle' },
        { value: 'vanilla', label: 'Vanilla' },
        { value: 'anywhere', label: 'Anywhere' },
      ],
    },
    { type: 'checkbox', id: 'ScrubsOOT', label: 'Scrubs' },
    { type: 'checkbox', id: 'CowShuffleOOT', label: 'Cow Shuffle' },
    {
      type: 'dropdown',
      id: 'ShopShuffleOOT',
      label: 'Shop Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'None' },
        { value: 'full', label: 'Full' },
      ],
    },
    {
      type: 'dropdown',
      id: 'PotShuffleOOT',
      label: 'Pot Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Pots' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    {
      type: 'dropdown',
      id: 'CrateShuffleOOT',
      label: 'Crate Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Crates' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    { type: 'checkbox', id: 'HivesShuffleOOT', label: 'Hives Shuffle' },
    {
      type: 'dropdown',
      id: 'GrassShuffleOOT',
      label: 'Grass Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Grass' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    { type: 'checkbox', id: 'RockShuffleOOT', label: 'Rock Shuffle' },
    { type: 'checkbox', id: 'TreeShuffleOOT', label: 'Tree Shuffle' },
    { type: 'checkbox', id: 'BushShuffleOOT', label: 'Bush Shuffle' },
    { type: 'checkbox', id: 'SoilShuffleOOT', label: 'Soil Shuffle' },
    {
      type: 'dropdown',
      id: 'RupeeShuffleOOT',
      label: 'Freestanding Rupees Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Rupees' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    {
      type: 'dropdown',
      id: 'HeartsShuffleOOT',
      label: 'Freestanding Hearts Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Hearts' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    {
      type: 'dropdown',
      id: 'WonderShuffleOOT',
      label: 'Wonder Items Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Wonders' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    { type: 'checkbox', id: 'ButterflyShuffleOOT', label: 'Butterfly Shuffle' },
    { type: 'checkbox', id: 'RedBoulderShuffleOOT', label: 'Red Boulder Shuffle' },
    { type: 'checkbox', id: 'FrogRupeesShuffleOOT', label: 'Frog Rupees Shuffle' },
    { type: 'checkbox', id: 'IciclesShuffleOOT', label: 'Icicles Shuffle' },
    { type: 'checkbox', id: 'RedIceShuffleOOT', label: 'Red Ice Shuffle' },
    { type: 'checkbox', id: 'MaskTradeShuffleOOT', label: 'Mask Trade Shuffle' },
    { type: 'checkbox', id: 'MerchantShuffleOOT', label: 'Merchants Shuffle' },
    { type: 'checkbox', id: 'FishPondShuffleOOT', label: 'Fishing Pond Fish Shuffle' },
    { type: 'checkbox', id: 'DiveGameShuffleOOT', label: 'Diving Game Rupee Shuffle' },
    { type: 'checkbox', id: 'FairyFountainShuffleOOT', label: 'Fairy Fountain Fairy Shuffle' },
    { type: 'checkbox', id: 'FairySpotShuffleOOT', label: 'Fairy Spot Shuffle' },
    { type: 'checkbox', id: 'WeirdPocketEggShuffle', label: 'Weird / Pocket Egg Content Shuffle' },
  ];

  const mmOptions = [
    {
      type: 'dropdown',
      id: 'TingleMapShuffleMM',
      label: 'Tingle Maps Shuffle',
      default: 'vanilla',
      options: [
        { value: 'vanilla', label: 'Vanilla' },
        { value: 'starting_items', label: 'Starting Items' },
        { value: 'anywhere', label: 'Anywhere' },
        { value: 'removed', label: 'Removed' },
      ],
    },
    {
      type: 'dropdown',
      id: 'TownSFShuffleMM',
      label: 'Town Stray Fairy Shuffle',
      default: 'vanilla',
      options: [
        { value: 'vanilla', label: 'Vanilla' },
        { value: 'anywhere', label: 'Anywhere' },
      ],
    },
    {
      type: 'dropdown',
      id: 'DungeonChestSFShuffleMM',
      label: 'Dungeon Chest Fairy Shuffle',
      default: 'own_dungeon',
      options: [
        { value: 'starting', label: 'Starting' },
        { value: 'own_dungeon', label: 'Own Dungeon' },
        { value: 'vanilla', label: 'Vanilla' },
        { value: 'anywhere', label: 'Anywhere' },
      ],
    },
    {
      type: 'dropdown',
      id: 'DungeonFreeSFShuffleMM',
      label: 'Dungeon Freestanding Fairy Shuffle',
      default: 'vanilla',
      options: [
        { value: 'removed', label: 'Removed' },
        { value: 'starting', label: 'Starting' },
        { value: 'own_dungeon', label: 'Own Dungeon' },
        { value: 'vanilla', label: 'Vanilla' },
        { value: 'anywhere', label: 'Anywhere' },
      ],
    },
    { type: 'checkbox', id: 'ScrubsMM', label: 'Scrubs Shuffle' },
    { type: 'checkbox', id: 'CowShuffleMM', label: 'Cow Shuffle' },
    {
      type: 'dropdown',
      id: 'ShopShuffleMM',
      label: 'Shop Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'None' },
        { value: 'full', label: 'Full' },
      ],
    },
    {
      type: 'dropdown',
      id: 'OwlStatueShuffleMM',
      label: 'Owl Statue',
      default: 'none',
      options: [
        { value: 'none', label: 'None' },
        { value: 'anywhere', label: 'Anywhere' },
      ],
    },
    {
      type: 'dropdown',
      id: 'PotShuffleMM',
      label: 'Pot Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Pots' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    {
      type: 'dropdown',
      id: 'CrateShuffleMM',
      label: 'Crate Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Crates' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    {
      type: 'dropdown',
      id: 'BarrelsShuffleMM',
      label: 'Barrels Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Barrels' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    { type: 'checkbox', id: 'HivesShuffleMM', label: 'Hives Shuffle' },
    {
      type: 'dropdown',
      id: 'RockShuffleMM',
      label: 'Rock Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Rocks' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    {
      type: 'dropdown',
      id: 'GrassShuffleMM',
      label: 'Grass Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Grass' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    { type: 'checkbox', id: 'TerminaGrassShuffleMM', label: 'Termina Field Grass Shuffle' },
    {
      type: 'dropdown',
      id: 'TreeShuffleMM',
      label: 'Tree Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Trees' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    {
      type: 'dropdown',
      id: 'BushShuffleMM',
      label: 'Bush Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Bushes' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    {
      type: 'dropdown',
      id: 'SoilShuffleMM',
      label: 'Soil Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Soils' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    {
      type: 'dropdown',
      id: 'RupeeShuffleMM',
      label: 'Freestanding Rupee Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Rupees' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    { type: 'checkbox', id: 'HeartsShuffleMM', label: 'Freestanding Hearts Shuffle' },
    { type: 'checkbox', id: 'WonderShuffleMM', label: 'Wonder Items Shuffle' },
    {
      type: 'dropdown',
      id: 'SnowballShuffleMM',
      label: 'Snowball Shuffle',
      default: 'none',
      options: [
        { value: 'none', label: 'No Shuffle' },
        { value: 'all', label: 'All Snowballs' },
        { value: 'overworld', label: 'Overworld Only' },
        { value: 'dungeons', label: 'Dungeons Only' },
      ],
    },
    { type: 'checkbox', id: 'ButterflyShuffleMM', label: 'Butterfly Shuffle' },
    { type: 'checkbox', id: 'RedBoulderShuffleMM', label: 'Red Boulder Shuffle' },
    { type: 'checkbox', id: 'LotteryShuffleMM', label: 'Lottery Shuffle' },
    { type: 'checkbox', id: 'IciclesShuffleMM', label: 'Icicles Shuffle' },
    { type: 'checkbox', id: 'MerchantShuffleMM', label: 'Merchants Shuffle' },
    { type: 'checkbox', id: 'FairyFountainShuffleMM', label: 'Fairy Fountain Fairy Shuffle' },
  ];

  const otherOptions = [
    { type: 'checkbox', id: 'BrokenActorsOOT', label: 'Restore Broken Actors (OoT)' },
    { type: 'checkbox', id: 'SkipChildZeldaOOT', label: 'Skip Child Zelda (OoT)' },
  ];
</script>

<!-- ==========================================
     TEMPLATE
     ========================================== -->

<svelte:window on:keydown={handleKeydown} bind:scrollY />

{#if isOverlay}
  <!-- Overlay mode: dedicated display-only tracker -->
  <OverlayTracker {yItems} {ySettings} onJoinRoom={joinCoopRoom} />
{:else}
  {#if isWatchMode}
    <div class="watch-banner">👁 Watch mode — read only</div>
  {/if}
  <main class:modal-active={showMapModal}>
    <!-- ===== TOP BAR ===== -->
    <section class="top-bar">
      <!-- General Settings -->
      <details id="general-settings-details" bind:open={secGeneral} on:toggle={() => localStorage.setItem('sec_general', String(secGeneral))}>
        <summary>
          <strong class="interactable">General Settings</strong>
          {#if connectionProvider != null}
            <span>&nbsp; (Connected to room: <code>{roomName}</code>)</span>
          {/if}
          <button class="undo-btn" on:click|stopPropagation={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">↩ Undo</button>
          <button class="undo-btn" on:click|stopPropagation={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">↪ Redo</button>
          <span class="summary-sep"></span>
          <span class="game-filter-label">Overworld</span>
          <button class="game-filter-btn" class:active={($sSettings.get('OOTMM') ?? 'both') === 'both'} on:click|stopPropagation={() => ySettings.set('OOTMM', 'both')}>Both</button>
          <button class="game-filter-btn" class:active={($sSettings.get('OOTMM') ?? 'both') === 'oot'} on:click|stopPropagation={() => ySettings.set('OOTMM', 'oot')}>OoT</button>
          <button class="game-filter-btn" class:active={($sSettings.get('OOTMM') ?? 'both') === 'mm'} on:click|stopPropagation={() => ySettings.set('OOTMM', 'mm')}>MM</button>
          <span class="summary-sep"></span>
          <span class="game-filter-label">Dungeons</span>
          <button class="game-filter-btn" class:active={($sSettings.get('OOTMMDungeons') ?? 'both') === 'both'} on:click|stopPropagation={() => ySettings.set('OOTMMDungeons', 'both')}>Both</button>
          <button class="game-filter-btn" class:active={($sSettings.get('OOTMMDungeons') ?? 'both') === 'ootdungeons'} on:click|stopPropagation={() => ySettings.set('OOTMMDungeons', 'ootdungeons')}>OoT</button>
          <button class="game-filter-btn" class:active={($sSettings.get('OOTMMDungeons') ?? 'both') === 'mmdungeons'} on:click|stopPropagation={() => ySettings.set('OOTMMDungeons', 'mmdungeons')}>MM</button>
        </summary>
        <div id="general-container" class="flex flex-wrap" style="margin-top: 0.8em">
          <form class="pure-form pure-form-stacked">
            <a href="https://github.com/mobby45/ootmmr-checklist" target="_blank" style="margin-left: auto"
              >↗ More info</a
            >
            <fieldset>
              <label>
                Show OOT/MM Overworld
                <select
                  value={$sSettings.get('OOTMM') ?? 'both'}
                  on:change={e => ySettings.set('OOTMM', e.target.value)}
                  class="dropdown-select"
                >
                  <option value="both">Both</option>
                  <option value="oot">OoT</option>
                  <option value="mm">MM</option>
                  <option value="none">None</option>
                </select>
              </label>
              <label>
                Show OOT/MM Dungeons
                <select
                  value={$sSettings.get('OOTMMDungeons') ?? 'both'}
                  on:change={e => ySettings.set('OOTMMDungeons', e.currentTarget.value)}
                  class="dropdown-select"
                >
                  <option value="both">Both</option>
                  <option value="ootdungeons">OoT</option>
                  <option value="mmdungeons">MM</option>
                  <option value="none">None</option>
                </select>
              </label>
            </fieldset>
            <fieldset>
              <div class="unshuffled-grid">
                <label class="checkbox-option">
                  <input
                    type="checkbox"
                    checked={$sSettings.get('showUnshuffledGS') ?? false}
                    on:change={() => ySettings.set('showUnshuffledGS', !($sSettings.get('showUnshuffledGS') ?? false))}
                  />
                  Show Unshuffled Gold Skulltulas
                </label>
                <label class="checkbox-option">
                  <input
                    type="checkbox"
                    checked={$sSettings.get('showUnshuffledDungeonSF') ?? false}
                    on:change={() => ySettings.set('showUnshuffledDungeonSF', !($sSettings.get('showUnshuffledDungeonSF') ?? false))}
                  />
                  Show Unshuffled Dungeon Stray Fairies (Chest)
                </label>
                <label class="checkbox-option">
                  <input
                    type="checkbox"
                    checked={$sSettings.get('showUnshuffledFreeSF') ?? false}
                    on:change={() => ySettings.set('showUnshuffledFreeSF', !($sSettings.get('showUnshuffledFreeSF') ?? false))}
                  />
                  Show Unshuffled Dungeon Freestanding Fairies
                </label>
                <label class="checkbox-option">
                  <input
                    type="checkbox"
                    checked={$sSettings.get('showUnshuffledTownSF') ?? false}
                    on:change={() => ySettings.set('showUnshuffledTownSF', !($sSettings.get('showUnshuffledTownSF') ?? false))}
                  />
                  Show Unshuffled Town Stray Fairy
                </label>
                <label class="checkbox-option">
                  <input type="checkbox" bind:checked={showSpoilerItems} />
                  Show found items (spoiler)
                </label>
              </div>
            </fieldset>

            <!-- Collapsible seed info — always visible, empty state when no spoiler loaded -->
            <details class="spoiler-panel" style="margin-top: 1em;"
              bind:open={seedInfoOpen}
              on:toggle={() => localStorage.setItem('sec_seedinfo', String(seedInfoOpen))}
            >
              <summary class="spoiler-panel-summary">Seed Info</summary>
              {#if spoilerSeedInfo}
                <table class="seed-table" style="margin-top: 0.4em;">
                  <tr>
                    <td>Hash</td>
                    <td style="display:flex; align-items:center; gap:0.4em;">
                      <span title={spoilerSeedInfo.hash} style="cursor:help;">{spoilerSeedInfo.hash.slice(0, 16)}…</span>
                      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
                      <span class="copy-hash-btn" title="Copy full hash" on:click={copyHash}>{hashCopied ? '✓' : '⧉'}</span>
                    </td>
                  </tr>
                  {#if spoilerSeedInfo.mode}<tr><td>Mode</td><td>{spoilerSeedInfo.mode}</td></tr>{/if}
                  {#if spoilerSeedInfo.games && spoilerSeedInfo.games !== 'ootmm'}<tr><td>Games</td><td>{spoilerSeedInfo.games}</td></tr>{/if}
                  {#if spoilerSeedInfo.version}<tr><td>Version</td><td>{spoilerSeedInfo.version}</td></tr>{/if}
                  {#if spoilerSeedInfo.settingsString}
                    <tr>
                      <td>Settings</td>
                      <td style="display:flex; align-items:center; gap:0.4em;">
                        <span title={spoilerSeedInfo.settingsString} style="cursor:help;">{spoilerSeedInfo.settingsString.slice(0, 20)}…</span>
                        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
                        <span class="copy-hash-btn" title="Copy full settings string" on:click={copySettings}>{settingsCopied ? '✓' : '⧉'}</span>
                      </td>
                    </tr>
                  {/if}
                </table>
              {:else}
                <p class="spoiler-no-log">No spoiler loaded — use <em>Import Spoiler</em> to populate.</p>
              {/if}
            </details>

            <!-- Collapsible spoiler search -->
            <details class="spoiler-panel" style="margin-top: 0.4em;"
              bind:open={spoilerSearchOpen}
              on:toggle={() => localStorage.setItem('sec_spoilersearch', String(spoilerSearchOpen))}
              bind:this={spoilerSearchDetailsEl}
            >
              <summary class="spoiler-panel-summary">Spoiler Search</summary>
              <div style="margin-top: 0.4em;">
                {#if Object.keys(spoilerLocations).length === 0}
                  <p class="spoiler-no-log">No spoiler loaded — use <em>Import Spoiler</em> to enable search.</p>
                {:else}
                  {#if spoilerUnmatched.length > 0}
                    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
                    <p
                      class="spoiler-warn"
                      title={spoilerUnmatched.join('\n')}
                      on:click={() => console.table(spoilerUnmatched)}
                      style="cursor:help"
                    >{spoilerUnmatched.length} location{spoilerUnmatched.length > 1 ? 's' : ''} in spoiler not found in pool (hover/click for details)</p>
                  {/if}
                  <input
                    type="text"
                    class="dropdown-select"
                    style="width: 100%; box-sizing: border-box;"
                    placeholder="Item or location… (e.g. Hookshot, Water Temple) — Ctrl+Shift+S"
                    bind:value={spoilerSearch}
                    bind:this={spoilerSearchEl}
                  />
                  {#if spoilerSearchResults.length > 0}
                    <ul class="spoiler-results">
                      {#each spoilerSearchResults as r}
                        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
                        <li
                          on:click={() => jumpToCheck(r.loc)}
                          style="cursor:pointer"
                          title="Click to jump to check"
                          class:spoiler-result-checked={($sChecks.get(r.loc) ?? T.CheckState.unchecked) === T.CheckState.checked}
                        >
                          {#if r.matchedLoc}
                            <span class="spoiler-loc">{r.loc}</span>
                            <span class="spoiler-arrow">→</span>
                            <span class="spoiler-item-name">{formatSpoilerItem(r.item)}</span>
                          {:else}
                            <span class="spoiler-item-name">{formatSpoilerItem(r.item)}</span>
                            <span class="spoiler-arrow">→</span>
                            <span class="spoiler-loc">{r.loc}</span>
                          {/if}
                        </li>
                      {/each}
                    </ul>
                  {:else if spoilerSearch.trim().length >= 2}
                    <p class="spoiler-empty">No match.</p>
                  {/if}
                {/if}
              </div>
            </details>

            <!-- Save Slots -->
            <details class="spoiler-panel" style="margin-top: 0.4em;"
              bind:open={secSlots}
              on:toggle={() => localStorage.setItem('sec_slots', String(secSlots))}
            >
              <summary class="spoiler-panel-summary">Save Slots</summary>
              <div style="margin-top: 0.4em;">
                {#if saveSlots.length > 0}
                  <div style="display:flex; gap:0.4em; margin-bottom:0.4em; align-items:center;">
                    <select class="dropdown-select" style="flex:1" bind:value={currentSlotId}>
                      {#each saveSlots as slot}
                        <option value={slot.id}>{slot.name} ({Object.values(slot.checks).filter(v => v === T.CheckState.checked).length}✓)</option>
                      {/each}
                    </select>
                    <button class="pure-button bg-primary" title="Save current state to this slot" on:click={() => currentSlotId && saveToSlot(currentSlotId)}>💾</button>
                    <button class="pure-button bg-primary" title="Load this slot" on:click={() => { const s = saveSlots.find(x => x.id === currentSlotId); if (s) loadSlot(s); }}>📂</button>
                    <button class="pure-button" title="Rename slot" on:click={() => { const s = saveSlots.find(x => x.id === currentSlotId); if (!s) return; const n = window.prompt('Rename slot:', s.name); if (n != null) renameSlot(s.id, n); }}>✎</button>
                    <button class="pure-button bg-danger" title="Delete slot" on:click={() => currentSlotId && deleteSlot(currentSlotId)}>✕</button>
                  </div>
                  {#if currentSlot}
                    <p class="spoiler-no-log" style="margin:0 0 0.4em;">{formatSlotDate(currentSlot.updatedAt)}</p>
                  {/if}
                {:else}
                  <p class="spoiler-no-log">No slots yet.</p>
                {/if}
                <button class="pure-button" style="font-size:0.82em;" on:click={newSlot}>+ New Slot</button>
              </div>
            </details>
          </form>

          <div class="flex flex-col">
            <!-- Pseudo + ping color — only shown when connected to a room -->
            {#if connectionProvider != null}
              <form class="pure-form" style="margin-bottom: 0.5em;" on:submit|preventDefault={handlePseudoSubmit}>
                <fieldset style="display:flex; gap:0.4em; align-items:center; flex-wrap:wrap;">
                  <input type="text" placeholder="Your pseudo" value={pseudo} maxlength="20" style="width: 120px;" />
                  <input
                    type="color"
                    bind:value={pingColor}
                    title="Ping color"
                    style="width:28px; height:28px; padding:2px; cursor:pointer; border:1px solid var(--color-border); border-radius:4px; background:transparent;"
                  />
                  <button type="submit" class="bg-primary pure-button">Set</button>
                </fieldset>
              </form>
            {/if}

            <!-- Co-op room controls -->
            {#if connectionProvider == null}
              <form
                class="pure-form"
                on:submit|preventDefault={e => joinCoopRoom(e.target?.querySelector('#room-code-input').value)}
              >
                <fieldset>
                  <input id="room-code-input" type="text" placeholder="Room code (or code-password)" required pattern={`[a-z0-9][a-z0-9-]{3,}`} />
                  <button type="submit" class="bg-primary pure-button">Join room</button>
                </fieldset>
              </form>
              <form class="pure-form block" on:submit|preventDefault={() => joinCoopRoom(undefined, newRoomPassword || undefined)}>
                <div style="display:flex; gap:0.4em; margin-bottom:0.35em; align-items:center;">
                  <input
                    type="password"
                    placeholder="Password (optional)"
                    bind:value={newRoomPassword}
                    class="dropdown-select"
                    style="flex:1; font-size:0.82em;"
                    autocomplete="new-password"
                  />
                </div>
                <button type="submit" class="bg-primary fullwidth pure-button">Create new co-op room</button>
              </form>
            {:else}
              <form class="pure-form">
                <fieldset>
                  <button
                    class="bg-primary pure-button"
                    on:click|preventDefault={() => window.navigator.clipboard.writeText(window.location.href)}
                    title="Share with co-op editors (includes password)"
                    >Copy Room Link</button
                  >
                  <button
                    class="pure-button"
                    on:click|preventDefault={() => window.navigator.clipboard.writeText(`${location.origin}${location.pathname}?watch=${roomBaseCode}`)}
                    title="Share a read-only view — viewers cannot edit even if they modify the URL"
                    >👁 Watch Link</button
                  >
                  <button class="bg-primary pure-button" on:click={leaveCoopRoom}>Disconnect</button>
                </fieldset>
              </form>
              {#if connectedUsers.length > 0}
                <div class="connected-users">
                  {#each connectedUsers as u}
                    <span class="connected-dot" style="background:{u.color}" title={u.name}></span>
                    <span class="connected-name">{u.name}</span>
                  {/each}
                </div>
              {/if}
            {/if}

            <!-- Action buttons -->
            <div class="block" style="margin-top: 0.5em">
              <div style="margin-bottom: 0.5em;">
                <label style="font-size:0.9em; display:flex; align-items:center; gap:0.5em;">
                  Theme
                  <select bind:value={theme} class="dropdown-select" style="width:auto; flex:1">
                    {#each themes as t}
                      <option value={t.id}>{t.emoji} {t.label}</option>
                    {/each}
                  </select>
                </label>
              </div>
              <div class="button-grid">
                <button
                  class="pure-button"
                  type="button"
                  class:pure-button-active={sortMode === 'alpha'}
                  on:click={() => (sortMode = sortMode === 'alpha' ? 'default' : 'alpha')}
                >
                  {sortMode === 'alpha' ? '↩️ Default' : '🔤 A-Z'}
                </button>
                <button class="bg-primary pure-button" on:click|preventDefault={exportData}>Export Save</button>
                <button class="bg-primary pure-button" on:click|preventDefault={importData}>Import Save</button>
                <button class="bg-primary pure-button" on:click|preventDefault={importSpoilerLog}>Import Spoiler</button>
                <button class="pure-button" on:click|preventDefault={() => { randoImportOpen = !randoImportOpen; randoImportError = ''; randoImportOk = false; }}>🎲 Import Hash</button>
                <button class="bg-danger pure-button" on:click|preventDefault={reset}>Clear Checks</button>
                <button class="bg-danger pure-button" on:click|preventDefault={resetSettings}>Reset Settings</button>
              </div>
              {#if randoImportOpen}
                <div class="rando-import-panel">
                  <p style="font-size:0.78em; opacity:0.7; margin:0 0 0.4em">Paste the randomizer settings string (v2.x):</p>
                  <textarea
                    class="rando-import-input"
                    rows="3"
                    placeholder="v2.7Vh..."
                    bind:value={randoImportStr}
                  ></textarea>
                  <button
                    class="bg-primary pure-button fullwidth"
                    style="margin-top:0.35em; font-size:0.85em;"
                    disabled={!randoImportStr.trim()}
                    on:click={applyRandomizerSettings}
                  >Apply</button>
                  {#if randoImportOk}<p class="rando-import-ok">✓ Settings imported</p>{/if}
                  {#if randoImportError}<p class="rando-import-err">{randoImportError}</p>{/if}
                </div>
              {/if}
            </div>

            <!-- Presets -->
            <fieldset style="margin-top: 1em;">
              <legend>Presets</legend>
              <div style="display: flex; gap: 0.4em; margin-bottom: 0.5em; flex-wrap: wrap;">
                <button class="pure-button" style="font-size:0.8em; padding:0.2em 0.6em" on:click={exportPresets}>↗ Export</button>
                <button class="pure-button" style="font-size:0.8em; padding:0.2em 0.6em" on:click={importPresets}>↙ Import</button>
              </div>
              <div style="display: flex; gap: 0.5em; margin-bottom: 0.5em;">
                <input
                  type="text"
                  placeholder="Preset name..."
                  bind:value={newPresetName}
                  class="dropdown-select"
                  style="flex: 1"
                />
                <button class="pure-button bg-primary" on:click={savePreset}>💾 Save</button>
              </div>
              {#if Object.keys(allPresets).length > 0}
                <div style="display: flex; gap: 0.5em; align-items: center;">
                  <select bind:value={selectedPreset} class="dropdown-select" style="flex: 1">
                    {#each Object.keys(allPresets) as name}
                      <option value={name}>{defaultPresetNames.has(name) ? '⭐ ' : ''}{name}</option>
                    {/each}
                  </select>
                  <button class="pure-button bg-primary" on:click={() => selectedPreset && loadPreset(selectedPreset)}
                    >Load</button
                  >
                  <button
                    class="pure-button bg-danger"
                    disabled={defaultPresetNames.has(selectedPreset)}
                    title={defaultPresetNames.has(selectedPreset) ? 'Default presets cannot be deleted' : ''}
                    on:click={() => {
                      if (selectedPreset && !defaultPresetNames.has(selectedPreset)) deletePreset(selectedPreset);
                    }}>✕</button
                  >
                </div>
                {#if presetMigrationWarning}
                  <div class="preset-migration-warning">{presetMigrationWarning}</div>
                {/if}
              {/if}
            </fieldset>
          </div>
        </div>
      </details>

      <!-- Entrance Rando Tracker -->
      <details style="margin-top: 0.8em" id="er-tracker-details" bind:open={secEr} on:toggle={() => localStorage.setItem('sec_er', String(secEr))}>
        <summary>
          <strong class="interactable">Entrance Rando Tracker</strong>
          {#if $sEntrances.size > 0}<span class="section-badge">{$sEntrances.size}</span>{/if}
        </summary>
        <ERTracker {yEntrances} entranceValues={entranceValuesMap} {spoilerErSettings} />
      </details>

      <!-- Item Tracker -->
      <details style="margin-top: 0.8em" id="item-tracker-details" bind:open={secItem} on:toggle={() => localStorage.setItem('sec_item', String(secItem))}>
        <summary><strong class="interactable">Item Tracker</strong></summary>
        <ItemTracker {yItems} {ySettings} {roomName} />
      </details>

      <!-- Hint Tracker -->
      <details style="margin-top: 0.8em" id="hint-tracker-details" bind:open={secHint} on:toggle={() => localStorage.setItem('sec_hint', String(secHint))}>
        <summary>
          <strong class="interactable">Hint Tracker / Notes</strong>
          {#if hints.length + notesEntries.length + shopEntries.length > 0}
            <span class="section-badge">{hints.length + notesEntries.length + shopEntries.length}</span>
          {/if}
        </summary>
        <HintTracker
          {yHints} {hints}
          {notesEntries} {shopEntries}
          onEditNote={handleEditNote}
          onEditShop={handleShopEditByName}
          onDeleteNote={(id) => yNotes.delete(id)}
          onDeleteShop={(id) => { yShopItems.delete(id); yShopPrices.delete(id); }}
        />
      </details>

      <!-- Game Settings (shuffle options) -->
      <details id="shuffle-settings-details" style="margin-top: 0.8em" bind:open={secShuffle} on:toggle={() => localStorage.setItem('sec_shuffle', String(secShuffle))}>
        <summary><strong class="interactable">Game Settings</strong></summary>
        <div style="margin-top: 0.8em">
          <div class="tabs">
            <button class="tab-button" class:active={activeTab === 'oot'} on:click={() => (activeTab = 'oot')}
              >OoT Shuffle Settings</button
            >
            <button class="tab-button" class:active={activeTab === 'mm'} on:click={() => (activeTab = 'mm')}
              >MM Shuffle Settings</button
            >
            <button class="tab-button" class:active={activeTab === 'other'} on:click={() => (activeTab = 'other')}
              >Other Settings</button
            >
          </div>
          <form class="pure-form pure-form-stacked">
            <fieldset>
              {#if activeTab === 'oot'}
                <div class="dropdown-grid">
                  {#each ootOptions as option}
                    {#if option.type === 'dropdown'}
                      <label>
                        {option.label}
                        <select
                          value={$sSettings.get(option.id) ?? option.default}
                          on:change={e => ySettings.set(option.id, e.target.value)}
                          class="dropdown-select"
                        >
                          {#each option.options ?? [] as opt}<option value={opt.value}>{opt.label}</option>{/each}
                        </select>
                      </label>
                    {:else if option.type === 'checkbox'}
                      <label class="checkbox-option">
                        <input
                          type="checkbox"
                          checked={$sSettings.get(option.id) ?? false}
                          on:change|preventDefault={() => toggleYmap(ySettings, option.id)}
                        />
                        {option.label}
                      </label>
                    {/if}
                  {/each}
                </div>
              {:else if activeTab === 'mm'}
                <div class="dropdown-grid">
                  {#each mmOptions as option}
                    {#if option.type === 'dropdown'}
                      <label>
                        {option.label}
                        <select
                          value={$sSettings.get(option.id) ?? option.default}
                          on:change={e => ySettings.set(option.id, e.target.value)}
                          class="dropdown-select"
                        >
                          {#each option.options ?? [] as opt}<option value={opt.value}>{opt.label}</option>{/each}
                        </select>
                      </label>
                    {:else if option.type === 'checkbox'}
                      <label class="checkbox-option">
                        <input
                          type="checkbox"
                          checked={$sSettings.get(option.id) ?? false}
                          on:change|preventDefault={() => toggleYmap(ySettings, option.id)}
                        />
                        {option.label}
                      </label>
                    {/if}
                  {/each}
                </div>
              {:else if activeTab === 'other'}
                <div class="dropdown-grid">
                  {#each otherOptions as option}
                    {#if option.type === 'checkbox'}
                      <label class="checkbox-option">
                        <input
                          type="checkbox"
                          checked={$sSettings.get(option.id) ?? false}
                          on:change|preventDefault={() => toggleYmap(ySettings, option.id)}
                        />
                        {option.label}
                      </label>
                    {/if}
                  {/each}
                </div>
              {/if}
            </fieldset>
          </form>
        </div>
      </details>
    </section>

    <!-- ===== CHECK LIST ===== -->
    <section>
      <!-- Filter toolbar -->
      <section>
        <form class="pure-form">
          <fieldset>
            <button
              class="pure-button"
              type="button"
              class:pure-button-active={hideChecked}
              on:click={() => (hideChecked = !hideChecked)}
            >
              {hideChecked ? 'Show Checked' : 'Hide Checked'}
            </button>
            <button class="pure-button" type="button" on:click={toggleAllGroups}>
              {shouldShowCollapse ? 'Collapse All' : 'Expand All'}
            </button>
            <input type="text" style="width: 16em" placeholder="Filter… (Ctrl+F)" bind:value={filter} bind:this={filterInputEl} />
            <button
              class="pure-button"
              type="button"
              class:pure-button-active={compact}
              on:click={() => (compact = !compact)}
              title="Alt+C"
            >Compact</button>
            <span class="check-stat">{visibleGroupCount} zones · {visibleCheckCount} checks</span>
            <button
              class="pure-button legend-toggle-btn"
              type="button"
              class:pure-button-active={showLegend}
              on:click={() => (showLegend = !showLegend)}
              title="Color legend"
            >🎨</button>
            <button
              class="pure-button legend-toggle-btn"
              type="button"
              class:pure-button-active={showShortcuts}
              on:click={() => (showShortcuts = !showShortcuts)}
              title="Keyboard shortcuts"
            >⌨️</button>
          </fieldset>
        </form>
      </section>

      <!-- Keyboard shortcuts -->
      {#if showShortcuts}
        <div class="shortcuts-panel">
          {#each shortcuts as s}
            <span class="shortcut-key">{s.key}</span>
            <span class="shortcut-desc">{s.desc}</span>
          {/each}
        </div>
      {/if}

      <!-- Color legend -->
      {#if showLegend}
        <div class="legend-panel">
          {#each checkTypeLegend as entry}
            <span class="legend-item" style="border-left: 3px solid {entry.border}; background: {entry.bg || 'transparent'}">
              {entry.label}
            </span>
          {/each}
        </div>
      {/if}

      <!-- Progress bars -->
      {#if ootCheckCount.total > 0}
        {@const pct = Math.round(ootCheckCount.checked / ootCheckCount.total * 100)}
        <div class="progress-wrap">
          <div class="progress-fill oot" style="width: {pct}%"></div>
          <span class="progress-label">OoT — {ootCheckCount.checked} / {ootCheckCount.total} ({pct}%)</span>
        </div>
      {/if}
      {#if mmCheckCount.total > 0}
        {@const pct = Math.round(mmCheckCount.checked / mmCheckCount.total * 100)}
        <div class="progress-wrap">
          <div class="progress-fill mm" style="width: {pct}%"></div>
          <span class="progress-label">MM — {mmCheckCount.checked} / {mmCheckCount.total} ({pct}%)</span>
        </div>
      {/if}

      <!-- Check groups -->
      {#if sortedChecks != null}
        {#each sortedChecks as group (group.groupName)}
          <section>
            <CheckGroup
              groupName={group.groupName}
              canBeMq={group.canHaveMq}
              isMq={$sMqSettings.get(group.groupName) ?? false}
              canHaveVariant={group.canHaveVariant}
              variant={$sVariantSettings.get(group.groupName) ?? 0}
              forceOpen={groupStates.get(group.groupName) ?? allGroupsExpanded}
              {forceOpenTimestamp}
              allChecked={groupCompletionStatus[group.groupName] ?? false}
              checkCount={groupCheckCounts[group.groupName] ?? { checked: 0, total: 0 }}
              pingColor={groupPings.get(group.groupName) ?? ''}
              {compact}
              woth={wothGroups.has(group.groupName)}
              barren={barrenGroups.has(group.groupName)}
              on:toggleGroup={() => toggleWholeGroup(group)}
              on:markGroup={() => markWholeGroup(group)}
              on:toggleMq={() => toggleYmap(yMqSettings, group.groupName)}
              on:cycleVariant={() => cycleVariant(group.groupName, group.maxVariant ?? 0)}
              on:individualToggle={handleIndividualToggle}
              on:openMap={() => openMap(group.groupName)}
            >
              {#each group.checks as check, checkIndex}
                <CheckItem
                  name={check.shortName}
                  vanillaItem={check.item ?? ''}
                  type={check.type}
                  state={$sChecks.get(check.name) ?? T.CheckState.unchecked}
                  shopItem={$sShopItems.get(check.name) ?? ''}
                  shopPrice={$sShopPrices.get(check.name) ?? null}
                  isShop={check.type === T.CheckType.scrub ||
                    check.type === T.CheckType.shop ||
                    priceEditIds.has(check.id)}
                  showPrice={!itemOnlyIds.has(check.id)}
                  spoilerItem={showSpoilerItems ? (spoilerLocations[check.name] ?? '') : ''}
                  author={connectionProvider ? ($sCheckAuthors.get(check.name) ?? '') : ''}
                  pingColor={pinnedChecks.get(check.name) ?? ''}
                  note={$sNotes.get(check.name) ?? ''}
                  {compact}
                  woth={wothCheckNames.has(check.name)}
                  barren={barrenCheckNames.has(check.name)}
                  highlighted={spoilerHighlight === check.name}
                  checkName={check.name}
                  zone={group.groupName}
                  {filter}
                  on:editNote={() => { if (!isWatchMode) handleEditNote(check.name); }}
                  on:toggle={e => {
                    if (isWatchMode) return;
                    if (e.detail.range) {
                      toggleRangeTo(group, checkIndex);
                    } else {
                      const newState = toggleState($sChecks.get(check.name) ?? T.CheckState.unchecked);
                      lastAction = { group, checkIndex, newState };
                      yChecks.set(check.name, newState);
                      setAuthor(check.name, newState);
                      if (newState === T.CheckState.checked) yNotes.delete(check.name);
                    }
                  }}
                  on:mark={e => {
                    if (isWatchMode) return;
                    if (e.detail.range) {
                      markRangeTo(group, checkIndex);
                    } else {
                      const cur = $sChecks.get(check.name) ?? T.CheckState.unchecked;
                      const newState = cur === T.CheckState.marked ? T.CheckState.unchecked : T.CheckState.marked;
                      lastMarkAction = { group, checkIndex, newState };
                      yChecks.set(check.name, newState);
                      setAuthor(check.name, newState);
                    }
                  }}
                  on:shopEdit={() => { if (!isWatchMode) handleShopEdit(check.name, check.id); }}
                />
              {/each}
            </CheckGroup>
          </section>
        {/each}
      {/if}
    </section>

    <!-- ===== MAP MODAL ===== -->
    {#if showMapModal && currentSceneData}
      <MapModal
        scene={currentMapScene}
        sceneData={currentSceneData}
        groupName={currentGroupName}
        allScenes={matchedScenes}
        allScenesData={mapData}
        checkStates={checkStatesMap}
        {filteredCheckNames}
        {checkNameMappingReverse}
        mqSettings={$sMqSettings}
        variantSettings={$sVariantSettings}
        bind:showAgeFilter
        bind:ageFilter
        on:close={() => {
          showMapModal = false;
        }}
        on:toggleCheck={handleMapToggle}
        on:changeScene={e => {
          currentMapScene = e.detail.scene;
          currentSceneData = mapData[e.detail.scene];
        }}
        shopItems={shopItemsMap}
        shopPrices={shopPricesMap}
        {shopScrubIds}
        on:shopEdit={e => handleMapShopEdit(e.detail.checkName)}
        scenePings={scenePingsForMap}
        on:ping={handleMapPing}
      />
    {/if}

    <!-- ===== CHAT PANEL (co-op only) ===== -->
    {#if connectionProvider != null}
      <div class="chat-container">
        {#if chatOpen}
          <div class="chat-panel">
            <div class="chat-header">
              <span>Chat</span>
              <div class="chat-header-actions">
                <button class="chat-filter-btn" class:active={chatFilter==='all'} on:click={() => chatFilter='all'}>All</button>
                <button class="chat-filter-btn" class:active={chatFilter==='chat'} on:click={() => chatFilter='chat'}>💬</button>
                <button class="chat-filter-btn" class:active={chatFilter==='pings'} on:click={() => chatFilter='pings'}>📍</button>
                <button class="chat-clear-btn" on:click={clearChat} title="Clear chat">🗑</button>
                <button class="chat-close-btn" on:click={() => { chatOpen = false; }}>✕</button>
              </div>
            </div>
            <div class="chat-messages" bind:this={chatScrollEl}>
              {#if filteredMessages.length === 0}
                <div class="chat-empty">{messages.length === 0 ? 'No messages yet. Right-click the map to ping.' : 'No messages match this filter.'}</div>
              {/if}
              {#each filteredMessages as msg (msg.timestamp + msg.pseudo + msg.message)}
                {#if msg.isPing && msg.pingGroupName}
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="chat-msg chat-msg-ping" on:click={() => openMap(msg.pingGroupName ?? '')}>
                    <span class="chat-author">{msg.pseudo}</span>
                    <span class="chat-text">{msg.message} <span class="ping-map-link">→ {msg.pingGroupName}</span></span>
                    <span class="chat-time">{formatChatTime(msg.timestamp)}</span>
                  </div>
                {:else}
                  <div class="chat-msg" class:chat-msg-ping={msg.isPing}>
                    <span class="chat-author">{msg.pseudo}</span>
                    <span class="chat-text">{msg.message}</span>
                    <span class="chat-time">{formatChatTime(msg.timestamp)}</span>
                  </div>
                {/if}
              {/each}
            </div>
            <form class="chat-input-row" on:submit|preventDefault={sendMessage}>
              <input
                type="text"
                bind:value={chatMessage}
                placeholder="Message..."
                maxlength="200"
                class="chat-input"
              />
              <button type="submit" class="chat-send-btn">Send</button>
            </form>
          </div>
        {/if}
        <button class="chat-toggle-btn" on:click={toggleChat}>
          💬 Chat
          {#if chatUnread > 0}
            <span class="chat-unread-badge">{chatUnread > 99 ? '99+' : chatUnread}</span>
          {/if}
        </button>
      </div>
    {/if}
  </main>
{/if}

{#if scrollY > 400}
  <button class="scroll-top-btn" on:click={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Back to top">↑</button>
{/if}

{#if noteEditOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="shop-edit-overlay">
    <div class="shop-edit-modal" on:keydown={e => { if (e.key === 'Enter' && !e.shiftKey) confirmNoteEdit(); if (e.key === 'Escape') noteEditOpen = false; }}>
      <div class="shop-edit-title">Note — {noteEditKey}</div>
      <label class="shop-edit-label">
        <textarea
          rows="3"
          bind:value={noteEditValue}
          placeholder="Leave empty to delete"
          autofocus
          style="background:#111; border:1px solid #555; border-radius:4px; color:#eee; padding:4px 6px; resize:vertical; font-size:0.9em;"
        ></textarea>
      </label>
      <div class="shop-edit-actions">
        <button class="shop-edit-confirm" on:click={confirmNoteEdit}>Save</button>
        <button class="shop-edit-cancel" on:click={() => noteEditOpen = false}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

{#if shopEditOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="shop-edit-overlay">
    <div class="shop-edit-modal" on:keydown={e => { if (e.key === 'Enter') confirmShopEdit(); if (e.key === 'Escape') shopEditOpen = false; }}>
      <div class="shop-edit-title">Edit Shop Item</div>
      <label class="shop-edit-label">
        Item
        <input type="text" bind:value={shopEditItem} placeholder="empty to clear" autofocus />
      </label>
      {#if shopEditAllowPrice}
        <label class="shop-edit-label">
          Price
          <input type="number" bind:value={shopEditPrice} min="0" placeholder="empty to clear" />
        </label>
      {/if}
      <div class="shop-edit-actions">
        <button class="shop-edit-confirm" on:click={confirmShopEdit}>Save</button>
        <button class="shop-edit-cancel" on:click={() => shopEditOpen = false}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .rando-import-panel {
    margin-top: 0.5em;
    padding: 0.5em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-unchecked);
  }
  .rando-import-input {
    width: 100%;
    box-sizing: border-box;
    font-size: 0.75em;
    font-family: monospace;
    padding: 4px 6px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    resize: vertical;
  }
  .rando-import-ok  { margin: 0.3em 0 0; font-size: 0.82em; color: #2ecc71; }
  .rando-import-err { margin: 0.3em 0 0; font-size: 0.82em; color: var(--color-danger); }

  .watch-banner {
    background: rgba(100, 180, 255, 0.15);
    border-bottom: 2px solid #4a9adf;
    color: #4a9adf;
    text-align: center;
    padding: 0.4em;
    font-size: 0.9em;
    font-weight: bold;
    letter-spacing: 0.05em;
  }

  main {
    margin: 0.8em;
  }

  .undo-btn {
    margin-left: 0.5em;
    padding: 0.2em 0.6em;
    font-size: 0.85em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
    vertical-align: middle;
  }
  .undo-btn:disabled { opacity: 0.35; cursor: default; }
  .undo-btn:not(:disabled):hover { background: var(--color-primary); }

  .summary-sep {
    display: inline-block;
    width: 1px;
    height: 1.2em;
    background: var(--color-border);
    margin: 0 0.5em;
    vertical-align: middle;
    opacity: 0.5;
  }

  .section-badge {
    display: inline-block;
    margin-left: 0.5em;
    padding: 0 6px;
    font-size: 0.75em;
    font-weight: bold;
    border-radius: 8px;
    background: var(--color-primary);
    color: #fff;
    opacity: 0.85;
    vertical-align: middle;
  }

  .shortcuts-panel {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.2em 0.8em;
    padding: 0.5em 0.2em;
    font-size: 0.8em;
  }
  .shortcut-key {
    font-family: monospace;
    background: var(--color-border);
    border-radius: 3px;
    padding: 1px 6px;
    white-space: nowrap;
    color: var(--color-text);
    justify-self: start;
    align-self: center;
  }
  .shortcut-desc { color: var(--color-text); opacity: 0.75; align-self: center; }

  .spoiler-results li:hover { background: var(--color-marked); opacity: 0.9; }

  .legend-toggle-btn {
    padding: 0.2em 0.5em;
    font-size: 0.85em;
  }

  .legend-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35em;
    padding: 0.5em 0.2em;
  }

  .legend-item {
    font-size: 0.75em;
    padding: 2px 8px 2px 6px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    color: var(--color-text);
    white-space: nowrap;
  }

  .scroll-top-btn {
    position: fixed;
    bottom: 4.5em;
    right: 1.2em;
    z-index: 400;
    width: 2.2em;
    height: 2.2em;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 1.1em;
    cursor: pointer;
    opacity: 0.7;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .scroll-top-btn:hover { opacity: 1; }

  .check-stat {
    font-size: 0.8em;
    opacity: 0.55;
    margin-left: 0.5em;
    white-space: nowrap;
  }

  .game-filter-label {
    display: inline-block;
    font-size: 0.75em;
    font-weight: bold;
    opacity: 0.5;
    vertical-align: middle;
    margin-left: 0.2em;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .game-filter-btn {
    margin-left: 0.2em;
    padding: 0.2em 0.6em;
    font-size: 0.85em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
    vertical-align: middle;
    opacity: 0.6;
  }
  .game-filter-btn:hover { opacity: 1; }
  .game-filter-btn.active { opacity: 1; background: var(--color-primary); border-color: var(--color-primary); }
  main.modal-active {
    overflow: hidden;
  }

  /* All collapsible sections share the same border style */
  #general-settings-details,
  #shuffle-settings-details,
  #er-tracker-details,
  #item-tracker-details,
  #hint-tracker-details {
    border: 1px solid var(--color-border);
    padding: 0.5em 1em;
    border-radius: 0.2em;
    background-color: var(--color-bg);
    color: var(--color-text);
  }

  #general-container > *:not(:last-child) {
    @media screen and (min-width: 35.5em) {
      margin-right: 1.6em;
    }
  }

  .dropdown-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1em;
    margin-bottom: 1em;
  }
  @media screen and (max-width: 768px) {
    .dropdown-grid {
      grid-template-columns: 1fr;
    }
  }
  @media screen and (min-width: 769px) and (max-width: 1024px) {
    .dropdown-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .dropdown-select {
    width: 100%;
    padding: 0.5em;
    margin-top: 0.4em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
    font-size: 0.9em;
  }
  .dropdown-select:hover {
    border-color: #999;
  }
  .dropdown-select:focus {
    outline: none;
    border-color: #0078e7;
    box-shadow: 0 0 0 2px rgba(0, 120, 231, 0.1);
  }

  .checkbox-option {
    display: flex;
    align-items: center;
    padding: 0.5em 0;
    cursor: pointer;
  }
  .checkbox-option input[type='checkbox'] {
    margin-right: 0.5em;
    cursor: pointer;
  }

  .tabs {
    display: flex;
    gap: 0.5em;
    margin-bottom: 1em;
    border-bottom: 2px solid #e0e0e0;
  }
  .tab-button {
    padding: 0.5em 1em;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 0.95em;
    color: var(--color-header);
    transition: all 0.2s;
  }
  .tab-button:hover {
    color: #333;
    background-color: #f5f5f5;
  }
  .tab-button.active {
    color: #0078e7;
    border-bottom-color: #0078e7;
    font-weight: 600;
  }

  .unshuffled-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.2em 2em;
    margin-top: 0.5em;
  }
  @media screen and (max-width: 768px) {
    .unshuffled-grid {
      grid-template-columns: 1fr;
    }
  }

  .button-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5em;
  }

  .progress-wrap {
    position: relative;
    height: 1.5em;
    background: var(--color-border);
    border-radius: 4px;
    overflow: hidden;
    margin: 0.5em 0 0.3em;
  }
  .progress-fill {
    position: absolute;
    inset: 0 auto 0 0;
    transition: width 0.3s;
  }
  .progress-fill.oot { background: #2e7d32; }
  .progress-fill.mm  { background: #3a7bd5; }
  .progress-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.78em;
    font-weight: bold;
    color: #fff;
    mix-blend-mode: difference;
  }

  fieldset {
    min-width: 0;
  }

  .spoiler-results {
    list-style: none;
    margin: 0.4em 0 0;
    padding: 0;
    max-height: 200px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.25em;
  }

  .spoiler-results li {
    display: flex;
    align-items: baseline;
    gap: 0.4em;
    font-size: 0.85em;
    padding: 2px 4px;
    border-radius: 3px;
    background: var(--color-unchecked);
  }

  .spoiler-item-name { color: #f0a500; font-weight: bold; flex-shrink: 0; }
  .spoiler-arrow     { opacity: 0.5; flex-shrink: 0; }
  .spoiler-loc       { color: var(--color-text); }
  .spoiler-empty     { font-size: 0.85em; opacity: 0.5; margin: 0.3em 0 0; }
  .spoiler-no-log    { font-size: 0.85em; opacity: 0.6; margin: 0.2em 0 0; font-style: italic; }
  .spoiler-warn      { font-size: 0.8em; color: #e0a030; margin: 0.2em 0 0.4em; }

  .spoiler-panel { border: none; padding: 0; }
  .spoiler-panel-summary {
    cursor: pointer;
    font-weight: bold;
    color: var(--color-text);
    list-style: none;
    display: flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.2em 0;
    border-top: 1px solid var(--color-border);
    margin-top: 0.4em;
  }
  .spoiler-panel-summary::before { content: '▶'; font-size: 0.7em; transition: transform 0.15s; }
  .spoiler-panel[open] .spoiler-panel-summary::before { transform: rotate(90deg); }

  .seed-table {
    border-collapse: collapse;
    font-size: 0.82em;
    width: 100%;
  }
  .seed-table td { padding: 0.1em 0.5em 0.1em 0; vertical-align: top; }
  .seed-table td:first-child { opacity: 0.55; white-space: nowrap; width: 1%; }
  .seed-table td:last-child { font-family: monospace; }
  .seed-table td[title] { cursor: help; }
  .copy-hash-btn { cursor: pointer; opacity: 0.45; font-size: 0.9em; user-select: none; }
  .copy-hash-btn:hover { opacity: 1; }

  .spoiler-result-checked { opacity: 0.4; text-decoration: line-through; }

  /* ===== CHAT ===== */
  .chat-container {
    position: fixed;
    bottom: 1em;
    right: 1em;
    z-index: 500;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5em;
  }

  .chat-panel {
    width: 300px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    max-height: 420px;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4em 0.75em;
    border-bottom: 1px solid var(--color-border);
    font-weight: bold;
    font-size: 0.9em;
  }

  .chat-header-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .chat-close-btn, .chat-clear-btn, .chat-filter-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text);
    font-size: 0.85em;
    padding: 0.1em 0.4em;
    border-radius: 3px;
    opacity: 0.6;
  }
  .chat-close-btn:hover, .chat-clear-btn:hover, .chat-filter-btn:hover { background: rgba(255,255,255,0.1); opacity: 1; }
  .chat-filter-btn.active { opacity: 1; background: rgba(102,209,255,0.15); color: var(--color-primary); }
  .chat-clear-btn { opacity: 0.4; }
  .chat-clear-btn:hover { opacity: 0.9; }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 0.5em 0.6em;
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    min-height: 60px;
    max-height: 300px;
  }

  .chat-empty {
    color: #888;
    font-style: italic;
    font-size: 0.8em;
    text-align: center;
    padding: 0.8em 0.4em;
  }

  .chat-msg {
    display: flex;
    gap: 0.35em;
    align-items: baseline;
    font-size: 0.82em;
    flex-wrap: wrap;
    line-height: 1.3;
  }

  .chat-msg-ping {
    opacity: 0.8;
    font-style: italic;
    cursor: pointer;
  }
  .chat-msg-ping:hover { opacity: 1; background: rgba(255, 159, 67, 0.08); border-radius: 3px; }

  .ping-map-link {
    color: #ff9f43;
    font-weight: bold;
    text-decoration: underline;
    font-style: normal;
  }

  .chat-author {
    font-weight: bold;
    color: #7eb8ff;
    flex-shrink: 0;
  }
  .chat-msg-ping .chat-author { color: #ff9f43; }

  .chat-text {
    word-break: break-word;
    color: var(--color-text);
    flex: 1;
  }

  .chat-time {
    font-size: 0.75em;
    opacity: 0.45;
    flex-shrink: 0;
    margin-left: auto;
  }

  .chat-input-row {
    display: flex;
    gap: 0.3em;
    padding: 0.45em 0.5em;
    border-top: 1px solid var(--color-border);
  }

  .chat-input {
    flex: 1;
    padding: 0.3em 0.5em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.85em;
  }

  .chat-send-btn {
    padding: 0.3em 0.65em;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.82em;
  }
  .chat-send-btn:hover { opacity: 0.85; }

  .chat-toggle-btn {
    padding: 0.45em 1em;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.9em;
    position: relative;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }
  .chat-toggle-btn:hover { opacity: 0.88; }

  .chat-unread-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    background: #e74c3c;
    color: white;
    font-size: 0.65em;
    border-radius: 10px;
    padding: 1px 5px;
    font-weight: bold;
  }

  .connected-users {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4em;
    margin-top: 0.4em;
    font-size: 0.82em;
  }
  .connected-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.3);
  }
  .connected-name { color: var(--color-text); opacity: 0.8; }

  .preset-migration-warning {
    margin-top: 0.4em;
    padding: 0.4em 0.7em;
    background: rgba(224, 180, 0, 0.12);
    border: 1px solid rgba(224, 180, 0, 0.4);
    border-radius: 4px;
    color: #e0c040;
    font-size: 0.8em;
  }

  .shop-edit-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.75);
    display: flex; align-items: center; justify-content: center; z-index: 3000;
  }
  .shop-edit-modal {
    background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 8px;
    padding: 1.2em 1.5em; display: flex; flex-direction: column; gap: 0.8em;
    min-width: 260px;
  }
  .shop-edit-title { font-weight: bold; color: var(--color-text); }
  .shop-edit-label { display: flex; flex-direction: column; gap: 0.3em; color: var(--color-header); font-size: 0.9em; }
  .shop-edit-label input {
    background: var(--color-unchecked); border: 1px solid var(--color-border); border-radius: 4px;
    color: var(--color-text); padding: 0.4em 0.6em; font-size: 1em;
  }
  .shop-edit-actions { display: flex; gap: 0.5em; justify-content: flex-end; margin-top: 0.2em; }
  .shop-edit-confirm {
    background: #2a6e2a; color: #eee; border: none; border-radius: 4px;
    padding: 0.4em 1em; cursor: pointer;
  }
  .shop-edit-confirm:hover { background: #3a8e3a; }
  .shop-edit-cancel {
    background: #444; color: #eee; border: none; border-radius: 4px;
    padding: 0.4em 1em; cursor: pointer;
  }
  .shop-edit-cancel:hover { background: #555; }

  .slots-panel { padding: 0.4em 0; }
  .slots-empty {
    font-size: 0.85em;
    opacity: 0.65;
    margin: 0.3em 0;
  }
  .slots-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }
  .slot-item {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.35em 0.6em;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-unchecked);
  }
  .slot-item.slot-active {
    border-color: var(--color-primary);
    background: rgba(0, 120, 231, 0.08);
  }
  .slot-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1em;
    min-width: 0;
  }
  .slot-name {
    font-size: 0.9em;
    font-weight: bold;
    cursor: default;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .slot-rename-input {
    font-size: 0.9em;
    font-weight: bold;
    border: 1px solid var(--color-primary);
    border-radius: 3px;
    padding: 0 4px;
    background: var(--color-bg);
    color: var(--color-text);
    width: 100%;
  }
  .slot-meta {
    display: flex;
    gap: 0.6em;
    font-size: 0.75em;
    opacity: 0.6;
  }
  .slot-actions {
    display: flex;
    gap: 0.2em;
    flex-shrink: 0;
  }
  .slot-btn {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 2px 7px;
    cursor: pointer;
    font-size: 0.82em;
    color: var(--color-text);
    opacity: 0.7;
  }
  .slot-btn:hover { opacity: 1; background: var(--color-unchecked); }
  .slot-btn-danger:hover { background: rgba(180, 40, 40, 0.15); border-color: #b03030; color: #c04040; }
  .slots-current-badge {
    font-size: 0.75em;
    margin-left: 0.5em;
    padding: 1px 6px;
    border-radius: 4px;
    background: rgba(0, 120, 231, 0.15);
    color: var(--color-primary);
    font-weight: bold;
    vertical-align: middle;
  }
</style>
