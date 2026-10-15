# 08: Give the network a Settled signal

Status: ready-for-agent

**Hypothesis:** The network can't tell area that can still be taken from area that's safe, which is exactly what Hoarder and Clever Hoarder exploit. If ticket 03 shows the inputs are the limit, this is the priority.

**What to do:** Add one input per sample spot: 1 if the Region there is Settled, otherwise 0. This reuses the Computer module's Settled-area logic, which may need exporting. Bump `MODEL_VERSION`, update the `INPUT` layout docs, and regenerate `models/fixture.json`. Existing Models stop loading, which is expected. Judge it with whichever training method won in ticket 03 (`fit`, or Training at the best-so-far settings).

**Blocked by:** 03

- [ ] Input added; `MODEL_VERSION` bumped; fixture regenerated; tests pass
- [ ] Benched against the best-so-far result for the same training method, and recorded
- [ ] If it loses, revert the change completely
