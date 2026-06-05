#!/usr/bin/env node
// Build script: fetches OoTMM world + macro YAML files from GitHub and compiles
// them into src/data/logic/world.json + src/data/logic/macros.json.
//
// Run: npx tsx scripts/fetch-logic.ts
// Or add to package.json scripts: "logic": "tsx scripts/fetch-logic.ts"

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src', 'data', 'logic');

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

function parseWorldFile(yaml: string, game: 'oot' | 'mm'): any[] {
  const data: RawWorldFile = parseYaml(yaml);
  const regions = [];

  for (const [regionName, regionData] of Object.entries(data)) {
    const exits = Object.entries(regionData.exits ?? {}).map(([target, rule]) => ({
      target,
      rule: String(rule),
      // entranceId will be mapped post-processing
    }));

    const locations = Object.entries(regionData.locations ?? {}).map(([name, rule]) => ({
      name,
      rule: String(rule),
    }));

    const events = Object.entries(regionData.events ?? {}).map(([name, rule]) => ({
      name,
      rule: String(rule),
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

  // 1. List world files
  const allFiles = await listRepoFiles('data/world/');
  const ootFiles = allFiles.filter(p => p.startsWith('data/world/oot/'));
  const mmFiles  = allFiles.filter(p => p.startsWith('data/world/mm/'));
  const macroFiles = await listRepoFiles('data/macros/');

  console.log(`Found ${ootFiles.length} OoT + ${mmFiles.length} MM world files, ${macroFiles.length} macro files`);

  // 2. Fetch & parse world files
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
    const regions = parseWorldFile(yaml, 'mm');
    allRegions.push(...regions);
    console.log(` ${regions.length} regions`);
  }

  // 3. Fetch & merge macro files
  const allMacros: Record<string, string> = {};

  for (const file of macroFiles) {
    process.stdout.write(`  Macros: ${path.basename(file)}…`);
    const yaml = await fetchText(`${OOTMM_RAW}/${file}`);
    const macros = parseMacroFile(yaml);
    Object.assign(allMacros, macros);
    console.log(` ${Object.keys(macros).length} macros`);
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
