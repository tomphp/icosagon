import { applyMove, legalMoves, opponentOf, settledRegions, type Game, type Move, type Player } from "./game.ts";
import { boardPolygon, polygonArea } from "./geometry.ts";
import type { Model } from "./model.ts";
import { rate } from "./network.ts";

/** A Strategy that needs nothing but its name. */
export type NamedStrategy = "random" | "greedy" | "hoarder" | "clever-hoarder";

/** How the Computer chooses its Move: by name, or Neural with the Model it plays. */
export type Strategy = NamedStrategy | { kind: "neural"; model: Model };

/** A source of random numbers in [0, 1), like `Math.random`. */
export type Random = () => number;

/** Scores closer than this, relative to the Board's area, are tied, as for a Draw. */
const TIE_TOLERANCE = 1e-9;

/** The Board's area, to give Settled area as a fraction of it, like a Score. */
const BOARD_AREA = polygonArea(boardPolygon());

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
 * Each Player's Settled area, as a fraction of the Board's. In a finished game no Move is legal, so it
 * is each Player's Score.
 */
function settledAreas(game: Game): Record<Player, number> {
  const areas = { red: 0, blue: 0 };
  for (const { polygon, colour } of settledRegions(game)) areas[colour!] += polygonArea(polygon);
  return { red: areas.red / BOARD_AREA, blue: areas.blue / BOARD_AREA };
}

/** The Settled margin: the Player's Settled area minus their Opponent's. */
function settledMargin(game: Game, player: Player): number {
  const areas = settledAreas(game);
  return areas[player] - areas[opponentOf(player)];
}

/**
 * The Moves a Hoarder chooses between, judging each position by `measure`, its Settled area or
 * margin: among the Moves that increase it, those leaving the most, and of those, the ones leaving
 * the Mover the highest Score. When no Move increases it, Greedy's Moves.
 */
function hoarderMoves(game: Game, measure: (game: Game) => number): Move[] {
  const before = measure(game);
  const candidates = legalMoves(game)
    .map((move) => {
      const after = applyMove(game, move);
      return { move, measure: measure(after), score: after.scores[game.mover] };
    })
    .filter(({ measure }) => measure - before > TIE_TOLERANCE);
  if (candidates.length === 0) return greedyMoves(game);
  const most = highest(candidates, ({ measure }) => measure, TIE_TOLERANCE);
  return highest(most, ({ score }) => score, TIE_TOLERANCE).map(({ move }) => move);
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
    case "hoarder":
      return pick(hoarderMoves(game, (after) => settledAreas(after)[game.mover]), random);
    case "clever-hoarder":
      return pick(hoarderMoves(game, (after) => settledMargin(after, game.mover)), random);
  }
}
