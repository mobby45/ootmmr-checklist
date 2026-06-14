import type { ExprNode } from '../types';
import type { LogicState } from '../types';

// Macro table populated at world-load time (name → expanded ExprNode or parametrized factory)
export type MacroTable = Map<string, ExprNode | ((...args: ExprNode[]) => ExprNode)>;

// ─── Song event evaluation ────────────────────────────────────────────────────
// OoT and MM share song event slot IDs. Vanilla song index per slot, per game.
// Song indices match the order in macros.json: zelda=0, epona=1, saria=2, storms=3, sun=4,
// time=5, tp_forest=6, tp_fire=7, tp_water=8, tp_spirit=9, tp_shadow=10, tp_light=11,
// healing=12, soaring=13, awakening=14, goron=15, goron_half=16, zora=17, elegy=18, order=19
const OOT_VANILLA_SONG: Record<number, number> = {
  0: 5,   // Door of Time → Song of Time
  1: 3,   // Windmill/Well Drain → Song of Storms
  2: 0,   // Graveyard Royal Tomb → Zelda's Lullaby
  3: 0,   // Zora River Falls → Zelda's Lullaby
  4: 2,   // Goron City Darunia → Saria's Song
  5: 0,   // Great Fairy (HC) → Zelda's Lullaby
  6: 0,   // Great Fairy (DMT) → Zelda's Lullaby
  7: 0,   // Great Fairy (ZF) → Zelda's Lullaby
  8: 0,   // Great Fairy (DMC) → Zelda's Lullaby
  9: 0,   // Great Fairy (Desert) → Zelda's Lullaby
  10: 0,  // Great Fairy (Ganon exterior) → Zelda's Lullaby
  11: 0,  // Water Temple Levels → Zelda's Lullaby
  12: 0,  // Shadow Temple Boat → Zelda's Lullaby
  13: 0,  // Spirit Temple Statue → Zelda's Lullaby
  14: 0,  // Spirit Temple Lower → Zelda's Lullaby
  15: 0,  // Spirit Temple Upper → Zelda's Lullaby
  16: 0,  // Bottom of the Well Water → Zelda's Lullaby
  17: 0,  // Ganon Castle Light → Zelda's Lullaby
};
const MM_VANILLA_SONG: Record<number, number> = {
  0:  14, // Woodfall Temple → Sonata of Awakening
  1:  15, // Snowhead Temple → Goron's Lullaby
  2:  17, // Great Bay Temple / Turtle → New Wave Bossa Nova
  4:  12, // Mountain Village / Heal Darmani → Song of Healing
  5:  12, // Ikana / Heal Pamala's Father → Song of Healing
  6:  12, // Termina Field / Heal Kamaro → Song of Healing
  7:  12, // Great Bay Coast / Heal Mikau → Song of Healing
  8:  14, // Ikana Graveyard / Captain Keeta → Sonata of Awakening
  10: 15, // Goron Shrine / Baby Goron → Goron's Lullaby
  11: 3,  // Ikana Valley / Lift Curse → Song of Storms
  12: 19, // Clock Tower Roof / Moon → Oath to Order
};
// Tracker key (e.g. 'oot_0') for each song event slot, per game
const OOT_SLOT_TO_TRACKER: Record<number, string> = {
  0: 'oot_0', 1: 'oot_7', 2: 'oot_2', 3: 'oot_5', 4: 'oot_3',
  5: 'oot_1', 6: 'oot_4', 7: 'oot_6', 8: 'oot_9', 9: 'oot_11',
  10: 'oot_16', 11: 'oot_10', 12: 'oot_15', 13: 'oot_12', 14: 'oot_13',
  15: 'oot_14', 16: 'oot_8', 17: 'oot_17',
};
const MM_SLOT_TO_TRACKER: Record<number, string> = {
  0: 'mm_2', 1: 'mm_6', 2: 'mm_8', 4: 'mm_5', 5: 'mm_11',
  6: 'mm_1', 7: 'mm_7', 8: 'mm_9', 10: 'mm_4', 11: 'mm_10', 12: 'mm_0',
};
// Tracker song item ID → song index
const SONG_ID_TO_IDX: Record<string, number> = {
  oot_song_zelda: 0, oot_song_epona: 1, oot_song_saria: 2,
  oot_song_storms: 3, oot_song_sun: 4, oot_song_time: 5,
  oot_song_minuet: 6, oot_song_bolero: 7, oot_song_serenade: 8,
  oot_song_requiem: 9, oot_song_nocturne: 10, oot_song_prelude: 11,
  mm_song_healing: 12, mm_song_soaring: 13, mm_song_sonata: 14,
  mm_song_lullaby: 15, mm_song_lullaby_half: 16, mm_song_nova: 17,
  mm_song_elegy: 18, mm_song_oath: 19,
  // Cross-game clones — OoT songs available in MM pool and vice versa
  oot_elegy: 18, oot_song_healing: 12, oot_song_soaring: 13,
  oot_song_sonata: 14, oot_song_lullaby: 15, oot_song_nova: 17, oot_song_oath: 19,
  mm_song_zelda: 0, mm_song_epona: 1, mm_song_saria: 2, mm_song_storms: 3,
  mm_song_sun: 4, mm_song_time: 5, mm_song_minuet: 6,
  mm_song_bolero: 7, mm_song_serenade: 8, mm_song_requiem: 9,
  mm_song_nocturne: 10, mm_song_prelude: 11,
};

function evalSongEvent(slot: number, songIdx: number, state: LogicState): boolean {
  const game = state.currentGame ?? 'oot';
  const shuffled = state.settings.get('songEventShuffle');
  if (shuffled) {
    const trackerKey = game === 'mm' ? MM_SLOT_TO_TRACKER[slot] : OOT_SLOT_TO_TRACKER[slot];
    if (trackerKey === undefined) return false;
    const assignedId = state.songEvents.get(trackerKey);
    if (!assignedId) return false;
    return (SONG_ID_TO_IDX[assignedId] ?? -1) === songIdx;
  }
  const vanilla = game === 'mm' ? MM_VANILLA_SONG[slot] : OOT_VANILLA_SONG[slot];
  return vanilla === songIdx;
}

// MM region flags are persistent save-data flags in-game, not trackable per-BFS-step.
// We derive them from events: CLEARED = boss defeated; CURSED = always true (initial state).
// flag_off for any MM region flag = always true (checklist shows checks achievable across cycles).
const MM_CLEARED_EVENTS: Record<string, string[]> = {
  MM_REGION_NORTH_CLEARED:  ['BOSS_GOHT',     'CLEAR_STATE_SNOWHEAD'],
  MM_REGION_SWAMP_CLEARED:  ['BOSS_ODOLWA',   'CLEAR_STATE_WOODFALL'],
  MM_REGION_OCEAN_CLEARED:  ['BOSS_GYORG',    'CLEAR_STATE_GREAT_BAY'],
  MM_REGION_VALLEY_CLEARED: ['BOSS_TWINMOLD', 'CLEAR_STATE_IKANA'],
};
// Period order matches macros.json: CLOCK1=Day1, CLOCK2=Night1, CLOCK3=Day2, CLOCK4=Night2, CLOCK5=Day3, CLOCK6=Night3
const MM_PERIODS = ['DAY1', 'NIGHT1', 'DAY2', 'NIGHT2', 'DAY3', 'NIGHT3'] as const;

const MM_CURSED_FLAGS = new Set([
  'MM_REGION_NORTH_CURSED', 'MM_REGION_SWAMP_CURSED',
  'MM_REGION_OCEAN_CURSED', 'MM_REGION_VALLEY_CURSED',
]);

export function evalExpr(node: ExprNode, state: LogicState, macros: MacroTable): boolean {
  switch (node.kind) {
    case 'true':  return true;
    case 'false': return false;

    case 'and': return evalExpr(node.left, state, macros) && evalExpr(node.right, state, macros);
    case 'or':  return evalExpr(node.left, state, macros) || evalExpr(node.right, state, macros);
    case 'not': return !evalExpr(node.expr, state, macros);

    case 'has': {
      // When in a game-specific region, use the game-prefixed key (OOT_X or MM_X)
      // so that OoT items don't satisfy MM checks and vice versa.
      // SHARED_ items are always looked up without prefix.
      // Takes the max of the plain key (cross-game/shared fallback) and the prefixed key,
      // so that e.g. shared_magic + oot_magic both contribute without cross-game contamination.
      let count = state.items.get(node.item) ?? 0;
      if (state.currentGame && !node.item.startsWith('SHARED_')) {
        const prefixed = state.currentGame.toUpperCase() + '_' + node.item;
        count = Math.max(count, state.items.get(prefixed) ?? 0);
      }
      return count >= node.count;
    }

    case 'renewable':
      // Renewable items always available if player has the item at all
      return (state.items.get(node.item) ?? 0) > 0;

    case 'license':
      return (state.items.get('license_' + node.item) ?? 0) > 0;

    case 'event':
      return state.events.has(node.name);

    case 'setting': {
      const val = state.settings.get(node.key);
      if (typeof node.value === 'boolean') return !!val === node.value;
      const expected = String(node.value);
      const stored = String(val ?? '');
      // Support space-separated flag lists (multicheck settings: "DC JJ Shadow")
      return stored === expected || stored.split(' ').includes(expected);
    }

    case 'age':
      return state.age === node.age;

    case 'trick':
      return state.tricks.has(node.name);

    case 'oot_time':
      // OoT time cycles naturally — any time of day is reachable by waiting, no items required
      return true;

    case 'mm_time': {
      // When clock randomization is off, all time windows are always accessible
      if (!state.settings.get('clocks')) return true;
      // Map the query type to [lo, hi] period indices in MM_PERIODS.
      // between(a,b): player needs access to any period in [a..b].
      // before(x):   player can be before x → any period up to and including x's period.
      // after(x):    player can be after x  → any period from x's period to Night3.
      // at(x):       exact time point        → only x's period.
      // Use startsWith(p + '_') to guard against any future prefix collision (e.g. DAY10_).
      // clock_* macros (not is_*) are used to avoid infinite recursion — is_night1 calls
      // raw_between which would re-enter this handler.
      let lo: number, hi: number;
      if (node.type === 'between') {
        lo = MM_PERIODS.findIndex(p => node.start.startsWith(p + '_'));
        hi = MM_PERIODS.findIndex(p => node.end.startsWith(p + '_'));
        if (lo === -1 || hi === -1) return true;
      } else if (node.type === 'before') {
        lo = 0;
        hi = MM_PERIODS.findIndex(p => node.start.startsWith(p + '_'));
        if (hi === -1) return true;
      } else if (node.type === 'after') {
        lo = MM_PERIODS.findIndex(p => node.start.startsWith(p + '_'));
        hi = MM_PERIODS.length - 1;
        if (lo === -1) return true;
      } else if (node.type === 'at') {
        lo = hi = MM_PERIODS.findIndex(p => node.start.startsWith(p + '_'));
        if (lo === -1) return true;
      } else {
        return true;
      }
      for (let i = lo; i <= hi; i++) {
        const m = macros.get('clock_' + MM_PERIODS[i].toLowerCase());
        if (!m || typeof m === 'function') continue;
        if (evalExpr(m, state, macros)) return true;
      }
      return false;
    }

    case 'flag_on': {
      const clearedEvents = MM_CLEARED_EVENTS[node.flag];
      if (clearedEvents) return clearedEvents.some(e => state.events.has(e));
      if (MM_CURSED_FLAGS.has(node.flag)) return true;
      return state.flags.has(node.flag);
    }
    case 'flag_off': {
      // Both cleared and cursed states are achievable in a checklist context (cycle reset),
      // so flag_off for any MM region flag is always true.
      if (node.flag in MM_CLEARED_EVENTS || MM_CURSED_FLAGS.has(node.flag)) return true;
      return !state.flags.has(node.flag);
    }

    case 'special': return state.resolvedSpecial.get(node.name) ?? false;

    case 'price':
      // threshold=0 means "item is free" — nothing in OoT/MM shops costs 0 rupees,
      // so this branch never fires and wallet_price correctly falls through to
      // the has_rupees && has_wallet(n) checks.
      // For threshold>0, we cannot validate exact prices without shop data, so we
      // assume the item's price falls within the wallet tier's range.
      return node.threshold > 0;

    case 'cond': {
      const branch = evalExpr(node.cond, state, macros);
      return evalExpr(branch ? node.then : node.else, state, macros);
    }

    case 'macro': {
      // String/number sentinel args (from parser) — should not reach eval directly
      if (node.name.startsWith('__str__') || node.name.startsWith('__num__')) return true;

      // _song_event_oot / _song_event_mm — built-ins, use game context from state
      if (node.name === '_song_event_oot' || node.name === '_song_event_mm') {
        const slotStr = node.args[0]?.kind === 'macro' ? node.args[0].name.replace(/^__num__/, '') : '0';
        const idxStr  = node.args[1]?.kind === 'macro' ? node.args[1].name.replace(/^__num__/, '') : '0';
        return evalSongEvent(Number(slotStr), Number(idxStr), state);
      }

      const m = macros.get(node.name);
      if (!m) return false; // unknown macro → conservative false

      if (typeof m === 'function') {
        const expanded = m(...node.args);
        return evalExpr(expanded, state, macros);
      }
      return evalExpr(m, state, macros);
    }
  }
}
