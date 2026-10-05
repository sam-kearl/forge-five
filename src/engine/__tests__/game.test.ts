import type { Op } from '../arithmetic';
import { leaves } from '../expr';
import { formatExpr } from '../format';
import {
  analyzeBench,
  checkInvariants,
  createGame,
  gameReducer,
  playTimeMs,
  primaryAction,
  sourceLocations,
  type GameAction,
  type GameState,
} from '../game';
import type { ForgedPiece } from '../pieces';
import type { Puzzle } from '../puzzle';
import * as R from '../rational';
import { solve } from '../solver';
import { mkSources, RULES, testRng } from './helpers';

function mkPuzzle(values: number[], target: number): Puzzle {
  const sources = mkSources(values);
  const witness = solve(sources, target, RULES);
  if (!witness) throw new Error('test puzzle must be solvable');
  return {
    id: 'test',
    seed: 0,
    target,
    sources,
    witness,
    easiest: witness,
    strategy: 'constructive',
    metrics: {
      distinctSolutions: 1,
      solutionCountCapped: false,
      easiestEffort: 1,
      easiestMaxIntermediate: 1,
      witnessMaxIntermediate: 1,
      targetInSources: false,
      requiresDivision: false,
      requiresSubtraction: false,
      requiresMultiplication: false,
      minDepth: 1,
      commonFactor: 1,
      nearTarget: false,
    },
  };
}

/** Apply actions, asserting the location invariant after every single one. */
function play(state: GameState, ...actions: GameAction[]): GameState {
  for (const a of actions) {
    state = gameReducer(state, a);
    expect(checkInvariants(state)).toEqual([]);
  }
  return state;
}

const P = (pieceId: string): GameAction => ({ type: 'insertPiece', pieceId });
const O = (op: Op): GameAction => ({ type: 'insertOp', op });
const L: GameAction = { type: 'insertParen', paren: '(' };
const Rp: GameAction = { type: 'insertParen', paren: ')' };
const FORGE: GameAction = { type: 'forge', now: 5000 };
const CHECK: GameAction = { type: 'check', now: 9000 };

// Sources: s0=8, s1=4, s2=2, s3=3, s4=6 — target 36 = (8 + 4 + 2) × 3 − 6
const puzzle = mkPuzzle([8, 4, 2, 3, 6], 36);
const fresh = () => createGame(puzzle, 1000);
const benchText = (s: GameState) => {
  const a = analyzeBench(s);
  return a.kind === 'value' ? formatExpr(a.expr) : a.kind;
};

describe('building a complete expression', () => {
  it('solves with a multi-number expression in one go', () => {
    const s = play(fresh(), L, P('s0'), O('add'), P('s1'), O('add'), P('s2'), Rp, O('mul'), P('s3'), O('sub'), P('s4'), CHECK);
    expect(s.status).toBe('solved');
    expect(s.feedback).toEqual({ kind: 'solved' });
    expect(formatExpr(s.solution!)).toBe('(8 + 4 + 2) × 3 − 6');
    expect(
      leaves(s.solution!)
        .map((l) => l.sourceId)
        .sort(),
    ).toEqual(['s0', 's1', 's2', 's3', 's4']);
    expect(s.play).toMatchObject({ startedAt: 1000, solvedAt: 9000, checks: 1 });
  });

  it('moves a placed piece out of the tray and refuses to place it twice', () => {
    let s = play(fresh(), P('s0'));
    expect(s.snap.tray).not.toContain('s0');
    const before = s.snap;
    s = play(s, P('s0'));
    expect(s.snap).toBe(before);
    expect(s.feedback).toEqual({ kind: 'unavailable-piece' });
  });

  it('rejects pieces that do not exist (no free constants)', () => {
    const s = play(fresh(), P('seven'));
    expect(s.feedback).toEqual({ kind: 'unavailable-piece' });
    expect(s.snap.bench).toHaveLength(0);
  });

  it('shows the live value of the bench', () => {
    const s = play(fresh(), P('s0'), O('add'), P('s1'), O('mul'), P('s2'));
    expect(analyzeBench(s)).toMatchObject({ kind: 'value', value: R.int(16), usesAll: false, pieceCount: 3 });
  });

  it('allows the same operation four times and ignores unused operations', () => {
    const p = mkPuzzle([1, 2, 3, 4, 5], 15);
    const s = play(createGame(p, 0), P('s0'), O('add'), P('s1'), O('add'), P('s2'), O('add'), P('s3'), O('add'), P('s4'), CHECK);
    expect(s.status).toBe('solved');
  });

  it('accepts a solution that uses only two operation types', () => {
    const p = mkPuzzle([1, 2, 3, 4, 5], 26);
    const s = play(
      createGame(p, 0),
      L,
      P('s0'),
      O('add'),
      P('s1'),
      Rp,
      O('mul'),
      L,
      P('s2'),
      O('add'),
      P('s3'),
      Rp,
      O('add'),
      P('s4'),
      CHECK,
    );
    expect(s.status).toBe('solved');
  });
});

describe('checking', () => {
  it('requires every source to be used', () => {
    const s = play(fresh(), P('s0'), O('add'), P('s1'), CHECK);
    expect(s.status).toBe('playing');
    expect(s.feedback).toEqual({ kind: 'not-all-used', unused: ['s2', 's3', 's4'] });
  });

  it('reports the value reached when it is not the target, without penalty', () => {
    const s = play(fresh(), P('s0'), O('add'), P('s1'), O('add'), P('s2'), O('add'), P('s3'), O('add'), P('s4'), CHECK);
    expect(s.status).toBe('playing');
    expect(s.feedback).toEqual({ kind: 'wrong-result', value: R.int(23), target: 36 });
    // The equation is still on the bench to keep editing.
    expect(s.snap.bench).toHaveLength(9);
  });

  it('explains negative steps', () => {
    const s = play(fresh(), P('s2'), O('sub'), P('s0'), O('add'), P('s1'), O('add'), P('s3'), O('add'), P('s4'), CHECK);
    expect(s.feedback).toMatchObject({ kind: 'rule', violation: 'negative', op: 'sub', left: R.int(2), right: R.int(8) });
  });

  it('explains fractional steps', () => {
    const s = play(fresh(), P('s3'), O('div'), P('s2'), O('add'), P('s0'), O('add'), P('s1'), O('add'), P('s4'), CHECK);
    expect(s.feedback).toMatchObject({ kind: 'rule', violation: 'fraction', op: 'div', left: R.int(3), right: R.int(2) });
  });

  it('explains syntax problems', () => {
    const s = play(fresh(), P('s0'), O('add'), P('s1'), O('add'), P('s2'), O('add'), P('s3'), O('add'), P('s4'), O('mul'), CHECK);
    expect(s.feedback).toMatchObject({ kind: 'parse', error: { kind: 'missing-operand', incomplete: true } });
  });

  it('ignores moves once solved', () => {
    const s = play(fresh(), L, P('s0'), O('add'), P('s1'), O('add'), P('s2'), Rp, O('mul'), P('s3'), O('sub'), P('s4'), CHECK);
    expect(gameReducer(s, { type: 'undo' })).toBe(s);
    expect(gameReducer(s, { type: 'clear' })).toBe(s);
  });
});

describe('forging', () => {
  it('forges the whole bench into a tray piece that keeps its provenance', () => {
    const s = play(fresh(), P('s0'), O('add'), P('s1'), O('add'), P('s2'), FORGE);
    expect(s.snap.bench).toEqual([]);
    const id = s.snap.tray[s.snap.tray.length - 1];
    const f = s.snap.pieces[id] as ForgedPiece;
    expect(f.kind).toBe('forged');
    expect(f.value).toEqual(R.int(14));
    expect(f.sourceIds).toEqual(['s0', 's1', 's2']);
    expect(formatExpr(f.expr)).toBe('8 + 4 + 2');
    expect(s.feedback).toEqual({ kind: 'forged', pieceId: id });
    expect(s.play.forges).toBe(1);
    // The three sources are consumed: not in the tray and not on the bench.
    const loc = sourceLocations(s.snap);
    expect(loc.get('s0')).toEqual({ forgedInto: id });
    expect(s.snap.tray).toEqual(['s3', 's4', id]);
  });

  it('uses a forged piece later and the final proof shows every original number', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'), O('add'), P('s2'), FORGE);
    const id = s.snap.tray[2];
    s = play(s, P(id), O('mul'), P('s3'), O('sub'), P('s4'), CHECK);
    expect(s.status).toBe('solved');
    expect(formatExpr(s.solution!)).toBe('(8 + 4 + 2) × 3 − 6');
    expect(
      leaves(s.solution!)
        .map((l) => l.sourceId)
        .sort(),
    ).toEqual(['s0', 's1', 's2', 's3', 's4']);
  });

  it('never lets a forged piece be used twice', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'), FORGE);
    const id = s.snap.tray[s.snap.tray.length - 1];
    s = play(s, P(id), O('add'));
    const before = s.snap;
    s = play(s, P(id));
    expect(s.snap).toBe(before);
    expect(s.feedback).toEqual({ kind: 'unavailable-piece' });
  });

  it('forges a selected run in place', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'), O('mul'), P('s2'));
    s = play(s, { type: 'tapToken', index: 0 }, { type: 'tapToken', index: 2 }, FORGE);
    // (8 + 4) became one piece: bench is now [12] × [2]
    expect(s.snap.bench.map((t) => t.type)).toEqual(['piece', 'op', 'piece']);
    expect(benchText(s)).toBe('(8 + 4) × 2');
    expect(analyzeBench(s)).toMatchObject({ value: R.int(24) });
    expect(s.selection).toBeNull();
  });

  it('forged pieces can be nested and still carry complete provenance', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'), FORGE); // 12
    const a = s.snap.tray[s.snap.tray.length - 1];
    s = play(s, P(a), O('add'), P('s2'), FORGE); // 14
    const b = s.snap.tray[s.snap.tray.length - 1];
    const f = s.snap.pieces[b] as ForgedPiece;
    expect(f.parts).toEqual([a, 's2']);
    expect(f.sourceIds).toEqual(['s0', 's1', 's2']);
    expect(formatExpr(f.expr)).toBe('8 + 4 + 2');
  });

  it('refuses to forge a single number', () => {
    const s = play(fresh(), P('s0'), FORGE);
    expect(s.feedback).toEqual({ kind: 'forge-needs-two' });
    expect(s.snap.bench).toHaveLength(1);
  });

  it('refuses to forge an unbalanced selection', () => {
    let s = play(fresh(), L, P('s0'), O('add'), P('s1'), Rp);
    s = play(s, { type: 'tapToken', index: 0 }, { type: 'tapToken', index: 3 }, FORGE);
    expect(s.feedback).toEqual({ kind: 'forge-unbalanced' });
  });

  it('refuses to forge an incomplete or rule-breaking expression', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'), O('mul'), FORGE);
    expect(s.feedback).toMatchObject({ kind: 'parse', scope: 'bench', error: { kind: 'missing-operand', incomplete: true } });
    s = play(fresh(), P('s2'), O('sub'), P('s0'), FORGE);
    expect(s.feedback).toMatchObject({ kind: 'rule', violation: 'negative' });
    s = play(fresh(), P('s0'), O('div'), P('s3'), FORGE);
    expect(s.feedback).toMatchObject({ kind: 'rule', violation: 'fraction' });
  });

  it('completes the puzzle when all five are forged into the target', () => {
    const s = play(fresh(), L, P('s0'), O('add'), P('s1'), O('add'), P('s2'), Rp, O('mul'), P('s3'), O('sub'), P('s4'), FORGE);
    expect(s.status).toBe('solved');
    expect(s.play.solvedAt).toBe(5000);
  });

  it('can check a lone forged piece that holds all five', () => {
    const p = mkPuzzle([1, 2, 3, 4, 5], 15);
    let s = play(createGame(p, 0), P('s0'), O('add'), P('s1'), O('add'), P('s2'), O('add'), P('s3'), O('mul'), P('s4'), FORGE);
    expect(s.status).toBe('playing'); // 1+2+3+4×5 = 26
    s = play(s, CHECK);
    expect(s.feedback).toEqual({ kind: 'wrong-result', value: R.int(26), target: 15 });
  });
});

describe('breaking apart', () => {
  it('returns the direct parts to the tray', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'), FORGE);
    const a = s.snap.tray[s.snap.tray.length - 1];
    s = play(s, P(a), O('mul'), P('s2'), FORGE);
    const b = s.snap.tray[s.snap.tray.length - 1];
    s = play(s, { type: 'breakApart', pieceId: b });
    expect(s.snap.tray).toEqual(['s3', 's4', a, 's2']);
    s = play(s, { type: 'breakApart', pieceId: a });
    expect(s.snap.tray).toEqual(['s3', 's4', 's0', 's1', 's2']);
  });

  it('only breaks forged pieces that are in the tray', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'), FORGE);
    const a = s.snap.tray[s.snap.tray.length - 1];
    s = play(s, P(a));
    s = play(s, { type: 'breakApart', pieceId: a });
    expect(s.feedback).toEqual({ kind: 'unavailable-piece' });
    s = play(s, { type: 'breakApart', pieceId: 's3' });
    expect(s.feedback).toEqual({ kind: 'unavailable-piece' });
  });
});

describe('editing, undo, redo and clear', () => {
  it('backspace returns the piece to the tray', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'));
    s = play(s, { type: 'backspace' });
    expect(s.snap.tray).toContain('s1');
    expect(s.snap.bench).toHaveLength(2);
    expect(s.snap.cursor).toBe(2);
  });

  it('inserts at the cursor', () => {
    let s = play(fresh(), P('s0'), P('s1'));
    s = play(s, { type: 'moveCursor', to: 1 }, O('mul'));
    expect(benchText(s)).toBe('8 × 4');
  });

  it('removes a selection and returns its pieces', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'), O('add'), P('s2'));
    s = play(s, { type: 'tapToken', index: 1 }, { type: 'tapToken', index: 2 }, { type: 'removeSelection' });
    expect(benchText(s)).toBe('8 + 2');
    expect(s.snap.tray).toContain('s1');
  });

  it('tapping a lone selected token deselects it', () => {
    let s = play(fresh(), P('s0'));
    s = play(s, { type: 'tapToken', index: 0 });
    expect(s.selection).toEqual({ anchor: 0, focus: 0 });
    s = play(s, { type: 'tapToken', index: 0 });
    expect(s.selection).toBeNull();
  });

  it('wraps a selection in parentheses', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'), O('mul'), P('s2'));
    s = play(s, { type: 'tapToken', index: 0 }, { type: 'tapToken', index: 2 }, L);
    expect(benchText(s)).toBe('(8 + 4) × 2');
  });

  it('undo restores the correct source pieces, and redo reapplies', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'));
    s = play(s, { type: 'undo' });
    expect(s.snap.tray).toContain('s1');
    expect(s.snap.tray).not.toContain('s0');
    s = play(s, { type: 'redo' });
    expect(s.snap.tray).not.toContain('s1');
  });

  it('undoing a forge puts the pieces back on the bench and removes the forged piece', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'), FORGE);
    const id = s.snap.tray[s.snap.tray.length - 1];
    s = play(s, { type: 'undo' });
    expect(s.snap.tray).not.toContain(id);
    expect(benchText(s)).toBe('8 + 4');
  });

  it('a new move clears the redo stack', () => {
    let s = play(fresh(), P('s0'), { type: 'undo' }, P('s1'));
    s = play(s, { type: 'redo' });
    expect(s.feedback).toEqual({ kind: 'nothing-to-redo' });
  });

  it('clear restores all five source pieces, breaking forged pieces', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'), FORGE, P('s2'), O('mul'));
    s = play(s, { type: 'clear' });
    expect(s.snap.bench).toEqual([]);
    expect([...s.snap.tray].sort()).toEqual(['s0', 's1', 's2', 's3', 's4']);
    // …and clearing can itself be undone.
    s = play(s, { type: 'undo' });
    expect(s.snap.bench).toHaveLength(2);
  });

  it('reports when there is nothing to undo', () => {
    expect(play(fresh(), { type: 'undo' }).feedback).toEqual({ kind: 'nothing-to-undo' });
  });

  it('reorders the tray without losing pieces', () => {
    let s = play(fresh(), { type: 'reorderTray', order: ['s4', 's3', 's2', 's1', 's0'] });
    expect(s.snap.tray).toEqual(['s4', 's3', 's2', 's1', 's0']);
    const before = s;
    s = play(s, { type: 'reorderTray', order: ['s4', 's4', 's2', 's1', 's0'] });
    expect(s).toBe(before);
  });
});

describe('the combined Forge/Check button', () => {
  it('forges while pieces remain in the tray', () => {
    expect(primaryAction(fresh())).toBe('forge');
    expect(primaryAction(play(fresh(), P('s0'), O('add'), P('s1')))).toBe('forge');
  });

  it('checks once every piece is on the bench', () => {
    const s = play(fresh(), P('s0'), O('add'), P('s1'), O('add'), P('s2'), O('add'), P('s3'), O('add'), P('s4'));
    expect(primaryAction(s)).toBe('check');
  });

  it('forges a selection even when every piece is on the bench', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'), O('add'), P('s2'), O('add'), P('s3'), O('add'), P('s4'));
    s = play(s, { type: 'tapToken', index: 0 }, { type: 'tapToken', index: 2 });
    expect(primaryAction(s)).toBe('forge');
  });

  it('checks a single forged piece that holds everything', () => {
    const s = play(fresh(), P('s0'), O('add'), P('s1'), O('add'), P('s2'), O('add'), P('s3'), O('add'), P('s4'), FORGE);
    expect(s.snap.tray).toHaveLength(1);
    expect(primaryAction(s)).toBe('check');
  });

  it('can solve a puzzle that needs grouping without bracket keys', () => {
    // (8 + 4 + 2) × 3 − 6 = 36, grouping by forging instead of brackets.
    let s = play(fresh(), P('s0'), O('add'), P('s1'), O('add'), P('s2'), FORGE);
    const f = s.snap.tray[s.snap.tray.length - 1];
    s = play(s, P(f), O('mul'), P('s3'), O('sub'), P('s4'));
    expect(primaryAction(s)).toBe('check');
    s = play(s, CHECK);
    expect(s.status).toBe('solved');
    expect(formatExpr(s.solution!)).toBe('(8 + 4 + 2) × 3 − 6');
  });
});

describe('duplicate face values', () => {
  const dup = mkPuzzle([6, 6, 2, 3, 1], 18);
  it('keeps two equal pieces as separate identities', () => {
    let s = play(createGame(dup, 0), P('s0'));
    expect(s.snap.tray).toContain('s1');
    s = play(s, O('add'), P('s1'));
    expect(analyzeBench(s)).toMatchObject({ value: R.int(12) });
    s = play(s, { type: 'undo' });
    expect(s.snap.tray).toContain('s1');
    expect(s.snap.tray).not.toContain('s0');
  });
});

describe('persistence', () => {
  it('survives a JSON round trip and keeps playing', () => {
    let s = play(fresh(), P('s0'), O('add'), P('s1'), FORGE, P('s2'));
    const restored = JSON.parse(JSON.stringify(s)) as GameState;
    expect(checkInvariants(restored)).toEqual([]);
    const id = restored.snap.tray.find((x) => x.startsWith('f'))!;
    s = play(restored, O('mul'), P(id), O('add'), P('s3'), O('add'), P('s4'), CHECK);
    expect(s.feedback).toMatchObject({ kind: 'wrong-result' }); // 2 × 12 + 3 + 6 = 33
    expect(s.feedback).toEqual({ kind: 'wrong-result', value: R.int(33), target: 36 });
  });
});

describe('random play never breaks the piece invariant', () => {
  it('holds across thousands of random moves', () => {
    const rnd = testRng(77);
    const ops: Op[] = ['add', 'sub', 'mul', 'div'];
    for (let game = 0; game < 60; game++) {
      let s = fresh();
      for (let step = 0; step < 80 && s.status === 'playing'; step++) {
        const r = rnd();
        const benchLen = s.snap.bench.length;
        let a: GameAction;
        if (r < 0.3 && s.snap.tray.length) a = P(s.snap.tray[Math.floor(rnd() * s.snap.tray.length)]);
        else if (r < 0.3) a = P('s0');
        else if (r < 0.45) a = O(ops[Math.floor(rnd() * 4)]);
        else if (r < 0.5) a = rnd() < 0.5 ? L : Rp;
        else if (r < 0.58) a = { type: 'tapToken', index: Math.floor(rnd() * (benchLen + 1)) };
        else if (r < 0.66) a = FORGE;
        else if (r < 0.72) a = { type: 'undo' };
        else if (r < 0.76) a = { type: 'redo' };
        else if (r < 0.81) a = { type: 'backspace' };
        else if (r < 0.85) a = { type: 'moveCursor', to: Math.floor(rnd() * (benchLen + 1)) };
        else if (r < 0.9) a = { type: 'breakApart', pieceId: s.snap.tray[Math.floor(rnd() * Math.max(1, s.snap.tray.length))] ?? 'x' };
        else if (r < 0.93) a = { type: 'clear' };
        else if (r < 0.96) a = { type: 'removeSelection' };
        else a = CHECK;
        s = gameReducer(s, a);
        const problems = checkInvariants(s);
        if (problems.length) throw new Error(`game ${game} step ${step} ${JSON.stringify(a)}: ${problems.join('; ')}`);
      }
    }
  });
});

describe('the puzzle clock', () => {
  it('banks active time without touching history, moves or feedback', () => {
    const s0 = play(fresh(), P('s0'));
    const s1 = gameReducer(s0, { type: 'addTime', ms: 4200 });
    const s2 = gameReducer(s1, { type: 'addTime', ms: 800 });
    expect(s2.play.activeMs).toBe(5000);
    expect(s2.play.moves).toBe(s0.play.moves);
    expect(s2.past).toBe(s0.past);
    expect(s2.snap).toBe(s0.snap);
    expect(s2.feedbackSeq).toBe(s0.feedbackSeq);
  });

  it('ignores empty or negative stretches (a clock that went backwards)', () => {
    const s = fresh();
    expect(gameReducer(s, { type: 'addTime', ms: 0 })).toBe(s);
    expect(gameReducer(s, { type: 'addTime', ms: -50 })).toBe(s);
  });

  it('still banks the final stretch once solved', () => {
    const solved = { ...fresh(), status: 'solved' as const };
    expect(gameReducer(solved, { type: 'addTime', ms: 1500 }).play.activeMs).toBe(1500);
  });

  it('reports active time, falling back to wall-clock time for older saves', () => {
    const s = fresh();
    expect(playTimeMs(s.play)).toBe(0);
    expect(playTimeMs(s.play, 4000)).toBe(3000);
    expect(playTimeMs({ ...s.play, solvedAt: 9000 })).toBe(8000);
    // Time spent in the background is excluded: only banked time counts.
    expect(playTimeMs({ ...s.play, solvedAt: 900_000, activeMs: 42_000 })).toBe(42_000);
  });
});
