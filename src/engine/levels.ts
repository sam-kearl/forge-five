import { INITIAL_CONFIG, type GameConfig } from './config';

/**
 * Levels: each one is a number range for pieces and answers. Everything else
 * (rules, quality thresholds, generator settings) is shared, so adding or
 * changing a level is a one-line edit here.
 */
export interface LevelDef {
  id: number;
  name: string;
  /** Smallest and largest value for both pieces and answers. */
  min: number;
  max: number;
}

export const LEVELS: readonly LevelDef[] = [
  { id: 1, name: 'Level 1', min: 1, max: 12 },
  { id: 2, name: 'Level 2', min: 1, max: 25 },
];

export const DEFAULT_LEVEL = 1;

export const levelById = (id: number): LevelDef => LEVELS.find((l) => l.id === id) ?? LEVELS[0];

/**
 * Puzzles saved before levels existed used the 1–25 range. Identify a puzzle's
 * level from its own field, falling back to the widest level.
 */
export const levelOfPuzzle = (p: { level?: number }): LevelDef => (p.level !== undefined ? levelById(p.level) : LEVELS[LEVELS.length - 1]);

function restrict(weights: Record<number, number>, min: number, max: number): Record<number, number> {
  const out: Record<number, number> = {};
  for (let n = min; n <= max; n++) out[n] = weights[n] ?? 1;
  return out;
}

/** The generator configuration for a level: the shared config with that level's ranges. */
export function configForLevel(id: number, base: GameConfig = INITIAL_CONFIG): GameConfig {
  const level = levelById(id);
  return {
    ...base,
    sourceMin: level.min,
    sourceMax: level.max,
    targetMin: level.min,
    targetMax: level.max,
    sourceWeights: restrict(base.sourceWeights, level.min, level.max),
    targetWeights: restrict(base.targetWeights, level.min, level.max),
  };
}
