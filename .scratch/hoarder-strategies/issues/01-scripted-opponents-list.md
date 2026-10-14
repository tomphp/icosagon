# 01: Training plays a list of scripted opponents

Status: done

**What to build:** A prefactor with no change in behaviour. Training stops hard-wiring Greedy as its only scripted opponent and plays a list of scripted Strategies instead, for now just Greedy. Every network in a Generation plays each scripted opponent under both colours and both Endings, which is 4 games per opponent, and those games count in Fitness. Scripted opponents have no Fitness.

- Each Generation's progress carries the Population's average margin against each scripted opponent, keyed by Strategy. It replaces the single Greedy margin.
- The `train` command prints one `vs <strategy>` margin per scripted opponent.
- The final report is keyed by opponent and still covers Greedy and Random. The `train` command prints every entry it finds.
- Reading a Model accepts a report missing any opponent's entry, so Models trained before the Hoarders were added keep loading in the page, in `match` and with `--from`.

After this, adding an opponent to Training is a one-line change.

See `.scratch/hoarder-strategies/spec.md`.

**Blocked by:** None (can start immediately). Commit the uncommitted training work in progress (early stop on Ctrl-C and the Greedy margin) on its own first.

- [x] Training plays a list of scripted opponents, at present just Greedy, 4 games each per network per Generation
- [x] Progress reports a margin per scripted opponent, consistent with the Population's average Fitness
- [x] The `train` progress line and final report print an entry per opponent
- [x] A Model whose report lacks an opponent's entry still loads
- [x] The same seed still gives the same Model, and existing Training tests pass
