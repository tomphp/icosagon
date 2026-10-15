# 09: TD learning inside Training

Status: ready-for-agent

**Hypothesis:** combining both methods keeps the Population competing across Generations, as ADR 0001 wants, while each network also learns from every position it plays.

**What to build:** a Training option and flag where, each Generation, every network also takes TD(λ) steps on its own games: each position's rating is nudged towards the next position's rating, and towards the final margin at the end of the game. Survivors pass the learned weights on to their children (Lamarckian evolution). The default is off, so current behaviour is unchanged. It reuses the backprop from ticket 03. Update ADR 0001 to record that Training may now use gradients, and why.

Only go ahead if ticket 03 shows gradient training helps. Otherwise set this ticket to `wontfix` with a line saying why.

**Blocked by:** 03

- [ ] Option and flag added; with it off, the same seed still gives the same Model
- [ ] A test showing that a TD step moves a position's rating towards its target
- [ ] Benched against the best-so-far result (at equal games played if it changes the cost of a Generation), recorded, and kept or removed
- [ ] ADR 0001 updated if the option is kept
