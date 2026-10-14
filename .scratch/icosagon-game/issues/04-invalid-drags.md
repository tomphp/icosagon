# 04: Invalid drags

Status: done

**What to build:** Make the page behave correctly when a drag isn't a valid Move. Pressing on a used Point, or on empty space, does nothing. Releasing on empty space, on the start Point, on a neighbouring Point, or on a used Point removes the in-progress Line and leaves the Board, the Scores and the turn unchanged, so the same Player can try again.

See `.scratch/icosagon-game/spec.md` and `CONTEXT.md`.

**Blocked by:** 02 (Turns and Splitting several Regions).

- [x] Pressing on a used Point or on empty space doesn't start a drag
- [x] Releasing on empty space, the start Point, a neighbouring Point or a used Point cancels the drag with no change to the Board
- [x] After a cancelled drag it is still the same Player's turn
- [x] Browser test: a game that mixes these invalid drags with valid Moves confirms that the turn and Scores only change on valid Moves
