import { describe, expect, it } from "vitest";
import { applyMove, createGame } from "./game.ts";
import { boardLayout, pointOnScreen } from "./layout.ts";
import { predictEnd } from "./predict.ts";

// A Board of radius 100 centred on (100, 100): Point 0 is at (100, 0), Point 10 at (100, 200).
const layout = boardLayout({ x: 0, y: 0, width: 200 / 0.9, height: 200 / 0.9 });
const fresh = createGame("award");

/** The pointer `distance` px from the start Point, heading towards Point `towards`. */
function aim(start: number, towards: number, distance = 40) {
  const a = pointOnScreen(layout, start);
  const b = pointOnScreen(layout, towards);
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  return { x: a.x + ((b.x - a.x) * distance) / length, y: a.y + ((b.y - a.y) * distance) / length };
}

describe("predicting the end Point of a drag", () => {
  it("predicts nothing while the pointer is within 20px of the start Point", () => {
    expect(predictEnd(fresh, layout, 0, aim(0, 10, 19.9))).toBeNull();
    expect(predictEnd(fresh, layout, 0, aim(0, 10, 20.001))).toBe(10);
  });

  it("aims at the legal end Point closest by angle to where the ray hits the Board's edge", () => {
    expect(predictEnd(fresh, layout, 0, aim(0, 7))).toBe(7);
    expect(predictEnd(fresh, layout, 3, aim(3, 16))).toBe(16);
    // Halfway between Points 7 and 8, nudged towards 8.
    const nudged = { x: (aim(0, 7).x + 1.1 * aim(0, 8).x) / 2.1, y: (aim(0, 7).y + 1.1 * aim(0, 8).y) / 2.1 };
    expect(predictEnd(fresh, layout, 0, nudged)).toBe(8);
  });

  it("skips used Points", () => {
    const game = applyMove(fresh, { start: 5, end: 15 });
    expect(predictEnd(game, layout, 0, aim(0, 15))).toBeOneOf([14, 16]);
    expect(predictEnd(game, layout, 0, aim(0, 5))).toBeOneOf([4, 6]);
  });

  it("skips Points adjacent to the start Point", () => {
    expect(predictEnd(fresh, layout, 0, aim(0, 1))).toBe(2);
    expect(predictEnd(fresh, layout, 0, aim(0, 19))).toBe(18);
  });

  it("predicts nothing when there is no legal end Point", () => {
    // 9 Moves leave only Points 7 and 8 unused, so the drag from 7 has nowhere legal to end.
    const stuck: [number, number][] = [[14, 17], [1, 5], [11, 19], [9, 0], [4, 12], [18, 2], [3, 10], [15, 13], [6, 16]];
    const game = stuck.reduce((g, [start, end]) => applyMove(g, { start, end }), fresh);
    expect(predictEnd(game, layout, 7, aim(7, 0))).toBeNull();
  });

  it("predicts nothing when the drag points away from the Board", () => {
    expect(predictEnd(fresh, layout, 0, { x: 100, y: -40 })).toBeNull();
  });
});
