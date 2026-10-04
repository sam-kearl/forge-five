# Forge Five design system

Tokens live in `src/ui/theme.ts`. Components live in `src/ui/`.

## Mood

A bright, clever workshop at night: blueprint paper, ceramic and brass components, controlled sparks. It should be warm and tactile, slightly magical, and welcoming to younger players without looking childish. The metaphor never gets in the way of the maths: standard symbols `+ − × ÷ ( )` are always large and plain.

## Colour: the heat scale

| Token | Hex | Role |
|---|---|---|
| `ink` | #161B24 | App background |
| `steel` / `steelHi` / `steelLine` | #262F3D / #35404F / #4A5668 | Panels, tool keys, borders |
| `blueprint` / `blueprintLine` | #15406A / #6FB2E8 | Target card |
| **`coolant`** | #2EC4B6 | *Cool*: available pieces, toggles |
| **`ember`** | #FFB03B | *Warm*: selection, cursor, focus, primary buttons |
| **`flux`** | #FF6A3D | *Hot*: the forge burst |
| **`brass`** | #E9C46A | *Done*: forged pieces, the Forge/Check button, the seal |
| `ceramic` / `ceramicEdge` / `ceramicShade` | #F5F0E6 / #D9CFBD / #E9E1D2 | Bench surface, piece faces |
| `graphite` | #1E2430 | Text on light surfaces |
| `mist` | #AEB8C7 | Secondary text on dark |
| `quench` / `quenchInk` | #9B8CFF / #4B3FB0 | Gentle "cooling" issue colour (always with an icon and words) |

State is **never shown by colour alone**:

- a selected token gets a thicker rim, corner ticks and an underline;
- a used piece becomes a dashed socket labelled "placed" or "forged";
- issues get an ⓘ icon plus a sentence;
- the matching readout includes "✓ matches the target".

Contrast targets (to verify with an audit): body text on ink ≥ 7:1 (chalk); `mist` on ink ≈ 8:1; graphite on ceramic ≥ 12:1; brass-ink on brass ≥ 7:1.

## Typography

**Lexend** (SIL OFL 1.1), weights 400–800. It is geometric, built for reading ease, and has clear 1/7 and 6/9 shapes. Numbers always use tabular figures.

| Style | Font | Size |
|---|---|---|
| Display / target | Lexend ExtraBold | 40–54 |
| Title | Lexend Bold | 24 |
| Body | Lexend Regular | 16 / 23 |
| Label (caps) | Lexend SemiBold | 11–12, tracking 1.4–2 |
| Piece numbers | Lexend Bold | scales with piece: 44% (1 digit), 38% (2), 30% (3+) |

Dynamic Type: UI text scales up to 1.3–1.6× (`maxFontSizeMultiplier`). Numbers inside pieces are fixed so they always fit the component. Fractions (future) will render as `7/2` in the same style.

## Components

| Component | File | Notes |
|---|---|---|
| `PieceShape` | ui/PieceShape.tsx | Hex-nut component. Looks: `source`, `forged`, `socket`. Optional `selected`, `hot`. |
| `TargetBlueprint` | ui/TargetBlueprint.tsx | The spec sheet. Accessible as "Target: N". |
| `Tap` | ui/controls.tsx | The only pressable primitive: 48 pt minimum, keyboard focus ring (web), pressed scale. |
| `ToolKey` | ui/controls.tsx | Steel or blueprint key, symbol or icon. Height scales with the layout. |
| `Button` | ui/controls.tsx | primary (ember) / forge (flux) / secondary / ghost |
| `Seal` | ui/Seal.tsx | Completion stamp |
| `Logo`, `Icon` | ui/ | Original artwork drawn in code |
| `GameBoard` | features/game/GameBoard.tsx | Target and equation (with messages in its grey readout strip) at the top; forged pieces, the five pieces and the tools anchored at the bottom so they never move while building. |
| `ProofPanel` | features/game/ProofPanel.tsx | Seal, proof, all-five checklist, time/forges/undos, next action |
| `AdSlot` | features/ads/AdSlot.tsx | Grey, dashed, labelled "Advertisement". Deliberately unlike any game element. |

## Layout

- **Phone portrait (primary).** A scrolling top area (target, tray, forged pieces, bench) with the tools anchored at the bottom. The target compacts when the screen height is under 760 pt.
- **Tablet.** The same column up to 640 pt wide. Pieces, bench tokens and keys scale by up to 1.3×.
- **Wide landscape (≥ 900 wide, landscape).** Two columns: target and tray on the left; bench and tools on the right.

## Motion (`motion` tokens)

| Moment | Full motion | Reduced motion |
|---|---|---|
| Piece or token appears | 110 ms scale-in with slight overshoot | Instant |
| Forge | 320 ms flux ring and 8 sparks | 260 ms brass glow fade |
| Invalid step | 3-swing shake, ±6 px, ~200 ms | None (message and icon only) |
| Solve | 360 ms seal stamp (scale 1.7 → 1, slight rotation) | Static seal |
| Screen transitions | Slide | None |

There are no flashing effects and nothing loops. Reduced motion follows the device setting by default, and can be forced on or off in Settings.

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
