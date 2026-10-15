import type { Random } from "./computer.ts";
import { applyMove, createGame, opponentOf } from "./game.ts";
import { gamePool, seeded, type GameSpec } from "./games.ts";
import type { Model } from "./model.ts";
import { forward, inputsFor, type Network } from "./network.ts";
import { ENDINGS, modelOf, nextSeed, randomNetwork, report, SCRIPTED, TRAINING_DEFAULTS } from "./training.ts";

/** A position's inputs, from the Mover's point of view just after their Move, and that game's final Score margin for them. */
export interface Sample {
  inputs: number[];
  target: number;
}

export interface FitOptions {
  /** How many games among the scripted Strategies to learn from. */
  games: number;
  /** How many passes over every position. */
  epochs: number;
  /** The SGD learning rate. */
  rate: number;
  hidden: number;
  seed: number;
  /** How many games the network plays against each opponent in the final report; 200 when omitted. */
  reportGames?: number;
  /** Called after the positions are collected, with how many there are. */
  onPositions?: (count: number) => void;
  /** Called after each epoch with the mean squared error over every position. */
  onEpoch?: (epoch: number, error: number) => void;
  /** How many worker threads play the games; one per core when omitted, and 1 plays them all on this thread. */
  workers?: number;
}

export const FIT_DEFAULTS = { games: 20_000, epochs: 30, rate: 0.05 } as const;

/** The share of Moves played as Random, so the games reach positions the scripted Strategies alone wouldn't. */
const RANDOM_SHARE = 0.1;
const BATCH_SIZE = 32;

/** The mean squared error of the network's ratings against the targets. */
export function loss(network: Network, samples: Sample[]): number {
  return samples.reduce((sum, { inputs, target }) => sum + (forward(network, inputs).output - target) ** 2, 0) / samples.length;
}

/** The gradient of `loss` with respect to every weight, shaped like the network. */
export function gradient(network: Network, samples: Sample[]): Network {
  const grad: Network = {
    hiddenWeights: network.hiddenWeights.map((row) => row.map(() => 0)),
    hiddenBiases: network.hiddenBiases.map(() => 0),
    outputWeights: network.outputWeights.map(() => 0),
    outputBias: 0,
  };
  for (const { inputs, target } of samples) {
    const { hidden, output } = forward(network, inputs);
    const dOutput = (2 * (output - target)) / samples.length;
    grad.outputBias += dOutput;
    for (let h = 0; h < hidden.length; h++) {
      grad.outputWeights[h] += dOutput * hidden[h];
      const dSum = dOutput * network.outputWeights[h] * (1 - hidden[h] ** 2);
      grad.hiddenBiases[h] += dSum;
      const row = grad.hiddenWeights[h];
      for (let i = 0; i < inputs.length; i++) row[i] += dSum * inputs[i];
    }
  }
  return grad;
}

/** The network after one SGD step on the samples. */
export function step(network: Network, samples: Sample[], rate: number): Network {
  const grad = gradient(network, samples);
  const descend = (weights: number[], g: number[]) => weights.map((w, i) => w - rate * g[i]);
  return {
    hiddenWeights: network.hiddenWeights.map((row, h) => descend(row, grad.hiddenWeights[h])),
    hiddenBiases: descend(network.hiddenBiases, grad.hiddenBiases),
    outputWeights: descend(network.outputWeights, grad.outputWeights),
    outputBias: network.outputBias - rate * grad.outputBias,
  };
}

/** Every position of `games` games among the scripted Strategies, each pairing and Ending in turn, as Samples. */
async function collect(games: number, random: Random, workers?: number): Promise<Sample[]> {
  const specs: GameSpec[] = Array.from({ length: games }, (_, i) => ({
    red: i % SCRIPTED.length,
    blue: Math.floor(i / SCRIPTED.length) % SCRIPTED.length,
    ending: ENDINGS[Math.floor(i / SCRIPTED.length ** 2) % ENDINGS.length],
    seed: nextSeed(random),
    randomShare: RANDOM_SHARE,
  }));
  const pool = gamePool(workers);
  let played;
  try {
    played = await pool.play([...SCRIPTED], specs);
  } finally {
    await pool.close();
  }
  // Replays each game to rate every position it passed through.
  return played.flatMap(({ scores, moves }, g) => {
    let game = createGame(specs[g].ending);
    return moves.map((move) => {
      const mover = game.mover;
      game = applyMove(game, move);
      return { inputs: inputsFor(game, mover), target: scores[mover] - scores[opponentOf(mover)] };
    });
  });
}

/** Shuffles the items in place (Fisher–Yates). */
function shuffle<T>(items: T[], random: Random): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * Fits a fresh network, shaped like Training's, to the final Score margins of games among the scripted
 * Strategies by minibatch SGD, and returns it as a Model with no Generations, reported like Training's. Its
 * Population is that network repeated to Training's default size, so Training can continue from it.
 * The seed fully determines the result.
 */
export async function fit(options: FitOptions): Promise<Model> {
  const random = seeded(options.seed);
  const samples = await collect(options.games, random, options.workers);
  options.onPositions?.(samples.length);
  let network = randomNetwork(options.hidden, random);
  for (let epoch = 1; epoch <= options.epochs; epoch++) {
    shuffle(samples, random);
    for (let start = 0; start < samples.length; start += BATCH_SIZE) {
      network = step(network, samples.slice(start, start + BATCH_SIZE), options.rate);
    }
    const error = loss(network, samples);
    if (!Number.isFinite(error)) throw new Error(`Fitting diverged in epoch ${epoch}; try a lower learning rate`);
    options.onEpoch?.(epoch, error);
  }
  const model = modelOf(Array(TRAINING_DEFAULTS.population).fill(network), options.seed, 0);
  const games = options.reportGames ?? TRAINING_DEFAULTS.reportGames;
  return { ...model, report: await report(model, { games, seed: nextSeed(random), workers: options.workers }) };
}
