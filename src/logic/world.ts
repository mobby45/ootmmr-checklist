import type { WorldGraph, WorldRegion, RawWorld, RawWorldRegion } from './types';
import type { MacroTable } from './expr/eval';
import { parseExpr } from './expr/parse';
import type { ExprNode } from './types';

const PARAM_RE = /^(\w[\w\d_]*)\(([^)]+)\)$/;

// Extract the raw string value from a sentinel arg node produced by the parser.
// parse.ts encodes bare identifiers/strings as {kind:'macro', name:'__str__VALUE'}
// and numbers as {kind:'macro', name:'__num__VALUE'}.
function argToString(node: ExprNode): string {
  if (node.kind !== 'macro') return '0';
  if (node.name.startsWith('__str__')) return node.name.slice(7);
  if (node.name.startsWith('__num__')) return node.name.slice(7);
  // Bare macro nodes (non-sentinel) — return the name itself (for identifier-type args)
  return node.name;
}

function buildMacroTable(rawMacros: Record<string, string>): MacroTable {
  const table: MacroTable = new Map();

  for (const [key, expr] of Object.entries(rawMacros)) {
    const paramMatch = key.match(PARAM_RE);
    if (paramMatch) {
      const macroName = paramMatch[1];
      const paramNames = paramMatch[2].split(',').map(s => s.trim());

      // Use TEXT substitution: replace param names in the macro body string,
      // then parse. This avoids the bug where numeric params get lost when
      // pre-parsing turns `has(ITEM, x)` into `has(ITEM, 0)` because parseInt('x')=NaN.
      table.set(macroName, (...args: ExprNode[]) => {
        let body = expr;
        for (let i = 0; i < paramNames.length; i++) {
          const val = args[i] ? argToString(args[i]) : '0';
          body = body.replace(new RegExp(`\\b${paramNames[i]}\\b`, 'g'), val);
        }
        try {
          return parseExpr(body);
        } catch (e) {
          console.error('[logic] macro expand error:', macroName, '| body:', body, '->', e);
          return { kind: 'true' };
        }
      });
    } else {
      try {
        table.set(key, parseExpr(expr));
      } catch (e) {
        console.error('[logic] macro parse error:', key, '->', e);
        table.set(key, { kind: 'true' });
      }
    }
  }

  return table;
}

function safeParseExpr(rule: string, label: string): ReturnType<typeof parseExpr> {
  try {
    return parseExpr(rule);
  } catch (e) {
    console.error('[logic] parse error in', label, ':', rule, '->', e);
    return { kind: 'true' };
  }
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
        rule: safeParseExpr(e.rule, `${raw.name} → ${e.target}`),
        entranceId: e.entranceId,
      })),
      locations: raw.locations.map(l => ({
        name: l.name,
        rule: safeParseExpr(l.rule, `${raw.name} / ${l.name}`),
      })),
      events: raw.events.map(ev => ({
        name: ev.name,
        rule: safeParseExpr(ev.rule, `${raw.name} event:${ev.name}`),
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
