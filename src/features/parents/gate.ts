/**
 * Parental gate logic (pure, tested). An adult must read three digits written
 * as words and enter them on a keypad. It deliberately avoids arithmetic,
 * which the game's own players are good at. The approach must be reviewed
 * against current Apple Kids Category and Google Play Families guidance before
 * release (see docs/REVIEW_ITEMS.md); the UI component is replaceable.
 */

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export interface GateChallenge {
  digits: number[];
  prompt: string;
}

export function createChallenge(random: () => number = Math.random): GateChallenge {
  const digits: number[] = [];
  while (digits.length < 3) {
    const d = Math.floor(random() * 10);
    if (!digits.includes(d)) digits.push(d);
  }
  return { digits, prompt: digits.map((d) => WORDS[d]).join(', ') };
}

export const MAX_ATTEMPTS = 3;
export const LOCKOUT_MS = 30_000;

export interface GateState {
  challenge: GateChallenge;
  entered: number[];
  failures: number;
  lockedUntil: number | null;
  passed: boolean;
}

export const initialGate = (random?: () => number): GateState => ({
  challenge: createChallenge(random),
  entered: [],
  failures: 0,
  lockedUntil: null,
  passed: false,
});

export function pressDigit(s: GateState, d: number, now: number, random?: () => number): GateState {
  if (s.passed || (s.lockedUntil !== null && now < s.lockedUntil)) return s;
  const entered = [...s.entered, d];
  if (entered.length < s.challenge.digits.length) return { ...s, entered, lockedUntil: null };
  const ok = entered.every((x, i) => x === s.challenge.digits[i]);
  if (ok) return { ...s, entered, passed: true };
  const failures = s.failures + 1;
  return {
    challenge: createChallenge(random),
    entered: [],
    failures: failures >= MAX_ATTEMPTS ? 0 : failures,
    lockedUntil: failures >= MAX_ATTEMPTS ? now + LOCKOUT_MS : null,
    passed: false,
  };
}
