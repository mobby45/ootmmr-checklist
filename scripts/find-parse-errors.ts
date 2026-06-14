import { readFileSync } from 'fs';
import { parseExpr } from '../src/logic/expr/parse.ts';

const world = JSON.parse(readFileSync('public/logic/world.json', 'utf8'));
let fails = 0;
for (const region of world) {
  for (const loc of (region.locations ?? [])) {
    try { parseExpr(loc.rule); } catch(e: any) {
      fails++;
      console.log('LOC:', loc.rule.slice(0, 100), '\n =>', e.message);
    }
  }
  for (const exit of (region.exits ?? [])) {
    try { parseExpr(exit.rule); } catch(e: any) {
      fails++;
      console.log('EXIT:', exit.rule.slice(0, 100), '\n =>', e.message);
    }
  }
  for (const ev of (region.events ?? [])) {
    try { parseExpr(ev.rule); } catch(e: any) {
      fails++;
      console.log('EVT:', ev.rule.slice(0, 100), '\n =>', e.message);
    }
  }
}
console.log(fails + ' total failures');
