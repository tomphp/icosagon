import { isLegalMove, type Game, type Move } from "./game";
import { POINT_COUNT } from "./geometry";

/** How the Computer chooses its Move. */
export type Strategy = "random";

/** A source of random numbers in [0, 1), like `Math.random`. */
export type Random = () => number;

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

/** The Computer's Move for the Mover. The Mover must have at least one legal Move. */
export function chooseMove(game: Game, strategy: Strategy, random: Random): Move {
  switch (strategy) {
    case "random":
      return pick(legalMoves(game), random);
  }
}
