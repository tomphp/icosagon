import { POINT_COUNT, side, type Vec } from "./geometry.ts";
import { settledRegions } from "./computer.ts";
import { opponentOf, usedPoints, type Game, type Player } from "./game.ts";

/**
 * A fully connected network with one tanh hidden layer that rates a position. Weights are plain
 * number arrays so a Model can store them as JSON.
 */
export interface Network {
  /** One row per hidden unit, one weight per input. */
  hiddenWeights: number[][];
  hiddenBiases: number[];
  /** One weight per hidden unit. */
  outputWeights: number[];
  outputBias: number;
}

/** Sample spots in rings around the Board's centre: 1 + 6 + 12 + 18 + 24 = 61. */
const SAMPLE_SPOTS: Vec[] = [
  { x: 0, y: 0 },
  ...[6, 12, 18, 24].flatMap((count, ring) => {
    const radius = 0.22 * (ring + 1);
    // Each ring is turned half a step so its spots don't line up with the ring inside it.
    return Array.from({ length: count }, (_, i) => {
      const angle = ((i + 0.5 * (ring % 2)) / count) * 2 * Math.PI;
      return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
    });
  }),
];

/**
 * Where each input sits: the colour at each sample spot, then whether each Point is used, then both
 * Scores and the Ending, then whether each sample spot is Settled. Changing the layout needs a new
 * Model format version.
 */
export const INPUT = {
  spots: 0,
  points: SAMPLE_SPOTS.length,
  ownScore: SAMPLE_SPOTS.length + POINT_COUNT,
  opponentScore: SAMPLE_SPOTS.length + POINT_COUNT + 1,
  ending: SAMPLE_SPOTS.length + POINT_COUNT + 2,
  settled: SAMPLE_SPOTS.length + POINT_COUNT + 3,
} as const;

export const INPUT_SIZE = INPUT.settled + SAMPLE_SPOTS.length;

/** Whether p is inside or on the edge of a convex polygon, whichever way round it winds. */
function contains(polygon: Vec[], p: Vec): boolean {
  let sign = 0;
  for (let i = 0; i < polygon.length; i++) {
    const s = side(polygon[i], polygon[(i + 1) % polygon.length], p);
    if (Math.abs(s) < 1e-12) continue;
    if (sign === 0) sign = Math.sign(s);
    else if (Math.sign(s) !== sign) return false;
  }
  return true;
}

/** The network's inputs for the position, from the point of view of the Player. */
export function inputsFor(game: Game, player: Player): number[] {
  const inputs = Array<number>(INPUT_SIZE).fill(0);
  const settled = new Set(settledRegions(game));
  SAMPLE_SPOTS.forEach((spot, i) => {
    const region = game.regions.find((r) => contains(r.polygon, spot));
    if (region?.colour) inputs[INPUT.spots + i] = region.colour === player ? 1 : -1;
    if (region && settled.has(region)) inputs[INPUT.settled + i] = 1;
  });
  for (const point of usedPoints(game)) inputs[INPUT.points + point] = 1;
  inputs[INPUT.ownScore] = game.scores[player];
  inputs[INPUT.opponentScore] = game.scores[opponentOf(player)];
  inputs[INPUT.ending] = game.ending === "award" ? 1 : -1;
  return inputs;
}

/** The hidden layer's outputs and the network's output for the inputs. */
export function forward(network: Network, inputs: number[]): { hidden: number[]; output: number } {
  const hidden = network.hiddenWeights.map((weights, h) => {
    let sum = network.hiddenBiases[h];
    for (let i = 0; i < inputs.length; i++) sum += weights[i] * inputs[i];
    return Math.tanh(sum);
  });
  let output = network.outputBias;
  for (let h = 0; h < hidden.length; h++) output += network.outputWeights[h] * hidden[h];
  return { hidden, output };
}

/** How good the position is for the Player, who has just moved; higher is better. */
export const rate = (network: Network, game: Game, player: Player): number => forward(network, inputsFor(game, player)).output;
