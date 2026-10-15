# 04: Less noisy Fitness

Status: ready-for-agent

**Hypothesis:** 4 games against each scripted opponent can't separate networks of similar strength, so survival is mostly luck.

**What to do:** Add a `scriptedGames` Training option and flag: how many times each network plays its 4 games against each scripted opponent per Generation. The default is 1, which is the current behaviour. Try 4 and 8. Compare at equal games played as well as equal Generations, because each Generation costs more.

**Blocked by:** 02 (can run alongside 03)

- [ ] Option and flag added; the default gives the same Model for the same seed
- [ ] The Training test for Generation game count covers the new option
- [ ] Variants recorded at equal Generations and at equal games played; kept or removed
