import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { createGame, createSolver, gameReducer, INITIAL_CONFIG, Rational, sourcePiece, type GameState, type Puzzle } from '../engine';
import { GameBoard } from '../features/game/GameBoard';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

function puzzleOf(values: number[], target: number): Puzzle {
  const sources = values.map((v, i) => sourcePiece(`s${i}`, Rational.int(v)));
  const witness = createSolver(sources, INITIAL_CONFIG.rules).solve(Rational.int(target))!;
  return {
    id: 'F5-test',
    seed: 1,
    target,
    sources,
    witness,
    easiest: witness,
    strategy: 'constructive',
    metrics: {
      distinctSolutions: 1,
      solutionCountCapped: false,
      easiestEffort: 5,
      easiestMaxIntermediate: 10,
      witnessMaxIntermediate: 10,
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

function Harness({ initial, onState }: { initial: GameState; onState?: (s: GameState) => void }) {
  const [s, setS] = useState(initial);
  return (
    <GameBoard
      state={s}
      reduceMotion
      dispatch={(a) =>
        setS((prev) => {
          const next = gameReducer(prev, a);
          onState?.(next);
          return next;
        })
      }
    />
  );
}

describe('GameBoard accessibility and tap-only play', () => {
  it('announces the target and gives duplicate pieces distinct labels', async () => {
    await render(<Harness initial={createGame(puzzleOf([6, 6, 2, 3, 1], 18), 0)} />);
    expect(screen.getByLabelText('Target: 18')).toBeTruthy();
    expect(screen.getByLabelText('6, piece 1 of 5, one of 2 6s')).toBeTruthy();
    expect(screen.getByLabelText('6, piece 2 of 5, one of 2 6s')).toBeTruthy();
    expect(screen.getByLabelText('2, piece 3 of 5')).toBeTruthy();
  });

  it('can be solved entirely by tapping, and describes the equation for screen readers', async () => {
    let last: GameState | null = null;
    await render(<Harness initial={createGame(puzzleOf([8, 4, 2, 3, 6], 36), 0)} onState={(s) => (last = s)} />);
    const tap = (id: string) => fireEvent.press(screen.getByTestId(id));
    await tap('key-lparen');
    await tap('tray-s0');
    await tap('key-add');
    await tap('tray-s1');
    await tap('key-add');
    await tap('tray-s2');
    await tap('key-rparen');
    await tap('key-mul');
    await tap('tray-s3');
    // Consumed pieces are announced as in use.
    expect(screen.getByLabelText('8, piece 1 of 5, in the equation')).toBeTruthy();
    expect(screen.getByText('= 42')).toBeTruthy();
    expect(screen.getByLabelText(/Equation: open bracket 8 plus 4 plus 2 close bracket times 3\. Current value 42\./)).toBeTruthy();
    await tap('key-sub');
    await tap('tray-s4');
    await tap('key-check');
    expect(last!.status).toBe('solved');
  });

  it('forges a subexpression and exposes its provenance', async () => {
    await render(<Harness initial={createGame(puzzleOf([8, 4, 2, 3, 6], 36), 0)} />);
    const tap = (id: string) => fireEvent.press(screen.getByTestId(id));
    await tap('tray-s0');
    await tap('key-add');
    await tap('tray-s1');
    await tap('key-forge');
    expect(screen.getByLabelText('Forged 12, made from 8 plus 4')).toBeTruthy();
    expect(screen.getByLabelText('Break apart forged 12')).toBeTruthy();
    expect(screen.getByText('Forged 12 from 8 + 4.')).toBeTruthy();
  });

  it('explains invalid steps in words', async () => {
    await render(<Harness initial={createGame(puzzleOf([8, 4, 2, 3, 6], 36), 0)} />);
    const tap = (id: string) => fireEvent.press(screen.getByTestId(id));
    await tap('tray-s2');
    await tap('key-sub');
    await tap('tray-s0');
    expect(screen.getByText(/2 − 8 would drop below zero/)).toBeTruthy();
  });
});
