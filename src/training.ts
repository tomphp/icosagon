import type { Random, Strategy } from "./computer.ts";
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
  /** How many games the best network plays against each of Greedy and Random at the end; 200 when omitted. */
  reportGames?: number;
  /** Called after each Generation's games. */
  onGeneration?: (progress: Progress) => void;
  /** How many worker threads play the games; one per core when omitted, and 1 plays them all on this thread. */
  workers?: number;
}

export const TRAINING_DEFAULTS = { population: 24, hidden: 32, survivors: 0.25, mutation: 0.05, reportGames: 200 } as const;

/** How a Generation went. */
export interface Progress {
  /** Counting from 1 within this run. */
  generation: number;
  /** Every network in the Population with its Fitness, best first. */
  ranked: { network: Network; fitness: number }[];
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

/**
 * One Generation's games, between the Population's networks by index and Greedy, at index `size`:
 * every pair, and every network against Greedy, under both colours and both Endings.
 */
function schedule(size: number, random: Random): GameSpec[] {
  const pairs: [number, number][] = [];
  for (let a = 0; a < size; a++) {
    for (let b = a + 1; b < size; b++) pairs.push([a, b]);
    pairs.push([a, size]);
  }
  return pairs.flatMap(([a, b]) =>
    ENDINGS.flatMap((ending) => [
      { red: a, blue: b, ending, seed: nextSeed(random) },
      { red: b, blue: a, ending, seed: nextSeed(random) },
    ]),
  );
}

/** Each network's Fitness: its average Score margin over a Generation's games. */
async function playGeneration(
  population: Network[],
  random: Random,
  pool: GamePool,
): Promise<{ fitness: number[]; games: number }> {
  // Greedy plays after the Population's networks and has no Fitness.
  const greedy = population.length;
  const totals = population.map(() => ({ margin: 0, games: 0 }));
  const add = (contender: number, margin: number) => {
    if (contender === greedy) return;
    totals[contender].margin += margin;
    totals[contender].games++;
  };
  const games = schedule(population.length, random);
  const played = await pool.play([...population.map(neural), "greedy"], games);
  games.forEach(({ red, blue }, i) => {
    const { scores } = played[i];
    add(red, scores.red - scores.blue);
    add(blue, scores.blue - scores.red);
  });
  return { fitness: totals.map(({ margin, games }) => margin / games), games: games.length };
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

/**
 * Evolves a Population over the Generations and returns it as a Model, ready for its next
 * Generation: the survivors of the last Generation best first, then their mutated copies in the order
 * of the survivor each was copied from. It ends by playing the best network against Greedy and Random
 * and stores the report. The Population starts fresh, or as stored in the `from` Model, whose total
 * Generations this run's add to. The seed fully determines the result.
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
    for (let generation = 1; generation <= options.generations; generation++) {
      const { fitness, games } = await playGeneration(population, random, pool);
      const ranked = population
        .map((network, i) => ({ network, fitness: fitness[i] }))
        .sort((a, b) => b.fitness - a.fitness);
      options.onGeneration?.({ generation, ranked, games });

      const survivors = ranked.slice(0, survivorCount).map(({ network }) => network);
      population = [
        ...survivors,
        ...Array.from({ length: size - survivorCount }, (_, i) =>
          mutate(survivors[i % survivorCount], options.mutation, random),
        ),
      ];
    }

    // The best network, then Greedy and Random.
    const reportGames = options.reportGames ?? TRAINING_DEFAULTS.reportGames;
    const [vsGreedy, vsRandom] = await playGroups(
      pool,
      [neural(population[0]), "greedy", "random"],
      [pairingGames(0, 1, reportGames, random), pairingGames(0, 2, reportGames, random)],
    );
    const report = { greedy: pairResults(vsGreedy)[0], random: pairResults(vsRandom)[0] };
    const generations = (from?.model.generations ?? 0) + options.generations;
    return { ...modelOf(population, options.seed, generations), parent: from?.name ?? null, report };
  } finally {
    await pool.close();
  }
}
