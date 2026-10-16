import { isLegalMove, usedPoints, type Outcome, type Player } from "./game.ts";
import { attachInput } from "./input.ts";
import { canvasLayout } from "./layout.ts";
import { syncMirror, syncStatus } from "./mirror.ts";
import { neuralOptions } from "./model.ts";
import { drawPlaying, percent, playingStatus } from "./playing-screen.ts";
import { render } from "./render.ts";
import { DEFAULT_SETTINGS, dragTo, releaseDrag, startScreen, type AppState } from "./screen.ts";
import { HOW_TO_PLAY, NAMED_STRATEGIES, startScreenWidgets } from "./start-screen.ts";
import { BACKGROUND, drawWidgets, measureWith, type Button } from "./widgets.ts";

const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;
const measure = measureWith(ctx);
const stage = document.querySelector<HTMLElement>("#stage")!;
const mirror = document.querySelector<HTMLElement>("#mirror")!;
const howToPlay = document.querySelector<HTMLElement>("#how-to-play")!;
const status = document.querySelector<HTMLElement>("#status")!;
const result = document.querySelector<HTMLElement>("#result")!;
/** Each Model in models/, bundled into the page and picked up live by the dev server, as a Strategy pill. */
const neural = neuralOptions(import.meta.glob("../models/*.json", { eager: true, import: "default" }), console.warn);
const strategies = [...NAMED_STRATEGIES, ...neural];
howToPlay.querySelector("ul")!.replaceChildren(
  ...HOW_TO_PLAY.map((item) => Object.assign(document.createElement("li"), { textContent: item })),
);

/** The canvas's size in CSS pixels, the units pointer events and the layout use. */
let size = { width: 0, height: 0 };
const layout = () => canvasLayout(size.width, size.height);

let state: AppState = startScreen(DEFAULT_SETTINGS);

const RESULT: Record<Exclude<Outcome, "in-progress">, string> = {
  "red-wins": "Red wins",
  "blue-wins": "Blue wins",
  draw: "Draw",
};

/** The result line's opening words: who won, from the Human's side against the Computer. */
function resultText(outcome: Exclude<Outcome, "in-progress">, human: Player | null) {
  if (!human || outcome === "draw") return RESULT[outcome];
  return outcome === `${human}-wins` ? "You win" : "Computer wins";
}

function updateResult() {
  const { game, computer } = state;
  result.hidden = state.screen !== "over";
  if (game.outcome === "in-progress") return;
  const human: Player | null = computer && (computer === "red" ? "blue" : "red");
  result.textContent = `${resultText(game.outcome, human)}: Red ${percent(game.scores.red)}, Blue ${percent(game.scores.blue)}`;
}

function update() {
  const onStart = state.screen === "start";
  howToPlay.hidden = !onStart;
  syncStatus(status, onStart ? {} : playingStatus(state));
  updateResult();
  // The result line can show and move the canvas, so refit now rather than a frame later.
  fit();
  let buttons: Button[];
  if (onStart) {
    const screen = startScreenWidgets(measure, size.width, size.height, state.settings, strategies, Math.random);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, size.width, size.height);
    drawWidgets(ctx, screen.texts, screen.buttons);
    buttons = screen.buttons;
  } else {
    render(ctx, layout(), state.game, state.drag);
    buttons = drawPlaying(ctx, measure, size.width, size.height, state);
  }
  syncMirror(mirror, buttons, (b) => {
    state = b.press(state);
    update();
  });
}

attachInput(canvas, layout, {
  canStartAt: (point) => state.screen === "playing" && !usedPoints(state.game).has(point),
  canEndAt: (start, point) => isLegalMove(state.game, { start, end: point }),
  dragMoved(start, pointer, snapped) {
    state = dragTo(state, start, pointer, snapped);
    update();
  },
  dragReleased(start, end) {
    state = releaseDrag(state, start, end, Math.random);
    update();
  },
});

/** Fits the canvas to the space under the result line, drawn sharply at the device's pixel ratio. */
function fit() {
  const scale = window.devicePixelRatio;
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (width === size.width && height === size.height && canvas.width === Math.round(width * scale)) return;
  size = { width, height };
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

new ResizeObserver(update).observe(stage);
update();
