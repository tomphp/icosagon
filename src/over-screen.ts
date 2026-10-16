import type { Game, Outcome, Player } from "./game.ts";
import { NAME } from "./playing-screen.ts";
import { toMenu, type AppState } from "./screen.ts";
import { button, drawWidgets, wrapText, type Measure, type Text } from "./widgets.ts";

const HEADLINE: Record<Exclude<Outcome, "in-progress">, string> = {
  "red-wins": "Red wins",
  "blue-wins": "Blue wins",
  draw: "Draw",
};

/** Against the Computer, who won from the Human's side; nothing in Human vs Human or on a Draw. */
function subtitle({ game, computer }: AppState) {
  if (!computer || game.outcome === "draw") return "";
  return game.outcome === `${computer}-wins` ? "Computer wins" : "You win!";
}

/** Why a game ended after 9 Moves: the Mover had no legal Move, and under Award took the Region. */
function stuckReason({ stuck, ending }: Game) {
  if (!stuck) return "";
  const reason = `${NAME[stuck.player]} has no legal Move`;
  const [p, q] = stuck.points;
  return ending === "award" ? `${reason} and takes the Region by Points ${p} and ${q}` : reason;
}

/** The Game Over lines for the status mirror; an empty line is not shown. */
export function overStatus(state: AppState) {
  return {
    result: HEADLINE[state.game.outcome as Exclude<Outcome, "in-progress">],
    subtitle: subtitle(state),
    reason: stuckReason(state.game),
  };
}

/**
 * Draws a translucent grey overlay over whatever is on the canvas, with the result centred on it and a Back to
 * Start Screen button, which it returns.
 */
export function drawGameOver(ctx: CanvasRenderingContext2D, measure: Measure, width: number, height: number, state: AppState) {
  ctx.fillStyle = "rgba(110, 106, 100, 0.6)";
  ctx.fillRect(0, 0, width, height);

  const { result, subtitle, reason } = overStatus(state);
  const column = Math.min(480, width - 32);
  const lines: [string, number][] = [
    [result, 44],
    ...(subtitle ? [[subtitle, 24] as [string, number]] : []),
    ...wrapText(measure, reason, 16, column).map((line): [string, number] => [line, 16]),
  ];
  const back = button(measure, 0, 0, 18, {
    key: "back",
    label: "Back to Start Screen",
    selected: true,
    pill: false,
    press: toMenu,
  });
  const gap = 12;
  const total = lines.reduce((sum, [, font]) => sum + font * 1.3, 0) + gap + back.rect.height;
  let y = (height - total) / 2;
  const texts: Text[] = lines.map(([text, font]) => {
    const t = { text, x: (width - measure(text, font)) / 2, y, font, colour: "#fff" };
    y += font * 1.3;
    return t;
  });
  back.rect.x = (width - back.rect.width) / 2;
  back.rect.y = y + gap;
  drawWidgets(ctx, texts, [back]);
  return [back];
}
