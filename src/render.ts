import { POINT_COUNT, type Vec } from "./geometry";
import { usedPoints, type Game, type Player, type Region } from "./game";
import { pointOnScreen, toScreen, type Layout } from "./layout";

export interface DragView {
  start: number;
  pointer: Vec;
  snapped: number | null;
  /** The Regions releasing on the snapped Point would produce, or null when not snapped. */
  preview: Region[] | null;
}

const FILL: Record<Player, string> = { red: "#e5484d", blue: "#3e63dd" };
const UNCOLOURED = "#f1f1f1";
const POINT_RADIUS = 6;

export function render(ctx: CanvasRenderingContext2D, layout: Layout, game: Game, drag: DragView | null) {
  // Clear every backing pixel; the layout is in CSS pixels, scaled to the device by the context's transform.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  for (const region of drag?.preview ?? game.regions) {
    ctx.beginPath();
    region.polygon.forEach((p, i) => {
      const s = toScreen(layout, p);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.closePath();
    ctx.fillStyle = region.colour ? FILL[region.colour] : UNCOLOURED;
    ctx.fill();
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
}

function line(ctx: CanvasRenderingContext2D, a: Vec, b: Vec) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}
