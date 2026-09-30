# Tutorial script (original copy)

Source of truth: `src/features/tutorial/script.ts`. It is tested end to end in `src/__tests__/app-logic.test.ts`.

**Puzzle:** pieces 7, 2, 4, 1, 3 → target **18**.
**Path taught:** forge `2 + 1 + 3 = 6`, then build `(7 − 4) × 6`.
**Concepts covered:** the target; five pieces used exactly once; placing pieces; tools; repeating a tool; multi-number expressions; forging; a forged piece's memory; forged pieces can't be duplicated; brackets; spending the forged piece; undo; check; the proof; unused tools are fine.

| # | Title | Coaching line | Waits for |
|---|---|---|---|
| 1 | This is your target | The blueprint shows the number to build: 18. You win by making an equation that equals it exactly. | Next |
| 2 | Five pieces | These are your numbers. Every one of them goes into the equation, and each is used exactly once. | Next |
| 3 | Place a piece | Tap the 2. It moves from the tray onto the bench. | tap 2 |
| 4 | Add a tool | Now tap +. | + |
| 5 | Keep building | Tap the 1. The line under the bench shows the value so far. | tap 1 |
| 6 | Tools can repeat | You can use the same tool as often as you like. Tap + again… | + |
| 7 | Three numbers, one expression | …then tap the 3. Now the bench reads 2 + 1 + 3. | tap 3 |
| 8 | Forge it | Tap Forge. The whole calculation fuses into one new piece. | Forge |
| 9 | A piece with a memory | Your new 6 remembers it was made from 2 + 1 + 3. It is a single piece now: once you place it, it is spent. It can't be copied or used twice. | Next |
| 10 | Brackets group things | Next, build (7 − 4). Start by tapping ( . | ( |
| 11 | Inside the brackets | Tap the 7. | tap 7 |
| 12 | Subtract | Tap −. | − |
| 13 | Almost closed | Tap the 4. | tap 4 |
| 14 | Close the bracket | Tap ) . The brackets make 7 − 4 happen first, giving 3. | ) |
| 15 | Multiply | Tap ×. | × |
| 16 | Spend your forged piece | Tap your forged 6. It leaves the tray, because it can only be used once. | tap forged 6 |
| 17 | Changed your mind? | Mistakes cost nothing. Tap Undo to take back your last move. | Undo |
| 18 | Put it back | The 6 is back in the tray. Tap it again to finish the equation. | tap forged 6 |
| 19 | Check your work | All five pieces are in: 7, 4, 2, 1 and 3. The bench shows 18. Tap Check. | Check |
| — | **You forged it!** | The proof shows every original piece: (7 − 4) × (2 + 1 + 3) = 18. You never needed ÷, and that's fine. Use whichever tools help. You can type a whole equation at once or forge parts along the way. | Start playing |

**Off-script hint:** "Try the highlighted control. You'll have free rein in a moment!"

The highlighted control gets an ember outline. Other input is blocked, with the hint and a soft sound. Every step is announced to screen readers. "Skip" is always available, and solving the tutorial puzzle marks the tutorial as complete.
