/**
 * All player-facing wording for the game board: feedback, live readout and
 * screen-reader descriptions. Original copy, written to be gentle and specific.
 * Pure TypeScript so it can be tested and later localised.
 */
import {
  OP_SYMBOL,
  OP_WORD,
  Rational,
  recipeOf,
  selectionRange,
  type BenchAnalysis,
  type Expr,
  type Feedback,
  type GameState,
  type Op,
  type ParseError,
  type Piece,
  type PieceId,
  type Snapshot,
  type Token,
  type Violation,
} from '../../engine';
import { formatExpr, formatValue } from '../../engine/format';

export type Tone = 'neutral' | 'good' | 'issue' | 'info';
export interface Message {
  text: string;
  tone: Tone;
}

const v = (r: Rational.Rational) => formatValue(r);

export function pieceValueText(p: Piece): string {
  return v(p.value);
}

function listNumbers(snap: Snapshot, ids: readonly PieceId[]): string {
  const vals = ids.map((id) => v(snap.pieces[id].value));
  if (vals.length <= 1) return vals.join('');
  return `${vals.slice(0, -1).join(', ')} and ${vals[vals.length - 1]}`;
}

function tokenText(snap: Snapshot, t: Token): string {
  switch (t.type) {
    case 'piece':
      return v(snap.pieces[t.pieceId].value);
    case 'op':
      return OP_SYMBOL[t.op];
    case 'lparen':
      return '(';
    case 'rparen':
      return ')';
  }
}

export function parseErrorText(snap: Snapshot, e: ParseError, tokens: readonly Token[] = snap.bench): string {
  const at = tokens[e.index];
  const opSym = at?.type === 'op' ? OP_SYMBOL[at.op] : null;
  switch (e.kind) {
    case 'empty':
      return 'Tap a number to start building.';
    case 'missing-operand':
      if (e.incomplete) return opSym ? `Keep going: ${opSym} needs a number after it.` : 'Keep going: add a number.';
      return opSym ? `${opSym} needs a number on each side.` : 'An operation is missing a number.';
    case 'missing-operator': {
      const next = at ? tokenText(snap, at) : '';
      return next === '('
        ? 'A number sits right before a bracket. Put an operation between them.'
        : 'Two numbers are side by side. Put an operation between them.';
    }
    case 'unclosed':
      return 'A bracket is still open. Add ) to close it.';
    case 'extra-close':
      return 'There is a ) without a matching (.';
    case 'empty-parens':
      return 'Those brackets are empty. Put numbers inside or remove them.';
    case 'unknown-piece':
      return 'That piece is not available.';
  }
}

export function ruleText(violation: Violation, op: Op, a: Rational.Rational, b: Rational.Rational): string {
  const step = `${v(a)} ${OP_SYMBOL[op]} ${v(b)}`;
  switch (violation) {
    case 'negative':
      return `${step} would drop below zero. Every step has to stay at zero or above — try swapping or regrouping.`;
    case 'fraction':
      return `${step} doesn't come out even. Every step has to be a whole number.`;
    case 'divide-by-zero':
      return `${step} divides by zero, which can't be done. Try a different grouping.`;
    case 'overflow':
      return `${step} makes a number too large to work with.`;
  }
}

export function feedbackMessage(state: GameState): Message | null {
  const f: Feedback | null = state.feedback;
  const { snap } = state;
  if (!f) return null;
  switch (f.kind) {
    case 'solved':
      return { text: 'Forged! Every piece fits.', tone: 'good' };
    case 'wrong-result': {
      const diff = Math.abs(f.value.num / f.value.den - f.target);
      const lead = diff <= 2 ? 'So close!' : 'Not quite.';
      return { text: `${lead} Your equation makes ${v(f.value)}, and the target is ${f.target}. Adjust a piece or two.`, tone: 'info' };
    }
    case 'not-all-used':
      return {
        text: `Every piece goes into the equation. Still in the tray: ${listNumbers(snap, f.unused)}.`,
        tone: 'info',
      };
    case 'parse':
      return { text: parseErrorText(snap, f.error), tone: f.error.incomplete ? 'info' : 'issue' };
    case 'rule':
      return { text: ruleText(f.violation, f.op, f.left, f.right), tone: 'issue' };
    case 'forge-needs-two':
      return { text: 'Forging joins at least two numbers. Build a small calculation first, like 3 + 4, then forge it.', tone: 'info' };
    case 'forge-unbalanced':
      return { text: 'Your selection cuts a pair of brackets in half. Include both ( and ), or neither.', tone: 'issue' };
    case 'forged': {
      const p = snap.pieces[f.pieceId];
      return p && p.kind === 'forged' ? { text: `Forged ${v(p.value)} from ${recipeOf(p)}.`, tone: 'good' } : null;
    }
    case 'broken-apart': {
      const p = snap.pieces[f.pieceId];
      return p && p.kind === 'forged' ? { text: `Broken back into ${listNumbers(snap, p.parts)}.`, tone: 'neutral' } : null;
    }
    case 'unavailable-piece':
      return { text: 'That piece is already in use.', tone: 'info' };
    case 'nothing-to-undo':
      return { text: 'Nothing to undo yet.', tone: 'neutral' };
    case 'nothing-to-redo':
      return { text: 'Nothing to redo.', tone: 'neutral' };
    case 'undone':
      return { text: 'Undone.', tone: 'neutral' };
    case 'redone':
      return { text: 'Redone.', tone: 'neutral' };
    case 'cleared':
      return { text: 'Bench cleared. All five pieces are back in the tray.', tone: 'neutral' };
    case 'blocked':
      return null;
  }
}

/** The line under the bench, recomputed as the player builds. */
export function readoutMessage(state: GameState, a: BenchAnalysis): Message {
  const { snap, puzzle } = state;
  const range = selectionRange(state.selection);
  if (range && range[0] === range[1]) {
    const t = snap.bench[range[0]];
    if (t?.type === 'piece') {
      const p = snap.pieces[t.pieceId];
      if (p.kind === 'forged') return { text: `${v(p.value)} was forged from ${recipeOf(p)}`, tone: 'neutral' };
    }
  }
  switch (a.kind) {
    case 'empty':
      return snap.tray.length === 1 && snap.pieces[snap.tray[0]].kind === 'forged'
        ? { text: 'Everything is forged into one piece. Tap Check to test it.', tone: 'info' }
        : { text: 'Tap numbers and tools to build an equation.', tone: 'neutral' };
    case 'incomplete':
      return { text: parseErrorText(snap, a.error), tone: 'neutral' };
    case 'syntax':
      return { text: parseErrorText(snap, a.error), tone: 'issue' };
    case 'rule':
      return { text: ruleText(a.violation, a.at.op, a.left, a.right), tone: 'issue' };
    case 'value': {
      const hit = Rational.equals(a.value, Rational.int(puzzle.target));
      if (a.usesAll && hit) return { text: `= ${v(a.value)}  ✓ matches the target. Tap Check!`, tone: 'good' };
      if (a.usesAll) return { text: `= ${v(a.value)}  ·  target ${puzzle.target}`, tone: 'neutral' };
      return { text: `= ${v(a.value)}`, tone: 'neutral' };
    }
  }
}

// ---------------------------------------------------------------------------
// Screen-reader descriptions
// ---------------------------------------------------------------------------

export function spokenToken(snap: Snapshot, t: Token): string {
  switch (t.type) {
    case 'piece': {
      const p = snap.pieces[t.pieceId];
      return p.kind === 'forged' ? `forged ${v(p.value)}` : v(p.value);
    }
    case 'op':
      return OP_WORD[t.op];
    case 'lparen':
      return 'open bracket';
    case 'rparen':
      return 'close bracket';
  }
}

export function spokenBench(snap: Snapshot): string {
  if (snap.bench.length === 0) return 'The equation bench is empty.';
  return `Equation: ${snap.bench.map((t) => spokenToken(snap, t)).join(' ')}.`;
}

/** Plain-language form of an expression: "open bracket 8 plus 4 close bracket times 2". */
export function spokenExpr(e: Expr): string {
  return formatExpr(e)
    .replace(/\+/g, 'plus')
    .replace(/−/g, 'minus')
    .replace(/×/g, 'times')
    .replace(/÷/g, 'divided by')
    .replace(/\(/g, 'open bracket ')
    .replace(/\)/g, ' close bracket');
}

/** Plain-language recipe of a piece: "8 plus 4 plus 2". */
export function spokenRecipe(p: Piece): string {
  return p.kind === 'source' ? v(p.value) : spokenExpr(p.expr);
}

/**
 * Accessible name for a tray piece. Source pieces are named by their fixed
 * slot so two equal values are always distinguishable ("6, piece 2 of 5").
 */
export function pieceA11yLabel(state: GameState, id: PieceId): string {
  const p = state.snap.pieces[id];
  if (p.kind === 'forged') return `Forged ${v(p.value)}, made from ${spokenRecipe(p)}`;
  const slot = state.puzzle.sources.findIndex((s) => s.id === id);
  const twins = state.puzzle.sources.filter((s) => Rational.equals(s.value, p.value)).length;
  return twins > 1 ? `${v(p.value)}, piece ${slot + 1} of 5, one of ${twins} ${v(p.value)}s` : `${v(p.value)}, piece ${slot + 1} of 5`;
}

export function trayA11ySummary(state: GameState): string {
  const { snap, puzzle } = state;
  const avail = snap.tray.map((id) => v(snap.pieces[id].value));
  const usedCount = puzzle.sources.filter((s) => !snap.tray.includes(s.id)).length;
  if (avail.length === 0) return 'The tray is empty: every piece is in the equation.';
  return `Tray: ${avail.join(', ')} available.${usedCount ? ` ${usedCount} of the original five in use.` : ''}`;
}
