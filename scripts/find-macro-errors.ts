import { readFileSync } from 'fs';
import { parseExpr } from '../src/logic/expr/parse.ts';

const rawMacros: Record<string, string> = JSON.parse(readFileSync('public/logic/macros.json', 'utf8'));
const PARAM_RE = /^(\w[\w\d_]*)\(([^)]+)\)$/;

let fails = 0;
for (const [key, expr] of Object.entries(rawMacros)) {
  if (PARAM_RE.test(key)) continue;
  try {
    parseExpr(expr);
  } catch (e: any) {
    fails++;
    console.log('MACRO:', key);
    console.log('  EXPR:', expr.slice(0, 120));
    console.log('  ERR:', e.message);
  }
}
console.log(fails + ' failures in non-parametrized macros');
