import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { boardLayout, pointOnScreen as pointOnCanvas } from "../src/layout";

export async function launch(): Promise<Browser> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) throw new Error("PUPPETEER_EXECUTABLE_PATH is not set; run inside `nix develop`");
  // Tall enough that the whole Board, including the bottom Points, is inside the viewport.
  return puppeteer.launch({ executablePath, args: ["--no-sandbox"], defaultViewport: { width: 800, height: 800 } });
}

/** Somewhere a pointer can be: a Point, the Board's centre, or the canvas corner outside the Board. */
export type Spot = number | "centre" | "corner";

/** Where a Spot is on screen, derived from the canvas's bounding box. */
async function onScreen(page: Page, spot: Spot) {
  const box = await page.$eval("canvas", (c) => {
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  const layout = boardLayout(box.width, box.height);
  const p = spot === "centre" ? layout.centre : spot === "corner" ? { x: 1, y: 1 } : pointOnCanvas(layout, spot);
  return { x: box.x + p.x, y: box.y + p.y };
}

/** Presses on the first Spot and moves through the rest, without releasing. */
export async function hold(page: Page, from: Spot, ...path: Spot[]) {
  const start = await onScreen(page, from);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const spot of path) {
    const p = await onScreen(page, spot);
    await page.mouse.move(p.x, p.y, { steps: 10 });
  }
}

/** A real pointer drag: press on the first Spot, move through the rest, release on the last. */
export async function drag(page: Page, from: Spot, ...path: [...Spot[], Spot]) {
  await hold(page, from, ...path);
  await page.mouse.up();
}

/** A finger drag: touch the first Spot, slide through the rest, lift on the last. Needs a touch viewport. */
export async function swipe(page: Page, from: Spot, ...path: [...Spot[], Spot]) {
  let at = await onScreen(page, from);
  await page.touchscreen.touchStart(at.x, at.y);
  for (const spot of path) {
    const p = await onScreen(page, spot);
    for (let i = 1; i <= 10; i++) {
      await page.touchscreen.touchMove(at.x + ((p.x - at.x) * i) / 10, at.y + ((p.y - at.y) * i) / 10);
    }
    at = p;
  }
  await page.touchscreen.touchEnd();
}

/** Resizes the window and waits for the page to lay itself out again at the new size. */
export async function resizeWindow(page: Page, width: number, height: number) {
  await page.setViewport({ width, height });
  // Resize handling runs during the next rendering step, which has passed once two frames have started.
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
}

/** The canvas's on-screen size, and whether all of it is inside the window. */
export function canvasBox(page: Page) {
  return page.$eval("canvas", (c) => {
    const r = c.getBoundingClientRect();
    return {
      width: r.width,
      height: r.height,
      fits: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
    };
  });
}

/** What the canvas currently shows, for comparing before and after. */
export function canvasImage(page: Page) {
  return page.$eval("canvas", (c) => c.toDataURL());
}

export function text(page: Page, selector: string) {
  return page.$eval(selector, (el) => el.textContent?.trim());
}

export function isVisible(page: Page, selector: string) {
  return page.$eval(selector, (el) => (el as HTMLElement).offsetParent !== null);
}

/** The text of a select's chosen option. */
export function selectedText(page: Page, selector: string) {
  return page.$eval(selector, (el) => (el as HTMLSelectElement).selectedOptions[0].text);
}

export function isDisabled(page: Page, selector: string) {
  return page.$eval(selector, (el) => (el as HTMLSelectElement).disabled);
}

/**
 * Makes `Math.random` return the values in order, then keep returning the last one. Must be called
 * before the page loads.
 */
export function stubRandom(page: Page, values: number[]) {
  return page.evaluateOnNewDocument((values) => {
    let i = 0;
    Math.random = () => values[Math.min(i++, values.length - 1)];
  }, values);
}
