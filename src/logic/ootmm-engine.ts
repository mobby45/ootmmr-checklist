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
import { PRICE_RANGES } from '@ootmm/logic/price';
import { allEntrances, splitEntName } from '../data/entranceData';
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
  const split = splitEntName(e.name);
  if (!split) continue;
  const [rawSrc, rawDst] = split;
  const src = OOTMM_AREA_LABEL_OVERRIDES[rawSrc] ?? rawSrc;
  const dst = OOTMM_AREA_LABEL_OVERRIDES[rawDst] ?? rawDst;
  _entranceAreaMap.set(e.id, [src, dst]);
}

// ─── Shop price slot mapping ──────────────────────────────────────────────────
// Maps tracker check names (with OOT/MM prefix) to absolute indices in world.prices.
// Slot IDs match the shop_price(id) hex IDs used in OoTMM world YAML files.
// PRICE_RANGES.OOT_SHOPS = 0 (64 slots), PRICE_RANGES.MM_SHOPS = 106 (22 slots).

const _SHOP_PRICE_ENTRIES: Array<[string, string, number]> = [
  // OOT shops (wallet_price(OOT_SHOPS, id))
  ...Array.from({length: 8}, (_, i): [string, string, number] => [`OOT Kokiri Shop Item ${i+1}`,          'OOT_SHOPS', 0x00 + i]),
  ...Array.from({length: 8}, (_, i): [string, string, number] => [`OOT Market Bombchu Shop Item ${i+1}`,  'OOT_SHOPS', 0x08 + i]),
  ...Array.from({length: 8}, (_, i): [string, string, number] => [`OOT Zora Shop Item ${i+1}`,            'OOT_SHOPS', 0x10 + i]),
  ...Array.from({length: 8}, (_, i): [string, string, number] => [`OOT Goron Shop Item ${i+1}`,           'OOT_SHOPS', 0x18 + i]),
  ...Array.from({length: 8}, (_, i): [string, string, number] => [`OOT Market Bazaar Item ${i+1}`,        'OOT_SHOPS', 0x20 + i]),
  ...Array.from({length: 8}, (_, i): [string, string, number] => [`OOT Market Potion Shop Item ${i+1}`,   'OOT_SHOPS', 0x28 + i]),
  ...Array.from({length: 8}, (_, i): [string, string, number] => [`OOT Kakariko Bazaar Item ${i+1}`,      'OOT_SHOPS', 0x30 + i]),
  ...Array.from({length: 8}, (_, i): [string, string, number] => [`OOT Kakariko Potion Shop Item ${i+1}`, 'OOT_SHOPS', 0x38 + i]),
  // MM shops (wallet_price(MM_SHOPS, id))
  ['MM Bomb Shop Item 1',          'MM_SHOPS', 0x00],
  ['MM Bomb Shop Item 2',          'MM_SHOPS', 0x01],
  ['MM Bomb Shop Bomb Bag',        'MM_SHOPS', 0x02],
  ['MM Bomb Shop Bomb Bag 2',      'MM_SHOPS', 0x03],
  ['MM Curiosity Shop All-Night Mask', 'MM_SHOPS', 0x04],
  ...Array.from({length: 8}, (_, i): [string, string, number] => [`MM Trading Post Item ${i+1}`,     'MM_SHOPS', 0x05 + i]),
  ['MM Swamp Potion Shop Item 1',  'MM_SHOPS', 0x0d],
  ['MM Swamp Potion Shop Item 2',  'MM_SHOPS', 0x0e],
  ['MM Swamp Potion Shop Item 3',  'MM_SHOPS', 0x0f],
  ['MM Goron Shop Item 1',         'MM_SHOPS', 0x10],
  ['MM Goron Shop Item 2',         'MM_SHOPS', 0x11],
  ['MM Goron Shop Item 3',         'MM_SHOPS', 0x12],
  ['MM Zora Shop Item 1',          'MM_SHOPS', 0x13],
  ['MM Zora Shop Item 2',          'MM_SHOPS', 0x14],
  ['MM Zora Shop Item 3',          'MM_SHOPS', 0x15],
];

// Resolved at module load once PRICE_RANGES is available (populated by price.ts IIFE).
const _shopPriceSlots = new Map<string, number>(
  _SHOP_PRICE_ENTRIES.map(([name, range, slot]) => [name, PRICE_RANGES[range] + slot])
);

function injectShopPrices(world: World, shopPrices: Map<string, number> | undefined): World {
  const prices = [...world.prices];
  // Default untracked slots to 1 (cheapest non-free tier) so shops require at least
  // the minimum wallet but aren't gated by vanilla prices in a randomized game.
  // Using 0 would trigger price(range, id, 0)=true, bypassing wallet checks entirely.
  for (const slot of _shopPriceSlots.values()) {
    prices[slot] = 1;
  }
  if (shopPrices && shopPrices.size > 0) {
    for (const [name, price] of shopPrices) {
      const slot = _shopPriceSlots.get(name);
      if (slot !== undefined) prices[slot] = price;
    }
  }
  return { ...world, prices };
}

// ─── Settings conversion ───────────────────────────────────────────────────────

// Settings hash for world caching — computed from the parsed OoTMM Settings object
// (after makeSettings) so that tracker-specific display settings (PotShuffleOOT,
// ShopShuffleMM, etc.) that don't affect World structure never invalidate the cache.
function settingsKey(ootmmSettings: Settings): string {
  return JSON.stringify(Object.entries(ootmmSettings as unknown as Record<string, unknown>).sort((a, b) => a[0].localeCompare(b[0])));
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
// In-flight build promise — concurrent calls with the same key share one execution.
let _worldBuildInProgress: { key: string; promise: Promise<World[]> } | null = null;

// ─── Pathfinder state cache ────────────────────────────────────────────────────
// Caches the Pathfinder result separately from the world build.
// pfState only changes when items or world-affecting settings change — not when
// display-only settings (PotShuffleOOT, ShopShuffleMM…) change.

interface PfCache {
  key: string;
  state: PathfinderState;
}

let _pfCache: PfCache | null = null;

function makePfKey(
  worldKey: string,
  items: Map<string, number>,
  erOverrides: Map<string, string>,
  erMode: boolean,
  shopPrices: Map<string, number> | undefined,
): string {
  const iKey = JSON.stringify([...items.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  const erPart = erMode && erOverrides.size > 0
    ? JSON.stringify([...erOverrides.entries()].sort((a, b) => a[0].localeCompare(b[0])))
    : '';
  const pricesPart = shopPrices && shopPrices.size > 0
    ? JSON.stringify([...shopPrices.entries()].sort((a, b) => a[0].localeCompare(b[0])))
    : '';
  return `${worldKey}|${iKey}|${erPart}|${pricesPart}`;
}

async function buildOotmmWorld(settings: Settings, settingsStr: string): Promise<World[]> {
  if (_worldCache?.key === settingsStr) return _worldCache.worlds;
  if (_worldBuildInProgress?.key === settingsStr) return _worldBuildInProgress.promise;

  const promise = (async () => {
    const monitor = new Monitor({});
    const random = new Random();
    await random.seed('ootmm-tracker-world');
    // Yield a macrotask so the browser can repaint (e.g. show loading spinner)
    // before logicPassWorld blocks the main thread synchronously.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    const { worlds } = logicPassWorld({ monitor, settings, random });
    _worldCache = { key: settingsStr, worlds };
    return worlds;
  })();

  _worldBuildInProgress = { key: settingsStr, promise };
  try {
    return await promise;
  } finally {
    if (_worldBuildInProgress?.key === settingsStr) _worldBuildInProgress = null;
  }
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
  const ootmmSettings = toOotmmSettings(logicState.settings);
  const sKey = settingsKey(ootmmSettings);
  const baseWorlds = await buildOotmmWorld(ootmmSettings, sKey);

  // Apply tracker world patches (SPAWN exits + MM bridge), then ER overrides on top.
  const patched = patchTrackerWorld(baseWorlds);
  const erWorlds = logicState.erMode
    ? applyErOverrides(patched, logicState.erOverrides)
    : patched;

  // Inject custom shop prices from the spoiler log into world.prices so the Pathfinder
  // evaluates wallet requirements (price(range, id, tier)) against actual prices rather
  // than the vanilla defaults baked in by logicPassWorld.
  const pricedWorld = injectShopPrices(erWorlds[0], logicState.shopPrices);
  const worlds = pricedWorld !== erWorlds[0] ? [pricedWorld, ...erWorlds.slice(1)] : erWorlds;

  const cacheKey = makePfKey(sKey, logicState.items, logicState.erOverrides, logicState.erMode, logicState.shopPrices);
  let pfState: PathfinderState;
  if (_pfCache?.key === cacheKey) {
    pfState = _pfCache.state;
  } else {
    const playerItems = toPlayerItems(logicState.items);
    const pathfinder = new Pathfinder(worlds, ootmmSettings, new Map());
    pfState = pathfinder.run(null, { assumedItems: playerItems });
    _pfCache = { key: cacheKey, state: pfState };
  }

  return extractResult(pfState, worlds, patched[0], ootmmSettings, logicState);
}

// ─── Result extraction ─────────────────────────────────────────────────────────

function extractResult(
  pfState: PathfinderState,
  worlds: World[],
  baseWorld: World,
  settings: Settings,
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

  // Entrance reachability: an entrance slot is In Logic when its source area is reachable
  // AND the exit condition (items, events) for traversing that slot is satisfied.
  // We evaluate the exit expression directly from the base world (vanilla, pre-ER-override)
  // so we always have the condition even for mapped entrances (where applyErOverrides moved
  // the exit key). Items and events come from the ER-aware pfState so mappings are reflected.
  const ws0 = pfState.ws[0];
  const entranceReachability = new Map<string, boolean>();
  for (const [id, [srcArea, vanillaDstArea]] of _entranceAreaMap) {
    const exitExpr = baseWorld.areas[srcArea]?.exits[vanillaDstArea];
    if (!exitExpr) {
      entranceReachability.set(id, false);
      continue;
    }

    let accessible = false;
    for (const age of [AGE_CHILD, AGE_ADULT]) {
      const areaData = ws0.ages[age].areas.get(srcArea);
      if (!areaData) continue; // src area not reachable by this age

      const evalState = {
        settings,
        world: baseWorld,
        areaData,
        items: ws0.items,
        renewables: ws0.renewables,
        licenses: ws0.licenses,
        age,
        events: ws0.events,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((exitExpr as any).eval(evalState, { items: [], events: [] }).result) {
        accessible = true;
        break;
      }
    }
    entranceReachability.set(id, accessible);
  }

  // Post-filter: remove checks the player can't afford based on user-entered prices.
  // The Pathfinder only gates wallet via world.prices for OOT_SHOPS/MM_SHOPS ranges;
  // scrubs (OOT_SCRUBS), Tingle maps (MM_TINGLE) and merchants (OOT_MERCHANTS) use
  // vanilla prices from world.prices which don't reflect the actual randomized prices.
  // Applying the filter here covers all ranges uniformly.
  if (logicState.shopPrices.size > 0) {
    const items    = logicState.items;
    const lSettings = logicState.settings;
    const childW   = !!lSettings.get('childWallets');
    const colossal = !!lSettings.get('colossalWallets');
    const bottomless = !!lSettings.get('bottomlessWallets');
    const wallets  = Math.max(
      items.get('OOT_WALLET') ?? 0,
      items.get('MM_WALLET')  ?? 0,
      items.get('WALLET')     ?? 0,
    );
    const hasWallet = (n: number) => wallets >= (childW ? n : n - 1);

    for (const [checkName, price] of logicState.shopPrices) {
      if (price <= 0 || bottomless) continue;
      const canAfford =
        (price <= 99  && hasWallet(1)) ||
        (price <= 200 && hasWallet(2)) ||
        (price <= 500 && hasWallet(3)) ||
        (price <= 999 && colossal && hasWallet(4));
      if (!canAfford) {
        childChecks.delete(checkName);
        adultChecks.delete(checkName);
      }
    }
  }

  return {
    regions: new Set([...childRegions, ...adultRegions]),
    childRegions,
    adultRegions,
    childChecks,
    adultChecks,
    disabledChecks,
    events: pfState.ws[0].events,
    entranceReachability,
  };
}
