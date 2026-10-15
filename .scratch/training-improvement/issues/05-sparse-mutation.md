# 05: Mutate only some weights

Status: done

**Hypothesis:** Noise on every one of the 2,753 weights scrambles what a network has learned. Changing only a share of them, with a larger σ, explores without destroying it.

**What to do:** Add a `mutationRate` Training option and a `--mutation-rate` flag, from 0 to 1, defaulting to 1 so current behaviour is unchanged. Each weight gets noise with that probability. Bench rates 0.1 and 0.02, each with σ at the best-so-far value and at 0.1. Remove the option if no variant wins.

**Blocked by:** 04

- [x] Option and flag added; with the default of 1, the same seed still gives the same Model (checked byte for byte against the old code)
- [x] A test showing that a rate of 0 leaves a child equal to its parent
- [x] Variants benched and recorded; option kept and default set, or removed (removed: no variant won)
