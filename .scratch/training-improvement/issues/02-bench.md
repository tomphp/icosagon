# 02: Bench command for the protocol

Status: ready-for-agent

**What to build:** an `npm run bench` command that runs one experiment variant on the protocol and says whether to keep it. Given any Training flags, it trains on seeds 1, 2 and 3 for the protocol budget (60 Generations unless told otherwise, or a games-played budget for experiments that change the cost of a Generation). It can also be given three ready-made Models (one per seed) instead, so Models from other commands, like `fit`, are judged the same way. It prints:

- each seed's final-report margins against Greedy, Hoarder and Clever Hoarder, and its mean;
- the mean over seeds and the spread between seeds;
- the total games played;
- when given a best-so-far result, a "kept" or "not kept" verdict from the spec's win rule.

It saves each run's log and a small results file that can be passed back as the best-so-far result next time. Model files go outside `models/`.

**Blocked by:** 01

- [ ] Training a variant on 3 seeds prints per-seed margins, mean, spread and games played
- [ ] Three given Models are reported the same way, without training
- [ ] A best-so-far result file gives a verdict that follows the win rule; tests cover the verdict, including a seed that is clearly worse
- [ ] Ticket 01's baseline saved as the first best-so-far result, matching the spec's Experiment log
- [ ] The spec's Protocol updated to use `bench`
