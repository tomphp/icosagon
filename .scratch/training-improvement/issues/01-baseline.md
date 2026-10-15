# 01: Baseline and protocol budget

Status: done

**What to do:** Time one Generation at the default settings. Pick G so that a run takes 10 minutes at most, and write it into the spec's Protocol. Run the defaults on seeds 1–3 and record the baseline in the Experiment log.

**Blocked by:** None.

- [x] G chosen and written into the spec
- [x] Baseline margins against each scripted opponent recorded for 3 seeds
- [x] Note whether the `vs` margins trend upward at all over G Generations

## Comments

G = 60, about 9.5 minutes a run. Baseline mean −0.295 over seeds 1–3, spread 0.075. The `vs` margins rise over the first ~10 Generations, then plateau: no upward trend over Generations 10–60.
