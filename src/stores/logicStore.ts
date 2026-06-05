import { writable, get, type Readable } from 'svelte/store';
import type { Map as YMap } from 'yjs';
import { loadWorld } from '../logic/world';
import { buildLogicState } from '../logic/state';
import { computeReachability } from '../logic/engine';
import type { ReachabilityResult } from '../logic/types';
import type { MacroTable } from '../logic/expr/eval';
import type { WorldGraph } from '../logic/types';
import { defaultLogicSettings } from '../data/logicSettingsDef';

// ─── Shared world data (loaded once) ─────────────────────────────────────────

let _worldReady = false;
let _graph: WorldGraph | null = null;
let _macros: MacroTable | null = null;

// ─── Public state ─────────────────────────────────────────────────────────────

export const logicEnabled   = writable<boolean>(localStorage.getItem('logicEnabled') === 'true');
export const showOutOfLogic = writable<boolean>(localStorage.getItem('showOutOfLogic') !== 'false');
/** Age filter for the logic view — child or adult */
export const logicAgeFilter = writable<'child' | 'adult'>(
  (localStorage.getItem('logicAgeFilter') as 'child' | 'adult') ?? 'child'
);

/** Manual logic settings — merged with spoiler settings (spoiler takes priority) */
export const logicManualSettings = writable<Record<string, any>>(
  JSON.parse(localStorage.getItem('logicManualSettings') ?? 'null') ?? defaultLogicSettings()
);

logicEnabled.subscribe(v => localStorage.setItem('logicEnabled', String(v)));
showOutOfLogic.subscribe(v => localStorage.setItem('showOutOfLogic', String(v)));
logicAgeFilter.subscribe(v => localStorage.setItem('logicAgeFilter', v));
logicManualSettings.subscribe(v => localStorage.setItem('logicManualSettings', JSON.stringify(v)));

// ─── Result store ─────────────────────────────────────────────────────────────

export const logicResult  = writable<ReachabilityResult | null>(null);
export const logicLoading = writable<boolean>(false);

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

    // Merge: spoiler settings take priority; manual fills in missing keys
    const settingsSnap = new Map(spoilerSnap);
    for (const [k, v] of Object.entries(manualSnap)) {
      if (!settingsSnap.has(k)) settingsSnap.set(k, v);
    }

    const state  = buildLogicState(itemsSnap, settingsSnap, erSnap);
    const result = computeReachability(_graph!, state, _macros!);
    logicResult.set(result);
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
  // age filter change does not require recompute — just re-reads the result
}
