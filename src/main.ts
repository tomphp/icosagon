import { isLegalMove, usedPoints, type Game, type Outcome, type Player } from "./game.ts";
import { attachInput } from "./input.ts";
import { canvasLayout } from "./layout.ts";
import { syncMirror } from "./mirror.ts";
import { neuralOptions } from "./model.ts";
import { render } from "./render.ts";
import { DEFAULT_SETTINGS, dragTo, releaseDrag, startScreen, toMenu, type AppState } from "./screen.ts";
import { HOW_TO_PLAY, NAMED_STRATEGIES, startScreenWidgets } from "./start-screen.ts";
import { BACKGROUND, button, drawWidgets, measureWith, type Button } from "./widgets.ts";

const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;
const measure = measureWith(ctx);
const stage = document.querySelector<HTMLElement>("#stage")!;
const mirror = document.querySelector<HTMLElement>("#mirror")!;
const howToPlay = document.querySelector<HTMLElement>("#how-to-play")!;
const hud = document.querySelector<HTMLElement>("#hud")!;
const scoreRed = document.querySelector("#score-red")!;
const scoreBlue = document.querySelector("#score-blue")!;
const turn = document.querySelector("#turn")!;
const result = document.querySelector<HTMLElement>("#result")!;
const you = document.querySelector<HTMLElement>("#you")!;
const computerPlayed = document.querySelector<HTMLElement>("#computer-played")!;
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

const NAME: Record<Player, string> = { red: "Red", blue: "Blue" };
const RESULT: Record<Exclude<Outcome, "in-progress">, string> = {
  "red-wins": "Red wins",
  "blue-wins": "Blue wins",
  draw: "Draw",
};
const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;

/** "Game over", with the reason when the Mover had no legal Move. */
function gameOverText({ stuck, ending }: Game) {
  if (!stuck) return "Game over";
  const reason = `Game over — ${NAME[stuck.player]} has no legal Move`;
  const [p, q] = stuck.points;
  return ending === "award" ? `${reason} and takes the Region by Points ${p} and ${q}` : reason;
}

/** The result line's opening words: who won, from the Human's side against the Computer. */
function resultText(outcome: Exclude<Outcome, "in-progress">, human: Player | null) {
  if (!human || outcome === "draw") return RESULT[outcome];
  return outcome === `${human}-wins` ? "You win" : "Computer wins";
}

function updateHud() {
  const { game, computer } = state;
  const red = `Red ${percent(game.scores.red)}`;
  const blue = `Blue ${percent(game.scores.blue)}`;
  scoreRed.textContent = red;
  scoreBlue.textContent = blue;
  const human: Player | null = computer && (computer === "red" ? "blue" : "red");
  you.hidden = human === null;
  if (human) you.textContent = `You are ${NAME[human]}`;
  // The Computer's Move is shown until the Human moves again, so only while it made the last Move.
  const last = game.moves.at(-1);
  computerPlayed.hidden = !computer || game.mover === computer || !last;
  if (last) computerPlayed.textContent = `Computer played ${last.start}→${last.end}`;
  if (game.outcome === "in-progress") {
    turn.textContent = human ? `Your move (${NAME[game.mover]})` : `${NAME[game.mover]} to move`;
    result.hidden = true;
  } else {
    turn.textContent = gameOverText(game);
    result.textContent = `${resultText(game.outcome, human)}: ${red}, ${blue}`;
    result.hidden = false;
  }
}

function update() {
  const onStart = state.screen === "start";
  hud.hidden = onStart;
  howToPlay.hidden = !onStart;
  if (onStart) result.hidden = true;
  else updateHud();
  // The HUD's text can rewrap it and move the canvas, so refit now rather than a frame later.
  fit();
  let buttons: Button[];
  if (onStart) {
    const screen = startScreenWidgets(measure, size.width, size.height, state.settings, strategies, Math.random);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, size.width, size.height);
    drawWidgets(ctx, screen.texts, screen.buttons);
    buttons = screen.buttons;
  } else {
    const menu = button(measure, 0, 8, 14, { key: "menu", label: "Menu", selected: false, pill: false, press: toMenu });
    menu.rect.x = size.width - menu.rect.width - 8;
    render(ctx, layout(), state.game, state.drag);
    drawWidgets(ctx, [], [menu]);
    buttons = [menu];
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

/** Fits the canvas to the space under the HUD, drawn sharply at the device's pixel ratio. */
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
