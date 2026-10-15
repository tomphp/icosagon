import { SCRIPTED } from "./training.ts";

/** The protocol's metric averages over the scripted opponents. */
type Scripted = (typeof SCRIPTED)[number];

/** One seed's run: its final-report margins, their mean and how many games it played. */
export interface SeedResult {
  seed: number;
  margins: Record<Scripted, number>;
  mean: number;
  games: number;
}

/** A variant's runs over the seeds, as saved to and read back from a results file. */
export interface BenchResult {
  seeds: SeedResult[];
  /** The mean of the seeds' means. */
  mean: number;
  /** The highest seed mean less the lowest. */
  spread: number;
  games: number;
}

const average = (ns: number[]) => ns.reduce((sum, n) => sum + n, 0) / ns.length;

/** The runs with each seed's mean, and the mean, spread and total games over the seeds. */
export function summarise(runs: Omit<SeedResult, "mean">[]): BenchResult {
  const seeds = runs.map((run) => ({ ...run, mean: average(SCRIPTED.map((opponent) => run.margins[opponent])) }));
  const means = seeds.map((s) => s.mean);
  return {
    seeds,
    mean: average(means),
    spread: Math.max(...means) - Math.min(...means),
    games: seeds.reduce((sum, s) => sum + s.games, 0),
  };
}

/**
 * The spec's win rule, taking the best-so-far's spread as the noise: the variant is kept if its mean beats
 * the best's by more than that, and none of its seeds is below the best's same seed by more than that.
 */
export function verdict(variant: BenchResult, best: BenchResult): { kept: boolean; reason: string } {
  const noise = best.spread;
  const gain = variant.mean - best.mean;
  if (gain <= noise) return { kept: false, reason: `gain ${gain.toFixed(3)} doesn't beat the spread ${noise.toFixed(3)}` };
  const worse = variant.seeds.find(({ seed, mean }) => {
    const same = best.seeds.find((s) => s.seed === seed);
    return same !== undefined && mean < same.mean - noise;
  });
  if (worse) return { kept: false, reason: `seed ${worse.seed} is more than the spread ${noise.toFixed(3)} worse` };
  return { kept: true, reason: `gain ${gain.toFixed(3)} beats the spread ${noise.toFixed(3)}` };
}
