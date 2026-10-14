# 05: Use all cores for `train` and `match`

Status: ready-for-agent

**What to build:** Spread the games of each Generation, of the final report and of `match` across worker threads, one per core. The parallelism is hidden inside the Training module. Results must be identical to a single-threaded run with the same seed, so each game's randomness must not depend on which worker plays it.

See `.scratch/neural-strategy/spec.md`.

**Blocked by:** 02 (`train` CLI: evolve a fresh Population), 03 (Comparing Models: `match` CLI and Training's final report).

- [ ] `train` and `match` use one worker per core
- [ ] Same seed gives identical results with and without workers (unit test)
- [ ] A default run (population 24) is several times faster than single-threaded
