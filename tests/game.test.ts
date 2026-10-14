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
