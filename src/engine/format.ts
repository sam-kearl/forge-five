import { isCommutative, OP_SYMBOL, PRECEDENCE } from './arithmetic';
import type { Expr } from './expr';
import * as R from './rational';

/** Typographic form of a value: real minus sign, fraction slash. */
export function formatValue(v: R.Rational): string {
  const s = R.toString(v);
  return s.replace('-', '−');
}

/**
 * Does `child`, sitting on the given side of an operation `parentOp`, need parentheses?
 *
 * Parentheses are only omitted where re-parsing with normal precedence gives the
 * very same tree, or regroups a chain of one associative operation (a + (b + c)
 * → a + b + c; a × (b × c) → a × b × c). Regrouping such a chain never changes
 * the value and never introduces a fractional or negative step.
 */
export function needsParens(parent: Expr, child: Expr, side: 'left' | 'right'): boolean {
  if (parent.kind !== 'op' || child.kind !== 'op') return false;
  const pp = PRECEDENCE[parent.op];
  const cp = PRECEDENCE[child.op];
  if (cp < pp) return true;
  if (side === 'left' || cp > pp) return false;
  return !(child.op === parent.op && isCommutative(parent.op));
}

export interface FormatOptions {
  /** Render leaves with this function instead of their value (e.g. for markup). */
  leaf?: (e: Extract<Expr, { kind: 'leaf' }>) => string;
}

export function formatExpr(expr: Expr, opts: FormatOptions = {}): string {
  if (expr.kind === 'leaf') return opts.leaf ? opts.leaf(expr) : formatValue(expr.value);
  const wrap = (child: Expr, side: 'left' | 'right') => {
    const s = formatExpr(child, opts);
    return needsParens(expr, child, side) ? `(${s})` : s;
  };
  return `${wrap(expr.left, 'left')} ${OP_SYMBOL[expr.op]} ${wrap(expr.right, 'right')}`;
}
