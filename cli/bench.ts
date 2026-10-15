import { spawn } from "node:child_process";
import { createWriteStream, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { summarise, verdict, type BenchResult, type SeedResult } from "../src/bench.ts";
import { loadModel, type Model } from "../src/model.ts";
import { report, SCRIPTED, TRAINING_DEFAULTS } from "../src/training.ts";

const SEEDS = [1, 2, 3];
const GENERATIONS = "60";

const usage = `Usage: npm run bench -- --out DIR/NAME [--best RESULTS.json] [TRAINING FLAGS | MODEL MODEL MODEL]
  Trains with the Training flags (--generations ${GENERATIONS} unless --generations or --games is given) on seeds
  ${SEEDS.join(", ")}, or reports the three Models, one per seed. Writes DIR/NAME-sSEED.log and the results to DIR/NAME.json.`;

/** Prints the problem and the usage, and exits. */
function fail(problem: string): never {
  console.error(`${problem}\n${usage}`);
  process.exit(1);
}

// Bench's own flags; every other flag, with its value, goes to Training.
let out: string | undefined;
let best: string | undefined;
const forwarded: string[] = [];
const models: string[] = [];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!arg.startsWith("--")) models.push(arg);
  else if (args[i + 1] === undefined) fail(`${arg} needs a value`);
  else if (arg === "--out") out = args[++i];
  else if (arg === "--best") best = args[++i];
  else if (arg === "--seed") fail("Bench sets the seeds");
  else forwarded.push(arg, args[++i]);
}
if (!out) fail("--out is required");
if (models.length > 0 && (models.length !== SEEDS.length || forwarded.length > 0)) {
  fail(`Give either Training flags or exactly ${SEEDS.length} Models`);
}

/** The best-so-far results in the file; exits if it can't be read. */
function readResults(path: string): BenchResult {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`--best ${path} is not a readable results file: ${(error as Error).message}`);
  }
}
const bestResult = best === undefined ? undefined : readResults(best);

/** The Model in the file; exits if it isn't a readable, compatible Model. */
function readModel(path: string): Model {
  try {
    return loadModel(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    fail(`${path} is not a readable, compatible Model: ${(error as Error).message}`);
  }
}

/** The margin with its sign, to 4 decimal places. */
const signed = (margin: number) => (margin >= 0 ? "+" : "") + margin.toFixed(4);

/** The margins against the benched opponents in a Model's report. */
const marginsOf = (r: Model["report"]) =>
  Object.fromEntries(SCRIPTED.map((opponent) => [opponent, r![opponent]!.margin])) as SeedResult["margins"];

/** Trains on the seed with the forwarded flags, echoing and logging its output, and returns how its Model did. */
async function trainSeed(seed: number, modelDir: string, log: string): Promise<Omit<SeedResult, "mean">> {
  const budget = forwarded.includes("--generations") || forwarded.includes("--games") ? [] : ["--generations", GENERATIONS];
  const modelPath = join(modelDir, `${basename(out!)}-s${seed}.json`);
  const trainArgs = [...budget, ...forwarded, "--seed", String(seed), "--out", modelPath];
  const child = spawn(process.execPath, [new URL("train.ts", import.meta.url).pathname, ...trainArgs], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const file = createWriteStream(log);
  let output = "";
  child.stdout.on("data", (chunk: Buffer) => {
    process.stdout.write(chunk);
    file.write(chunk);
    output += chunk;
  });
  const code = await new Promise<number | null>((resolve) => child.on("close", resolve));
  file.end();
  if (code !== 0) fail(`Training on seed ${seed} failed`);
  if (output.includes("Stopped after")) fail(`Training on seed ${seed} was stopped early`);
  const played = /Played (\d+) games/.exec(output);
  if (!played) fail(`Training on seed ${seed} didn't say how many games it played`);
  return { seed, margins: marginsOf(readModel(modelPath).report), games: Number(played[1]) };
}

/** Reports the Model with the seed, logging the report, and returns how it did. */
async function reportSeed(seed: number, path: string, log: string): Promise<Omit<SeedResult, "mean">> {
  const reported = await report(readModel(path), { games: TRAINING_DEFAULTS.reportGames, seed });
  const lines = SCRIPTED.map((opponent) => `${basename(path)} vs ${opponent}: average margin ${signed(reported[opponent]!.margin)}`);
  writeFileSync(log, lines.join("\n") + "\n");
  const games = Object.values(reported).reduce((sum, r) => sum + r.wins + r.draws + r.losses, 0);
  return { seed, margins: marginsOf(reported), games };
}

const modelDir = mkdtempSync(join(tmpdir(), "bench-"));
const runs: Omit<SeedResult, "mean">[] = [];
for (const [i, seed] of SEEDS.entries()) {
  const log = `${out}-s${seed}.log`;
  runs.push(models.length > 0 ? await reportSeed(seed, models[i], log) : await trainSeed(seed, modelDir, log));
}

const result = summarise(runs);
for (const { seed, margins, mean, games } of result.seeds) {
  const vs = SCRIPTED.map((opponent) => `${opponent} ${signed(margins[opponent])}`).join(", ");
  console.log(`Seed ${seed}: ${vs}, mean ${signed(mean)}, ${games} games`);
}
console.log(`Mean ${signed(result.mean)}, spread ${result.spread.toFixed(4)}, ${result.games} games played`);
if (models.length === 0) console.log(`Models in ${modelDir}`);
if (bestResult) {
  const { kept, reason } = verdict(result, bestResult);
  console.log(`${kept ? "Kept" : "Not kept"} against ${best}: ${reason}`);
}
writeFileSync(`${out}.json`, JSON.stringify({ args: process.argv.slice(2), ...result }, null, 2) + "\n");
console.log(`Wrote ${out}.json`);
