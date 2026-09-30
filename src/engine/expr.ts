import { applyOp, type Op, type Violation } from './arithmetic';
import type { RuleSet } from './config';
import * as R from './rational';
import type { Rational } from './rational';

/** Permanent identity of one of the five original pieces: "s0" … "s4". */
export type SourceId = string;

export interface LeafExpr {
  readonly kind: 'leaf';
  readonly sourceId: SourceId;
  readonly value: Rational;
}

export interface OpExpr {
  readonly kind: 'op';
  readonly op: Op;
  readonly left: Expr;
  readonly right: Expr;
}

export type Expr = LeafExpr | OpExpr;

export const leaf = (sourceId: SourceId, value: Rational): LeafExpr => ({ kind: 'leaf', sourceId, value });
export const node = (op: Op, left: Expr, right: Expr): OpExpr => ({ kind: 'op', op, left, right });

export interface EvalFailure {
  ok: false;
  violation: Violation;
  /** The first (deepest, leftmost) node that broke a rule. */
  at: OpExpr;
  leftValue: Rational;
  rightValue: Rational;
}

export type EvalResult = { ok: true; value: Rational } | EvalFailure;

/** Evaluate bottom-up, checking every intermediate node against the rules. */
export function evaluate(expr: Expr, rules: RuleSet): EvalResult {
  if (expr.kind === 'leaf') return { ok: true, value: expr.value };
  const l = evaluate(expr.left, rules);
  if (!l.ok) return l;
  const r = evaluate(expr.right, rules);
  if (!r.ok) return r;
  const res = applyOp(expr.op, l.value, r.value, rules);
  if (!res.ok) return { ok: false, violation: res.violation, at: expr, leftValue: l.value, rightValue: r.value };
  return res;
}

export function leaves(expr: Expr, out: LeafExpr[] = []): LeafExpr[] {
  if (expr.kind === 'leaf') out.push(expr);
  else {
    leaves(expr.left, out);
    leaves(expr.right, out);
  }
  return out;
}

export const sourceIdsOf = (expr: Expr): SourceId[] => leaves(expr).map((l) => l.sourceId);

export function depth(expr: Expr): number {
  return expr.kind === 'leaf' ? 0 : 1 + Math.max(depth(expr.left), depth(expr.right));
}

export function opCount(expr: Expr): number {
  return expr.kind === 'leaf' ? 0 : 1 + opCount(expr.left) + opCount(expr.right);
}

/** Every intermediate (non-leaf) value, in evaluation order. Assumes the tree is valid. */
export function intermediateValues(expr: Expr, rules: RuleSet): Rational[] {
  const out: Rational[] = [];
  forEachStep(expr, rules, (_op, _a, _b, result) => out.push(result));
  return out;
}

/** Visit every operation node together with its operand values (post-order). */
export function forEachStep(
  expr: Expr,
  rules: RuleSet,
  visit: (op: Op, a: Rational, b: Rational, result: Rational, n: OpExpr) => void,
): Rational | null {
  if (expr.kind === 'leaf') return expr.value;
  const a = forEachStep(expr.left, rules, visit);
  const b = forEachStep(expr.right, rules, visit);
  if (a === null || b === null) return null;
  const res = applyOp(expr.op, a, b, rules);
  if (!res.ok) return null;
  visit(expr.op, a, b, res.value, expr);
  return res.value;
}

export function opsUsed(expr: Expr, out = new Set<Op>()): Set<Op> {
  if (expr.kind === 'op') {
    out.add(expr.op);
    opsUsed(expr.left, out);
    opsUsed(expr.right, out);
  }
  return out;
}

export function exprEquals(a: Expr, b: Expr): boolean {
  if (a.kind === 'leaf' || b.kind === 'leaf') {
    return a.kind === 'leaf' && b.kind === 'leaf' && a.sourceId === b.sourceId && R.equals(a.value, b.value);
  }
  return a.op === b.op && exprEquals(a.left, b.left) && exprEquals(a.right, b.right);
}
