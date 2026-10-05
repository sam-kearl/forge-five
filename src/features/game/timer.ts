/** The puzzle clock: whole seconds up to a minute, then m:ss. */
export function formatTimer(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  if (t < 60) return String(t);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** How a screen reader says the clock. */
export function spokenTimer(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (t < 60) return plural(t, 'second');
  return `${plural(Math.floor(t / 60), 'minute')} ${plural(t % 60, 'second')}`;
}
