/**
 * Development report: generate many puzzles and summarise speed, rejection
 * reasons and the resulting distributions. Use it to tune config.ts.
 *
 *   npx tsx scripts/puzzle-report.ts [count] [startSeed]
 */
declare const process: { argv: string[] };

import { INITIAL_CONFIG } from '../src/engine/config';
import { formatExpr } from '../src/engine/format';
import { generatePuzzle } from '../src/engine/generator';
import { signatureOf, type PuzzleSignature } from '../src/engine/puzzle';

const count = Number(process.argv[2] ?? 300);
const start = Number(process.argv[3] ?? 1);

const rejections: Record<string, number> = {};
const targets = new Map<number, number>();
const sources = new Map<number, number>();
const tiers = new Map<number, number>();
const strategies = new Map<string, number>();
const efforts: number[] = [];
const solutionCounts: number[] = [];
const times: number[] = [];
const attempts: number[] = [];
let requiresDiv = 0;
let requiresSub = 0;
let requiresMul = 0;
let targetInSources = 0;
const recent: PuzzleSignature[] = [];
const bump = <K>(m: Map<K, number>, k: K) => m.set(k, (m.get(k) ?? 0) + 1);

const samples: string[] = [];
for (let i = 0; i < count; i++) {
  const { puzzle, report } = generatePuzzle({ seed: start + i, recent });
  recent.push(signatureOf(puzzle));
  if (recent.length > INITIAL_CONFIG.generator.recentMemory) recent.shift();
  for (const [k, v] of Object.entries(report.rejections)) rejections[k] = (rejections[k] ?? 0) + (v ?? 0);
  bump(targets, puzzle.target);
  puzzle.sources.forEach((s) => bump(sources, s.value.num));
  bump(tiers, report.tier);
  bump(strategies, report.strategy);
  efforts.push(puzzle.metrics.easiestEffort);
  solutionCounts.push(puzzle.metrics.distinctSolutions);
  times.push(report.elapsedMs);
  attempts.push(report.attempts);
  if (puzzle.metrics.requiresDivision) requiresDiv++;
  if (puzzle.metrics.requiresSubtraction) requiresSub++;
  if (puzzle.metrics.requiresMultiplication) requiresMul++;
  if (puzzle.metrics.targetInSources) targetInSources++;
  if (i < 12) {
    samples.push(
      `${puzzle.id.padEnd(10)} [${puzzle.sources.map((s) => s.value.num).join(', ')}] → ${puzzle.target}` +
        `   easiest: ${formatExpr(puzzle.easiest)}  (effort ${puzzle.metrics.easiestEffort}, ${puzzle.metrics.distinctSolutions}${puzzle.metrics.solutionCountCapped ? '+' : ''} solutions)`,
    );
  }
}

const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))];
const pct = (n: number) => `${((100 * n) / count).toFixed(1)}%`;
const hist = (m: Map<number, number>, lo: number, hi: number) => {
  const max = Math.max(...m.values());
  const lines: string[] = [];
  for (let k = lo; k <= hi; k++) {
    const v = m.get(k) ?? 0;
    lines.push(`  ${String(k).padStart(2)} ${'█'.repeat(Math.round((30 * v) / max)).padEnd(30)} ${v}`);
  }
  return lines.join('\n');
};

console.log(`\nForge Five puzzle report — ${count} puzzles from seed ${start}\n`);
console.log(samples.join('\n'));
console.log(`\nTime per puzzle (ms): median ${q(times, 0.5)}, p90 ${q(times, 0.9)}, max ${Math.max(...times)}`);
console.log(`Attempts per puzzle: median ${q(attempts, 0.5)}, p90 ${q(attempts, 0.9)}, max ${Math.max(...attempts)}`);
console.log(`Tiers: ${[...tiers].map(([k, v]) => `${k}: ${v}`).join(', ')}`);
console.log(`Strategies: ${[...strategies].map(([k, v]) => `${k}: ${v}`).join(', ')}`);
console.log(`Easiest effort: p10 ${q(efforts, 0.1)}, median ${q(efforts, 0.5)}, p90 ${q(efforts, 0.9)}`);
console.log(`Distinct solutions: p10 ${q(solutionCounts, 0.1)}, median ${q(solutionCounts, 0.5)}, p90 ${q(solutionCounts, 0.9)}`);
console.log(
  `Requires ÷ ${pct(requiresDiv)}, requires − ${pct(requiresSub)}, requires × ${pct(requiresMul)}, target among pieces ${pct(targetInSources)}`,
);
console.log(`\nRejections (all attempts):`);
for (const [k, v] of Object.entries(rejections).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(22)} ${v}`);
console.log(`\nTargets:\n${hist(targets, 1, 25)}`);
console.log(`\nSource values:\n${hist(sources, 1, 25)}`);
