import { pointPosition, type Vec } from "./geometry.ts";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** How the unit Board maps onto the largest square centred in the rectangle, in CSS pixels. */
export function boardLayout({ x, y, width, height }: Rect) {
  return { centre: { x: x + width / 2, y: y + height / 2 }, radius: 0.45 * Math.min(width, height) };
}

export type Layout = ReturnType<typeof boardLayout>;

/** The band along the canvas top kept clear of the Board for the Menu button. */
export const TOP_BAND = 48;

/** Where the Board sits on a canvas of the given CSS size; the page and its browser tests share it. */
export function canvasLayout(width: number, height: number): Layout {
  return boardLayout({ x: 0, y: TOP_BAND, width, height: height - TOP_BAND });
}

export function toScreen(layout: Layout, p: Vec): Vec {
  return { x: layout.centre.x + p.x * layout.radius, y: layout.centre.y + p.y * layout.radius };
}

export function pointOnScreen(layout: Layout, i: number): Vec {
  return toScreen(layout, pointPosition(i));
}
