#!/usr/bin/env node
// Build script: fetches OoTMM world + macro YAML files from GitHub and compiles
// them into public/logic/world.json + public/logic/macros.json.
//
// When OoT and MM define the same macro name with different bodies (e.g.
// rusty_key(x)), the MM version is stored under the _mm suffix (rusty_key_mm(x))
// and all MM world-file rules are rewritten to call the suffixed name.
//
// Run: npx tsx scripts/fetch-logic.ts
// Or add to package.json scripts: "logic": "tsx scripts/fetch-logic.ts"

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'logic');

const OOTMM_RAW = 'https://raw.githubusercontent.com/OoTMM/OoTMM/master';
const OOTMM_API = 'https://api.github.com/repos/OoTMM/OoTMM/git/trees/master?recursive=1';

// ─── GitHub helpers ───────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function listRepoFiles(prefix: string): Promise<string[]> {
  console.log('Fetching repo tree…');
  const tree = await fetchJson(OOTMM_API);
  return (tree.tree as { path: string }[])
    .map(f => f.path)
    .filter(p => p.startsWith(prefix) && p.endsWith('.yml'));
}

// ─── YAML world file parsing ──────────────────────────────────────────────────

interface RawLocation { [name: string]: string }
interface RawExit     { [target: string]: string }
interface RawEvent    { [name: string]: string }

interface RawRegion {
  region?: string;
  dungeon?: string;
  exits?:     RawExit;
  locations?: RawLocation;
  events?:    RawEvent;
}

interface RawWorldFile { [regionName: string]: RawRegion }

// Name corrections: our CSV tracker name → OoTMM world location name
// Tracker CSV name → OoTMM world YAML name (our names are the source of truth)
const LOCATION_CORRECTIONS: Record<string, string> = {
  'MQ Shadow Temple SR Spikes Left Corner':        'MQ Shadow Temple SR Spikes Northwest Corner',
  'MQ Shadow Temple SR Spikes Left Wall':          'MQ Shadow Temple SR Spikes Southwest Wall',
  'MQ Shadow Temple SR Spikes Left Midair':        'MQ Shadow Temple SR Spikes West Midair',
  'MQ Shadow Temple SR Spikes Center Platforms':   'MQ Shadow Temple SR Spikes Ceiling',
  'MQ Shadow Temple SR Spikes Front Midair':       'MQ Shadow Temple SR Spikes South Midair',
  'MQ Shadow Temple SR Spikes Right Ground':       'MQ Shadow Temple SR Spikes East Ground',
  'MQ Shadow Temple SR Spikes Right Back Wall':    'MQ Shadow Temple SR Spikes Northeast Wall',
  'MQ Shadow Temple SR Spikes Right Lateral Wall': 'MQ Shadow Temple SR Spikes East Wall',
  'Secret Shrine Dinalfos Chest':                  'Secret Shrine Dinolfos Chest',
};
// Reverse: OoTMM YAML name → our tracker name (applied when parsing world files)
const OOTMM_TO_TRACKER: Record<string, string> = Object.fromEntries(
  Object.entries(LOCATION_CORRECTIONS).map(([ours, theirs]) => [theirs, ours])
);

// Rewrite MM rules: replace macro calls that got renamed to _mm variants.
// Function macros: "baseName(" → "baseName_mm("
// Constant macros: whole-word "name" → "name_mm"
function applyMmMacroRenaming(
  rule: string,
  renamedFunctions: Set<string>,
  renamedConstants: Set<string>,
): string {
  for (const baseName of renamedFunctions) {
    if (!baseName) continue;
    rule = rule.replaceAll(`${baseName}(`, `${baseName}_mm(`);
  }
  for (const name of renamedConstants) {
    if (!name) continue;
    // Replace whole-word occurrences (not preceded/followed by word chars or _mm already)
    rule = rule.replace(new RegExp(`(?<![\\w])${name}(?!_mm)(?![\\w])`, 'g'), `${name}_mm`);
  }
  return rule;
}

function parseWorldFile(
  yaml: string,
  game: 'oot' | 'mm',
  renamedFunctions: Set<string> = new Set(),
  renamedConstants: Set<string> = new Set(),
): any[] {
  const data: RawWorldFile = parseYaml(yaml);
  const regions = [];
  const rewrite = game === 'mm'
    ? (r: string) => applyMmMacroRenaming(r, renamedFunctions, renamedConstants)
    : (r: string) => r;

  for (const [regionName, regionData] of Object.entries(data)) {
    const exits = Object.entries(regionData.exits ?? {}).map(([target, rule]) => ({
      target,
      rule: rewrite(String(rule)),
    }));

    const locations = Object.entries(regionData.locations ?? {}).map(([name, rule]) => ({
      name: OOTMM_TO_TRACKER[name] ?? name,
      rule: rewrite(String(rule)),
    }));

    const events = Object.entries(regionData.events ?? {}).map(([name, rule]) => ({
      name,
      rule: rewrite(String(rule)),
    }));

    regions.push({
      name: regionName,
      game,
      dungeon: regionData.dungeon,
      exits,
      locations,
      events,
    });
  }
  return regions;
}

// ─── Macro file parsing ───────────────────────────────────────────────────────

function parseMacroFile(yaml: string): Record<string, string> {
  const data = parseYaml(yaml);
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    result[key] = String(value);
  }
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1. List files
  const allFiles   = await listRepoFiles('data/world/');
  const ootFiles   = allFiles.filter(p => p.startsWith('data/world/oot/'));
  const mmFiles    = allFiles.filter(p => p.startsWith('data/world/mm/'));
  const macroFiles = await listRepoFiles('data/macros/');

  // Separate OoT vs MM macro files by filename convention (_oot / _mm).
  // Files matching neither are treated as shared and loaded for both.
  const ootMacroFiles   = macroFiles.filter(p => path.basename(p).includes('_oot'));
  const mmMacroFiles    = macroFiles.filter(p => path.basename(p).includes('_mm'));
  const sharedMacroFiles = macroFiles.filter(
    p => !ootMacroFiles.includes(p) && !mmMacroFiles.includes(p)
  );

  console.log(
    `Found ${ootFiles.length} OoT + ${mmFiles.length} MM world files, ` +
    `${macroFiles.length} macro files (${ootMacroFiles.length} OoT, ${mmMacroFiles.length} MM, ${sharedMacroFiles.length} shared)`
  );

  // 2. Build macro table — macros FIRST so we know which MM macros conflict.

  const ootMacros: Record<string, string> = {};
  const allMacros: Record<string, string> = {};

  // Load shared + OoT macros
  for (const file of [...sharedMacroFiles, ...ootMacroFiles]) {
    process.stdout.write(`  Macros OoT: ${path.basename(file)}…`);
    const yaml = await fetchText(`${OOTMM_RAW}/${file}`);
    const m = parseMacroFile(yaml);
    Object.assign(ootMacros, m);
    Object.assign(allMacros, m);
    console.log(` ${Object.keys(m).length} macros`);
  }

  // Load MM macros; rename any key whose body differs from the OoT version
  // to avoid clobbering it.  Track renamed base names for world-file rewriting.
  const renamedMmFunctions = new Set<string>(); // function macros: "name(" → "name_mm("
  const renamedMmConstants = new Set<string>(); // constant macros: "name" → "name_mm"
  // All keys that originated from MM macro files (renamed or not) — their bodies
  // must be rewritten to call the _mm variants of any renamed macros/constants.
  const mmOriginKeys = new Set<string>();

  for (const file of mmMacroFiles) {
    process.stdout.write(`  Macros MM:  ${path.basename(file)}…`);
    const yaml = await fetchText(`${OOTMM_RAW}/${file}`);
    const m = parseMacroFile(yaml);
    let renamed = 0;

    for (const [key, value] of Object.entries(m)) {
      if (key in ootMacros && ootMacros[key] !== value) {
        const parenIdx = key.indexOf('(');
        if (parenIdx !== -1) {
          // Function macro conflict: store under _mm suffix so both definitions coexist.
          const mmKey = key.replace('(', '_mm(');
          allMacros[mmKey] = value;
          mmOriginKeys.add(mmKey);
          const baseName = key.substring(0, parenIdx);
          renamedMmFunctions.add(baseName);
          renamed++;
        } else {
          // Constant macro conflict: store MM version as key_mm, keep OoT version as-is.
          allMacros[`${key}_mm`] = value;
          mmOriginKeys.add(`${key}_mm`);
          renamedMmConstants.add(key);
          renamed++;
        }
      } else {
        allMacros[key] = value;
        mmOriginKeys.add(key);
      }
    }

    console.log(` ${Object.keys(m).length} macros${renamed ? `, ${renamed} renamed to _mm` : ''}`);
  }

  if (renamedMmFunctions.size > 0) {
    console.log(`  → MM function substitutions: ${[...renamedMmFunctions].map(n => `${n}→${n}_mm`).join(', ')}`);
  }
  if (renamedMmConstants.size > 0) {
    console.log(`  → MM constant substitutions: ${[...renamedMmConstants].map(n => `${n}→${n}_mm`).join(', ')}`);
  }

  // Rewrite bodies of ALL MM-origin macros so they reference renamed constants/functions.
  // Previously only _mm-keyed macros were rewritten, leaving non-conflicting MM macros
  // with bodies that still reference the OoT versions of renamed macros.
  // OoT macro bodies are never touched (only mmOriginKeys are rewritten).
  for (const key of mmOriginKeys) {
    allMacros[key] = applyMmMacroRenaming(allMacros[key], renamedMmFunctions, renamedMmConstants);
  }

  // 3. Fetch & parse world files
  const allRegions: any[] = [];

  for (const file of ootFiles) {
    process.stdout.write(`  OoT: ${path.basename(file)}…`);
    const yaml = await fetchText(`${OOTMM_RAW}/${file}`);
    const regions = parseWorldFile(yaml, 'oot');
    allRegions.push(...regions);
    console.log(` ${regions.length} regions`);
  }

  for (const file of mmFiles) {
    process.stdout.write(`  MM:  ${path.basename(file)}…`);
    const yaml = await fetchText(`${OOTMM_RAW}/${file}`);
    const regions = parseWorldFile(yaml, 'mm', renamedMmFunctions, renamedMmConstants);
    allRegions.push(...regions);
    console.log(` ${regions.length} regions`);
  }

  // 4. Write output
  const worldOut  = path.join(OUT_DIR, 'world.json');
  const macrosOut = path.join(OUT_DIR, 'macros.json');

  fs.writeFileSync(worldOut,  JSON.stringify(allRegions, null, 2));
  fs.writeFileSync(macrosOut, JSON.stringify(allMacros,  null, 2));

  console.log(`\nWrote ${allRegions.length} regions → ${worldOut}`);
  console.log(`Wrote ${Object.keys(allMacros).length} macros → ${macrosOut}`);
}

main().catch(e => { console.error(e); process.exit(1); });
