import { createGame, gameReducer, generatePuzzle, parseTokens, pieceExpr, type GameAction, type GameState } from '../engine';
import { cuesFor } from '../features/game/cues';
import { initialGate, LOCKOUT_MS, MAX_ATTEMPTS, pressDigit } from '../features/parents/gate';
import { createTutorialGame, TUTORIAL_STEPS } from '../features/tutorial/script';
import { MockAdService, mayShowAd, NoAdService, RESULTS_AD_EVERY } from '../services/ads';
import {
  applyPurchaseResult,
  applyRestoreResult,
  MockPurchaseService,
  NO_ENTITLEMENTS,
  REMOVE_ADS_PRODUCT_ID,
} from '../services/purchases';
import { loadJson, MemoryStorage, saveJson, STORAGE_KEYS } from '../services/storage';
import {
  DEFAULT_SETTINGS,
  EMPTY_STATS,
  favouriteTool,
  isSettings,
  isStats,
  localDay,
  recordDeal,
  recordSkip,
  recordSolve,
  shouldReduceMotion,
  visibleStreak,
} from '../state/model';

// ---------------------------------------------------------------------------
// Tutorial
// ---------------------------------------------------------------------------

describe('tutorial', () => {
  /** The action a player would take to satisfy each step. */
  function actionFor(stepId: string, s: GameState): GameAction | null {
    const forged = s.snap.tray.find((id) => s.snap.pieces[id].kind === 'forged');
    const map: Record<string, GameAction | null> = {
      target: null,
      pieces: null,
      'place-2': { type: 'insertPiece', pieceId: 's1' },
      plus: { type: 'insertOp', op: 'add' },
      'place-1': { type: 'insertPiece', pieceId: 's3' },
      'plus-again': { type: 'insertOp', op: 'add' },
      'place-3': { type: 'insertPiece', pieceId: 's4' },
      forge: { type: 'forge', now: 1 },
      'forged-explained': null,
      open: { type: 'insertParen', paren: '(' },
      'place-7': { type: 'insertPiece', pieceId: 's0' },
      minus: { type: 'insertOp', op: 'sub' },
      'place-4': { type: 'insertPiece', pieceId: 's2' },
      close: { type: 'insertParen', paren: ')' },
      times: { type: 'insertOp', op: 'mul' },
      'use-forged': forged ? { type: 'insertPiece', pieceId: forged } : null,
      undo: { type: 'undo' },
      'redo-place': forged ? { type: 'insertPiece', pieceId: forged } : null,
      check: { type: 'check', now: 2 },
    };
    if (!(stepId in map)) throw new Error(`no scripted action for ${stepId}`);
    return map[stepId];
  }

  it('can be completed step by step and ends solved with the taught proof', () => {
    let s = createTutorialGame(0);
    for (const step of TUTORIAL_STEPS) {
      const a = actionFor(step.id, s);
      if (!step.expects) {
        expect(a).toBeNull();
        continue;
      }
      expect(a).not.toBeNull();
      expect(step.expects(a!, s)).toBe(true);
      s = gameReducer(s, a!);
      if (step.done) expect(step.done(s)).toBe(true);
    }
    expect(s.status).toBe('solved');
    const { formatExpr } = jest.requireActual('../engine/format');
    expect(formatExpr(s.solution)).toBe('(7 − 4) × (2 + 1 + 3)');
    expect(s.play.undos).toBe(1);
  });

  it('rejects off-script moves', () => {
    const s = createTutorialGame(0);
    const placeTwo = TUTORIAL_STEPS.find((x) => x.id === 'place-2')!;
    expect(placeTwo.expects!({ type: 'insertPiece', pieceId: 's0' }, s)).toBe(false);
    expect(placeTwo.expects!({ type: 'insertOp', op: 'add' }, s)).toBe(false);
  });

  it('teaches every required concept', () => {
    const text = TUTORIAL_STEPS.map((s) => `${s.title} ${s.body}`)
      .join(' ')
      .toLowerCase();
    for (const concept of [
      'target',
      'exactly once',
      'tray',
      'bench',
      'as often as you like',
      'forge',
      'bracket',
      'undo',
      'check',
      'used twice',
    ]) {
      expect(text).toContain(concept);
    }
  });
});

// ---------------------------------------------------------------------------
// Parental gate
// ---------------------------------------------------------------------------

describe('parental gate', () => {
  const fixed = () => {
    let i = 0;
    const seq = [0.41, 0.72, 0.15, 0.93, 0.05, 0.66];
    return () => seq[i++ % seq.length];
  };

  it('passes when the written digits are entered in order', () => {
    let g = initialGate(fixed());
    expect(g.challenge.prompt).toBe('four, seven, one');
    for (const d of g.challenge.digits) g = pressDigit(g, d, 0);
    expect(g.passed).toBe(true);
  });

  it('issues a new challenge after a wrong answer, and locks out after repeated failures', () => {
    let g = initialGate(fixed());
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const wrong = g.challenge.digits.map((d) => (d + 1) % 10);
      for (const d of wrong) g = pressDigit(g, d, 1000);
      expect(g.passed).toBe(false);
    }
    expect(g.lockedUntil).toBe(1000 + LOCKOUT_MS);
    const locked = pressDigit(g, g.challenge.digits[0], 2000);
    expect(locked).toBe(g);
    // After the lockout, it works again.
    for (const d of g.challenge.digits) g = pressDigit(g, d, 1000 + LOCKOUT_MS + 1);
    expect(g.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Settings & statistics
// ---------------------------------------------------------------------------

describe('settings', () => {
  it('validates stored settings', () => {
    expect(isSettings(DEFAULT_SETTINGS)).toBe(true);
    expect(isSettings({ ...DEFAULT_SETTINGS, motion: 'wild' })).toBe(false);
    expect(isSettings(null)).toBe(false);
  });
  it('resolves reduced motion from preference and system', () => {
    expect(shouldReduceMotion('system', true)).toBe(true);
    expect(shouldReduceMotion('system', false)).toBe(false);
    expect(shouldReduceMotion('reduced', false)).toBe(true);
    expect(shouldReduceMotion('full', true)).toBe(false);
  });
});

describe('statistics', () => {
  const puzzle = generatePuzzle({ seed: 5 }).puzzle;
  const solved = (() => {
    let s = createGame(puzzle, 1_000);
    // Replay the stored witness through the reducer by typing its leaves in order.
    s = { ...s, status: 'solved', solution: puzzle.witness, play: { ...s.play, solvedAt: 31_000, forges: 2 } };
    return s;
  })();

  it('records a solve with time, forges and tools', () => {
    const day = '2026-09-29';
    const st = recordSolve(EMPTY_STATS, solved.solution!, solved.play, 31_000, day);
    expect(st.solved).toBe(1);
    expect(st.fastestMs).toBe(30_000);
    expect(st.forges).toBe(2);
    expect(st.solvesWithForge).toBe(1);
    expect(Object.values(st.toolUse).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(st.dayStreak).toBe(1);
    expect(favouriteTool(st)).not.toBeNull();
  });

  it('builds and breaks day streaks', () => {
    let st = recordSolve(EMPTY_STATS, solved.solution!, solved.play, 0, '2026-09-27');
    st = recordSolve(st, solved.solution!, solved.play, 0, '2026-09-28');
    st = recordSolve(st, solved.solution!, solved.play, 0, '2026-09-28');
    expect(st.dayStreak).toBe(2);
    expect(visibleStreak(st, '2026-09-29')).toBe(2);
    expect(visibleStreak(st, '2026-09-30')).toBe(0);
    st = recordSolve(st, solved.solution!, solved.play, 0, '2026-10-02');
    expect(st.dayStreak).toBe(1);
    expect(st.bestDayStreak).toBe(2);
  });

  it('counts deals and skips', () => {
    expect(recordSkip(recordDeal(EMPTY_STATS))).toMatchObject({ dealt: 1, skipped: 1 });
  });

  it('formats local days', () => {
    expect(localDay(new Date(2026, 0, 5, 12).getTime())).toBe('2026-01-05');
  });
});

// ---------------------------------------------------------------------------
// Local persistence
// ---------------------------------------------------------------------------

describe('local persistence', () => {
  it('round-trips settings, stats and an in-progress game', async () => {
    const storage = new MemoryStorage();
    await saveJson(storage, STORAGE_KEYS.settings, { ...DEFAULT_SETTINGS, sound: false });
    await saveJson(storage, STORAGE_KEYS.stats, recordDeal(EMPTY_STATS));
    expect(await loadJson(storage, STORAGE_KEYS.settings, DEFAULT_SETTINGS, isSettings)).toMatchObject({ sound: false });
    expect(await loadJson(storage, STORAGE_KEYS.stats, EMPTY_STATS, isStats)).toMatchObject({ dealt: 1 });

    // Puzzle restoration after an interruption.
    const puzzle = generatePuzzle({ seed: 11 }).puzzle;
    let game = createGame(puzzle, 0);
    game = gameReducer(game, { type: 'insertPiece', pieceId: puzzle.sources[0].id });
    game = gameReducer(game, { type: 'insertOp', op: 'add' });
    await saveJson(storage, STORAGE_KEYS.game, game);
    const restored = await loadJson<GameState | null>(storage, STORAGE_KEYS.game, null);
    expect(restored?.snap.bench).toHaveLength(2);
    expect(restored?.puzzle.id).toBe(puzzle.id);
    const parsed = parseTokens(restored!.snap.bench.slice(0, 1), (id) => pieceExpr(restored!.snap.pieces[id]));
    expect(parsed.ok).toBe(true);
  });

  it('falls back to defaults on corrupt or invalid data', async () => {
    const storage = new MemoryStorage();
    await storage.setItem(STORAGE_KEYS.settings, '{not json');
    expect(await loadJson(storage, STORAGE_KEYS.settings, DEFAULT_SETTINGS, isSettings)).toBe(DEFAULT_SETTINGS);
    await storage.setItem(STORAGE_KEYS.stats, JSON.stringify({ version: 99 }));
    expect(await loadJson(storage, STORAGE_KEYS.stats, EMPTY_STATS, isStats)).toBe(EMPTY_STATS);
  });

  it('keeps playing when storage throws', async () => {
    const broken = {
      getItem: async () => {
        throw new Error('blocked');
      },
      setItem: async () => {
        throw new Error('blocked');
      },
      removeItem: async () => {},
    };
    await expect(saveJson(broken, 'k', { a: 1 })).resolves.toBeUndefined();
    await expect(loadJson(broken, 'k', 'fallback')).resolves.toBe('fallback');
  });
});

// ---------------------------------------------------------------------------
// Advertising
// ---------------------------------------------------------------------------

describe('advertising', () => {
  it('never shows ads during an active puzzle or to ad-free players', () => {
    expect(mayShowAd({ placement: 'home', adFree: false, solvedCount: 4, inActivePuzzle: true })).toBe(false);
    expect(mayShowAd({ placement: 'home', adFree: true, solvedCount: 0, inActivePuzzle: false })).toBe(false);
    expect(mayShowAd({ placement: 'results', adFree: true, solvedCount: RESULTS_AD_EVERY, inActivePuzzle: false })).toBe(false);
  });

  it('does not show a results ad after every puzzle', () => {
    const shown = Array.from({ length: 12 }, (_, i) =>
      mayShowAd({ placement: 'results', adFree: false, solvedCount: i + 1, inActivePuzzle: false }),
    );
    expect(shown.filter(Boolean).length).toBe(Math.floor(12 / RESULTS_AD_EVERY));
    expect(shown[0]).toBe(false);
  });

  it('works with no provider configured', async () => {
    await expect(new NoAdService().load()).resolves.toEqual({ status: 'unavailable', reason: 'not-configured' });
  });

  it('reports ad-loading failure and offline as unavailable, never throwing', async () => {
    await expect(new MockAdService('fail').load('home')).resolves.toMatchObject({ status: 'unavailable', reason: 'failed' });
    await expect(new MockAdService('offline').load('home')).resolves.toMatchObject({ status: 'unavailable', reason: 'offline' });
  });

  it('supports reporting an ad', async () => {
    const ads = new MockAdService('fill');
    await ads.report('mock-home', 'inappropriate');
    expect(ads.reports).toEqual([{ adId: 'mock-home', reason: 'inappropriate' }]);
  });
});

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------

describe('purchases', () => {
  it('grants ad-free after a successful purchase', async () => {
    const store = new MockPurchaseService();
    const r = await store.purchase(REMOVE_ADS_PRODUCT_ID);
    expect(applyPurchaseResult(NO_ENTITLEMENTS, r, 5)).toEqual({ adFree: true, confirmedAt: 5 });
  });

  it('changes nothing when the purchase is cancelled, pending or fails', async () => {
    const store = new MockPurchaseService();
    for (const outcome of ['cancel', 'pending', 'fail'] as const) {
      store.nextPurchase = outcome;
      const r = await store.purchase(REMOVE_ADS_PRODUCT_ID);
      expect(applyPurchaseResult(NO_ENTITLEMENTS, r, 5)).toBe(NO_ENTITLEMENTS);
    }
  });

  it('restores a previous purchase', async () => {
    const store = new MockPurchaseService({ owned: [REMOVE_ADS_PRODUCT_ID] });
    const r = await store.restore();
    expect(applyRestoreResult(NO_ENTITLEMENTS, r, 9)).toEqual({ adFree: true, confirmedAt: 9 });
  });

  it('keeps an existing entitlement when a restore finds nothing or fails', async () => {
    const owned = { adFree: true, confirmedAt: 1 };
    const store = new MockPurchaseService();
    expect(applyRestoreResult(owned, await store.restore(), 9)).toBe(owned);
    store.nextRestoreFails = true;
    expect(applyRestoreResult(owned, await store.restore(), 9)).toBe(owned);
  });

  it('ad-free state suppresses every ad placement', async () => {
    const store = new MockPurchaseService();
    const ent = applyPurchaseResult(NO_ENTITLEMENTS, await store.purchase(REMOVE_ADS_PRODUCT_ID), 1);
    for (const placement of ['home', 'results'] as const) {
      expect(mayShowAd({ placement, adFree: ent.adFree, solvedCount: RESULTS_AD_EVERY, inActivePuzzle: false })).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Sound & haptic cues
// ---------------------------------------------------------------------------

describe('cues', () => {
  const puzzle = generatePuzzle({ seed: 21 }).puzzle;
  const g0 = createGame(puzzle, 0);
  it('taps when a piece is placed and signals gently on an invalid forge', () => {
    const a: GameAction = { type: 'insertPiece', pieceId: puzzle.sources[0].id };
    expect(cuesFor(g0, gameReducer(g0, a), a)).toEqual({ sound: 'tap', haptic: 'select' });
    const f: GameAction = { type: 'forge', now: 0 };
    const g1 = gameReducer(g0, a);
    expect(cuesFor(g1, gameReducer(g1, f), f).sound).toBe('invalid');
  });
  it('treats a wrong total as information, not an error', () => {
    const c: GameAction = { type: 'check', now: 0 };
    const cues = cuesFor(g0, { ...g0, feedback: { kind: 'wrong-result', value: { num: 3, den: 1 }, target: 9 }, feedbackSeq: 1 }, c);
    expect(cues.haptic).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Architecture guard: the engine stays platform independent.
// ---------------------------------------------------------------------------

describe('engine purity', () => {
  it('imports nothing from React, React Native, Expo or app services', () => {
    const fs = jest.requireActual('fs') as typeof import('fs');
    const path = jest.requireActual('path') as typeof import('path');
    const dir = path.join(__dirname, '..', 'engine');
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      const imports = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
      for (const i of imports) expect([f, i]).toEqual([f, expect.stringMatching(/^\.\//)]);
    }
  });
});
