import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { parseArgs } from "node:util";
import type { Strategy } from "../src/computer.ts";
import { loadModel } from "../src/model.ts";
import { match } from "../src/training.ts";

const usage = `Usage: npm run match -- PARTICIPANT PARTICIPANT... [--games 10] [--seed N]
  where each PARTICIPANT is a Model file, greedy, hoarder or random`;

/** Prints the problem and the usage, and exits. */
function fail(problem: string): never {
  console.error(`${problem}\n${usage}`);
  process.exit(1);
}

/** The flag's value, or the default when it is omitted; exits with the usage if it isn't a whole number from `min` to `max`. */
function wholeFlag(name: string, value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) fail(`--${name} needs a whole number from ${min} to ${max}`);
  return parsed;
}

/** The participant's name and Strategy; exits if it is not greedy, hoarder, random or a readable, compatible Model. */
function participant(arg: string): { name: string; strategy: Strategy } {
  if (arg === "greedy" || arg === "hoarder" || arg === "random") return { name: arg, strategy: arg };
  try {
    const model = loadModel(JSON.parse(readFileSync(arg, "utf8")));
    return { name: basename(arg, ".json"), strategy: { kind: "neural", model } };
  } catch (error) {
    fail(`${arg} is not greedy, hoarder, random or a readable, compatible Model: ${(error as Error).message}`);
  }
}

const { values, positionals } = parseArgs({
  options: { games: { type: "string" }, seed: { type: "string" } },
  allowPositionals: true,
});
if (positionals.length < 2) fail("Give at least two participants");

const games = wholeFlag("games", values.games, 10, 1, Number.MAX_SAFE_INTEGER);
const seed = wholeFlag("seed", values.seed, Math.floor(Math.random() * 2 ** 32), 0, 2 ** 32 - 1);
const participants = positionals.map(participant);
console.log(`Seed ${seed}`);

const pairings = await match(
  participants.map(({ strategy }) => strategy),
  { games, seed },
);

const rows = pairings.map(({ a, b, games, results: [r] }) => [
  participants[a].name,
  participants[b].name,
  String(games),
  String(r.wins),
  String(r.draws),
  String(r.losses),
  (r.margin >= 0 ? "+" : "") + r.margin.toFixed(4),
]);
const header = ["Participant", "Against", "Games", "Wins", "Draws", "Losses", "Margin"];
const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
// Names are left-aligned, numbers right-aligned.
const format = (row: string[]) => row.map((cell, i) => (i < 2 ? cell.padEnd(widths[i]) : cell.padStart(widths[i]))).join("  ");
console.log([header, ...rows].map(format).join("\n"));
