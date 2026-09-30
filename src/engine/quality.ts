import { canonicalKey } from './canonical';
import type { GameConfig, QualityThresholds, RuleSet } from './config';
import { depth, forEachStep, opsUsed, type Expr } from './expr';
import type { SourcePiece } from './pieces';
import type { QualityMetrics } from './puzzle';
import * as R from './rational';
import { createSolver } from './solver';

/**
 * Forge Five's original mental-effort model. Each step costs something based on
 * the operation and the size of the numbers involved; holding two separate
 * partial results in mind at once costs extra. It is a heuristic for filtering
 * and tuning, never shown to players, and should be recalibrated from playtesting.
 */
export function effortOf(expr: Expr, rules: RuleSet): number {
  let cost = 0;
  forEachStep(expr, rules, (op, a, b, result, n) => {
    const x = a.num;
    const y = b.num;
    const r = result.num;
    switch (op) {
      case 'add':
        cost += 1 + (r > 20 ? 0.4 : 0) + (r > 50 ? 0.6 : 0);
        break;
      case 'sub':
        cost += 1.2 + (x > 20 ? 0.4 : 0) + (x > 50 ? 0.6 : 0);
        break;
      case 'mul':
        if (x === 1 || y === 1) cost += 0.4;
        else if (x === 0 || y === 0) cost += 0.3;
        else cost += 1.4 + (Math.min(x, y) > 5 ? 0.8 : 0) + (r > 100 ? 1 : 0) + (r > 250 ? 1.5 : 0);
        break;
      case 'div':
        if (y === 1) cost += 0.4;
        else cost += 2 + (x > 50 ? 0.8 : 0) + (x > 150 ? 1.2 : 0);
        break;
    }
    // Both operands are themselves results: the player juggles two sub-answers.
    if (n.left.kind === 'op' && n.right.kind === 'op') cost += 0.7;
  });
  return Math.round(cost * 10) / 10;
}

export function maxIntermediate(expr: Expr, rules: RuleSet): number {
  let m = 0;
  forEachStep(expr, rules, (_op, _a, _b, r) => {
    m = Math.max(m, R.magnitude(r));
  });
  return m;
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

export type RejectionReason =
  | 'unsolvable'
  | 'target-echo'
  | 'sum-of-all'
  | 'too-few-solutions'
  | 'large-intermediates'
  | 'too-hard'
  | 'too-easy'
  | 'near-duplicate'
  | 'target-weight'
  | 'target-out-of-range'
  | 'construction-failed';

export interface QualityEvaluation {
  metrics: QualityMetrics;
  easiest: Expr;
  witness: Expr;
  rejections: RejectionReason[];
}

/**
 * Evaluate a candidate. `witness` (e.g. the constructed tree) is optional; the
 * solver independently confirms solvability either way.
 */
export function evaluatePuzzle(
  sources: readonly SourcePiece[],
  target: number,
  config: GameConfig,
  thresholds: QualityThresholds = config.quality,
  witness?: Expr,
): QualityEvaluation | { unsolvable: true } {
  const rules = config.rules;
  const solver = createSolver(
    sources.map((s) => ({ id: s.id, value: s.value })),
    rules,
  );
  const t = R.int(target);
  const proof = solver.solve(t);
  if (!proof) return { unsolvable: true };

  const raw = solver.enumerate(t, thresholds.enumerationLimit);
  const distinct = new Map<string, Expr>();
  for (const e of raw) {
    const k = canonicalKey(e);
    if (!distinct.has(k)) distinct.set(k, e);
  }
  const solutions = [...distinct.values()];
  if (solutions.length === 0) solutions.push(proof);

  let easiest = solutions[0];
  let easiestEffort = Infinity;
  let easiestMax = Infinity;
  let minDepth = Infinity;
  let allDiv = true;
  let allSub = true;
  let allMul = true;
  for (const s of solutions) {
    const e = effortOf(s, rules);
    const m = maxIntermediate(s, rules);
    if (e < easiestEffort || (e === easiestEffort && m < easiestMax)) {
      easiest = s;
      easiestEffort = e;
      easiestMax = m;
    }
    minDepth = Math.min(minDepth, depth(s));
    const ops = opsUsed(s);
    allDiv &&= ops.has('div');
    allSub &&= ops.has('sub');
    allMul &&= ops.has('mul');
  }

  const values = sources.map((s) => s.value.num);
  const targetInSources = values.includes(target);
  const w = witness ?? proof;
  const metrics: QualityMetrics = {
    distinctSolutions: solutions.length,
    solutionCountCapped: raw.length >= thresholds.enumerationLimit,
    easiestEffort,
    easiestMaxIntermediate: easiestMax,
    witnessMaxIntermediate: maxIntermediate(w, rules),
    targetInSources,
    requiresDivision: allDiv,
    requiresSubtraction: allSub,
    requiresMultiplication: allMul,
    minDepth,
    commonFactor: values.reduce(gcd),
    nearTarget: values.some((v) => Math.abs(v - target) <= 2),
  };

  const rejections: RejectionReason[] = [];
  if (
    targetInSources &&
    thresholds.targetEchoCollapseEffort >= 0 &&
    echoCollapseEffort(sources, target, config) <= thresholds.targetEchoCollapseEffort
  ) {
    rejections.push('target-echo');
  }
  if (thresholds.rejectSumOfAll && values.reduce((a, b) => a + b, 0) === target) rejections.push('sum-of-all');
  if (solutions.length < thresholds.minDistinctSolutions) rejections.push('too-few-solutions');
  if (easiestMax > thresholds.maxEasiestIntermediate) rejections.push('large-intermediates');
  if (easiestEffort > thresholds.maxEasiestEffort) rejections.push('too-hard');
  if (easiestEffort < thresholds.minEasiestEffort) rejections.push('too-easy');

  return { metrics, easiest, witness: w, rejections };
}

/**
 * When the target is one of the pieces, how easily can the other four be
 * collapsed to 0 (target + 0) or 1 (target × 1)? Returns the lowest effort
 * found, or Infinity when they cannot be collapsed at all.
 */
export function echoCollapseEffort(sources: readonly SourcePiece[], target: number, config: GameConfig): number {
  const idx = sources.findIndex((s) => s.value.num === target);
  if (idx < 0) return Infinity;
  const others = sources.filter((_, i) => i !== idx).map((s) => ({ id: s.id, value: s.value }));
  const solver = createSolver(others, config.rules);
  let best = Infinity;
  for (const v of [0, 1]) {
    for (const e of solver.enumerate(R.int(v), 60)) best = Math.min(best, effortOf(e, config.rules));
  }
  return best;
}
