import { INITIAL_CONFIG, type GameConfig } from '../config';
import { evaluate, forEachStep, leaves } from '../expr';
import { drawSourceValues, FALLBACK_PUZZLES, generatePuzzle, treeShapes } from '../generator';
import { sourcePiece } from '../pieces';
import { isNearDuplicate, signatureOf, type PuzzleSignature } from '../puzzle';
import { evaluatePuzzle } from '../quality';
import * as R from '../rational';
import { createRng } from '../rng';
import { solve } from '../solver';
import { validateSolution } from '../validate';
import { formatExpr } from '../format';
import { configForLevel, difficultyFor, levelById } from '../levels';
import { exprOf, mkSources, RULES } from './helpers';

const C = INITIAL_CONFIG;

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 20 }, () => a.next());
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(xs);
    expect(createRng(43).next()).not.toBe(xs[0]);
  });
  it('produces values in range', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(1, 25);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(25);
    }
  });
});

describe('source distribution', () => {
  it('stays within 1–25 and caps repeated values', () => {
    const rng = createRng(99);
    for (let i = 0; i < 2000; i++) {
      const vals = drawSourceValues(rng, C);
      expect(vals).toHaveLength(5);
      const counts = new Map<number, number>();
      for (const v of vals) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(25);
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(C.generator.maxCopiesPerValue);
    }
  });
  it('uses the full 1–25 range over time', () => {
    const rng = createRng(5);
    const seen = new Set<number>();
    for (let i = 0; i < 3000; i++) drawSourceValues(rng, C).forEach((v) => seen.add(v));
    expect(seen.size).toBe(25);
  });
});

describe('tree shapes', () => {
  it('enumerates every binary tree with five leaves (Catalan number 14)', () => {
    expect(treeShapes(5)).toHaveLength(14);
    expect(treeShapes(1)).toHaveLength(1);
  });
});

describe('generated puzzles', () => {
  const N = 150;
  const recent: PuzzleSignature[] = [];
  const results = Array.from({ length: N }, (_, i) => {
    const r = generatePuzzle({ seed: 1000 + i, recent });
    recent.push(signatureOf(r.puzzle));
    return r;
  });

  it('are always solvable, confirmed by an independent solver run', () => {
    for (const { puzzle } of results) {
      const items = puzzle.sources.map((s) => ({ id: s.id, value: s.value }));
      expect(solve(items, puzzle.target, RULES)).not.toBeNull();
      expect(validateSolution(puzzle.witness, puzzle.sources, puzzle.target, RULES).ok).toBe(true);
      expect(validateSolution(puzzle.easiest, puzzle.sources, puzzle.target, RULES).ok).toBe(true);
    }
  });

  it('keep sources and targets within 1–25', () => {
    for (const { puzzle } of results) {
      expect(puzzle.sources).toHaveLength(5);
      for (const s of puzzle.sources) {
        expect(R.isInteger(s.value)).toBe(true);
        expect(s.value.num).toBeGreaterThanOrEqual(1);
        expect(s.value.num).toBeLessThanOrEqual(25);
      }
      expect(puzzle.target).toBeGreaterThanOrEqual(1);
      expect(puzzle.target).toBeLessThanOrEqual(25);
    }
  });

  it('give each source a unique permanent identity', () => {
    for (const { puzzle } of results) {
      expect(new Set(puzzle.sources.map((s) => s.id)).size).toBe(5);
      expect(
        leaves(puzzle.witness)
          .map((l) => l.sourceId)
          .sort(),
      ).toEqual(puzzle.sources.map((s) => s.id).sort());
    }
  });

  it('only contain non-negative whole-number steps in their stored solutions', () => {
    for (const { puzzle } of results) {
      for (const e of [puzzle.witness, puzzle.easiest]) {
        let steps = 0;
        forEachStep(e, RULES, (_op, _a, _b, r) => {
          steps++;
          expect(R.isInteger(r)).toBe(true);
          expect(r.num).toBeGreaterThanOrEqual(0);
        });
        expect(steps).toBe(4);
      }
    }
  });

  it('respect the easiest-solution intermediate cap', () => {
    for (const { puzzle, report } of results) {
      if (report.tier === 0) expect(puzzle.metrics.easiestMaxIntermediate).toBeLessThanOrEqual(C.quality.maxEasiestIntermediate);
    }
  });

  it('avoid near-identical repeats of recent puzzles', () => {
    for (let i = 1; i < results.length; i++) {
      const sig = signatureOf(results[i].puzzle);
      const window = results.slice(Math.max(0, i - 30), i).map((r) => signatureOf(r.puzzle));
      expect(window.some((w) => isNearDuplicate(sig, w))).toBe(false);
    }
  });

  it('print proofs that re-parse into valid solutions (formatter round trip)', () => {
    for (const { puzzle } of results) {
      for (const e of [puzzle.witness, puzzle.easiest]) {
        const reparsed = exprOf(formatExpr(e), [...puzzle.sources]);
        expect(validateSolution(reparsed, puzzle.sources, puzzle.target, RULES).ok).toBe(true);
      }
    }
  });

  it('are fast enough to generate on a device', () => {
    const times = results.map((r) => r.report.elapsedMs).sort((a, b) => a - b);
    expect(times[Math.floor(times.length / 2)]).toBeLessThan(100);
  });
});

describe('determinism', () => {
  it('produces the same puzzle for the same seed', () => {
    const a = generatePuzzle({ seed: 123456 });
    const b = generatePuzzle({ seed: 123456 });
    expect(b.puzzle).toEqual(a.puzzle);
    expect(a.puzzle.id).toBe('F5-2n9c');
  });
  it('produces different puzzles for different seeds', () => {
    const a = generatePuzzle({ seed: 1 }).puzzle;
    const b = generatePuzzle({ seed: 2 }).puzzle;
    expect(signatureOf(a)).not.toEqual(signatureOf(b));
  });
});

describe('quality evaluation', () => {
  it('rejects unsolvable candidates', () => {
    expect(evaluatePuzzle(mkSources([1, 1, 1, 1, 1]), 25, C)).toEqual({ unsolvable: true });
  });

  it('rejects candidates whose easiest solution needs large intermediates', () => {
    // With a deliberately tight cap, every route to 25 here passes through a value above 10.
    const q = evaluatePuzzle(mkSources([25, 24, 2, 3, 5]), 25, C, { ...C.quality, maxEasiestIntermediate: 10 });
    expect('rejections' in q && q.rejections).toContain('large-intermediates');
  });

  it('flags the sum of all five as too obvious', () => {
    const q = evaluatePuzzle(mkSources([3, 4, 5, 6, 7]), 25, C);
    expect('rejections' in q && q.rejections).toContain('sum-of-all');
  });

  it('flags a target that is simply one of the pieces with the rest cancelled', () => {
    // 9 is present and 4 − 4 + 2 − 2 collapses to 0.
    const q = evaluatePuzzle(mkSources([9, 4, 4, 2, 2]), 9, C);
    expect('rejections' in q && q.rejections).toContain('target-echo');
  });

  it('reports useful metrics', () => {
    const q = evaluatePuzzle(mkSources([8, 4, 2, 3, 6]), 25, C);
    if ('unsolvable' in q) throw new Error('should be solvable');
    expect(q.metrics.distinctSolutions).toBeGreaterThan(0);
    expect(q.metrics.easiestEffort).toBeGreaterThan(0);
    expect(q.metrics.commonFactor).toBe(1);
    expect(evaluate(q.easiest, RULES)).toEqual({ ok: true, value: R.int(25) });
  });
});

describe('safeguards', () => {
  it('ships only solvable fallback puzzles', () => {
    for (const f of FALLBACK_PUZZLES) {
      const items = f.values.map((v, i) => sourcePiece(`s${i}`, R.int(v)));
      expect(solve(items, f.target, RULES)).not.toBeNull();
    }
  });

  it('terminates with a fallback when the configuration makes generation impossible', () => {
    const impossible: GameConfig = {
      ...C,
      targetMin: 1000,
      targetMax: 2000,
      generator: { ...C.generator, attemptsPerTier: 20 },
    };
    const { puzzle, report } = generatePuzzle({ seed: 9, config: impossible });
    expect(report.tier).toBe(3);
    expect(puzzle.strategy).toBe('fallback');
    expect(validateSolution(puzzle.witness, puzzle.sources, puzzle.target, RULES).ok).toBe(true);
  });

  it('relaxes quality thresholds before giving up', () => {
    const strict: GameConfig = {
      ...C,
      quality: { ...C.quality, maxEasiestEffort: 0 },
      generator: { ...C.generator, attemptsPerTier: 30 },
    };
    const { report } = generatePuzzle({ seed: 3, config: strict });
    expect(report.tier).toBeGreaterThan(0);
    expect(report.tier).toBeLessThan(3);
    expect(report.rejections['too-hard']).toBeGreaterThan(0);
  });
});

describe('fallback labels', () => {
  it('labels a last-resort puzzle by its measured solution count, not the requested difficulty', () => {
    const base = configForLevel(1, 'hard');
    // An impossible request (every target weighted out) forces the hand-made fallbacks.
    const config = {
      ...base,
      generator: { ...base.generator, attemptsPerTier: 1 },
      targetWeights: Object.fromEntries(Object.keys(base.targetWeights).map((k) => [k, 0])),
    };
    const { puzzle, report } = generatePuzzle({ seed: 3, config, level: 1, difficulty: 'hard' });
    expect(report.tier).toBeGreaterThanOrEqual(2);
    expect(puzzle.difficulty).toBe(difficultyFor(levelById(1), puzzle.metrics.distinctSolutions));
  });
});
