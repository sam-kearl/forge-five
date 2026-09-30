import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import {
  createGame,
  gameReducer,
  generatePuzzle,
  INITIAL_CONFIG,
  mixSeed,
  signatureOf,
  type GameAction,
  type GameState,
  type Puzzle,
  type PuzzleSignature,
} from '../../engine';
import { loadJson, saveJson, STORAGE_KEYS } from '../../services/storage';
import { useApp } from '../../state/AppContext';
import { recordDeal, recordSkip, recordSolve } from '../../state/model';
import { cuesFor } from './cues';

function isSavedGame(v: unknown): v is GameState {
  const g = v as GameState;
  return !!g && g.version === 1 && !!g.puzzle && Array.isArray(g.puzzle.sources) && !!g.snap && Array.isArray(g.snap.tray);
}

let seedCounter = 0;
const freshSeed = () => mixSeed(Date.now(), ++seedCounter, Math.floor(Math.random() * 0xffffffff));

function makePuzzle(recent: readonly PuzzleSignature[]): Puzzle {
  const { puzzle, report } = generatePuzzle({ seed: freshSeed(), recent });
  if (__DEV__ && report.tier > 0) console.log('[forge] puzzle generation relaxed', report);
  return puzzle;
}

/**
 * Owns the current puzzle: restores it after interruptions, persists every
 * change, preloads the next verified puzzle in the background, updates local
 * statistics and fires sound/haptic cues.
 */
export function useGameSession() {
  const { services, updateStats, cue } = useApp();
  const [state, setState] = useState<GameState | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const recentRef = useRef<PuzzleSignature[]>([]);
  const nextRef = useRef<Puzzle | null>(null);
  const countedSolve = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const persist = useCallback(
    (s: GameState, immediate = false) => {
      clearTimeout(saveTimer.current);
      const write = () => saveJson(services.storage, STORAGE_KEYS.game, { ...s, past: s.past.slice(-60), future: s.future.slice(0, 60) });
      if (immediate) write();
      else saveTimer.current = setTimeout(write, 250);
    },
    [services],
  );

  const preloadNext = useCallback(() => {
    // Defer so it never competes with an animation or a tap.
    setTimeout(() => {
      if (!nextRef.current) nextRef.current = makePuzzle(recentRef.current);
    }, 600);
  }, []);

  const startPuzzle = useCallback(
    (puzzle: Puzzle) => {
      const s = createGame(puzzle, Date.now());
      recentRef.current = [...recentRef.current, signatureOf(puzzle)].slice(-INITIAL_CONFIG.generator.recentMemory);
      saveJson(services.storage, STORAGE_KEYS.recent, recentRef.current);
      stateRef.current = s;
      setState(s);
      persist(s, true);
      updateStats(recordDeal);
      preloadNext();
    },
    [services, persist, updateStats, preloadNext],
  );

  // Restore or deal on first mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      recentRef.current = await loadJson<PuzzleSignature[]>(
        services.storage,
        STORAGE_KEYS.recent,
        [],
        Array.isArray as (v: unknown) => v is PuzzleSignature[],
      );
      const saved = await loadJson<GameState | null>(services.storage, STORAGE_KEYS.game, null);
      if (!alive) return;
      if (saved && isSavedGame(saved) && saved.status === 'playing') {
        stateRef.current = saved;
        setState(saved);
        preloadNext();
      } else {
        startPuzzle(makePuzzle(recentRef.current));
      }
    })();
    return () => {
      alive = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save immediately when the app goes to the background.
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st !== 'active' && stateRef.current) persist(stateRef.current, true);
    });
    return () => {
      sub.remove();
      clearTimeout(saveTimer.current);
    };
  }, [persist]);

  const dispatch = useCallback(
    (action: GameAction) => {
      const prev = stateRef.current;
      if (!prev) return;
      const next = gameReducer(prev, action);
      if (next === prev) return;
      stateRef.current = next;
      setState(next);
      persist(next, next.status === 'solved');
      const c = cuesFor(prev, next, action);
      cue(c.sound, c.haptic);
      if (
        next.status === 'solved' &&
        prev.status !== 'solved' &&
        next.solution &&
        countedSolve.current !== next.puzzle.id + next.play.startedAt
      ) {
        countedSolve.current = next.puzzle.id + next.play.startedAt;
        const solution = next.solution;
        updateStats((s) => recordSolve(s, solution, next.play, Date.now()));
      }
    },
    [persist, cue, updateStats],
  );

  const nextPuzzle = useCallback(() => {
    const cur = stateRef.current;
    if (cur && cur.status === 'playing' && cur.play.moves > 0) updateStats(recordSkip);
    const p = nextRef.current ?? makePuzzle(recentRef.current);
    nextRef.current = null;
    startPuzzle(p);
  }, [startPuzzle, updateStats]);

  return { state, dispatch, nextPuzzle };
}
