import { once } from "node:events";
import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";
import { chooseMove, type Random, type Strategy } from "./computer.ts";
import { applyMove, createGame, type Ending, type Game } from "./game.ts";

/** A seeded source of random numbers in [0, 1) (mulberry32). */
export function seeded(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** A game to play: its Strategies, by index, the Ending and the seed of the game's own random source. */
export interface GameSpec {
  red: number;
  blue: number;
  ending: Ending;
  seed: number;
}

/** How a game ended. */
export type Played = Pick<Game, "scores" | "outcome">;

/** Plays a whole game between the Strategies and returns how it ended. */
function playGame(red: Strategy, blue: Strategy, ending: Ending, seed: number): Played {
  const random = seeded(seed);
  let game = createGame(ending);
  while (game.outcome === "in-progress") {
    game = applyMove(game, chooseMove(game, game.mover === "red" ? red : blue, random));
  }
  return { scores: game.scores, outcome: game.outcome };
}

/** Plays the games one after another on this thread, in order. */
export const playHere = (strategies: Strategy[], games: GameSpec[]): Played[] =>
  games.map(({ red, blue, ending, seed }) => playGame(strategies[red], strategies[blue], ending, seed));

/** Plays batches of games, possibly across worker threads, until closed. */
export interface GamePool {
  /** Plays the games and returns how each ended, in order. */
  play(strategies: Strategy[], games: GameSpec[]): Promise<Played[]>;
  close(): Promise<void>;
}

/**
 * A pool of games spread across `workers` threads, one per core when omitted; 1 plays every game on this thread.
 * Each game has its own seed, so how it ends doesn't depend on which thread plays it.
 */
export function gamePool(workers = availableParallelism()): GamePool {
  if (workers <= 1) return { play: async (strategies, games) => playHere(strategies, games), close: async () => {} };

  const threads = Array.from({ length: workers }, () => new Worker(new URL("./games-worker.ts", import.meta.url)));
  return {
    async play(strategies, games) {
      // Dealt out in turn, so each thread gets a similar mix of slow Neural and quick Greedy and Random games.
      const played = await Promise.all(
        threads.map(async (thread, t) => {
          const dealt = games.filter((_, i) => i % workers === t);
          if (dealt.length === 0) return [];
          thread.postMessage({ strategies, games: dealt });
          const [results] = await once(thread, "message");
          return results as Played[];
        }),
      );
      return games.map((_, i) => played[i % workers][Math.floor(i / workers)]);
    },
    async close() {
      await Promise.all(threads.map((thread) => thread.terminate()));
    },
  };
}
