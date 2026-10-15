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
- **Budget**: G = 60 Generations (`--generations 60`). At the default settings a Generation takes about 9.3 s on 16 cores and the final report about 10 s, so one run takes about 9.5 minutes (84,320 games). If an experiment changes the number of games per Generation (Population size, extra games), compare at equal **games played** too, not only equal Generations: `--games N` stops Training after the Generation that reaches N games (84,320 less the 800 report games is the baseline's 83,520).
- **Win rule**: a change is kept if its mean margin beats best-so-far by more than best-so-far's spread between seeds, and no seed is clearly worse: below best-so-far's same seed by more than that spread. Otherwise revert it and record it as a loss.
- **Running**: `npm run bench -- --out .scratch/training-improvement/results/<ticket>-<variant> --best .scratch/training-improvement/results/<best>.json [Training flags]` trains on seeds 1–3 (`--generations 60` unless `--generations` or `--games` is given), prints each seed's margins, the mean, spread and games played, and the verdict. Give it three Model files (one per seed) instead of Training flags to judge Models made another way. It writes `<ticket>-<variant>-s<seed>.log` (not committed) and `<ticket>-<variant>.json` (committed), which is the `--best` for later experiments if it is kept. Model files go to a temporary directory, never `models/`.
- **Best so far**: `results/08-settled.json`.

## Experiment log

| Ticket | Variant | Seed 1 | Seed 2 | Seed 3 | Mean | Kept? |
|---|---|---|---|---|---|---|
| 01 | Defaults (population 24, survivors 6, mutation 0.05) | −0.311 (G −0.18 / H −0.39 / CH −0.36) | −0.250 (G +0.30 / H −0.55 / CH −0.50) | −0.325 (G −0.05 / H −0.46 / CH −0.47) | **−0.295** (spread 0.075) | baseline |
| 03 | `npm run fit`: 20,000 games (10% Random Moves), 30 epochs, rate 0.05, 32 hidden; 9.5 min per seed | −0.310 (G +0.02 / H −0.50 / CH −0.45) | −0.357 (G −0.03 / H −0.53 / CH −0.51) | −0.341 (G −0.16 / H −0.39 / CH −0.47) | −0.336 (spread 0.047) | no |
| 04 | `--mutation 0.02` | −0.242 (G +0.25 / H −0.50 / CH −0.48) | −0.344 (G −0.05 / H −0.48 / CH −0.50) | −0.234 (G +0.10 / H −0.42 / CH −0.38) | −0.274 (spread 0.110) | no |
| 04 | `--mutation 0.01` | −0.381 (G −0.22 / H −0.46 / CH −0.45) | −0.354 (G −0.01 / H −0.49 / CH −0.56) | −0.360 (G −0.23 / H −0.46 / CH −0.39) | −0.365 (spread 0.027) | no |
| 04 | `--mutation 0.005` | −0.316 (G +0.19 / H −0.53 / CH −0.61) | −0.416 (G −0.25 / H −0.49 / CH −0.51) | −0.525 (G −0.17 / H −0.71 / CH −0.69) | −0.419 (spread 0.210) | no |
| 08 | Settled input at each sample spot (145 inputs, Model version 2) | +0.007 (G +0.24 / H −0.07 / CH −0.15) | −0.096 (G +0.16 / H −0.23 / CH −0.22) | −0.137 (G +0.07 / H −0.25 / CH −0.23) | **−0.075** (spread 0.144) | yes |

## Decisions so far

(One line per finished ticket: what won, and the new best-so-far settings.)

- 01: Baseline at the defaults is −0.295 (spread 0.075). The `vs` margins climb only over the first ~10 Generations (Greedy −0.50 → about −0.06; Hoarder and Clever Hoarder −0.65 → about −0.50), then stay flat and noisy for the other 50. The final split varies a lot by seed: seed 2 beats Greedy (+0.30) but almost never beats the Hoarders; seed 1 does the reverse.
- 02: `npm run bench` runs the protocol and gives the verdict. The win rule takes best-so-far's spread as the noise for both tests. Best so far: `results/01-baseline.json`.
- 03: Fitting by backprop loses (−0.336 against −0.295; not kept). Its error flattens at about 0.13 by epoch 10 out of 30, on about 190,000 positions, so more training on the same signal doesn't help. It roughly matches Greedy but loses heavily to both Hoarders, as evolution does. **Decision: the bottleneck is the inputs, not the training method.** Tickets 04–08 go ahead as planned; ticket 08 (Settled input) is the most likely to matter. Best so far stays `results/01-baseline.json`.
- 04: No smaller mutation wins, so the default stays 0.05. σ 0.02 does best (−0.274), but its gain of 0.022 is inside the baseline's spread of 0.075. 0.01 (−0.365) and 0.005 (−0.419) are worse, so smaller steps hurt. At every σ the `vs` margins stop improving after about 10 Generations, as at the baseline, so step size is not what limits Training. Best so far stays `results/01-baseline.json`.
- 08: The Settled input wins clearly (−0.075 against −0.295, a gain of 0.220 against the baseline's spread of 0.075; every seed is better than its baseline seed). The biggest change is against the Hoarders: from about −0.50 to about −0.20, with seed 1 close to even against Hoarder. The `vs` margins now keep improving until about Generation 30 rather than 10. Old Models (version 1) no longer load. Computing Settled Regions made Neural games about 10× slower, until `isLegalMove` stopped rebuilding the used Points on each call; Neural games are now about 2× as slow as before, and Hoarder games about 5× faster, so a 60-Generation run takes about 13 minutes rather than 9.5. **Best so far: `results/08-settled.json`, at the default Training settings.**

## Out of scope / later

- Lookahead (2-ply) when choosing a Move.
- Crossover.
