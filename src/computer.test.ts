import { describe, expect, it } from "vitest";
import { chooseMove } from "./computer";
import { applyMove, createGame, isLegalMove, type Ending, type Game, type Move } from "./game";
import { POINT_COUNT } from "./geometry";

/** The game after playing Moves written as [start, end] pairs from a fresh game with the Ending. */
const playWith = (ending: Ending, ...moves: [number, number][]) =>
  moves.reduce((game: Game, [start, end]) => applyMove(game, { start, end }), createGame(ending));

/** The game after playing Moves written as [start, end] pairs from a fresh Award game. */
const play = (...moves: [number, number][]) => playWith("award", ...moves);

/** A random source that always returns the value. */
const always = (value: number) => () => value;

const key = ({ start, end }: Move) => `${start}→${end}`;

describe("the Random Strategy", () => {
  const midGame = play([0, 10], [5, 15], [2, 12], [7, 17]);

  it("returns a legal Move from a fresh game and from a mid-game position", () => {
    for (const game of [createGame("award"), midGame]) {
      for (const value of [0, 0.25, 0.5, 0.75, 1 - Number.EPSILON]) {
        expect(isLegalMove(game, chooseMove(game, "random", always(value)))).toBe(true);
      }
    }
  });

  it("can return every legal Move from a fresh game, in either direction, with equal chance", () => {
    // 20 Points, each with 17 non-adjacent others: 340 directed Moves. Evenly spaced random values,
    // one per Move, reach each Move exactly once.
    const game = createGame("award");
    const count = 20 * 17;
    const chosen = new Set(
      Array.from({ length: count }, (_, i) => key(chooseMove(game, "random", always((i + 0.5) / count)))),
    );

    expect(chosen.size).toBe(count);
    expect(chosen).toContain("3→12");
    expect(chosen).toContain("12→3");
  });

  it("depends on the random source", () => {
    const game = createGame("award");
    expect(key(chooseMove(game, "random", always(0)))).not.toBe(
      key(chooseMove(game, "random", always(1 - Number.EPSILON))),
    );
  });

  it("never returns a Move to a used Point or between adjacent Points", () => {
    const used = new Set([0, 10, 5, 15, 2, 12, 7, 17]);
    for (let i = 0; i < 200; i++) {
      const { start, end } = chooseMove(midGame, "random", always(i / 200));
      expect(used.has(start) || used.has(end)).toBe(false);
      expect([1, 19]).not.toContain(Math.abs(start - end));
    }
  });
});

/** The Mover's Score once the Move is made. */
const scoreAfter = (game: Game, move: Move) => applyMove(game, move).scores[game.mover];

/** The best Score any legal Move gives the Mover, found by trying every pair of Points. */
function bestScore(game: Game) {
  let best = -Infinity;
  for (let start = 0; start < POINT_COUNT; start++) {
    for (let end = 0; end < POINT_COUNT; end++) {
      if (isLegalMove(game, { start, end })) best = Math.max(best, scoreAfter(game, { start, end }));
    }
  }
  return best;
}

describe("the Greedy Strategy", () => {
  const midGame = play([0, 10], [5, 15], [2, 12], [7, 17]);

  it("returns a legal Move whose Score for the Mover is at least that of every other legal Move", () => {
    for (const game of [createGame("award"), midGame, play([0, 10], [15, 5], [2, 13])]) {
      for (const value of [0, 0.5, 1 - Number.EPSILON]) {
        const move = chooseMove(game, "greedy", always(value));
        expect(isLegalMove(game, move)).toBe(true);
        expect(scoreAfter(game, move)).toBeCloseTo(bestScore(game), 9);
      }
    }
  });

  it("counts an Award the Move triggers", () => {
    // Red's 16→6 takes the most area, but leaves Points 7 and 8 for Blue, who cannot move and, under
    // Award, takes the Region beside them. Counting that, 16→7 is best; under Skip, 16→6 is.
    const moves: [number, number][] = [[14, 17], [1, 5], [11, 19], [9, 0], [4, 12], [18, 2], [3, 10], [15, 13]];

    expect(key(chooseMove(playWith("award", ...moves), "greedy", always(0)))).toBe("16→7");
    expect(key(chooseMove(playWith("skip", ...moves), "greedy", always(0)))).toBe("16→6");
  });

  it("breaks ties using the random source", () => {
    // From a fresh game, the best Move is the same in every rotation of the Board, so many Moves tie.
    const game = createGame("award");
    const values = [0, 0.25, 0.5, 0.75, 1 - Number.EPSILON];
    const chosen = new Set(values.map((value) => key(chooseMove(game, "greedy", always(value)))));

    expect(chosen.size).toBe(values.length);
  });

  it("never returns a Move to a used Point or between adjacent Points", () => {
    const used = new Set([0, 10, 5, 15, 2, 12, 7, 17]);
    for (const value of [0, 0.5, 1 - Number.EPSILON]) {
      const { start, end } = chooseMove(midGame, "greedy", always(value));
      expect(used.has(start) || used.has(end)).toBe(false);
      expect([1, 19]).not.toContain(Math.abs(start - end));
    }
  });
});
