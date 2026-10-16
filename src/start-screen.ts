import type { Random, Strategy } from "./computer.ts";
import type { Ending } from "./game.ts";
import { chooseSettings, startGame, type Opponent, type Settings } from "./screen.ts";
import { button, INK, MUTED, wrapRow, wrapText, type Button, type Measure, type Text } from "./widgets.ts";

/** A Strategy pill: the named Strategies, then one per Model. */
export interface StrategyOption {
  value: string;
  label: string;
  strategy: Strategy;
}

export const NAMED_STRATEGIES: StrategyOption[] = [
  { value: "random", label: "Random", strategy: "random" },
  { value: "greedy", label: "Greedy", strategy: "greedy" },
  { value: "hoarder", label: "Hoarder", strategy: "hoarder" },
  { value: "clever-hoarder", label: "Clever Hoarder", strategy: "clever-hoarder" },
];

const OPPONENTS: { value: Opponent; label: string }[] = [
  { value: "human", label: "Human" },
  { value: "computer", label: "Computer" },
];

const ENDINGS: { value: Ending; label: string }[] = [
  { value: "award", label: "Award" },
  { value: "skip", label: "Skip" },
];

export const HOW_TO_PLAY = [
  "Take turns drawing a Line between two unused, non-adjacent Points. Drag from one Point to another.",
  "Every Region the Line crosses is cut in two. The side on your left as you draw becomes your colour.",
  "Red moves first. The game lasts 10 Moves, or 9 if the last two unused Points are adjacent.",
  "Award: the Player who can't move takes the Region beside those two Points. Skip: they just miss the Move.",
  "The Player with the most coloured area wins.",
];

const BULLET = "•  ";

/**
 * The Start Screen's texts and buttons in a canvas of the given size: a column of pill rows, How to play
 * and Start, shrunk to fit a short window and centred vertically in a tall one.
 */
export function startScreenWidgets(
  measure: Measure,
  width: number,
  height: number,
  settings: Settings,
  strategies: StrategyOption[],
  random: Random,
) {
  const column = Math.min(560, width - 32);
  const x = (width - column) / 2;

  const layout = (scale: number) => {
    const texts: Text[] = [];
    const buttons: Button[] = [];
    const gap = 8 * scale;
    let y = 24 * scale;
    const text = (t: string, font: number, colour: string, at = x) => {
      texts.push({ text: t, x: at, y, font: font * scale, colour });
      y += font * scale * 1.35;
    };
    const row = <T>(heading: string, options: (T & { value: string; label: string })[], selected: (o: T) => boolean, change: (o: T) => Partial<Settings>) => {
      text(heading, 13, MUTED);
      y += 2 * scale;
      const pills = options.map((o) =>
        button(measure, 0, 0, 15 * scale, {
          key: `${heading.toLowerCase()}:${o.value}`,
          label: o.label,
          selected: selected(o),
          pill: true,
          group: heading,
          press: (state) => chooseSettings(state, change(o)),
        }),
      );
      y = wrapRow(pills, x, y, column, gap) + 18 * scale;
      buttons.push(...pills);
    };

    text("Icosagon", 34, INK);
    y += 12 * scale;
    row("Opponent", OPPONENTS, (o) => o.value === settings.opponent, (o) => ({ opponent: o.value }));
    // Strategy only applies against the Computer.
    if (settings.opponent === "computer") {
      row("Strategy", strategies, (o) => o.strategy === settings.strategy, (o) => ({ strategy: o.strategy }));
    }
    row("Ending", ENDINGS, (o) => o.value === settings.ending, (o) => ({ ending: o.value }));

    text("How to play", 13, MUTED);
    y += 2 * scale;
    const indent = measure(BULLET, 14 * scale);
    for (const item of HOW_TO_PLAY) {
      wrapText(measure, item, 14 * scale, column - indent).forEach((line, i) => {
        if (i === 0) texts.push({ text: BULLET, x, y, font: 14 * scale, colour: INK });
        text(line, 14, INK, x + indent);
      });
      y += 4 * scale;
    }

    y += 16 * scale;
    const start = button(measure, 0, y, 20 * scale, {
      key: "start",
      label: "Start",
      selected: true,
      pill: false,
      press: (state) => startGame(state.settings, random),
    });
    start.rect.x = (width - start.rect.width) / 2;
    buttons.push(start);
    return { texts, buttons, scale, bottom: y + start.rect.height + 24 * scale };
  };

  // A pill wider than the column, such as a long Model name on a phone, shrinks everything to fit.
  const pillWidth = (label: string) =>
    button(measure, 0, 0, 15, { key: label, label, selected: false, pill: true, press: (s) => s }).rect.width;
  const widest = Math.max(...strategies.map((o) => pillWidth(o.label)));
  let screen = layout(Math.min(1, column / widest));
  // Smaller text wraps onto fewer lines, so shrinking by the overflow is enough to fit.
  if (screen.bottom > height) screen = layout((screen.scale * height) / screen.bottom);
  const dy = Math.max(0, (height - screen.bottom) / 2);
  for (const t of screen.texts) t.y += dy;
  for (const b of screen.buttons) b.rect.y += dy;
  return screen;
}
