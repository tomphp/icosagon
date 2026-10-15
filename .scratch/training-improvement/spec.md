# Spec: Training that visibly improves

Status: ready-for-human

## Problem Statement

Training a Neural Model gives little sign of improvement over Generations. Fitness is mostly relative (about 88% of each network's games are against its peers), so it hovers near 0 however good the Population gets. The margins against the scripted opponents are the only absolute measure, and they move slowly and noisily.

Suspected causes, from reading the code:

1. **Mutation too large**: σ 0.05 on every weight is about 45% of a typical hidden weight, so most children are worse than their parent.
2. **Noisy Fitness**: only 4 games per scripted opponent per network per Generation, and those opponents break ties at random.
3. **Small Population**: 24 networks, 6 survivors.
4. **Weak inputs**: there is no Settled signal, and the 61 sample spots miss small Regions near the edge.
5. **1-ply ceiling**: the network rates positions one Move ahead, the same depth as Greedy. This is out of scope here and noted for later.
6. **Training method**: evolution gives each network one Fitness number per Generation, while backprop would learn from every position played. Ticket 03 tests this with a network fitted directly to game outcomes; ticket 09 then combines both methods if gradients help. This reopens ADR 0001.

## Solution

Run each fix as an experiment against a fixed protocol, one ticket at a time. Keep a change only if it beats the best-so-far result, and build each experiment on the best-so-far settings. Ticket 02 adds a `bench` command that runs the protocol and gives each variant's verdict.

## Protocol

- **Metric**: the final report's average margin against Greedy, Hoarder and Clever Hoarder (200 games each), averaged over 3 seeds. Secondary: the per-Generation `vs` margins as a learning curve.
- **Seeds**: 1, 2, 3.
- **Budget**: G = 60 Generations (`--generations 60`). At the default settings a Generation takes about 9.3 s on 16 cores and the final report about 10 s, so one run takes about 9.5 minutes (84,320 games). If an experiment changes the number of games per Generation (Population size, extra games), compare at equal **games played** too, not only equal Generations.
- **Win rule**: a change is kept if its mean margin beats best-so-far by more than the spread between seeds, and no seed is clearly worse. Otherwise revert it and record it as a loss.
- **Logs**: `npm run train -- ... --out /tmp/... | tee .scratch/training-improvement/logs/<ticket>-<variant>-s<seed>.log`. Logs are not committed. Model files from experiments stay out of `models/`.

## Experiment log

| Ticket | Variant | Seed 1 | Seed 2 | Seed 3 | Mean | Kept? |
|---|---|---|---|---|---|---|
| 01 | Defaults (population 24, survivors 6, mutation 0.05) | −0.311 (G −0.18 / H −0.39 / CH −0.36) | −0.250 (G +0.30 / H −0.55 / CH −0.50) | −0.325 (G −0.05 / H −0.46 / CH −0.47) | **−0.295** (spread 0.075) | baseline |

## Decisions so far

(One line per finished ticket: what won, and the new best-so-far settings.)

- 01: Baseline at the defaults is −0.295 (spread 0.075). The `vs` margins climb only over the first ~10 Generations (Greedy −0.50 → about −0.06; Hoarder and Clever Hoarder −0.65 → about −0.50), then stay flat and noisy for the other 50. The final split varies a lot by seed: seed 2 beats Greedy (+0.30) but almost never beats the Hoarders; seed 1 does the reverse.

## Out of scope / later

- Lookahead (2-ply) when choosing a Move.
- Crossover.
