import type { Strategy } from "./computer.ts";
import { isLegalMove, usedPoints, type Ending, type Game, type Outcome, type Player } from "./game.ts";
import { attachInput } from "./input.ts";
import { canvasLayout } from "./layout.ts";
import { neuralOptions } from "./model.ts";
import { render } from "./render.ts";
import { dragTo, releaseDrag, startGame, type AppState, type Opponent, type Settings } from "./screen.ts";

const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;
const stage = document.querySelector<HTMLElement>("#stage")!;
const scoreRed = document.querySelector("#score-red")!;
const scoreBlue = document.querySelector("#score-blue")!;
const turn = document.querySelector("#turn")!;
const result = document.querySelector<HTMLElement>("#result")!;
const newGame = document.querySelector("#new-game")!;
const you = document.querySelector<HTMLElement>("#you")!;
const computerPlayed = document.querySelector<HTMLElement>("#computer-played")!;
const endingSelect = document.querySelector<HTMLSelectElement>("#ending")!;
const opponentSelect = document.querySelector<HTMLSelectElement>("#opponent")!;
const strategySelect = document.querySelector<HTMLSelectElement>("#strategy")!;
const selectors = [opponentSelect, strategySelect, endingSelect];
/** Each Model in models/, bundled into the page and picked up live by the dev server, as a selector option. */
const neural = neuralOptions(import.meta.glob("../models/*.json", { eager: true, import: "default" }), console.warn);
for (const { value, label } of neural) strategySelect.add(new Option(label, value));

/** The Settings chosen in the selectors: their option values are the Opponents, Endings and named Strategies. */
const selectedSettings = (): Settings => ({
  opponent: opponentSelect.value as Opponent,
  strategy:
    neural.find(({ value }) => value === strategySelect.value)?.strategy ?? (strategySelect.value as Strategy),
  ending: endingSelect.value as Ending,
});

/** The canvas's size in CSS pixels, the units pointer events and the layout use. */
let size = { width: 0, height: 0 };
const layout = () => canvasLayout(size.width, size.height);

let state: AppState = startGame(selectedSettings(), Math.random);

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

function update() {
  const { game, computer, drag } = state;
  const red = `Red ${percent(game.scores.red)}`;
  const blue = `Blue ${percent(game.scores.blue)}`;
  scoreRed.textContent = red;
  scoreBlue.textContent = blue;
  // The settings are fixed once the Human has drawn a Line; the Computer's opening Move as Red doesn't count.
  const humanMoved = game.moves.length > (computer === "red" ? 1 : 0);
  for (const select of selectors) select.disabled = humanMoved;
  // Strategy only applies against the Computer.
  strategySelect.disabled = humanMoved || !computer;
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
  // The HUD's text can rewrap it and move the canvas, so refit now rather than a frame later.
  fit();
  render(ctx, layout(), game, drag);
}

const restart = () => {
  state = startGame(selectedSettings(), Math.random);
  update();
};
for (const select of selectors) select.addEventListener("change", restart);
newGame.addEventListener("click", restart);

attachInput(canvas, layout, {
  canStartAt: (point) => !usedPoints(state.game).has(point),
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
