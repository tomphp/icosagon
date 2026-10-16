# Spec: Move highlight and Computer delay

Status: ready-for-agent

## Problem Statement

When a Move is made, the Board recolours at once. That makes it hard to see which Regions just changed hands, especially for the Computer's Move: it lands in the same instant as the Human's Move, so the Human never sees the Board between the two. Under the Award Ending, the awarded Region changes colour at the same moment as the 9th Move, so the Award is easy to miss and the Game Over result can seem to come out of nowhere.

## Solution

Purely visual; no game logic changes.

- After every Move, by a Human or the Computer, each Region the Move **Captured** flashes bright gold (fill `#ffd700`, 2px `#b8860b` border). The gold is an overlay on the Region's new colour and fades linearly to nothing over 500ms, so the Region crossfades from gold into its new colour.
- In a game against the Computer, the Computer waits 500ms before each of its Moves, including its opening Move as Red. Meanwhile the status reads "Computer to move". Leaving the game with Menu during the wait cancels the pending Move.
- When the game ends with an Award, the awarded Region keeps its old colour and the Score bar keeps the pre-Award Scores for 500ms after the 9th Move. Then the Region takes the stuck Player's colour and flashes gold in the same way, the Scores update, and Game Over appears. This applies in Human vs Human games too.
- After a 10th Move, or a 9th Move under Skip, Game Over appears straight away, with the last Move's highlight still fading underneath it.

## User Stories

1. As a Human, I want the Regions my Move Captured to flash gold, so that I can see what my Move won.
2. As a Human, I want the Regions the Computer's Move Captured to flash gold, so that I can see what the Computer just won from me.
3. As a Human in Human vs Human, I want each Move's Captured Regions to flash gold, so that both Players can follow the game.
4. As a Human, I want the gold to fade into the Region's new colour over 500ms, so that the flash draws the eye without hiding the Board for long.
5. As a Human, I want the flash to have a darker 2px gold border, so that neighbouring Captured Regions stay distinguishable.
6. As a Human, I want halves of my own Regions that I Split not to flash, so that only real gains are highlighted.
7. As a Human, I want the first Move to flash only the Mover's side, not the side that became the Opponent's, so that the flash always means "the Mover won this".
8. As a Human, I want the Computer to wait 500ms before making its Move, so that I can see my own Move land before the Computer replies.
9. As a Human, I want the Computer to wait 500ms before its opening Move as Red, so that the game doesn't start with a Move already made.
10. As a Human, I want the status to say "Computer to move" during the wait, so that I know whose Move it is.
11. As a Human, I want the Computer's name box highlighted as the Mover during the wait, so that the header matches the status.
12. As a Human, I want pressing Menu during the wait to cancel the Computer's Move, so that a stale Move never lands on a game I have left or a new game I have started.
13. As a Human, I want my own drags to be impossible during the Computer's wait, so that I can't move out of turn.
14. As a Player, I want the awarded Region to keep its old colour for 500ms after the 9th Move, so that the 9th Move's flash and the Award are seen separately.
15. As a Player, I want the awarded Region to flash gold as it changes to the stuck Player's colour, so that I can see it was awarded to the other Player.
16. As a Player, I want the Score bar to show the pre-Award Scores until the Award flash, so that the Scores always match the Board.
17. As a Player, I want Game Over to appear only when the Award flash starts, so that the result is never announced before the Board shows it.
18. As a Player, I want the Award delay in Human vs Human games too, so that the Award is shown the same way in every game.
19. As a Player, I want Game Over after a 10th Move, or a 9th Move under Skip, to appear at once, so that normal endings are not slowed down.
20. As a Player, I want the last Move's flash to keep fading under the Game Over overlay, so that I can see the final Move's gains.
21. As a Player, I want resizing the window mid-flash to keep the flash in the right place, so that the effect never detaches from its Regions.

## Implementation Decisions

- **Captured** is a new glossary term (already in CONTEXT.md): a Region a Move changes to the Mover's colour, meaning a left side whose Region was the Opponent's or uncoloured. The awarded Region is *awarded*, not Captured.
- **Game module** gets one new pure query, `capturedRegions(game, move)`. It returns the Regions the Move would Capture, worked out the same way as `previewMove` (Split each Region the Line passes through, keep the left sides whose original Region was not the Mover's). Nothing else in the game module changes: `applyMove`, the Award and the Scores are untouched.
- **New pure "Move effects" module** with `effectsOf(before, after)`, the main seam. Given the game before and after a Move, it returns the timed steps the screen shows. Each step has:
  - its start time after the Move (0 or 500ms)
  - the Regions and Scores to draw
  - the Regions to flash gold
  - whether Game Over is shown

  A normal Move gives one step: the after-game's Regions and Scores, flashing its Captured Regions, with Game Over only after a 10th Move or a 9th Move under Skip. A 9th Move under Award gives two steps:
  1. At 0ms: the after-game's Regions, but with the awarded Region in its pre-Award colour; pre-Award Scores; flashing the 9th Move's Captured Regions; no Game Over.
  2. At 500ms: the after-game's Regions and Scores; flashing the awarded Region; Game Over shown.

  The pre-Award Scores and Region come from the game before the Award, which `effectsOf` can rebuild from `before` and the last Move.
- **Screen state**: `makeMove` and `startGame` no longer play the Computer's Move. `playComputer` is exported, and the app shell calls it after the 500ms wait.
- **App shell (`main`)** holds the current effects and when they started:
  - While any flash is under 500ms old, or a later step is pending, it redraws on `requestAnimationFrame`. The flash opacity is `1 - elapsed/500`.
  - It draws the step currently due, not the AppState's game directly. Game Over is drawn only once the step says so.
  - When the Computer becomes the Mover, it sets a 500ms `setTimeout` to play the Computer's Move. The timeout is cancelled when the game is left with Menu or a new game starts. A simple check that the AppState's game is still the one the timeout was set for is enough.
- **Renderer** gains an optional flash: a set of Regions and an opacity, drawn after the Region fills and before the Lines as a gold fill and a 2px darker-gold border at that opacity.
- **Status**: `playingStatus` returns "Computer to move" when the Computer is the Mover, instead of "Your move".
- **Input**: drags are already limited to the Mover's turn by the existing checks. While the Computer is the Mover during the wait, Human drags must not start (the start check should also require that the Mover isn't the Computer).

## Testing Decisions

- Test external behaviour through pure functions only, with no DOM, timers or canvas. Assert on the Regions, Scores, flash sets and step times returned, not on how they're computed.
- `capturedRegions` is tested in the game module's tests next to the existing Split and Award tests: a Move through an Opponent's Region Captures its left side; a Move through only the Mover's own Regions Captures nothing; the first Move Captures only the left side of the Board.
- `effectsOf` gets a new test file with these cases: a normal Move (one step at 0ms, flashing the Captured Regions, no Game Over); a 10th Move (one step, Game Over shown); a 9th Move under Skip (one step, Game Over shown); a 9th Move under Award (two steps; the first has the awarded Region in its old colour and the pre-Award Scores and no Game Over; the second at 500ms flashes only the awarded Region, shows the final Scores and Game Over).
- `playingStatus` gets a test that it reads "Computer to move" while the Computer is the Mover, and "Your move" otherwise.
- Prior art: the game module's tests build games by applying Moves in sequence, including the stuck Award and Skip endings. Reuse those game-building helpers for the effects tests.
- The fade animation, the `setTimeout` delay and its cancellation, and the canvas drawing are thin wiring that is checked by running the app, not by tests.

## Out of Scope

- Any change to game rules, `applyMove`, scoring, Strategies, Training or the bench.
- Configurable delay or fade length, or a setting to turn the effects off.
- Highlighting Regions that became the Opponent's (the right side of the first Move).
- A "thinking" indicator beyond the status text and existing Mover box.
- Animating the Lines or Points.
- Any special handling for `prefers-reduced-motion`: the effect is a fade, not motion.

## Further Notes

- The Human's flash finishes at the same moment the Computer's Move lands (both 500ms), so a Human Move followed by the Computer's reply reads as two separate beats.
- Under Award the stuck Player is always Blue. If the Computer is Red and makes the 9th Move, the Award goes to the Human, and the Award step's flash shows the Human's gain.
