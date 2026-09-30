import { applyOp, OPS, type Op } from './arithmetic';
import { INITIAL_CONFIG, type GameConfig, type QualityThresholds } from './config';
import { leaf, node, type Expr } from './expr';
import { sourcePiece, type SourcePiece } from './pieces';
import { isNearDuplicate, puzzleIdForSeed, type GenerationStrategy, type Puzzle, type PuzzleSignature } from './puzzle';
import { evaluatePuzzle, type RejectionReason } from './quality';
import * as R from './rational';
import { createRng, type Rng } from './rng';
import { reachableTargets } from './solver';

// ---------------------------------------------------------------------------
// Number selection
// ---------------------------------------------------------------------------

/** Draw five source values from the configured distribution, capping repeats. */
export function drawSourceValues(rng: Rng, config: GameConfig): number[] {
  const values: number[] = [];
  const counts = new Map<number, number>();
  const keys = Object.keys(config.sourceWeights)
    .map(Number)
    .filter((n) => n >= config.sourceMin && n <= config.sourceMax);
  while (values.length < config.sourceCount) {
    const v = rng.weightedPick(keys, (k) => ((counts.get(k) ?? 0) >= config.generator.maxCopiesPerValue ? 0 : config.sourceWeights[k]));
    values.push(v);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return values;
}

// ---------------------------------------------------------------------------
// Constructive generation
// ---------------------------------------------------------------------------

/** A binary tree shape with `n` leaves: null marks a leaf. */
type Shape = null | [Shape, Shape];

const shapeCache = new Map<number, Shape[]>();
export function treeShapes(n: number): Shape[] {
  const hit = shapeCache.get(n);
  if (hit) return hit;
  const out: Shape[] = [];
  if (n === 1) out.push(null);
  for (let k = 1; k < n; k++) {
    for (const l of treeShapes(k)) for (const r of treeShapes(n - k)) out.push([l, r]);
  }
  shapeCache.set(n, out);
  return out;
}

/**
 * Build a random legal expression over `pieces` (in the given order) with the
 * given shape, choosing each operation among those that are legal for the
 * actual operand values. Returns null if the construction dead-ends.
 */
function construct(shape: Shape, pieces: SourcePiece[], rng: Rng, config: GameConfig): { expr: Expr; value: R.Rational } | null {
  let i = 0;
  const build = (s: Shape): { expr: Expr; value: R.Rational } | null => {
    if (s === null) {
      const p = pieces[i++];
      return { expr: leaf(p.id, p.value), value: p.value };
    }
    const l = build(s[0]);
    if (!l) return null;
    const r = build(s[1]);
    if (!r) return null;
    const legal: { op: Op; value: R.Rational }[] = [];
    for (const op of OPS) {
      const res = applyOp(op, l.value, r.value, config.rules);
      if (!res.ok || R.magnitude(res.value) > config.generator.maxConstructionIntermediate) continue;
      // Steps that change nothing (× 1, ÷ 1) make weak constructions; allow them only rarely.
      const identity = (op === 'mul' || op === 'div') && R.equals(r.value, R.ONE);
      if (identity && !rng.chance(0.15)) continue;
      legal.push({ op, value: res.value });
    }
    if (legal.length === 0) return null;
    const pick = rng.weightedPick(legal, (c) => config.generator.operationWeights[c.op]);
    return { expr: node(pick.op, l.expr, r.expr), value: pick.value };
  };
  return build(shape);
}

// ---------------------------------------------------------------------------
// Generation with verification, quality control and safeguards
// ---------------------------------------------------------------------------

export interface GenerateOptions {
  seed: number;
  config?: GameConfig;
  /** Recently played puzzles; near-identical candidates are skipped. */
  recent?: readonly PuzzleSignature[];
}

export interface GenerationReport {
  seed: number;
  attempts: number;
  /** 0 = full quality thresholds, 1 = relaxed, 2 = solvable-only, 3 = built-in fallback. */
  tier: number;
  strategy: GenerationStrategy;
  rejections: Partial<Record<RejectionReason, number>>;
  elapsedMs: number;
}

export interface GenerationResult {
  puzzle: Puzzle;
  report: GenerationReport;
}

function relaxed(q: QualityThresholds, tier: number): QualityThresholds {
  if (tier === 0) return q;
  if (tier === 1) {
    return {
      ...q,
      maxEasiestIntermediate: q.maxEasiestIntermediate * 2,
      maxEasiestEffort: q.maxEasiestEffort + 6,
      minEasiestEffort: Math.max(0, q.minEasiestEffort - 2),
      targetEchoCollapseEffort: Math.min(q.targetEchoCollapseEffort, 2),
    };
  }
  return {
    ...q,
    maxEasiestIntermediate: Infinity,
    maxEasiestEffort: Infinity,
    minEasiestEffort: 0,
    targetEchoCollapseEffort: -1,
    rejectSumOfAll: false,
    minDistinctSolutions: 1,
  };
}

/**
 * Hand-made puzzles used only if generation somehow exhausts every attempt.
 * Each is verified by the solver at runtime and in tests.
 */
export const FALLBACK_PUZZLES: readonly { values: number[]; target: number }[] = [
  { values: [3, 5, 7, 2, 4], target: 19 },
  { values: [9, 6, 2, 1, 8], target: 14 },
  { values: [12, 4, 3, 5, 2], target: 22 },
  { values: [7, 7, 3, 10, 2], target: 16 },
  { values: [16, 5, 4, 3, 6], target: 11 },
  { values: [2, 8, 9, 5, 1], target: 23 },
];

const TIERS = 3;

export function generatePuzzle(options: GenerateOptions): GenerationResult {
  const config = options.config ?? INITIAL_CONFIG;
  const recent = options.recent ?? [];
  const started = Date.now();
  const rng = createRng(options.seed);
  const rejections: Partial<Record<RejectionReason, number>> = {};
  const reject = (r: RejectionReason) => {
    rejections[r] = (rejections[r] ?? 0) + 1;
  };
  const maxTargetWeight = Math.max(...Object.values(config.targetWeights));
  let attempts = 0;

  for (let tier = 0; tier < TIERS; tier++) {
    const thresholds = relaxed(config.quality, tier);
    for (let a = 0; a < config.generator.attemptsPerTier; a++) {
      attempts++;
      const values = drawSourceValues(rng, config);
      const pieces = values.map((v, i) => sourcePiece(`s${i}`, R.int(v)));

      let target: number;
      let constructed: Expr | undefined;
      let strategy: GenerationStrategy;
      if (rng.chance(config.generator.validatedRandomShare)) {
        // Validated random: choose among the targets the solver says are reachable.
        strategy = 'validated-random';
        const reachable = reachableTargets(pieces, config.rules, config.targetMin, config.targetMax).filter(
          (t) => (config.targetWeights[t] ?? 0) > 0,
        );
        if (reachable.length === 0) {
          reject('unsolvable');
          continue;
        }
        target = rng.weightedPick(reachable, (t) => config.targetWeights[t] ?? 0);
      } else {
        strategy = 'constructive';
        const shape = rng.pick(treeShapes(config.sourceCount));
        const built = construct(shape, rng.shuffle(pieces), rng, config);
        if (!built) {
          reject('construction-failed');
          continue;
        }
        if (!R.isInteger(built.value) || built.value.num < config.targetMin || built.value.num > config.targetMax) {
          reject('target-out-of-range');
          continue;
        }
        target = built.value.num;
        // Even out the target distribution (constructions favour small results).
        if (!rng.chance((config.targetWeights[target] ?? 0) / maxTargetWeight)) {
          reject('target-weight');
          continue;
        }
        constructed = built.expr;
      }

      const sig = { target, values: [...values].sort((x, y) => x - y) };
      if (recent.some((r) => isNearDuplicate(sig, r))) {
        reject('near-duplicate');
        continue;
      }

      // Independent verification + quality, regardless of how the candidate was made.
      const q = evaluatePuzzle(pieces, target, config, thresholds, constructed);
      if ('unsolvable' in q) {
        reject('unsolvable');
        continue;
      }
      if (q.rejections.length) {
        q.rejections.forEach(reject);
        continue;
      }

      const puzzle: Puzzle = {
        id: puzzleIdForSeed(options.seed),
        seed: options.seed >>> 0,
        target,
        sources: rng.shuffle(pieces),
        witness: q.witness,
        easiest: q.easiest,
        metrics: q.metrics,
        strategy,
      };
      return {
        puzzle,
        report: { seed: options.seed, attempts, tier, strategy, rejections, elapsedMs: Date.now() - started },
      };
    }
  }

  // Last resort: a verified hand-made puzzle. Never loops forever.
  const order = rng.shuffle(FALLBACK_PUZZLES);
  for (const f of order) {
    const pieces = f.values.map((v, i) => sourcePiece(`s${i}`, R.int(v)));
    const q = evaluatePuzzle(pieces, f.target, config, relaxed(config.quality, 2));
    if ('unsolvable' in q) continue;
    return {
      puzzle: {
        id: puzzleIdForSeed(options.seed),
        seed: options.seed >>> 0,
        target: f.target,
        sources: rng.shuffle(pieces),
        witness: q.witness,
        easiest: q.easiest,
        metrics: q.metrics,
        strategy: 'fallback',
      },
      report: { seed: options.seed, attempts, tier: 3, strategy: 'fallback', rejections, elapsedMs: Date.now() - started },
    };
  }
  throw new Error('No valid puzzle could be produced, including fallbacks — configuration is inconsistent.');
}
