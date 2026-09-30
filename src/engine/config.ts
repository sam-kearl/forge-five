/**
 * The single, documented source of truth for number ranges, rules and puzzle
 * selection. Nothing in the UI exposes these values in the initial release;
 * future modes can be built by supplying a different GameConfig.
 */

export interface RuleSet {
  /** Initial release: false. Every intermediate result must be ≥ 0. */
  allowNegativeIntermediates: boolean;
  /** Initial release: false. Every intermediate result must be a whole number. */
  allowFractionalIntermediates: boolean;
}

export interface QualityThresholds {
  /**
   * Reject when the *easiest* known solution needs an intermediate larger than
   * this. Stops "multiply two big numbers then divide it back" puzzles.
   */
  maxEasiestIntermediate: number;
  /** Reject when the easiest solution's estimated mental effort exceeds this. */
  maxEasiestEffort: number;
  /** Reject when every solution is this effortless (e.g. just add all five). */
  minEasiestEffort: number;
  /**
   * When the target is itself one of the pieces, reject if the other four can be
   * collapsed to 0 or 1 (target + 0, target × 1) with at most this much effort.
   * Set to a negative number to disable.
   */
  targetEchoCollapseEffort: number;
  /** Reject when simply adding all five numbers reaches the target. */
  rejectSumOfAll: boolean;
  /** Minimum number of distinct (canonical) solutions required. */
  minDistinctSolutions: number;
  /** Stop enumerating solutions after this many raw trees (keeps evaluation fast). */
  enumerationLimit: number;
}

export interface GeneratorSettings {
  /** Hard cap on candidate attempts per quality tier before relaxing. */
  attemptsPerTier: number;
  /** Largest intermediate allowed while *constructing* a candidate tree. */
  maxConstructionIntermediate: number;
  /** Probability that an attempt uses validated-random instead of constructive generation. */
  validatedRandomShare: number;
  /** Max identical face values among the five sources. */
  maxCopiesPerValue: number;
  /** Relative operation weights used when constructing trees. */
  operationWeights: { add: number; sub: number; mul: number; div: number };
  /** How many recent puzzle signatures to avoid repeating. */
  recentMemory: number;
}

export interface GameConfig {
  sourceCount: 5;
  sourceMin: number;
  sourceMax: number;
  targetMin: number;
  targetMax: number;
  rules: RuleSet;
  /**
   * Relative weight for drawing each source value (index = value). Original,
   * tunable distribution: small and friendly-factor numbers are common, every
   * value 1–25 still appears over time. See distribution.ts for rationale.
   */
  sourceWeights: Record<number, number>;
  /** Relative acceptance weight for each target value, used to even out targets. */
  targetWeights: Record<number, number>;
  quality: QualityThresholds;
  generator: GeneratorSettings;
}

function weights(min: number, max: number, fn: (n: number) => number): Record<number, number> {
  const w: Record<number, number> = {};
  for (let n = min; n <= max; n++) w[n] = fn(n);
  return w;
}

const HIGHLY_COMPOSITE = new Set([12, 16, 18, 20, 24]);
const PRIME_TEEN_PLUS = new Set([13, 17, 19, 23]);

/**
 * Source distribution, designed for Forge Five (not derived from any other product):
 *  - 2–10 are the workhorses of mental arithmetic and get the most weight.
 *  - 1 is valuable but makes puzzles easy (× 1, ÷ 1), so it is moderately rare.
 *  - 11–25 taper off; numbers with many factors taper more slowly than primes.
 */
export const INITIAL_SOURCE_WEIGHTS = weights(1, 25, (n) => {
  if (n === 1) return 5;
  if (n <= 6) return 10;
  if (n <= 10) return 9;
  if (HIGHLY_COMPOSITE.has(n)) return 4;
  if (PRIME_TEEN_PLUS.has(n)) return 1.5;
  if (n <= 15) return 3.5;
  return 2.5;
});

/**
 * Target acceptance weights. Constructive generation naturally favours small
 * results; these weights gently flatten that so the full 1–25 range appears.
 */
export const INITIAL_TARGET_WEIGHTS = weights(1, 25, (n) => {
  if (n <= 2) return 0.35;
  if (n <= 5) return 0.7;
  return 1;
});

export const INITIAL_CONFIG: GameConfig = Object.freeze({
  sourceCount: 5,
  sourceMin: 1,
  sourceMax: 25,
  targetMin: 1,
  targetMax: 25,
  rules: Object.freeze({
    allowNegativeIntermediates: false,
    allowFractionalIntermediates: false,
  }),
  sourceWeights: INITIAL_SOURCE_WEIGHTS,
  targetWeights: INITIAL_TARGET_WEIGHTS,
  quality: Object.freeze({
    maxEasiestIntermediate: 150,
    maxEasiestEffort: 16,
    minEasiestEffort: 4.5,
    targetEchoCollapseEffort: 5,
    rejectSumOfAll: true,
    minDistinctSolutions: 2,
    enumerationLimit: 400,
  }),
  generator: Object.freeze({
    attemptsPerTier: 400,
    maxConstructionIntermediate: 200,
    validatedRandomShare: 0.2,
    maxCopiesPerValue: 2,
    operationWeights: Object.freeze({ add: 1, sub: 1, mul: 0.9, div: 0.7 }),
    recentMemory: 30,
  }),
}) as GameConfig;
