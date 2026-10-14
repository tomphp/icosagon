# 03: Clever Hoarder

Status: done

**What to build:** The Clever Hoarder Strategy, all the way through. It works like Hoarder but measures the **Settled margin**, the Mover's Settled area minus the Opponent's.

- **How it picks:** its candidates are the legal Moves after which the Settled margin is greater than before. It keeps those leaving the largest Settled margin, within Greedy's tie tolerance. Among those it keeps the highest Score, then picks at random. With no candidates it chooses exactly as Greedy does.
- **Where it appears:**
  - the page's Strategy selector, after Hoarder.
  - `match` accepts the participant `clever-hoarder`.
  - Training adds it to its scripted opponents, so each Generation and the final report include it.
  - the README lists it.

See `.scratch/hoarder-strategies/spec.md`.

**Blocked by:** 02 (Hoarder), whose Settled-area rule it reuses.

- [x] Clever Hoarder rejects a Move that settles more for the Opponent than for the Mover, in a position where Hoarder takes it
- [x] Clever Hoarder picks the candidate leaving the largest Settled margin
- [x] Ties go to the higher Score, then follow the random source
- [x] With no candidates, Clever Hoarder chooses exactly as Greedy does
- [x] Clever Hoarder always returns a legal Move under both Endings
- [x] Clever Hoarder can be picked in the page's Strategy selector and plays legal Moves (browser test)
- [x] `match` accepts `clever-hoarder`
- [x] Each Generation and the final report include Clever Hoarder
- [x] README updated

## Comments

- Hoarder and Clever Hoarder share one chooser that falls back to Greedy itself; they differ only in what they measure. Settled area is now worked out for both Players in one pass, so the margin costs no more than Hoarder's own area.
- The Greedy-fallback test also uses a position where some Moves settle area for the Mover (so Hoarder takes one) but none raises the margin, so the Clever-specific case is covered, not just the fresh Board.
