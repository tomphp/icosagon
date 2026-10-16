import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { Browser, Page } from "puppeteer-core";
import { chooseMove } from "../src/computer.ts";
import { applyMove, createGame, type Ending, type Game, type Move, type Player } from "../src/game.ts";
import { drag, hasButton, isPressed, launch, pillLabels, press, start, status, stubRandom, text } from "./page.ts";

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

/** Checks the status mirror's Scores, the Human's first as they are on the left. */
async function expectScores(page: Page, game: Game, human: Player = "red") {
  const score = (p: Player) => `${p === "red" ? "Red" : "Blue"} ${percent(game.scores[p])}`;
  expect((await status(page)).scores).toBe(`${score(human)}, ${score(human === "red" ? "blue" : "red")}`);
}

async function openPage(randomValues: number[]) {
  const page = await browser.newPage();
  await stubRandom(page, randomValues);
  await page.goto(inject("baseUrl"));
  return page;
}

/**
 * Opens the page and starts a game against the Random Computer, pressing the other pills first: Start
 * flips the coin with `humanColour`, and the random values follow.
 */
async function openAgainstRandom(humanColour: number, randomValues: number[], ...pills: string[]) {
  const page = await openPage([humanColour, ...randomValues]);
  await start(page, "strategy:random", ...pills);
  return page;
}

describe("the Opponent on the page", () => {
  it("in Human vs Human, puts Red on the left and Blue on the right and lets both Players move", async () => {
    const page = await openPage([HUMAN_RED]);
    await start(page, "opponent:human");

    expect(await status(page)).toEqual({
      sides: "Human (Red) vs Human (Blue)",
      turn: "Red to move",
      scores: "Red 0.0%, Blue 0.0%",
    });

    await drag(page, 0, 10);
    expect((await status(page)).turn).toBe("Blue to move");
  });

  it("against the Computer as Red, starts with an empty Board and replies at once to each Move", async () => {
    // The Computer, as Blue, answers 0→10 with 5→15.
    const { game: afterReply, values } = script("award", "blue", [[0, 10], [5, 15]]);
    const page = await openAgainstRandom(HUMAN_RED, values);

    expect((await status(page)).sides).toBe("Human (Red) vs Computer (Blue)");
    expect((await status(page)).turn).toBe("Your move (Red)");
    await expectScores(page, createGame("award"));
    expect((await status(page)).computer).toBeUndefined();

    await drag(page, 0, 10);
    expect((await status(page)).turn).toBe("Your move (Red)");
    expect((await status(page)).computer).toBe("Computer played 5→15");
    await expectScores(page, afterReply);
  });

  it("against the Computer as Blue, the Computer has already moved, and Start flips the coin again", async () => {
    // The Computer, as Red, opens with 0→10, then answers 5→15 with 2→12.
    const { game: opening, values: openingValues } = script("award", "red", [[0, 10]]);
    const { game: afterReply, values } = script("award", "red", [[0, 10], [5, 15], [2, 12]]);
    const page = await openAgainstRandom(HUMAN_BLUE, [...values, HUMAN_RED]);
    expect(openingValues).toEqual(values.slice(0, 1));

    expect((await status(page)).sides).toBe("Human (Blue) vs Computer (Red)");
    expect((await status(page)).turn).toBe("Your move (Blue)");
    await expectScores(page, opening, "blue");
    expect((await status(page)).computer).toBe("Computer played 0→10");

    await drag(page, 5, 15);
    expect((await status(page)).turn).toBe("Your move (Blue)");
    expect((await status(page)).computer).toBe("Computer played 2→12");
    await expectScores(page, afterReply, "blue");

    // The Start Screen keeps the Settings, and the next game flips the colours again.
    await press(page, "menu");
    expect(await isPressed(page, "opponent:computer")).toBe(true);
    expect(await isPressed(page, "strategy:random")).toBe(true);
    await press(page, "start");
    expect((await status(page)).sides).toBe("Human (Red) vs Computer (Blue)");
    expect((await status(page)).turn).toBe("Your move (Red)");
    expect((await status(page)).computer).toBeUndefined();
    await expectScores(page, createGame("award"));
  });
});

describe("Strategy on the page", () => {
  it("is Greedy by default, and hidden while the Opponent is Human", async () => {
    const page = await openPage([HUMAN_RED]);
    expect(await isPressed(page, "strategy:greedy")).toBe(true);

    await press(page, "opponent:human");
    expect(await hasButton(page, "strategy:greedy")).toBe(false);

    await press(page, "opponent:computer");
    expect(await isPressed(page, "strategy:greedy")).toBe(true);
  });

  it("the Computer plays the chosen Strategy", async () => {
    // With the same random value, Greedy and Random open with different Moves.
    const value = 0.5;
    const fresh = createGame("award");
    const greedy = chooseMove(fresh, "greedy", () => value);
    const random = chooseMove(fresh, "random", () => value);
    expect(greedy).not.toEqual(random);
    const page = await openPage([HUMAN_BLUE, value, HUMAN_BLUE, value]);

    await start(page);
    expect((await status(page)).computer).toBe(`Computer played ${greedy.start}→${greedy.end}`);
    await expectScores(page, applyMove(fresh, greedy), "blue");

    await press(page, "menu");
    await start(page, "strategy:random");
    expect((await status(page)).computer).toBe(`Computer played ${random.start}→${random.end}`);
    await expectScores(page, applyMove(fresh, random), "blue");
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

    expect((await status(page)).turn).toBe("Game over — Blue has no legal Move and takes the Region by Points 7 and 8");
    // The Human made the last Move, so the Computer's earlier Move is no longer shown.
    expect((await status(page)).computer).toBeUndefined();
    expect(await text(page, "#result")).toBe(`Computer wins: ${scoreText(game)}`);
    await expectScores(page, game);
  });

  it("ends when the Human is stuck, under Award, and the Human wins", async () => {
    const { game, values } = script("award", "red", stuckGame);
    const page = await openAgainstRandom(HUMAN_BLUE, values);

    for (const [start, end] of stuckGame.filter((_, i) => i % 2 === 1)) await drag(page, start, end);

    expect((await status(page)).turn).toBe("Game over — Blue has no legal Move and takes the Region by Points 7 and 8");
    expect(await text(page, "#result")).toBe(`You win: ${scoreText(game)}`);
    await expectScores(page, game, "blue");
  });

  it("ends when the Human is stuck, under Skip", async () => {
    const { game, values } = script("skip", "red", stuckGame);
    const page = await openAgainstRandom(HUMAN_BLUE, values, "ending:skip");
    expect((await status(page)).sides).toBe("Human (Blue) vs Computer (Red)");

    for (const [start, end] of stuckGame.filter((_, i) => i % 2 === 1)) await drag(page, start, end);

    expect((await status(page)).turn).toBe("Game over — Blue has no legal Move");
    expect((await status(page)).computer).toBe("Computer played 6→16");
    expect(await text(page, "#result")).toBe(`Computer wins: ${scoreText(game)}`);
    await expectScores(page, game, "blue");

    // The game is over, so no Line can be drawn between the last two Points.
    await drag(page, 7, 8);
    await expectScores(page, game, "blue");
  });
});

/** The committed fixture Model's pill. */
const FIXTURE = { value: "neural:fixture", label: "Neural: fixture (0 gens)" };

/**
 * Starts a game with the Strategy pill and plays the Human's share of a game against it to Game over, checking
 * that every Move the Computer plays is legal.
 */
async function playToGameOver({ value, label }: { value: string; label: string }) {
  const page = await openPage([HUMAN_RED]);
  const key = `strategy:${value}`;
  expect(await pillLabels(page, key)).toEqual([label]);
  await start(page, key);
  expect((await status(page)).sides).toBe("Human (Red) vs Computer (Blue)");

  let game = createGame("award");
  while (game.outcome === "in-progress") {
    // The Human plays some legal Move; applying the Computer's reply checks that it is legal.
    const move = chooseMove(game, "random", () => 0);
    await drag(page, move.start, move.end);
    game = applyMove(game, move);
    if (game.outcome !== "in-progress") break;
    const played = (await status(page)).computer.match(/^Computer played (\d+)→(\d+)$/);
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

    expect((await pillLabels(page, "strategy:")).slice(0, 3)).toEqual(["Random", "Greedy", "Hoarder"]);
  });

  it("plays only legal Moves against the Human to Game over", () => playToGameOver({ value: "hoarder", label: "Hoarder" }));
});

describe("the Clever Hoarder on the page", () => {
  it("is offered after the Hoarder", async () => {
    const page = await openPage([HUMAN_RED]);

    expect((await pillLabels(page, "strategy:")).slice(0, 4)).toEqual(["Random", "Greedy", "Hoarder", "Clever Hoarder"]);
  });

  it("plays only legal Moves against the Human to Game over", () =>
    playToGameOver({ value: "clever-hoarder", label: "Clever Hoarder" }));
});

describe("a Neural Model on the page", () => {
  it("is offered after the named Strategies, with Greedy still the default", async () => {
    const page = await openPage([HUMAN_RED]);

    const options = await pillLabels(page, "strategy:");
    expect(options.slice(0, 4)).toEqual(["Random", "Greedy", "Hoarder", "Clever Hoarder"]);
    // models/ holds other Models too; only the fixture is sure to be there.
    expect(options.slice(4)).toContain(FIXTURE.label);
    expect(await isPressed(page, "strategy:greedy")).toBe(true);
  });

  it("plays only legal Moves against the Human to Game over", () => playToGameOver(FIXTURE));
});
