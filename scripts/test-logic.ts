// Logic engine smoke test — run with: npx tsx scripts/test-logic.ts
import { readFileSync } from 'fs';
import { parseExpr } from '../src/logic/expr/parse.ts';
import { evalExpr, type MacroTable } from '../src/logic/expr/eval.ts';
import type { ExprNode } from '../src/logic/types.ts';

const PARAM_RE = /^(\w[\w\d_]*)\(([^)]+)\)$/;

function argToString(node: ExprNode): string {
  if (node.kind !== 'macro') return '0';
  if (node.name.startsWith('__str__')) return node.name.slice(7);
  if (node.name.startsWith('__num__')) return node.name.slice(7);
  return node.name;
}

function buildMacroTable(rawMacros: Record<string, string>): MacroTable {
  const table: MacroTable = new Map();
  for (const [key, expr] of Object.entries(rawMacros)) {
    const pm = key.match(PARAM_RE);
    if (pm) {
      const macroName = pm[1];
      const paramNames = pm[2].split(',').map(s => s.trim());
      table.set(macroName, (...args: ExprNode[]) => {
        let body = expr;
        for (let i = 0; i < paramNames.length; i++) {
          const val = args[i] ? argToString(args[i]) : '0';
          body = body.replace(new RegExp(`\\b${paramNames[i]}\\b`, 'g'), val);
        }
        return parseExpr(body);
      });
    } else {
      try { table.set(key, parseExpr(expr)); } catch {}
    }
  }
  return table;
}

const rawMacros: Record<string, string> = JSON.parse(readFileSync('public/logic/macros.json', 'utf8'));
const macros = buildMacroTable(rawMacros);

type State = Parameters<typeof evalExpr>[1];

const emptyChild: State = {
  items: new Map(), age: 'child', events: new Set(),
  settings: new Map([['startingAge', 'child']]), erOverrides: new Map(), tricks: new Set(), flags: new Set(),
};
const childStarter: State = {
  items: new Map([
    ['SWORD_KOKIRI', 1], ['SWORD', 1],
    ['SLINGSHOT', 1],
    ['SHIELD_DEKU', 1], ['SHIELD', 1], // deku_shield → SHIELD_DEKU + SHIELD via itemMapping
    ['NUTS', 1], ['NUTS_5', 1], ['STICKS', 1], ['STICK', 1],
    ['OCARINA', 1], ['OCARINA_FAIRY', 1],
  ]),
  age: 'child', events: new Set(['SEEDS', 'STICKS', 'NUTS']),
  settings: new Map([['startingAge', 'child']]), erOverrides: new Map(), tricks: new Set(), flags: new Set(),
};
const adultFull: State = {
  items: new Map([
    ['SWORD_MASTER', 1], ['SWORD', 2],
    ['BOW', 1], ['HOOKSHOT', 1], ['LONGSHOT', 1],
    ['BOMB_BAG', 1], ['HAMMER', 1],
    ['BOOTS_IRON', 1], ['BOOTS_HOVER', 1],
    ['TUNIC_GORON', 1], ['TUNIC_ZORA', 1],
    ['SCALE', 1], ['STRENGTH', 1],
    ['MAGIC_UPGRADE', 1], ['LENS', 1],
    ['OCARINA', 2], ['OCARINA_OF_TIME', 1],
    ['ARROW_FIRE', 1], ['ARROW_ICE', 1], ['ARROW_LIGHT', 1],
    ['SPELL_FIRE', 1], ['SPELL_WIND', 1], ['SPELL_LOVE', 1],
    ['GERUDO_CARD', 1],
  ]),
  age: 'adult', events: new Set(['ARROWS', 'BOMBS', 'MAGIC', 'OPEN_DOJO']),
  settings: new Map([['startingAge', 'child']]), erOverrides: new Map(), tricks: new Set(), flags: new Set(),
};

function ev(expr: string, state: State): boolean {
  return evalExpr(parseExpr(expr), state, macros);
}

const tests: [string, State, boolean][] = [
  // Age
  ['is_child',             childStarter, true],
  ['is_adult',             childStarter, false],
  ['is_adult',             adultFull,    true],
  // Sword
  ['can_use_sword_kokiri', childStarter, true],
  ['can_use_sword_kokiri', emptyChild,   false],
  ['can_use_sword_master', childStarter, false],
  ['can_use_sword_master', adultFull,    true],
  ['can_use_sword',        childStarter, true],
  ['can_use_sword',        emptyChild,   false],
  // Ranged
  ['can_use_slingshot',    childStarter, true],
  ['can_use_slingshot',    adultFull,    false],
  ['can_use_bow',          childStarter, false],
  ['can_use_bow',          adultFull,    true],
  ['can_use_fire_arrows',  adultFull,    true],   // ARROW_FIRE (not ARROWS_FIRE)
  ['can_use_din_raw',      adultFull,    true],   // SPELL_FIRE (not DINS_FIRE),
  // Items
  ['has_bombs',            childStarter, false],
  ['has_bombs',            adultFull,    true],
  ['can_hookshot',         adultFull,    true], // OoTMM uses can_hookshot, not can_use_hookshot
  ['has_iron_boots',       adultFull,    true],
  ['can_use_sticks',       childStarter, true],
  ['can_use_sticks',       emptyChild,   false],
  ['has_ranged_weapon',    childStarter, true],
  ['has_ranged_weapon',    emptyChild,   false],
  ['has_shield_for_scrubs',childStarter, true],
  ['has_shield_for_scrubs',emptyChild,   false],
  // Magic
  ['has_magic',            adultFull,    true],
  ['can_use_lens',         adultFull,    true],
  // Swim
  ['can_swim',             childStarter, true],  // bronzeScale off → always swimable
  ['can_swim',             emptyChild,   true],  // same
];

let pass = 0; let fail = 0;
console.log('\n╔══ MACRO TESTS ═══════════════════════════════════════════════════╗');
for (const [expr, state, expected] of tests) {
  const result = ev(expr, state);
  const label = state === emptyChild ? '∅' : state === childStarter ? 'child' : 'adult';
  if (result === expected) { pass++; console.log(`  ✓ ${expr} [${label}]`); }
  else                     { fail++; console.log(`  ✗ ${expr} [${label}] expected=${expected} got=${result}`); }
}
console.log(`╚══ ${pass}/${pass+fail} passed ═════════════════════════════════════╝`);

// Location rule tests
const world: any[] = JSON.parse(readFileSync('public/logic/world.json', 'utf8'));

const locTests: [string, string, State, boolean][] = [
  ['Deku Tree Lobby',   'Deku Tree Map Chest',        childStarter, true],  // rule: true
  ['Deku Tree Lobby',   'Deku Tree GS Compass',       childStarter, true],  // gs && can_damage_skull, sling
  ['Deku Tree Lobby',   'Deku Tree GS Compass',       emptyChild,   false],
  ['Deku Tree Lobby',   'Deku Tree Grass Lobby 1',    childStarter, true],  // can_cut_grass + sword
  ['Deku Tree Lobby',   'Deku Tree Grass Lobby 1',    emptyChild,   false], // no sword, no sticks
];

console.log('\n╔══ LOCATION RULE TESTS ═════════════════════════════════════════════╗');
for (const [regionName, locName, state, expected] of locTests) {
  const region = world.find((r: any) => r.name === regionName && r.game === 'oot');
  const loc = region?.locations.find((l: any) => l.name === locName);
  if (!loc) { console.log(`  ! NOT FOUND: ${locName}`); continue; }
  const result = ev(loc.rule, state);
  const label = state === emptyChild ? '∅' : state === childStarter ? 'child' : 'adult';
  if (result === expected) { pass++; console.log(`  ✓ ${locName} [${label}]`); }
  else                     { fail++; console.log(`  ✗ ${locName} [${label}] expected=${expected} got=${result} (rule:${loc.rule})`); }
}
console.log(`╚══ total: ${pass}/${pass+fail} passed ═══════════════════════════════╝\n`);
