import type { Expr } from './expr';
import * as R from './rational';

/**
 * A normal form used to decide when two solutions are "really the same idea".
 * Chains of + and − are flattened into signed terms, chains of × and ÷ into
 * numerator and denominator factors, and each list is sorted. Leaves are
 * compared by face value, so swapping two equal pieces is not a new solution.
 *
 *   (8 + 4) + 2  ≡  2 + (4 + 8)        a − (b − c)  ≡  (a + c) − b
 */
export function canonicalKey(expr: Expr): string {
  return canon(expr);
}

function canon(e: Expr): string {
  if (e.kind === 'leaf') return R.key(e.value);
  if (e.op === 'add' || e.op === 'sub') {
    const pos: string[] = [];
    const neg: string[] = [];
    collectSum(e, true, pos, neg);
    pos.sort();
    neg.sort();
    return `S(${pos.join(',')}${neg.length ? `;${neg.join(',')}` : ''})`;
  }
  const num: string[] = [];
  const den: string[] = [];
  collectProduct(e, true, num, den);
  num.sort();
  den.sort();
  return `P(${num.join(',')}${den.length ? `;${den.join(',')}` : ''})`;
}

function collectSum(e: Expr, positive: boolean, pos: string[], neg: string[]) {
  if (e.kind === 'op' && (e.op === 'add' || e.op === 'sub')) {
    collectSum(e.left, positive, pos, neg);
    collectSum(e.right, e.op === 'add' ? positive : !positive, pos, neg);
  } else (positive ? pos : neg).push(canon(e));
}

function collectProduct(e: Expr, top: boolean, num: string[], den: string[]) {
  if (e.kind === 'op' && (e.op === 'mul' || e.op === 'div')) {
    collectProduct(e.left, top, num, den);
    collectProduct(e.right, e.op === 'mul' ? top : !top, num, den);
  } else (top ? num : den).push(canon(e));
}
