/**
 * The interactive tutorial: an original walkthrough on a fixed puzzle.
 * Pure data + predicates so the whole flow is unit-tested.
 *
 * Puzzle: pieces 7, 2, 4, 1, 3 → target 18
 * Path taught:  forge 2 + 1 + 3 = 6, forge 7 − 4 = 3, then 3 × 6 = 18
 */
import {
  createGame,
  createSolver,
  INITIAL_CONFIG,
  Rational,
  sourcePiece,
  type GameAction,
  type GameState,
  type Puzzle,
} from '../../engine';
import type { ControlKey } from '../game/GameBoard';

// Display order and permanent ids.
const VALUES = [7, 2, 4, 1, 3];
const [S7, S2, S4, S1, S3] = ['s0', 's1', 's2', 's3', 's4'];

export function tutorialPuzzle(): Puzzle {
  const sources = VALUES.map((v, i) => sourcePiece(`s${i}`, Rational.int(v)));
  const witness = createSolver(sources, INITIAL_CONFIG.rules).solve(Rational.int(18));
  if (!witness) throw new Error('Tutorial puzzle must be solvable');
  return {
    id: 'tutorial',
    seed: 0,
    target: 18,
    sources,
    witness,
    easiest: witness,
    strategy: 'fallback',
    metrics: {
      distinctSolutions: 1,
      solutionCountCapped: false,
      easiestEffort: 0,
      easiestMaxIntermediate: 18,
      witnessMaxIntermediate: 18,
      targetInSources: false,
      requiresDivision: false,
      requiresSubtraction: false,
      requiresMultiplication: false,
      minDepth: 2,
      commonFactor: 1,
      nearTarget: false,
    },
  };
}

export const createTutorialGame = (now: number) => createGame(tutorialPuzzle(), now);

const forgedId = (s: GameState) => s.snap.tray.find((id) => s.snap.pieces[id].kind === 'forged');
const forgedWithValue = (s: GameState, v: number) =>
  s.snap.tray.find((id) => s.snap.pieces[id].kind === 'forged' && Rational.equals(s.snap.pieces[id].value, Rational.int(v)));

export interface TutorialStep {
  id: string;
  /** Short heading, then the coaching line. Original wording. */
  title: string;
  body: string;
  /** Controls to spotlight. */
  highlight: (s: GameState) => ControlKey[];
  /**
   * The move this step waits for. Steps without one show a Next button and
   * block board input.
   */
  expects?: (a: GameAction, s: GameState) => boolean;
  /** Optional check after the move, e.g. that the bench now reads "2 + 1". */
  done?: (s: GameState) => boolean;
}

const piece = (id: string) => (a: GameAction) => a.type === 'insertPiece' && a.pieceId === id;
const op = (o: 'add' | 'sub' | 'mul' | 'div') => (a: GameAction) => a.type === 'insertOp' && a.op === o;

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'target',
    title: 'This is your target',
    body: 'The blueprint shows the number to build: 18. You win by making an equation that equals it exactly.',
    highlight: () => [],
  },
  {
    id: 'pieces',
    title: 'Five pieces',
    body: 'These are your numbers. Every one of them goes into the equation, and each is used exactly once.',
    highlight: () => [`piece:${S7}`, `piece:${S2}`, `piece:${S4}`, `piece:${S1}`, `piece:${S3}`],
  },
  {
    id: 'place-2',
    title: 'Place a piece',
    body: 'Tap the 2. It moves from the tray onto the bench.',
    highlight: () => [`piece:${S2}`],
    expects: piece(S2),
  },
  {
    id: 'plus',
    title: 'Add a tool',
    body: 'Now tap +.',
    highlight: () => ['op:add'],
    expects: op('add'),
  },
  {
    id: 'place-1',
    title: 'Keep building',
    body: 'Tap the 1. The line under the bench shows the value so far.',
    highlight: () => [`piece:${S1}`],
    expects: piece(S1),
  },
  {
    id: 'plus-again',
    title: 'Tools can repeat',
    body: 'You can use the same tool as often as you like. Tap + again…',
    highlight: () => ['op:add'],
    expects: op('add'),
  },
  {
    id: 'place-3',
    title: 'Three numbers, one expression',
    body: '…then tap the 3. Now the bench reads 2 + 1 + 3.',
    highlight: () => [`piece:${S3}`],
    expects: piece(S3),
  },
  {
    id: 'forge',
    title: 'Forge it',
    body: 'Tap Forge. The whole calculation fuses into one new piece.',
    highlight: () => ['forge'],
    expects: (a) => a.type === 'forge',
    done: (s) => !!forgedId(s),
  },
  {
    id: 'forged-explained',
    title: 'A piece with a memory',
    body: 'Your new 6 remembers it was made from 2 + 1 + 3. It is a single piece now: once you place it, it is spent. It can’t be copied or used twice.',
    highlight: () => ['forged'],
  },
  {
    id: 'place-7',
    title: 'Group by forging',
    body: 'Next, make 7 − 4. Tap the 7.',
    highlight: () => [`piece:${S7}`],
    expects: piece(S7),
  },
  {
    id: 'minus',
    title: 'Subtract',
    body: 'Tap −.',
    highlight: () => ['op:sub'],
    expects: op('sub'),
  },
  {
    id: 'place-4',
    title: 'Almost there',
    body: 'Tap the 4. The bench shows 3.',
    highlight: () => [`piece:${S4}`],
    expects: piece(S4),
  },
  {
    id: 'forge-again',
    title: 'Forge again',
    body: 'Tap Forge. 7 − 4 becomes a single 3, so it is worked out first. Forging is how you group things.',
    highlight: () => ['forge'],
    expects: (a) => a.type === 'forge',
    done: (s) => !!forgedWithValue(s, 3),
  },
  {
    id: 'use-3',
    title: 'Spend a forged piece',
    body: 'Tap your forged 3. It leaves the tray, because a piece can only be used once.',
    highlight: () => ['forged'],
    expects: (a, s) => a.type === 'insertPiece' && a.pieceId === forgedWithValue(s, 3),
  },
  {
    id: 'times',
    title: 'Multiply',
    body: 'Tap ×.',
    highlight: () => ['op:mul'],
    expects: op('mul'),
  },
  {
    id: 'use-forged',
    title: 'And the other one',
    body: 'Tap your forged 6.',
    highlight: () => ['forged'],
    expects: (a, s) => a.type === 'insertPiece' && a.pieceId === forgedWithValue(s, 6),
  },
  {
    id: 'undo',
    title: 'Changed your mind?',
    body: 'Mistakes cost nothing. Tap Undo to take back your last move.',
    highlight: () => ['undo'],
    expects: (a) => a.type === 'undo',
  },
  {
    id: 'redo-place',
    title: 'Put it back',
    body: 'The 6 is back in the tray. Tap it again to finish the equation.',
    highlight: () => ['forged'],
    expects: (a, s) => a.type === 'insertPiece' && a.pieceId === forgedWithValue(s, 6),
  },
  {
    id: 'check',
    title: 'Check your work',
    body: 'All five pieces are on the bench, so the Forge button has turned into Check. The bench shows 18. Tap Check.',
    highlight: () => ['check'],
    expects: (a) => a.type === 'check',
    done: (s) => s.status === 'solved',
  },
];

export const TUTORIAL_OUTRO = {
  title: 'You forged it!',
  body: 'The proof shows every original piece: (7 − 4) × (2 + 1 + 3) = 18. You never needed ÷, and that’s fine. Use whichever tools help. You can type a whole equation at once or forge parts along the way.',
};

/** Hint shown when the player taps something the current step isn't asking for. */
export const OFF_SCRIPT_HINT = 'Try the highlighted control. You’ll have free rein in a moment!';
