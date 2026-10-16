# 10: Wrap up

Status: done

**What to do:** Review the Experiment log. Decide whether the gains justify the 1-ply ceiling ticket (lookahead), and which training method the shipped Models should use. Check that ADR 0001 matches what was kept. Retrain the shipped Models with the final method and defaults if they changed.

**Blocked by:** 07, 08, 09

## Comments

**Training a stronger Model with a few hours to spare.** Use the default settings, and spend the time on several seeds rather than one very long run:

- More Generations help only slowly. In the 60-Generation runs of ticket 06 (about 27 minutes per seed on 16 cores), most of the gain comes in the first 20–30 Generations. After that the Hoarder margins creep up by about 0.03–0.1 over 30 more. At the final report, 60 Generations scored +0.060 against +0.054 at 25.
- Final margins differ between seeds by 0.1 or more, so picking the best of several runs gains more.

For example, 3 seeds of 100 Generations each, about 45 minutes per seed:

```sh
for s in 11 12 13; do npm run train -- --generations 100 --seed $s --out models/candidate-s$s.json; done
```

Keep the one with the best final-report margins against the Hoarders, then optionally continue it with `--from`. Picking the best of several by its 200-game report flatters it slightly, so re-check it with `npm run match` before shipping it.

Untested: continuing evolution from a fitted Model (`npm run train -- --from models/fit-settled-s1.json`).
