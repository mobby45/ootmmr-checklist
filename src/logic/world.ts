import type { WorldGraph, WorldRegion, RawWorld, RawWorldRegion } from './types';
import type { MacroTable } from './expr/eval';
import { parseExpr } from './expr/parse';
import type { ExprNode } from './types';
import { allEntrances } from '../data/entranceData';

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
      const expandCache = new Map<string, ExprNode>();
      table.set(macroName, (...args: ExprNode[]) => {
        const cacheKey = args.map(a => argToString(a)).join('\x00');
        const cached = expandCache.get(cacheKey);
        if (cached) return cached;
        let body = expr;
        for (let i = 0; i < paramNames.length; i++) {
          const val = args[i] ? argToString(args[i]) : '0';
          body = body.replace(new RegExp(`\\b${paramNames[i]}\\b`, 'g'), val);
        }
        try {
          const result = parseExpr(body);
          expandCache.set(cacheKey, result);
          return result;
        } catch (e) {
          console.error('[logic] macro expand error:', macroName, '| body:', body, '->', e);
          const fallback: ExprNode = { kind: 'false' };
          expandCache.set(cacheKey, fallback);
          return fallback;
        }
      });
    } else {
      try {
        table.set(key, parseExpr(expr));
      } catch (e) {
        console.error('[logic] macro parse error:', key, '->', e);
        table.set(key, { kind: 'false' });
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
    return { kind: 'false' };
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
        rawRule: e.rule,
        entranceId: e.entranceId,
      })),
      locations: raw.locations.map(l => ({
        name: l.name,
        rule: safeParseExpr(l.rule, `${raw.name} / ${l.name}`),
        rawRule: l.rule,
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

// Entrance names in entranceData.ts sometimes use region labels that don't exactly match
// world.json region names (OoTMM YAML inconsistencies). This table maps the label used
// in the entrance name → the actual world.json region name.
const REGION_NAME_OVERRIDES: Record<string, string> = {
  // OoT: the shortcut between Lake Hylia and Zora Domain is called
  // "Lake Hylia Near Shortcut" in world.json, not "Lake Hylia Shortcut".
  'Lake Hylia Shortcut':                 'Lake Hylia Near Shortcut',
  // OoT: Dog Lady's house apostrophe differs between entrance name and world.json.
  "Dog Lady's House":                    'Dog Lady House',
  // MM: Mayor's Office is a sub-room of Mayor's Residence in world.json.
  "Mayor's Office":                      "Mayor's Residence Office",
  // MM: Stock Pot Inn roof entry is listed as "Clock Town East Stock Pot Inn Roof"
  // in the entrance name but world.json calls it simply "Stock Pot Inn Roof".
  'Clock Town East Stock Pot Inn Roof':  'Stock Pot Inn Roof',
  // MM: Great Bay Coast cow grotto area uses the abbreviated form "GBC Near Cow Grotto".
  'Great Bay Coast Near Cow Grotto':     'GBC Near Cow Grotto',
  // MM: Mountain Village Winter is the same world.json region as Mountain Village
  // (season state is handled by logic rules, not separate regions).
  'Mountain Village Winter':             'Mountain Village',
};

// Resolve an OoTMM entrance name to the world region it leads into (destination side).
// e.g. "OOT Kokiri Forest to OOT Deku Tree" → "Deku Tree Lobby" (or closest match)
export function resolveEntranceName(graph: WorldGraph, entranceName: string): string | null {
  // Parse: extract destination part after "to OOT " or "to MM "
  const m = entranceName.match(/ to (?:OOT|MM) (.+)$/);
  if (!m) return null;
  const dest = REGION_NAME_OVERRIDES[m[1].trim()] ?? m[1].trim();

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

// Resolve an OoTMM entrance name to the world region at its SOURCE (outside the entrance).
// Used for spawns: "OOT Death Mountain Crater Bottom to OOT Darunia Chamber" → "Death Mountain Crater Bottom"
// because when the spawn connects to this entrance you are placed OUTSIDE it, in the source region.
export function resolveEntranceSource(graph: WorldGraph, entranceName: string): string | null {
  const m = entranceName.match(/^(?:OOT|MM) (.+?) to (?:OOT|MM) /);
  if (!m) return null;
  const src = REGION_NAME_OVERRIDES[m[1].trim()] ?? m[1].trim();
  for (const regionName of graph.keys()) {
    if (regionName === src) return regionName;
  }
  for (const regionName of graph.keys()) {
    if (regionName.startsWith(src)) return regionName;
  }
  for (const regionName of graph.keys()) {
    if (regionName.toLowerCase().includes(src.toLowerCase())) return regionName;
  }
  return null;
}

// ─── Lazy-loaded singletons ───────────────────────────────────────────────────

let _graph: WorldGraph | null = null;
let _macros: MacroTable | null = null;
let _locationRules: Map<string, string> | null = null;
let _entranceRules: Map<string, string> | null = null;
let _entranceSourceMap: Map<string, string> | null = null;
let _entranceDestMap: Map<string, string> | null = null;

export async function loadWorld(): Promise<{ graph: WorldGraph; macros: MacroTable; locationRules: Map<string, string>; entranceRules: Map<string, string>; entranceSourceMap: Map<string, string>; entranceDestMap: Map<string, string> }> {
  if (_graph && _macros && _locationRules && _entranceRules && _entranceSourceMap && _entranceDestMap) return { graph: _graph, macros: _macros, locationRules: _locationRules, entranceRules: _entranceRules, entranceSourceMap: _entranceSourceMap, entranceDestMap: _entranceDestMap };

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
  injectEntranceIds(_graph);

  _locationRules = new Map<string, string>();
  for (const region of _graph.values()) {
    for (const loc of region.locations) {
      _locationRules.set(loc.name, loc.rawRule);
    }
  }

  _entranceRules = new Map<string, string>();
  for (const entrance of allEntrances) {
    const src = resolveEntranceSource(_graph, entrance.name);
    const tgt = resolveEntranceName(_graph, entrance.name);
    if (!src || !tgt) continue;
    const region = _graph.get(src);
    if (!region) continue;
    for (const exit of region.exits) {
      if (exit.target === tgt && exit.rawRule) {
        _entranceRules.set(entrance.id, exit.rawRule);
        break;
      }
    }
  }

  _entranceSourceMap = buildEntranceSourceMap(_graph);
  _entranceDestMap   = buildEntranceDestMap(_graph);

  return { graph: _graph, macros: _macros, locationRules: _locationRules, entranceRules: _entranceRules, entranceSourceMap: _entranceSourceMap, entranceDestMap: _entranceDestMap };
}

// Maps each entrance ID to the name of its source region in the world graph.
function buildEntranceSourceMap(graph: WorldGraph): Map<string, string> {
  const result = new Map<string, string>();
  for (const entrance of allEntrances) {
    const src = resolveEntranceSource(graph, entrance.name);
    if (src) result.set(entrance.id, src);
  }
  return result;
}

// Maps each entrance ID to the name of the destination region it leads into (vanilla).
function buildEntranceDestMap(graph: WorldGraph): Map<string, string> {
  const result = new Map<string, string>();
  for (const entrance of allEntrances) {
    const dest = resolveEntranceName(graph, entrance.name);
    if (dest) result.set(entrance.id, dest);
  }
  return result;
}

// ER types whose exits should be blocked by BFS when they are active and unassigned.
// One-ways, wallmasters, spawns and alterLw are excluded: they use different mechanics.
const ER_BLOCKABLE_TYPES = new Set([
  'erDungeons', 'erBoss', 'erGrottos', 'erIndoors', 'erOverworld',
]);

// Inject OoTMM entrance IDs onto world.json exits that don't have them.
// Enables the BFS engine to respect erOverrides when a shuffleable ER type is active.
function injectEntranceIds(graph: WorldGraph): void {
  for (const entrance of allEntrances) {
    if (!ER_BLOCKABLE_TYPES.has(entrance.erType)) continue;
    const src = resolveEntranceSource(graph, entrance.name);
    const tgt = resolveEntranceName(graph, entrance.name);
    if (!src || !tgt) continue;
    const region = graph.get(src);
    if (!region) continue;
    for (const exit of region.exits) {
      if (exit.target === tgt && !exit.entranceId) {
        exit.entranceId = entrance.id;
        exit.erType = entrance.erType;
        break;
      }
    }
  }
}
