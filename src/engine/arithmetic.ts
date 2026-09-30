import type { RuleSet } from './config';
import * as R from './rational';
import type { Rational } from './rational';

export type Op = 'add' | 'sub' | 'mul' | 'div';
export const OPS: readonly Op[] = ['add', 'sub', 'mul', 'div'];

export const OP_SYMBOL: Record<Op, string> = { add: '+', sub: '−', mul: '×', div: '÷' };
export const OP_WORD: Record<Op, string> = {
  add: 'plus',
  sub: 'minus',
  mul: 'times',
  div: 'divided by',
};
export const PRECEDENCE: Record<Op, number> = { add: 1, sub: 1, mul: 2, div: 2 };
export const isCommutative = (op: Op) => op === 'add' || op === 'mul';

export type Violation = 'divide-by-zero' | 'fraction' | 'negative' | 'overflow';

export type OpResult = { ok: true; value: Rational } | { ok: false; violation: Violation };

/**
 * The one place where arithmetic happens. The parser, validator, solver and
 * generator all call this, so the rules are identical everywhere.
 */
export function applyOp(op: Op, a: Rational, b: Rational, rules: RuleSet): OpResult {
  let value: Rational;
  try {
    switch (op) {
      case 'add':
        value = R.add(a, b);
        break;
      case 'sub':
        value = R.sub(a, b);
        break;
      case 'mul':
        value = R.mul(a, b);
        break;
      case 'div':
        if (R.isZero(b)) return { ok: false, violation: 'divide-by-zero' };
        value = R.div(a, b);
        break;
    }
  } catch (e) {
    if (e instanceof R.ArithmeticOverflowError) return { ok: false, violation: 'overflow' };
    throw e;
  }
  if (!rules.allowFractionalIntermediates && !R.isInteger(value)) {
    return { ok: false, violation: 'fraction' };
  }
  if (!rules.allowNegativeIntermediates && R.isNegative(value)) {
    return { ok: false, violation: 'negative' };
  }
  return { ok: true, value };
}
