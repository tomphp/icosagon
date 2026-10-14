import { describe, expect, it } from "vitest";
import { applyMove, createGame, isLegalMove } from "./game";

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

/** The colour of the Region that has a corner at (x, y) on the unit Board. */
function colourAt(game: ReturnType<typeof createGame>, x: number, y: number) {
  const region = game.regions.find((r) =>
    r.polygon.some((p) => Math.hypot(p.x - x, p.y - y) < 1e-9),
  );
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
    expect(colourAt(game, 1, 0)).toBe("red");
    expect(colourAt(game, -1, 0)).toBe("blue");
  });

  it("drawn in the opposite direction gives the opposite colouring", () => {
    const game = applyMove(createGame("full-split"), { start: 10, end: 0 });

    expect(colourAt(game, 1, 0)).toBe("blue");
    expect(colourAt(game, -1, 0)).toBe("red");
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
