import type { WorldGraph, WorldRegion, WorldExit, LogicState, ReachabilityResult } from './types';
import type { MacroTable } from './expr/eval';
import { evalExpr } from './expr/eval';

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
// The ER tracker stores: entranceId → destination entrance name (full OoTMM name like "OOT X to OOT Y").
// We need to find which region that destination entrance leads FROM (= destination entrance's source region).
function resolveExitTarget(
  exit: WorldExit,
  state: LogicState,
  graph: WorldGraph,
): string | null {
  if (!exit.entranceId) return exit.target;

  const override = state.erOverrides.get(exit.entranceId);
  if (!override) return exit.target; // vanilla

  // override is a destination entrance NAME — find the region it leads to
  // by looking for an exit with a matching name in the graph
  // The convention: destination entrance name → we want the target of its REVERSE exit
  // i.e., if "OOT Kokiri Forest to OOT Deku Tree" is the destination,
  // the player ends up in "OOT Deku Tree Lobby" (the target of that entrance's exit).
  //
  // For now we store the region name directly if the world graph uses entrance IDs as keys.
  // This will be refined when the build script generates the world.json with proper cross-references.
  return override; // placeholder — will be resolved against world graph in fetch-logic.ts
}
