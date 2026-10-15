import { describe, expect, it } from "vitest";
import { summarise, verdict, type BenchResult } from "./bench.ts";

/** A seed's run whose margins against all three scripted opponents are `margin`. */
const run = (seed: number, margin: number, games = 100) => ({
  seed,
  margins: { greedy: margin, hoarder: margin, "clever-hoarder": margin },
  games,
});

/** A result with these per-seed means, for seeds 1, 2, 3. */
const result = (...means: number[]): BenchResult => summarise(means.map((m, i) => run(i + 1, m)));

describe("summarise", () => {
  it("averages each seed's margins, then the seeds, and gives the spread and total games", () => {
    const summary = summarise([
      { seed: 1, margins: { greedy: -0.18, hoarder: -0.39, "clever-hoarder": -0.36 }, games: 84320 },
      run(2, -0.1, 84320),
      run(3, -0.4, 84320),
    ]);
    expect(summary.seeds.map((s) => s.mean)).toEqual([-0.31, -0.1, -0.4].map((m) => expect.closeTo(m)));
    expect(summary.mean).toBeCloseTo(-0.27);
    expect(summary.spread).toBeCloseTo(0.3);
    expect(summary.games).toBe(3 * 84320);
  });
});

describe("verdict", () => {
  const best = result(-0.3, -0.25, -0.33); // mean -0.293, spread 0.08

  it("keeps a variant that beats the best's mean by more than the spread with no seed clearly worse", () => {
    expect(verdict(result(-0.15, -0.2, -0.18), best).kept).toBe(true);
  });

  it("doesn't keep a variant whose gain is within the spread", () => {
    expect(verdict(result(-0.25, -0.2, -0.28), best).kept).toBe(false);
  });

  it("doesn't keep a variant with a seed clearly worse than the best's same seed, even if its mean wins", () => {
    // Seed 2 drops 0.1 below the best's seed 2, more than the spread of 0.08.
    const lopsided = result(0.2, -0.35, -0.13);
    expect(lopsided.mean - best.mean).toBeGreaterThan(best.spread);
    const { kept, reason } = verdict(lopsided, best);
    expect(kept).toBe(false);
    expect(reason).toContain("seed 2");
  });
});
