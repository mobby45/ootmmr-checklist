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

// ─── Entrance name → destination region lookup ────────────────────────────────
// Maps OoTMM entrance names (e.g. "OOT Kokiri Forest to OOT Deku Tree")
// to the world region the player ends up in when taking that entrance.
// Built by scanning exits: find exit from region matching the source, toward a target.

export type EntranceRegionMap = Map<string, string>;

function buildEntranceRegionMap(graph: WorldGraph): EntranceRegionMap {
  const result: EntranceRegionMap = new Map();

  // Index all region names for fast fuzzy lookup
  const regionNames = [...graph.keys()];

  function findRegion(hint: string): string | null {
    // Exact match first
    if (graph.has(hint)) return hint;
    const lower = hint.toLowerCase();
    // Prefix match
    const prefix = regionNames.find(r => r.toLowerCase().startsWith(lower));
    if (prefix) return prefix;
    // Substring match
    return regionNames.find(r => r.toLowerCase().includes(lower)) ?? null;
  }

  // Parse entrance name format: "OOT {Source} to OOT {Dest}" or "MM ..."
  const RE = /^(?:OOT|MM) (.+) to (?:OOT|MM) (.+)$/;

  for (const [regionName, region] of graph) {
    for (const exit of region.exits) {
      // The exit.target IS the destination region — link it via the entrance name pattern
      // We'll resolve the entrance name → target by scanning our entrance data at call time
      void regionName; void region; void exit;
    }
  }

  // Build index: for each region in the graph, record it under normalized keywords
  // so we can resolve "OOT Deku Tree" → "Deku Tree Lobby" (first reachable room)
  const entryPoints = new Map<string, string>(); // normalized source name → first target region

  for (const [regionName, region] of graph) {
    for (const exit of region.exits) {
      const m = RE.exec(`OOT ${regionName} to OOT ${exit.target}`);
      if (!m) continue;
      // Store target of this exit (the destination region)
      if (!entryPoints.has(exit.target)) entryPoints.set(exit.target, exit.target);
    }
  }

  // The useful direction: given entrance name "OOT X to OOT Y",
  // find what region Y maps to. We do this by finding exits whose target name
  // matches the Y portion.
  // This is built externally — engine.ts calls resolveEntranceName(graph, name).
  void findRegion; void result; void RE;
  return result;
}

// Resolve an OoTMM entrance name to the world region it leads into.
// e.g. "OOT Kokiri Forest to OOT Deku Tree" → "Deku Tree Lobby" (or closest match)
export function resolveEntranceName(graph: WorldGraph, entranceName: string): string | null {
  // Parse: extract destination part after "to OOT " or "to MM "
  const m = entranceName.match(/ to (?:OOT|MM) (.+)$/);
  if (!m) return null;
  const dest = m[1].trim();

  // Try to find a region whose name starts with dest or contains it
  for (const regionName of graph.keys()) {
    if (regionName === dest) return regionName;
  }
  for (const regionName of graph.keys()) {
    if (regionName.startsWith(dest)) return regionName;
  }
  for (const regionName of graph.keys()) {
    if (regionName.toLowerCase().includes(dest.toLowerCase())) return regionName;
  }
  return null;
}

// ─── Lazy-loaded singletons ───────────────────────────────────────────────────

let _graph: WorldGraph | null = null;
let _macros: MacroTable | null = null;

export async function loadWorld(): Promise<{ graph: WorldGraph; macros: MacroTable }> {
  if (_graph && _macros) return { graph: _graph, macros: _macros };

  // Fetch as separate public assets to avoid bloating the JS bundle
  const base = import.meta.env.BASE_URL ?? '/';
  const [worldRes, macrosRes] = await Promise.all([
    fetch(base + 'logic/world.json'),
    fetch(base + 'logic/macros.json'),
  ]);

  if (!worldRes.ok || !macrosRes.ok) throw new Error('Failed to load logic data');

  const [rawWorld, rawMacros] = await Promise.all([
    worldRes.json() as Promise<RawWorld>,
    macrosRes.json() as Promise<Record<string, string>>,
  ]);

  _macros = buildMacroTable(rawMacros);
  _graph  = buildWorldGraph(rawWorld);

  return { graph: _graph, macros: _macros };
}
