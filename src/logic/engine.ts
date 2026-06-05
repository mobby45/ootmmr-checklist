import type { WorldGraph, WorldExit, LogicState, ReachabilityResult } from './types';
import type { MacroTable } from './expr/eval';
import { evalExpr } from './expr/eval';
import { resolveEntranceName } from './world';

// Starting regions — BFS begins here (from _system.yml analysis)
const SPAWN_REGIONS = ["Link's House", 'Clock Town South', 'GLOBAL'];

export function computeReachability(
  graph: WorldGraph,
  state: LogicState,
  macros: MacroTable,
): ReachabilityResult {
  const reachedRegions = new Set<string>();
  const reachedChecks  = new Set<string>();
  const reachedEvents  = new Set<string>(state.events);

  // BFS queue of region names
  const queue: string[] = [];

  function enqueue(regionName: string) {
    if (reachedRegions.has(regionName)) return;
    reachedRegions.add(regionName);
    queue.push(regionName);
  }

  // Seed from spawn points
  for (const spawn of SPAWN_REGIONS) {
    if (graph.has(spawn)) enqueue(spawn);
  }

  // BFS — repeat until stable (events can unlock new exits)
  let changed = true;
  while (changed) {
    changed = false;

    while (queue.length > 0) {
      const regionName = queue.shift()!;
      const region = graph.get(regionName);
      if (!region) continue;

      // Evaluate exits
      for (const exit of region.exits) {
        const target = resolveExitTarget(exit, state, graph);
        if (!target) continue;
        if (reachedRegions.has(target)) continue;
        if (evalExpr(exit.rule, state, macros)) {
          enqueue(target);
          changed = true;
        }
      }

      // Collect checks
      for (const loc of region.locations) {
        if (reachedChecks.has(loc.name)) continue;
        if (evalExpr(loc.rule, state, macros)) {
          reachedChecks.add(loc.name);
          changed = true;
        }
      }

      // Collect events — these can unlock further exits on the next BFS pass
      for (const ev of region.events) {
        if (reachedEvents.has(ev.name)) continue;
        if (evalExpr(ev.rule, state, macros)) {
          reachedEvents.add(ev.name);
          state = { ...state, events: reachedEvents }; // update state for subsequent evals
          changed = true;
        }
      }
    }

    // Re-scan all reached regions for newly unlocked exits/events
    if (changed) {
      for (const regionName of reachedRegions) {
        queue.push(regionName);
      }
    }
  }

  return { regions: reachedRegions, checks: reachedChecks, events: reachedEvents };
}

// Resolve an exit's actual target, applying ER overrides when present.
// The ER tracker stores: entranceId → destination entrance name (e.g. "OOT X to OOT Y").
// We resolve the name to a world region via name-based fuzzy matching.
function resolveExitTarget(
  exit: WorldExit,
  state: LogicState,
  graph: WorldGraph,
): string | null {
  if (!exit.entranceId) return exit.target;

  const override = state.erOverrides.get(exit.entranceId);
  if (!override) return exit.target; // vanilla

  // Resolve entrance name → destination region
  return resolveEntranceName(graph, override) ?? exit.target;
}
