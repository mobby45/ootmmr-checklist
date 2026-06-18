import type { WorldGraph, WorldExit, LogicState, ReachabilityResult, ExprNode } from './types';
import type { MacroTable } from './expr/eval';
import { evalExpr } from './expr/eval';
import { resolveEntranceName, resolveEntranceSource } from './world';

type Age = 'child' | 'adult';

// MM period bitmask: bit 0=Day1, 1=Night1, 2=Day2, 3=Night2, 4=Day3, 5=Night3
const ALL_PERIODS = 0x3F;
// Period names for computing initial timeMask from clock macros (matches MM_PERIODS in eval.ts)
const PERIOD_NAMES = ['day1', 'night1', 'day2', 'night2', 'day3', 'night3'] as const;

const OOT_SPAWN = "Link's House";
const MM_SPAWN  = 'Clock Town South';
const GLOBAL    = 'GLOBAL';

function stateForAge(base: LogicState, age: Age, events: Set<string>, timeMask: number, game?: 'oot' | 'mm'): LogicState {
  return { ...base, age, events, timeMask, currentGame: game };
}

// Compute the starting timeMask from the player's clock items.
// With clocks off, all 6 periods are always accessible.
// With clocks on, evaluate each clock_* macro against the player's items to determine
// which periods they can reach. Day1 is always included (starting period of every cycle).
function computeInitialTimeMask(baseState: LogicState, macros: MacroTable): number {
  if (!baseState.settings.get('clocks')) return ALL_PERIODS;
  // Use a temporary state with ALL_PERIODS so clock_* macros (which are pure item checks,
  // no mm_time dependency) evaluate correctly without circular issues.
  const tempState: LogicState = { ...baseState, timeMask: ALL_PERIODS };
  let mask = 0;
  for (let i = 0; i < 6; i++) {
    const m = macros.get('clock_' + PERIOD_NAMES[i]);
    if (m && typeof m !== 'function' && evalExpr(m, tempState, macros)) {
      mask |= (1 << i);
    }
  }
  // Day1 (bit 0) is always accessible — players begin every cycle on Day1.
  return mask | 1;
}

// For each period bit set in sourceTimeMask, evaluate the exit rule independently.
// Returns a bitmask of the periods that can successfully traverse this exit.
// This correctly handles time-gated ORs: e.g. `after(DAY3) || can_use_keg` with no keg
// will only let Day3/Night3 bits through, not Day1 (even though the full mask would pass).
function computeExitTimeMask(
  rule: ExprNode,
  sourceTimeMask: number,
  baseState: LogicState,
  macros: MacroTable,
): number {
  let destMask = 0;
  for (let bit = 0; bit < 6; bit++) {
    const periodBit = 1 << bit;
    if (!(sourceTimeMask & periodBit)) continue;
    if (evalExpr(rule, { ...baseState, timeMask: periodBit }, macros)) {
      destMask |= periodBit;
    }
  }
  return destMask;
}

export function computeReachability(
  graph: WorldGraph,
  state: LogicState,
  macros: MacroTable,
): ReachabilityResult {
  // Per-age accumulated timeMasks: region name → bitmask of accessible MM periods.
  // A region is "reached" by an age if its entry exists here (with any non-zero mask).
  const reachedTimeMask: Record<Age, Map<string, number>> = {
    child: new Map(),
    adult: new Map(),
  };
  const checksByAge: Record<Age, Set<string>> = { child: new Set(), adult: new Set() };
  const events = new Set<string>(state.events);

  const initialTimeMask = computeInitialTimeMask(state, macros);
  const queue: { regionName: string; age: Age; timeMask: number }[] = [];

  // Enqueue a region with a timeMask. Only the bits not yet in the region's accumulated
  // mask are actually enqueued — prevents re-processing periods already explored.
  function enqueue(regionName: string, age: Age, timeMask: number) {
    if (!graph.has(regionName)) return;
    const current = reachedTimeMask[age].get(regionName) ?? 0;
    const newBits = timeMask & ~current;
    if (newBits === 0) return;
    reachedTimeMask[age].set(regionName, current | timeMask);
    queue.push({ regionName, age, timeMask: newBits });
  }

  // Seed spawn regions
  if (state.erMode) {
    if (state.settings.get('erSpawns')) {
      const childDest = state.erOverrides.get('OOT_SPAWN_CHILD');
      const adultDest = state.erOverrides.get('OOT_SPAWN_ADULT');
      if (childDest) { const r = resolveEntranceSource(graph, childDest); if (r) enqueue(r, 'child', initialTimeMask); }
      if (adultDest) { const r = resolveEntranceSource(graph, adultDest); if (r) enqueue(r, 'adult', initialTimeMask); }
    } else {
      enqueue(OOT_SPAWN, 'child', initialTimeMask);
      enqueue(OOT_SPAWN, 'adult', initialTimeMask);
    }
    // MM is never seeded directly in ER mode — must be reached via cross-game exits from OoT
  } else {
    enqueue(OOT_SPAWN, 'child', initialTimeMask);
    enqueue(OOT_SPAWN, 'adult', initialTimeMask);
    enqueue(MM_SPAWN,  'child', initialTimeMask);
    enqueue(MM_SPAWN,  'adult', initialTimeMask);
  }
  enqueue(GLOBAL, 'child', initialTimeMask);
  enqueue(GLOBAL, 'adult', initialTimeMask);

  // BFS — repeat full passes until no new events are discovered.
  // New regions/timeMask-bits are enqueued directly within the current pass.
  // Only new events can unlock exits in already-processed regions, requiring a full restart.
  let eventFound = true;
  let qi = 0;
  while (eventFound) {
    eventFound = false;

    while (qi < queue.length) {
      const { regionName, age, timeMask } = queue[qi++];
      const region = graph.get(regionName);
      if (!region) continue;

      // Base state for this region/age/events (timeMask overridden per-use below)
      const baseS = stateForAge(state, age, events, 0, region.game);

      // Evaluate exits using only the new timeMask bits (timeMask = newBits from enqueue).
      // computeExitTimeMask evaluates per-period to determine which periods flow through.
      for (const exit of region.exits) {
        const target = resolveExitTarget(exit, state, graph);
        if (!target) continue;
        const destTimeMask = computeExitTimeMask(exit.rule, timeMask, baseS, macros);
        if (destTimeMask !== 0) enqueue(target, age, destTimeMask);
      }

      // Evaluate checks and events with the FULL accumulated timeMask for this region,
      // so a check is considered in-logic if it's doable in ANY period the region is reachable.
      const fullTimeMask = reachedTimeMask[age].get(regionName) ?? timeMask;
      const sCheck = { ...baseS, timeMask: fullTimeMask };

      for (const loc of region.locations) {
        if (checksByAge[age].has(loc.name)) continue;
        if (!isLocationEnabled(loc.name, region.game, state)) continue;
        const customPrice = state.shopPrices.get(loc.name);
        if (customPrice !== undefined && !canAffordCustomPrice(customPrice, sCheck)) continue;
        if (evalExpr(loc.rule, sCheck, macros)) checksByAge[age].add(loc.name);
      }

      for (const ev of region.events) {
        if (events.has(ev.name)) continue;
        if (evalExpr(ev.rule, sCheck, macros)) {
          events.add(ev.name);
          eventFound = true;
        }
      }
    }

    // Restart: re-push all reached regions with their accumulated timeMasks so that
    // exits blocked by missing events can now be re-evaluated. enqueue() deduplication
    // ensures destinations only gain genuinely new period bits.
    if (eventFound) {
      queue.length = 0;
      qi = 0;
      for (const age of ['child', 'adult'] as Age[]) {
        for (const [regionName, mask] of reachedTimeMask[age]) {
          queue.push({ regionName, age, timeMask: mask });
        }
      }
    }
  }

  const childRegions = new Set(reachedTimeMask.child.keys());
  const adultRegions = new Set(reachedTimeMask.adult.keys());
  return {
    regions: new Set([...childRegions, ...adultRegions]),
    childRegions,
    adultRegions,
    childChecks: checksByAge.child,
    adultChecks: checksByAge.adult,
    events,
  };
}

// Returns true if the player's wallet can cover the given rupee cost.
// Mirrors the wallet_price macro: 99r base, 200r with 1 wallet, 500r with 2, 999r with 3 + colossalWallets.
// childWallets shifts every tier up by 1 (even cheap items need a wallet).
function canAffordCustomPrice(price: number, state: LogicState): boolean {
  if (price <= 0) return true;
  if (state.settings.get('bottomlessWallets')) return true;
  if (!state.events.has('RUPEES')) return false;
  const wallets = Math.max(
    (state.items.get('OOT_WALLET') ?? 0),
    (state.items.get('MM_WALLET')  ?? 0),
    (state.items.get('SHARED_WALLET') ?? 0),
  );
  const childW = !!state.settings.get('childWallets');
  // has_wallet(n) with childWallets=false: needs (n-1) wallets; with true: needs n wallets.
  const hasWallet = (n: number) => wallets >= (childW ? n : n - 1);
  if (price <= 99  && hasWallet(1)) return true;
  if (price <= 200 && hasWallet(2)) return true;
  if (price <= 500 && hasWallet(3)) return true;
  if (price <= 999 && hasWallet(4) && state.settings.get('colossalWallets')) return true;
  return false;
}

// Checks whose world.json rule is "true" but are only in the pool when a shuffle setting is on.
// OoTMM builds per-seed worlds dynamically; our static world.json includes everything.
const POT_RE      = /\bPot\b/;
const CRATE_RE    = /\bCrate\b/;
const GRASS_RE    = /\bGrass\b/;
const TCG_ROOM_RE = /^Treasure Chest Game (Room \d|HP)/;

// Per-game collectible shuffle filters (boolean settings — off when absent from hash).
// /\bHeart (?!Container)/ matches free heart drops but not Heart Containers (rule ≠ "true").
const OOT_BOOL_FILTERS: [RegExp, string][] = [
  [/\bRock \d/,            'RockShuffleOOT'],
  [/\bTree \d/,            'TreeShuffleOOT'],
  [/\bBush \d/,            'BushShuffleOOT'],
  [/\bSoil \d/,            'SoilShuffleOOT'],
  [/\bRupee \d/,           'RupeeShuffleOOT'],
  [/\bHeart (?!Container)/, 'HeartsShuffleOOT'],
  [/\bWonder Item\b/,      'WonderShuffleOOT'],
  [/\bButterfly \d/,       'ButterflyShuffleOOT'],
  [/\bRed Boulder\b/,      'RedBoulderShuffleOOT'],
  [/\bHive \d/,            'HivesShuffleOOT'],
  [/\bFrogs /,             'FrogRupeesShuffleOOT'],
  [/\bIcicle\b/,           'IciclesShuffleOOT'],
  [/\bRed Ice\b/,          'RedIceShuffleOOT'],
];
const MM_BOOL_FILTERS: [RegExp, string][] = [
  [/\bRock \d/,            'RockShuffleMM'],
  [/\bTree \d/,            'TreeShuffleMM'],
  [/\bBush \d/,            'BushShuffleMM'],
  [/\bRupee \d/,           'RupeeShuffleMM'],
  [/\bHeart (?!Container)/, 'HeartsShuffleMM'],
  [/\bWonder Item\b/,      'WonderShuffleMM'],
  [/\bButterfly \d/,       'ButterflyShuffleMM'],
  [/\bSnowball\b/,         'SnowballShuffleMM'],
  [/\bBarrel\b/,           'BarrelsShuffleMM'],
  [/\bHive\b|\bBeehive\b/, 'HivesShuffleMM'],
  [/\bLottery\b/,          'LotteryShuffleMM'],
  [/\bIcicle\b/,           'IciclesShuffleMM'],
  [/\bRed Boulder\b/,      'RedBoulderShuffleMM'],
];

function isLocationEnabled(locName: string, game: 'oot' | 'mm' | undefined, state: LogicState): boolean {
  const sfx = game === 'mm' ? 'MM' : 'OOT';
  if (POT_RE.test(locName))   return state.settings.get(`PotShuffle${sfx}`)   !== 'none';
  if (CRATE_RE.test(locName)) return state.settings.get(`CrateShuffle${sfx}`) !== 'none';
  if (GRASS_RE.test(locName)) return state.settings.get(`GrassShuffle${sfx}`) !== 'none';
  // TCG room chests and heart piece only exist when small key shuffle for TCG is active
  if (game === 'oot' && TCG_ROOM_RE.test(locName)) {
    return !!state.settings.get('TreasureChestShuffleOOT');
  }
  // Master Sword pedestal is only a randomized check when shuffleMasterSword is on
  if (locName === 'Temple of Time Master Sword') {
    return !!state.settings.get('shuffleMasterSword');
  }
  // Collectible shuffle locations: only exist when the corresponding boolean setting is on
  const boolFilters = game === 'mm' ? MM_BOOL_FILTERS : OOT_BOOL_FILTERS;
  for (const [re, key] of boolFilters) {
    if (re.test(locName)) return !!state.settings.get(key);
  }
  return true;
}

// Returns true when a given ER type (e.g. erDungeons) is actively shuffled.
// erDungeons defaults to 'none' (via HIDDEN_DEFAULTS), so we must treat 'none' as inactive.
function isErTypeActive(erType: string, state: LogicState): boolean {
  const val = state.settings.get(erType);
  return !!val && val !== 'none';
}

function resolveExitTarget(exit: WorldExit, state: LogicState, graph: WorldGraph): string | null {
  if (!exit.entranceId) return exit.target;
  const override = state.erOverrides.get(exit.entranceId);
  if (!override) {
    // Block BFS only when erMode is active AND the specific ER type for this entrance is on.
    // This prevents dungeon exits from being blocked when only e.g. erOverworld is active.
    if (state.erMode && (!exit.erType || isErTypeActive(exit.erType, state))) return null;
    return exit.target;
  }
  // If override is set but unresolvable (e.g. cross-game remapping), block BFS in ER mode.
  return resolveEntranceName(graph, override) ?? (state.erMode ? null : exit.target);
}
