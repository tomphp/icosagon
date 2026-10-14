import { parentPort } from "node:worker_threads";
import type { Strategy } from "./computer.ts";
import { playHere, type GameSpec } from "./games.ts";

// Plays each batch of games it is sent and sends back how they ended.
parentPort!.on("message", ({ strategies, games }: { strategies: Strategy[]; games: GameSpec[] }) =>
  parentPort!.postMessage(playHere(strategies, games)),
);
