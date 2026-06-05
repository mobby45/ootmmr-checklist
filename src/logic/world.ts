import type { WorldGraph, WorldRegion, RawWorld, RawWorldRegion } from './types';
import type { MacroTable } from './expr/eval';
import { parseExpr } from './expr/parse';
import type { ExprNode } from './types';

// Parametrized macro: "soil_fairies(x)" → (x: ExprNode) => ExprNode
// We detect these by checking if the macro string contains a parameter placeholder.
const PARAM_RE = /^(\w[\w\d_]*)\(([^)]+)\)$/;

function buildMacroTable(rawMacros: Record<string, string>): MacroTable {
  const table: MacroTable = new Map();

  for (const [key, expr] of Object.entries(rawMacros)) {
    const paramMatch = key.match(PARAM_RE);
    if (paramMatch) {
      // Parametrized macro: "soil_fairies(x)" → factory function
      const macroName = paramMatch[1];
      const paramNames = paramMatch[2].split(',').map(s => s.trim());
      table.set(macroName, (...args: ExprNode[]) => {
        // Substitute __str__PARAMNAME sentinel nodes with actual arg nodes
        return substituteParams(parseExpr(expr), paramNames, args);
      });
    } else {
      // Simple macro: parse and store as ExprNode
      table.set(key, parseExpr(expr));
    }
  }

  return table;
}

function substituteParams(node: ExprNode, params: string[], args: ExprNode[]): ExprNode {
  if (node.kind === 'macro') {
    // Check if this is a parameter reference (__str__PARAMNAME)
    if (node.name.startsWith('__str__')) {
      const paramName = node.name.slice(7);
      const idx = params.indexOf(paramName);
      if (idx >= 0 && args[idx]) return args[idx];
    }
    // Check if it's a macro call with the param name as identifier (bare)
    const idx = params.indexOf(node.name);
    if (idx >= 0 && args[idx]) return args[idx];
    // Recurse into macro args
    return { ...node, args: node.args.map(a => substituteParams(a, params, args)) };
  }
  if (node.kind === 'and')  return { ...node, left: substituteParams(node.left, params, args), right: substituteParams(node.right, params, args) };
  if (node.kind === 'or')   return { ...node, left: substituteParams(node.left, params, args), right: substituteParams(node.right, params, args) };
  if (node.kind === 'not')  return { ...node, expr: substituteParams(node.expr, params, args) };
  if (node.kind === 'cond') return { ...node, cond: substituteParams(node.cond, params, args), then: substituteParams(node.then, params, args), else: substituteParams(node.else, params, args) };
  return node;
}

function buildWorldGraph(rawRegions: RawWorld): WorldGraph {
  const graph: WorldGraph = new Map();

  for (const raw of rawRegions) {
    const region: WorldRegion = {
      name: raw.name,
      game: raw.game,
      dungeon: raw.dungeon,
      exits: raw.exits.map(e => ({
        target: e.target,
        rule: parseExpr(e.rule),
        entranceId: e.entranceId,
      })),
      locations: raw.locations.map(l => ({
        name: l.name,
        rule: parseExpr(l.rule),
      })),
      events: raw.events.map(ev => ({
        name: ev.name,
        rule: parseExpr(ev.rule),
      })),
    };

    // If region already exists (same name from different files — e.g. two GLOBAL regions),
    // merge exits/locations/events instead of overwriting.
    if (graph.has(raw.name)) {
      const existing = graph.get(raw.name)!;
      existing.exits.push(...region.exits);
      existing.locations.push(...region.locations);
      existing.events.push(...region.events);
    } else {
      graph.set(raw.name, region);
    }
  }

  return graph;
}

// ─── Lazy-loaded singletons ───────────────────────────────────────────────────

let _graph: WorldGraph | null = null;
let _macros: MacroTable | null = null;

export async function loadWorld(): Promise<{ graph: WorldGraph; macros: MacroTable }> {
  if (_graph && _macros) return { graph: _graph, macros: _macros };

  const [worldJson, macrosJson] = await Promise.all([
    import('../data/logic/world.json', { assert: { type: 'json' } }),
    import('../data/logic/macros.json', { assert: { type: 'json' } }),
  ]);

  _macros = buildMacroTable(macrosJson.default as Record<string, string>);
  _graph  = buildWorldGraph(worldJson.default as RawWorld);

  return { graph: _graph, macros: _macros };
}
