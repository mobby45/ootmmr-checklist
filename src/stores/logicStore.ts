import { writable, derived, get, type Readable } from 'svelte/store';
import type { Map as YMap } from 'yjs';
import { loadWorld } from '../logic/world';
import { buildLogicState } from '../logic/state';
import { computeReachability } from '../logic/engine';
import type { ReachabilityResult } from '../logic/types';
import type { MacroTable } from '../logic/expr/eval';
import type { WorldGraph } from '../logic/types';

// ─── Shared world data (loaded once) ─────────────────────────────────────────

let _worldReady = false;
let _graph: WorldGraph | null = null;
let _macros: MacroTable | null = null;

// ─── Public state ─────────────────────────────────────────────────────────────

export const logicEnabled     = writable<boolean>(localStorage.getItem('logicEnabled') === 'true');
export const showOutOfLogic   = writable<boolean>(localStorage.getItem('showOutOfLogic') !== 'false'); // default ON
export const logicAge         = writable<'child' | 'adult'>(
  (localStorage.getItem('logicAge') as 'child' | 'adult') ?? 'child'
);

logicEnabled.subscribe(v => localStorage.setItem('logicEnabled', String(v)));
showOutOfLogic.subscribe(v => localStorage.setItem('showOutOfLogic', String(v)));
logicAge.subscribe(v => localStorage.setItem('logicAge', v));

// ─── Result store ─────────────────────────────────────────────────────────────

export const logicResult = writable<ReachabilityResult | null>(null);
export const logicLoading = writable<boolean>(false);

// ─── Factory — called once from App.svelte ────────────────────────────────────

export function initLogicStore(
  yItems: YMap<number>,
  ySettings: YMap<any>,
  yEntrances: YMap<string>,
  /** A readable store that increments when any yItems change (use _itemsRevStore) */
  itemsRev: Readable<number>,
  settingsStore: Readable<Map<string, any>>,
  entrancesStore: Readable<Map<string, string>>,
) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function recompute(enabled: boolean, age: 'child' | 'adult') {
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
    const settingsSnap = new Map(get(settingsStore)) as Map<string, any>;
    const erSnap       = new Map(get(entrancesStore)) as Map<string, string>;

    const state = buildLogicState(itemsSnap, settingsSnap, erSnap, age);
    const result = computeReachability(_graph!, state, _macros!);
    logicResult.set(result);
  }

  function scheduleRecompute() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const enabled = get(logicEnabled);
      const age     = get(logicAge);
      recompute(enabled, age);
    }, 150);
  }

  // Subscribe to all change sources
  itemsRev.subscribe(() => scheduleRecompute());
  settingsStore.subscribe(() => scheduleRecompute());
  entrancesStore.subscribe(() => scheduleRecompute());
  logicEnabled.subscribe(() => scheduleRecompute());
  logicAge.subscribe(() => scheduleRecompute());
}
