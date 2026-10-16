import type { Move, Player } from "./game.ts";
import { BAR_HEIGHT } from "./layout.ts";
import { FILL } from "./render.ts";
import { toMenu, type AppState } from "./screen.ts";
import { button, drawScoreBar, drawWidgets, MUTED, type Measure, type Text } from "./widgets.ts";

export const NAME: Record<Player, string> = { red: "Red", blue: "Blue" };

export const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;

/** The Players on the left and right: the Human then the Computer, or Red then Blue in Human vs Human. */
function sides({ computer }: AppState): [Player, Player] {
  return computer === "red" ? ["blue", "red"] : ["red", "blue"];
}

const nameOf = ({ computer }: AppState, player: Player) => (player === computer ? "Computer" : "Human");

/** The Computer's last Move, shown until the Human moves again, so only while it made the last Move. */
function computerMove({ game, computer }: AppState): Move | null {
  const last = game.moves.at(-1);
  return computer && game.mover !== computer && last ? last : null;
}

/** The status the canvas shows during play, as lines for the status mirror; an empty line is not shown. */
export function playingStatus(state: AppState) {
  const { game, computer } = state;
  const [left, right] = sides(state);
  const label = (p: Player) => `${nameOf(state, p)} (${NAME[p]})`;
  const score = (p: Player) => `${NAME[p]} ${percent(game.scores[p])}`;
  const move = computerMove(state);
  return {
    sides: `${label(left)} vs ${label(right)}`,
    turn:
      game.outcome !== "in-progress"
        ? ""
        : game.mover === computer
          ? "Computer to move"
          : computer
            ? `Your move (${NAME[game.mover]})`
            : `${NAME[game.mover]} to move`,
    computer: move ? `Computer played ${move.start}→${move.end}` : "",
    scores: `${score(left)}, ${score(right)}`,
  };
}

const LABEL_FONT = 20;
const EDGE = 16;
/** The Mover's box around their name, which the Menu button is centred against. */
const BOX = { y: 12, height: 36, pad: 10 };

/**
 * Draws the header and score bar over the Board: each Player's name on their side in their colour, the Mover's
 * boxed, the Computer's last Move under its name, and during play the Menu button in the top centre, which it returns.
 */
export function drawPlaying(ctx: CanvasRenderingContext2D, measure: Measure, width: number, height: number, state: AppState) {
  const { game } = state;
  const [left, right] = sides(state);
  const move = computerMove(state);
  const menu = button(measure, 0, 0, 14, { key: "menu", label: "Menu", selected: false, pill: false, press: toMenu });
  menu.rect.x = (width - menu.rect.width) / 2;
  menu.rect.y = BOX.y + (BOX.height - menu.rect.height) / 2;
  // On a narrow screen, shrink the names so each box fits between its edge and the Menu.
  const room = menu.rect.x - EDGE - 8 - 2 * BOX.pad;
  const widest = Math.max(measure(nameOf(state, left), LABEL_FONT), measure(nameOf(state, right), LABEL_FONT));
  const font = Math.min(LABEL_FONT, (LABEL_FONT * room) / widest);

  const texts: Text[] = [];
  for (const [player, onLeft] of [[left, true], [right, false]] as const) {
    const name = nameOf(state, player);
    const nameWidth = measure(name, font);
    const x = onLeft ? EDGE + BOX.pad : width - EDGE - BOX.pad - nameWidth;
    texts.push({ text: name, x, y: BOX.y + (BOX.height - font) / 2, font, colour: FILL[player] });
    if (game.outcome === "in-progress" && game.mover === player) {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = FILL[player];
      ctx.beginPath();
      ctx.roundRect(x - BOX.pad, BOX.y, nameWidth + 2 * BOX.pad, BOX.height, 10);
      ctx.stroke();
    }
    if (move && player === state.computer) {
      const played = `played ${move.start}→${move.end}`;
      const at = onLeft ? x : width - EDGE - BOX.pad - measure(played, 13);
      texts.push({ text: played, x: at, y: BOX.y + BOX.height + 6, font: 13, colour: MUTED });
    }
  }

  const share = (p: Player) => ({ fraction: game.scores[p], colour: FILL[p], label: percent(game.scores[p]) });
  drawScoreBar(ctx, { x: 0, y: height - BAR_HEIGHT, width, height: BAR_HEIGHT }, share(left), share(right));

  // Game Over has its own button back to the Start Screen.
  const buttons = game.outcome === "in-progress" ? [menu] : [];
  drawWidgets(ctx, texts, buttons);
  return buttons;
}
