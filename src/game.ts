import { POINT_COUNT, boardPolygon, pointPosition, polygonArea, splitPolygon, type Vec } from "./geometry";

export type Player = "red" | "blue";
export type RuleSet = "full-split" | "claim";

export interface Move {
  start: number;
  end: number;
}

export interface Region {
  polygon: Vec[];
  colour: Player | null;
}

export interface Scores {
  /** Fraction of the Board's area, 0–1. */
  red: number;
  blue: number;
}

export interface Game {
  ruleSet: RuleSet;
  regions: Region[];
  moves: Move[];
  mover: Player;
  scores: Scores;
}

export function createGame(ruleSet: RuleSet): Game {
  return {
    ruleSet,
    regions: [{ polygon: boardPolygon(), colour: null }],
    moves: [],
    mover: "red",
    scores: { red: 0, blue: 0 },
  };
}

const BOARD_AREA = polygonArea(boardPolygon());

function opponentOf(player: Player): Player {
  return player === "red" ? "blue" : "red";
}

function scoresOf(regions: Region[]): Scores {
  const scores = { red: 0, blue: 0 };
  for (const region of regions) {
    if (region.colour) scores[region.colour] += polygonArea(region.polygon) / BOARD_AREA;
  }
  return scores;
}

export function applyMove(game: Game, move: Move): Game {
  const mover = game.mover;
  const opponent = opponentOf(mover);
  const a = pointPosition(move.start);
  const b = pointPosition(move.end);

  const regions = game.regions.flatMap((region): Region[] => {
    const halves = splitPolygon(region.polygon, a, b);
    if (!halves) return [region];
    return [
      { polygon: halves.left, colour: mover },
      { polygon: halves.right, colour: opponent },
    ];
  });

  return {
    ...game,
    regions,
    moves: [...game.moves, move],
    mover: opponent,
    scores: scoresOf(regions),
  };
}

/** Points that are already the endpoint of a Line. */
export function usedPoints(game: Game): Set<number> {
  return new Set(game.moves.flatMap((m) => [m.start, m.end]));
}

export function isLegalMove(game: Game, move: Move): boolean {
  const used = usedPoints(game);
  const gap = Math.abs(move.start - move.end);
  const adjacent = gap === 1 || gap === POINT_COUNT - 1;
  return move.start !== move.end && !adjacent && !used.has(move.start) && !used.has(move.end);
}
