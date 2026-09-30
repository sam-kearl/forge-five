/**
 * Deterministic pseudo-random numbers (sfc32 seeded through splitmix32).
 * Every generated puzzle can be reproduced exactly from its 32-bit seed.
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** Pick a key of a {value: weight} table, proportionally to weight. */
  weighted(table: Readonly<Record<number, number>>): number;
  /** Pick from items proportionally to weight(item). */
  weightedPick<T>(items: readonly T[], weight: (item: T) => number): T;
  shuffle<T>(items: readonly T[]): T[];
  chance(p: number): boolean;
  /** A fresh 32-bit seed derived from this stream. */
  seed(): number;
}

function splitmix32(a: number) {
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return t >>> 0;
  };
}

export function createRng(seed: number): Rng {
  const sm = splitmix32(seed >>> 0);
  let a = sm(),
    b = sm(),
    c = sm(),
    d = sm();
  const u32 = () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return t >>> 0;
  };
  for (let i = 0; i < 12; i++) u32();

  const next = () => u32() / 4294967296;
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => {
      if (items.length === 0) throw new RangeError('pick from empty list');
      return items[Math.floor(next() * items.length)];
    },
    weighted: (table) => {
      const keys = Object.keys(table).map(Number);
      return rng.weightedPick(keys, (k) => table[k]);
    },
    weightedPick: (items, weight) => {
      let total = 0;
      for (const it of items) total += Math.max(0, weight(it));
      if (total <= 0) throw new RangeError('weights sum to zero');
      let r = next() * total;
      for (const it of items) {
        r -= Math.max(0, weight(it));
        if (r < 0) return it;
      }
      return items[items.length - 1];
    },
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    chance: (p) => next() < p,
    seed: () => u32(),
  };
  return rng;
}

/** Mix arbitrary integers (e.g. time and a counter) into one 32-bit seed. */
export function mixSeed(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const p of parts) {
    let x = Math.floor(p) >>> 0;
    for (let i = 0; i < 4; i++) {
      h ^= x & 0xff;
      h = Math.imul(h, 0x01000193);
      x >>>= 8;
    }
    // Include the high part of large numbers such as Date.now().
    h ^= Math.floor(p / 4294967296) & 0xffff;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
