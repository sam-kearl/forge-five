import { PRECEDENCE, type Op } from './arithmetic';
import { node, type Expr } from './expr';
import type { PieceId } from './pieces';

/** A single item on the workbench. Every token has a stable id for UI keys and selection. */
export type Token =
  | { readonly id: string; readonly type: 'piece'; readonly pieceId: PieceId }
  | { readonly id: string; readonly type: 'op'; readonly op: Op }
  | { readonly id: string; readonly type: 'lparen' }
  | { readonly id: string; readonly type: 'rparen' };

export type ParseErrorKind =
  | 'empty'
  | 'extra-close' // a ")" with no matching "("
  | 'unclosed' // a "(" that is never closed
  | 'empty-parens' // "()"
  | 'missing-operand' // an operator lacks a number on one side
  | 'missing-operator' // two numbers or groups side by side
  | 'unknown-piece';

export interface ParseError {
  kind: ParseErrorKind;
  /** Index of the token the problem is attached to (-1 for an empty expression). */
  index: number;
  /** True when the problem is simply that the player hasn't finished typing yet. */
  incomplete: boolean;
}

export type ParseResult =
  | { ok: true; expr: Expr; pieceIds: PieceId[] }
  | { ok: false; error: ParseError };

class Fail {
  constructor(readonly error: ParseError) {}
}

/**
 * Parse workbench tokens into an expression tree using normal precedence
 * (× ÷ before + −, left to right within a level). Pieces expand to their own
 * trees via `expand`, so forged pieces keep full provenance.
 */
export function parseTokens(tokens: readonly Token[], expand: (pieceId: PieceId) => Expr | undefined): ParseResult {
  const n = tokens.length;
  if (n === 0) return { ok: false, error: { kind: 'empty', index: -1, incomplete: true } };

  // Bracket structure first, so that bracket problems get the clearest message.
  const stack: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = tokens[i];
    if (t.type === 'lparen') stack.push(i);
    else if (t.type === 'rparen') {
      if (stack.length === 0) return { ok: false, error: { kind: 'extra-close', index: i, incomplete: false } };
      stack.pop();
    }
  }
  const firstUnclosed = stack.length > 0 ? stack[0] : -1;

  let pos = 0;
  const pieceIds: PieceId[] = [];
  const fail = (kind: ParseErrorKind, index: number, incomplete = false): never => {
    throw new Fail({ kind, index, incomplete });
  };

  const primary = (): Expr => {
    if (pos >= n) {
      // Ran out of tokens where a number was expected: the player is mid-expression.
      return fail('missing-operand', pos - 1, true);
    }
    const t = tokens[pos];
    switch (t.type) {
      case 'piece': {
        const e = expand(t.pieceId);
        if (!e) return fail('unknown-piece', pos);
        pieceIds.push(t.pieceId);
        pos++;
        return e;
      }
      case 'lparen': {
        const open = pos++;
        if (pos < n && tokens[pos].type === 'rparen') return fail('empty-parens', open);
        if (pos >= n) return fail('unclosed', open, true);
        const inner = expression(1);
        if (pos >= n) return fail('unclosed', open, true);
        const next = tokens[pos];
        if (next.type !== 'rparen') return fail('missing-operator', pos);
        pos++;
        return inner;
      }
      case 'rparen':
        // e.g. "(3 + )" — the operator before this has no right-hand number.
        return fail('missing-operand', pos - 1);
      case 'op':
        // e.g. "× 3" or "3 + × 4"
        return fail('missing-operand', pos);
    }
  };

  const expression = (minPrec: number): Expr => {
    let left = primary();
    while (pos < n) {
      const t = tokens[pos];
      if (t.type !== 'op' || PRECEDENCE[t.op] < minPrec) break;
      pos++;
      const right = expression(PRECEDENCE[t.op] + 1);
      left = node(t.op, left, right);
    }
    return left;
  };

  try {
    const expr = expression(1);
    if (pos < n) {
      const t = tokens[pos];
      // A ")" here cannot be an extra close (checked above), so a number or group follows directly.
      if (t.type === 'piece' || t.type === 'lparen') fail('missing-operator', pos);
      fail('extra-close', pos);
    }
    if (firstUnclosed >= 0) fail('unclosed', firstUnclosed, true);
    return { ok: true, expr, pieceIds };
  } catch (e) {
    if (e instanceof Fail) return { ok: false, error: e.error };
    throw e;
  }
}

/** Is the token range [start, end] a self-contained, bracket-balanced run? */
export function isBalancedRange(tokens: readonly Token[], start: number, end: number): boolean {
  let depth = 0;
  for (let i = start; i <= end; i++) {
    const t = tokens[i];
    if (t.type === 'lparen') depth++;
    else if (t.type === 'rparen' && --depth < 0) return false;
  }
  return depth === 0;
}
