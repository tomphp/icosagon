# 03: Award shown 500ms after the 9th Move

**What to build:** When a game ends with an Award, the 9th Move's Captured Regions flash as usual. For 500ms the awarded Region keeps its old colour and the Score bar shows the pre-Award Scores. Then the Region takes the stuck Player's colour and flashes gold in the same way, the Scores update, and Game Over appears. This applies in Human vs Human games too. See the spec, `.scratch/move-highlight/spec.md`.

`effectsOf` returns two steps for a 9th Move under Award:
1. At 0ms: the after-game's Regions with the awarded Region in its pre-Award colour; the pre-Award Scores; flashing the 9th Move's Captured Regions; no Game Over.
2. At 500ms: the after-game's Regions and Scores; flashing only the awarded Region; Game Over shown.

The app shell draws whichever step is due, and draws Game Over only once a step says so.

**Blocked by:** 01 (Captured Regions flash gold)

**Status:** ready-for-agent

- [ ] `effectsOf` test for a 9th Move under Award, checking both steps as described above
- [ ] In the app, the awarded Region visibly changes colour and flashes 500ms after the 9th Move, with the Scores and Game Over appearing at the same time
- [ ] The Award delay also happens in Human vs Human games
- [ ] No change to `applyMove` or how the Award is scored
