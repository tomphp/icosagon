import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { Browser, Page } from "puppeteer-core";
import { canvasImage, drag, hold, isDisabled, isVisible, launch, selectedText, text } from "./page";

let browser: Browser;
beforeAll(async () => {
  browser = await launch();
});
afterAll(() => browser?.close());

const blueWinsGame: [number, number][] = [
  [0, 10], [5, 15], [2, 12], [7, 17], [1, 4], [3, 9], [6, 13], [8, 18], [11, 16], [14, 19],
];

describe("playing on the page", () => {
  it("one drag across a diameter Splits the Board 50% / 50%", async () => {
    const page = await browser.newPage();
    await page.goto(inject("baseUrl"));

    expect(await text(page, "#score-red")).toBe("Red 0.0%");
    expect(await text(page, "#score-blue")).toBe("Blue 0.0%");

    await drag(page, 0, 10);

    expect(await text(page, "#score-red")).toBe("Red 50.0%");
    expect(await text(page, "#score-blue")).toBe("Blue 50.0%");
  });
});

describe("taking turns on the page", () => {
  it("shows whose turn it is and updates the Scores after every Move", async () => {
    const page = await browser.newPage();
    await page.goto(inject("baseUrl"));
    expect(await text(page, "#turn")).toBe("Red to move");

    await drag(page, 0, 10);
    expect(await text(page, "#turn")).toBe("Blue to move");

    // Blue's crossing diameter: Red keeps the top half, Blue gets the bottom.
    await drag(page, 5, 15);
    expect(await text(page, "#turn")).toBe("Red to move");
    expect(await text(page, "#score-red")).toBe("Red 50.0%");
    expect(await text(page, "#score-blue")).toBe("Blue 50.0%");

    // Red cuts off the corner between Points 1 and 4 (1.9% of the Board); the rest of the
    // top-right quarter it passes through goes to Blue.
    await drag(page, 1, 4);
    expect(await text(page, "#turn")).toBe("Blue to move");
    expect(await text(page, "#score-red")).toBe("Red 26.9%");
    expect(await text(page, "#score-blue")).toBe("Blue 73.1%");
  });
});

describe("the end of a game on the page", () => {

  it("announces the result after the 10th Move, locks the Board, and New game resets it", async () => {
    const page = await browser.newPage();
    await page.goto(inject("baseUrl"));
    expect(await isVisible(page, "#result")).toBe(false);

    for (const [start, end] of blueWinsGame) await drag(page, start, end);

    expect(await isVisible(page, "#result")).toBe(true);
    expect(await text(page, "#result")).toBe("Blue wins: Red 46.8%, Blue 53.2%");

    // Every Point is used, so no drag can start; the finished Board stays as it was.
    await drag(page, 0, 10);
    expect(await text(page, "#score-red")).toBe("Red 46.8%");
    expect(await text(page, "#score-blue")).toBe("Blue 53.2%");

    await page.click("#new-game");
    expect(await isVisible(page, "#result")).toBe(false);
    expect(await text(page, "#turn")).toBe("Red to move");
    expect(await text(page, "#score-red")).toBe("Red 0.0%");
    expect(await text(page, "#score-blue")).toBe("Blue 0.0%");

    await drag(page, 0, 10);
    expect(await text(page, "#score-red")).toBe("Red 50.0%");
  });
});

describe("invalid drags on the page", () => {
  it("leave the Board, the Scores and the turn unchanged, so the same Player tries again", async () => {
    const page = await browser.newPage();
    await page.goto(inject("baseUrl"));
    const expectState = async (turn: string, red: string, blue: string) => {
      expect(await text(page, "#turn")).toBe(turn);
      expect(await text(page, "#score-red")).toBe(red);
      expect(await text(page, "#score-blue")).toBe(blue);
    };

    await drag(page, 0, "corner"); // released on empty space outside the Board
    await drag(page, 0, "centre"); // released on empty space inside the Board
    await drag(page, 0, 1); // released on a neighbouring Point
    await drag(page, 0, 19); // released on a neighbouring Point across Point 0
    await drag(page, 0, "centre", 0); // released back on the start Point
    await drag(page, "centre", 10); // pressed on empty space
    await expectState("Red to move", "Red 0.0%", "Blue 0.0%");

    await drag(page, 0, 10);
    await expectState("Blue to move", "Red 50.0%", "Blue 50.0%");

    const board = await canvasImage(page);

    // Pressing on a used Point or empty space starts no drag, so no Line follows the pointer.
    for (const from of [10, "corner", "centre"] as const) {
      await hold(page, from, 15);
      expect(await canvasImage(page)).toBe(board);
      await page.mouse.up();
    }

    // Holding on a legal start Point does draw a Line, which a cancelled release removes.
    await hold(page, 5, 0); // over a used Point
    expect(await canvasImage(page)).not.toBe(board);
    await page.mouse.up();
    expect(await canvasImage(page)).toBe(board);
    await expectState("Blue to move", "Red 50.0%", "Blue 50.0%");

    // Blue's crossing diameter: Red keeps the top half, Blue gets the bottom.
    await drag(page, 5, 15);
    await expectState("Red to move", "Red 50.0%", "Blue 50.0%");

    await drag(page, 1, 5); // released on a used Point
    await drag(page, 1, 2); // released on a neighbouring Point
    await expectState("Red to move", "Red 50.0%", "Blue 50.0%");

    await drag(page, 1, 4);
    await expectState("Blue to move", "Red 26.9%", "Blue 73.1%");
  });
});

describe("the Rule set on the page", () => {
  const ruleSet = (page: Page) => selectedText(page, "#rule-set");
  const isLocked = (page: Page) => isDisabled(page, "#rule-set");

  it("can be chosen before the first Move, locks after it, and unlocks on New game", async () => {
    const page = await browser.newPage();
    await page.goto(inject("baseUrl"));
    expect(await ruleSet(page)).toBe("Full split");
    expect(await isLocked(page)).toBe(false);

    await page.select("#rule-set", "claim");
    expect(await ruleSet(page)).toBe("Claim");

    await drag(page, 0, 10);
    expect(await isLocked(page)).toBe(true);
    expect(await ruleSet(page)).toBe("Claim");

    for (const [start, end] of blueWinsGame.slice(1)) await drag(page, start, end);
    // The same Moves as the Full split game, which ends 46.8% / 53.2%.
    expect(await text(page, "#result")).toBe("Blue wins: Red 43.0%, Blue 57.0%");
    expect(await isLocked(page)).toBe(true);

    await page.click("#new-game");
    expect(await isLocked(page)).toBe(false);
    expect(await ruleSet(page)).toBe("Claim");
  });
});
