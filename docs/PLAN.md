# Forge Five — Implementation Plan

This document is the design record required by §25 of the product specification.
The specification is authoritative; this file records how it is being implemented
and which assumptions were made where the specification leaves room.

## 1. The product in one paragraph

Forge Five is a free, offline, privacy-minimal arithmetic puzzle for iOS first,
Android in parallel and the web later. Each puzzle deals five numbered pieces
(1–25) and a target (1–25). The player builds one equation that uses every piece
exactly once with `+ − × ÷` and parentheses. Operations may repeat or go unused.
Every step of the calculation must be a whole number of zero or more. Players can
type out a long expression, or "forge" part of it into a new single piece that
remembers exactly what it is made of and can be spent once later. Every puzzle
shown has been proven solvable by an exhaustive solver before it appears. There
are no accounts, no servers, no difficulty picker, and advertising is a mock
behind an interface until a compliant provider is chosen.

## 2. Ambiguities and the decisions taken

| # | Question | Decision |
|---|----------|----------|
| A1 | Rule 7 (normal precedence) combined with rule 12 (every intermediate is a non-negative whole number). What are the "intermediates" of `8 − 10 + 5`? | The intermediates are the nodes of the standard parse tree (× ÷ before + −, left to right within a level). `8 − 10 + 5` parses as `(8 − 10) + 5`, so it is rejected with the message that `8 − 10` goes below zero. The player can write `8 + 5 − 10` instead. The solver works on the same trees, so the rules are enforced the same way everywhere. |
| A2 | Showing a solver proof: printing the fewest parentheses can quietly change the tree (`a + (b − c)` prints as `a + b − c`). | The formatter only drops parentheses where re-parsing gives the same value and still produces a valid tree. A round-trip test checks this for every generated solution. |
| A3 | "Forge selected subexpression" vs "forge it into 14 and use it later". | Both are supported. With a selection, Forge replaces the selected tokens in place with one forged piece. With nothing selected, Forge turns the whole bench into a piece in the tray and clears the bench. |
| A4 | What does **Clear** reset? | Clear takes everything off the bench and breaks every forged piece back into its original numbers, returning all five source pieces to the tray (spec §21: "Clearing restores all source pieces"). It can be undone. Separately, a single forged piece in the tray can be broken apart. |
| A5 | Submitting. | **Check** evaluates the bench. It needs every live piece on the bench (an empty tray). As a convenience, if the bench is empty and the tray holds exactly one forged piece containing all five numbers, that piece is checked. |
| A6 | Should the solver cap intermediate size? | No. The rules don't cap values, so the solver is exhaustive without a cap (5 numbers ≤ 25 cannot exceed 25⁵ ≈ 9.8 M, which is safe in exact integer arithmetic). Only the **generator's quality filter** rejects puzzles whose easiest solution needs large intermediates. |
| A7 | Drag interactions. | Every action works by tapping (required for accessibility). A drag-to-bench gesture is optional polish and is scheduled after tap play is complete. "Rearrange" is done with the cursor, selection, remove and re-insert, plus reordering in the tray. |
| A8 | Submit vs Forge naming. | Two different verbs keep them apart: **Forge** (fuse part of the equation into a piece) and **Check** (submit). |
| A9 | Parental gate. | It is a replaceable component. The first version asks a written-out question in words that young children are unlikely to answer. It is flagged for policy review, because arithmetic is not an ideal gate in a math game (see `docs/REVIEW_ITEMS.md`). |
| A11 | Bracket and cursor keys (product decision, 2026-10-04). | The ( ) and ◀ ▶ keys were removed to simplify the tool area. Grouping is done by forging a selection or the bench, which can express every tree, so every puzzle stays solvable. The engine still parses brackets (proofs print them), and the tutorial teaches grouping by forging. |
| A12 | One action button (product decision, 2026-10-04). | Forge and Check are merged: the button forges a selection, or forges the bench while pieces remain in the tray, and becomes **Check** once every piece is on the bench (`primaryAction` in `game.ts`). Routine confirmations (forged, undone, cleared) are announced to screen readers but no longer shown on screen. |
| A13 | Levels (product decision, 2026-10-04; supersedes the original single-experience rule). | Levels are number ranges for pieces and answers, defined in one list (`src/engine/levels.ts`). Level 1 is 1–12; Level 2 is today's 1–25 until the full list is decided. Players choose freely on the home screen, the level shows in the play header, and puzzle ids encode it (`F5-L1-…`). Rules and quality settings are shared across levels. |
| A10 | Number type. | The engine uses an exact `Rational` (numerator/denominator of safe integers). Under the initial rules every value is a whole number (denominator 1). Fractions and negatives are rule flags in the central config, so no solver rewrite is needed later. |

## 3. Milestones

1. **Engine core**: rationals, rule-checked arithmetic, expression trees, tokens and parser, formatter, pieces and provenance, the exhaustive solver with an independent brute-force cross-check, and tests.
2. **Generator and quality**: seeded PRNG, the original number distribution, constructive and validated-random generation, the quality evaluator, rejection logging, and tests.
3. **Playable workbench**: the game reducer (insert, cursor, select, forge, break apart, undo/redo, clear, check), plus a minimal screen.
4. **Design system**: tokens, fonts, pieces, blueprint target, bench and tool components.
5. **Tutorial, settings, stats, persistence**.
6. **Accessibility pass**.
7. **Motion, sound, haptics** (original synthesized sounds, reduced-motion paths).
8. **Ads and purchases**: interfaces, mocks, parental gate, restore.
9–12. **iOS, Android and web verification, release docs**.

## 4. Project structure

```
src/
  app/                    Expo Router screens only (thin)
  engine/                 Pure TypeScript. No React / RN / Expo imports.
    rational.ts           exact numbers
    config.ts             single source of truth for ranges and rules
    arithmetic.ts         rule-checked binary operations
    expr.ts               expression tree types and helpers
    format.ts             tree → text with minimal safe parentheses
    tokens.ts parse.ts    workbench token list → tree (precedence climbing)
    text.ts               text → tokens (keyboard / tests), no constants allowed
    pieces.ts             source and forged pieces, provenance
    validate.ts           full-solution validation against a puzzle
    solver.ts             exhaustive subset-DP solver and solution enumeration
    canonical.ts          commutative/associative normal form for dedup
    rng.ts                seeded PRNG
    distribution.ts       original weighted number distribution
    generator.ts          verified puzzle generation
    quality.ts            puzzle quality metrics and acceptance
    game.ts               game state and reducer (all moves, undo/redo)
    describe.ts           plain-language and screen-reader descriptions
  ui/                     design tokens and reusable components
  features/               game board, tutorial, stats, settings logic
  services/               AdService, PurchaseService, StorageService, SoundService, HapticsService
  state/                  React contexts (settings, stats, services)
docs/                     plan, licenses, privacy, review items, release checklist
scripts/                  sound synthesis, puzzle-distribution report
```

## 5. Engine interfaces (abridged)

```ts
type Op = 'add' | 'sub' | 'mul' | 'div';
interface Rational { readonly num: number; readonly den: number }   // den > 0, reduced

interface RuleSet { allowNegativeIntermediates: boolean; allowFractionalIntermediates: boolean }

type SourceId = `s${0|1|2|3|4}`;
type Expr =
  | { kind: 'leaf'; sourceId: SourceId; value: Rational }
  | { kind: 'op'; op: Op; left: Expr; right: Expr };

interface SourcePiece { id: SourceId; kind: 'source'; value: Rational; slot: number }
interface ForgedPiece { id: string; kind: 'forged'; value: Rational; expr: Expr; sourceIds: SourceId[] }

interface Puzzle { id: string; seed: number; target: number; sources: SourcePiece[]; witness: Expr; metrics: QualityMetrics }

solve(values, target, rules) → { solvable, witness?: Expr }
enumerateSolutions(sources, target, rules, limit) → Expr[]   // distinct up to commutativity/associativity
generatePuzzle(seed, config, options) → { puzzle, log }
gameReducer(state, action) → state
```

## 6. Identity and provenance

* Each source piece gets a permanent id `s0…s4`, assigned before the display shuffle. Two `6`s are `s1` and `s3`. The UI, accessibility labels ("six, second of two") and the reducer all use ids and never face values.
* A piece is always in exactly one place: the **tray**, the **bench**, or **inside a forged piece** (consumed). The reducer keeps this invariant, and `assertInvariants` checks it in tests after every move.
* A forged piece stores its expression tree, whose leaves are source ids, its exact value, and its sorted `sourceIds`. Forged pieces nest, and the tree is expanded when a forged piece is used. A final proof is therefore always a tree whose leaves map one-to-one onto `s0…s4`.
* Undo and redo are whole-state snapshots of pieces, tray, bench and cursor, so they can never resurrect a consumed piece or duplicate one.

## 7. Enforcing the whole-number, non-negative rules

All arithmetic goes through `applyOp(op, a, b, rules)`, which returns either a value or a typed violation: `divide-by-zero`, `fraction`, `negative` or `overflow`. The parser builds a tree, and evaluation checks **every** node bottom-up, reporting the first failing node with its operands so the message can be specific ("`3 ÷ 2` doesn't come out whole"). The solver and generator call the same `applyOp`, so the rules are identical everywhere.

## 8. The solver

The solver is an exhaustive dynamic program over subsets of piece identities:

* `reach(S)` is a map from each value to one witness tree, for every non-empty subset `S` of the five ids (31 subsets).
* Singletons hold their own value. For larger `S`, every split into non-empty `A | B` and every operation is combined in both orders (`A op B` and `B op A`), and `applyOp` filters each result. Every binary tree over the leaves of `S` has a root that splits its leaves into a left set and a right set, so this covers every tree shape, ordering and grouping.
* Safe deduplication: values are keyed exactly, and splits whose face-value multisets were already processed for this `S` are skipped (two `6`s give identical value sets).
* `solve` returns the witness for the target. `enumerateSolutions` walks top-down using `reach` to prune, then canonicalizes each tree (flattening `+`/`−` chains and `×`/`÷` chains into sorted forms) to count genuinely distinct solutions.
* A separate brute-force reference solver (repeatedly pick two items, combine, recurse; no memoization) lives in the tests and cross-checks `solve` on thousands of seeded random instances.

## 9. The generator

1. Draw five numbers from the original weighted distribution (`distribution.ts`), with at most two copies of any value.
2. **Constructive** (default): pick one of the 14 five-leaf tree shapes and a random leaf order. Bottom-up, choose an operation (weighted) among those that stay legal for the actual child values. Reject if nothing is legal, an intermediate exceeds `maxConstructionIntermediate`, or the root is outside 1–25.
   **Validated random** (fraction of attempts): draw a target from the target distribution and ask the solver.
3. Run the solver independently on the values and target. It must confirm a solution.
4. Run the quality evaluator. It rejects trivial, too large or too tedious puzzles, and puzzles too similar to recently seen ones. Every rejection reason is counted.
5. Shuffle the display order and keep the witness and the enumerated-solution summary.
6. Safeguards: an attempt budget, then progressive relaxation of the quality thresholds, then a small built-in list of hand-made, test-verified fallback puzzles. Generation can never loop forever.
7. Determinism: everything flows from one 32-bit seed through `sfc32`, so a puzzle id encodes its seed.

## 10. Design system (initial)

"Creative workshop", not a smithy. The identity comes from a **heat scale** that tells the story of a piece:

| Role | Token | Hex |
|---|---|---|
| Night background | `ink` | `#161B24` |
| Panel steel | `steel` / `steelHi` | `#262F3D` / `#35404F` |
| Blueprint (target) | `blueprint` / `blueprintLine` | `#15406A` / `#6FB2E8` |
| Cool: available | `coolant` | `#2EC4B6` |
| Warm: selected / cursor | `ember` | `#FFB03B` |
| Hot: forging | `flux` | `#FF6A3D` |
| Done: forged / solved | `brass` | `#E9C46A` |
| Bench surface | `ceramic` / `ceramicEdge` | `#F5F0E6` / `#D9CFBD` |
| Message: gentle issue | `quench` | `#7A6CF0` (always paired with an icon and text) |

* Source pieces are **hex-nut components**: ceramic faces with a coolant rim. Selected pieces warm to ember. Forged pieces are brass-plated and show their recipe underneath. Used pieces leave a dashed "socket" outline in the tray.
* The target is a **blueprint card** with grid lines and dimension marks, labelled "SPEC".
* Operators are steel tool keys carrying large standard symbols (`+ − × ÷`). The clear (trash) key is red.
* A solve ends with a round brass **seal stamp**.
* Typeface: **Lexend** (SIL OFL 1.1). It is geometric and was designed for reading ease, with clearly different 1/7 and 6/9, and tabular figures.
