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

describe("the Hoarder Strategy", () => {
  it("doesn't count a Region with no Point on its edge as Settled while a legal Line still splits it", () => {
    // 0→9, 3→12 and 15→6 leave the triangle in the middle with no Point on its edge, as 6→15 does, but
    // Red's rather than Blue's; 13→18 adds more such Regions. Legal Lines still split them all. Counting them as Settled would make 17→1 best;
    // in fact 16→14 settles the most.
    const game = play([0, 9], [3, 12], [15, 6], [13, 18]);

    expect(key(chooseMove(game, "hoarder", always(0)))).toBe("16→14");
  });

  it("takes a Move that settles area over a higher-scoring Move that settles nothing", () => {
    // Greedy's 11→9 takes almost the whole Board, but every Region it leaves Red can still be Split.
    // 1→5 settles the Region between Points 1 and 5 for Red.
    const game = play([2, 4], [10, 3]);

    expect(key(chooseMove(game, "greedy", always(0)))).toBe("11→9");
    expect(key(chooseMove(game, "hoarder", always(0)))).toBe("1→5");
  });

  it("picks the candidate leaving the most Settled area, over one that also settles area and scores more", () => {
    // 11→16 and 12→16 both settle area for Red; 11→16 scores more, but 12→16 settles more.
    const game = play([3, 14], [15, 13]);

    expect(scoreAfter(game, { start: 11, end: 16 })).toBeGreaterThan(scoreAfter(game, { start: 12, end: 16 }));
    expect(key(chooseMove(game, "hoarder", always(0)))).toBe("12→16");
  });

  it("breaks ties on Settled area by Score, then using the random source", () => {
    // Blue's 2→4, 5→7, 8→10, 11→13, 14→16 and 19→1 each settle the corner around a used Point, all the
    // same size; 8→10 and 11→13 score the most and the same.
    const game = play([0, 9], [3, 12], [6, 15]);
    const values = [0, 0.25, 0.5, 0.75, 1 - Number.EPSILON];
    const chosen = new Set(values.map((value) => key(chooseMove(game, "hoarder", always(value)))));

    expect(scoreAfter(game, { start: 8, end: 10 })).toBeGreaterThan(scoreAfter(game, { start: 2, end: 4 }));
    expect([...chosen].sort()).toEqual(["11→13", "8→10"]);
  });

  it("plays as Greedy when no Move settles area for it", () => {
    // From a fresh game, no Line leaves the Mover a Region that no other Line can cut.
    const game = createGame("award");
    for (const value of [0, 0.25, 0.5, 0.75, 1 - Number.EPSILON]) {
      expect(chooseMove(game, "hoarder", always(value))).toEqual(chooseMove(game, "greedy", always(value)));
    }
  });

  it("counts the Award a game-ending Move triggers, once every Region is Settled", () => {
    // Red's 16→5 leaves Points 9 and 10 for Blue, who cannot move. Under Skip, Red keeps the most
    // Settled area that way; under Award, Blue takes the Region beside them and 10→5 settles more.
    const moves: [number, number][] = [[13, 11], [14, 0], [17, 12], [15, 1], [8, 18], [19, 2], [4, 6], [7, 3]];

    expect(key(chooseMove(playWith("award", ...moves), "hoarder", always(0)))).toBe("10→5");
    expect(key(chooseMove(playWith("skip", ...moves), "hoarder", always(0)))).toBe("16→5");
  });

  it("always returns a legal Move under both Endings, to Game over", () => {
    for (const ending of ["award", "skip"] as const) {
      for (const value of [0, 0.5, 1 - Number.EPSILON]) {
        let game = createGame(ending);
        while (game.outcome === "in-progress") {
          const move = chooseMove(game, "hoarder", always(value));
          expect(isLegalMove(game, move)).toBe(true);
          game = applyMove(game, move);
        }
      }
    }
  });
});
