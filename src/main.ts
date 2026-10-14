import { applyMove, createGame, isLegalMove, previewMove, usedPoints, type Game, type Outcome, type Player, type RuleSet } from "./game";
import { attachInput } from "./input";
import { boardLayout } from "./layout";
import { render, type DragView } from "./render";

const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;
const scoreRed = document.querySelector("#score-red")!;
const scoreBlue = document.querySelector("#score-blue")!;
const turn = document.querySelector("#turn")!;
const result = document.querySelector<HTMLElement>("#result")!;
const newGame = document.querySelector("#new-game")!;
const ruleSetSelect = document.querySelector<HTMLSelectElement>("#rule-set")!;
/** The Rule set chosen in the selector; its option values are the RuleSet names. */
const selectedRuleSet = () => ruleSetSelect.value as RuleSet;

const layout = () => boardLayout(canvas.width, canvas.height);

let game: Game = createGame(selectedRuleSet());
let drag: DragView | null = null;

const NAME: Record<Player, string> = { red: "Red", blue: "Blue" };
const RESULT: Record<Exclude<Outcome, "in-progress">, string> = {
  "red-wins": "Red wins",
  "blue-wins": "Blue wins",
  draw: "Draw",
};
const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;

function update() {
  render(ctx, layout(), game, drag);
  const red = `Red ${percent(game.scores.red)}`;
  const blue = `Blue ${percent(game.scores.blue)}`;
  scoreRed.textContent = red;
  scoreBlue.textContent = blue;
  // The Rule set is fixed once the first Line is drawn.
  ruleSetSelect.disabled = game.moves.length > 0;
  if (game.outcome === "in-progress") {
    turn.textContent = `${NAME[game.mover]} to move`;
    result.hidden = true;
  } else {
    turn.textContent = "Game over";
    result.textContent = `${RESULT[game.outcome]}: ${red}, ${blue}`;
    result.hidden = false;
  }
}

ruleSetSelect.addEventListener("change", () => {
  game = createGame(selectedRuleSet());
  update();
});

newGame.addEventListener("click", () => {
  game = createGame(game.ruleSet);
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

update();
