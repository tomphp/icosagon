import { describe, expect, it } from "vitest";
import { applyMove, createGame, isLegalMove, previewMove, type Ending, type Game } from "./game";

describe("a fresh game", () => {
  it("has one uncoloured Region, Red to move and Scores of 0/0", () => {
    const game = createGame("award");

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
    const game = applyMove(createGame("award"), { start: 0, end: 10 });

    expect(game.regions).toHaveLength(2);
    expect(game.scores.red).toBeCloseTo(0.5);
    expect(game.scores.blue).toBeCloseTo(0.5);
    expect(colourNear(game, 5)).toBe("red");
    expect(colourNear(game, 15)).toBe("blue");
  });

  it("drawn in the opposite direction gives the opposite colouring", () => {
    const game = applyMove(createGame("award"), { start: 10, end: 0 });

    expect(colourNear(game, 5)).toBe("blue");
    expect(colourNear(game, 15)).toBe("red");
  });

  it("passes the turn to Blue and records the Move", () => {
    const game = applyMove(createGame("award"), { start: 0, end: 10 });

    expect(game.mover).toBe("blue");
    expect(game.moves).toEqual([{ start: 0, end: 10 }]);
  });
});

describe("Move legality", () => {
  it("allows a Line between two unused, non-adjacent Points", () => {
    expect(isLegalMove(createGame("award"), { start: 0, end: 2 })).toBe(true);
  });

  it("rejects a Line from a Point to itself", () => {
    expect(isLegalMove(createGame("award"), { start: 4, end: 4 })).toBe(false);
  });

  it("rejects a Line between adjacent Points, including across Point 0", () => {
    const game = createGame("award");
    expect(isLegalMove(game, { start: 4, end: 5 })).toBe(false);
    expect(isLegalMove(game, { start: 19, end: 0 })).toBe(false);
  });

  it("rejects a Line touching a used Point", () => {
    const game = applyMove(createGame("award"), { start: 0, end: 10 });
    expect(isLegalMove(game, { start: 10, end: 3 })).toBe(false);
    expect(isLegalMove(game, { start: 3, end: 0 })).toBe(false);
  });
});

describe("applying an illegal Move", () => {
  it("is rejected for the same Point twice, neighbouring Points or a used Point", () => {
    const fresh = createGame("award");
    expect(() => applyMove(fresh, { start: 4, end: 4 })).toThrow();
    expect(() => applyMove(fresh, { start: 4, end: 5 })).toThrow();
    expect(() => applyMove(fresh, { start: 19, end: 0 })).toThrow();

    const afterOne = applyMove(fresh, { start: 0, end: 10 });
    expect(() => applyMove(afterOne, { start: 10, end: 3 })).toThrow();
    expect(() => applyMove(afterOne, { start: 3, end: 0 })).toThrow();
  });
});

/**
 * Plays Moves written as [start, end] pairs from a fresh game with the Ending, returning the
 * game before any Move and after each one.
 */
function playEachWith(ending: Ending, ...moves: [number, number][]) {
  const games = [createGame(ending)];
  for (const [start, end] of moves) games.push(applyMove(games[games.length - 1], { start, end }));
  return games;
}

/** Plays Moves from a fresh Award game, returning the game before any Move and after each one. */
const playEach = (...moves: [number, number][]) => playEachWith("award", ...moves);

/** The game after playing all the Moves under Award. */
const play = (...moves: [number, number][]) => playEach(...moves).at(-1)!;

describe("turns", () => {
  it("alternate Red, Blue, Red, …", () => {
    const movers = playEach([0, 10], [5, 15], [2, 12], [7, 17]).map((game) => game.mover);
    expect(movers).toEqual(["red", "blue", "red", "blue", "red"]);
  });
});

describe("crossing Lines", () => {
  it("give the left side to the Mover and let the right side keep its previous colour", () => {
    // Blue draws 5→15 (right to left): its left side, the bottom half, becomes Blue. The right
    // side, the top half, keeps its colours: Red on the top right, Blue on the top left.
    const game = play([0, 10], [5, 15]);

    expect(game.regions).toHaveLength(4);
    expect(colourNear(game, 2)).toBe("red"); // top right
    expect(colourNear(game, 18)).toBe("blue"); // top left
    expect(colourNear(game, 8)).toBe("blue"); // bottom right
    expect(colourNear(game, 12)).toBe("blue"); // bottom left
    expect(game.scores.red).toBeCloseTo(0.25);
    expect(game.scores.blue).toBeCloseTo(0.75);
  });

  it("only Split the Regions they pass through", () => {
    // 16→19 cuts off a corner of the top-left Region; the other three Regions keep their colour.
    const game = play([0, 10], [5, 15], [16, 19]);

    expect(game.regions).toHaveLength(5);
    expect(colourNear(game, 18, 0.97)).toBe("red"); // the cut-off corner, Red's left side
    expect(colourNear(game, 18, 0.5)).toBe("blue"); // the rest of the top-left Region
    expect(colourNear(game, 2)).toBe("red");
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
    expect(colours).toEqual(["red", "red", "blue", "blue", "red", "blue", "blue", "blue"]);
    expect(game.scores.red).toBeCloseTo(0.35);
    expect(game.scores.blue).toBeCloseTo(0.65);
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

const blueWinsGame: [number, number][] = [
  [0, 10], [5, 15], [2, 12], [7, 17], [1, 4], [3, 9], [6, 13], [8, 18], [11, 16], [14, 19],
];

describe("the end of the game", () => {
  it("is in progress until the 10th Move", () => {
    const games = playEach(...blueWinsGame);
    for (const game of games.slice(0, 10)) expect(game.outcome).toBe("in-progress");
  });

  it("comes after 10 Moves, with the larger Score winning", () => {
    const game = play(...blueWinsGame);

    expect(game.outcome).toBe("blue-wins");
    expect(game.scores.red).toBeCloseTo(0.4303, 4);
    expect(game.scores.blue).toBeCloseTo(0.5697, 4);
  });

  it("rejects any further Moves", () => {
    const game = play(...blueWinsGame);

    expect(isLegalMove(game, { start: 0, end: 10 })).toBe(false);
    expect(() => applyMove(game, { start: 0, end: 10 })).toThrow();
  });
});

describe("a preview", () => {
  it("returns the same Regions as applying the Move, and leaves the game unchanged", () => {
    const game = play([0, 10], [5, 15]);
    const before = structuredClone(game);

    const preview = previewMove(game, { start: 2, end: 12 });

    expect(preview).toEqual(applyMove(game, { start: 2, end: 12 }).regions);
    expect(game).toEqual(before);
  });
});

/** 9 Moves leaving Points 7 and 8 unused: Red is ahead, but the Region beside them is Red's. */
const stuckGame: [number, number][] = [
  [14, 17], [1, 5], [11, 19], [9, 0], [4, 12], [18, 2], [3, 10], [15, 13], [6, 16],
];

/** 9 Moves leaving Points 19 and 0 unused, either side of the top of the Board. */
const stuckAcrossZeroGame: [number, number][] = [
  [7, 18], [17, 15], [5, 9], [13, 3], [1, 6], [8, 14], [11, 2], [10, 4], [16, 12],
];

describe("a game where the last two unused Points are adjacent", () => {
  it("ends after the 9th Move, with Blue stuck beside those Points", () => {
    const games = playEach(...stuckGame);
    for (const game of games.slice(0, 9)) expect(game.outcome).toBe("in-progress");

    const game = games[9];
    expect(game.outcome).not.toBe("in-progress");
    expect(game.stuck).toEqual({ player: "blue", points: [7, 8] });
    expect(game.moves).toHaveLength(9);
  });

  it("names the wrap-around pair as 19 and 0", () => {
    const game = play(...stuckAcrossZeroGame);

    expect(game.outcome).not.toBe("in-progress");
    expect(game.stuck).toEqual({ player: "blue", points: [19, 0] });
  });

  it("under Award, turns the Region beside the Points blue, which can change the winner", () => {
    const skip = playEachWith("skip", ...stuckGame).at(-1)!;
    const award = play(...stuckGame);

    expect(colourNear(skip, 7.5, 0.97)).toBe("red");
    expect(colourNear(award, 7.5, 0.97)).toBe("blue");
    expect(award.scores.blue).toBeGreaterThan(skip.scores.blue);
    expect(award.scores.red + award.scores.blue).toBeCloseTo(1, 9);
    expect(skip.outcome).toBe("red-wins");
    expect(award.outcome).toBe("blue-wins");
  });

  it("under Award, finds the Region beside the wrap-around pair", () => {
    const skip = playEachWith("skip", ...stuckAcrossZeroGame).at(-1)!;
    const award = play(...stuckAcrossZeroGame);

    expect(colourNear(skip, 19.5, 0.97)).toBe("red");
    expect(colourNear(award, 19.5, 0.97)).toBe("blue");
    expect(award.outcome).toBe("blue-wins");
  });

  it("under Skip, leaves the Regions and Scores as they were after the 9th Move", () => {
    const games = playEachWith("skip", ...stuckGame);
    const game = games[9];

    expect(game.regions).toEqual(previewMove(games[8], { start: 6, end: 16 }));
    expect(game.stuck).toEqual({ player: "blue", points: [7, 8] });
    expect(game.scores.red).toBeCloseTo(0.5915, 4);
    expect(game.scores.blue).toBeCloseTo(0.4085, 4);
    expect(game.outcome).toBe("red-wins");
  });

  it("rejects any further Move", () => {
    const game = play(...stuckGame);

    expect(isLegalMove(game, { start: 7, end: 8 })).toBe(false);
    expect(() => applyMove(game, { start: 7, end: 8 })).toThrow();
  });
});

describe("a game whose last two unused Points are not adjacent", () => {
  it("is still in progress after the 9th Move", () => {
    const game = play(...blueWinsGame.slice(0, 9));

    expect(game.outcome).toBe("in-progress");
    expect(game.stuck).toBeNull();
    expect(game.mover).toBe("blue");
  });
});
