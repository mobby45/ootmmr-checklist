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
      // Time is not tracked precisely in phase 1 — assume always accessible
      return true;

    case 'mm_time':
      return true;

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
      // Assume player can afford prices (wallet check) — simplification for phase 1
      return true;

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
