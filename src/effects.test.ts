import { describe, expect, it } from "vitest";
import { effectsOf } from "./effects.ts";
import { applyMove, capturedRegions, createGame, type Ending } from "./game.ts";

/** The games before and after the last of the Moves, written as [start, end] pairs, from a fresh game. */
function lastMove(ending: Ending, ...moves: [number, number][]) {
  const before = moves.slice(0, -1).reduce((game, [start, end]) => applyMove(game, { start, end }), createGame(ending));
  const [start, end] = moves.at(-1)!;
  return { before, after: applyMove(before, { start, end }), move: { start, end } };
}

describe("the effects of a Move", () => {
  it("are one step at once, drawing the game after it and flashing its Captured Regions", () => {
    const { before, after, move } = lastMove("award", [0, 10], [15, 5]);

    expect(effectsOf(before, after)).toEqual([
      { at: 0, regions: after.regions, scores: after.scores, flash: capturedRegions(before, move), over: false },
    ]);
  });

  it("after the 10th Move, show Game Over at once", () => {
    const { before, after, move } = lastMove(
      "award", [0, 10], [5, 15], [2, 12], [7, 17], [1, 4], [3, 9], [6, 13], [8, 18], [11, 16], [14, 19],
    );

    expect(effectsOf(before, after)).toEqual([
      { at: 0, regions: after.regions, scores: after.scores, flash: capturedRegions(before, move), over: true },
    ]);
  });

  it("after a 9th Move under Skip, show Game Over at once", () => {
    const { before, after, move } = lastMove(
      "skip", [14, 17], [1, 5], [11, 19], [9, 0], [4, 12], [18, 2], [3, 10], [15, 13], [6, 16],
    );

    expect(effectsOf(before, after)).toEqual([
      { at: 0, regions: after.regions, scores: after.scores, flash: capturedRegions(before, move), over: true },
    ]);
  });
});

describe("the effects of a 9th Move under Award", () => {
  const stuckGame: [number, number][] = [
    [14, 17], [1, 5], [11, 19], [9, 0], [4, 12], [18, 2], [3, 10], [15, 13], [6, 16],
  ];

  it("first flash the Move's Captured Regions over the pre-Award Board, then flash the awarded Region with Game Over", () => {
    const { before, after, move } = lastMove("award", ...stuckGame);
    const skipped = lastMove("skip", ...stuckGame).after;
    const awarded = after.regions.filter((region, i) => region.colour !== skipped.regions[i].colour);

    expect(awarded).toHaveLength(1);
    expect(awarded[0].colour).toBe("blue");
    expect(skipped.scores.red).toBeCloseTo(0.5915, 4);
    expect(effectsOf(before, after)).toEqual([
      { at: 0, regions: skipped.regions, scores: skipped.scores, flash: capturedRegions(before, move), over: false },
      { at: 500, regions: after.regions, scores: after.scores, flash: awarded, over: true },
    ]);
  });
});
