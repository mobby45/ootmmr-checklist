import type { ExprNode } from '../types';

// ─── Tokenizer ────────────────────────────────────────────────────────────────

type Token =
  | { type: 'ident'; value: string }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'op'; value: '&&' | '||' | '!' | '(' | ')' | ',' };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (src[i] === '&' && src[i + 1] === '&') { tokens.push({ type: 'op', value: '&&' }); i += 2; continue; }
    if (src[i] === '|' && src[i + 1] === '|') { tokens.push({ type: 'op', value: '||' }); i += 2; continue; }
    if (ch === '!') { tokens.push({ type: 'op', value: '!' }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'op', value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'op', value: ')' }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'op', value: ',' }); i++; continue; }
    if (ch === '"' || ch === "'") {
      const q = ch; i++;
      let s = '';
      while (i < src.length && src[i] !== q) s += src[i++];
      i++;
      tokens.push({ type: 'string', value: s });
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let n = '';
      while (i < src.length && /[0-9]/.test(src[i])) n += src[i++];
      tokens.push({ type: 'number', value: parseInt(n, 10) });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) id += src[i++];
      tokens.push({ type: 'ident', value: id });
      continue;
    }
    i++; // skip unknown char
  }
  return tokens;
}

// ─── Recursive-descent parser ─────────────────────────────────────────────────

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }
  private expect(type: string, value?: string): Token {
    const t = this.consume();
    if (t.type !== type || (value !== undefined && t.value !== value))
      throw new Error(`Expected ${type}${value ? ' ' + value : ''}, got ${JSON.stringify(t)}`);
    return t;
  }
  private match(type: string, value?: string): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }

  parse(): ExprNode { return this.parseOr(); }

  private parseOr(): ExprNode {
    let left = this.parseAnd();
    while (this.match('op', '||')) {
      this.consume();
      const right = this.parseAnd();
      left = { kind: 'or', left, right };
    }
    return left;
  }

  private parseAnd(): ExprNode {
    let left = this.parseNot();
    while (this.match('op', '&&')) {
      this.consume();
      const right = this.parseNot();
      left = { kind: 'and', left, right };
    }
    return left;
  }

  private parseNot(): ExprNode {
    if (this.match('op', '!')) {
      this.consume();
      return { kind: 'not', expr: this.parsePrimary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExprNode {
    const t = this.peek();
    if (!t) return { kind: 'true' };

    // Parenthesized expression
    if (t.type === 'op' && t.value === '(') {
      this.consume();
      const expr = this.parseOr();
      this.expect('op', ')');
      return expr;
    }

    // Number literal (rare but possible)
    if (t.type === 'number') { this.consume(); return t.value ? { kind: 'true' } : { kind: 'false' }; }

    if (t.type !== 'ident') return { kind: 'true' };
    this.consume();
    const name = t.value;

    // Check for function call
    if (this.match('op', '(')) {
      this.consume();
      const args = this.parseArgs();
      this.expect('op', ')');
      return this.buildCall(name, args);
    }

    // Bare identifier (macro or boolean constant)
    if (name === 'true')  return { kind: 'true' };
    if (name === 'false') return { kind: 'false' };

    // Bare identifiers treated as no-arg macro calls
    return { kind: 'macro', name, args: [] };
  }

  private parseArgs(): ExprNode[] {
    const args: ExprNode[] = [];
    if (this.match('op', ')')) return args;
    args.push(this.parseArgValue());
    while (this.match('op', ',')) {
      this.consume();
      args.push(this.parseArgValue());
    }
    return args;
  }

  // Arguments can be expressions OR bare identifiers/strings treated as string literals
  private parseArgValue(): ExprNode {
    const t = this.peek();
    if (!t) return { kind: 'true' };

    // If next token is ident and the one after is NOT '(' '&&' '||' ',' ')' → string literal arg
    if (t.type === 'ident') {
      const next = this.tokens[this.pos + 1];
      const isStringArg = !next || next.type === 'op' && (next.value === ',' || next.value === ')');
      if (isStringArg) {
        this.consume();
        // Return a sentinel node that evaluates as the string value — eval.ts handles this
        return { kind: 'macro', name: '__str__' + t.value, args: [] };
      }
    }
    if (t.type === 'string') {
      this.consume();
      return { kind: 'macro', name: '__str__' + t.value, args: [] };
    }
    if (t.type === 'number') {
      this.consume();
      return { kind: 'macro', name: '__num__' + t.value, args: [] };
    }
    return this.parseOr();
  }

  private buildCall(name: string, args: ExprNode[]): ExprNode {
    const strArg  = (i: number) => argStr(args[i]);
    const numArg  = (i: number) => argNum(args[i]);
    const exprArg = (i: number) => args[i] ?? { kind: 'true' as const };

    switch (name) {
      case 'has':       return { kind: 'has',     item: strArg(0),   count: args[1] ? numArg(1) : 1 };
      case 'renewable': return { kind: 'renewable', item: strArg(0) };
      case 'license':   return { kind: 'license',   item: strArg(0) };
      case 'event':     return { kind: 'event',   name: strArg(0) };
      case 'setting':   return { kind: 'setting', key: strArg(0), value: args[1] ? strArg(1) : true };
      case 'trick':     return { kind: 'trick',   name: strArg(0) };
      case 'age':       return { kind: 'age',     age: strArg(0) as 'child' | 'adult' };
      case 'oot_time':  return { kind: 'oot_time', time: strArg(0) };
      case 'mm_time':   return { kind: 'mm_time',  value: numArg(0) };
      case 'flag_on':   return { kind: 'flag_on',  flag: strArg(0) };
      case 'flag_off':  return { kind: 'flag_off', flag: strArg(0) };
      case 'price':     return { kind: 'price',    slot: numArg(0), max: numArg(1) };
      case 'cond':      return { kind: 'cond',     cond: exprArg(0), then: exprArg(1), else: exprArg(2) };
      default:          return { kind: 'macro',    name, args };
    }
  }
}

function argStr(node: ExprNode | undefined): string {
  if (!node) return '';
  if (node.kind === 'macro' && node.name.startsWith('__str__')) return node.name.slice(7);
  if (node.kind === 'macro' && node.name.startsWith('__num__')) return node.name.slice(7);
  return '';
}

function argNum(node: ExprNode | undefined): number {
  if (!node) return 0;
  if (node.kind === 'macro' && node.name.startsWith('__num__')) return parseInt(node.name.slice(7), 10);
  if (node.kind === 'macro' && node.name.startsWith('__str__')) return parseInt(node.name.slice(7), 10) || 0;
  return 0;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function parseExpr(src: string): ExprNode {
  const tokens = tokenize(src.trim());
  if (tokens.length === 0) return { kind: 'true' };
  return new Parser(tokens).parse();
}
