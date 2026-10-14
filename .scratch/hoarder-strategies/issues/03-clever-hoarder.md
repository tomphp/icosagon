# 03: Clever Hoarder

Status: ready-for-agent

**What to build:** The Clever Hoarder Strategy, all the way through. It works like Hoarder but measures the **Settled margin**, the Mover's Settled area minus the Opponent's.

- **How it picks:** its candidates are the legal Moves after which the Settled margin is greater than before. It keeps those leaving the largest Settled margin, within Greedy's tie tolerance. Among those it keeps the highest Score, then picks at random. With no candidates it chooses exactly as Greedy does.
- **Where it appears:**
  - the page's Strategy selector, after Hoarder.
  - `match` accepts the participant `clever-hoarder`.
  - Training adds it to its scripted opponents, so each Generation and the final report include it.
  - the README lists it.

See `.scratch/hoarder-strategies/spec.md`.

**Blocked by:** 02 (Hoarder), whose Settled-area rule it reuses.

- [ ] Clever Hoarder rejects a Move that settles more for the Opponent than for the Mover, in a position where Hoarder takes it
- [ ] Clever Hoarder picks the candidate leaving the largest Settled margin
- [ ] Ties go to the higher Score, then follow the random source
- [ ] With no candidates, Clever Hoarder chooses exactly as Greedy does
- [ ] Clever Hoarder always returns a legal Move under both Endings
- [ ] Clever Hoarder can be picked in the page's Strategy selector and plays legal Moves (browser test)
- [ ] `match` accepts `clever-hoarder`
- [ ] Each Generation and the final report include Clever Hoarder
- [ ] README updated
