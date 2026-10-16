import { contains, POINT_COUNT, type Vec } from "./geometry.ts";
import { usedPoints, type Game, type Player, type Region } from "./game.ts";
import { pointOnScreen, toScreen, type Layout } from "./layout.ts";

export interface DragView {
  start: number;
  pointer: Vec;
  snapped: number | null;
  /** The end Point guessed from the drag's direction while it isn't snapped, or null. */
  predicted: number | null;
  /** The Regions the Move to the snapped, or else predicted, end Point would produce, or null when neither. */
  preview: Region[] | null;
}

export const FILL: Record<Player, string> = { red: "#e5484d", blue: "#3e63dd" };
/** FILL mixed 45% toward white, for the Regions a predicted Move would recolour. */
const PALE: Record<Player, string> = { red: "#f19a9d", blue: "#94a9ec" };
const UNCOLOURED = "#f1f1f1";
const POINT_RADIUS = 6;

export function render(ctx: CanvasRenderingContext2D, layout: Layout, game: Game, drag: DragView | null) {
  // Clear every backing pixel; the layout is in CSS pixels, scaled to the device by the context's transform.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  const predicting = drag?.predicted != null;
  for (const region of (!predicting && drag?.preview) || game.regions) {
    fillRegion(ctx, layout, region, region.colour ? FILL[region.colour] : UNCOLOURED);
  }
  if (predicting) {
    for (const piece of recoloured(game.regions, drag!.preview!)) fillRegion(ctx, layout, piece, PALE[piece.colour!]);
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#222";
  for (const move of game.moves) line(ctx, pointOnScreen(layout, move.start), pointOnScreen(layout, move.end));

  ctx.beginPath();
  for (let i = 0; i < POINT_COUNT; i++) {
    const s = pointOnScreen(layout, i);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  }
  ctx.closePath();
  ctx.stroke();

  if (drag) {
    const end = drag.snapped === null ? drag.pointer : pointOnScreen(layout, drag.snapped);
    ctx.setLineDash([6, 4]);
    line(ctx, pointOnScreen(layout, drag.start), end);
    if (drag.predicted !== null) {
      ctx.globalAlpha = 0.3;
      line(ctx, drag.pointer, pointOnScreen(layout, drag.predicted));
      ctx.globalAlpha = 1;
    }
    ctx.setLineDash([]);
  }

  const used = usedPoints(game);
  for (let i = 0; i < POINT_COUNT; i++) {
    const s = pointOnScreen(layout, i);
    ctx.beginPath();
    ctx.arc(s.x, s.y, POINT_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = used.has(i) ? "#888" : "#222";
    ctx.fill();
  }

  if (drag?.predicted != null) {
    const s = pointOnScreen(layout, drag.predicted);
    ctx.beginPath();
    ctx.arc(s.x, s.y, POINT_RADIUS + 5, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

function fillRegion(ctx: CanvasRenderingContext2D, layout: Layout, region: Region, colour: string) {
  ctx.beginPath();
  region.polygon.forEach((p, i) => {
    const s = toScreen(layout, p);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

/** The new pieces of a Move preview whose colour differs from the Region they were cut from. */
function recoloured(regions: Region[], preview: Region[]): Region[] {
  const before = new Set(regions);
  return preview.filter((piece) => {
    if (before.has(piece)) return false;
    // A piece's vertex average lies inside it, so inside the one convex Region it was cut from.
    const n = piece.polygon.length;
    const mid = piece.polygon.reduce((m, p) => ({ x: m.x + p.x / n, y: m.y + p.y / n }), { x: 0, y: 0 });
    const parent = regions.find((r) => contains(r.polygon, mid));
    return parent?.colour !== piece.colour;
  });
}

function line(ctx: CanvasRenderingContext2D, a: Vec, b: Vec) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}
