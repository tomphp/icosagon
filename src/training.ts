import { chooseMove, type Random, type Strategy } from "./computer.ts";
import { applyMove, createGame, type Ending, type Game } from "./game.ts";
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

/** Plays a whole game between the Strategies and returns it at Game over. */
function playGame(red: Strategy, blue: Strategy, ending: Ending, random: Random): Game {
  let game = createGame(ending);
  while (game.outcome === "in-progress") {
    game = applyMove(game, chooseMove(game, game.mover === "red" ? red : blue, random));
  }
  return game;
}

/** A network in the Population, by index, or Greedy. */
type Contender = number | "greedy";

const ENDINGS: Ending[] = ["award", "skip"];

/** One Generation's games: every pair, and every network against Greedy, under both colours and both Endings. */
function schedule(size: number): { red: Contender; blue: Contender; ending: Ending }[] {
  const pairs: [Contender, Contender][] = [];
  for (let a = 0; a < size; a++) {
    for (let b = a + 1; b < size; b++) pairs.push([a, b]);
    pairs.push([a, "greedy"]);
  }
  return pairs.flatMap(([a, b]) =>
    ENDINGS.flatMap((ending) => [
      { red: a, blue: b, ending },
      { red: b, blue: a, ending },
    ]),
  );
}

/** Each network's Fitness: its average Score margin over a Generation's games. */
function playGeneration(population: Network[], random: Random): { fitness: number[]; games: number } {
  const strategies = population.map(neural);
  const strategy = (c: Contender) => (c === "greedy" ? "greedy" : strategies[c]);
  const totals = population.map(() => ({ margin: 0, games: 0 }));
  const add = (c: Contender, margin: number) => {
    if (c === "greedy") return;
    totals[c].margin += margin;
    totals[c].games++;
  };
  const games = schedule(population.length);
  for (const { red, blue, ending } of games) {
    // Each game has its own random source, seeded in schedule order, so no game's play depends on another's.
    const { scores } = playGame(strategy(red), strategy(blue), ending, seeded(random() * 2 ** 32));
    add(red, scores.red - scores.blue);
    add(blue, scores.blue - scores.red);
  }
  return { fitness: totals.map(({ margin, games }) => margin / games), games: games.length };
}

/** How each participant of a pairing did, from its own point of view. */
type PairResults = [Results, Results];

/**
 * Plays the games between the two Strategies, alternating colours every game and Endings every two,
 * each game with its own random source seeded in turn from `random`.
 */
function playPairing(a: Strategy, b: Strategy, games: number, random: Random): PairResults {
  const totals = { wins: 0, draws: 0, losses: 0, margin: 0 };
  for (let i = 0; i < games; i++) {
    const aIsRed = i % 2 === 0;
    const ending = ENDINGS[Math.floor(i / 2) % 2];
    const { scores, outcome } = playGame(aIsRed ? a : b, aIsRed ? b : a, ending, seeded(random() * 2 ** 32));
    totals.margin += aIsRed ? scores.red - scores.blue : scores.blue - scores.red;
    if (outcome === "draw") totals.draws++;
    else if ((outcome === "red-wins") === aIsRed) totals.wins++;
    else totals.losses++;
  }
  const { wins, draws, losses, margin } = totals;
  return [
    { wins, draws, losses, margin: margin / games },
    { wins: losses, draws, losses: wins, margin: -margin / games },
  ];
}

export interface MatchOptions {
  /** How many times each pairing plays its 4 games, both colours under both Endings. */
  games: number;
  seed: number;
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
export function match(participants: Strategy[], options: MatchOptions): Pairing[] {
  const random = seeded(options.seed);
  const pairings: Pairing[] = [];
  for (let a = 0; a < participants.length; a++) {
    for (let b = a + 1; b < participants.length; b++) {
      const bothNeural = typeof participants[a] === "object" && typeof participants[b] === "object";
      const games = 4 * (bothNeural ? 1 : options.games);
      pairings.push({ a, b, games, results: playPairing(participants[a], participants[b], games, random) });
    }
  }
  return pairings;
}

/**
 * Evolves a Population over the Generations and returns it as a Model, ready for its next
 * Generation: the survivors of the last Generation best first, then their mutated copies in the order
 * of the survivor each was copied from. It ends by playing the best network against Greedy and Random
 * and stores the report. The Population starts fresh, or as stored in the `from` Model, whose total
 * Generations this run's add to. The seed fully determines the result.
 */
export function train(options: TrainingOptions): Model {
  const random = seeded(options.seed);
  const { from } = options;
  let population =
    from?.model.population ?? Array.from({ length: options.population }, () => randomNetwork(options.hidden, random));
  const size = population.length;
  const survivorCount = Math.max(1, Math.round(options.survivors * size));

  for (let generation = 1; generation <= options.generations; generation++) {
    const { fitness, games } = playGeneration(population, random);
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

  const best = neural(population[0]);
  const reportGames = options.reportGames ?? TRAINING_DEFAULTS.reportGames;
  const report = {
    greedy: playPairing(best, "greedy", reportGames, random)[0],
    random: playPairing(best, "random", reportGames, random)[0],
  };
  const generations = (from?.model.generations ?? 0) + options.generations;
  return { ...modelOf(population, options.seed, generations), parent: from?.name ?? null, report };
}
