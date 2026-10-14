# Spec: Hoarder Strategies

Status: ready-for-agent

## Problem Statement

The only non-Neural opponents are Random and Greedy. Greedy only looks at the Score straight after its Move, but a Region it wins can be cut again by a later Line and partly recoloured. There is no Strategy that values area which can never be taken back. That leaves Humans with fewer distinct opponents. It also leaves Neural Models trained against a single scripted opponent, so they never have to cope with a player that hoards area that can't be retaken.

## Solution

Two new Strategies, built on a new idea: a **Settled** Region is one that no legal Line passes through, so its colour can no longer change.

- **Hoarder**: among the Moves that increase the Mover's Settled area, picks the one leaving the Mover the most Settled area.
- **Clever Hoarder**: among the Moves that increase the **Settled margin** (the Mover's Settled area minus the Opponent's), picks the one leaving the largest Settled margin.

Both break ties on Score, then at random. When no Move qualifies, each plays as Greedy.

Both Strategies:

- appear in the page's Strategy selector,
- can be named as participants in the `match` command,
- are opponents in every Generation of Training,
- are included in Training's final report.

## User Stories

1. As a Human, I want to choose Hoarder in the Strategy selector, so that I can play against an opponent that grabs area I can never retake.
2. As a Human, I want to choose Clever Hoarder in the Strategy selector, so that I can play against an opponent that also avoids settling area for me.
3. As a Human playing Hoarder, I want it to take a Move that settles area for it over one that scores more but leaves that area open to recapture, so that it plays differently from Greedy.
4. As a Human playing Hoarder, I want it to pick the candidate leaving it the most Settled area, so that it hoards as much as it can each Move.
5. As a Human playing Hoarder, I want it to play like Greedy when no Move settles anything for it, so that it never makes a pointless Move.
6. As a Human playing Clever Hoarder, I want it to reject a Move that settles more for me than for itself, so that it doesn't hand me area I can keep.
7. As a Human playing Clever Hoarder, I want it to play like Greedy when no Move increases its Settled margin, so that it still plays sensibly.
8. As a Human playing either Hoarder, I want ties between equally good Moves to go to the one scoring more, then at random, so that it doesn't play the same game every time.
9. As a Human, I want a Region surrounded only by Lines, with no Point on its edge, not to count as Settled while a legal Line can still cut through it, so that the Hoarders' idea of "safe" matches the real rules.
10. As a Human, I want the Hoarders to count the Award a game-ending Move triggers, so that their last Move is judged on the final result.
11. As a Human, I want the Hoarders to play under both Endings, so that I can face them whichever Ending I choose.
12. As a Human, I want the Hoarders to move instantly like the other Strategies, so that playing them feels the same.
13. As a person running `match`, I want to name `hoarder` and `clever-hoarder` as participants, so that I can compare them with Models, Greedy and Random.
14. As a person running `match`, I want an unknown participant's error message to list `hoarder` and `clever-hoarder`, so that I know they are accepted.
15. As a person training a Model, I want every network in each Generation to play Hoarder and Clever Hoarder as well as Greedy, so that Fitness rewards beating more than one style of play.
16. As a person training a Model, I want the games against Hoarder and Clever Hoarder to count in Fitness equally with every other game, so that no opponent is favoured.
17. As a person training a Model, I want each Generation's progress line to show the Population's average margin against Greedy, Hoarder and Clever Hoarder, so that I can see how training is going against each.
18. As a person training a Model, I want the final report to play the best network against Greedy, Hoarder, Clever Hoarder and Random, so that I know how the finished Model does against every scripted Strategy.
19. As a person training a Model, I want Training with the same seed and options to still produce the same Model, so that runs stay reproducible.
20. As a person training a Model, I want stopping early with Ctrl-C to keep working the same way, so that the new opponents don't change how a run ends.
21. As a person continuing training with `--from`, I want an older Model whose report covers only Greedy and Random to still load, so that existing lineages are not broken.
22. As a Human, I want older Model files to keep appearing as Neural Strategies in the selector, so that adding the Hoarders doesn't hide my Models.
23. As a reader of the README, I want the Hoarders listed with the other Strategies and `match` participants, so that I know they exist.

## Implementation Decisions

- **Settled, defined precisely.** A Region is Settled when no legal Move would split it, checked against every legal Move in the current game. A finished game counts as wholly Settled, so after a game-ending Move each Player's Settled area equals their Score, including any Award. The tempting rule "every Point on its edge is used" is wrong. Counter-example: after `0→9`, `3→12` and `6→15` there is a triangle in the middle with no Point on its edge, and `1→10` and five other legal Lines still cut it.
- **Settled area is internal to the Computer module.** It is not exported. It is tested only through `chooseMove`.
- **Strategy type.** The named Strategies grow from `"random" | "greedy"` to also include `"hoarder"` and `"clever-hoarder"`. The Neural variant is unchanged.
- **Hoarder.** Its candidates are the legal Moves after which the Mover's Settled area is greater than before the Move. If there are candidates, it keeps those with the highest Settled area after the Move, within Greedy's tie tolerance. Among those it keeps the ones with the highest Score, within the same tolerance, and picks one at random. If there are no candidates, it chooses exactly as Greedy does.
- **Clever Hoarder.** The same as Hoarder, but it measures the Settled margin (the Mover's Settled area minus the Opponent's) instead of the Mover's own Settled area.
- **Cost.** Each Strategy looks at every legal Move once and checks every Region against every legal Move in the resulting game. Training plays enough games for this to matter, but no optimisation is planned beyond keeping it straightforward.
- **Training schedule.** In each Generation the scripted opponents sit after the Population's networks: Greedy, then Hoarder, then Clever Hoarder. Each network plays each of them under both colours and both Endings, which is 4 games per opponent. These games feed Fitness like any other. The scripted opponents have no Fitness.
- **Progress.** The per-Generation progress carries the Population's average margin against each scripted opponent, replacing the single Greedy margin. The train command's progress line shows all three.
- **Final report.** The Model's report gains Hoarder and Clever Hoarder entries alongside Greedy and Random. The train command prints all four.
- **Model compatibility.** Reading a Model accepts a report missing the Hoarder entries, as written by Models trained before this change. A missing report entry is simply not printed.
- **match command.** Accepts `hoarder` and `clever-hoarder` as participants, named as written, and its usage and error text list them.
- **Page.** The Strategy selector gains Hoarder and Clever Hoarder options after Greedy, with values `hoarder` and `clever-hoarder`. Greedy stays the default.
- **Glossary.** `CONTEXT.md` already defines Settled, Hoarder, Clever Hoarder and Settled margin, and the Generation entry already names all three scripted opponents.
- **Before starting.** The uncommitted training work in progress (early stop on Ctrl-C and the per-Generation Greedy margin) is committed on its own before this feature.

## Testing Decisions

- Tests check behaviour through public seams only. Settled-area calculation is never tested directly.
- **`chooseMove` seam** (unit tests, following the existing Greedy and Neural Strategy blocks):
  - the triangle left by `0→9`, `3→12`, `6→15` is not treated as Settled. In a constructed position, Hoarder doesn't value a Move for "settling" it.
  - Hoarder prefers a Move that settles area over one with a higher Score that settles nothing.
  - Hoarder picks the candidate leaving the most Settled area.
  - Clever Hoarder rejects a Move that settles more for the Opponent than for the Mover, where Hoarder takes it.
  - both play as Greedy when no Move qualifies.
  - ties go to Score, then follow the random source.
  - both always return a legal Move, under both Endings, including when a Move triggers an Award.
- **`train()` seam** (unit tests, following the existing Training tests):
  - the Generation game count includes 4 games per network against each of the three scripted opponents.
  - progress reports a margin against each scripted opponent, each consistent with the Population's average Fitness.
  - the final report covers Greedy, Hoarder, Clever Hoarder and Random, and its counts add up to the games played.
  - the same seed still gives the same Model.
- **Model reading** (unit tests, following the existing Model tests): a Model whose report has only Greedy and Random still loads.
- **Browser seam** (browser tests, following the existing Computer tests): both Hoarders can be picked in the Strategy selector and make legal Moves in a game against the Human.

## Out of Scope

- Searching more than one Move ahead, and any smarter Hoarder variant beyond the two defined.
- Weighting the scripted opponents differently in Fitness, or making the set of Training opponents configurable.
- Speeding up Settled-area calculation.
- Rewriting existing Model files' reports to add Hoarder results.

## Further Notes

- On the final Move of a game every Region becomes Settled, so both Hoarders choose the same Move as Greedy there.
- Each Generation plays about 30% more games at the default Population of 24, and each Hoarder game costs more than a Greedy one, so Training will be noticeably slower.
