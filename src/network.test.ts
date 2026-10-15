import { describe, expect, it } from "vitest";
import { chooseMove } from "./computer.ts";
import { applyMove, createGame, type Game } from "./game.ts";
import { INPUT, inputsFor } from "./network.ts";

const SPOTS = INPUT.points - INPUT.spots;

/** The colour and Settled inputs at each sample spot. */
function spots(game: Game) {
  const inputs = inputsFor(game, "red");
  return Array.from({ length: SPOTS }, (_, i) => ({ colour: inputs[INPUT.spots + i], settled: inputs[INPUT.settled + i] }));
}

describe("the Settled inputs", () => {
  it("are all 0 in a fresh game", () => {
    expect(spots(createGame("award")).every(({ settled }) => settled === 0)).toBe(true);
  });

  it("are 1 at every coloured spot at Game over, when no Move can split a Region", () => {
    let game = createGame("award");
    while (game.outcome === "in-progress") game = applyMove(game, chooseMove(game, "greedy", () => 0));

    expect(spots(game).every(({ colour, settled }) => settled === Math.abs(colour))).toBe(true);
  });

  it("mark only the coloured spots in Regions no legal Move would split", () => {
    // 0→18, 17→19 and 1→16 cut parallel strips off the Board by Points 0 and 18; Lines between the
    // used Points can no longer split the strips, but the rest of the Board can still be split.
    const game = [[0, 18], [17, 19], [1, 16]].reduce(
      (g: Game, [start, end]) => applyMove(g, { start, end }),
      createGame("award"),
    );
    const all = spots(game);

    expect(all.every(({ colour, settled }) => settled === 0 || colour !== 0)).toBe(true);
    expect(all.some(({ settled }) => settled === 1)).toBe(true);
    expect(all.some(({ colour, settled }) => colour !== 0 && settled === 0)).toBe(true);
  });
});
