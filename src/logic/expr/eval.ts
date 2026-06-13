import type { ExprNode } from '../types';
import type { LogicState } from '../types';

// Macro table populated at world-load time (name → expanded ExprNode or parametrized factory)
export type MacroTable = Map<string, ExprNode | ((...args: ExprNode[]) => ExprNode)>;

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
