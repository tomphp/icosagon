# 02: Smaller mutation

Status: ready-for-agent

**Hypothesis:** σ 0.05 is too large. Smaller steps let children improve on their parents more often.

**What to do:** Using flags only, run `--mutation` at 0.02, 0.01 and 0.005 on the protocol. If a smaller value wins, change `TRAINING_DEFAULTS.mutation` to it.

**Blocked by:** 01

- [ ] 3 variants × 3 seeds recorded
- [ ] The default updated if a variant wins; a decision line added to the spec
