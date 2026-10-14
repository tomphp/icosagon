import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { Browser, Page } from "puppeteer-core";
import { chooseMove } from "../src/computer";
import { applyMove, createGame, type Ending, type Game, type Move, type Player } from "../src/game";
import { drag, isDisabled, isVisible, launch, selectedText, stubRandom, text } from "./page";

let browser: Browser;
beforeAll(async () => {
  browser = await launch();
});
afterAll(() => browser?.close());

/** Coin flip values: below a half the Human is Red, otherwise Blue. */
const HUMAN_RED = 0.1;
const HUMAN_BLUE = 0.9;

/** A random value that makes the Random Strategy choose the Move in the game. */
function randomFor(game: Game, move: Move): number {
  for (let i = 0; i < 1000; i++) {
    const value = (i + 0.5) / 1000;
    const chosen = chooseMove(game, "random", () => value);
    if (chosen.start === move.start && chosen.end === move.end) return value;
  }
  throw new Error(`Random never chooses ${move.start}→${move.end}`);
}

/**
 * Plays the Moves from a fresh game, returning the game after each and the random values that
 * make the Computer play its share of them.
 */
function script(ending: Ending, computer: Player, moves: [number, number][]) {
  let game = createGame(ending);
  const values: number[] = [];
  for (const [start, end] of moves) {
    if (game.mover === computer) values.push(randomFor(game, { start, end }));
    game = applyMove(game, { start, end });
  }
  return { game, values };
}

const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;

async function expectScores(page: Page, game: Game) {
  expect(await text(page, "#score-red")).toBe(`Red ${percent(game.scores.red)}`);
  expect(await text(page, "#score-blue")).toBe(`Blue ${percent(game.scores.blue)}`);
}

const SELECTORS = ["#opponent", "#ending"];
const lockedSelectors = (page: Page) => Promise.all(SELECTORS.map((s) => isDisabled(page, s)));

async function openPage(randomValues: number[]) {
  const page = await browser.newPage();
  await stubRandom(page, randomValues);
  await page.goto(inject("baseUrl"));
  return page;
}

describe("Play against on the page", () => {
  it("is Human by default, with no colour label", async () => {
    const page = await openPage([HUMAN_RED]);

    expect(await selectedText(page, "#opponent")).toBe("Human");
    expect(await isVisible(page, "#you")).toBe(false);
    expect(await text(page, "#turn")).toBe("Red to move");
  });

  it("against the Computer as Red, starts with an empty Board and replies at once to each Move", async () => {
    // The Computer, as Blue, answers 0→10 with 5→15.
    const { game: afterReply, values } = script("award", "blue", [[0, 10], [5, 15]]);
    const page = await openPage([HUMAN_RED, ...values]);

    await page.select("#opponent", "computer");
    expect(await isVisible(page, "#you")).toBe(true);
    expect(await text(page, "#you")).toBe("You are Red");
    expect(await text(page, "#turn")).toBe("Your move (Red)");
    await expectScores(page, createGame("award"));
    expect(await lockedSelectors(page)).toEqual([false, false]);

    await drag(page, 0, 10);
    expect(await text(page, "#turn")).toBe("Your move (Red)");
    await expectScores(page, afterReply);
    expect(await lockedSelectors(page)).toEqual([true, true]);
  });

  it("against the Computer as Blue, the Computer has already moved and the selectors are still usable", async () => {
    // The Computer, as Red, opens with 0→10, then answers 5→15 with 2→12.
    const { game: opening, values: openingValues } = script("award", "red", [[0, 10]]);
    const { game: afterReply, values } = script("award", "red", [[0, 10], [5, 15], [2, 12]]);
    const page = await openPage([HUMAN_BLUE, ...values, HUMAN_RED]);
    expect(openingValues).toEqual(values.slice(0, 1));

    await page.select("#opponent", "computer");
    expect(await text(page, "#you")).toBe("You are Blue");
    expect(await text(page, "#turn")).toBe("Your move (Blue)");
    await expectScores(page, opening);
    expect(await lockedSelectors(page)).toEqual([false, false]);

    await drag(page, 5, 15);
    expect(await text(page, "#turn")).toBe("Your move (Blue)");
    await expectScores(page, afterReply);
    expect(await lockedSelectors(page)).toEqual([true, true]);

    // New game keeps the settings, unlocks them and flips the colours again.
    await page.click("#new-game");
    expect(await lockedSelectors(page)).toEqual([false, false]);
    expect(await selectedText(page, "#opponent")).toBe("Computer");
    expect(await text(page, "#you")).toBe("You are Red");
    expect(await text(page, "#turn")).toBe("Your move (Red)");
    await expectScores(page, createGame("award"));
  });

  it("switching back to Human starts a Human vs Human game", async () => {
    const page = await openPage([HUMAN_RED]);

    await page.select("#opponent", "computer");
    await page.select("#opponent", "human");
    expect(await isVisible(page, "#you")).toBe(false);
    expect(await text(page, "#turn")).toBe("Red to move");

    await drag(page, 0, 10);
    expect(await text(page, "#turn")).toBe("Blue to move");
  });
});

/** 9 Moves leaving Points 7 and 8 unused, so Blue has no legal 10th Move. */
const stuckGame: [number, number][] = [
  [14, 17], [1, 5], [11, 19], [9, 0], [4, 12], [18, 2], [3, 10], [15, 13], [6, 16],
];

describe("a stuck game against the Computer on the page", () => {
  it("ends when the Computer is stuck, under Award", async () => {
    const { game, values } = script("award", "blue", stuckGame);
    const page = await openPage([HUMAN_RED, ...values]);
    await page.select("#opponent", "computer");

    for (const [start, end] of stuckGame.filter((_, i) => i % 2 === 0)) await drag(page, start, end);

    expect(await text(page, "#turn")).toBe("Game over — Blue has no legal Move and takes the Region by Points 7 and 8");
    expect(await isVisible(page, "#result")).toBe(true);
    await expectScores(page, game);
  });

  it("ends when the Human is stuck, under Skip", async () => {
    const { game, values } = script("skip", "red", stuckGame);
    const page = await openPage([HUMAN_RED, HUMAN_BLUE, ...values]);
    // Choosing Skip flips the coin too; the Human ends up Blue only after the second flip.
    await page.select("#opponent", "computer");
    await page.select("#ending", "skip");
    expect(await text(page, "#you")).toBe("You are Blue");

    for (const [start, end] of stuckGame.filter((_, i) => i % 2 === 1)) await drag(page, start, end);

    expect(await text(page, "#turn")).toBe("Game over — Blue has no legal Move");
    expect(await isVisible(page, "#result")).toBe(true);
    await expectScores(page, game);

    // The game is over, so no Line can be drawn between the last two Points.
    await drag(page, 7, 8);
    await expectScores(page, game);
  });
});
