import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { Browser, Page } from "puppeteer-core";
import {
  canvasBox, canvasImage, drag, hasButton, hold, isPressed, launch, pillLabels, press, resizeWindow, start, status, swipe, text,
} from "./page.ts";

let browser: Browser;
beforeAll(async () => {
  browser = await launch();
});
afterAll(() => browser?.close());

/** Opens the page and starts a Human vs Human game, pressing the other pills first. */
async function open(page: Page, ...pills: string[]) {
  await page.goto(inject("baseUrl"));
  await start(page, "opponent:human", ...pills);
}

const blueWinsGame: [number, number][] = [
  [0, 10], [5, 15], [2, 12], [7, 17], [1, 4], [3, 9], [6, 13], [8, 18], [11, 16], [14, 19],
];

describe("the Start Screen on the page", () => {
  it("opens with Computer, Greedy and Award chosen, and How to play explains both Endings", async () => {
    const page = await browser.newPage();
    await page.goto(inject("baseUrl"));

    expect(await isPressed(page, "opponent:computer")).toBe(true);
    expect(await isPressed(page, "opponent:human")).toBe(false);
    expect(await isPressed(page, "strategy:greedy")).toBe(true);
    expect(await isPressed(page, "ending:award")).toBe(true);
    expect(await isPressed(page, "ending:skip")).toBe(false);
    expect(await status(page)).toEqual({});
    const howToPlay = await text(page, "#how-to-play");
    expect(howToPlay).toContain("Award: the Player who can't move takes the Region beside those two Points.");
    expect(howToPlay).toContain("Skip: they just miss the Move.");
  });

  it("takes pill and Start presses from the keyboard", async () => {
    const page = await browser.newPage();
    await page.goto(inject("baseUrl"));

    await page.focus('#mirror [data-key="opponent:human"]');
    await page.keyboard.press("Enter");
    expect(await isPressed(page, "opponent:human")).toBe(true);
    // Focus stays on Human as the Strategy row goes, so Tab moves on through Computer and Award to Skip.
    for (let i = 0; i < 3; i++) await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    expect(await isPressed(page, "ending:skip")).toBe(true);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    expect((await status(page)).turn).toBe("Red to move");
  });

  it("keeps the last Settings when the Menu returns to it", async () => {
    const page = await browser.newPage();
    await open(page, "ending:skip");
    await drag(page, 0, 10);

    await press(page, "menu");
    expect(await status(page)).toEqual({});
    expect(await isPressed(page, "opponent:human")).toBe(true);
    expect(await isPressed(page, "ending:skip")).toBe(true);
    expect(await hasButton(page, "strategy:greedy")).toBe(false);

    await press(page, "start");
    expect((await status(page)).turn).toBe("Red to move");
    expect((await status(page)).scores).toMatch(/^Red 0\.0%, /);
  });

  it("fits a small phone's width with every button inside the window", async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 320, height: 640, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await page.goto(inject("baseUrl"));

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    const boxes = await page.$$eval("#mirror button", (els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(320);
      expect(box.bottom).toBeLessThanOrEqual(640);
    }

    await press(page, "start");
    expect((await status(page)).turn).toMatch(/^Your move/);
  });
});

describe("playing on the page", () => {
  it("one drag across a diameter Splits the Board 50% / 50%", async () => {
    const page = await browser.newPage();
    await open(page);

    expect((await status(page)).scores).toBe("Red 0.0%, Blue 0.0%");

    await drag(page, 0, 10);

    expect((await status(page)).scores).toBe("Red 50.0%, Blue 50.0%");
  });
});

describe("taking turns on the page", () => {
  it("shows whose turn it is and updates the Scores after every Move", async () => {
    const page = await browser.newPage();
    await open(page);
    expect((await status(page)).turn).toBe("Red to move");

    await drag(page, 0, 10);
    expect((await status(page)).turn).toBe("Blue to move");

    // Blue's crossing diameter takes the bottom half; Red keeps only the top-right quarter.
    await drag(page, 5, 15);
    expect((await status(page)).turn).toBe("Red to move");
    expect((await status(page)).scores).toBe("Red 25.0%, Blue 75.0%");

    // Red cuts off the corner between Points 16 and 19 (1.9% of the Board); the rest of the
    // top-left quarter it passes through stays Blue.
    await drag(page, 16, 19);
    expect((await status(page)).turn).toBe("Blue to move");
    expect((await status(page)).scores).toBe("Red 26.9%, Blue 73.1%");
  });
});

describe("the end of a game on the page", () => {

  it("announces the result after the 10th Move, locks the Board, and Back leads to the Start Screen and a fresh game", async () => {
    const page = await browser.newPage();
    await open(page);
    expect((await status(page)).result).toBeUndefined();

    for (const [start, end] of blueWinsGame) await drag(page, start, end);

    expect(await status(page)).toEqual({
      sides: "Human (Red) vs Human (Blue)",
      result: "Blue wins",
      scores: "Red 43.0%, Blue 57.0%",
    });
    expect(await hasButton(page, "menu")).toBe(false);
    expect(await page.$("#result")).toBeNull();

    // Every Point is used, so no drag can start; the finished Board stays as it was.
    await drag(page, 0, 10);
    expect((await status(page)).scores).toBe("Red 43.0%, Blue 57.0%");

    await press(page, "back");
    expect(await status(page)).toEqual({});
    expect(await isPressed(page, "opponent:human")).toBe(true);
    await press(page, "start");
    expect((await status(page)).turn).toBe("Red to move");
    expect((await status(page)).scores).toBe("Red 0.0%, Blue 0.0%");

    await drag(page, 0, 10);
    expect((await status(page)).scores).toMatch(/^Red 50\.0%, /);
  });

  it("takes Back to Start Screen from the keyboard, keeping the last Settings", async () => {
    const page = await browser.newPage();
    await open(page, "ending:skip");
    for (const [start, end] of blueWinsGame) await drag(page, start, end);

    await page.focus('#mirror [data-key="back"]');
    await page.keyboard.press("Enter");
    expect(await isPressed(page, "opponent:human")).toBe(true);
    expect(await isPressed(page, "ending:skip")).toBe(true);
  });
});

describe("invalid drags on the page", () => {
  it("leave the Board, the Scores and the turn unchanged, so the same Player tries again", async () => {
    const page = await browser.newPage();
    await open(page);
    const expectState = async (turn: string, red: string, blue: string) => {
      expect((await status(page)).turn).toBe(turn);
      expect((await status(page)).scores).toBe(`${red}, ${blue}`);
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

    // Blue's crossing diameter takes the bottom half; Red keeps only the top-right quarter.
    await drag(page, 5, 15);
    await expectState("Red to move", "Red 25.0%", "Blue 75.0%");

    await drag(page, 16, 15); // released on a used Point
    await drag(page, 16, 17); // released on a neighbouring Point
    await expectState("Red to move", "Red 25.0%", "Blue 75.0%");

    await drag(page, 16, 19);
    await expectState("Blue to move", "Red 26.9%", "Blue 73.1%");
  });
});

/** 9 Moves leaving Points 7 and 8 unused, so Blue has no legal 10th Move. */
const stuckGame: [number, number][] = [
  [14, 17], [1, 5], [11, 19], [9, 0], [4, 12], [18, 2], [3, 10], [15, 13], [6, 16],
];

describe("the Ending on the page", () => {
  it("under Award, ends a stuck game with Blue taking the Region by the unused Points", async () => {
    const page = await browser.newPage();
    await open(page);

    for (const [start, end] of stuckGame) await drag(page, start, end);

    expect(await status(page)).toEqual({
      sides: "Human (Red) vs Human (Blue)",
      result: "Blue wins",
      reason: "Blue has no legal Move and takes the Region by Points 7 and 8",
      scores: "Red 48.4%, Blue 51.6%",
    });

    // The Board is locked: no Line can be drawn between the last two Points.
    await drag(page, 7, 8);
    expect((await status(page)).scores).toMatch(/^Red 48\.4%, /);
  });

  it("under Skip, ends a stuck game with the Regions scored as they stand", async () => {
    const page = await browser.newPage();
    await open(page, "ending:skip");

    for (const [start, end] of stuckGame) await drag(page, start, end);

    expect((await status(page)).result).toBe("Red wins");
    expect((await status(page)).reason).toBe("Blue has no legal Move");
    expect((await status(page)).scores).toBe("Red 59.2%, Blue 40.8%");
  });
});

describe("touch and resizing on the page", () => {
  const expectScores = async (page: Page, red: string, blue: string) => {
    expect((await status(page)).scores).toBe(`${red}, ${blue}`);
  };

  it("plays Moves with finger drags in a small window, cancelling them as with a mouse", async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await open(page);

    const box = await canvasBox(page);
    expect(box.fills).toBe(true);
    expect(box.sharp).toBe(true);

    await swipe(page, 0, "centre"); // lifted on empty space
    await swipe(page, 0, 1); // lifted on a neighbouring Point
    expect((await status(page)).turn).toBe("Red to move");
    await expectScores(page, "Red 0.0%", "Blue 0.0%");

    await swipe(page, 0, 10);
    await swipe(page, 5, 15);
    await swipe(page, 16, 19);
    expect((await status(page)).turn).toBe("Blue to move");
    await expectScores(page, "Red 26.9%", "Blue 73.1%");
  });

  it("resizes the canvas with the window and keeps snapping to Points accurate", async () => {
    const page = await browser.newPage();
    await open(page);
    const large = await canvasBox(page);

    await drag(page, 0, 10);
    await resizeWindow(page, 420, 520);
    const small = await canvasBox(page);
    expect(small.width).toBeLessThan(large.width);
    expect(small.fills).toBe(true);

    await drag(page, 5, 15);
    await drag(page, 16, 19);
    await expectScores(page, "Red 26.9%", "Blue 73.1%");

    await resizeWindow(page, 1200, 1000);
    const grown = await canvasBox(page);
    expect(grown.width).toBeGreaterThan(large.width);
    expect(grown.fills).toBe(true);

    await drag(page, 3, 9);
    expect((await status(page)).turn).toBe("Red to move");
  });
});
