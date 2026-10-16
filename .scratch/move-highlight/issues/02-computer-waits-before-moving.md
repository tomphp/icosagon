# 02: Computer waits 500ms before each Move

**What to build:** In a game against the Computer, the Computer waits 500ms before each of its Moves, including its opening Move as Red, so the Human sees their own Move land first. During the wait the status reads "Computer to move" and the Computer's name box is the Mover's. Human drags can't start during the wait. Pressing Menu during the wait cancels the pending Move, so it never lands on a game the Human has left or on a new game. See the spec, `.scratch/move-highlight/spec.md`.

`makeMove` and `startGame` no longer play the Computer's Move. `playComputer` is exported, and the app shell calls it from a cancellable 500ms `setTimeout`. The timeout checks that the game is still the one it was set for.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `playingStatus` test: "Computer to move" while the Computer is the Mover, "Your move (…)" otherwise
- [x] Human drags can't start while the Computer is the Mover
- [x] In the app, the Computer's reply and its opening Move as Red each land 500ms after the Human's Move or the game's start
- [x] Pressing Menu during the wait, then starting a new game, never applies the stale Move
- [x] Human vs Human games are unchanged
