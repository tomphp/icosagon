# 06: Less noisy Fitness

Status: done

**Hypothesis:** 4 games against each scripted opponent can't separate networks of similar strength, so survival is mostly luck.

**What to do:** Add a `scriptedGames` Training option and flag: how many times each network plays its 4 games against each scripted opponent per Generation. The default is 1, which is the current behaviour. Bench 4 and 8. Compare at equal games played as well as equal Generations, because each Generation costs more.

**Blocked by:** 04 (can run alongside 05)

- [x] Option and flag added; with 1, the same seed still gives the same Model (checked byte for byte against the old code); the default is now 8
- [x] The Training test for Generation game count covers the new option
- [x] Variants benched at equal Generations and at equal games played; kept by judgement, default 8
