# 02: `train` CLI: evolve a fresh Population

Status: ready-for-agent

**What to build:** A `train` command, run as an npm script with Node from the dev shell, that produces a Model entirely in memory. It's a thin wrapper around a Training module function, `train(options) → Model`, which is deterministic for a given seed.

Training starts from a fresh, randomly weighted Population. Each Generation:

- every pair of networks plays under both colours and both Endings;
- each network also plays Greedy 4 times (both colours × both Endings);
- Fitness is the network's average Score margin (own Score minus Opponent's at Game over);
- the fittest share (rounded, at least 1) survives unchanged, and the rest is refilled with copies of survivors given Gaussian noise on every weight (no crossover).

All randomness comes from one seeded generator. Progress goes through a callback.

The CLI takes these flags:

- `--generations`
- population size (default 24)
- hidden size (default 32)
- survivor share (default 25%)
- mutation strength
- `--seed` (random when omitted; printed and saved)
- `--out`

It prints the best and average Fitness each Generation and the number of games at the end. It writes the Model with the Population best first, plus its seed and total Generations. Rounding weights when saving keeps the files small. This ticket is single-threaded.

See `.scratch/neural-strategy/spec.md` and `CONTEXT.md`.

**Blocked by:** 01 (Play against a Neural Model on the page).

- [ ] `train` CLI with the flags above writes a Model that the page offers and can play
- [ ] Same seed gives an identical Model; a different seed gives a different one
- [ ] Population size is preserved and stored best first by Fitness
- [ ] Survivors appear unchanged in the next Generation
- [ ] Each Generation's games are the round-robin under both colours and both Endings plus 4 Greedy games per network
- [ ] Best and average Fitness are printed each Generation; the game count at the end
- [ ] A random seed is chosen, printed and saved when `--seed` is omitted
- [ ] Unit tests on `train` with tiny settings (e.g. population 4, 2 Generations)
