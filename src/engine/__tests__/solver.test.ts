import { canonicalKey } from '../canonical';
import { evaluate, leaves } from '../expr';
import { formatExpr } from '../format';
import * as R from '../rational';
import { createSolver, reachableTargets, solve } from '../solver';
import { validateSolution } from '../validate';
import { exprOf, mkSources, referenceReachable, RULES, testRng } from './helpers';

const items = (values: number[]) => mkSources(values).map((s) => ({ id: s.id, value: s.value }));

describe('solver: known puzzles', () => {
  it('finds a solution for a solvable puzzle and the proof validates', () => {
    const src = mkSources([8, 4, 2, 3, 6]);
    const w = solve(items([8, 4, 2, 3, 6]), 36, RULES);
    expect(w).not.toBeNull();
    expect(validateSolution(w!, src, 36, RULES).ok).toBe(true);
  });

  it('solves a puzzle that needs addition four times', () => {
    // 1+1+1+1+1 = 5 is the only way to reach 5 from five 1s.
    const w = solve(items([1, 1, 1, 1, 1]), 5, RULES);
    expect(w && formatExpr(w)).toBe('1 + 1 + 1 + 1 + 1');
  });

  it('returns null for an unsolvable puzzle', () => {
    // Five 1s can never reach 25 (max is (1+1)×(1+1+1) = 6).
    expect(solve(items([1, 1, 1, 1, 1]), 25, RULES)).toBeNull();
  });

  it('finds chains that need subtraction before division', () => {
    // e.g. (25 − 1) ÷ (2 + 1 + 1) = 6
    const w = solve(items([25, 1, 2, 1, 1]), 6, RULES);
    expect(w).not.toBeNull();
    expect(validateSolution(w!, mkSources([25, 1, 2, 1, 1]), 6, RULES).ok).toBe(true);
  });

  it('never uses fractional intermediates even when they would help', () => {
    // 3 ÷ 2 × 4 is not allowed, but 3 × 4 ÷ 2 reaches 6 legally.
    const w = createSolver(items([3, 2, 4]), RULES).solve(R.int(6));
    expect(w).not.toBeNull();
    expect(evaluate(w!, RULES).ok).toBe(true);
    // 7 and 2 can only reach 3 via 7 ÷ 2 (not whole) — so it is unreachable.
    expect(createSolver(items([7, 2]), RULES).solve(R.int(3))).toBeNull();
  });

  it('never uses negative intermediates', () => {
    // Exhaustively compare small targets against the reference, which also forbids negatives.
    const ref = referenceReachable([2, 5, 4]);
    for (let t = 0; t <= 40; t++) {
      expect(createSolver(items([2, 5, 4]), RULES).solve(R.int(t)) !== null).toBe(ref.has(String(t)));
    }
  });

  it('tracks duplicate faces as separate pieces', () => {
    const w = solve(items([6, 6, 1, 2, 3]), 25, RULES);
    expect(w).not.toBeNull();
    const ids = leaves(w!)
      .map((l) => l.sourceId)
      .sort();
    expect(ids).toEqual(['s0', 's1', 's2', 's3', 's4']);
  });
});

describe('solver: agrees with an independent brute-force reference', () => {
  const rnd = testRng(2026);
  const cases: number[][] = [];
  for (let k = 0; k < 250; k++) {
    const n = 5;
    const vals: number[] = [];
    for (let i = 0; i < n; i++) vals.push(1 + Math.floor(rnd() * 25));
    cases.push(vals);
  }
  // A few hand-picked tricky ones: zeros are impossible as sources, but many
  // duplicates and ones are interesting.
  cases.push([1, 1, 1, 1, 1], [25, 25, 25, 25, 25], [2, 2, 2, 2, 2], [1, 1, 25, 25, 13], [7, 7, 7, 1, 1]);

  it.each(cases.map((c) => [c.join(',')]))('%s', (key) => {
    const vals = key.split(',').map(Number);
    const src = mkSources(vals);
    const ref = referenceReachable(vals);
    const solver = createSolver(items(vals), RULES);

    // 1) Every target 0–60: solvable exactly when the reference says so.
    for (let t = 0; t <= 60; t++) {
      const w = solver.solve(R.int(t));
      expect([t, w !== null]).toEqual([t, ref.has(String(t))]);
      if (w) {
        // 2) Every proof is genuinely valid and uses each piece exactly once.
        expect(validateSolution(w, src, t, RULES).ok).toBe(true);
      }
    }
    // 3) The full reachable set matches exactly (no false solutions, none missed).
    const full = [...solver.reach(solver.fullMask).keys()].sort();
    expect(full).toEqual([...ref].sort());
    expect(reachableTargets(items(vals), RULES, 1, 25)).toEqual(
      [...ref]
        .map(Number)
        .filter((v) => v >= 1 && v <= 25)
        .sort((a, b) => a - b),
    );
  });
});

describe('solution enumeration', () => {
  const vals = [8, 4, 2, 3, 6];
  const src = mkSources(vals);
  const solver = createSolver(items(vals), RULES);

  it('returns only valid solutions', () => {
    const sols = solver.enumerate(R.int(20), 500);
    expect(sols.length).toBeGreaterThan(0);
    for (const s of sols) expect(validateSolution(s, src, 20, RULES).ok).toBe(true);
  });

  it('includes a known solution', () => {
    const known = canonicalKey(exprOf('(8 + 4 + 2) × 3 − 6', src));
    const keys = new Set(solver.enumerate(R.int(36), 5000).map(canonicalKey));
    expect(keys.has(known)).toBe(true);
  });

  it('respects the limit', () => {
    expect(solver.enumerate(R.int(20), 3).length).toBeLessThanOrEqual(3);
  });

  it('returns nothing for an unreachable target', () => {
    expect(createSolver(items([1, 1, 1, 1, 1]), RULES).enumerate(R.int(25), 100)).toEqual([]);
  });

  it('does not emit both orders of a commutative operation', () => {
    const s = createSolver(items([2, 3]), RULES);
    expect(s.enumerate(R.int(5), 100).map((e) => formatExpr(e))).toEqual(['2 + 3']);
    expect(s.enumerate(R.int(6), 100).map((e) => formatExpr(e))).toEqual(['2 × 3']);
    expect(s.enumerate(R.int(1), 100).map((e) => formatExpr(e))).toEqual(['3 − 2']);
  });

  it('deduplicates equal faces safely (one tree for 6 + 6, not two)', () => {
    const s = createSolver(items([6, 6]), RULES);
    expect(s.enumerate(R.int(12), 100)).toHaveLength(1);
    // …but both identities are still usable when the faces are needed separately.
    const w = createSolver(items([6, 6, 2]), RULES).solve(R.int(2));
    expect(
      w &&
        leaves(w)
          .map((l) => l.sourceId)
          .sort(),
    ).toEqual(['s0', 's1', 's2']);
  });
});

describe('canonical form', () => {
  const src = mkSources([8, 4, 2, 3, 6]);
  const k = (t: string) => canonicalKey(exprOf(t, src));
  it('treats reordered sums as the same', () => expect(k('8 + 4 + 2')).toBe(k('2 + (4 + 8)')));
  it('treats reordered products as the same', () => expect(k('(8 × 3) × 2')).toBe(k('2 × 8 × 3')));
  it('normalises nested subtraction', () => expect(k('8 − (4 − 2)')).toBe(k('8 + 2 − 4')));
  it('distinguishes genuinely different solutions', () => expect(k('8 + 4 × 2')).not.toBe(k('(8 + 4) × 2')));
  it('treats equal faces as interchangeable', () => {
    const d = mkSources([6, 6, 1]);
    const e1 = {
      kind: 'op' as const,
      op: 'sub' as const,
      left: { kind: 'leaf' as const, sourceId: 's0', value: R.int(6) },
      right: { kind: 'leaf' as const, sourceId: 's1', value: R.int(6) },
    };
    const e2 = { ...e1, left: e1.right, right: e1.left };
    expect(canonicalKey(e1)).toBe(canonicalKey(e2));
    expect(d).toHaveLength(3);
  });
});
