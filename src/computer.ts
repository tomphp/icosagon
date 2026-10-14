import { applyMove, isLegalMove, type Game, type Move } from "./game";
import { POINT_COUNT } from "./geometry";
import type { Model } from "./model";
import { rate } from "./network";

/** How the Computer chooses its Move: by name, or Neural with the Model it plays. */
export type Strategy = "random" | "greedy" | { kind: "neural"; model: Model };

/** A source of random numbers in [0, 1), like `Math.random`. */
export type Random = () => number;

/** Scores closer than this, relative to the Board's area, are tied, as for a Draw. */
const TIE_TOLERANCE = 1e-9;

/** Every legal Move, counting each direction of a Line separately. */
function legalMoves(game: Game): Move[] {
  const moves: Move[] = [];
  for (let start = 0; start < POINT_COUNT; start++) {
    for (let end = 0; end < POINT_COUNT; end++) {
      if (isLegalMove(game, { start, end })) moves.push({ start, end });
    }
  }
  return moves;
}

const pick = <T>(items: T[], random: Random) => items[Math.floor(random() * items.length)];

/**
 * The legal Moves whose resulting game, including any Award they trigger, has the highest value for
 * the Mover. Values within `tolerance` of the highest tie with it.
 */
function bestMoves(game: Game, value: (after: Game) => number, tolerance: number): Move[] {
  const valued = legalMoves(game).map((move) => ({ move, value: value(applyMove(game, move)) }));
  const best = Math.max(...valued.map(({ value }) => value));
  return valued.filter(({ value }) => best - value <= tolerance).map(({ move }) => move);
}

/** The Computer's Move for the Mover. The Mover must have at least one legal Move. */
export function chooseMove(game: Game, strategy: Strategy, random: Random): Move {
  if (typeof strategy === "object") {
    // The best network, first in the Population, rates each position from the Mover's point of view; only exact ties are ties.
    const [best] = strategy.model.population;
    return pick(bestMoves(game, (after) => rate(best, after, game.mover), 0), random);
  }
  switch (strategy) {
    case "random":
      return pick(legalMoves(game), random);
    case "greedy":
      return pick(bestMoves(game, (after) => after.scores[game.mover], TIE_TOLERANCE), random);
  }
}
