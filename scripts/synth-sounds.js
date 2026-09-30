/**
 * Synthesises Forge Five's original sound effects as small 16-bit mono WAV files.
 * Every sound is generated from sine waves, filtered noise and envelopes in this
 * script — no samples or third-party audio are used.
 *
 *   node scripts/synth-sounds.js
 */
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

function render(seconds, fn) {
  const n = Math.floor(seconds * RATE);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = fn(i / RATE, i);
  return buf;
}

/** Deterministic noise so the files are reproducible. */
function noise(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2147483648 - 1;
  };
}

const env = (t, attack, decay) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));
const sine = (f, t) => Math.sin(2 * Math.PI * f * t);

function writeWav(name, samples, gain = 0.8) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const scale = peak > 0 ? gain / peak : 0;
  const data = Buffer.alloc(samples.length * 2);
  // Short fade-out to avoid clicks at the end.
  const fade = Math.floor(0.004 * RATE);
  samples.forEach((s, i) => {
    const tail = samples.length - i < fade ? (samples.length - i) / fade : 1;
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * scale * tail)) * 32767), i * 2);
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([header, data]));
  console.log(`${name.padEnd(14)} ${(44 + data.length).toString().padStart(6)} bytes`);
}

fs.mkdirSync(OUT, { recursive: true });

// Tap: a small ceramic tick — two inharmonic partials with a very fast decay.
writeWav(
  'tap.wav',
  render(0.07, (t) => env(t, 0.001, 0.012) * (0.7 * sine(2100, t) + 0.3 * sine(3470, t))),
  0.45,
);

// Place operator: a softer, lower click.
writeWav(
  'tool.wav',
  render(0.06, (t) => env(t, 0.001, 0.01) * (0.8 * sine(1250, t) + 0.2 * sine(2610, t))),
  0.35,
);

// Forge: a filtered "whoosh" of warm noise followed by a bright two-note assembly chime.
{
  const rnd = noise(7);
  let lp = 0;
  writeWav(
    'forge.wav',
    render(0.42, (t) => {
      lp += 0.18 * (rnd() - lp);
      const whoosh = lp * env(t, 0.04, 0.05) * 1.6;
      const c1 = t > 0.07 ? env(t - 0.07, 0.002, 0.09) * (sine(880, t) + 0.35 * sine(1760 * 1.003, t)) : 0;
      const c2 = t > 0.13 ? env(t - 0.13, 0.002, 0.14) * (sine(1318.5, t) + 0.3 * sine(2637, t)) : 0;
      return whoosh + 0.55 * c1 + 0.5 * c2;
    }),
    0.6,
  );
}

// Undo: a gentle descending pair — the piece being taken back apart.
writeWav(
  'undo.wav',
  render(0.16, (t) => {
    const a = env(t, 0.002, 0.03) * sine(990, t);
    const b = t > 0.06 ? env(t - 0.06, 0.002, 0.04) * sine(740, t) : 0;
    return 0.6 * a + 0.6 * b;
  }),
  0.35,
);

// Invalid: a soft, low "cooling" thunk — never harsh or alarming.
{
  const rnd = noise(3);
  let lp = 0;
  writeWav(
    'invalid.wav',
    render(0.2, (t) => {
      lp += 0.05 * (rnd() - lp);
      const f = 210 - 60 * Math.min(1, t / 0.15);
      return env(t, 0.004, 0.05) * (sine(f, t) + 0.8 * lp);
    }),
    0.4,
  );
}

// Success: a rising, bell-like arpeggio with a final shimmer — the seal is stamped.
{
  const notes = [523.25, 659.25, 783.99, 1046.5];
  writeWav(
    'success.wav',
    render(1.1, (t) => {
      let s = 0;
      notes.forEach((f, k) => {
        const start = k * 0.085;
        if (t < start) return;
        const u = t - start;
        const e = env(u, 0.003, k === 3 ? 0.35 : 0.18);
        s += e * (sine(f, u) + 0.4 * sine(f * 2.01, u) + 0.15 * sine(f * 3.02, u));
      });
      // Stamp "thud" underneath the first note.
      s += 0.9 * env(t, 0.002, 0.03) * sine(140, t);
      return s;
    }),
    0.7,
  );
}
