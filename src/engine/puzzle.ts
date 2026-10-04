import type { Expr } from './expr';
import type { SourcePiece } from './pieces';

export type GenerationStrategy = 'constructive' | 'validated-random' | 'fallback';

export interface QualityMetrics {
  /** Distinct solutions up to reordering/regrouping (a lower bound when `solutionCountCapped`). */
  distinctSolutions: number;
  solutionCountCapped: boolean;
  /** Estimated mental effort of the easiest known solution (see quality.ts). */
  easiestEffort: number;
  /** Largest intermediate value in the easiest known solution. */
  easiestMaxIntermediate: number;
  /** Largest intermediate appearing in the constructed/witness solution. */
  witnessMaxIntermediate: number;
  targetInSources: boolean;
  /** Every known solution uses ÷ / − / × respectively. */
  requiresDivision: boolean;
  requiresSubtraction: boolean;
  requiresMultiplication: boolean;
  /** Shortest tree depth among known solutions (2 = very flat). */
  minDepth: number;
  /** Greatest common factor shared by all five sources (1 = none). */
  commonFactor: number;
  /** A source sits within 2 of the target. */
  nearTarget: boolean;
}

export interface Puzzle {
  /** Stable, human-shareable id derived from the seed, e.g. "F5-1k9x3a". */
  readonly id: string;
  readonly seed: number;
  readonly target: number;
  /** In display order. Ids (s0…s4) are permanent and independent of order. */
  readonly sources: readonly SourcePiece[];
  /** At least one verified solution (kept for tests, debugging and future hints; never shown during play). */
  readonly witness: Expr;
  /** The easiest known solution, per the effort model. */
  readonly easiest: Expr;
  readonly metrics: QualityMetrics;
  readonly strategy: GenerationStrategy;
  /** The level it was generated for (absent on puzzles saved before levels existed). */
  readonly level?: number;
}

/** Order-independent signature used to avoid repeating near-identical puzzles. */
export interface PuzzleSignature {
  target: number;
  /** Sorted source face values. */
  values: number[];
}

export const signatureOf = (p: Pick<Puzzle, 'target' | 'sources'>): PuzzleSignature => ({
  target: p.target,
  values: p.sources.map((s) => s.value.num).sort((a, b) => a - b),
});

/** Same target and at least four of the five values shared (as a multiset). */
export function isNearDuplicate(a: PuzzleSignature, b: PuzzleSignature): boolean {
  if (a.target !== b.target) return false;
  const pool = [...b.values];
  let shared = 0;
  for (const v of a.values) {
    const i = pool.indexOf(v);
    if (i >= 0) {
      shared++;
      pool.splice(i, 1);
    }
  }
  return shared >= 4;
}

/** Shareable id: the level (if any) plus the seed, which together reproduce the puzzle exactly. */
export const puzzleIdForSeed = (seed: number, level?: number) =>
  level === undefined ? `F5-${(seed >>> 0).toString(36)}` : `F5-L${level}-${(seed >>> 0).toString(36)}`;
