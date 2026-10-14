# 01: Play against a Random Computer

Status: done

**What to build:** Add a Play against selector (`Human` default / `Computer`) beside Ending. Against the Computer, a fair coin flip on every new game (page load, New game, any selector change) decides whether the Human is Red or Blue. A persistent label shows "You are Red" or "You are Blue", and the turn text reads "Your move (Red)" or "Your move (Blue)". The Computer plays the Random Strategy: uniformly among all legal Moves, with `3→12` and `12→3` counted separately. It moves instantly, at the start of the game if it is Red and straight after each Human Move otherwise, so the Human only ever sees their own turn. The selectors stay usable until the Human has made a Move, then lock. New game unlocks them and keeps their values. Human vs Human is unchanged.

The Computer's choice is a pure function in a new Computer module. It takes the game, the Strategy and a random-number source, and returns a Move. The page passes `Math.random`. The game module doesn't change.

See `.scratch/human-vs-computer/spec.md` and `CONTEXT.md`.

**Blocked by:** None (can start immediately).

- [x] Play against selector with Human (default) and Computer, beside Ending
- [x] Changing Play against starts a new game
- [x] Against the Computer, a coin flip on every new game gives the Human Red or Blue
- [x] "You are Red"/"You are Blue" label shown against the Computer, hidden in Human vs Human
- [x] Turn text reads "Your move (Red)"/"Your move (Blue)" against the Computer; Human vs Human text unchanged
- [x] When the Computer is Red, it has made its first Move as soon as the game appears
- [x] The Computer replies instantly after each Human Move while the game is in progress
- [x] Random only returns legal Moves and can return either direction of a pair
- [x] Selectors (Play against and Ending) stay enabled until the Human has made a Move, then lock; New game unlocks them and keeps their values
- [x] Stuck game over works with either Player stuck, under both Endings
- [x] Unit tests for Random with a fixed random source (legality, both directions, source values near 0 and 1 stay in range)
- [x] Page tests with `Math.random` stubbed via `evaluateOnNewDocument`: defaults, Human as Red, Human as Blue (Computer already moved, selectors still enabled), instant reply after a drag, locking and New game re-flip
- [x] Existing Human vs Human page tests still pass
