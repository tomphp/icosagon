import { POINT_COUNT, boardPolygon, pointPosition, polygonArea, splitPolygon, type Vec } from "./geometry";

export type Player = "red" | "blue";
export type RuleSet = "full-split" | "claim";
export type Outcome = "in-progress" | "red-wins" | "blue-wins" | "draw";

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
  outcome: Outcome;
}

export function createGame(ruleSet: RuleSet): Game {
  return {
    ruleSet,
    regions: [{ polygon: boardPolygon(), colour: null }],
    moves: [],
    mover: "red",
    scores: { red: 0, blue: 0 },
    outcome: "in-progress",
  };
}

const BOARD_AREA = polygonArea(boardPolygon());
/** Every Point is used after this many Moves, and the game ends. */
const MOVES_PER_GAME = POINT_COUNT / 2;
/** Scores closer than this, relative to the Board's area, are a Draw. */
const DRAW_TOLERANCE = 1e-9;

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

function outcomeOf(moveCount: number, scores: Scores): Outcome {
  if (moveCount < MOVES_PER_GAME) return "in-progress";
  if (Math.abs(scores.red - scores.blue) < DRAW_TOLERANCE) return "draw";
  return scores.red > scores.blue ? "red-wins" : "blue-wins";
}

export function applyMove(game: Game, move: Move): Game {
  if (!isLegalMove(game, move)) throw new Error(`Illegal Move ${move.start}→${move.end}`);
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

  const moves = [...game.moves, move];
  const scores = scoresOf(regions);
  return {
    ...game,
    regions,
    moves,
    mover: opponent,
    scores,
    outcome: outcomeOf(moves.length, scores),
  };
}

/** Points that are already the endpoint of a Line. */
export function usedPoints(game: Game): Set<number> {
  return new Set(game.moves.flatMap((m) => [m.start, m.end]));
}

export function isLegalMove(game: Game, move: Move): boolean {
  if (game.outcome !== "in-progress") return false;
  const used = usedPoints(game);
  const gap = Math.abs(move.start - move.end);
  const adjacent = gap === 1 || gap === POINT_COUNT - 1;
  return move.start !== move.end && !adjacent && !used.has(move.start) && !used.has(move.end);
}
