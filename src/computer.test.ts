import { describe, expect, it } from "vitest";
import { chooseMove, type Strategy } from "./computer.ts";
import { applyMove, createGame, isLegalMove, type Ending, type Game, type Move } from "./game.ts";
import { POINT_COUNT } from "./geometry.ts";
import { MODEL_VERSION, type Model } from "./model.ts";
import { INPUT, INPUT_SIZE, type Network } from "./network.ts";

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

/** A Network that rates a position by the Score of the Player who has just moved, times `sign`. */
function scoreNetwork(sign: number, hidden = 1): Network {
  return {
    hiddenWeights: Array.from({ length: hidden }, (_, h) =>
      Array.from({ length: INPUT_SIZE }, (_, i) => (h === 0 && i === INPUT.ownScore ? 1 : 0)),
    ),
    hiddenBiases: Array(hidden).fill(0),
    outputWeights: Array.from({ length: hidden }, (_, h) => (h === 0 ? sign : 0)),
    outputBias: 0,
  };
}

/** A Network that rates every position the same. */
const flatNetwork = (): Network => scoreNetwork(0);

const modelOf = (...population: Network[]): Model => ({
  version: MODEL_VERSION,
  shape: { inputs: INPUT_SIZE, hidden: 1 },
  population,
  seed: 1,
  generations: 0,
  parent: null,
  report: null,
});

const neural = (...population: Network[]): Strategy => ({ kind: "neural", model: modelOf(...population) });

describe("the Neural Strategy", () => {
  const midGame = play([0, 10], [5, 15], [2, 12], [7, 17]);

  it("returns a legal Move from fresh and mid-game positions under both Endings", () => {
    const strategies = [neural(scoreNetwork(1)), neural(scoreNetwork(-1)), neural(flatNetwork())];
    for (const ending of ["award", "skip"] as const) {
      const games = [createGame(ending), playWith(ending, [0, 10], [5, 15], [2, 12], [7, 17])];
      for (const game of games) {
        for (const strategy of strategies) {
          expect(isLegalMove(game, chooseMove(game, strategy, always(0.5)))).toBe(true);
        }
      }
    }
  });

  it("plays the Move its Network rates highest", () => {
    for (const game of [createGame("award"), midGame]) {
      const move = chooseMove(game, neural(scoreNetwork(1)), always(0));
      expect(scoreAfter(game, move)).toBeCloseTo(bestScore(game), 9);
    }
  });

  it("rates the position after any Award the Move triggers", () => {
    // As for Greedy: under Award, 16→7 is best for Red once Blue's Award is counted; under Skip, 16→6.
    const moves: [number, number][] = [[14, 17], [1, 5], [11, 19], [9, 0], [4, 12], [18, 2], [3, 10], [15, 13]];
    const strategy = neural(scoreNetwork(1));

    expect(key(chooseMove(playWith("award", ...moves), strategy, always(0)))).toBe("16→7");
    expect(key(chooseMove(playWith("skip", ...moves), strategy, always(0)))).toBe("16→6");
  });

  it("breaks exact ties using the random source", () => {
    const game = createGame("award");
    const values = [0, 0.25, 0.5, 0.75, 1 - Number.EPSILON];
    const chosen = new Set(values.map((value) => key(chooseMove(game, neural(flatNetwork()), always(value)))));

    expect(chosen.size).toBe(values.length);
  });

  it("plays with the first Network in the Population, the best", () => {
    const game = midGame;
    const best = chooseMove(game, neural(scoreNetwork(1), scoreNetwork(-1)), always(0));
    const worst = chooseMove(game, neural(scoreNetwork(-1), scoreNetwork(1)), always(0));

    expect(scoreAfter(game, best)).toBeCloseTo(bestScore(game), 9);
    expect(scoreAfter(game, worst)).toBeLessThan(bestScore(game) - 0.01);
  });
});
