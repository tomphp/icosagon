import { POINT_COUNT, type Vec } from "./geometry";
import { pointOnScreen, type Layout } from "./layout";

const HIT_RADIUS = 20;

export interface DragHandlers {
  canStartAt(point: number): boolean;
  canEndAt(start: number, point: number): boolean;
  /** Called on every pointer movement during a drag, with the legal end Point it is snapped to, if any. */
  dragMoved(start: number, pointer: Vec, snapped: number | null): void;
  /** Called when the drag ends, with the legal end Point it was released on, or null. */
  dragReleased(start: number, end: number | null): void;
}

/** Turns pointer events on the canvas into drags between Points. Mouse and touch behave the same. */
export function attachInput(canvas: HTMLCanvasElement, layout: () => Layout, handlers: DragHandlers) {
  let start: number | null = null;
  let snapped: number | null = null;

  const pointerAt = (e: PointerEvent): Vec => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const pointNear = (pointer: Vec): number | null => {
    for (let i = 0; i < POINT_COUNT; i++) {
      const s = pointOnScreen(layout(), i);
      if (Math.hypot(s.x - pointer.x, s.y - pointer.y) <= HIT_RADIUS) return i;
    }
    return null;
  };

  canvas.addEventListener("pointerdown", (e) => {
    const point = pointNear(pointerAt(e));
    if (point === null || !handlers.canStartAt(point)) return;
    canvas.setPointerCapture(e.pointerId);
    start = point;
    snapped = null;
    handlers.dragMoved(start, pointerAt(e), null);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (start === null) return;
    const pointer = pointerAt(e);
    const point = pointNear(pointer);
    snapped = point !== null && handlers.canEndAt(start, point) ? point : null;
    handlers.dragMoved(start, pointer, snapped);
  });

  const finish = (end: number | null) => {
    if (start === null) return;
    const from = start;
    start = null;
    snapped = null;
    handlers.dragReleased(from, end);
  };
  canvas.addEventListener("pointerup", () => finish(snapped));
  canvas.addEventListener("pointercancel", () => finish(null));
}
