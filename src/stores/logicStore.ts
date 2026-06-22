import { writable, get, type Readable } from 'svelte/store';
import type { Map as YMap } from 'yjs';
import { loadWorld } from '../logic/world';
import { buildLogicState } from '../logic/state';
import { buildItemsMap } from '../logic/itemMapping';
import { computeReachabilityOotmm } from '../logic/ootmm-engine';
import type { ReachabilityResult } from '../logic/types';
import { defaultLogicSettings } from '../data/logicSettingsDef';
import type { SpecialConditionsMap } from '../util/spoilerParser';
import { TRICKS_DEFS } from '../data/tricksDef';

// ─── Shared world data (loaded once) ─────────────────────────────────────────

let _entranceMapsReady = false;

// ─── Public state ─────────────────────────────────────────────────────────────

export const logicEnabled     = writable<boolean>(localStorage.getItem('logicEnabled') === 'true');
export const showOutOfLogic   = writable<boolean>(localStorage.getItem('showOutOfLogic') !== 'false');
export const locationRulesStore  = writable<Map<string, string>>(new Map());
export const entranceRulesStore  = writable<Map<string, string>>(new Map());
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
const _validTrickIds = new Set(TRICKS_DEFS.map(t => t.id));
const _storedTricks = (JSON.parse(localStorage.getItem('enabledTricks') ?? '[]') as string[])
  .filter(id => _validTrickIds.has(id));
export const enabledTricks = writable<Set<string>>(new Set(_storedTricks));

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
  ySongEvents?: YMap<string>,
  yShopPrices?: YMap<number>,
) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingDelay = 150;

  async function recompute(enabled: boolean) {
    if (!enabled) { logicResult.set(null); return; }

    // Track whether this is the first load — logicLoading must stay true
    // through the full first world build (loadWorld + logicPassWorld), otherwise
    // the spinner disappears before the synchronous logicPassWorld freeze.
    const isFirstLoad = !_entranceMapsReady;
    if (isFirstLoad) {
      logicLoading.set(true);
      try {
        const { locationRules, entranceRules } = await loadWorld();
        _entranceMapsReady = true;
        locationRulesStore.set(locationRules);
        entranceRulesStore.set(entranceRules);
      } catch (e) {
        console.error('[logic] Failed to load world:', e);
        logicLoading.set(false);
        return;
      }
      // Keep logicLoading true — cleared in finally below after world build
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
    // ageChange default is 'none' in OoTMM but that blocks TIME_TRAVEL_AT_WILL entirely.
    // 'always' lets the Pathfinder propagate adult into child areas once ToT is reachable.
    if (!settingsSnap.has('ageChange'))          settingsSnap.set('ageChange', 'always');
    // Standard defaults for settings not in the UI
    if (!settingsSnap.has('shufflePotsMm'))      settingsSnap.set('shufflePotsMm', 'none');
    // sharedBombchu in logic = sharedBombchuBags in tracker/spoilerMappings
    if (!settingsSnap.has('sharedBombchu') && settingsSnap.has('sharedBombchuBags')) {
      settingsSnap.set('sharedBombchu', settingsSnap.get('sharedBombchuBags'));
    }
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

    const songEventsSnap = ySongEvents ? new Map(ySongEvents.entries()) as Map<string, string> : new Map<string, string>();
    // Shop prices are keyed by full check name including game prefix ("OOT Kokiri Shop Item 1",
    // "MM Trading Post Item 1", etc.) so OOT vs MM shops with the same base name don't collide.
    const shopPricesSnap = yShopPrices
      ? new Map(yShopPrices.entries()) as Map<string, number>
      : new Map<string, number>();
    const state = buildLogicState(itemsSnap, settingsSnap, erSnap, tricks, erMode, resolvedSpecial, undefined, songEventsSnap, shopPricesSnap, specials ?? null);
    try {
      const result = await computeReachabilityOotmm(state);
      logicResult.set(result);
    } catch (e) {
      console.error('[logic] reachability error:', e);
    } finally {
      if (isFirstLoad) logicLoading.set(false);
    }
  }

  function scheduleRecompute(delay = 150) {
    if (debounceTimer) clearTimeout(debounceTimer);
    pendingDelay = Math.max(pendingDelay, delay);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      pendingDelay = 150;
      recompute(get(logicEnabled));
    }, pendingDelay);
  }

  // Items/entrances: 150ms — world is cached, pfState reruns
  itemsRev.subscribe(() => scheduleRecompute(150));
  entrancesStore.subscribe(() => scheduleRecompute(150));
  if (ySongEvents) ySongEvents.observe(() => scheduleRecompute(150));
  if (yShopPrices) yShopPrices.observe(() => scheduleRecompute(150));
  // Settings: 200ms — display-only settings hit pfState cache (fast); logic settings
  // may rebuild world/pfState but 600ms felt sluggish for display toggles.
  // Note: logicManualSettings is NOT subscribed here — App.svelte's $: block syncs
  // it to Yjs on every change, which fires settingsStore below. Subscribing both
  // caused two recompute cycles (logicManualSettings fires sync, settingsStore fires
  // one microtask later — debounce absorbs them but the expired timer handle trick
  // caused a second world build).
  settingsStore.subscribe(() => scheduleRecompute(200));
  erActiveSettingsStore.subscribe(() => scheduleRecompute(200));
  enabledTricks.subscribe(() => scheduleRecompute(200));
  specialConditionsStore.subscribe(() => scheduleRecompute(200));
  logicEnabled.subscribe(() => scheduleRecompute(150));
  // age filter change does not require recompute — just re-reads the result
}

