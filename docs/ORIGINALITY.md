# Original product and design decisions

This file records what was designed specifically for Forge Five, to support originality review (see REVIEW_ITEMS.md). No rulebook, card design, artwork, sound, puzzle collection or code from any other arithmetic game was consulted or reused.

## Game design

- **Rules wording.** Written from scratch for this product (spec §5). The in-app explanation is the tutorial script in `src/features/tutorial/script.ts`.
- **Flexible workbench.** Players type full expressions with precedence and brackets, or select any balanced run of the equation and *forge* it in place into a single piece. A forged piece can also be broken apart again from the tray.
- **Provenance.** Forged pieces carry their full expression tree, so the final proof always shows every original number.
- **Heat-scale piece states.** Cool (available), warm (selected), hot (forging), brass (forged / solved).
- **Feedback tone.** A wrong total is information, not failure: "So close! Your equation makes 17, and the target is 18."

## Puzzle generation

- **Source distribution.** Designed for Forge Five and documented in `src/engine/config.ts`. 2–10 are weighted heavily; 1 moderately; highly composite teens and twenties taper slowly; primes above 12 taper fastest. At most two copies of any value.
- **Target distribution.** Acceptance weights flatten the natural bias of construction toward small results.
- **Constructive generator.** Random tree shape (one of 14), random leaf order, and operations chosen from those that are legal for the actual operand values.
- **Quality model.** An original effort heuristic (operation type, operand size, and the cost of holding two partial results). It also rejects puzzles where the target merely echoes a piece, where the answer is just the sum of all five, where the only solutions need large intermediates, or that repeat a recent puzzle.

## Visual identity

- **Theme.** "Molten Foundry": a smithy at night, with cast iron, the forge fire glowing from below, rising embers and molten amber metal. This is generic imagery, drawn entirely in code. There are no weapons, characters, ingots, moulds or playing cards, and no art or layout is taken from another game (see REVIEW_ITEMS C5).
- **Pieces.** Iron hexagons with a hot orange rim. Forged pieces are molten amber with a heat glow that slowly throbs. Used pieces leave a dark, empty socket.
- **Target.** A riveted iron plate engraved "STRIKE THIS NUMBER", with the number glowing like hot metal.
- **Completion.** A toothed seal stamped "FORGED ✦ 5 ✦".
- **Logo.** Five hexagons (one molten, four iron) joined by dashed construction lines to a glowing assembly point.
- **Palette.** Cast iron (#0A0705 to #2B221C), the fire (#FF6014), the hot rim → ember → flux → molten amber heat scale, a red clear key, and a cool blue "quench" colour for gentle issues.
- **Type.** Barlow and Barlow Condensed (OFL), used unmodified.
- **Icons.** A custom 24-pixel line set drawn in code, including the hammer on the Forge button.

## Sound

All six cues are synthesised by `scripts/synth-sounds.js` from sine partials, filtered noise and envelopes: a ceramic tap, a tool click, a forge whoosh with a two-note chime, a descending undo pair, a soft cooling thunk, and a success arpeggio over a stamp thud.

## Statistics

"Your workshop": puzzles solved, day streak, best streak, fastest and average solve, pieces forged, and a **Toolbox** chart showing how many solutions used each operation, with a favourite tool.
