import { applyMove, createGame, isLegalMove, usedPoints, type Game, type Player } from "./game";
import { attachInput } from "./input";
import { boardLayout } from "./layout";
import { render, type DragView } from "./render";

const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;
const scoreRed = document.querySelector("#score-red")!;
const scoreBlue = document.querySelector("#score-blue")!;
const turn = document.querySelector("#turn")!;

const layout = () => boardLayout(canvas.width, canvas.height);

let game: Game = createGame("full-split");
let drag: DragView | null = null;

const NAME: Record<Player, string> = { red: "Red", blue: "Blue" };
const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;

function update() {
  render(ctx, layout(), game, drag);
  scoreRed.textContent = `Red ${percent(game.scores.red)}`;
  scoreBlue.textContent = `Blue ${percent(game.scores.blue)}`;
  turn.textContent = `${NAME[game.mover]} to move`;
}

attachInput(canvas, layout, {
  canStartAt: (point) => !usedPoints(game).has(point),
  canEndAt: (start, point) => isLegalMove(game, { start, end: point }),
  dragMoved(start, pointer, snapped) {
    drag = { start, pointer, snapped };
    update();
  },
  dragReleased(start, end) {
    drag = null;
    if (end !== null) game = applyMove(game, { start, end });
    update();
  },
});

update();
