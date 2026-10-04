import { applyOp, isCommutative, OPS, type Op } from './arithmetic';
import type { RuleSet } from './config';
import { leaf, node, type Expr, type SourceId } from './expr';
import * as R from './rational';
import type { Rational } from './rational';

/**
 * Exhaustive solver.
 *
 * reach(S) maps every value obtainable from exactly the pieces in subset S
 * (each used once) to one witness tree. For |S| > 1 every value comes from a
 * root operation whose left and right operands use complementary, non-empty
 * parts A and B of S — so enumerating every split, every operation and both
 * operand orders covers every tree shape, grouping and ordering. All arithmetic
 * goes through applyOp, so rule violations (÷0, fractions, negatives) are
 * pruned exactly as they are for the player.
 *
 * Safe deduplication:
 *  - values are keyed exactly, so equivalent intermediate states merge;
 *  - splits whose face-value multisets were already processed for the same S
 *    are skipped (two 6s produce identical value sets);
 *  - for + and × only one operand order is tried.
 */

export interface SolverItem {
  id: SourceId;
  value: Rational;
}

interface Entry {
  value: Rational;
  witness: Expr;
}

type ReachMap = Map<string, Entry>;

export interface Solver {
  readonly items: readonly SolverItem[];
  readonly fullMask: number;
  /** All values reachable using exactly the pieces in `mask`. */
  reach(mask: number): ReachMap;
  /** A witness tree using every piece exactly once, or null. */
  solve(target: Rational): Expr | null;
  /**
   * Distinct raw trees reaching `target` with every piece, up to `limit`.
   * `onTree` sees each complete solution as it is found; returning true stops early.
   */
  enumerate(target: Rational, limit: number, onTree?: (tree: Expr) => boolean): Expr[];
}

const lowestBit = (m: number) => m & -m;

export function createSolver(items: readonly SolverItem[], rules: RuleSet): Solver {
  const n = items.length;
  if (n === 0 || n > 8) throw new RangeError('Solver supports 1–8 pieces');
  const fullMask = (1 << n) - 1;
  const memo = new Map<number, ReachMap>();
  const faceSig = new Map<number, string>();

  const sig = (mask: number): string => {
    let s = faceSig.get(mask);
    if (s === undefined) {
      const faces: string[] = [];
      for (let i = 0; i < n; i++) if (mask & (1 << i)) faces.push(R.key(items[i].value));
      s = faces.sort().join(',');
      faceSig.set(mask, s);
    }
    return s;
  };

  /**
   * Visit each unordered split {A, B} of `mask` once (A holds the lowest bit),
   * skipping splits whose face-value multisets repeat an earlier split.
   */
  const forEachSplit = (mask: number, visit: (a: number, b: number) => void) => {
    const low = lowestBit(mask);
    const rest = mask ^ low;
    const seen = new Set<string>();
    // Enumerate subsets of `rest`; A = low | sub, B = rest ^ sub (must be non-empty).
    for (let sub = rest; ; sub = (sub - 1) & rest) {
      const a = low | sub;
      const b = mask ^ a;
      if (b !== 0) {
        const sa = sig(a);
        const sb = sig(b);
        const k = sa < sb ? `${sa}|${sb}` : `${sb}|${sa}`;
        if (!seen.has(k)) {
          seen.add(k);
          visit(a, b);
        }
      }
      if (sub === 0) break;
    }
  };

  const reach = (mask: number): ReachMap => {
    let m = memo.get(mask);
    if (m) return m;
    m = new Map();
    if ((mask & (mask - 1)) === 0) {
      const i = Math.log2(mask);
      m.set(R.key(items[i].value), { value: items[i].value, witness: leaf(items[i].id, items[i].value) });
    } else {
      const out = m;
      const put = (op: Op, x: Entry, y: Entry) => {
        const r = applyOp(op, x.value, y.value, rules);
        if (!r.ok) return;
        const k = R.key(r.value);
        if (!out.has(k)) out.set(k, { value: r.value, witness: node(op, x.witness, y.witness) });
      };
      forEachSplit(mask, (a, b) => {
        const ra = reach(a);
        const rb = reach(b);
        for (const x of ra.values()) {
          for (const y of rb.values()) {
            put('add', x, y);
            put('mul', x, y);
            put('sub', x, y);
            put('sub', y, x);
            put('div', x, y);
            put('div', y, x);
          }
        }
      });
    }
    memo.set(mask, m);
    return m;
  };

  /**
   * For each way the root could produce `target` from the split (A, B), call
   * `found(op, leftMask, leftValue, rightMask, rightValue)`. Uses inverse
   * operations so the full set never has to be materialised.
   */
  const forEachRoot = (
    mask: number,
    target: Rational,
    found: (op: Op, lm: number, lv: Rational, rm: number, rv: Rational) => boolean | void,
  ): void => {
    let stop = false;
    forEachSplit(mask, (am, bm) => {
      if (stop) return;
      const ra = reach(am);
      const rb = reach(bm);
      const tryPair = (op: Op, lm: number, lv: Rational, rm: number, rv: Rational) => {
        if (stop) return;
        const r = applyOp(op, lv, rv, rules);
        if (r.ok && R.equals(r.value, target) && found(op, lm, lv, rm, rv) === true) stop = true;
      };
      const lookup = (map: ReachMap, v: Rational | null) => (v === null ? undefined : map.get(R.key(v)));
      const safe = (f: () => Rational): Rational | null => {
        try {
          return f();
        } catch {
          return null;
        }
      };
      for (const x of ra.values()) {
        if (stop) return;
        const a = x.value;
        for (const op of OPS) {
          // a op b = target, with A on the left
          if (op === 'add') {
            const y = lookup(
              rb,
              safe(() => R.sub(target, a)),
            );
            if (y) tryPair('add', am, a, bm, y.value);
          } else if (op === 'mul') {
            if (R.isZero(a)) {
              if (R.isZero(target)) for (const y of rb.values()) tryPair('mul', am, a, bm, y.value);
            } else {
              const y = lookup(
                rb,
                safe(() => R.div(target, a)),
              );
              if (y) tryPair('mul', am, a, bm, y.value);
            }
          } else if (op === 'sub') {
            const y1 = lookup(
              rb,
              safe(() => R.sub(a, target)),
            ); // a − b = t
            if (y1) tryPair('sub', am, a, bm, y1.value);
            const y2 = lookup(
              rb,
              safe(() => R.add(target, a)),
            ); // b − a = t
            if (y2) tryPair('sub', bm, y2.value, am, a);
          } else {
            // a ÷ b = t
            if (R.isZero(target)) {
              if (R.isZero(a)) for (const y of rb.values()) if (!R.isZero(y.value)) tryPair('div', am, a, bm, y.value);
            } else {
              const y1 = lookup(
                rb,
                safe(() => R.div(a, target)),
              );
              if (y1) tryPair('div', am, a, bm, y1.value);
            }
            // b ÷ a = t
            if (!R.isZero(a)) {
              const y2 = lookup(
                rb,
                safe(() => R.mul(target, a)),
              );
              if (y2) tryPair('div', bm, y2.value, am, a);
            }
          }
        }
      }
    });
  };

  const solve = (target: Rational): Expr | null => {
    if ((fullMask & (fullMask - 1)) === 0) {
      return R.equals(items[0].value, target) ? leaf(items[0].id, items[0].value) : null;
    }
    let result: Expr | null = null;
    forEachRoot(fullMask, target, (op, lm, lv, rm, rv) => {
      result = node(op, reach(lm).get(R.key(lv))!.witness, reach(rm).get(R.key(rv))!.witness);
      return true;
    });
    return result;
  };

  const enumerate = (target: Rational, limit: number, onTree?: (tree: Expr) => boolean): Expr[] => {
    const out: Expr[] = [];
    // Returns up to `cap` trees for (mask, value). `top` marks the full-set call, where onTree applies.
    const trees = (mask: number, value: Rational, cap: number, top = false): Expr[] => {
      if ((mask & (mask - 1)) === 0) {
        const i = Math.log2(mask);
        return R.equals(items[i].value, value) ? [leaf(items[i].id, items[i].value)] : [];
      }
      const res: Expr[] = [];
      forEachRoot(mask, value, (op, lm, lv, rm, rv) => {
        // For commutative ops keep one operand order: the side holding the lowest bit goes left.
        if (isCommutative(op) && lowestBit(mask) & rm) return;
        const ls = trees(lm, lv, cap - res.length);
        for (const l of ls) {
          const rs = trees(rm, rv, cap - res.length);
          for (const r of rs) {
            const tree = node(op, l, r);
            res.push(tree);
            if (res.length >= cap || (top && onTree?.(tree))) return true;
          }
        }
        return res.length >= cap;
      });
      return res;
    };
    if ((fullMask & (fullMask - 1)) === 0) {
      const single = trees(fullMask, target, limit);
      single.forEach((t) => onTree?.(t));
      return single;
    }
    out.push(...trees(fullMask, target, limit, true));
    return out;
  };

  return { items, fullMask, reach, solve, enumerate };
}

/** Convenience: is `target` reachable from these values using each exactly once? */
export function solve(items: readonly SolverItem[], target: number, rules: RuleSet): Expr | null {
  return createSolver(items, rules).solve(R.int(target));
}

/** Every whole-number target in [min, max] that the pieces can reach. */
export function reachableTargets(items: readonly SolverItem[], rules: RuleSet, min: number, max: number): number[] {
  const s = createSolver(items, rules);
  const full = s.reach(s.fullMask);
  const out: number[] = [];
  for (const e of full.values()) {
    if (R.isInteger(e.value) && e.value.num >= min && e.value.num <= max) out.push(e.value.num);
  }
  return out.sort((a, b) => a - b);
}
