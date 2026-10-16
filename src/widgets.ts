import type { Rect } from "./layout.ts";
import type { AppState } from "./screen.ts";

/** A canvas button; the DOM mirror lays a real button over the same rectangle. */
export interface Button {
  /** Stable across redraws, so the mirror keeps keyboard focus on the same button. */
  key: string;
  label: string;
  rect: Rect;
  font: number;
  /** Drawn filled in: the chosen pill, or the main action. */
  selected: boolean;
  /** Whether the mirror marks it pressed: set only on pills, which are toggles. */
  pill: boolean;
  /** The pill row it belongs to, told to screen readers with the label, e.g. "Ending: Skip". */
  group?: string;
  press(state: AppState): AppState;
}

/** Some text drawn on the canvas, top-left anchored. */
export interface Text {
  text: string;
  x: number;
  y: number;
  font: number;
  colour: string;
}

export const BACKGROUND = "#faf6ef";
export const INK = "#2b2722";
export const MUTED = "#7a7268";

export const fontOf = (size: number) => `bold ${size}px system-ui, sans-serif`;

export type Measure = (text: string, font: number) => number;

/** Measures text with the canvas's own font metrics. */
export const measureWith =
  (ctx: CanvasRenderingContext2D): Measure =>
  (text, font) => {
    ctx.font = fontOf(font);
    return ctx.measureText(text).width;
  };

/** A button sized to its label, at the given top-left. */
export function button(
  measure: Measure,
  x: number,
  y: number,
  font: number,
  props: Omit<Button, "rect" | "font">,
): Button {
  const width = measure(props.label, font) + font * 1.8;
  return { ...props, font, rect: { x, y, width, height: font * 2.3 } };
}

/** Lays the buttons left to right from (x, y), wrapping to a new row when one would pass maxWidth. */
export function wrapRow(buttons: Button[], x: number, y: number, maxWidth: number, gap: number) {
  let cx = x;
  let bottom = y;
  for (const b of buttons) {
    if (cx > x && cx + b.rect.width > x + maxWidth) {
      cx = x;
      y = bottom + gap;
    }
    b.rect = { ...b.rect, x: cx, y };
    cx += b.rect.width + gap;
    bottom = y + b.rect.height;
  }
  return bottom;
}

/** Splits the text into lines no wider than maxWidth, breaking between words. */
export function wrapText(measure: Measure, text: string, font: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws the texts and buttons over whatever is already on the canvas. */
export function drawWidgets(ctx: CanvasRenderingContext2D, texts: Text[], buttons: Button[]) {
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  for (const { text, x, y, font, colour } of texts) {
    ctx.font = fontOf(font);
    ctx.fillStyle = colour;
    ctx.fillText(text, x, y);
  }
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  for (const { label, rect, font, selected } of buttons) {
    ctx.save();
    ctx.shadowColor = "rgba(60, 40, 20, 0.18)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, rect.height / 2);
    ctx.fillStyle = selected ? INK : "#fff";
    ctx.fill();
    ctx.restore();
    ctx.font = fontOf(font);
    ctx.fillStyle = selected ? "#fff" : INK;
    ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
  }
}

/** One Player's share of the score bar. */
export interface Share {
  fraction: number;
  colour: string;
  label: string;
}

/**
 * Draws a bar across the rectangle: the left share filled from the left, the right share from the right, a
 * neutral gap between them, a marker at 50%, and each share's label at its end.
 */
export function drawScoreBar(ctx: CanvasRenderingContext2D, { x, y, width, height }: Rect, left: Share, right: Share) {
  ctx.fillStyle = "#e6dfd3";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = left.colour;
  ctx.fillRect(x, y, width * left.fraction, height);
  ctx.fillStyle = right.colour;
  ctx.fillRect(x + width * (1 - right.fraction), y, width * right.fraction, height);
  ctx.fillStyle = INK;
  ctx.fillRect(x + width / 2 - 1, y, 2, height);

  ctx.font = fontOf(14);
  ctx.textBaseline = "middle";
  const pad = 10;
  for (const [share, align, at] of [[left, "left", x + pad], [right, "right", x + width - pad]] as const) {
    ctx.textAlign = align;
    // White on the share's colour, unless the share is too narrow to hold its label.
    ctx.fillStyle = width * share.fraction >= ctx.measureText(share.label).width + 2 * pad ? "#fff" : INK;
    ctx.fillText(share.label, at, y + height / 2);
  }
}
