# 06: Give the network a Settled signal

Status: ready-for-agent

**Hypothesis:** The network can't tell area that can still be taken from area that's safe, which is exactly what Hoarder and Clever Hoarder exploit.

**What to do:** Add one input per sample spot: 1 if the Region there is Settled, otherwise 0. This reuses the Computer module's Settled-area logic, which may need exporting. Bump `MODEL_VERSION`, update the `INPUT` layout docs, and regenerate `models/fixture.json`. Existing Models stop loading, which is expected.

**Blocked by:** 05 (so it runs on the best training settings)

- [ ] Input added; `MODEL_VERSION` bumped; fixture regenerated; tests pass
- [ ] Recorded against the best-so-far result
- [ ] If it loses, revert the change completely
