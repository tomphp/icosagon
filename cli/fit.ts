import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { fit, FIT_DEFAULTS } from "../src/fit.ts";
import { saveModel } from "../src/model.ts";
import { TRAINING_DEFAULTS } from "../src/training.ts";

const usage = `Usage: npm run fit -- --out models/NAME.json [--games ${FIT_DEFAULTS.games}] [--epochs ${FIT_DEFAULTS.epochs}]
  [--rate ${FIT_DEFAULTS.rate}] [--hidden ${TRAINING_DEFAULTS.hidden}] [--seed N]`;

/** Prints the problem and the usage, and exits. */
function fail(problem: string): never {
  console.error(`${problem}\n${usage}`);
  process.exit(1);
}

const whole = (min: number, max = Number.MAX_SAFE_INTEGER) => (n: number) => Number.isInteger(n) && n >= min && n <= max;

/** The flag's value, or the default when it is omitted; exits with the usage if it isn't a number that `valid` accepts. */
function numberFlag(name: string, value: string | undefined, valid: (n: number) => boolean, fallback?: number): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (parsed === undefined || !valid(parsed)) fail(`--${name} needs a valid number`);
  return parsed;
}

const { values } = parseArgs({
  options: {
    games: { type: "string" },
    epochs: { type: "string" },
    rate: { type: "string" },
    hidden: { type: "string" },
    seed: { type: "string" },
    out: { type: "string" },
  },
});
if (!values.out) fail("--out is required");

const games = numberFlag("games", values.games, whole(1), FIT_DEFAULTS.games);
const epochs = numberFlag("epochs", values.epochs, whole(1), FIT_DEFAULTS.epochs);
const rate = numberFlag("rate", values.rate, (n) => n > 0, FIT_DEFAULTS.rate);
const hidden = numberFlag("hidden", values.hidden, whole(1), TRAINING_DEFAULTS.hidden);
const seed = numberFlag("seed", values.seed, whole(0, 2 ** 32 - 1), Math.floor(Math.random() * 2 ** 32));
console.log(`Seed ${seed}`);

/** The margin with its sign, to 4 decimal places. */
const signed = (margin: number) => (margin >= 0 ? "+" : "") + margin.toFixed(4);

const model = await fit({
  games,
  epochs,
  rate,
  hidden,
  seed,
  onPositions: (count) => console.log(`Played ${games} games: ${count} positions`),
  onEpoch: (epoch, error) => console.log(`Epoch ${epoch}/${epochs}: mean squared error ${error.toFixed(5)}`),
});

let reportGames = 0;
for (const [opponent, r] of Object.entries(model.report!)) {
  console.log(`Fitted vs ${opponent}: ${r.wins} wins, ${r.draws} draws, ${r.losses} losses, average margin ${signed(r.margin)}`);
  reportGames += r.wins + r.draws + r.losses;
}

writeFileSync(values.out, saveModel(model));
console.log(`Played ${games + reportGames} games. Wrote ${values.out}`);
