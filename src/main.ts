import { effectsOf, FLASH_MS, type Step } from "./effects.ts";
import { isLegalMove, usedPoints, type Game } from "./game.ts";
import { attachInput } from "./input.ts";
import { canvasLayout } from "./layout.ts";
import { syncMirror, syncStatus } from "./mirror.ts";
import { neuralOptions } from "./model.ts";
import { drawGameOver, overStatus } from "./over-screen.ts";
import { drawPlaying, playingStatus } from "./playing-screen.ts";
import { render } from "./render.ts";
import { DEFAULT_SETTINGS, dragTo, playComputer, releaseDrag, startScreen, type AppState } from "./screen.ts";
import { HOW_TO_PLAY, NAMED_STRATEGIES, startScreenWidgets } from "./start-screen.ts";
import { BACKGROUND, drawWidgets, measureWith, type Button } from "./widgets.ts";

const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;
const measure = measureWith(ctx);
const stage = document.querySelector<HTMLElement>("#stage")!;
const mirror = document.querySelector<HTMLElement>("#mirror")!;
const howToPlay = document.querySelector<HTMLElement>("#how-to-play")!;
const status = document.querySelector<HTMLElement>("#status")!;
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
/** The timed steps showing the latest Move's effects and when they started, or null before a game's first Move. */
let effects: { steps: Step[]; start: number } | null = null;
let frame = 0;

/** Moves to the next state, starting the effects of the Move it made and, if the Computer is now the Mover, its wait. */
function setState(next: AppState) {
  if (next.game !== state.game) {
    // A new game has no Moves; otherwise the game moved on by exactly one Move.
    effects = next.game.moves.length ? { steps: effectsOf(state.game, next.game), start: performance.now() } : null;
    if (next.screen === "playing" && next.game.mover === next.computer) waitForComputer(next.game);
  }
  state = next;
  update();
}

/** Plays the Computer's Move once the Human's flash has faded, unless the game has been left or replaced since. */
function waitForComputer(game: Game) {
  setTimeout(() => {
    if (state.screen === "playing" && state.game === game) setState(playComputer(state, Math.random));
  }, FLASH_MS);
}

function update() {
  const onStart = state.screen === "start";
  const age = effects ? performance.now() - effects.start : Infinity;
  const step = effects?.steps.filter((s) => s.at <= age).at(-1);
  // Draw the step that is due rather than the game itself, which may already be past an Award still to be shown.
  const shown = step ? { ...state, game: { ...state.game, regions: step.regions, scores: step.scores } } : state;
  const over = state.screen === "over" && (step?.over ?? true);
  howToPlay.hidden = !onStart;
  syncStatus(status, onStart ? {} : { ...playingStatus(shown), ...(over ? overStatus(state) : {}) });
  fit();
  let buttons: Button[];
  if (onStart) {
    const screen = startScreenWidgets(measure, size.width, size.height, state.settings, strategies, Math.random);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, size.width, size.height);
    drawWidgets(ctx, screen.texts, screen.buttons);
    buttons = screen.buttons;
  } else {
    const fading = step ? age - step.at : FLASH_MS;
    const flash = fading < FLASH_MS ? { regions: step!.flash, opacity: 1 - fading / FLASH_MS } : null;
    const pending = step !== effects?.steps.at(-1);
    if ((flash || pending) && !frame) frame = requestAnimationFrame(() => ((frame = 0), update()));
    render(ctx, layout(), shown.game, state.drag, flash);
    buttons = drawPlaying(ctx, measure, size.width, size.height, shown);
    if (over) buttons.push(...drawGameOver(ctx, measure, size.width, size.height, state));
  }
  syncMirror(mirror, buttons, (b) => setState(b.press(state)));
}

attachInput(canvas, layout, {
  canStartAt: (point) => state.screen === "playing" && state.game.mover !== state.computer && !usedPoints(state.game).has(point),
  canEndAt: (start, point) => isLegalMove(state.game, { start, end: point }),
  dragMoved(start, pointer, snapped) {
    state = dragTo(state, layout(), start, pointer, snapped);
    update();
  },
  dragReleased(start, end) {
    setState(releaseDrag(state, start, end));
  },
});

/** Fits the canvas to the window, drawn sharply at the device's pixel ratio. */
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
