# 04: Continue Training a lineage with `--from`

Status: ready-for-agent

**What to build:** `train --from <model>` continues Training from that Model's whole Population as stored, rather than a fresh one. The new Model's total Generations is the old total plus this run's, and the parent Model's name is recorded. An unreadable or incompatible `--from` Model is a clear error. Without `--from`, Training starts fresh as before.

See `.scratch/neural-strategy/spec.md`.

**Blocked by:** 02 (`train` CLI: evolve a fresh Population).

- [ ] `--from` starts from the stored Population
- [ ] Total Generations adds up across the lineage, and the selector label reflects it
- [ ] The parent Model is recorded
- [ ] An unreadable or incompatible `--from` Model gives a clear error
- [ ] Unit tests for continuing a Model
