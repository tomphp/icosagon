# 03: Comparing Models: `match` CLI and Training's final report

Status: done

**What to build:** A `match` command that plays any mix of participants (Model file paths, `greedy`, `random`) against each other in memory. It's a thin wrapper around a Training module function, `match(participants, options) → results`.

Every pair plays under both colours × both Endings × `--games N`. A Neural vs Neural pairing is deterministic, so it plays its 4 distinct games only once. `--seed` makes results involving Random or Greedy reproducible. A participant that is neither a readable, compatible Model nor `greedy` or `random` is a clear error. The CLI prints a table of win/draw/loss and average margin per pairing.

`train` now ends by playing its best network against Greedy and Random (e.g. 200 games each, alternating colours and Endings). It prints the results and stores the report in the Model.

See `.scratch/neural-strategy/spec.md`.

**Blocked by:** 02 (`train` CLI: evolve a fresh Population).

- [x] `match` accepts any number of Model paths, `greedy` and `random`
- [x] Each pairing plays 4 × N games; Neural vs Neural plays 4
- [x] Counts add up to the games played, and a pairing's results mirror between its two participants
- [x] `--seed` makes results reproducible
- [x] An unknown or incompatible participant gives a clear error
- [x] The CLI prints a win/draw/loss and average margin table
- [x] `train` prints its final report against Greedy and Random and stores it in the Model
- [x] Unit tests on `match` and on the stored report
