# 01: Captured Regions flash gold

**What to build:** After every Move, by a Human or the Computer, each Region the Move Captured flashes bright gold (fill `#ffd700`, 2px `#b8860b` border). The gold is an overlay on the Region's new colour and fades linearly to nothing over 500ms. Halves of the Mover's own Regions don't flash, and on the first Move only the Mover's side flashes. After a 10th Move, or a 9th Move under Skip, Game Over appears at once with the flash still fading underneath. Under Award the Award is still applied instantly; ticket 03 delays it. See the spec, `.scratch/move-highlight/spec.md`.

Adds the game module query `capturedRegions(game, move)` and the pure Move effects function `effectsOf(before, after)` (single-step case: one step at 0ms with the after-game's Regions and Scores, the Captured Regions to flash, and whether Game Over is shown). Also adds the renderer's flash overlay and the app shell's `requestAnimationFrame` fade.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `capturedRegions` tests, next to the existing Split tests: a Move through an Opponent's Region Captures its left side; a Move through only the Mover's own Regions Captures nothing; the first Move Captures only the left side of the Board
- [x] `effectsOf` tests in a new test file: a normal Move gives one step at 0ms flashing the Captured Regions with no Game Over; a 10th Move and a 9th Move under Skip each give one step with Game Over shown
- [x] The renderer draws the flash Regions as a gold fill with a 2px darker-gold border at a given opacity, after the Region fills and before the Lines
- [x] In the app, the Human's and the Computer's Captured Regions visibly flash and fade over 500ms, also under the Game Over overlay
- [x] No change to `applyMove`, scoring, Strategies, Training or the bench
