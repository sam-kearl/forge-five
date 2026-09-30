import { applyOp, OPS } from '../arithmetic';
import { INITIAL_CONFIG, type RuleSet } from '../config';
import type { Expr } from '../expr';
import { parseTokens } from '../parse';
import { pieceExpr, sourcePiece, type SourcePiece } from '../pieces';
import * as R from '../rational';
import { tokensFromText } from '../text';

export const RULES = INITIAL_CONFIG.rules;

export function mkSources(values: number[]): SourcePiece[] {
  return values.map((v, i) => sourcePiece(`s${i}`, R.int(v)));
}

/** Parse text like "(8 + 4) × 3" against the given source pieces. Throws on failure. */
export function exprOf(text: string, sources: SourcePiece[]): Expr {
  const t = tokensFromText(
    text,
    sources.map((s) => ({ pieceId: s.id, value: s.value })),
  );
  if (!t.ok) throw new Error(`tokenize failed: ${JSON.stringify(t.error)}`);
  const byId = new Map(sources.map((s) => [s.id, s]));
  const p = parseTokens(t.tokens, (id) => {
    const s = byId.get(id);
    return s && pieceExpr(s);
  });
  if (!p.ok) throw new Error(`parse failed: ${JSON.stringify(p.error)}`);
  return p.expr;
}

/**
 * Independent reference solver used only in tests. It uses a different model
 * from the production solver: repeatedly pick any two remaining values, replace
 * them with a legal result, until one value remains. Memoised on the sorted
 * multiset of values. Returns every final value reachable.
 */
export function referenceReachable(values: number[], rules: RuleSet = RULES): Set<string> {
  const memo = new Map<string, Set<string>>();
  const go = (vals: R.Rational[]): Set<string> => {
    const key = vals.map(R.key).sort().join(',');
    const hit = memo.get(key);
    if (hit) return hit;
    const out = new Set<string>();
    if (vals.length === 1) out.add(R.key(vals[0]));
    else {
      for (let i = 0; i < vals.length; i++) {
        for (let j = 0; j < vals.length; j++) {
          if (i === j) continue;
          const rest = vals.filter((_, k) => k !== i && k !== j);
          for (const op of OPS) {
            const r = applyOp(op, vals[i], vals[j], rules);
            if (!r.ok) continue;
            for (const v of go([...rest, r.value])) out.add(v);
          }
        }
      }
    }
    memo.set(key, out);
    return out;
  };
  return go(values.map((v) => R.int(v)));
}

/** Small deterministic PRNG for test data (independent of the engine's rng). */
export function testRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
