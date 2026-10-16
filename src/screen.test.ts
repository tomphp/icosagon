import { describe, expect, it } from "vitest";
import { playingStatus } from "./playing-screen.ts";
import { DEFAULT_SETTINGS, makeMove, playComputer, startGame } from "./screen.ts";

/** Coin flip values: below a half the Human is Red, otherwise Blue. */
const HUMAN_RED = () => 0.1;
const HUMAN_BLUE = () => 0.9;

describe("a game against the Computer", () => {
  it("as Red, starts with the Computer to move and no Move made until it plays", () => {
    const state = startGame(DEFAULT_SETTINGS, HUMAN_BLUE);

    expect(state.game.moves).toEqual([]);
    expect(playingStatus(state).turn).toBe("Computer to move");

    const played = playComputer(state, HUMAN_BLUE);
    expect(played.game.moves).toHaveLength(1);
    expect(playingStatus(played).turn).toBe("Your move (Blue)");
  });

  it("as Blue, leaves the Computer to move after the Human's Move until it replies", () => {
    const state = makeMove(startGame(DEFAULT_SETTINGS, HUMAN_RED), { start: 0, end: 10 });

    expect(state.game.moves).toHaveLength(1);
    expect(playingStatus(state).turn).toBe("Computer to move");
    expect(playingStatus(playComputer(state, HUMAN_RED)).turn).toBe("Your move (Red)");
  });
});
