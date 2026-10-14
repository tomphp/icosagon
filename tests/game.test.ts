import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { Browser } from "puppeteer-core";
import { drag, launch, text } from "./page";

let browser: Browser;
beforeAll(async () => {
  browser = await launch();
});
afterAll(() => browser?.close());

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
