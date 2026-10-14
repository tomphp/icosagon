import { applyMove, createGame, isLegalMove, previewMove, usedPoints, type Ending, type Game, type Outcome, type Player } from "./game";
import { attachInput } from "./input";
import { boardLayout } from "./layout";
import { render, type DragView } from "./render";

const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;
const stage = document.querySelector<HTMLElement>("#stage")!;
const scoreRed = document.querySelector("#score-red")!;
const scoreBlue = document.querySelector("#score-blue")!;
const turn = document.querySelector("#turn")!;
const result = document.querySelector<HTMLElement>("#result")!;
const newGame = document.querySelector("#new-game")!;
const endingSelect = document.querySelector<HTMLSelectElement>("#ending")!;
/** The Ending chosen in the selector; its option values are the Ending names. */
const selectedEnding = () => endingSelect.value as Ending;

/** The canvas's side in CSS pixels, the units pointer events and the layout use. */
let size = 0;
const layout = () => boardLayout(size, size);

let game: Game = createGame(selectedEnding());
let drag: DragView | null = null;

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

function update() {
  render(ctx, layout(), game, drag);
  const red = `Red ${percent(game.scores.red)}`;
  const blue = `Blue ${percent(game.scores.blue)}`;
  scoreRed.textContent = red;
  scoreBlue.textContent = blue;
  // The Ending is fixed once the first Line is drawn.
  endingSelect.disabled = game.moves.length > 0;
  if (game.outcome === "in-progress") {
    turn.textContent = `${NAME[game.mover]} to move`;
    result.hidden = true;
  } else {
    turn.textContent = gameOverText(game);
    result.textContent = `${RESULT[game.outcome]}: ${red}, ${blue}`;
    result.hidden = false;
  }
}

endingSelect.addEventListener("change", () => {
  game = createGame(selectedEnding());
  update();
});

newGame.addEventListener("click", () => {
  game = createGame(game.ending);
  drag = null;
  update();
});

attachInput(canvas, layout, {
  canStartAt: (point) => !usedPoints(game).has(point),
  canEndAt: (start, point) => isLegalMove(game, { start, end: point }),
  dragMoved(start, pointer, snapped) {
    const preview = snapped === null ? null : previewMove(game, { start, end: snapped });
    drag = { start, pointer, snapped, preview };
    update();
  },
  dragReleased(start, end) {
    drag = null;
    if (end !== null) game = applyMove(game, { start, end });
    update();
  },
});

/** Fits the canvas to the largest square in the space under the HUD, drawn sharply at the device's pixel ratio. */
function resize() {
  size = Math.floor(Math.min(stage.clientWidth, stage.clientHeight));
  const scale = window.devicePixelRatio;
  canvas.style.width = canvas.style.height = `${size}px`;
  canvas.width = canvas.height = Math.round(size * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  update();
}

new ResizeObserver(resize).observe(stage);
resize();
