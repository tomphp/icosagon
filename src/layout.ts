import { pointPosition, type Vec } from "./geometry";

/** How the unit Board maps onto a canvas of the given CSS size. */
export function boardLayout(width: number, height: number) {
  return { centre: { x: width / 2, y: height / 2 }, radius: 0.45 * Math.min(width, height) };
}

export type Layout = ReturnType<typeof boardLayout>;

export function toScreen(layout: Layout, p: Vec): Vec {
  return { x: layout.centre.x + p.x * layout.radius, y: layout.centre.y + p.y * layout.radius };
}

export function pointOnScreen(layout: Layout, i: number): Vec {
  return toScreen(layout, pointPosition(i));
}
