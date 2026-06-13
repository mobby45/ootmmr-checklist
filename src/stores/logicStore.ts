import { writable, get, type Readable } from 'svelte/store';
import type { Map as YMap } from 'yjs';
import { loadWorld } from '../logic/world';
import { buildLogicState } from '../logic/state';
import { buildItemsMap } from '../logic/itemMapping';
import { computeReachability } from '../logic/engine';
import type { ReachabilityResult } from '../logic/types';
import type { MacroTable } from '../logic/expr/eval';
import type { WorldGraph } from '../logic/types';
import { defaultLogicSettings } from '../data/logicSettingsDef';
import type { SpecialConditionsMap } from '../util/spoilerParser';

// ─── Shared world data (loaded once) ─────────────────────────────────────────

let _worldReady = false;
let _graph: WorldGraph | null = null;
let _macros: MacroTable | null = null;

// Cached snapshots from the last recompute
let _cachedItemsSnap: Map<string, number> = new Map();
let _cachedSettingsSnap: Map<string, any> = new Map();
let _cachedErSnap: Map<string, string> = new Map();
let _cachedTricks: Set<string> = new Set();
let _cachedErMode = false;
let _cachedResolvedSpecial: Map<string, boolean> = new Map();

// ─── Public state ─────────────────────────────────────────────────────────────

export const logicEnabled   = writable<boolean>(localStorage.getItem('logicEnabled') === 'true');
export const showOutOfLogic = writable<boolean>(localStorage.getItem('showOutOfLogic') !== 'false');
/** Age filter for the logic view — child, adult, or both */
export const logicAgeFilter = writable<'child' | 'adult' | 'both'>(
  (localStorage.getItem('logicAgeFilter') as 'child' | 'adult' | 'both') ?? 'both'
);

/** Special conditions parsed from the spoiler log (BRIDGE, MOON, LACS, GANON_BK, MAJORA) */
export const specialConditionsStore = writable<SpecialConditionsMap | null>(
  JSON.parse(localStorage.getItem('spoilerSpecialConditions') ?? 'null')
);
specialConditionsStore.subscribe(v => {
  if (v !== null) localStorage.setItem('spoilerSpecialConditions', JSON.stringify(v));
});

// Tracker item IDs per special-condition category (matches subConditionItems in App.svelte)
const COND_ITEMS: Record<string, string[]> = {
  stones:         ['stone_emerald', 'stone_ruby', 'stone_sapphire'],
  medallions:     ['medal_forest', 'medal_fire', 'medal_water', 'medal_spirit', 'medal_shadow', 'medal_light'],
  remains:        ['remains_odolwa', 'remains_goht', 'remains_gyorg', 'remains_twinmold'],
  skullsGold:     ['skulltula_token'],
  skullsSwamp:    ['mm_skulltulla_woodfall'],
  skullsOcean:    ['mm_skulltulla_greatbay'],
  fairiesWF:      ['mm_woodfall_stray_fairy'],
  fairiesSH:      ['mm_snowhead_stray_fairy'],
  fairiesGB:      ['mm_greatbay_stray_fairy'],
  fairiesST:      ['mm_stonetower_stray_fairy'],
  fairyTown:      ['mm_clocktown_stray_fairy'],
  masksRegular:   ['mask_postman', 'mask_all_night', 'mask_blast', 'mask_stone', 'mask_great_fairy',
                   'mask_keaton', 'mask_bremen', 'mask_bunny', 'mask_don_gero', 'mask_circus_leader',
                   'mask_kafei', 'mask_couple', 'mask_truth_mm', 'mask_romani', 'mask_kamaro',
                   'mask_gibdo', 'mask_garo', 'mask_captain_hat', 'mask_giant', 'mask_scents', 'mask_spooky_mm'],
  masksTransform: ['mask_deku', 'mask_goron', 'mask_zora', 'mask_fierce_deity'],
  masksOot:       ['mask_keaton_oot', 'mask_skull_oot', 'mask_spooky_oot', 'mask_bunny_oot', 'mask_truth_oot',
                   'mask_goron_oot', 'mask_zora_oot', 'mask_gerudo_oot', 'trade_c_skull', 'trade_c_spooky',
                   'trade_c_bunny', 'trade_c_truth'],
  triforce:       ['sh_triforce', 'sh_triforce_courage', 'sh_triforce_power', 'sh_triforce_wisdom'],
  coinsRed:       ['coin_red'],
  coinsGreen:     ['coin_green'],
  coinsBlue:      ['coin_blue'],
  coinsYellow:    ['coin_yellow'],
};

function resolveSpecialConditions(
  conditions: SpecialConditionsMap,
  yItems: Map<string, number>,
): Map<string, boolean> {
  const result = new Map<string, boolean>();
  for (const [name, cond] of Object.entries(conditions)) {
    const enabledKeys = Object.keys(COND_ITEMS).filter(k => (cond as any)[k] === true);
    if (enabledKeys.length === 0 || cond.count <= 0) {
      result.set(name, false);
      continue;
    }
    const total = enabledKeys.reduce((sum, k) => {
      return sum + (COND_ITEMS[k] ?? []).reduce((s, id) => s + (yItems.get(id) ?? 0), 0);
    }, 0);
    result.set(name, total >= cond.count);
  }
  return result;
}

/** Manual logic settings — merged with spoiler settings (spoiler takes priority) */
const _storedSettings = JSON.parse(localStorage.getItem('logicManualSettings') ?? 'null');
export const logicManualSettings = writable<Record<string, any>>(
  _storedSettings ? { ...defaultLogicSettings(), ..._storedSettings } : defaultLogicSettings()
);

/** Enabled logic tricks — persisted locally, never synced (player-specific skill level) */
export const enabledTricks = writable<Set<string>>(
  new Set(JSON.parse(localStorage.getItem('enabledTricks') ?? '[]') as string[])
);

logicEnabled.subscribe(v => localStorage.setItem('logicEnabled', String(v)));
showOutOfLogic.subscribe(v => localStorage.setItem('showOutOfLogic', String(v)));
logicAgeFilter.subscribe(v => localStorage.setItem('logicAgeFilter', v));
logicManualSettings.subscribe(v => localStorage.setItem('logicManualSettings', JSON.stringify(v)));
enabledTricks.subscribe(v => localStorage.setItem('enabledTricks', JSON.stringify([...v])));

// ─── Result store ─────────────────────────────────────────────────────────────

export const logicResult  = writable<ReachabilityResult | null>(null);
export const logicLoading = writable<boolean>(false);

// ─── ER active settings (written by ERTracker, read by logic engine) ──────────
/** Active ER type flags — mirrors ERTracker's activeErSettings so the logic engine sees them. */
export const erActiveSettingsStore = writable<Record<string, boolean>>({});

// ─── ER mode detection ────────────────────────────────────────────────────────

const ER_SETTING_KEYS = [
  'erBoss', 'erDungeons', 'erGrottos', 'erIndoors', 'erOneWays',
  'erOverworld', 'erWallmasters', 'erAlterLw', 'erSpawns',
] as const;

function detectErMode(settings: Map<string, any>): boolean {
  return ER_SETTING_KEYS.some(k => !!settings.get(k));
}

// ─── Factory — called once from App.svelte ────────────────────────────────────

export function initLogicStore(
  yItems: YMap<number>,
  ySettings: YMap<any>,
  yEntrances: YMap<string>,
  itemsRev: Readable<number>,
  settingsStore: Readable<Map<string, any>>,
  entrancesStore: Readable<Map<string, string>>,
) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function recompute(enabled: boolean) {
    if (!enabled) { logicResult.set(null); return; }

    if (!_worldReady) {
      logicLoading.set(true);
      try {
        const { graph, macros } = await loadWorld();
        _graph = graph; _macros = macros; _worldReady = true;
      } catch (e) {
        console.error('[logic] Failed to load world:', e);
        logicLoading.set(false);
        return;
      }
      logicLoading.set(false);
    }

    const itemsSnap    = new Map(yItems.entries()) as Map<string, number>;
    const spoilerSnap  = new Map(get(settingsStore)) as Map<string, any>;
    const erSnap       = new Map(get(entrancesStore)) as Map<string, string>;
    const manualSnap   = get(logicManualSettings);

    // Merge priority: spoiler > erActive > manual
    const settingsSnap = new Map(spoilerSnap);
    const erActiveSnap = get(erActiveSettingsStore);
    // Logic expects select-type string values ('none' / non-'none') for these ER keys,
    // not booleans — map accordingly so setting(erBoss, none) evaluates correctly.
    const ER_SELECT_KEYS = new Set(['erBoss', 'erOverworld', 'erGrottos', 'erWallmasters']);
    for (const [k, v] of Object.entries(erActiveSnap)) {
      if (!settingsSnap.has(k)) {
        settingsSnap.set(k, ER_SELECT_KEYS.has(k) ? (v ? 'default' : 'none') : v);
      }
    }
    // Settings not in our tracker/UI but required by the logic engine
    if (!settingsSnap.has('erRegions'))          settingsSnap.set('erRegions', 'none');
    if (!settingsSnap.has('erWarps'))            settingsSnap.set('erWarps', 'none');
    // Always OoT+MM combined mode — gates cross-game song warps in world.json
    if (!settingsSnap.has('games'))              settingsSnap.set('games', 'ootmm');
    // Standard defaults for settings not in the UI
    if (!settingsSnap.has('shufflePotsMm'))      settingsSnap.set('shufflePotsMm', 'none');
    if (!settingsSnap.has('bombchuBehaviorMm'))  settingsSnap.set('bombchuBehaviorMm', 'bagFirst');
    // progressiveGoronLullaby is stored as a single key but logic expects per-game variants
    const goronLullaby = settingsSnap.get('progressiveGoronLullaby');
    if (goronLullaby !== undefined) {
      if (!settingsSnap.has('progressiveGoronLullabyMm'))  settingsSnap.set('progressiveGoronLullabyMm', goronLullaby);
      if (!settingsSnap.has('progressiveGoronLullabyOot')) settingsSnap.set('progressiveGoronLullabyOot', goronLullaby);
    }
    for (const [k, v] of Object.entries(manualSnap)) {
      if (!settingsSnap.has(k)) settingsSnap.set(k, v);
    }

    // Auto-derive alterLostWoodsExits: if any LW exit is mapped in the ER tracker, the setting is active
    if (!settingsSnap.get('alterLostWoodsExits')) {
      const hasLwMapping = [...erSnap.keys()].some(k => k.startsWith('OOT_LOST_WOODS_FROM_'));
      if (hasLwMapping) settingsSnap.set('alterLostWoodsExits', true);
    }

    const erMode = detectErMode(settingsSnap);
    const tricks = get(enabledTricks);
    const specials = get(specialConditionsStore);
    const resolvedSpecial = specials ? resolveSpecialConditions(specials, itemsSnap) : new Map<string, boolean>();

    _cachedItemsSnap = itemsSnap;
    _cachedSettingsSnap = settingsSnap;
    _cachedErSnap = erSnap;
    _cachedTricks = tricks;
    _cachedErMode = erMode;
    _cachedResolvedSpecial = resolvedSpecial;

    const state = buildLogicState(itemsSnap, settingsSnap, erSnap, tricks, erMode, resolvedSpecial);
    try {
      const result = computeReachability(_graph!, state, _macros!);
      logicResult.set(result);
    } catch (e) {
      console.error('[logic] reachability error:', e);
    }
  }

  function scheduleRecompute() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => recompute(get(logicEnabled)), 150);
  }

  itemsRev.subscribe(() => scheduleRecompute());
  settingsStore.subscribe(() => scheduleRecompute());
  entrancesStore.subscribe(() => scheduleRecompute());
  logicEnabled.subscribe(() => scheduleRecompute());
  logicManualSettings.subscribe(() => scheduleRecompute());
  erActiveSettingsStore.subscribe(() => scheduleRecompute());
  enabledTricks.subscribe(() => scheduleRecompute());
  specialConditionsStore.subscribe(() => scheduleRecompute());
  // age filter change does not require recompute — just re-reads the result
}

