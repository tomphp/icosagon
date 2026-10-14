# 03: End of game and New game

Status: ready-for-agent

**What to build:** When the 10th Move is made, every Point has been used and the game ends. A banner announces "Red wins", "Blue wins" or "Draw" (Scores equal within a small relative tolerance) along with the final percentages. The finished Board stays visible but locked: no more drags are accepted. A "New game" button resets to a single uncoloured Region with Red to move.

See `.scratch/icosagon-game/spec.md` and `CONTEXT.md`.

**Blocked by:** 02 (Turns and Splitting several Regions).

- [ ] The game module reports the outcome (in progress, red wins, blue wins, or Draw) once 10 Moves have been played, and rejects any further Moves
- [ ] The result banner shows the outcome and final percentages as page text
- [ ] The Board ignores drags after the game is over
- [ ] New game resets the Board, the Scores and the turn
- [ ] Unit test: a scripted 10-Move game (written as `start→end` Moves) reaches a known outcome and Scores
- [ ] Browser test: the same scripted game played by real drags shows the expected banner, and New game resets the page
