import type { NamedStrategy, Random, Strategy } from "./computer.ts";
import type { Ending } from "./game.ts";
import { gamePool, seeded, type GamePool, type GameSpec, type Played } from "./games.ts";
import { MODEL_VERSION, type Model, type Results } from "./model.ts";
import { INPUT_SIZE, type Network } from "./network.ts";

export interface TrainingOptions {
  generations: number;
  /** How many networks evolve together; when continuing a Model, its Population's size instead. */
  population: number;
  /** Hidden units per network; when continuing a Model, its shape's instead. */
  hidden: number;
  /** The share of the Population that survives each Generation, 0–1; at least one network always does. */
  survivors: number;
  /** The standard deviation of the Gaussian noise added to every weight of a mutated copy. */
  mutation: number;
  seed: number;
  /** The Model to continue Training from, and its name, recorded as the new Model's parent. */
  from?: { model: Model; name: string };
  /** How many games the best network plays against each opponent in the final report; 200 when omitted. */
  reportGames?: number;
  /** Called after each Generation's games. */
  onGeneration?: (progress: Progress) => void;
  /** How many worker threads play the games; one per core when omitted, and 1 plays them all on this thread. */
  workers?: number;
  /** Stops Training early, keeping the Generations completed so far. */
  signal?: AbortSignal;
}

export const TRAINING_DEFAULTS = { population: 24, hidden: 32, survivors: 0.25, mutation: 0.05, reportGames: 200 } as const;

/** How a Generation went. */
export interface Progress {
  /** Counting from 1 within this run. */
  generation: number;
  /** Every network in the Population with its Fitness, best first. */
  ranked: { network: Network; fitness: number }[];
  /** The Population's average Score margin over its games against each scripted opponent. */
  margins: Partial<Record<NamedStrategy, number>>;
  /** How many games the Generation played. */
  games: number;
}

/** A normally distributed number with mean 0 and the standard deviation (Box–Muller). */
const gaussian = (random: Random, deviation: number) =>
  deviation * Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());

/** A network with random weights, scaled so each unit's sum starts in tanh's sensitive range. */
function randomNetwork(hidden: number, random: Random): Network {
  const weights = (length: number, deviation: number) => Array.from({ length }, () => gaussian(random, deviation));
  return {
    hiddenWeights: Array.from({ length: hidden }, () => weights(INPUT_SIZE, 1 / Math.sqrt(INPUT_SIZE))),
    hiddenBiases: Array(hidden).fill(0),
    outputWeights: weights(hidden, 1 / Math.sqrt(hidden)),
    outputBias: 0,
  };
}

/** A copy of the network with Gaussian noise added to every weight. */
function mutate(network: Network, mutation: number, random: Random): Network {
  const noisy = (weights: number[]) => weights.map((w) => w + gaussian(random, mutation));
  return {
    hiddenWeights: network.hiddenWeights.map(noisy),
    hiddenBiases: noisy(network.hiddenBiases),
    outputWeights: noisy(network.outputWeights),
    outputBias: network.outputBias + gaussian(random, mutation),
  };
}

/** A Model of the Population, with no parent or report yet. */
const modelOf = (population: Network[], seed: number, generations: number): Model => ({
  version: MODEL_VERSION,
  shape: { inputs: INPUT_SIZE, hidden: population[0].hiddenBiases.length },
  population,
  seed,
  generations,
  parent: null,
  report: null,
});

/** The Neural Strategy playing with just this network. */
const neural = (network: Network): Strategy => ({ kind: "neural", model: modelOf([network], 0, 0) });

const ENDINGS: Ending[] = ["award", "skip"];

/** The seed of a game's own random source, drawn in turn from `random`, so no game's play depends on another's. */
const nextSeed = (random: Random) => random() * 2 ** 32;

/** The scripted Strategies every network plays in each Generation, in the order they follow the Population. */
export const SCRIPTED = ["greedy", "hoarder", "clever-hoarder"] as const satisfies NamedStrategy[];

/** The opponents in Training's final report: the scripted ones, then Random. */
const REPORTED: NamedStrategy[] = [...SCRIPTED, "random"];

/**
 * One Generation's games, between the Population's networks by index and the scripted opponents, from
 * index `size`: every pair, and every network against each scripted opponent, under both colours and
 * both Endings.
 */
function schedule(size: number, random: Random): GameSpec[] {
  const pairs: [number, number][] = [];
  for (let a = 0; a < size; a++) {
    for (let b = a + 1; b < size; b++) pairs.push([a, b]);
    for (let s = 0; s < SCRIPTED.length; s++) pairs.push([a, size + s]);
  }
  return pairs.flatMap(([a, b]) =>
    ENDINGS.flatMap((ending) => [
      { red: a, blue: b, ending, seed: nextSeed(random) },
      { red: b, blue: a, ending, seed: nextSeed(random) },
    ]),
  );
}

/**
 * Each network's Fitness, its average Score margin over a Generation's games, and the Population's
 * average margin against each scripted opponent.
 */
async function playGeneration(
  population: Network[],
  random: Random,
  pool: GamePool,
  signal?: AbortSignal,
): Promise<{ fitness: number[]; margins: Progress["margins"]; games: number }> {
  // The scripted opponents play after the Population's networks and have no Fitness.
  const size = population.length;
  const totals = population.map(() => ({ margin: 0, games: 0 }));
  const vsScripted = SCRIPTED.map(() => ({ margin: 0, games: 0 }));
  const add = (contender: number, opponent: number, margin: number) => {
    if (contender >= size) return;
    totals[contender].margin += margin;
    totals[contender].games++;
    if (opponent >= size) {
      vsScripted[opponent - size].margin += margin;
      vsScripted[opponent - size].games++;
    }
  };
  const games = schedule(size, random);
  const played = await pool.play([...population.map(neural), ...SCRIPTED], games, signal);
  games.forEach(({ red, blue }, i) => {
    const { scores } = played[i];
    add(red, blue, scores.red - scores.blue);
    add(blue, red, scores.blue - scores.red);
  });
  return {
    fitness: totals.map(({ margin, games }) => margin / games),
    margins: Object.fromEntries(SCRIPTED.map((strategy, s) => [strategy, vsScripted[s].margin / vsScripted[s].games])),
    games: games.length,
  };
}

/** How each participant of a pairing did, from its own point of view. */
type PairResults = [Results, Results];

/**
 * The games between the Strategies at indices `a` and `b`, alternating colours every game and Endings
 * every two, `a` red first.
 */
const pairingGames = (a: number, b: number, games: number, random: Random): GameSpec[] =>
  Array.from({ length: games }, (_, i) => {
    const aIsRed = i % 2 === 0;
    return { red: aIsRed ? a : b, blue: aIsRed ? b : a, ending: ENDINGS[Math.floor(i / 2) % 2], seed: nextSeed(random) };
  });

/** How a pairing's games went, from `pairingGames`. */
function pairResults(played: Played[]): PairResults {
  const totals = { wins: 0, draws: 0, losses: 0, margin: 0 };
  played.forEach(({ scores, outcome }, i) => {
    const aIsRed = i % 2 === 0;
    totals.margin += aIsRed ? scores.red - scores.blue : scores.blue - scores.red;
    if (outcome === "draw") totals.draws++;
    else if ((outcome === "red-wins") === aIsRed) totals.wins++;
    else totals.losses++;
  });
  const { wins, draws, losses, margin } = totals;
  const games = played.length;
  return [
    { wins, draws, losses, margin: margin / games },
    { wins: losses, draws, losses: wins, margin: -margin / games },
  ];
}

export interface MatchOptions {
  /** How many times each pairing plays its 4 games, both colours under both Endings. */
  games: number;
  seed: number;
  /** How many worker threads play the games; one per core when omitted, and 1 plays them all on this thread. */
  workers?: number;
}

/** How a pair of participants, by index, did against each other. */
export interface Pairing {
  a: number;
  b: number;
  games: number;
  /** The first participant's results, then the second's. */
  results: PairResults;
}

/**
 * Plays every pair of participants against each other under both colours and both Endings, `games`
 * times over. Neural vs Neural is deterministic, so it plays its 4 distinct games once. The seed fully
 * determines the results.
 */
export async function match(participants: Strategy[], options: MatchOptions): Promise<Pairing[]> {
  const random = seeded(options.seed);
  const pairings: { a: number; b: number; games: GameSpec[] }[] = [];
  for (let a = 0; a < participants.length; a++) {
    for (let b = a + 1; b < participants.length; b++) {
      const bothNeural = typeof participants[a] === "object" && typeof participants[b] === "object";
      pairings.push({ a, b, games: pairingGames(a, b, 4 * (bothNeural ? 1 : options.games), random) });
    }
  }
  const pool = gamePool(options.workers);
  try {
    // Every pairing's games in one batch, so even a few long pairings keep every thread busy.
    const played = await playGroups(pool, participants, pairings.map(({ games }) => games));
    return pairings.map(({ a, b, games }, i) => ({ a, b, games: games.length, results: pairResults(played[i]) }));
  } finally {
    await pool.close();
  }
}

/** Plays several groups of games in one batch and returns how each group's games ended. */
async function playGroups(pool: GamePool, strategies: Strategy[], groups: GameSpec[][]): Promise<Played[][]> {
  const played = await pool.play(strategies, groups.flat());
  let start = 0;
  return groups.map((games) => played.slice(start, (start += games.length)));
}

/** How the Strategy did in `games` games against each reported opponent. */
async function playReport(pool: GamePool, strategy: Strategy, games: number, random: Random): Promise<NonNullable<Model["report"]>> {
  // The Strategy, then each reported opponent.
  const played = await playGroups(
    pool,
    [strategy, ...REPORTED],
    REPORTED.map((_, r) => pairingGames(0, 1 + r, games, random)),
  );
  return Object.fromEntries(REPORTED.map((opponent, r) => [opponent, pairResults(played[r])[0]]));
}

/**
 * Plays a Model's best network against the opponents of Training's final report, `games` games each. The seed
 * fully determines the results.
 */
export async function report(model: Model, options: { games: number; seed: number; workers?: number }): Promise<NonNullable<Model["report"]>> {
  const pool = gamePool(options.workers);
  try {
    return await playReport(pool, { kind: "neural", model }, options.games, seeded(options.seed));
  } finally {
    await pool.close();
  }
}

/**
 * Evolves a Population over the Generations and returns it as a Model, ready for its next
 * Generation: the survivors of the last Generation best first, then their mutated copies in the order
 * of the survivor each was copied from. It ends by playing the best network against each scripted
 * opponent and Random and stores the report. The Population starts fresh, or as stored in the `from`
 * Model, whose total Generations this run's add to. The seed fully determines the result.
 *
 * When the signal is aborted, the Generation in progress is dropped and Training ends as if it had been asked
 * for only the Generations it completed, though the final report's games differ.
 */
export async function train(options: TrainingOptions): Promise<Model> {
  const random = seeded(options.seed);
  const { from } = options;
  let population =
    from?.model.population ?? Array.from({ length: options.population }, () => randomNetwork(options.hidden, random));
  const size = population.length;
  const survivorCount = Math.max(1, Math.round(options.survivors * size));
  const pool = gamePool(options.workers);
  try {
    let completed = 0;
    for (let generation = 1; generation <= options.generations; generation++) {
      let played;
      try {
        played = await playGeneration(population, random, pool, options.signal);
      } catch (error) {
        // Stopped: the Generation in progress is dropped, and the last complete one stands.
        if (options.signal?.aborted) break;
        throw error;
      }
      const { fitness, margins, games } = played;
      const ranked = population
        .map((network, i) => ({ network, fitness: fitness[i] }))
        .sort((a, b) => b.fitness - a.fitness);
      options.onGeneration?.({ generation, ranked, margins, games });

      const survivors = ranked.slice(0, survivorCount).map(({ network }) => network);
      population = [
        ...survivors,
        ...Array.from({ length: size - survivorCount }, (_, i) =>
          mutate(survivors[i % survivorCount], options.mutation, random),
        ),
      ];
      completed = generation;
    }

    const report = await playReport(pool, neural(population[0]), options.reportGames ?? TRAINING_DEFAULTS.reportGames, random);
    const generations = (from?.model.generations ?? 0) + completed;
    return { ...modelOf(population, options.seed, generations), parent: from?.name ?? null, report };
  } finally {
    await pool.close();
  }
}
