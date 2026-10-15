import { POINT_COUNT, boardPolygon, pointPosition, polygonArea, splitPolygon, type Vec } from "./geometry.ts";

export type Player = "red" | "blue";
/** What happens to a Mover with no legal Move: take the Region beside the unused Points, or miss the Move. */
export type Ending = "award" | "skip";
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

/** Why a game ended before the 10th Move: the Mover had no legal Move. */
export interface Stuck {
  player: Player;
  /** The last two unused Points, in Board order; under Award, the Region beside them went to the stuck Player. */
  points: [number, number];
}

export interface Game {
  ending: Ending;
  regions: Region[];
  moves: Move[];
  mover: Player;
  scores: Scores;
  outcome: Outcome;
  /** Set when the game ended because the Mover had no legal Move. */
  stuck: Stuck | null;
}

export function createGame(ending: Ending): Game {
  return {
    ending,
    regions: [{ polygon: boardPolygon(), colour: null }],
    moves: [],
    mover: "red",
    scores: { red: 0, blue: 0 },
    outcome: "in-progress",
    stuck: null,
  };
}

const BOARD_AREA = polygonArea(boardPolygon());
/** Every Point is used after this many Moves, and the game ends. */
const MOVES_PER_GAME = POINT_COUNT / 2;
/** Scores closer than this, relative to the Board's area, are a Draw. */
const DRAW_TOLERANCE = 1e-9;
/** Vertices closer than this are the same Point. */
const SAME_POINT = 1e-9;

export function opponentOf(player: Player): Player {
  return player === "red" ? "blue" : "red";
}

function scoresOf(regions: Region[]): Scores {
  const scores = { red: 0, blue: 0 };
  for (const region of regions) {
    if (region.colour) scores[region.colour] += polygonArea(region.polygon) / BOARD_AREA;
  }
  return scores;
}

function finalOutcome(scores: Scores): Outcome {
  if (Math.abs(scores.red - scores.blue) < DRAW_TOLERANCE) return "draw";
  return scores.red > scores.blue ? "red-wins" : "blue-wins";
}

function assertLegal(game: Game, move: Move) {
  if (!isLegalMove(game, move)) throw new Error(`Illegal Move ${move.start}→${move.end}`);
}

/**
 * The Regions after the Mover's Line Splits every Region it passes through: the left side becomes
 * the Mover's colour, the right side keeps its colour or becomes the Opponent's if it had none.
 */
function splitRegions(game: Game, move: Move): Region[] {
  const a = pointPosition(move.start);
  const b = pointPosition(move.end);

  return game.regions.flatMap((region): Region[] => {
    const halves = splitPolygon(region.polygon, a, b);
    if (!halves) return [region];
    return [
      { polygon: halves.left, colour: game.mover },
      { polygon: halves.right, colour: region.colour ?? opponentOf(game.mover) },
    ];
  });
}

/** The Regions that applying the Move would produce, without changing the game. */
export function previewMove(game: Game, move: Move): Region[] {
  assertLegal(game, move);
  return splitRegions(game, move);
}

function isAdjacent(p: number, q: number) {
  const gap = Math.abs(p - q);
  return gap === 1 || gap === POINT_COUNT - 1;
}

/** Whether every pair of unused Points is adjacent, so no Line can be drawn. */
function hasNoLegalMove(game: Game): boolean {
  const unused = unusedPoints(game);
  return unused.every((p) => unused.every((q) => p === q || isAdjacent(p, q)));
}

const samePoint = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y) < SAME_POINT;

/** The Region with the Board side between the two Points as one of its sides. */
function regionBeside(regions: Region[], [p, q]: [number, number]): Region {
  const a = pointPosition(p);
  const b = pointPosition(q);
  const region = regions.find(({ polygon }) =>
    polygon.some((v, i) => {
      const w = polygon[(i + 1) % polygon.length];
      return (samePoint(v, a) && samePoint(w, b)) || (samePoint(v, b) && samePoint(w, a));
    }),
  );
  if (!region) throw new Error(`No Region beside Points ${p} and ${q}`);
  return region;
}

/** Ends a game whose Mover has no legal Move, applying the Ending. */
function endStuck(game: Game): Game {
  const [p, q] = unusedPoints(game);
  // Board order: lower first, except the wrap-around pair is 19 then 0.
  const points: [number, number] = q - p === 1 ? [p, q] : [q, p];
  let regions = game.regions;
  if (game.ending === "award") {
    const awarded = regionBeside(regions, points);
    regions = regions.map((r) => (r === awarded ? { ...r, colour: game.mover } : r));
  }
  const scores = scoresOf(regions);
  return { ...game, regions, scores, outcome: finalOutcome(scores), stuck: { player: game.mover, points } };
}

export function applyMove(game: Game, move: Move): Game {
  assertLegal(game, move);
  const regions = splitRegions(game, move);
  const moves = [...game.moves, move];
  const scores = scoresOf(regions);
  const next: Game = { ...game, regions, moves, mover: opponentOf(game.mover), scores };
  if (moves.length === MOVES_PER_GAME) return { ...next, outcome: finalOutcome(scores) };
  return hasNoLegalMove(next) ? endStuck(next) : next;
}

/** Points that are already the endpoint of a Line. */
export function usedPoints(game: Game): Set<number> {
  return new Set(game.moves.flatMap((m) => [m.start, m.end]));
}

function unusedPoints(game: Game): number[] {
  const used = usedPoints(game);
  return Array.from({ length: POINT_COUNT }, (_, i) => i).filter((i) => !used.has(i));
}

export function isLegalMove(game: Game, move: Move): boolean {
  if (game.outcome !== "in-progress") return false;
  // Scans the few Moves rather than building usedPoints: Hoarder, Clever Hoarder and Neural call this
  // hundreds of times per position.
  const used = (point: number) => game.moves.some((m) => m.start === point || m.end === point);
  return move.start !== move.end && !isAdjacent(move.start, move.end) && !used(move.start) && !used(move.end);
}
