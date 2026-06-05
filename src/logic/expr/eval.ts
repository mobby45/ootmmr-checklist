import type { ExprNode } from '../types';
import type { LogicState } from '../types';

// Macro table populated at world-load time (name → expanded ExprNode or parametrized factory)
export type MacroTable = Map<string, ExprNode | ((...args: ExprNode[]) => ExprNode)>;

export function evalExpr(node: ExprNode, state: LogicState, macros: MacroTable): boolean {
  switch (node.kind) {
    case 'true':  return true;
    case 'false': return false;

    case 'and': return evalExpr(node.left, state, macros) && evalExpr(node.right, state, macros);
    case 'or':  return evalExpr(node.left, state, macros) || evalExpr(node.right, state, macros);
    case 'not': return !evalExpr(node.expr, state, macros);

    case 'has':
      return (state.items.get(node.item) ?? 0) >= node.count;

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

    case 'flag_on':  return state.flags.has(node.flag);
    case 'flag_off': return !state.flags.has(node.flag);

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
