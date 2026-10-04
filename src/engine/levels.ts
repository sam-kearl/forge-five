import { INITIAL_CONFIG, type GameConfig } from './config';

/**
 * Levels and difficulty.
 *
 * A level is a number range for pieces and answers. A difficulty is a band of
 * "how many genuinely different solutions the puzzle has" — fewer solutions
 * means harder. Solution counts shrink as the numbers grow, so each level has
 * its own bands. They are set at the thirds of each level's natural
 * distribution, measured with scripts/puzzle-report.ts-style sampling
 * (200 puzzles per level), so Easy, Medium and Hard are each about a third of
 * what the level can produce.
 */

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];
export const DIFFICULTY_NAMES: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
export const DEFAULT_DIFFICULTY: Difficulty = 'easy';

export interface LevelDef {
  id: number;
  name: string;
  /** Smallest and largest value for both pieces and answers. */
  min: number;
  max: number;
  /**
   * Inclusive ranges of distinct solutions for each difficulty.
   * Hard starts at 2 so every puzzle keeps more than one way in.
   */
  difficulty: Record<Difficulty, { min: number; max: number }>;
}

export const LEVELS: readonly LevelDef[] = [
  {
    id: 1,
    name: 'Level 1',
    min: 1,
    max: 12,
    // Measured thirds: p33 = 23, p67 = 40.
    difficulty: { hard: { min: 2, max: 23 }, medium: { min: 24, max: 40 }, easy: { min: 41, max: Infinity } },
  },
  {
    id: 2,
    name: 'Level 2',
    min: 1,
    max: 25,
    // Measured thirds: p33 = 10, p67 = 19.
    difficulty: { hard: { min: 2, max: 10 }, medium: { min: 11, max: 19 }, easy: { min: 20, max: Infinity } },
  },
  {
    id: 3,
    name: 'Level 3',
    min: 1,
    max: 50,
    // Measured thirds: p33 = 6, p67 = 13.
    difficulty: { hard: { min: 2, max: 6 }, medium: { min: 7, max: 13 }, easy: { min: 14, max: Infinity } },
  },
];

export const DEFAULT_LEVEL = 1;

export const levelById = (id: number): LevelDef => LEVELS.find((l) => l.id === id) ?? LEVELS[0];

/**
 * Puzzles saved before levels existed used the 1–25 range. Identify a puzzle's
 * level from its own field, falling back to that level.
 */
export const levelOfPuzzle = (p: { level?: number }): LevelDef => (p.level !== undefined ? levelById(p.level) : levelById(2));

/** Which difficulty band a solution count falls in for a level. */
export function difficultyFor(level: LevelDef, distinctSolutions: number): Difficulty {
  for (const d of DIFFICULTIES) {
    const band = level.difficulty[d];
    if (distinctSolutions >= band.min && distinctSolutions <= band.max) return d;
  }
  return distinctSolutions > level.difficulty.medium.max ? 'easy' : 'hard';
}

const PRIMES_ABOVE_25 = new Set([29, 31, 37, 41, 43, 47]);
const COMPOSITES_ABOVE_25 = new Set([30, 32, 36, 40, 42, 45, 48]);

/**
 * Source weight for any value. 1–25 use the tuned initial distribution; above
 * 25 the same idea continues: numbers with many factors stay more common than
 * primes, and everything tapers so small numbers still dominate.
 */
function sourceWeight(n: number): number {
  const base = INITIAL_CONFIG.sourceWeights[n];
  if (base !== undefined) return base;
  if (PRIMES_ABOVE_25.has(n)) return 0.8;
  if (COMPOSITES_ABOVE_25.has(n)) return 2;
  return 1.3;
}

function targetWeight(n: number): number {
  return INITIAL_CONFIG.targetWeights[n] ?? 1;
}

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

/**
 * The generator configuration for a level (and optionally a difficulty).
 * Size limits on intermediate values scale with the level's largest number,
 * so bigger levels can reach bigger answers without tedious arithmetic on
 * smaller ones.
 */
export function configForLevel(id: number, difficulty?: Difficulty, base: GameConfig = INITIAL_CONFIG): GameConfig {
  const level = levelById(id);
  const scale = Math.max(1, level.max / 25);
  return {
    ...base,
    sourceMin: level.min,
    sourceMax: level.max,
    targetMin: level.min,
    targetMax: level.max,
    sourceWeights: Object.fromEntries(range(level.min, level.max).map((n) => [n, sourceWeight(n)])),
    targetWeights: Object.fromEntries(range(level.min, level.max).map((n) => [n, targetWeight(n)])),
    quality: {
      ...base.quality,
      maxEasiestIntermediate: Math.round(base.quality.maxEasiestIntermediate * scale),
      maxEasiestEffort: base.quality.maxEasiestEffort + 4 * (scale - 1),
      distinctSolutionsRange: difficulty ? level.difficulty[difficulty] : undefined,
    },
    generator: {
      ...base.generator,
      maxConstructionIntermediate: Math.round(base.generator.maxConstructionIntermediate * scale),
    },
  };
}
