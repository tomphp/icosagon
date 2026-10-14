# 02: Hoarder

Status: ready-for-agent

**What to build:** The Hoarder Strategy, all the way through.

- **Settled:** a Region is Settled when no legal Move would split it. A finished game counts as wholly Settled, so after a game-ending Move each Player's Settled area equals their Score, including any Award. Settled area stays internal to the Computer module.
- **How Hoarder picks:** its candidates are the legal Moves after which the Mover's Settled area is greater than before. It keeps the candidates leaving the most Settled area, within Greedy's tie tolerance. Among those it keeps the highest Score, within the same tolerance, then picks at random. With no candidates it chooses exactly as Greedy does.
- **Where it appears:**
  - the page's Strategy selector, after Greedy, with Greedy still the default.
  - `match` accepts the participant `hoarder`, and its usage and error text list it.
  - Training adds Hoarder to its scripted opponents, so each Generation and the final report include it.
  - the README lists it.

See `.scratch/hoarder-strategies/spec.md`.

**Blocked by:** 01 (Training plays a list of scripted opponents).

- [ ] After `0→9`, `3→12`, `6→15`, the middle triangle is not treated as Settled, because legal Lines still cut it
- [ ] Hoarder takes a Move that settles area over a higher-scoring Move that settles nothing
- [ ] Hoarder picks the candidate leaving the most Settled area
- [ ] Ties go to the higher Score, then follow the random source
- [ ] With no candidates, Hoarder chooses exactly as Greedy does
- [ ] Hoarder always returns a legal Move under both Endings, counting any Award a Move triggers
- [ ] Hoarder can be picked in the page's Strategy selector and plays legal Moves (browser test)
- [ ] `match` accepts `hoarder`
- [ ] Each Generation and the final report include Hoarder
- [ ] README updated
