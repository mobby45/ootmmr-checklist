import type { WorldGraph, WorldExit, LogicState, ReachabilityResult, ExprNode } from './types';
import type { MacroTable } from './expr/eval';
import { evalExpr, MM_TIME_SLICES } from './expr/eval';
import { resolveEntranceName, resolveEntranceSource } from './world';

type Age = 'child' | 'adult';

// mmTime  covers slices 0-31  (bits 0-31, all 32 bits used)
// mmTime2 covers slices 32-45 (bits 0-13, 14 bits used)
const MASK_MM_TIME  = 0xFFFFFFFF;
const MASK_MM_TIME2 = (1 << (MM_TIME_SLICES.length - 32)) - 1; // 0x3FFF

const OOT_SPAWN = "Link's House";
const MM_SPAWN  = 'Clock Town South';
const GLOBAL    = 'GLOBAL';

function stateForAge(
  base: LogicState, age: Age, events: Set<string>,
  mmTime: number, mmTime2: number, game?: 'oot' | 'mm',
): LogicState {
  return { ...base, age, events, mmTime, mmTime2, currentGame: game };
}

// Simulate stay=null: once a region is entered at any time slice, the player can
// wait freely to any later slice within that region. All MM regions in world.json
// have stay=null (stay data is not exported), so we apply this expansion universally.
// Cross-boundary rule: any time in slices 0-31 allows waiting all the way to Night3.
function expandMmTime(mmTime: number, mmTime2: number): [number, number] {
  let t = mmTime >>> 0;
  t = (t | (t << 1))  >>> 0;
  t = (t | (t << 2))  >>> 0;
  t = (t | (t << 4))  >>> 0;
  t = (t | (t << 8))  >>> 0;
  t = (t | (t << 16)) >>> 0;
  mmTime = t & MASK_MM_TIME;

  let t2 = mmTime2 >>> 0;
  t2 = (t2 | (t2 << 1)) >>> 0;
  t2 = (t2 | (t2 << 2)) >>> 0;
  t2 = (t2 | (t2 << 4)) >>> 0;
  mmTime2 = t2 & MASK_MM_TIME2;

  if (mmTime !== 0) mmTime2 = MASK_MM_TIME2;

  return [mmTime, mmTime2];
}

// For each slice bit set in {srcMmTime, srcMmTime2}, evaluate the exit rule with
// that single slice active. Returns the union of slices that pass the rule.
// This propagates time correctly through OR-conditions like `after(DAY3) || can_use_keg`:
// only the slices that actually satisfy the rule flow to the destination.
function computeExitTimeMask(
  rule: ExprNode,
  srcMmTime: number, srcMmTime2: number,
  baseState: LogicState,
  macros: MacroTable,
): [number, number] {
  let dstLo = 0, dstHi = 0;
  for (let i = 0; i < MM_TIME_SLICES.length; i++) {
    const bit = i < 32 ? (srcMmTime >>> i) & 1 : (srcMmTime2 >>> (i - 32)) & 1;
    if (!bit) continue;
    const sliceLo = i < 32 ? (1 << i) >>> 0 : 0;
    const sliceHi = i >= 32 ? (1 << (i - 32)) >>> 0 : 0;
    if (evalExpr(rule, { ...baseState, mmTime: sliceLo, mmTime2: sliceHi }, macros)) {
      if (i < 32) dstLo |= (1 << i);
      else        dstHi |= (1 << (i - 32));
    }
  }
  return [dstLo >>> 0, dstHi >>> 0];
}

export function computeReachability(
  graph: WorldGraph,
  state: LogicState,
  macros: MacroTable,
): ReachabilityResult {
  type TimeData = { mmTime: number; mmTime2: number };
  // Per-age accumulated time data: region name → {mmTime, mmTime2} (post-expansion).
  const reachedData: Record<Age, Map<string, TimeData>> = {
    child: new Map(),
    adult: new Map(),
  };
  const checksByAge: Record<Age, Set<string>> = { child: new Set(), adult: new Set() };
  const events = new Set<string>(state.events);

  const queue: { regionName: string; age: Age; mmTime: number; mmTime2: number }[] = [];

  // Enqueue a region with the given time data.
  // Applies stay=null expansion immediately; only the bits not yet seen are pushed.
  function enqueue(regionName: string, age: Age, mmTime: number, mmTime2: number) {
    if (!graph.has(regionName)) return;
    const [expLo, expHi] = expandMmTime(mmTime, mmTime2);
    const cur = reachedData[age].get(regionName);
    const curLo = cur?.mmTime  ?? 0;
    const curHi = cur?.mmTime2 ?? 0;
    const newLo = expLo & ~curLo;
    const newHi = expHi & ~curHi;
    if (newLo === 0 && newHi === 0) return;
    reachedData[age].set(regionName, { mmTime: curLo | expLo, mmTime2: curHi | expHi });
    queue.push({ regionName, age, mmTime: newLo, mmTime2: newHi });
  }

  // Seed spawn regions at the start of the first cycle (Day1 AM 6:00 = bit 0 of mmTime).
  // expandMmTime immediately fills this to ALL slices for unrestricted regions.
  const SEED_MM_TIME  = 1; // DAY1_AM_06_00
  const SEED_MM_TIME2 = 0;

  if (state.erMode) {
    if (state.settings.get('erSpawns')) {
      const childDest = state.erOverrides.get('OOT_SPAWN_CHILD');
      const adultDest = state.erOverrides.get('OOT_SPAWN_ADULT');
      if (childDest) { const r = resolveEntranceSource(graph, childDest); if (r) enqueue(r, 'child', SEED_MM_TIME, SEED_MM_TIME2); }
      if (adultDest) { const r = resolveEntranceSource(graph, adultDest); if (r) enqueue(r, 'adult', SEED_MM_TIME, SEED_MM_TIME2); }
    } else {
      enqueue(OOT_SPAWN, 'child', SEED_MM_TIME, SEED_MM_TIME2);
      enqueue(OOT_SPAWN, 'adult', SEED_MM_TIME, SEED_MM_TIME2);
    }
    // MM is never seeded directly in ER mode — must be reached via cross-game exits from OoT
  } else {
    enqueue(OOT_SPAWN, 'child', SEED_MM_TIME, SEED_MM_TIME2);
    enqueue(OOT_SPAWN, 'adult', SEED_MM_TIME, SEED_MM_TIME2);
    enqueue(MM_SPAWN,  'child', SEED_MM_TIME, SEED_MM_TIME2);
    enqueue(MM_SPAWN,  'adult', SEED_MM_TIME, SEED_MM_TIME2);
  }
  enqueue(GLOBAL, 'child', SEED_MM_TIME, SEED_MM_TIME2);
  enqueue(GLOBAL, 'adult', SEED_MM_TIME, SEED_MM_TIME2);

  // BFS — repeat full passes until no new events are discovered.
  let eventFound = true;
  let qi = 0;
  while (eventFound) {
    eventFound = false;

    while (qi < queue.length) {
      const { regionName, age, mmTime, mmTime2 } = queue[qi++];
      const region = graph.get(regionName);
      if (!region) continue;

      // Base state for exit evaluation (mmTime/mmTime2 overridden per-slice inside computeExitTimeMask)
      const baseS = stateForAge(state, age, events, 0, 0, region.game);

      for (const exit of region.exits) {
        const target = resolveExitTarget(exit, state, graph);
        if (!target) continue;
        const [dstLo, dstHi] = computeExitTimeMask(exit.rule, mmTime, mmTime2, baseS, macros);
        if (dstLo !== 0 || dstHi !== 0) enqueue(target, age, dstLo, dstHi);
      }

      // Use the full accumulated time for check/event evaluation
      const full = reachedData[age].get(regionName)!;
      const sCheck = stateForAge(state, age, events, full.mmTime, full.mmTime2, region.game);

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

    // Restart: re-push all reached regions so exits blocked by missing events can be re-evaluated.
    // Push the full accumulated data directly (bypass enqueue dedup) so all exits get re-tried.
    if (eventFound) {
      queue.length = 0;
      qi = 0;
      for (const age of ['child', 'adult'] as Age[]) {
        for (const [regionName, data] of reachedData[age]) {
          queue.push({ regionName, age, mmTime: data.mmTime, mmTime2: data.mmTime2 });
        }
      }
    }
  }

  const childRegions = new Set(reachedData.child.keys());
  const adultRegions = new Set(reachedData.adult.keys());
  return {
    regions: new Set([...childRegions, ...adultRegions]),
    childRegions,
    adultRegions,
    childChecks: checksByAge.child,
    adultChecks: checksByAge.adult,
    events,
  };
}

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
  const hasWallet = (n: number) => wallets >= (childW ? n : n - 1);
  if (price <= 99  && hasWallet(1)) return true;
  if (price <= 200 && hasWallet(2)) return true;
  if (price <= 500 && hasWallet(3)) return true;
  if (price <= 999 && hasWallet(4) && state.settings.get('colossalWallets')) return true;
  return false;
}

const POT_RE      = /\bPot\b/;
const CRATE_RE    = /\bCrate\b/;
const GRASS_RE    = /\bGrass\b/;
const TCG_ROOM_RE = /^Treasure Chest Game (Room \d|HP)/;

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
  if (game === 'oot' && TCG_ROOM_RE.test(locName)) {
    return !!state.settings.get('TreasureChestShuffleOOT');
  }
  if (locName === 'Temple of Time Master Sword') {
    return !!state.settings.get('shuffleMasterSword');
  }
  const boolFilters = game === 'mm' ? MM_BOOL_FILTERS : OOT_BOOL_FILTERS;
  for (const [re, key] of boolFilters) {
    if (re.test(locName)) return !!state.settings.get(key);
  }
  return true;
}

function isErTypeActive(erType: string, state: LogicState): boolean {
  const val = state.settings.get(erType);
  return !!val && val !== 'none';
}

function resolveExitTarget(exit: WorldExit, state: LogicState, graph: WorldGraph): string | null {
  if (!exit.entranceId) return exit.target;
  const override = state.erOverrides.get(exit.entranceId);
  if (!override) {
    if (state.erMode && (!exit.erType || isErTypeActive(exit.erType, state))) return null;
    return exit.target;
  }
  return resolveEntranceName(graph, override) ?? (state.erMode ? null : exit.target);
}
