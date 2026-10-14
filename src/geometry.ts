export interface Vec {
  x: number;
  y: number;
}

export const POINT_COUNT = 20;

/** Point i on the unit Board: 0 at the top, increasing clockwise on screen (y grows downwards). */
export function pointPosition(i: number): Vec {
  const angle = ((-90 + i * (360 / POINT_COUNT)) * Math.PI) / 180;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function boardPolygon(): Vec[] {
  return Array.from({ length: POINT_COUNT }, (_, i) => pointPosition(i));
}

export function polygonArea(polygon: Vec[]): number {
  let twice = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twice) / 2;
}

const EPSILON = 1e-9;
/** Pieces smaller than this are treated as slivers from Lines through existing corners and dropped. */
const MIN_AREA = 1e-9;

/**
 * Which side of the directed line a→b the point p lies on, in screen orientation (y down):
 * negative is the left side looking from a to b, positive the right, ~0 on the line.
 */
export function side(a: Vec, b: Vec, p: Vec): number {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

/** Keeps the part of a convex polygon on one side of the directed line a→b. */
function clip(polygon: Vec[], a: Vec, b: Vec, keepLeft: boolean): Vec[] {
  const sign = keepLeft ? -1 : 1;
  const result: Vec[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i];
    const q = polygon[(i + 1) % polygon.length];
    const sp = sign * side(a, b, p);
    const sq = sign * side(a, b, q);
    if (sp >= -EPSILON) result.push(p);
    if ((sp > EPSILON && sq < -EPSILON) || (sp < -EPSILON && sq > EPSILON)) {
      const t = sp / (sp - sq);
      result.push({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) });
    }
  }
  return result;
}

/**
 * Splits a convex polygon by the directed line a→b. Returns null when the line does not pass
 * through the polygon's interior (it misses, or only touches a corner or an edge).
 */
export function splitPolygon(polygon: Vec[], a: Vec, b: Vec): { left: Vec[]; right: Vec[] } | null {
  const left = clip(polygon, a, b, true);
  const right = clip(polygon, a, b, false);
  if (left.length < 3 || right.length < 3) return null;
  if (polygonArea(left) < MIN_AREA || polygonArea(right) < MIN_AREA) return null;
  return { left, right };
}
