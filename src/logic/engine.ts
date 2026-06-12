import type { WorldGraph, WorldExit, LogicState, ReachabilityResult } from './types';
import type { MacroTable } from './expr/eval';
import { evalExpr } from './expr/eval';
import { resolveEntranceName } from './world';

type Age = 'child' | 'adult';

// Spawn regions by age (from _system.yml)
const OOT_SPAWN = "Link's House";
const MM_SPAWN  = 'Clock Town South';
const GLOBAL    = 'GLOBAL';

// Build an age- and game-specific state copy
function stateForAge(base: LogicState, age: Age, events: Set<string>, game?: 'oot' | 'mm'): LogicState {
  return { ...base, age, events, currentGame: game };
}

export function computeReachability(
  graph: WorldGraph,
  state: LogicState,
  macros: MacroTable,
): ReachabilityResult {
  const reachedByAge: Record<Age, Set<string>> = { child: new Set(), adult: new Set() };
  const checksByAge: Record<Age, Set<string>> = { child: new Set(), adult: new Set() };
  // Shared event pool — events are world-state, not age-specific
  const events = new Set<string>(state.events);

  const queue: { regionName: string; age: Age }[] = [];

  function enqueue(regionName: string, age: Age) {
    if (!graph.has(regionName)) return;
    if (reachedByAge[age].has(regionName)) return;
    reachedByAge[age].add(regionName);
    queue.push({ regionName, age });
  }

  // Seed both ages from both games — the logic rules themselves gate age-specific access
  enqueue(OOT_SPAWN, 'child');
  enqueue(OOT_SPAWN, 'adult');
  enqueue(MM_SPAWN,  'child');
  enqueue(MM_SPAWN,  'adult');
  enqueue(GLOBAL,    'child');
  enqueue(GLOBAL,    'adult');

  // BFS — repeat until stable (new events can unlock new exits for either age)
  let changed = true;
  while (changed) {
    changed = false;

    while (queue.length > 0) {
      const { regionName, age } = queue.shift()!;
      const region = graph.get(regionName);
      if (!region) continue;

      const s = stateForAge(state, age, events, region.game);

      // Evaluate exits
      for (const exit of region.exits) {
        const target = resolveExitTarget(exit, state, graph);
        if (!target) continue;
        if (reachedByAge[age].has(target)) continue;
        if (evalExpr(exit.rule, s, macros)) {
          enqueue(target, age);
          changed = true;
        }
      }

      // Collect checks per age
      for (const loc of region.locations) {
        if (checksByAge[age].has(loc.name)) continue;
        if (evalExpr(loc.rule, s, macros)) {
          checksByAge[age].add(loc.name);
          changed = true;
        }
      }

      // Collect events (shared across ages)
      for (const ev of region.events) {
        if (events.has(ev.name)) continue;
        if (evalExpr(ev.rule, s, macros)) {
          events.add(ev.name);
          changed = true;
        }
      }
    }

    // Re-scan all reached regions when new events fire
    if (changed) {
      for (const age of ['child', 'adult'] as Age[]) {
        for (const regionName of reachedByAge[age]) {
          queue.push({ regionName, age });
        }
      }
    }
  }

  const reachedRegions = new Set([...reachedByAge.child, ...reachedByAge.adult]);
  return { regions: reachedRegions, childChecks: checksByAge.child, adultChecks: checksByAge.adult, events };
}

function resolveExitTarget(exit: WorldExit, state: LogicState, graph: WorldGraph): string | null {
  if (!exit.entranceId) return exit.target;
  const override = state.erOverrides.get(exit.entranceId);
  if (!override) {
    // ER mode: unmapped shuffled entrances are unknown — block BFS traversal
    if (state.erMode) return null;
    return exit.target;
  }
  return resolveEntranceName(graph, override) ?? exit.target;
}
