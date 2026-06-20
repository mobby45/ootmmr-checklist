import type { Settings, PlayerItems } from '@ootmm/core';
import type { World } from '@ootmm/logic/world/types';
import type { PathfinderState } from '@ootmm/logic/pathfind/pathfind';
import type { LogicState, ReachabilityResult } from './types';

import { Monitor, Random, Items, makePlayerItem } from '@ootmm/core';
import { makeSettings } from '@ootmm/core';
import { logicPassWorld } from '@ootmm/logic/world/builder';
import { Pathfinder } from '@ootmm/logic/pathfind/pathfind';
import { AGE_CHILD, AGE_ADULT } from '@ootmm/logic/age';
import { exprAge, exprAnd, exprEvent, exprTrue } from '@ootmm/logic/expr/builder';
import { allEntrances } from '../data/entranceData';
import { isLocationEnabled } from './engine';

// These corrections match the ones in scripts/fetch-logic.ts (LOCATION_CORRECTIONS).
// They map OoTMM location names (no game prefix) to our tracker names.
const OOTMM_LOC_TO_TRACKER: Record<string, string> = {
  'MQ Shadow Temple SR Spikes Northwest Corner':   'MQ Shadow Temple SR Spikes Left Corner',
  'MQ Shadow Temple SR Spikes Southwest Wall':     'MQ Shadow Temple SR Spikes Left Wall',
  'MQ Shadow Temple SR Spikes West Midair':        'MQ Shadow Temple SR Spikes Left Midair',
  'MQ Shadow Temple SR Spikes Ceiling':            'MQ Shadow Temple SR Spikes Center Platforms',
  'MQ Shadow Temple SR Spikes South Midair':       'MQ Shadow Temple SR Spikes Front Midair',
  'MQ Shadow Temple SR Spikes East Ground':        'MQ Shadow Temple SR Spikes Right Ground',
  'MQ Shadow Temple SR Spikes Northeast Wall':     'MQ Shadow Temple SR Spikes Right Back Wall',
  'MQ Shadow Temple SR Spikes East Wall':          'MQ Shadow Temple SR Spikes Right Lateral Wall',
  'Secret Shrine Dinolfos Chest':                  'Secret Shrine Dinalfos Chest',
};

// These corrections handle cases where our entrance names use area labels that differ
// from OoTMM's actual area names (identical to REGION_NAME_OVERRIDES in world.ts but
// applied to prefixed OoTMM area names).
const OOTMM_AREA_LABEL_OVERRIDES: Record<string, string> = {
  'OOT Lake Hylia Shortcut':                'OOT Lake Hylia Near Shortcut',
  "OOT Dog Lady's House":                   'OOT Dog Lady House',
  "MM Mayor's Office":                      "MM Mayor's Residence Office",
  'MM Clock Town East Stock Pot Inn Roof':  'MM Stock Pot Inn Roof',
  'MM Great Bay Coast Near Cow Grotto':     'MM GBC Near Cow Grotto',
  'MM Mountain Village Winter':             'MM Mountain Village',
};

// Build a map from entrance ID → [srcArea, vanillaDestArea] in OoTMM area name format.
// Computed once at module load since entranceData is static.
const _entranceAreaMap = new Map<string, [string, string]>();
for (const e of allEntrances) {
  const idx = e.name.lastIndexOf(' to ');
  if (idx === -1) continue;
  const rawSrc = e.name.slice(0, idx);
  const rawDst = e.name.slice(idx + 4);
  const src = OOTMM_AREA_LABEL_OVERRIDES[rawSrc] ?? rawSrc;
  const dst = OOTMM_AREA_LABEL_OVERRIDES[rawDst] ?? rawDst;
  _entranceAreaMap.set(e.id, [src, dst]);
}

// ─── Settings conversion ───────────────────────────────────────────────────────

// Settings hash used for caching the built OoTMM World per unique settings combo.
// We serialize only the keys that affect world structure (anything that exprSetting()
// or logicPassWorld reads). We use the full settings Map but only include recognised
// OoTMM keys (tracker-specific keys like PotShuffleOOT are not in makeSettings and
// are silently ignored by applyBaseSettings, so they don't affect caching).
function settingsKey(settings: Map<string, any>): string {
  return JSON.stringify([...settings.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

export function toOotmmSettings(settings: Map<string, any>): Settings {
  const partial: Record<string, any> = {};
  for (const [k, v] of settings) {
    partial[k] = v;
  }
  // Force single-player ootmm mode
  partial.mode = 'single';
  partial.players = 1;
  return makeSettings(partial as Parameters<typeof makeSettings>[0]);
}

// ─── World cache ───────────────────────────────────────────────────────────────

interface WorldCache {
  key: string;
  worlds: World[];
}

let _worldCache: WorldCache | null = null;

async function buildOotmmWorld(settings: Settings, settingsStr: string): Promise<World[]> {
  if (_worldCache?.key === settingsStr) return _worldCache.worlds;

  const monitor = new Monitor({});
  const random = new Random();
  // Seed with a deterministic value — we only need the World structure,
  // not truly random prices. The seed affects shop prices but not logic reachability.
  await random.seed('ootmm-tracker-world');

  const { worlds } = logicPassWorld({ monitor, settings, random });
  _worldCache = { key: settingsStr, worlds };
  return worlds;
}

// ─── Items conversion ──────────────────────────────────────────────────────────

function toPlayerItems(items: Map<string, number>): PlayerItems {
  const result: PlayerItems = new Map();

  function addItem(itemId: string, count: number) {
    const item = (Items as Record<string, any>)[itemId];
    if (!item) return;
    const pi = makePlayerItem(item, 0);
    const prev = result.get(pi) ?? 0;
    result.set(pi, Math.max(prev, count));
  }

  const GAME_PREFIXES = ['OOT_', 'MM_', 'SHARED_'];

  for (const [itemId, count] of items) {
    if (count <= 0) continue;
    // itemMapping.ts emits some IDs without game prefix (e.g. 'OCARINA', 'SONG_SOARING').
    // logicPassWorld compiles has(X) → has(OOT_X) / has(MM_X) via gameId(), so we must
    // provide both prefixed variants for unprefixed items.
    if (GAME_PREFIXES.some(p => itemId.startsWith(p))) {
      addItem(itemId, count);
    } else {
      addItem('OOT_' + itemId, count);
      addItem('MM_' + itemId, count);
    }
  }
  return result;
}

// ─── ER override injection ─────────────────────────────────────────────────────

// Returns shallow-copied worlds with ER overrides applied without mutating the cache.
// Expr objects are shared (read-only), only the container objects are copied.
function applyErOverrides(baseWorlds: World[], erOverrides: Map<string, string>): World[] {
  if (erOverrides.size === 0) return baseWorlds;

  // Shallow-copy worlds and their areas maps (we only deep-copy exits we modify)
  const worlds = baseWorlds.map(world => ({
    ...world,
    areas: { ...world.areas },
  }));

  for (const [entranceId, destEntranceName] of erOverrides) {
    const parts = _entranceAreaMap.get(entranceId);
    if (!parts) continue;
    const [srcArea, vanillaDestArea] = parts;

    const idx = destEntranceName.lastIndexOf(' to ');
    if (idx === -1) continue;
    const rawNewDest = destEntranceName.slice(idx + 4);
    const newDestArea = OOTMM_AREA_LABEL_OVERRIDES[rawNewDest] ?? rawNewDest;

    for (const world of worlds) {
      const area = world.areas[srcArea];
      if (!area) continue;
      const expr = area.exits[vanillaDestArea];
      if (!expr) continue;
      // Shallow-copy this area's exits so we don't mutate the cached base world
      const newExits = { ...area.exits };
      delete newExits[vanillaDestArea];
      newExits[newDestArea] = expr;
      world.areas[srcArea] = { ...area, exits: newExits };
    }
  }

  return worlds;
}

// ─── Spawn patch ──────────────────────────────────────────────────────────────

// The tracker needs three unconditional access patches that bypass OoTMM's
// randomizer assumptions:
//
// 1. OOT SPAWN → SPAWN CHILD/ADULT: OoTMM gates the non-starting age behind
//    event(TIME_TRAVEL), which requires Master Sword (timeTravelSword is forced
//    true by makeSettings when swordlessAdult=false). We keep child unconditional
//    and gate adult only on Door of Time being open (Song of Time).
//
// 2. OOT GLOBAL → MM SOARING: the cross-game bridge requires can_play_soaring
//    (= OOT_SONG_SOARING). The old BFS engine seeded MM directly; we replicate
//    that by making this exit unconditional so MM is always reachable.
function patchTrackerWorld(baseWorlds: World[]): World[] {
  const worlds = baseWorlds.map(world => ({
    ...world,
    areas: { ...world.areas },
  }));

  for (const world of worlds) {
    const spawn = world.areas['OOT SPAWN'];
    if (spawn) {
      world.areas['OOT SPAWN'] = {
        ...spawn,
        exits: {
          ...spawn.exits,
          'OOT SPAWN CHILD': exprAge(AGE_CHILD),
          'OOT SPAWN ADULT': exprAnd([exprAge(AGE_ADULT), exprEvent('OOT_DOOR_OF_TIME_OPEN')]),
        },
      };
    }

    const global = world.areas['OOT GLOBAL'];
    if (global) {
      world.areas['OOT GLOBAL'] = {
        ...global,
        exits: {
          ...global.exits,
          'MM SOARING': exprTrue(),
          // Seed MM Clock Town South directly — mirrors the old BFS engine.
          'MM Clock Town South': exprTrue(),
        },
      };
    }

  }

  return worlds;
}

// ─── Location name conversion ──────────────────────────────────────────────────

function ootmmLocToTracker(ootmmLoc: string): string {
  const name = ootmmLoc.replace(/^(?:OOT|MM) /, '');
  return OOTMM_LOC_TO_TRACKER[name] ?? name;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function computeReachabilityOotmm(
  logicState: LogicState,
): Promise<ReachabilityResult> {
  const sKey = settingsKey(logicState.settings);
  const ootmmSettings = toOotmmSettings(logicState.settings);
  const baseWorlds = await buildOotmmWorld(ootmmSettings, sKey);

  // Apply tracker world patches (SPAWN exits + MM bridge), then ER overrides on top.
  const patched = patchTrackerWorld(baseWorlds);
  const worlds = logicState.erMode
    ? applyErOverrides(patched, logicState.erOverrides)
    : patched;

  const playerItems = toPlayerItems(logicState.items);
  const pathfinder = new Pathfinder(worlds, ootmmSettings, new Map());
  const pfState: PathfinderState = pathfinder.run(null, { assumedItems: playerItems });

  return extractResult(pfState, worlds, logicState);
}

// ─── Result extraction ─────────────────────────────────────────────────────────

function extractResult(
  pfState: PathfinderState,
  worlds: World[],
  logicState: LogicState,
): ReachabilityResult {
  const world = worlds[0];
  const childAreas = pfState.ws[0].ages[AGE_CHILD].areas;
  const adultAreas = pfState.ws[0].ages[AGE_ADULT].areas;
  const reachableLocs = pfState.ws[0].locations;

  // Build location → area map from world
  const locToArea = new Map<string, string>();
  for (const [areaName, worldArea] of Object.entries(world.areas)) {
    for (const locName of Object.keys(worldArea.locations)) {
      locToArea.set(locName, areaName);
    }
  }

  const childChecks = new Set<string>();
  const adultChecks = new Set<string>();
  const disabledChecks = new Set<string>();

  for (const [areaName, worldArea] of Object.entries(world.areas)) {
    const isChildArea = childAreas.has(areaName);
    const isAdultArea = adultAreas.has(areaName);

    for (const ootmmLoc of Object.keys(worldArea.locations)) {
      const trackerName = ootmmLocToTracker(ootmmLoc);

      if (!isLocationEnabled(trackerName, worldArea.game, logicState)) {
        disabledChecks.add(trackerName);
        continue;
      }

      if (!reachableLocs.has(ootmmLoc)) continue;

      // Approximate per-age: if the age can reach the area, the location is accessible.
      // Rare age-restricted locations (is_child/is_adult in the location expression)
      // might be slightly misattributed, but area-level restrictions cover most cases.
      if (isChildArea) childChecks.add(trackerName);
      if (isAdultArea) adultChecks.add(trackerName);
    }
  }

  // Regions: strip game prefix from OoTMM area names
  const stripPrefix = (s: string) => s.replace(/^(?:OOT|MM) /, '');
  const childRegions = new Set([...childAreas.keys()].map(stripPrefix));
  const adultRegions = new Set([...adultAreas.keys()].map(stripPrefix));

  return {
    regions: new Set([...childRegions, ...adultRegions]),
    childRegions,
    adultRegions,
    childChecks,
    adultChecks,
    disabledChecks,
    events: pfState.ws[0].events,
  };
}
