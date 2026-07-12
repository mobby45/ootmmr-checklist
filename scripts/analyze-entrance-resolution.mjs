#!/usr/bin/env node
// Analyzes which entrances in the ER_BLOCKABLE_TYPES fail to resolve
// their source or destination region in world.json.
// Output: grouped failure list with the attempted match string.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const world = JSON.parse(readFileSync(resolve(ROOT, 'public/logic/world.json'), 'utf8'));
const regionNames = new Set(world.map(r => r.name));

// Must mirror world.ts REGION_NAME_OVERRIDES exactly
const REGION_NAME_OVERRIDES = {
  'Lake Hylia Shortcut':                'Lake Hylia Near Shortcut',
  "Dog Lady's House":                   'Dog Lady House',
  "Mayor's Office":                     "Mayor's Residence Office",
  'Clock Town East Stock Pot Inn Roof': 'Stock Pot Inn Roof',
  'Great Bay Coast Near Cow Grotto':    'GBC Near Cow Grotto',
  'Mountain Village Winter':            'Mountain Village',
};

function resolveEntranceName(name) {
  const m = name.match(/ to (?:OOT|MM) (.+)$/);
  if (!m) return null;
  const dest = REGION_NAME_OVERRIDES[m[1].trim()] ?? m[1].trim();
  for (const r of regionNames) if (r === dest) return r;
  for (const r of regionNames) if (r.startsWith(dest)) return r;
  for (const r of regionNames) if (r.toLowerCase().includes(dest.toLowerCase())) return r;
  return null;
}

function resolveEntranceSource(name) {
  const m = name.match(/^(?:OOT|MM) (.+?) to (?:OOT|MM) /);
  if (!m) return null;
  const src = REGION_NAME_OVERRIDES[m[1].trim()] ?? m[1].trim();
  for (const r of regionNames) if (r === src) return r;
  for (const r of regionNames) if (r.startsWith(src)) return r;
  for (const r of regionNames) if (r.toLowerCase().includes(src.toLowerCase())) return r;
  return null;
}

// Inline the allEntrances data (just what we need)
const { allEntrances } = await import('../src/data/entranceData.ts').catch(() => {
  // fallback: parse from the TS file manually
  const ts = readFileSync(resolve(ROOT, 'src/data/entranceData.ts'), 'utf8');
  const matches = [...ts.matchAll(/\{ id: '([^']+)', name: "([^"]+)", type: '[^']+', erType: '([^']+)'/g)];
  return { allEntrances: matches.map(([, id, name, erType]) => ({ id, name, erType })) };
});

const ER_BLOCKABLE = new Set(['erDungeons', 'erBoss', 'erGrottos', 'erIndoors', 'erOverworld']);

const byType = {};
let totalSrc = 0, failSrc = 0;
let totalDst = 0, failDst = 0;

for (const e of allEntrances) {
  if (!ER_BLOCKABLE.has(e.erType)) continue;
  const type = e.erType;
  if (!byType[type]) byType[type] = { ok: 0, failSrc: [], failDst: [] };

  const srcM = e.name.match(/^(?:OOT|MM) (.+?) to (?:OOT|MM) /);
  const dstM = e.name.match(/ to (?:OOT|MM) (.+)$/);
  const srcTry = srcM ? srcM[1].trim() : null;
  const dstTry = dstM ? dstM[1].trim() : null;

  const src = resolveEntranceSource(e.name);
  const dst = resolveEntranceName(e.name);

  totalSrc++; totalDst++;
  if (!src) { failSrc++; byType[type].failSrc.push({ id: e.id, name: e.name, tried: srcTry }); }
  if (!dst) { failDst++; byType[type].failDst.push({ id: e.id, name: e.name, tried: dstTry }); }
  if (src && dst) byType[type].ok++;
}

console.log(`=== Entrance Resolution Analysis ===\n`);
console.log(`Source failures: ${failSrc}/${totalSrc}`);
console.log(`Dest   failures: ${failDst}/${totalDst}\n`);

for (const [type, data] of Object.entries(byType)) {
  const srcFails = data.failSrc.length;
  const dstFails = data.failDst.length;
  if (srcFails + dstFails === 0) { console.log(`[${type}] ✓ all ok`); continue; }
  console.log(`\n[${type}] ${srcFails} src fails, ${dstFails} dst fails`);
  if (srcFails) {
    console.log(`  SOURCE fails:`);
    for (const f of data.failSrc) console.log(`    ${f.id}: tried "${f.tried}" — ${f.name}`);
  }
  if (dstFails) {
    console.log(`  DEST fails:`);
    for (const f of data.failDst) console.log(`    ${f.id}: tried "${f.tried}" — ${f.name}`);
  }
}
