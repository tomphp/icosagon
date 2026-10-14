# 02: Hoarder

Status: done

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

- [x] After `0→9`, `3→12`, `6→15`, the middle triangle is not treated as Settled, because legal Lines still cut it
- [x] Hoarder takes a Move that settles area over a higher-scoring Move that settles nothing
- [x] Hoarder picks the candidate leaving the most Settled area
- [x] Ties go to the higher Score, then follow the random source
- [x] With no candidates, Hoarder chooses exactly as Greedy does
- [x] Hoarder always returns a legal Move under both Endings, counting any Award a Move triggers
- [x] Hoarder can be picked in the page's Strategy selector and plays legal Moves (browser test)
- [x] `match` accepts `hoarder`
- [x] Each Generation and the final report include Hoarder
- [x] README updated

## Comments

- The triangle criterion is covered indirectly. No reachable position isolates the triangle: some Move that really settles area (such as a corner around a used Point) is always available, so a wrong rule for the triangle alone changes nothing. The test instead uses a position that contains the triangle (`0→9`, `3→12`, `15→6`, `13→18`), where counting any Region with no Point on its edge as Settled would choose a different Move. It fails under that wrong rule.
- A Hoarder game takes about 14× as long as a Greedy one (worst single Move about 40ms), so the Training tests now have a 30s timeout.
