import { leaf, sourceIdsOf, type Expr, type SourceId } from './expr';
import { formatExpr } from './format';
import type { Rational } from './rational';

export type PieceId = string;

/** One of the five original numbers. Its id never changes and is unique even for equal values. */
export interface SourcePiece {
  readonly kind: 'source';
  readonly id: SourceId;
  readonly value: Rational;
}

/**
 * A piece made by forging an expression. It carries its full provenance: the
 * exact tree (whose leaves are source ids), its value, and which sources it holds.
 */
export interface ForgedPiece {
  readonly kind: 'forged';
  readonly id: PieceId;
  readonly value: Rational;
  readonly expr: Expr;
  /** Sorted source ids contained, e.g. ["s0", "s2", "s4"]. */
  readonly sourceIds: readonly SourceId[];
  /** The ids of the pieces (source or forged) that were fused directly into this one. */
  readonly parts: readonly PieceId[];
}

export type Piece = SourcePiece | ForgedPiece;

export const sourcePiece = (id: SourceId, value: Rational): SourcePiece => ({ kind: 'source', id, value });

export function forgedPiece(id: PieceId, expr: Expr, value: Rational, parts: PieceId[]): ForgedPiece {
  return { kind: 'forged', id, value, expr, sourceIds: [...sourceIdsOf(expr)].sort(), parts };
}

/** The expression a piece stands for. Source pieces are single leaves; forged pieces expand fully. */
export const pieceExpr = (p: Piece): Expr => (p.kind === 'source' ? leaf(p.id, p.value) : p.expr);

export const pieceSourceIds = (p: Piece): readonly SourceId[] => (p.kind === 'source' ? [p.id] : p.sourceIds);

/** Human-readable recipe, e.g. "8 + 4 + 2". */
export const recipeOf = (p: ForgedPiece): string => formatExpr(p.expr);
