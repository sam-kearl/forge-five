import { evaluate, leaves, type Expr } from '../expr';
import { formatExpr } from '../format';
import { parseTokens, type Token } from '../parse';
import { pieceExpr } from '../pieces';
import * as R from '../rational';
import { tokensFromText } from '../text';
import { validateSolution } from '../validate';
import { exprOf, mkSources, RULES } from './helpers';

const S = mkSources([8, 4, 2, 3, 6]);

const value = (e: Expr) => {
  const r = evaluate(e, RULES);
  if (!r.ok) throw new Error(`invalid: ${r.violation}`);
  return r.value.num;
};

function parseText(text: string) {
  const t = tokensFromText(
    text,
    S.map((s) => ({ pieceId: s.id, value: s.value })),
  );
  if (!t.ok) throw new Error('tokenize');
  return parseTokens(t.tokens, (id) => {
    const s = S.find((p) => p.id === id);
    return s && pieceExpr(s);
  });
}

describe('order of operations and parentheses', () => {
  it('multiplies before adding', () => expect(value(exprOf('2 + 4 × 3', S))).toBe(14));
  it('divides before subtracting', () => expect(value(exprOf('8 − 6 ÷ 2', S))).toBe(5));
  it('is left-associative within a level', () => expect(value(exprOf('8 − 4 − 2', S))).toBe(2));
  it('respects parentheses', () => expect(value(exprOf('(2 + 4) × 3', S))).toBe(18));
  it('handles nested parentheses', () => expect(value(exprOf('((8 + 4) ÷ (6 − 3)) × 2', S))).toBe(8));
  it('evaluates a multi-number expression', () => expect(value(exprOf('(8 + 4 + 2) × 3 − 6', S))).toBe(36));
  it('accepts ASCII operators', () => expect(value(exprOf('(8+4) / 2 * 3 - 6', S))).toBe(12));
});

describe('intermediate rules are checked at every node', () => {
  it('rejects a negative step even if the final answer is positive', () => {
    // 2 − 8 + 6 parses as (2 − 8) + 6: the first step is −6.
    const r = evaluate(exprOf('2 − 8 + 6', S), RULES);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.violation).toBe('negative');
      expect([r.leftValue.num, r.rightValue.num]).toEqual([2, 8]);
    }
  });
  it('accepts the same numbers when reordered legally', () => expect(value(exprOf('2 + 6 − 8', S))).toBe(0));
  it('rejects a fractional step', () => {
    const r = evaluate(exprOf('3 ÷ 2 × 4', S), RULES);
    expect(!r.ok && r.violation).toBe('fraction');
  });
  it('rejects division by zero produced by an intermediate', () => {
    const r = evaluate(exprOf('8 ÷ (6 − 3 − 3)', mkSources([8, 6, 3, 3])), RULES);
    expect(!r.ok && r.violation).toBe('divide-by-zero');
  });
});

describe('parse errors', () => {
  const err = (text: string) => {
    const p = parseText(text);
    if (p.ok) throw new Error('expected error');
    return p.error;
  };
  it('reports an empty expression as incomplete', () => {
    expect(parseTokens([], () => undefined)).toEqual({ ok: false, error: { kind: 'empty', index: -1, incomplete: true } });
  });
  it('reports a trailing operator as incomplete', () =>
    expect(err('8 +')).toMatchObject({ kind: 'missing-operand', index: 1, incomplete: true }));
  it('reports a leading operator', () => expect(err('× 8')).toMatchObject({ kind: 'missing-operand', index: 0, incomplete: false }));
  it('reports two operators in a row', () => expect(err('8 + × 4')).toMatchObject({ kind: 'missing-operand', index: 2 }));
  it('reports an operator before a closing bracket', () => expect(err('(8 + ) × 4')).toMatchObject({ kind: 'missing-operand', index: 2 }));
  it('reports numbers side by side', () => expect(err('8 4')).toMatchObject({ kind: 'missing-operator', index: 1 }));
  it('reports a number directly after a group', () => expect(err('(8 + 4) 2')).toMatchObject({ kind: 'missing-operator', index: 5 }));
  it('reports a group directly after a number', () => expect(err('8 (4 + 2)')).toMatchObject({ kind: 'missing-operator', index: 1 }));
  it('reports an unclosed bracket as incomplete', () =>
    expect(err('(8 + 4')).toMatchObject({ kind: 'unclosed', index: 0, incomplete: true }));
  it('reports an extra closing bracket', () => expect(err('8 + 4)')).toMatchObject({ kind: 'extra-close', index: 3 }));
  it('reports empty brackets', () => expect(err('8 + ()')).toMatchObject({ kind: 'empty-parens', index: 2 }));
  it('reports unknown pieces', () => {
    const tokens: Token[] = [{ id: 'a', type: 'piece', pieceId: 'ghost' }];
    const p = parseTokens(tokens, () => undefined);
    expect(!p.ok && p.error.kind).toBe('unknown-piece');
  });
});

describe('text input never creates free constants', () => {
  const avail = S.map((s) => ({ pieceId: s.id, value: s.value }));
  it('maps each number to a distinct piece', () => {
    const r = tokensFromText('8 + 4', avail);
    expect(r.ok && r.tokens.filter((t) => t.type === 'piece').map((t) => (t as { pieceId: string }).pieceId)).toEqual(['s0', 's1']);
  });
  it('rejects a number that is not a piece', () => {
    expect(tokensFromText('8 + 7', avail)).toMatchObject({ ok: false, error: { kind: 'unavailable-number', value: 7 } });
  });
  it('rejects using the same piece twice', () => {
    expect(tokensFromText('8 + 8', avail)).toMatchObject({ ok: false, error: { kind: 'unavailable-number', value: 8 } });
  });
  it('maps duplicate faces to separate identities', () => {
    const dup = mkSources([6, 6, 1]).map((s) => ({ pieceId: s.id, value: s.value }));
    const r = tokensFromText('6 + 6', dup);
    expect(r.ok && r.tokens.filter((t) => t.type === 'piece').map((t) => (t as { pieceId: string }).pieceId)).toEqual(['s0', 's1']);
  });
  it('rejects unexpected characters', () => {
    expect(tokensFromText('8 ^ 2', avail)).toMatchObject({ ok: false, error: { kind: 'unexpected-character', char: '^' } });
  });
});

describe('formatting', () => {
  const cases: [string, string][] = [
    ['(8 + 4 + 2) × 3 − 6', '(8 + 4 + 2) × 3 − 6'],
    ['8 + (4 + 2)', '8 + 4 + 2'],
    ['8 × (4 × 2)', '8 × 4 × 2'],
    ['8 − (4 − 2)', '8 − (4 − 2)'],
    ['8 − (4 + 2)', '8 − (4 + 2)'],
    ['8 + (4 − 2)', '8 + (4 − 2)'],
    ['8 ÷ (4 ÷ 2)', '8 ÷ (4 ÷ 2)'],
    ['(8 ÷ 4) ÷ 2', '8 ÷ 4 ÷ 2'],
    ['(8 × 3) + (6 ÷ 2)', '8 × 3 + 6 ÷ 2'],
    ['8 × (3 + 6)', '8 × (3 + 6)'],
    ['(((8)))', '8'],
  ];
  it.each(cases)('%s → %s', (input, expected) => {
    expect(formatExpr(exprOf(input, S))).toBe(expected);
  });

  it('round-trips: formatting then re-parsing keeps value and validity', () => {
    for (const [input] of cases) {
      const e = exprOf(input, S);
      const again = exprOf(formatExpr(e), S);
      expect(value(again)).toBe(value(e));
      expect(
        leaves(again)
          .map((l) => l.sourceId)
          .sort(),
      ).toEqual(
        leaves(e)
          .map((l) => l.sourceId)
          .sort(),
      );
    }
  });

  it('prints negative and fractional values typographically', () => {
    const e = { kind: 'leaf' as const, sourceId: 'x', value: R.frac(-7, 2) };
    expect(formatExpr(e)).toBe('−7/2');
  });
});

describe('validateSolution', () => {
  const target = 36;
  it('accepts a correct equation using all five pieces', () => {
    expect(validateSolution(exprOf('(8 + 4 + 2) × 3 − 6', S), S, target, RULES)).toMatchObject({ ok: true });
  });
  it('accepts using only two operation types, with repeats', () => {
    // + four times
    const five = mkSources([1, 2, 3, 4, 5]);
    expect(validateSolution(exprOf('1 + 2 + 3 + 4 + 5', five), five, 15, RULES).ok).toBe(true);
    // + and × only
    expect(validateSolution(exprOf('(1 + 2) × (3 + 4) + 5', five), five, 26, RULES).ok).toBe(true);
  });
  it('reports a missing source', () => {
    const r = validateSolution(exprOf('(8 + 4 + 2) × 3', S), S, 42, RULES);
    expect(!r.ok && r.issues).toEqual([{ kind: 'missing-source', sourceId: 's4' }]);
  });
  it('reports a duplicated source', () => {
    const e = exprOf('(8 + 4 + 2) × 3 − 6', S);
    const dup = { kind: 'op' as const, op: 'add' as const, left: e, right: { kind: 'leaf' as const, sourceId: 's0', value: R.int(8) } };
    const r = validateSolution(dup, S, 44, RULES);
    expect(!r.ok && r.issues).toContainEqual({ kind: 'duplicate-source', sourceId: 's0', count: 2 });
  });
  it('rejects an arbitrary constant', () => {
    const e = exprOf('(8 + 4 + 2) × 3 − 6', S);
    const withConst = {
      kind: 'op' as const,
      op: 'add' as const,
      left: e,
      right: { kind: 'leaf' as const, sourceId: 'k', value: R.int(1) },
    };
    const r = validateSolution(withConst, S, 37, RULES);
    expect(!r.ok && r.issues[0].kind).toBe('unknown-number');
  });
  it('rejects a leaf whose value does not match its piece', () => {
    const e = {
      kind: 'op' as const,
      op: 'add' as const,
      left: { kind: 'leaf' as const, sourceId: 's0', value: R.int(9) },
      right: exprOf('4 + 2 + 3 + 6', S),
    };
    const r = validateSolution(e, S, 24, RULES);
    expect(!r.ok && r.issues).toContainEqual({ kind: 'wrong-value', sourceId: 's0' });
  });
  it('reports the result when it misses the target', () => {
    const r = validateSolution(exprOf('8 + 4 + 2 + 3 + 6', S), S, 36, RULES);
    expect(r).toMatchObject({ ok: false, issues: [{ kind: 'wrong-result', target: 36 }], value: R.int(23) });
  });
  it('reports rule violations', () => {
    const r = validateSolution(exprOf('2 − 8 + 4 + 3 + 6', S), S, 7, RULES);
    expect(!r.ok && r.issues[0].kind).toBe('rule');
  });
});
