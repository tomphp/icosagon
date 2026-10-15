# 03: Value network fitted by backprop

Status: ready-for-agent

**Hypothesis:** evolution gets one Fitness number per network per Generation; gradient training gets a signal from every position. Fitting the network directly to game outcomes should beat 60 Generations of evolution. If it doesn't, the inputs are the limit, not the training method.

**What to build:** a permanent `npm run fit` command. It plays games among Greedy, Hoarder and Clever Hoarder, with some Random Moves mixed in so positions vary, and records every position with that game's final Score margin from the Mover's point of view. It fits a fresh network (same shape and inputs as Training's) to those margins with mean squared error and SGD, using hand-written backprop with no ML library. It writes a normal Model that the page, `match` and `--from` can load. The seed makes it repeatable. Flags cover the number of games, epochs and learning rate. Keep the games and fitting time roughly within the protocol's per-run budget so the comparison is fair.

**Blocked by:** 02

- [ ] `fit` writes a loadable Model; the same seed gives the same Model
- [ ] A test showing that one SGD step lowers the error on a batch (a gradient check against finite differences is enough)
- [ ] Bench run on 3 seeds recorded in the Experiment log, with a verdict against the best so far
- [ ] A decision line in the spec saying which is the bottleneck: the training method (fit wins clearly) or the inputs (it doesn't)
