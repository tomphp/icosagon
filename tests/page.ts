import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { boardLayout, pointOnScreen as pointOnCanvas } from "../src/layout";

export async function launch(): Promise<Browser> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) throw new Error("PUPPETEER_EXECUTABLE_PATH is not set; run inside `nix develop`");
  return puppeteer.launch({ executablePath, args: ["--no-sandbox"] });
}

/** Where Point i is on screen, derived from the canvas's bounding box. */
async function pointOnScreen(page: Page, i: number) {
  const box = await page.$eval("canvas", (c) => {
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  const p = pointOnCanvas(boardLayout(box.width, box.height), i);
  return { x: box.x + p.x, y: box.y + p.y };
}

/** Plays a Move with a real pointer drag from one Point to another. */
export async function drag(page: Page, start: number, end: number) {
  const from = await pointOnScreen(page, start);
  const to = await pointOnScreen(page, end);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

export function text(page: Page, selector: string) {
  return page.$eval(selector, (el) => el.textContent?.trim());
}

export function isVisible(page: Page, selector: string) {
  return page.$eval(selector, (el) => (el as HTMLElement).offsetParent !== null);
}
