import { applyOp } from '../arithmetic';
import * as R from '../rational';
import { RULES } from './helpers';

const i = R.int;
const ok = (v: number) => ({ ok: true, value: i(v) });

describe('rational', () => {
  it('normalises fractions', () => {
    expect(R.frac(6, 4)).toEqual({ num: 3, den: 2 });
    expect(R.frac(3, -6)).toEqual({ num: -1, den: 2 });
    expect(R.frac(8, 4)).toBe(i(2));
  });
  it('does exact arithmetic without floating error', () => {
    const tenth = R.frac(1, 10);
    const sum = R.add(R.add(tenth, tenth), tenth);
    expect(R.equals(sum, R.frac(3, 10))).toBe(true);
  });
  it('detects overflow beyond safe integers', () => {
    expect(() => R.mul(i(2 ** 40), i(2 ** 20))).toThrow(R.ArithmeticOverflowError);
  });
});

describe('applyOp under initial rules', () => {
  it('adds', () => expect(applyOp('add', i(8), i(17), RULES)).toEqual(ok(25)));
  it('subtracts to zero', () => expect(applyOp('sub', i(9), i(9), RULES)).toEqual(ok(0)));
  it('rejects negative subtraction', () => {
    expect(applyOp('sub', i(3), i(8), RULES)).toEqual({ ok: false, violation: 'negative' });
  });
  it('multiplies', () => expect(applyOp('mul', i(12), i(11), RULES)).toEqual(ok(132)));
  it('divides exactly', () => expect(applyOp('div', i(24), i(6), RULES)).toEqual(ok(4)));
  it('rejects fractional division', () => {
    expect(applyOp('div', i(7), i(2), RULES)).toEqual({ ok: false, violation: 'fraction' });
  });
  it('rejects division by zero', () => {
    expect(applyOp('div', i(5), i(0), RULES)).toEqual({ ok: false, violation: 'divide-by-zero' });
    expect(applyOp('div', i(0), i(0), RULES)).toEqual({ ok: false, violation: 'divide-by-zero' });
  });
  it('allows zero divided by a number', () => expect(applyOp('div', i(0), i(7), RULES)).toEqual(ok(0)));
  it('reports overflow as a violation instead of throwing', () => {
    expect(applyOp('mul', i(2 ** 40), i(2 ** 20), RULES)).toEqual({ ok: false, violation: 'overflow' });
  });
});

describe('applyOp with future rule flags', () => {
  const open = { allowNegativeIntermediates: true, allowFractionalIntermediates: true };
  it('can permit fractions exactly', () => {
    const r = applyOp('div', i(7), i(2), open);
    expect(r.ok && r.value).toEqual({ num: 7, den: 2 });
  });
  it('can permit negatives', () => {
    const r = applyOp('sub', i(3), i(8), open);
    expect(r.ok && r.value).toBe(i(-5));
  });
  it('still forbids division by zero', () => {
    expect(applyOp('div', i(3), i(0), open).ok).toBe(false);
  });
});
