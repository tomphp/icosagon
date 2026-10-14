import { describe, expect, it } from "vitest";
import { chooseMove } from "./computer";
import { applyMove, createGame, isLegalMove, type Game, type Move } from "./game";

/** The game after playing Moves written as [start, end] pairs from a fresh Award game. */
const play = (...moves: [number, number][]) =>
  moves.reduce((game: Game, [start, end]) => applyMove(game, { start, end }), createGame("award"));

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
