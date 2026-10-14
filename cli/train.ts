import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { saveModel } from "../src/model.ts";
import { train, TRAINING_DEFAULTS } from "../src/training.ts";

const usage = `Usage: npm run train -- --generations N --out models/NAME.json
  [--population ${TRAINING_DEFAULTS.population}] [--hidden ${TRAINING_DEFAULTS.hidden}]
  [--survivors ${TRAINING_DEFAULTS.survivors}] [--mutation ${TRAINING_DEFAULTS.mutation}] [--seed N]`;

/** Prints the problem and the usage, and exits. */
function fail(problem: string): never {
  console.error(`${problem}\n${usage}`);
  process.exit(1);
}

const whole = (min: number, max = Number.MAX_SAFE_INTEGER) => (n: number) => Number.isInteger(n) && n >= min && n <= max;
const between = (min: number, max: number) => (n: number) => n >= min && n <= max;

/** The flag's value, or the default when it is omitted; exits with the usage if it isn't a number that `valid` accepts. */
function numberFlag(name: string, value: string | undefined, valid: (n: number) => boolean, fallback?: number): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (parsed === undefined || !valid(parsed)) fail(`--${name} needs a valid number`);
  return parsed;
}

const { values } = parseArgs({
  options: {
    generations: { type: "string" },
    population: { type: "string" },
    hidden: { type: "string" },
    survivors: { type: "string" },
    mutation: { type: "string" },
    seed: { type: "string" },
    out: { type: "string" },
  },
});
if (!values.out) fail("--out is required");

const seed = numberFlag("seed", values.seed, whole(0, 2 ** 32 - 1), Math.floor(Math.random() * 2 ** 32));
const generations = numberFlag("generations", values.generations, whole(1));
const population = numberFlag("population", values.population, whole(2), TRAINING_DEFAULTS.population);
const hidden = numberFlag("hidden", values.hidden, whole(1), TRAINING_DEFAULTS.hidden);
const survivors = numberFlag("survivors", values.survivors, between(0, 1), TRAINING_DEFAULTS.survivors);
const mutation = numberFlag("mutation", values.mutation, between(0, Infinity), TRAINING_DEFAULTS.mutation);
console.log(`Seed ${seed}`);

let games = 0;
const model = train({
  generations,
  population,
  hidden,
  survivors,
  mutation,
  seed,
  onGeneration: (progress) => {
    games += progress.games;
    const fitness = progress.ranked.map((r) => r.fitness);
    const average = fitness.reduce((sum, f) => sum + f, 0) / fitness.length;
    console.log(
      `Generation ${progress.generation}/${generations}: best ${fitness[0].toFixed(4)}, average ${average.toFixed(4)}`,
    );
  },
});

writeFileSync(values.out, saveModel(model));
console.log(`Played ${games} games. Wrote ${values.out}`);
