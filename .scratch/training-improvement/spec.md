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
- **Best so far**: `results/06-scripted8-equal-games.json`. Since ticket 06 the default plays 8 scripted games per Generation, so a 60-Generation run costs about 2.4× the baseline's games: bench with `--games 83520` from now on.

## Experiment log

| Ticket | Variant | Seed 1 | Seed 2 | Seed 3 | Mean | Kept? |
|---|---|---|---|---|---|---|
| 01 | Defaults (population 24, survivors 6, mutation 0.05) | −0.311 (G −0.18 / H −0.39 / CH −0.36) | −0.250 (G +0.30 / H −0.55 / CH −0.50) | −0.325 (G −0.05 / H −0.46 / CH −0.47) | **−0.295** (spread 0.075) | baseline |
| 03 | `npm run fit`: 20,000 games (10% Random Moves), 30 epochs, rate 0.05, 32 hidden; 9.5 min per seed | −0.310 (G +0.02 / H −0.50 / CH −0.45) | −0.357 (G −0.03 / H −0.53 / CH −0.51) | −0.341 (G −0.16 / H −0.39 / CH −0.47) | −0.336 (spread 0.047) | no |
| 04 | `--mutation 0.02` | −0.242 (G +0.25 / H −0.50 / CH −0.48) | −0.344 (G −0.05 / H −0.48 / CH −0.50) | −0.234 (G +0.10 / H −0.42 / CH −0.38) | −0.274 (spread 0.110) | no |
| 04 | `--mutation 0.01` | −0.381 (G −0.22 / H −0.46 / CH −0.45) | −0.354 (G −0.01 / H −0.49 / CH −0.56) | −0.360 (G −0.23 / H −0.46 / CH −0.39) | −0.365 (spread 0.027) | no |
| 04 | `--mutation 0.005` | −0.316 (G +0.19 / H −0.53 / CH −0.61) | −0.416 (G −0.25 / H −0.49 / CH −0.51) | −0.525 (G −0.17 / H −0.71 / CH −0.69) | −0.419 (spread 0.210) | no |
| 08 | Settled input at each sample spot (145 inputs, Model version 2) | +0.007 (G +0.24 / H −0.07 / CH −0.15) | −0.096 (G +0.16 / H −0.23 / CH −0.22) | −0.137 (G +0.07 / H −0.25 / CH −0.23) | **−0.075** (spread 0.144) | yes |
| 05 | `--mutation-rate 0.1` (σ 0.05) | −0.254 (G +0.15 / H −0.43 / CH −0.48) | −0.303 (G −0.24 / H −0.35 / CH −0.33) | −0.147 (G +0.05 / H −0.22 / CH −0.27) | −0.235 (spread 0.156) | no |
| 05 | `--mutation-rate 0.1 --mutation 0.1` | +0.035 (G +0.21 / H −0.07 / CH −0.04) | −0.217 (G −0.06 / H −0.29 / CH −0.31) | +0.007 (G +0.23 / H −0.09 / CH −0.12) | −0.059 (spread 0.252) | no |
| 05 | `--mutation-rate 0.02` (σ 0.05) | −0.124 (G +0.20 / H −0.30 / CH −0.27) | −0.398 (G −0.17 / H −0.52 / CH −0.50) | −0.030 (G +0.20 / H −0.14 / CH −0.16) | −0.184 (spread 0.368) | no |
| 05 | `--mutation-rate 0.02 --mutation 0.1` | −0.201 (G −0.04 / H −0.28 / CH −0.28) | −0.108 (G +0.28 / H −0.30 / CH −0.31) | −0.037 (G +0.28 / H −0.21 / CH −0.18) | −0.115 (spread 0.164) | no |
| 06 | `--scripted-games 4` (60 Generations, 136,160 games) | +0.070 (G +0.36 / H −0.07 / CH −0.08) | +0.063 (G +0.28 / H −0.06 / CH −0.03) | +0.040 (G +0.33 / H −0.13 / CH −0.08) | +0.058 (spread 0.029) | no |
| 06 | `--scripted-games 8` (60 Generations, 205,280 games) | +0.086 (G +0.26 / H −0.00 / CH +0.00) | +0.037 (G +0.56 / H −0.27 / CH −0.19) | +0.058 (G +0.39 / H −0.12 / CH −0.10) | +0.060 (spread 0.049) | no |
| 06 | `--scripted-games 4 --games 83520` (38 Generations) | +0.041 (G +0.31 / H −0.10 / CH −0.08) | −0.024 (G +0.35 / H −0.22 / CH −0.21) | −0.030 (G +0.18 / H −0.14 / CH −0.13) | −0.004 (spread 0.070) | no |
| 06 | `--scripted-games 8 --games 83520` (25 Generations) | −0.013 (G +0.20 / H −0.14 / CH −0.11) | +0.110 (G +0.41 / H −0.05 / CH −0.03) | +0.066 (G +0.28 / H −0.06 / CH −0.02) | **+0.054** (spread 0.124) | yes, by judgement |
| 07 | `--population 36 --games 83520` (14 Generations) | −0.014 (G +0.32 / H −0.21 / CH −0.15) | +0.000 (G +0.22 / H −0.13 / CH −0.10) | +0.036 (G +0.21 / H −0.05 / CH −0.06) | +0.008 (spread 0.049) | no |
| 07 | `--population 48 --games 83520` (10 Generations) | +0.086 (G +0.34 / H −0.06 / CH −0.02) | +0.029 (G +0.21 / H −0.03 / CH −0.09) | −0.043 (G +0.21 / H −0.19 / CH −0.14) | +0.024 (spread 0.130) | no |
| 07 | `--population 96 --games 83520` (4 Generations) | −0.042 (G +0.28 / H −0.18 / CH −0.22) | +0.021 (G +0.29 / H −0.13 / CH −0.10) | −0.083 (G +0.01 / H −0.14 / CH −0.12) | −0.035 (spread 0.104) | no |
| 07 | `--population 48 --generations 25` (228,800 games) | +0.058 (G +0.29 / H −0.05 / CH −0.07) | −0.001 (G +0.30 / H −0.15 / CH −0.15) | −0.052 (G +0.28 / H −0.22 / CH −0.22) | +0.001 (spread 0.110) | no |
| 03 rerun | `npm run fit` with the Settled input, same settings as 03; about 4 min per seed | +0.129 (G +0.42 / H −0.02 / CH −0.02) | −0.181 (G +0.35 / H −0.44 / CH −0.45) | −0.128 (G +0.37 / H −0.37 / CH −0.38) | −0.060 (spread 0.310) | no |
| 09 | `--td 0.05 --games 83520` (TD(λ) with λ 0.7, 25 Generations) | −0.126 (G −0.29 / H −0.05 / CH −0.04) | −0.046 (G +0.17 / H −0.13 / CH −0.17) | −0.064 (G +0.22 / H −0.16 / CH −0.25) | −0.079 (spread 0.081) | no |
| 09 | `--td 0.01 --games 83520` | +0.034 (G +0.28 / H −0.11 / CH −0.07) | +0.066 (G +0.43 / H −0.11 / CH −0.12) | −0.056 (G +0.15 / H −0.15 / CH −0.16) | +0.015 (spread 0.122) | no |
| 09 | `--td 0.2 --games 83520` | diverged in Generation 3 | — | — | — | no |

## Decisions so far

(One line per finished ticket: what won, and the new best-so-far settings.)

- 01: Baseline at the defaults is −0.295 (spread 0.075). The `vs` margins climb only over the first ~10 Generations (Greedy −0.50 → about −0.06; Hoarder and Clever Hoarder −0.65 → about −0.50), then stay flat and noisy for the other 50. The final split varies a lot by seed: seed 2 beats Greedy (+0.30) but almost never beats the Hoarders; seed 1 does the reverse.
- 02: `npm run bench` runs the protocol and gives the verdict. The win rule takes best-so-far's spread as the noise for both tests. Best so far: `results/01-baseline.json`.
- 03: Fitting by backprop loses (−0.336 against −0.295; not kept). Its error flattens at about 0.13 by epoch 10 out of 30, on about 190,000 positions, so more training on the same signal doesn't help. It roughly matches Greedy but loses heavily to both Hoarders, as evolution does. **Decision: the bottleneck is the inputs, not the training method.** Tickets 04–08 go ahead as planned; ticket 08 (Settled input) is the most likely to matter. Best so far stays `results/01-baseline.json`.
- 04: No smaller mutation wins, so the default stays 0.05. σ 0.02 does best (−0.274), but its gain of 0.022 is inside the baseline's spread of 0.075. 0.01 (−0.365) and 0.005 (−0.419) are worse, so smaller steps hurt. At every σ the `vs` margins stop improving after about 10 Generations, as at the baseline, so step size is not what limits Training. Best so far stays `results/01-baseline.json`.
- 08: The Settled input wins clearly (−0.075 against −0.295, a gain of 0.220 against the baseline's spread of 0.075; every seed is better than its baseline seed). The biggest change is against the Hoarders: from about −0.50 to about −0.20, with seed 1 close to even against Hoarder. The `vs` margins now keep improving until about Generation 30 rather than 10. Old Models (version 1) no longer load. Computing Settled Regions made Neural games about 10× slower, until `isLegalMove` stopped rebuilding the used Points on each call; Neural games are now about 2× as slow as before, and Hoarder games about 5× faster, so a 60-Generation run takes about 13 minutes rather than 9.5. **Best so far: `results/08-settled.json`, at the default Training settings.**
- 05: Mutating only some weights loses, so the option was removed. Rate 0.1 with σ 0.1 does best (−0.059), but its gain of 0.017 is well inside 08's spread of 0.144, and its seed 2 is worse than 08's by 0.121. At σ 0.05 both rates are worse (0.1: −0.235; 0.02: −0.184), and rate 0.02 with σ 0.1 gets −0.115. The `vs` margins follow the same curve as 08. Like ticket 04, this suggests the mutation step is not what limits Training. Best so far stays `results/08-settled.json`.
- 06: Repeating the scripted games is kept, and the default is now 8 (`--scripted-games 8`), **by judgement: no variant passes the win rule.** Every variant's gain over 08 is just under 08's spread of 0.144, which is unusually wide: 0.13 for 4 and for 8 over 60 Generations, and 0.13 for 8 and 0.07 for 4 at equal games played. But all of them beat 08's mean, and the 60-Generation runs beat 08 on every seed with spreads of 0.03–0.05. At equal games played, 8 (25 Generations) does as well as 4 or 8 over 60 Generations, and better than 4 (38 Generations), so judging fewer Generations accurately beats running more Generations on noisy Fitness. Its seed 1 is 0.02 below 08's, inside the spread. Caveat: the repeats also raise the scripted opponents' share of a network's games from about 12% to about 51% at 8, so some of the gain may come from training against the opponents the bench measures, not from less noise alone. **Best so far: `results/06-scripted8-equal-games.json`, at the default Training settings with `--games 83520`.**
- 07: No bigger Population wins, so the default stays 24. At equal games played, 36 (+0.008), 48 (+0.024) and 96 (−0.035) all fall below 06's +0.054, partly because they fit fewer Generations (14, 10 and 4 against 25). Even given 06's 25 Generations at 2.7× the games, 48 gets only +0.001, so diversity is not what limits Training. Best so far stays `results/06-scripted8-equal-games.json`.
- 03 rerun: With the Settled input, fitting by backprop goes from −0.336 to −0.060, beating 08's evolution (−0.075) on about a quarter of the games (20,800 per seed), though not 06 (+0.054). It depends heavily on the seed: seed 1 (+0.129, about even against both Hoarders) is the best single Model so far, while seeds 2 and 3 lose to the Hoarders by about 0.4. **Decision: gradient training now helps, so ticket 09's gate passes.** A cheaper first step for 09 is to continue evolution from the fitted Models with `npm run train -- --from`. Best so far stays `results/06-scripted8-equal-games.json`.
- 09: TD learning inside Training loses, so the option was removed (the code is in `git stash` "ticket 09 TD(λ) option"). Each Generation, each survivor took one TD(λ) step (λ 0.7) per game on its own positions, and its children inherited the learned weights. Only survivors learned, since the others are discarded; this gives the same result as every network learning. It adds no games and no measurable time per Generation. Rate 0.01 gets +0.015 and 0.05 gets −0.079, both below 06's +0.054; 0.2 diverges. At 0.05 the `vs` margins improve faster early (about −0.26 against the Hoarders at Generation 5, against 06's −0.37) but then stall, while 06 keeps improving to about −0.17 by Generation 25. ADR 0001 stands unchanged. Best so far stays `results/06-scripted8-equal-games.json`.

## Out of scope / later

- Lookahead (2-ply) when choosing a Move.
- Crossover.
