import { canonicalKey } from '../canonical';
import { INITIAL_CONFIG } from '../config';
import { generatePuzzle, generatePuzzleAsync } from '../generator';
import { configForLevel, DIFFICULTIES, difficultyFor, LEVELS, levelById, levelOfPuzzle, type Difficulty } from '../levels';
import { signatureOf, type Puzzle, type PuzzleSignature } from '../puzzle';
import * as R from '../rational';
import { createSolver, solve } from '../solver';
import { validateSolution } from '../validate';
import { RULES } from './helpers';

/** Independent full count of genuinely different solutions (no early stop). */
function fullDistinctCount(p: Puzzle): number {
  const solver = createSolver([...p.sources], RULES);
  const keys = new Set(solver.enumerate(R.int(p.target), 20000).map(canonicalKey));
  return keys.size;
}

describe('levels', () => {
  it('defines 1–12, 1–25 and 1–50', () => {
    expect(LEVELS.map((l) => [l.id, l.min, l.max])).toEqual([
      [1, 1, 12],
      [2, 1, 25],
      [3, 1, 50],
    ]);
  });

  it('builds configs with each level range and shared rules', () => {
    for (const l of LEVELS) {
      const c = configForLevel(l.id);
      expect([c.sourceMin, c.sourceMax, c.targetMin, c.targetMax]).toEqual([l.min, l.max, l.min, l.max]);
      expect(Object.keys(c.sourceWeights).map(Number)).toEqual(Array.from({ length: l.max }, (_, i) => i + 1));
      expect(Object.values(c.sourceWeights).every((w) => w > 0)).toBe(true);
      expect(c.rules).toBe(INITIAL_CONFIG.rules);
    }
  });

  it('scales intermediate-size limits for bigger numbers', () => {
    expect(configForLevel(3).generator.maxConstructionIntermediate).toBe(2 * configForLevel(2).generator.maxConstructionIntermediate);
    expect(configForLevel(1).quality.maxEasiestIntermediate).toBe(INITIAL_CONFIG.quality.maxEasiestIntermediate);
  });

  it('falls back sensibly for unknown or missing levels', () => {
    expect(levelById(999)).toBe(LEVELS[0]);
    // Puzzles saved before levels existed were 1–25.
    expect(levelOfPuzzle({}).max).toBe(25);
    expect(levelOfPuzzle({ level: 1 }).max).toBe(12);
  });

  it('has contiguous, non-overlapping difficulty bands', () => {
    for (const l of LEVELS) {
      const { hard, medium, easy } = l.difficulty;
      expect(hard.min).toBe(2);
      expect(medium.min).toBe(hard.max + 1);
      expect(easy.min).toBe(medium.max + 1);
      expect(easy.max).toBe(Infinity);
      expect(difficultyFor(l, hard.max)).toBe('hard');
      expect(difficultyFor(l, medium.min)).toBe('medium');
      expect(difficultyFor(l, easy.min + 100)).toBe('easy');
    }
  });

  describe.each(LEVELS.map((l) => [l.name, l.id] as const))('%s puzzles', (_name, id) => {
    const level = levelById(id);
    const recent: PuzzleSignature[] = [];
    const results = Array.from({ length: 60 }, (_, i) => {
      const r = generatePuzzle({ seed: 7000 + i, recent, level: id, config: configForLevel(id) });
      recent.push(signatureOf(r.puzzle));
      return r;
    });

    it('keep every piece and answer within the level range', () => {
      for (const { puzzle } of results) {
        expect(puzzle.target).toBeGreaterThanOrEqual(level.min);
        expect(puzzle.target).toBeLessThanOrEqual(level.max);
        for (const s of puzzle.sources) {
          expect(s.value.num).toBeGreaterThanOrEqual(level.min);
          expect(s.value.num).toBeLessThanOrEqual(level.max);
        }
      }
    });

    it('always have a verified answer and pass full quality checks', () => {
      for (const { puzzle, report } of results) {
        expect(solve([...puzzle.sources], puzzle.target, RULES)).not.toBeNull();
        expect(validateSolution(puzzle.witness, puzzle.sources, puzzle.target, RULES).ok).toBe(true);
        expect(report.tier).toBe(0);
      }
    });

    it('record the level on the puzzle and in its id', () => {
      expect(results[0].puzzle.level).toBe(id);
      expect(results[0].puzzle.id).toMatch(new RegExp(`^F5-L${id}-`));
    });
  });

  describe.each(LEVELS.flatMap((l) => DIFFICULTIES.map((d) => [l.id, d] as const)))('Level %i, %s', (id, difficulty: Difficulty) => {
    const level = levelById(id);
    const band = level.difficulty[difficulty];
    const results = Array.from({ length: 12 }, (_, i) =>
      generatePuzzle({ seed: 41000 + i, level: id, difficulty, config: configForLevel(id, difficulty) }),
    );

    it('produces puzzles whose real solution count is in the band', () => {
      for (const { puzzle } of results) {
        const n = fullDistinctCount(puzzle);
        expect(n).toBeGreaterThanOrEqual(band.min);
        expect(n).toBeLessThanOrEqual(band.max);
        expect(difficultyFor(level, n)).toBe(difficulty);
      }
    });

    it('records the difficulty on the puzzle and in its id', () => {
      const p = results[0].puzzle;
      expect(p.difficulty).toBe(difficulty);
      expect(p.id).toMatch(new RegExp(`^F5-L${id}${difficulty[0].toUpperCase()}-`));
    });
  });

  it('generates the same puzzle whether sliced or all at once', async () => {
    const opts = { seed: 777, level: 1, difficulty: 'hard' as const, config: configForLevel(1, 'hard') };
    const sync = generatePuzzle(opts).puzzle;
    const sliced = (await generatePuzzleAsync(opts, 1)).puzzle;
    expect(sliced).toEqual(sync);
  });

  it('only uses fallback puzzles that fit the level range', () => {
    const base = configForLevel(1);
    // Zero target weights make normal generation impossible, forcing the fallback path.
    const impossible = {
      ...base,
      targetWeights: Object.fromEntries(Object.keys(base.targetWeights).map((k) => [k, 0])),
      generator: { ...base.generator, attemptsPerTier: 10 },
    };
    const { puzzle, report } = generatePuzzle({ seed: 3, config: impossible, level: 1 });
    expect(report.tier).toBe(3);
    expect(puzzle.target).toBeLessThanOrEqual(12);
    expect(puzzle.sources.every((s) => s.value.num <= 12)).toBe(true);
  });
});
