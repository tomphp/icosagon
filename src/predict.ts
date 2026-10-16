import { isLegalMove, type Game } from "./game.ts";
import { POINT_COUNT, pointPosition, type Vec } from "./geometry.ts";
import type { Layout } from "./layout.ts";

/** How far, in CSS pixels, the pointer must move from the start Point before the Board predicts. */
const PREDICT_DISTANCE = 20;

/**
 * Guesses the end Point of an unsnapped drag from its direction: a ray from the start Point through the
 * pointer meets the Board's edge, and the legal end Point closest by angle around the centre wins.
 * Null while the pointer is near the start Point, when the ray points away from the Board, or when no
 * end Point is legal.
 */
export function predictEnd(game: Game, layout: Layout, start: number, pointer: Vec): number | null {
  const s = pointPosition(start);
  const d = { x: (pointer.x - layout.centre.x) / layout.radius - s.x, y: (pointer.y - layout.centre.y) / layout.radius - s.y };
  const length = Math.hypot(d.x, d.y);
  if (length * layout.radius < PREDICT_DISTANCE) return null;
  // The ray s + t·d meets the unit circle again at t = -2 s·d / |d|², ahead of s only when s·d < 0.
  const t = (-2 * (s.x * d.x + s.y * d.y)) / (length * length);
  if (t <= 0) return null;
  const hit = Math.atan2(s.y + t * d.y, s.x + t * d.x);

  let best: number | null = null;
  let bestGap = Infinity;
  for (let end = 0; end < POINT_COUNT; end++) {
    if (!isLegalMove(game, { start, end })) continue;
    const p = pointPosition(end);
    const turn = hit - Math.atan2(p.y, p.x);
    const gap = Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn)));
    if (gap < bestGap) [best, bestGap] = [end, gap];
  }
  return best;
}
