import { applyMove, isLegalMove, type Game, type Move, type Player } from "./game.ts";
import { POINT_COUNT, boardPolygon, pointPosition, polygonArea, splitPolygon } from "./geometry.ts";
import type { Model } from "./model.ts";
import { rate } from "./network.ts";

/** A Strategy that needs nothing but its name. */
export type NamedStrategy = "random" | "greedy" | "hoarder";

/** How the Computer chooses its Move: by name, or Neural with the Model it plays. */
export type Strategy = NamedStrategy | { kind: "neural"; model: Model };

/** A source of random numbers in [0, 1), like `Math.random`. */
export type Random = () => number;

/** Scores closer than this, relative to the Board's area, are tied, as for a Draw. */
const TIE_TOLERANCE = 1e-9;

/** The Board's area, to give Settled area as a fraction of it, like a Score. */
const BOARD_AREA = polygonArea(boardPolygon());

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
  return highest(valued, ({ value }) => value, tolerance).map(({ move }) => move);
}

/** The items whose value is highest. Values within `tolerance` of the highest tie with it. */
function highest<T>(items: T[], value: (item: T) => number, tolerance: number): T[] {
  const best = Math.max(...items.map(value));
  return items.filter((item) => best - value(item) <= tolerance);
}

/** The legal Moves leaving the Mover the highest Score, within the tie tolerance. */
const greedyMoves = (game: Game) => bestMoves(game, (after) => after.scores[game.mover], TIE_TOLERANCE);

/**
 * The Player's Settled area, as a fraction of the Board's: their Regions that no legal Move would
 * split. In a finished game no Move is legal, so it is the Player's Score.
 */
function settledArea(game: Game, player: Player): number {
  // Both directions of a Line split a Region alike.
  const lines = legalMoves(game)
    .filter(({ start, end }) => start < end)
    .map(({ start, end }) => [pointPosition(start), pointPosition(end)] as const);
  let area = 0;
  for (const { polygon, colour } of game.regions) {
    if (colour === player && !lines.some(([a, b]) => splitPolygon(polygon, a, b))) area += polygonArea(polygon);
  }
  return area / BOARD_AREA;
}

/**
 * The Moves a Hoarder chooses between, measuring Settled area with `settled`: among the Moves that
 * increase it, those leaving the most, and of those, the ones leaving the Mover the highest Score.
 * Empty when no Move increases it.
 */
function hoarderMoves(game: Game, settled: (game: Game) => number): Move[] {
  const before = settled(game);
  const candidates = legalMoves(game)
    .map((move) => {
      const after = applyMove(game, move);
      return { move, settled: settled(after), score: after.scores[game.mover] };
    })
    .filter(({ settled }) => settled - before > TIE_TOLERANCE);
  const mostSettled = highest(candidates, ({ settled }) => settled, TIE_TOLERANCE);
  return highest(mostSettled, ({ score }) => score, TIE_TOLERANCE).map(({ move }) => move);
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
      return pick(greedyMoves(game), random);
    case "hoarder": {
      const hoard = hoarderMoves(game, (after) => settledArea(after, game.mover));
      return pick(hoard.length > 0 ? hoard : greedyMoves(game), random);
    }
  }
}
