import type { Op, Violation } from './arithmetic';
import { INITIAL_CONFIG, type RuleSet } from './config';
import { evaluate, type Expr, type OpExpr, type SourceId } from './expr';
import { isBalancedRange, parseTokens, type ParseError, type Token } from './parse';
import { forgedPiece, pieceExpr, pieceSourceIds, type ForgedPiece, type Piece, type PieceId } from './pieces';
import type { Puzzle } from './puzzle';
import * as R from './rational';
import { validateSolution } from './validate';

/**
 * Game state and every player move, as a pure reducer.
 *
 * Location invariant: every piece that exists is in exactly one place —
 * the tray, the bench, or inside a forged piece (consumed). Undo/redo swap
 * whole snapshots, so a consumed piece can never be duplicated or resurrected.
 */

export interface Snapshot {
  /** Every piece created in this attempt (append-only; consumed pieces remain for break-apart). */
  readonly pieces: Readonly<Record<PieceId, Piece>>;
  /** Available pieces, in display order. */
  readonly tray: readonly PieceId[];
  /** The equation under construction. */
  readonly bench: readonly Token[];
  /** Insertion point, 0…bench.length. */
  readonly cursor: number;
  /** Counter for new piece and token ids. */
  readonly nextId: number;
}

export interface Selection {
  /** Token index where the selection started. */
  readonly anchor: number;
  /** Token index where it currently ends (may be before anchor). */
  readonly focus: number;
}

export type Feedback =
  | { kind: 'solved' }
  | { kind: 'wrong-result'; value: R.Rational; target: number }
  | { kind: 'not-all-used'; unused: PieceId[] }
  | { kind: 'parse'; error: ParseError; scope: 'bench' | 'selection' }
  | { kind: 'rule'; violation: Violation; op: Op; left: R.Rational; right: R.Rational; scope: 'bench' | 'selection' }
  | { kind: 'forge-needs-two' }
  | { kind: 'forge-unbalanced' }
  | { kind: 'forged'; pieceId: PieceId }
  | { kind: 'broken-apart'; pieceId: PieceId }
  | { kind: 'unavailable-piece' }
  | { kind: 'nothing-to-undo' }
  | { kind: 'nothing-to-redo' }
  | { kind: 'undone' }
  | { kind: 'redone' }
  | { kind: 'cleared' }
  | { kind: 'blocked' };

export interface PlayStats {
  readonly startedAt: number;
  readonly solvedAt?: number;
  readonly moves: number;
  readonly forges: number;
  readonly undos: number;
  readonly checks: number;
}

export interface GameState {
  readonly version: 1;
  readonly puzzle: Puzzle;
  readonly snap: Snapshot;
  readonly selection: Selection | null;
  readonly past: readonly Snapshot[];
  readonly future: readonly Snapshot[];
  readonly status: 'playing' | 'solved';
  readonly feedback: Feedback | null;
  /** Increments whenever feedback is set, so the UI can re-announce identical messages. */
  readonly feedbackSeq: number;
  readonly solution: Expr | null;
  readonly play: PlayStats;
}

export type GameAction =
  | { type: 'insertPiece'; pieceId: PieceId }
  | { type: 'insertOp'; op: Op }
  | { type: 'insertParen'; paren: '(' | ')' }
  | { type: 'backspace' }
  | { type: 'moveCursor'; to: number }
  | { type: 'tapToken'; index: number }
  | { type: 'clearSelection' }
  | { type: 'removeSelection' }
  | { type: 'forge'; now: number }
  | { type: 'breakApart'; pieceId: PieceId }
  | { type: 'reorderTray'; order: PieceId[] }
  | { type: 'clear' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'check'; now: number }
  | { type: 'dismissFeedback' };

const HISTORY_LIMIT = 300;

export function createGame(puzzle: Puzzle, now: number): GameState {
  const pieces: Record<PieceId, Piece> = {};
  for (const s of puzzle.sources) pieces[s.id] = s;
  return {
    version: 1,
    puzzle,
    snap: { pieces, tray: puzzle.sources.map((s) => s.id), bench: [], cursor: 0, nextId: 1 },
    selection: null,
    past: [],
    future: [],
    status: 'playing',
    feedback: null,
    feedbackSeq: 0,
    solution: null,
    play: { startedAt: now, moves: 0, forges: 0, undos: 0, checks: 0 },
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const selectionRange = (sel: Selection | null): [number, number] | null =>
  sel ? [Math.min(sel.anchor, sel.focus), Math.max(sel.anchor, sel.focus)] : null;

export function expandPiece(snap: Snapshot) {
  return (id: PieceId): Expr | undefined => {
    const p = snap.pieces[id];
    return p && pieceExpr(p);
  };
}

export type BenchAnalysis =
  | { kind: 'empty' }
  | { kind: 'incomplete'; error: ParseError }
  | { kind: 'syntax'; error: ParseError }
  | { kind: 'rule'; violation: Violation; at: OpExpr; left: R.Rational; right: R.Rational }
  | { kind: 'value'; value: R.Rational; expr: Expr; usesAll: boolean; pieceCount: number };

/** Live analysis of a token run (the whole bench by default). Pure; memoise in the UI. */
export function analyzeTokens(snap: Snapshot, tokens: readonly Token[], rules: RuleSet, totalSources: number): BenchAnalysis {
  if (tokens.length === 0) return { kind: 'empty' };
  const parsed = parseTokens(tokens, expandPiece(snap));
  if (!parsed.ok) return parsed.error.incomplete ? { kind: 'incomplete', error: parsed.error } : { kind: 'syntax', error: parsed.error };
  const ev = evaluate(parsed.expr, rules);
  if (!ev.ok) return { kind: 'rule', violation: ev.violation, at: ev.at, left: ev.leftValue, right: ev.rightValue };
  const sources = new Set<SourceId>();
  for (const id of parsed.pieceIds) pieceSourceIds(snap.pieces[id]).forEach((s) => sources.add(s));
  return { kind: 'value', value: ev.value, expr: parsed.expr, usesAll: sources.size === totalSources, pieceCount: parsed.pieceIds.length };
}

export const analyzeBench = (state: GameState, rules: RuleSet = INITIAL_CONFIG.rules) =>
  analyzeTokens(state.snap, state.snap.bench, rules, state.puzzle.sources.length);

/**
 * What the single Forge/Check button does right now:
 *  - a selection on the bench is forged in place;
 *  - once every live piece is on the bench (or fused into one piece), it checks;
 *  - otherwise the bench is forged into a new piece.
 */
export function primaryAction(state: GameState): 'forge' | 'check' {
  const { snap } = state;
  if (state.selection) return 'forge';
  if (snap.tray.length === 0 && snap.bench.length > 0) return 'check';
  if (snap.bench.length === 0 && snap.tray.length === 1 && snap.pieces[snap.tray[0]].kind === 'forged') return 'check';
  return 'forge';
}

/** Where is each source right now? Used for the tray sockets and accessibility. */
export type SourceLocation = 'tray' | 'bench' | { forgedInto: PieceId };

export function sourceLocations(snap: Snapshot): Map<SourceId, SourceLocation> {
  const out = new Map<SourceId, SourceLocation>();
  for (const id of snap.tray) {
    const p = snap.pieces[id];
    if (p.kind === 'source') out.set(p.id, 'tray');
    else p.sourceIds.forEach((s) => out.set(s, { forgedInto: p.id }));
  }
  for (const t of snap.bench) {
    if (t.type !== 'piece') continue;
    const p = snap.pieces[t.pieceId];
    if (p.kind === 'source') out.set(p.id, 'bench');
    else p.sourceIds.forEach((s) => out.set(s, { forgedInto: p.id }));
  }
  return out;
}

/** Live (non-consumed) pieces: in the tray or on the bench. */
export function livePieceIds(snap: Snapshot): PieceId[] {
  return [...snap.tray, ...snap.bench.flatMap((t) => (t.type === 'piece' ? [t.pieceId] : []))];
}

/**
 * Verify the location invariant. Returns a list of problems (empty when sound).
 * Used by tests after every move; cheap enough to run in development builds.
 */
export function checkInvariants(state: GameState): string[] {
  const problems: string[] = [];
  const { snap, puzzle } = state;
  const live = livePieceIds(snap);
  if (new Set(live).size !== live.length) problems.push('a piece is in two places');
  const seen = new Map<SourceId, number>();
  for (const id of live) {
    const p = snap.pieces[id];
    if (!p) {
      problems.push(`unknown piece ${id}`);
      continue;
    }
    for (const s of pieceSourceIds(p)) seen.set(s, (seen.get(s) ?? 0) + 1);
  }
  for (const s of puzzle.sources) {
    const c = seen.get(s.id) ?? 0;
    if (c !== 1) problems.push(`source ${s.id} accounted for ${c} times`);
  }
  if (seen.size !== puzzle.sources.length) problems.push('unexpected source ids present');
  if (snap.cursor < 0 || snap.cursor > snap.bench.length) problems.push('cursor out of range');
  const range = selectionRange(state.selection);
  if (range && (range[0] < 0 || range[1] >= snap.bench.length)) problems.push('selection out of range');
  return problems;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function withFeedback(state: GameState, feedback: Feedback | null): GameState {
  return { ...state, feedback, feedbackSeq: state.feedbackSeq + 1 };
}

/** Apply a change to the snapshot, recording undo history. */
function commit(state: GameState, snap: Snapshot, extra: Partial<GameState> = {}): GameState {
  const past = [...state.past, state.snap];
  if (past.length > HISTORY_LIMIT) past.shift();
  return {
    ...state,
    snap,
    past,
    future: [],
    selection: null,
    feedback: null,
    play: { ...state.play, moves: state.play.moves + 1 },
    ...extra,
  };
}

function insertTokens(snap: Snapshot, at: number, tokens: Token[]): Snapshot {
  const bench = [...snap.bench];
  bench.splice(at, 0, ...tokens);
  return { ...snap, bench, cursor: at + tokens.length };
}

const tokenId = (n: number) => `k${n}`;

/** Remove bench tokens [start, end]; any pieces among them go back to the tray. */
function removeRange(snap: Snapshot, start: number, end: number): Snapshot {
  const removed = snap.bench.slice(start, end + 1);
  const bench = [...snap.bench.slice(0, start), ...snap.bench.slice(end + 1)];
  const returned = removed.flatMap((t) => (t.type === 'piece' ? [t.pieceId] : []));
  let cursor = snap.cursor;
  if (cursor > end) cursor -= removed.length;
  else if (cursor > start) cursor = start;
  return { ...snap, bench, tray: [...snap.tray, ...returned], cursor };
}

export function gameReducer(state: GameState, action: GameAction, rules: RuleSet = INITIAL_CONFIG.rules): GameState {
  if (action.type === 'dismissFeedback') return { ...state, feedback: null };
  if (state.status === 'solved') return state;
  const { snap } = state;

  switch (action.type) {
    case 'insertPiece': {
      const i = snap.tray.indexOf(action.pieceId);
      if (i < 0) return withFeedback(state, { kind: 'unavailable-piece' });
      const tray = snap.tray.filter((id) => id !== action.pieceId);
      const next = insertTokens({ ...snap, tray, nextId: snap.nextId + 1 }, snap.cursor, [
        { id: tokenId(snap.nextId), type: 'piece', pieceId: action.pieceId },
      ]);
      return commit(state, next);
    }

    case 'insertOp':
      return commit(
        state,
        insertTokens({ ...snap, nextId: snap.nextId + 1 }, snap.cursor, [{ id: tokenId(snap.nextId), type: 'op', op: action.op }]),
      );

    case 'insertParen': {
      const range = selectionRange(state.selection);
      if (range && action.paren === '(') {
        // Wrap the selection in a pair of brackets.
        const [s, e] = range;
        const bench = [...snap.bench];
        bench.splice(e + 1, 0, { id: tokenId(snap.nextId + 1), type: 'rparen' });
        bench.splice(s, 0, { id: tokenId(snap.nextId), type: 'lparen' });
        return commit(state, { ...snap, bench, cursor: e + 3, nextId: snap.nextId + 2 });
      }
      const t: Token = action.paren === '(' ? { id: tokenId(snap.nextId), type: 'lparen' } : { id: tokenId(snap.nextId), type: 'rparen' };
      return commit(state, insertTokens({ ...snap, nextId: snap.nextId + 1 }, snap.cursor, [t]));
    }

    case 'backspace': {
      const range = selectionRange(state.selection);
      if (range) return commit(state, removeRange(snap, range[0], range[1]));
      if (snap.cursor === 0) return state;
      return commit(state, removeRange(snap, snap.cursor - 1, snap.cursor - 1));
    }

    case 'removeSelection': {
      const range = selectionRange(state.selection);
      if (!range) return state;
      return commit(state, removeRange(snap, range[0], range[1]));
    }

    case 'moveCursor': {
      const to = Math.max(0, Math.min(snap.bench.length, action.to));
      // Cursor moves are not undoable edits, but they do keep the snapshot current.
      return { ...state, snap: { ...snap, cursor: to }, selection: null };
    }

    case 'tapToken': {
      const i = action.index;
      if (i < 0 || i >= snap.bench.length) return state;
      const sel = state.selection;
      if (!sel) return { ...state, selection: { anchor: i, focus: i } };
      if (sel.anchor === sel.focus && sel.anchor === i) return { ...state, selection: null };
      return { ...state, selection: { anchor: sel.anchor, focus: i } };
    }

    case 'clearSelection':
      return state.selection ? { ...state, selection: null } : state;

    case 'forge':
      return forge(state, action.now, rules);

    case 'breakApart': {
      const p = snap.pieces[action.pieceId];
      const i = snap.tray.indexOf(action.pieceId);
      if (!p || p.kind !== 'forged' || i < 0) return withFeedback(state, { kind: 'unavailable-piece' });
      const tray = [...snap.tray];
      tray.splice(i, 1, ...p.parts);
      return commit(state, { ...snap, tray }, { feedback: { kind: 'broken-apart', pieceId: p.id }, feedbackSeq: state.feedbackSeq + 1 });
    }

    case 'reorderTray': {
      const a = [...action.order].sort();
      const b = [...snap.tray].sort();
      if (a.length !== b.length || a.some((x, k) => x !== b[k])) return state;
      return { ...state, snap: { ...snap, tray: action.order } };
    }

    case 'clear': {
      const original = state.puzzle.sources.map((s) => s.id);
      if (snap.bench.length === 0 && snap.tray.length === original.length && snap.tray.every((id) => snap.pieces[id]?.kind === 'source')) {
        return state;
      }
      return commit(
        state,
        { ...snap, tray: original, bench: [], cursor: 0 },
        { feedback: { kind: 'cleared' }, feedbackSeq: state.feedbackSeq + 1 },
      );
    }

    case 'undo': {
      if (state.past.length === 0) return withFeedback(state, { kind: 'nothing-to-undo' });
      const prev = state.past[state.past.length - 1];
      return {
        ...state,
        snap: prev,
        past: state.past.slice(0, -1),
        future: [snap, ...state.future],
        selection: null,
        feedback: { kind: 'undone' },
        feedbackSeq: state.feedbackSeq + 1,
        play: { ...state.play, undos: state.play.undos + 1 },
      };
    }

    case 'redo': {
      if (state.future.length === 0) return withFeedback(state, { kind: 'nothing-to-redo' });
      const [next, ...rest] = state.future;
      return {
        ...state,
        snap: next,
        past: [...state.past, snap],
        future: rest,
        selection: null,
        feedback: { kind: 'redone' },
        feedbackSeq: state.feedbackSeq + 1,
      };
    }

    case 'check':
      return check(state, action.now, rules);
  }
}

function forge(state: GameState, now: number, rules: RuleSet): GameState {
  const { snap } = state;
  const range = selectionRange(state.selection);
  const [start, end] = range ?? [0, snap.bench.length - 1];
  const scope = range ? 'selection' : 'bench';
  if (snap.bench.length === 0) return withFeedback(state, { kind: 'forge-needs-two' });
  if (!isBalancedRange(snap.bench, start, end)) return withFeedback(state, { kind: 'forge-unbalanced' });

  const tokens = snap.bench.slice(start, end + 1);
  const parts = tokens.flatMap((t) => (t.type === 'piece' ? [t.pieceId] : []));
  if (parts.length < 2) return withFeedback(state, { kind: 'forge-needs-two' });

  const parsed = parseTokens(tokens, expandPiece(snap));
  if (!parsed.ok) return withFeedback(state, { kind: 'parse', error: { ...parsed.error, index: parsed.error.index + start }, scope });
  const ev = evaluate(parsed.expr, rules);
  if (!ev.ok) {
    return withFeedback(state, { kind: 'rule', violation: ev.violation, op: ev.at.op, left: ev.leftValue, right: ev.rightValue, scope });
  }

  const id = `f${snap.nextId}`;
  const piece: ForgedPiece = forgedPiece(id, parsed.expr, ev.value, parts);
  const pieces = { ...snap.pieces, [id]: piece };
  const play = { ...state.play, forges: state.play.forges + 1 };
  const fb: Feedback = { kind: 'forged', pieceId: id };

  if (range) {
    // Forge in place: the selected run becomes one piece on the bench.
    const bench = [...snap.bench];
    bench.splice(start, end - start + 1, { id: tokenId(snap.nextId + 1), type: 'piece', pieceId: id });
    let cursor = snap.cursor;
    if (cursor > end) cursor -= end - start;
    else if (cursor > start) cursor = start + 1;
    return commit(
      state,
      { ...snap, pieces, bench, cursor, nextId: snap.nextId + 2 },
      { play, feedback: fb, feedbackSeq: state.feedbackSeq + 1 },
    );
  }

  // Forge the whole bench: the new piece goes to the tray and the bench is cleared.
  const next = commit(
    state,
    { ...snap, pieces, bench: [], cursor: 0, tray: [...snap.tray, id], nextId: snap.nextId + 1 },
    { play, feedback: fb, feedbackSeq: state.feedbackSeq + 1 },
  );
  // Forging all five into exactly the target completes the puzzle.
  if (piece.sourceIds.length === state.puzzle.sources.length && R.equals(piece.value, R.int(state.puzzle.target))) {
    return { ...next, status: 'solved', solution: piece.expr, feedback: { kind: 'solved' }, play: { ...next.play, solvedAt: now } };
  }
  return next;
}

function check(state: GameState, now: number, rules: RuleSet): GameState {
  const { snap, puzzle } = state;
  const play = { ...state.play, checks: state.play.checks + 1 };
  let expr: Expr;

  if (snap.bench.length === 0 && snap.tray.length === 1 && snap.pieces[snap.tray[0]].kind === 'forged') {
    // A single forged piece holding everything can be checked directly.
    expr = pieceExpr(snap.pieces[snap.tray[0]]);
  } else {
    if (snap.bench.length > 0 && snap.tray.length > 0) {
      return { ...withFeedback(state, { kind: 'not-all-used', unused: [...snap.tray] }), play };
    }
    const parsed = parseTokens(snap.bench, expandPiece(snap));
    if (!parsed.ok) return { ...withFeedback(state, { kind: 'parse', error: parsed.error, scope: 'bench' }), play };
    expr = parsed.expr;
  }

  const result = validateSolution(expr, puzzle.sources, puzzle.target, rules);
  if (result.ok) {
    return {
      ...state,
      status: 'solved',
      solution: expr,
      selection: null,
      feedback: { kind: 'solved' },
      feedbackSeq: state.feedbackSeq + 1,
      play: { ...play, solvedAt: now },
    };
  }
  const issue = result.issues[0];
  if (issue.kind === 'rule') {
    const f = issue.failure;
    return {
      ...withFeedback(state, { kind: 'rule', violation: f.violation, op: f.at.op, left: f.leftValue, right: f.rightValue, scope: 'bench' }),
      play,
    };
  }
  if (issue.kind === 'missing-source') {
    return { ...withFeedback(state, { kind: 'not-all-used', unused: [...snap.tray] }), play };
  }
  if (issue.kind === 'wrong-result') {
    return { ...withFeedback(state, { kind: 'wrong-result', value: issue.value, target: puzzle.target }), play };
  }
  // Duplicate/unknown pieces cannot be produced through the reducer; treat defensively.
  return { ...withFeedback(state, { kind: 'unavailable-piece' }), play };
}
