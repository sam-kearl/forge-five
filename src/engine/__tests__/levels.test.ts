import { INITIAL_CONFIG } from '../config';
import { generatePuzzle } from '../generator';
import { configForLevel, LEVELS, levelById, levelOfPuzzle } from '../levels';
import { signatureOf, type PuzzleSignature } from '../puzzle';
import { solve } from '../solver';
import { validateSolution } from '../validate';
import { RULES } from './helpers';

describe('levels', () => {
  it('starts with a 1–12 level', () => {
    expect(LEVELS[0]).toMatchObject({ id: 1, min: 1, max: 12 });
  });

  it('builds a config with the level range and shared rules', () => {
    const c = configForLevel(1);
    expect([c.sourceMin, c.sourceMax, c.targetMin, c.targetMax]).toEqual([1, 12, 1, 12]);
    expect(Object.keys(c.sourceWeights).map(Number)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(c.rules).toBe(INITIAL_CONFIG.rules);
    expect(c.quality).toBe(INITIAL_CONFIG.quality);
  });

  it('falls back sensibly for unknown or missing levels', () => {
    expect(levelById(999)).toBe(LEVELS[0]);
    // Puzzles saved before levels existed were 1–25.
    expect(levelOfPuzzle({})).toBe(LEVELS[LEVELS.length - 1]);
    expect(levelOfPuzzle({ level: 1 }).max).toBe(12);
  });

  describe('Level 1 puzzles', () => {
    const recent: PuzzleSignature[] = [];
    const results = Array.from({ length: 120 }, (_, i) => {
      const r = generatePuzzle({ seed: 7000 + i, recent, level: 1, config: configForLevel(1) });
      recent.push(signatureOf(r.puzzle));
      return r;
    });

    it('keep every piece and answer within 1–12', () => {
      for (const { puzzle } of results) {
        expect(puzzle.target).toBeGreaterThanOrEqual(1);
        expect(puzzle.target).toBeLessThanOrEqual(12);
        for (const s of puzzle.sources) {
          expect(s.value.num).toBeGreaterThanOrEqual(1);
          expect(s.value.num).toBeLessThanOrEqual(12);
        }
      }
    });

    it('are always solvable and pass full quality checks', () => {
      for (const { puzzle, report } of results) {
        expect(solve([...puzzle.sources], puzzle.target, RULES)).not.toBeNull();
        expect(validateSolution(puzzle.witness, puzzle.sources, puzzle.target, RULES).ok).toBe(true);
        expect(report.tier).toBe(0);
      }
    });

    it('record the level on the puzzle and in its id', () => {
      const { puzzle } = results[0];
      expect(puzzle.level).toBe(1);
      expect(puzzle.id).toMatch(/^F5-L1-/);
    });

    it('cover the whole 1–12 answer range over time', () => {
      expect(new Set(results.map((r) => r.puzzle.target)).size).toBe(12);
    });
  });
});
