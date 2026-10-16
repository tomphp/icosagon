import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { Browser, Page } from "puppeteer-core";
import { chooseMove } from "../src/computer.ts";
import { applyMove, createGame, type Ending, type Game, type Move, type Player } from "../src/game.ts";
import { drag, isDisabled, isVisible, launch, selectedText, stubRandom, text } from "./page.ts";

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

const scoreText = (game: Game) => `Red ${percent(game.scores.red)}, Blue ${percent(game.scores.blue)}`;

async function expectScores(page: Page, game: Game) {
  expect(await text(page, "#score-red")).toBe(`Red ${percent(game.scores.red)}`);
  expect(await text(page, "#score-blue")).toBe(`Blue ${percent(game.scores.blue)}`);
}

const SELECTORS = ["#opponent", "#strategy", "#ending"];
const lockedSelectors = (page: Page) => Promise.all(SELECTORS.map((s) => isDisabled(page, s)));

async function openPage(randomValues: number[]) {
  const page = await browser.newPage();
  await stubRandom(page, randomValues);
  await page.goto(inject("baseUrl"));
  return page;
}

/**
 * Opens the page against the Random Computer: choosing Computer flips the coin so the Human is Red
 * and the default Greedy Computer doesn't move; choosing Random flips it again with `humanColour`,
 * and the random values follow.
 */
async function openAgainstRandom(humanColour: number, randomValues: number[]) {
  const page = await openPage([HUMAN_RED, humanColour, ...randomValues]);
  await page.select("#opponent", "computer");
  await page.select("#strategy", "random");
  return page;
}

describe("Play against on the page", () => {
  it("is Human by default, with no colour label", async () => {
    const page = await openPage([HUMAN_RED]);

    expect(await selectedText(page, "#opponent")).toBe("Human");
    expect(await isVisible(page, "#you")).toBe(false);
    expect(await isVisible(page, "#computer-played")).toBe(false);
    expect(await text(page, "#turn")).toBe("Red to move");
  });

  it("against the Computer as Red, starts with an empty Board and replies at once to each Move", async () => {
    // The Computer, as Blue, answers 0→10 with 5→15.
    const { game: afterReply, values } = script("award", "blue", [[0, 10], [5, 15]]);
    const page = await openAgainstRandom(HUMAN_RED, values);

    expect(await isVisible(page, "#you")).toBe(true);
    expect(await text(page, "#you")).toBe("You are Red");
    expect(await text(page, "#turn")).toBe("Your move (Red)");
    await expectScores(page, createGame("award"));
    expect(await lockedSelectors(page)).toEqual([false, false, false]);
    expect(await isVisible(page, "#computer-played")).toBe(false);

    await drag(page, 0, 10);
    expect(await text(page, "#turn")).toBe("Your move (Red)");
    expect(await text(page, "#computer-played")).toBe("Computer played 5→15");
    await expectScores(page, afterReply);
    expect(await lockedSelectors(page)).toEqual([true, true, true]);
  });

  it("against the Computer as Blue, the Computer has already moved and the selectors are still usable", async () => {
    // The Computer, as Red, opens with 0→10, then answers 5→15 with 2→12.
    const { game: opening, values: openingValues } = script("award", "red", [[0, 10]]);
    const { game: afterReply, values } = script("award", "red", [[0, 10], [5, 15], [2, 12]]);
    const page = await openAgainstRandom(HUMAN_BLUE, [...values, HUMAN_RED]);
    expect(openingValues).toEqual(values.slice(0, 1));

    expect(await text(page, "#you")).toBe("You are Blue");
    expect(await text(page, "#turn")).toBe("Your move (Blue)");
    await expectScores(page, opening);
    expect(await lockedSelectors(page)).toEqual([false, false, false]);
    expect(await text(page, "#computer-played")).toBe("Computer played 0→10");

    await drag(page, 5, 15);
    expect(await text(page, "#turn")).toBe("Your move (Blue)");
    expect(await text(page, "#computer-played")).toBe("Computer played 2→12");
    await expectScores(page, afterReply);
    expect(await lockedSelectors(page)).toEqual([true, true, true]);

    // New game keeps the settings, unlocks them and flips the colours again.
    await page.click("#new-game");
    expect(await lockedSelectors(page)).toEqual([false, false, false]);
    expect(await selectedText(page, "#opponent")).toBe("Computer");
    expect(await selectedText(page, "#strategy")).toBe("Random");
    expect(await text(page, "#you")).toBe("You are Red");
    expect(await text(page, "#turn")).toBe("Your move (Red)");
    expect(await isVisible(page, "#computer-played")).toBe(false);
    await expectScores(page, createGame("award"));
  });

  it("switching back to Human starts a Human vs Human game", async () => {
    const page = await openPage([HUMAN_RED]);

    await page.select("#opponent", "computer");
    await page.select("#opponent", "human");
    expect(await isVisible(page, "#you")).toBe(false);
    expect(await isVisible(page, "#computer-played")).toBe(false);
    expect(await text(page, "#turn")).toBe("Red to move");

    await drag(page, 0, 10);
    expect(await text(page, "#turn")).toBe("Blue to move");
  });
});

describe("Strategy on the page", () => {
  it("is Greedy by default, and disabled while Play against is Human", async () => {
    const page = await openPage([HUMAN_RED]);

    expect(await selectedText(page, "#strategy")).toBe("Greedy");
    expect(await isDisabled(page, "#strategy")).toBe(true);

    await page.select("#opponent", "computer");
    expect(await isDisabled(page, "#strategy")).toBe(false);

    await page.select("#opponent", "human");
    expect(await isDisabled(page, "#strategy")).toBe(true);
    expect(await selectedText(page, "#strategy")).toBe("Greedy");
  });

  it("the Computer plays the selected Strategy, and changing it starts a new game", async () => {
    // With the same random value, Greedy and Random open with different Moves.
    const value = 0.5;
    const fresh = createGame("award");
    const greedy = chooseMove(fresh, "greedy", () => value);
    const random = chooseMove(fresh, "random", () => value);
    expect(greedy).not.toEqual(random);
    const page = await openPage([HUMAN_BLUE, value, HUMAN_BLUE, value]);

    await page.select("#opponent", "computer");
    expect(await text(page, "#computer-played")).toBe(`Computer played ${greedy.start}→${greedy.end}`);
    await expectScores(page, applyMove(fresh, greedy));

    await page.select("#strategy", "random");
    expect(await text(page, "#computer-played")).toBe(`Computer played ${random.start}→${random.end}`);
    await expectScores(page, applyMove(fresh, random));
    expect(await lockedSelectors(page)).toEqual([false, false, false]);
  });
});

/** 9 Moves leaving Points 7 and 8 unused, so Blue has no legal 10th Move. */
const stuckGame: [number, number][] = [
  [14, 17], [1, 5], [11, 19], [9, 0], [4, 12], [18, 2], [3, 10], [15, 13], [6, 16],
];

describe("a stuck game against the Computer on the page", () => {
  it("ends when the Computer is stuck, under Award", async () => {
    const { game, values } = script("award", "blue", stuckGame);
    const page = await openAgainstRandom(HUMAN_RED, values);

    for (const [start, end] of stuckGame.filter((_, i) => i % 2 === 0)) await drag(page, start, end);

    expect(await text(page, "#turn")).toBe("Game over — Blue has no legal Move and takes the Region by Points 7 and 8");
    // The Human made the last Move, so the Computer's earlier Move is no longer shown.
    expect(await isVisible(page, "#computer-played")).toBe(false);
    expect(await text(page, "#result")).toBe(`Computer wins: ${scoreText(game)}`);
    await expectScores(page, game);
  });

  it("ends when the Human is stuck, under Award, and the Human wins", async () => {
    const { game, values } = script("award", "red", stuckGame);
    const page = await openAgainstRandom(HUMAN_BLUE, values);

    for (const [start, end] of stuckGame.filter((_, i) => i % 2 === 1)) await drag(page, start, end);

    expect(await text(page, "#turn")).toBe("Game over — Blue has no legal Move and takes the Region by Points 7 and 8");
    expect(await text(page, "#result")).toBe(`You win: ${scoreText(game)}`);
    await expectScores(page, game);
  });

  it("ends when the Human is stuck, under Skip", async () => {
    const { game, values } = script("skip", "red", stuckGame);
    const page = await openAgainstRandom(HUMAN_RED, [HUMAN_BLUE, ...values]);
    // Choosing Skip flips the coin too; the Human ends up Blue only after that flip.
    await page.select("#ending", "skip");
    expect(await text(page, "#you")).toBe("You are Blue");

    for (const [start, end] of stuckGame.filter((_, i) => i % 2 === 1)) await drag(page, start, end);

    expect(await text(page, "#turn")).toBe("Game over — Blue has no legal Move");
    expect(await text(page, "#computer-played")).toBe("Computer played 6→16");
    expect(await text(page, "#result")).toBe(`Computer wins: ${scoreText(game)}`);
    await expectScores(page, game);

    // The game is over, so no Line can be drawn between the last two Points.
    await drag(page, 7, 8);
    await expectScores(page, game);
  });
});

/** The committed fixture Model's option. */
const FIXTURE = { value: "neural:fixture", label: "Neural: fixture (0 gens)" };

const optionTexts = (page: Page, selector: string) =>
  page.$eval(selector, (el) => Array.from((el as HTMLSelectElement).options, (o) => o.text));

/**
 * Picks the Strategy option and plays the Human's share of a game against it to Game over, checking
 * that every Move the Computer plays is legal.
 */
async function playToGameOver({ value, label }: { value: string; label: string }) {
  const page = await openPage([HUMAN_RED]);
  await page.select("#opponent", "computer");
  await page.select("#strategy", value);
  expect(await selectedText(page, "#strategy")).toBe(label);
  expect(await text(page, "#you")).toBe("You are Red");

  let game = createGame("award");
  while (game.outcome === "in-progress") {
    // The Human plays some legal Move; applying the Computer's reply checks that it is legal.
    const move = chooseMove(game, "random", () => 0);
    await drag(page, move.start, move.end);
    game = applyMove(game, move);
    if (game.outcome !== "in-progress") break;
    const played = (await text(page, "#computer-played"))!.match(/^Computer played (\d+)→(\d+)$/);
    expect(played).not.toBeNull();
    game = applyMove(game, { start: Number(played![1]), end: Number(played![2]) });
    await expectScores(page, game);
  }

  expect(await text(page, "#result")).toMatch(/^(You win|Computer wins|Draw): /);
  expect(await text(page, "#result")).toContain(scoreText(game));
}

describe("the Hoarder on the page", () => {
  it("is offered after Greedy", async () => {
    const page = await openPage([HUMAN_RED]);

    expect((await optionTexts(page, "#strategy")).slice(0, 3)).toEqual(["Random", "Greedy", "Hoarder"]);
  });

  it("plays only legal Moves against the Human to Game over", () => playToGameOver({ value: "hoarder", label: "Hoarder" }));
});

describe("the Clever Hoarder on the page", () => {
  it("is offered after the Hoarder", async () => {
    const page = await openPage([HUMAN_RED]);

    expect((await optionTexts(page, "#strategy")).slice(0, 4)).toEqual(["Random", "Greedy", "Hoarder", "Clever Hoarder"]);
  });

  it("plays only legal Moves against the Human to Game over", () =>
    playToGameOver({ value: "clever-hoarder", label: "Clever Hoarder" }));
});

describe("a Neural Model on the page", () => {
  it("is offered after the named Strategies, with Greedy still the default", async () => {
    const page = await openPage([HUMAN_RED]);

    const options = await optionTexts(page, "#strategy");
    expect(options.slice(0, 4)).toEqual(["Random", "Greedy", "Hoarder", "Clever Hoarder"]);
    // models/ holds other Models too; only the fixture is sure to be there.
    expect(options.slice(4)).toContain(FIXTURE.label);
    expect(await selectedText(page, "#strategy")).toBe("Greedy");
  });

  it("plays only legal Moves against the Human to Game over", () => playToGameOver(FIXTURE));
});
