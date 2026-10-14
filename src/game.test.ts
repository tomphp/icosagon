import { describe, expect, it } from "vitest";
import { applyMove, createGame, isLegalMove, type Game } from "./game";

describe("a fresh game", () => {
  it("has one uncoloured Region, Red to move and Scores of 0/0", () => {
    const game = createGame("full-split");

    expect(game.regions).toHaveLength(1);
    expect(game.regions[0].colour).toBeNull();
    expect(game.mover).toBe("red");
    expect(game.scores).toEqual({ red: 0, blue: 0 });
    expect(game.moves).toEqual([]);
  });
});

/**
 * The colour of the Region containing the spot at `scale` × the distance from the centre to
 * Point p (Points numbered 0–19 clockwise from the top of the unit Board).
 */
function colourNear(game: Game, p: number, scale = 0.9) {
  const angle = ((-90 + p * 18) * Math.PI) / 180;
  const spot = { x: scale * Math.cos(angle), y: scale * Math.sin(angle) };
  const region = game.regions.find((r) => {
    const sides = r.polygon.map((a, i) => {
      const b = r.polygon[(i + 1) % r.polygon.length];
      return Math.sign((b.x - a.x) * (spot.y - a.y) - (b.y - a.y) * (spot.x - a.x));
    });
    return sides.every((s) => s >= 0) || sides.every((s) => s <= 0);
  });
  return region?.colour;
}

describe("a diameter", () => {
  // Point 5 is at the right of the Board (1, 0); Point 15 at the left (-1, 0).
  it("Splits the Board 50/50, with the left side going to the Mover", () => {
    // Looking from Point 0 (top) down to Point 10 (bottom), the left side is the screen's right.
    const game = applyMove(createGame("full-split"), { start: 0, end: 10 });

    expect(game.regions).toHaveLength(2);
    expect(game.scores.red).toBeCloseTo(0.5);
    expect(game.scores.blue).toBeCloseTo(0.5);
    expect(colourNear(game, 5)).toBe("red");
    expect(colourNear(game, 15)).toBe("blue");
  });

  it("drawn in the opposite direction gives the opposite colouring", () => {
    const game = applyMove(createGame("full-split"), { start: 10, end: 0 });

    expect(colourNear(game, 5)).toBe("blue");
    expect(colourNear(game, 15)).toBe("red");
  });

  it("passes the turn to Blue and records the Move", () => {
    const game = applyMove(createGame("full-split"), { start: 0, end: 10 });

    expect(game.mover).toBe("blue");
    expect(game.moves).toEqual([{ start: 0, end: 10 }]);
  });
});

describe("Move legality", () => {
  it("allows a Line between two unused, non-adjacent Points", () => {
    expect(isLegalMove(createGame("full-split"), { start: 0, end: 2 })).toBe(true);
  });

  it("rejects a Line from a Point to itself", () => {
    expect(isLegalMove(createGame("full-split"), { start: 4, end: 4 })).toBe(false);
  });

  it("rejects a Line between adjacent Points, including across Point 0", () => {
    const game = createGame("full-split");
    expect(isLegalMove(game, { start: 4, end: 5 })).toBe(false);
    expect(isLegalMove(game, { start: 19, end: 0 })).toBe(false);
  });

  it("rejects a Line touching a used Point", () => {
    const game = applyMove(createGame("full-split"), { start: 0, end: 10 });
    expect(isLegalMove(game, { start: 10, end: 3 })).toBe(false);
    expect(isLegalMove(game, { start: 3, end: 0 })).toBe(false);
  });
});

describe("applying an illegal Move", () => {
  it("is rejected for the same Point twice, neighbouring Points or a used Point", () => {
    const fresh = createGame("full-split");
    expect(() => applyMove(fresh, { start: 4, end: 4 })).toThrow();
    expect(() => applyMove(fresh, { start: 4, end: 5 })).toThrow();
    expect(() => applyMove(fresh, { start: 19, end: 0 })).toThrow();

    const afterOne = applyMove(fresh, { start: 0, end: 10 });
    expect(() => applyMove(afterOne, { start: 10, end: 3 })).toThrow();
    expect(() => applyMove(afterOne, { start: 3, end: 0 })).toThrow();
  });
});

/**
 * Plays Moves written as [start, end] pairs from a fresh Full split game, returning the game
 * before any Move and after each one.
 */
function playEach(...moves: [number, number][]) {
  const games = [createGame("full-split")];
  for (const [start, end] of moves) games.push(applyMove(games[games.length - 1], { start, end }));
  return games;
}

/** The game after playing all the Moves. */
const play = (...moves: [number, number][]) => playEach(...moves).at(-1)!;

describe("turns", () => {
  it("alternate Red, Blue, Red, …", () => {
    const movers = playEach([0, 10], [5, 15], [2, 12], [7, 17]).map((game) => game.mover);
    expect(movers).toEqual(["red", "blue", "red", "blue", "red"]);
  });
});

describe("crossing Lines", () => {
  it("two crossing diameters give four Regions coloured by the second Move", () => {
    // Blue draws 5→15 (right to left): its left side is the bottom half of the Board.
    const game = play([0, 10], [5, 15]);

    expect(game.regions).toHaveLength(4);
    expect(colourNear(game, 2)).toBe("red"); // top right
    expect(colourNear(game, 18)).toBe("red"); // top left
    expect(colourNear(game, 8)).toBe("blue"); // bottom right
    expect(colourNear(game, 12)).toBe("blue"); // bottom left
  });

  it("only Split the Regions they pass through", () => {
    // 1→4 cuts off a corner of the top-right Region; the other three Regions keep their colour.
    const game = play([0, 10], [5, 15], [1, 4]);

    expect(game.regions).toHaveLength(5);
    expect(colourNear(game, 2, 0.97)).toBe("red"); // the cut-off corner, Red's left side
    expect(colourNear(game, 2, 0.5)).toBe("blue"); // the rest of the top-right Region
    expect(colourNear(game, 18)).toBe("red");
    expect(colourNear(game, 8)).toBe("blue");
    expect(colourNear(game, 12)).toBe("blue");
  });
});

describe("several diameters through the centre", () => {
  it("give one Region per sector, with the expected colours and Scores", () => {
    // A Line i→j has the Points clockwise between i and j on its left.
    const game = play([0, 10], [5, 15], [2, 12], [7, 17]);

    expect(game.regions).toHaveLength(8);
    const colours = [1, 3, 6, 8, 11, 13, 16, 18].map((p) => colourNear(game, p));
    expect(colours).toEqual(["blue", "red", "red", "blue", "red", "blue", "blue", "red"]);
    expect(game.scores.red).toBeCloseTo(0.5);
    expect(game.scores.blue).toBeCloseTo(0.5);
  });
});

describe("total coloured area", () => {
  it("equals the Board's area after every Move", () => {
    const games = playEach(
      [0, 10], [5, 15], [2, 12], [7, 17], [1, 4], [3, 9], [6, 13], [8, 18], [11, 16], [14, 19],
    );
    for (const game of games.slice(1)) {
      expect(game.scores.red + game.scores.blue).toBeCloseTo(1, 9);
    }
  });
});

describe("the end of the game", () => {
  const blueWinsGame: [number, number][] = [
    [0, 10], [5, 15], [2, 12], [7, 17], [1, 4], [3, 9], [6, 13], [8, 18], [11, 16], [14, 19],
  ];

  it("is in progress until the 10th Move", () => {
    const games = playEach(...blueWinsGame);
    for (const game of games.slice(0, 10)) expect(game.outcome).toBe("in-progress");
  });

  it("comes after 10 Moves, with the larger Score winning", () => {
    const game = play(...blueWinsGame);

    expect(game.outcome).toBe("blue-wins");
    expect(game.scores.red).toBeCloseTo(0.4678, 4);
    expect(game.scores.blue).toBeCloseTo(0.5322, 4);
  });

  it("is a Draw when the Scores are equal up to floating-point noise", () => {
    const game = play([0, 10], [1, 11], [2, 12], [3, 13], [4, 14], [5, 15], [6, 16], [7, 17], [8, 18], [9, 19]);

    expect(game.outcome).toBe("draw");
  });

  it("rejects any further Moves", () => {
    const game = play(...blueWinsGame);

    expect(isLegalMove(game, { start: 0, end: 10 })).toBe(false);
    expect(() => applyMove(game, { start: 0, end: 10 })).toThrow();
  });
});
