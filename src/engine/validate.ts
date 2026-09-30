import type { RuleSet } from './config';
import { evaluate, leaves, type EvalFailure, type Expr, type SourceId } from './expr';
import type { SourcePiece } from './pieces';
import * as R from './rational';

export type SolutionIssue =
  | { kind: 'unknown-number'; sourceId: SourceId; value: R.Rational } // a number that isn't one of the five pieces
  | { kind: 'wrong-value'; sourceId: SourceId } // leaf value doesn't match its piece
  | { kind: 'duplicate-source'; sourceId: SourceId; count: number }
  | { kind: 'missing-source'; sourceId: SourceId }
  | { kind: 'rule'; failure: EvalFailure }
  | { kind: 'wrong-result'; value: R.Rational; target: number };

export type SolutionCheck = { ok: true; value: R.Rational } | { ok: false; issues: SolutionIssue[]; value?: R.Rational };

/**
 * Full validation of a finished equation against a puzzle. Used for the
 * player's Check, for solver proofs, and in tests. It does not trust how the
 * tree was built: it re-derives piece usage from the leaves.
 */
export function validateSolution(expr: Expr, sources: readonly SourcePiece[], target: number, rules: RuleSet): SolutionCheck {
  const issues: SolutionIssue[] = [];
  const byId = new Map(sources.map((s) => [s.id, s]));
  const counts = new Map<SourceId, number>();
  for (const l of leaves(expr)) {
    const src = byId.get(l.sourceId);
    if (!src) {
      issues.push({ kind: 'unknown-number', sourceId: l.sourceId, value: l.value });
      continue;
    }
    if (!R.equals(src.value, l.value)) issues.push({ kind: 'wrong-value', sourceId: l.sourceId });
    counts.set(l.sourceId, (counts.get(l.sourceId) ?? 0) + 1);
  }
  for (const s of sources) {
    const c = counts.get(s.id) ?? 0;
    if (c === 0) issues.push({ kind: 'missing-source', sourceId: s.id });
    else if (c > 1) issues.push({ kind: 'duplicate-source', sourceId: s.id, count: c });
  }
  const ev = evaluate(expr, rules);
  if (!ev.ok) {
    issues.push({ kind: 'rule', failure: ev });
    return { ok: false, issues };
  }
  if (!R.equals(ev.value, R.int(target))) issues.push({ kind: 'wrong-result', value: ev.value, target });
  return issues.length ? { ok: false, issues, value: ev.value } : { ok: true, value: ev.value };
}
