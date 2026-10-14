# 03: Greedy Strategy and Strategy selector

Status: ready-for-agent

**What to build:** Add the Greedy Strategy. It picks the legal Move that gives the Mover the highest Score once made, using the real game rules so that an Award the Move triggers is counted. Ties are broken uniformly using the random source, with Scores compared within a small tolerance. Add a Strategy selector (`Random` / `Greedy`, Greedy default) beside Play against. It is disabled while Play against is Human, and changing it starts a new game. It locks and unlocks with the other selectors, and New game keeps its value.

See `.scratch/human-vs-computer/spec.md` and `CONTEXT.md`.

**Blocked by:** 01 (Play against a Random Computer).

- [ ] Greedy returns a Move whose resulting Score for the Mover is at least that of every other legal Move
- [ ] Greedy counts an Award: in a scripted position where this changes the best Move, Greedy picks accordingly
- [ ] Greedy breaks ties using the random source (different values give different best-Score Moves from a fresh game)
- [ ] Strategy selector with Random and Greedy, Greedy default
- [ ] Strategy disabled when Play against is Human
- [ ] Changing Strategy starts a new game; it locks with the other selectors once the Human has moved; New game keeps it
- [ ] The Computer plays the selected Strategy
- [ ] Unit tests for Greedy with a fixed random source; page tests for the Strategy selector's default, disabling and locking
