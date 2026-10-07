# Forge Five design system

Tokens live in `src/ui/theme.ts`. Components live in `src/ui/`.

## Mood

**Molten Foundry**: a smithy at night. Cast-iron surfaces, the forge fire glowing up from below the tools, a few embers drifting upward, and molten amber where pieces have been forged together. It should feel warm, weighty and a little dramatic without looking childish. The metaphor never gets in the way of the maths: standard symbols `+ − × ÷` are always large and plain.

Screen wording follows the theme: the target plate says "STRIKE THIS NUMBER", the bench is headed "FORGE YOUR EQUATION HERE", the tray is "PIECES" and the row of new pieces is "FORGED".

## Colour: the heat scale

| Token | Hex | Role |
|---|---|---|
| `ink` | #0A0705 | App background (the darkened smithy) |
| `steel` / `steelHi` / `steelLine` | #1C1612 / #2B221C / #3A2E26 | Iron panels, keys, borders |
| `ironTop` → `ironBottom`, `plateTop` → `plateBottom` | #2B221C → #191310, #221A15 → #130E0B | Key and plate gradients (`GradientFill`) |
| `fire` | #FF6014 | The forge glow behind the tools (`ForgeBackdrop`) |
| **`coolant`** (hot rim) | #FF8A2A → #7A2A0A | Available pieces: iron face, hot orange rim |
| **`ember`** | #FFB347 | Selection, cursor, focus, embers |
| **`flux`** | #FF6A2A | The forge burst |
| **`brass`** (molten amber) | #F7A93C, with #FFD889 / #C9661A | Forged pieces, the Forge/Check button, the seal |
| `blueprintLine` | #C99A72 | Engraved labels on iron ("STRIKE THIS NUMBER") |
| `timer` | #E9B884 | The puzzle clock |
| `chalk` / `mist` / `dim` | #F5E9DC / #A08F80 / #7E6E61 | Text, secondary text and quiet notes on iron |
| `danger` → `dangerDeep` | #B3261A → #7A160E | The clear key |
| `quench` / `quenchInk` | #8EC5FF / #2B4C8C | Cool "quenched" issue colour (always with an icon and words) |

State is **never shown by colour alone**:

- a selected token gets an ember outline, corner ticks and an underline;
- a used piece becomes a dark empty socket labelled "placed" or "forged";
- issues get an ⓘ icon plus a sentence;
- the matching readout includes "✓ matches the target".

Contrast targets (to verify with an audit): chalk on ink ≥ 15:1; `mist` on ink ≈ 6.5:1; brass-ink on molten amber ≥ 7:1; chalk on the piece face ≥ 10:1. Used-piece sockets are deliberately dim; their state is also given in words.

## Typography

**Barlow** for interface text and **Barlow Condensed** for numbers, headings and stamped labels (both SIL OFL 1.1). Barlow's slightly rounded industrial shapes suit the foundry theme, and the condensed cut keeps large numbers compact. Numbers always use tabular figures.

| Style | Font | Size |
|---|---|---|
| Target number | Barlow Condensed ExtraBold | 48–64 |
| Header, labels (caps) | Barlow Condensed Bold | 13–18, tracking 3–4 |
| Timer | Barlow Condensed Bold | 24 |
| Forge/Check button | Barlow Condensed ExtraBold | 24, tracking 3 |
| Body | Barlow Regular / Medium | 14–16 |
| Piece numbers | Barlow Condensed ExtraBold | scales with piece: 48% (1 digit), 44% (2), 38% (3+) |

Dynamic Type: UI text scales up to 1.3–1.6× (`maxFontSizeMultiplier`). Numbers inside pieces are fixed so they always fit the component. Fractions (future) will render as `7/2` in the same style.

## Components

| Component | File | Notes |
|---|---|---|
| `PieceShape` | ui/PieceShape.tsx | Iron hexagon with a solid hot-orange rim (`rim`, #E8702A). Looks: `source`, `forged` (molten amber with a heat glow; `pulse` makes it throb), `socket`. Optional `selected`, `hot`. |
| `TargetPlate` | ui/TargetPlate.tsx | Riveted iron plate, "STRIKE THIS NUMBER", glowing number. Accessible as "Target: N". |
| `ForgeBackdrop` | ui/ForgeBackdrop.tsx | Fire glow from below, a faint light from above and five rising embers. Behind every screen. |
| `GradientFill` | ui/GradientFill.tsx | Measured top-to-bottom SVG gradient for keys, buttons and the bench. |
| `Tap` | ui/controls.tsx | The only pressable primitive: 48 pt minimum, keyboard focus ring (web), pressed scale. |
| `ToolKey` | ui/controls.tsx | Iron key (or red `danger` for clear), symbol or icon. Height scales with the layout. |
| New button | app/play.tsx | Ghost amber pill; after one tap it turns molten amber and reads "Sure?" for 3 s. |
| `Button` | ui/controls.tsx | primary (molten amber) / forge (flux) / secondary (iron) / ghost |
| `Seal` | ui/Seal.tsx | Completion stamp |
| `Logo`, `Icon` | ui/ | Original artwork drawn in code. The Forge button shows a hammer striking with sparks; Check shows the seal. The older "two pieces into one" `forge` icon is still available. |
| `GameBoard` | features/game/GameBoard.tsx | Target plate, one-line equation with its two-line message strip, the reserved forged row above the five pieces, then the keys. Spare height is shared evenly between them (see Layout). |
| `ProofPanel` | features/game/ProofPanel.tsx | Seal, proof, all-five checklist, time/forges/undos, next action |
| `AdSlot` | features/ads/AdSlot.tsx | Grey, dashed, labelled "Advertisement". Deliberately unlike any game element. |

## Layout

One rule on every screen size. From top to bottom the sections are:
1. Header and timer.
2. Target plate (64 pt number on phones).
3. Equation: a 60 pt box plus a fixed two-line message strip.
4. Forged row and the five pieces.
5. Keys and the 50 pt Forge/Check button.

**Nothing moves while you play.** Every section has a fixed height:
- The equation is always one line. `fitBench` shrinks the hexagons, and the operators only if needed, so 5 pieces + 4 operators fit. That gives about 50 pt hexagons on an iPhone 17, with 4 pt gaps and 4 pt of padding inside the box.
- The message strip is always two lines tall. Messages are written to fit in about 64 characters, and a test enforces this.
- The forged row's space is always kept, even when empty. Forged pieces appear above the five pieces and never push them. At most two forged pieces can exist at once, and they share the row.

**Spare height is shared evenly** between the sections by flexible gaps. When there is none (small phones, large text), the screen scrolls instead. The layout uses the space the browser actually gives the page: on an iPhone 17 in Safari that is about 402 × 728 pt, and the crowded two-forged-pieces state still fits.

- **Phones:** one column.
- **Tablets:** the same column up to 640 pt wide. Pieces, text, keys and the target scale by up to 1.3×.
- **Wide landscape (≥ 900 wide):** two columns, each spaced the same way. Target and equation are on the left; forged row, pieces and keys are on the right.

## Motion (`motion` tokens)

| Moment | Full motion | Reduced motion |
|---|---|---|
| Piece or token appears | 110 ms scale-in with slight overshoot | Instant |
| Forge | 320 ms flux ring and 8 sparks | 260 ms brass glow fade |
| Invalid step | 3-swing shake, ±6 px, ~200 ms | None (message and icon only) |
| Solve | 360 ms seal stamp (scale 1.7 → 1, slight rotation) | Static seal |
| Screen transitions | Slide | None |
| Forge fire | Slow 3.2 s flicker of the glow | Static glow |
| Embers | Five embers rising over 5–8 s | Not drawn |
| Forged piece | Heat glow throbs over 2.4 s | Static glow |

There are no flashing effects: the only loops are the slow, low-contrast fire, ember and glow cycles above, and all of them stop with reduced motion. Reduced motion follows the device setting by default, and can be forced on or off in Settings.

## Puzzle clock

A number directly below the header shows the time spent on the current puzzle: whole seconds up to 59, then `m:ss`. It has no label on screen. Screen readers hear "Time on this puzzle: 1 minute 5 seconds". The clock counts **only active time**. It pauses when the app goes to the background or is closed, and when the player leaves the play screen. The time is saved with the game (`play.activeMs`) and resumes on return. Solve times in Stats and on the proof panel use the same active time.

Two more rules:
- **Frozen time doesn't count.** If the app's code is frozen for more than 15 seconds without being told it went to the background (a computer or simulator sleeping), that stretch is skipped.
- **Settings › Play › Show timer** hides the clock. It keeps counting while hidden, so Stats stay accurate.

## Sound and haptics

| Event | Sound | Haptic |
|---|---|---|
| Place a number | `tap`: ceramic tick | Selection |
| Place a tool | `tool`: soft click | Selection |
| Forge | `forge`: whoosh and chime | Medium impact |
| Undo, redo, delete, clear, break apart | `undo`: descending pair | Selection |
| Invalid step | `invalid`: soft thunk | Warning |
| Solved | `success`: arpeggio and stamp | Success |
| Wrong total on Check | `tool` only (information, not an error) | None |

Sound and haptics are independent toggles. Sound respects the iOS silent switch and mixes with other audio.

## Accessibility checklist built into components

- Every control has a label. Duplicate values are labelled by slot ("6, piece 2 of 5, one of 2 6s").
- The bench exposes the whole equation in words plus its current value.
- Forged pieces announce their recipe and offer a "Break apart" accessibility action.
- Feedback is announced (`announceForAccessibility`) and sits in polite live regions.
- Every action works by tapping. On web, the keyboard supports digits, `+ - * x /`, arrows, Backspace, Enter (the Forge/Check button), `f` (forge) and Ctrl/Cmd-Z (undo, with Shift for redo).
