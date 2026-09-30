/**
 * Pure models for locally stored settings and statistics. No React here, so
 * the persistence behaviour is unit-tested directly.
 */
import { opsUsed, type Expr, type Op, type PlayStats } from '../engine';

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type MotionPreference = 'system' | 'reduced' | 'full';

export interface Settings {
  version: 1;
  sound: boolean;
  haptics: boolean;
  motion: MotionPreference;
}

export const DEFAULT_SETTINGS: Settings = { version: 1, sound: true, haptics: true, motion: 'system' };

export function isSettings(v: unknown): v is Settings {
  const s = v as Settings;
  return (
    !!s &&
    s.version === 1 &&
    typeof s.sound === 'boolean' &&
    typeof s.haptics === 'boolean' &&
    (s.motion === 'system' || s.motion === 'reduced' || s.motion === 'full')
  );
}

export const shouldReduceMotion = (pref: MotionPreference, systemReduced: boolean) =>
  pref === 'reduced' || (pref === 'system' && systemReduced);

// ---------------------------------------------------------------------------
// Statistics (local only, never transmitted)
// ---------------------------------------------------------------------------

export interface Stats {
  version: 1;
  /** Puzzles completed. */
  solved: number;
  /** Puzzles dealt (started). */
  dealt: number;
  /** Puzzles the player moved on from without solving. */
  skipped: number;
  totalSolveMs: number;
  fastestMs: number | null;
  /** Total pieces forged across all puzzles. */
  forges: number;
  /** Solves that used at least one forged piece. */
  solvesWithForge: number;
  /** How many solutions used each tool at least once. */
  toolUse: Record<Op, number>;
  /** Consecutive local days with at least one solve. */
  dayStreak: number;
  bestDayStreak: number;
  /** Local calendar day (YYYY-MM-DD) of the most recent solve. */
  lastSolveDay: string | null;
}

export const EMPTY_STATS: Stats = {
  version: 1,
  solved: 0,
  dealt: 0,
  skipped: 0,
  totalSolveMs: 0,
  fastestMs: null,
  forges: 0,
  solvesWithForge: 0,
  toolUse: { add: 0, sub: 0, mul: 0, div: 0 },
  dayStreak: 0,
  bestDayStreak: 0,
  lastSolveDay: null,
};

export function isStats(v: unknown): v is Stats {
  const s = v as Stats;
  return !!s && s.version === 1 && typeof s.solved === 'number' && typeof s.dealt === 'number' && !!s.toolUse;
}

/** Local calendar day as YYYY-MM-DD. */
export function localDay(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dayDiff(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

export function recordDeal(s: Stats): Stats {
  return { ...s, dealt: s.dealt + 1 };
}

export function recordSkip(s: Stats): Stats {
  return { ...s, skipped: s.skipped + 1 };
}

export function recordSolve(s: Stats, solution: Expr, play: PlayStats, now: number, day = localDay(now)): Stats {
  const ms = Math.max(0, (play.solvedAt ?? now) - play.startedAt);
  const used = opsUsed(solution);
  const toolUse = { ...s.toolUse };
  used.forEach((op) => (toolUse[op] += 1));
  let dayStreak = s.dayStreak;
  if (s.lastSolveDay === null) dayStreak = 1;
  else {
    const gap = dayDiff(s.lastSolveDay, day);
    if (gap === 1) dayStreak += 1;
    else if (gap > 1 || gap < 0) dayStreak = 1; // clock moved backwards: start fresh rather than inflate
    // gap === 0: same day, unchanged
  }
  return {
    ...s,
    solved: s.solved + 1,
    totalSolveMs: s.totalSolveMs + ms,
    fastestMs: s.fastestMs === null ? ms : Math.min(s.fastestMs, ms),
    forges: s.forges + play.forges,
    solvesWithForge: s.solvesWithForge + (play.forges > 0 ? 1 : 0),
    toolUse,
    dayStreak,
    bestDayStreak: Math.max(s.bestDayStreak, dayStreak),
    lastSolveDay: day,
  };
}

/** The current streak as shown today (it lapses if yesterday had no solve). */
export function visibleStreak(s: Stats, today: string): number {
  if (!s.lastSolveDay) return 0;
  const gap = dayDiff(s.lastSolveDay, today);
  return gap <= 1 && gap >= 0 ? s.dayStreak : 0;
}

export function favouriteTool(s: Stats): Op | null {
  const entries = Object.entries(s.toolUse) as [Op, number][];
  const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[1] > 0 ? best[0] : null;
}

export function averageSolveMs(s: Stats): number | null {
  return s.solved ? Math.round(s.totalSolveMs / s.solved) : null;
}
