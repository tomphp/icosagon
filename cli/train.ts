import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { parseArgs } from "node:util";
import { loadModel, saveModel, type Model } from "../src/model.ts";
import { train, TRAINING_DEFAULTS } from "../src/training.ts";

const usage = `Usage: npm run train -- --generations N --out models/NAME.json
  [--from MODEL | --population ${TRAINING_DEFAULTS.population} --hidden ${TRAINING_DEFAULTS.hidden}]
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
    from: { type: "string" },
  },
});
if (!values.out) fail("--out is required");
if (values.from && (values.population || values.hidden)) {
  fail("--population and --hidden come from the --from Model, so can't be given with it");
}

/** The Model in the file and its name; exits if it isn't a readable, compatible Model. */
function fromModel(path: string): { model: Model; name: string } {
  try {
    return { model: loadModel(JSON.parse(readFileSync(path, "utf8"))), name: basename(path, ".json") };
  } catch (error) {
    fail(`--from ${path} is not a readable, compatible Model: ${(error as Error).message}`);
  }
}
const from = values.from ? fromModel(values.from) : undefined;

const seed = numberFlag("seed", values.seed, whole(0, 2 ** 32 - 1), Math.floor(Math.random() * 2 ** 32));
const generations = numberFlag("generations", values.generations, whole(1));
const population = numberFlag("population", values.population, whole(2), TRAINING_DEFAULTS.population);
const hidden = numberFlag("hidden", values.hidden, whole(1), TRAINING_DEFAULTS.hidden);
const survivors = numberFlag("survivors", values.survivors, between(0, 1), TRAINING_DEFAULTS.survivors);
const mutation = numberFlag("mutation", values.mutation, between(0, Infinity), TRAINING_DEFAULTS.mutation);
console.log(`Seed ${seed}`);
if (from) console.log(`Continuing ${from.name} (${from.model.generations} gens)`);

/** The margin with its sign, to 4 decimal places. */
const signed = (margin: number) => (margin >= 0 ? "+" : "") + margin.toFixed(4);

// The first Ctrl-C stops after the last complete Generation and still writes the Model; a second quits at once.
const stop = new AbortController();
process.on("SIGINT", () => {
  if (stop.signal.aborted) process.exit(130);
  console.log("Stopping: dropping the Generation in progress. Ctrl-C again to quit without writing.");
  stop.abort();
});

let games = 0;
const model = await train({
  generations,
  population,
  hidden,
  survivors,
  mutation,
  seed,
  from,
  signal: stop.signal,
  onGeneration: (progress) => {
    games += progress.games;
    const fitness = progress.ranked.map((r) => r.fitness);
    const average = fitness.reduce((sum, f) => sum + f, 0) / fitness.length;
    const stats = [
      `best ${fitness[0].toFixed(4)}`,
      `average ${average.toFixed(4)}`,
      ...Object.entries(progress.margins).map(([opponent, margin]) => `vs ${opponent} ${signed(margin)}`),
    ];
    console.log(`Generation ${progress.generation}/${generations}: ${stats.join(", ")}`);
  },
});
if (stop.signal.aborted) console.log(`Stopped after ${model.generations - (from?.model.generations ?? 0)} of ${generations} Generations`);

for (const [opponent, r] of Object.entries(model.report!)) {
  const margin = signed(r.margin);
  console.log(`Best vs ${opponent}: ${r.wins} wins, ${r.draws} draws, ${r.losses} losses, average margin ${margin}`);
  games += r.wins + r.draws + r.losses;
}

writeFileSync(values.out, saveModel(model));
console.log(`Played ${games} games. Wrote ${values.out} (${model.generations} gens)`);
