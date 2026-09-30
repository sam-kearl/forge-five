import type { Op } from './arithmetic';
import type { Token } from './parse';
import type { PieceId } from './pieces';
import * as R from './rational';

/**
 * Convert typed text (keyboard play on web, tests, debugging) into workbench
 * tokens. Numbers are never free constants: every number written must be
 * matched to a distinct available piece with that value, otherwise the text is
 * rejected. This is the same restriction the tap interface enforces.
 */

export interface AvailablePiece {
  pieceId: PieceId;
  value: R.Rational;
}

export type TextTokenResult =
  | { ok: true; tokens: Token[] }
  | {
      ok: false;
      error: { kind: 'unavailable-number'; value: number; offset: number } | { kind: 'unexpected-character'; char: string; offset: number };
    };

const OP_CHARS: Record<string, Op> = {
  '+': 'add',
  '-': 'sub',
  '−': 'sub',
  '–': 'sub',
  '*': 'mul',
  '×': 'mul',
  x: 'mul',
  X: 'mul',
  '·': 'mul',
  '/': 'div',
  '÷': 'div',
};

export function tokensFromText(text: string, available: readonly AvailablePiece[], idPrefix = 't'): TextTokenResult {
  const pool = [...available];
  const tokens: Token[] = [];
  let k = 0;
  const id = () => `${idPrefix}${k++}`;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      const start = i;
      while (i < text.length && /[0-9]/.test(text[i])) i++;
      const value = Number(text.slice(start, i));
      const idx = pool.findIndex((p) => R.equals(p.value, R.int(value)));
      if (idx < 0) return { ok: false, error: { kind: 'unavailable-number', value, offset: start } };
      tokens.push({ id: id(), type: 'piece', pieceId: pool[idx].pieceId });
      pool.splice(idx, 1);
      continue;
    }
    if (c === '(' || c === '[') tokens.push({ id: id(), type: 'lparen' });
    else if (c === ')' || c === ']') tokens.push({ id: id(), type: 'rparen' });
    else if (OP_CHARS[c]) tokens.push({ id: id(), type: 'op', op: OP_CHARS[c] });
    else return { ok: false, error: { kind: 'unexpected-character', char: c, offset: i } };
    i++;
  }
  return { ok: true, tokens };
}
