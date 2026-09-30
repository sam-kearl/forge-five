/**
 * Exact rational numbers built from safe JavaScript integers.
 *
 * The initial release only ever produces whole numbers (den === 1), but every
 * engine value flows through this type so that fractional play can be enabled
 * later by flipping a rule flag rather than rewriting the solver.
 */

export interface Rational {
  readonly num: number;
  readonly den: number; // always > 0, and gcd(|num|, den) === 1
}

export class ArithmeticOverflowError extends Error {
  constructor() {
    super('Value exceeds the exact-integer range');
    this.name = 'ArithmeticOverflowError';
  }
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

function checkSafe(n: number): number {
  if (!Number.isSafeInteger(n)) throw new ArithmeticOverflowError();
  return n;
}

const intCache = new Map<number, Rational>();

/** A whole number as a Rational. Small values are cached to cut allocation in the solver. */
export function int(n: number): Rational {
  checkSafe(n);
  if (n >= -64 && n <= 1024) {
    let r = intCache.get(n);
    if (!r) {
      r = Object.freeze({ num: n, den: 1 });
      intCache.set(n, r);
    }
    return r;
  }
  return { num: n, den: 1 };
}

export function frac(num: number, den: number): Rational {
  checkSafe(num);
  checkSafe(den);
  if (den === 0) throw new RangeError('Zero denominator');
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den) || 1;
  num /= g;
  den /= g;
  return den === 1 ? int(num) : { num, den };
}

export const ZERO = int(0);
export const ONE = int(1);

export const add = (a: Rational, b: Rational): Rational =>
  a.den === 1 && b.den === 1 ? int(checkSafe(a.num + b.num)) : frac(checkSafe(a.num * b.den + b.num * a.den), checkSafe(a.den * b.den));

export const sub = (a: Rational, b: Rational): Rational =>
  a.den === 1 && b.den === 1 ? int(checkSafe(a.num - b.num)) : frac(checkSafe(a.num * b.den - b.num * a.den), checkSafe(a.den * b.den));

export const mul = (a: Rational, b: Rational): Rational =>
  a.den === 1 && b.den === 1 ? int(checkSafe(a.num * b.num)) : frac(checkSafe(a.num * b.num), checkSafe(a.den * b.den));

/** Caller must ensure b is non-zero. */
export function div(a: Rational, b: Rational): Rational {
  if (b.num === 0) throw new RangeError('Division by zero');
  return frac(checkSafe(a.num * b.den), checkSafe(a.den * b.num));
}

export const isZero = (a: Rational) => a.num === 0;
export const isInteger = (a: Rational) => a.den === 1;
export const isNegative = (a: Rational) => a.num < 0;
export const equals = (a: Rational, b: Rational) => a.num === b.num && a.den === b.den;
export const compare = (a: Rational, b: Rational) => a.num * b.den - b.num * a.den;

/** Stable map key. Whole numbers use their plain decimal form. */
export const key = (a: Rational): string => (a.den === 1 ? String(a.num) : `${a.num}/${a.den}`);

/** Plain ASCII form, e.g. "12", "-3", "7/2". Presentation adds typographic minus signs. */
export const toString = (a: Rational): string => key(a);

/** Approximate magnitude, for quality heuristics only — never for equality. */
export const magnitude = (a: Rational): number => Math.abs(a.num / a.den);
