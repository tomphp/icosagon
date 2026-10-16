import { chooseMove, type Random, type Strategy } from "./computer.ts";
import { applyMove, createGame, previewMove, type Ending, type Game, type Move, type Player } from "./game.ts";
import type { Vec } from "./geometry.ts";
import type { DragView } from "./render.ts";

export type Screen = "start" | "playing" | "over";
export type Opponent = "human" | "computer";

export interface Settings {
  opponent: Opponent;
  strategy: Strategy;
  ending: Ending;
}

/** The whole app's state, with no DOM: which Screen is showing and the game behind it. */
export interface AppState {
  screen: Screen;
  settings: Settings;
  game: Game;
  /** The Player the Computer controls, or null in Human vs Human. */
  computer: Player | null;
  drag: DragView | null;
}

/** The Start Screen's Settings on first load: Human vs Computer, Greedy, Award. */
export const DEFAULT_SETTINGS: Settings = { opponent: "computer", strategy: "greedy", ending: "award" };

/** The Start Screen, showing the Settings; the game behind it is an empty Board that is never drawn. */
export function startScreen(settings: Settings): AppState {
  return { screen: "start", settings, game: createGame(settings.ending), computer: null, drag: null };
}

/** Changes some of the Settings on the Start Screen. */
export function chooseSettings(state: AppState, changes: Partial<Settings>): AppState {
  return { ...state, settings: { ...state.settings, ...changes } };
}

/** The Screen a game is shown on: Game over once its outcome is decided. */
const screenOf = (game: Game): Screen => (game.outcome === "in-progress" ? "playing" : "over");

/** Plays the Computer's Move if it is the Mover. */
function playComputer(state: AppState, random: Random): AppState {
  const { game, computer, settings } = state;
  if (game.outcome !== "in-progress" || game.mover !== computer) return state;
  const next = applyMove(game, chooseMove(game, settings.strategy, random));
  return { ...state, game: next, screen: screenOf(next) };
}

/** Starts a game with the Settings; against the Computer, a coin flip gives it Red or Blue. */
export function startGame(settings: Settings, random: Random): AppState {
  const computer = settings.opponent === "computer" ? (random() < 0.5 ? "blue" : "red") : null;
  return playComputer({ screen: "playing", settings, game: createGame(settings.ending), computer, drag: null }, random);
}

/** Plays the Mover's Move, then the Computer's reply. */
export function makeMove(state: AppState, move: Move, random: Random): AppState {
  const game = applyMove(state.game, move);
  return playComputer({ ...state, game, screen: screenOf(game), drag: null }, random);
}

/** Abandons the game and returns to the Start Screen, keeping the Settings. */
export function toMenu(state: AppState): AppState {
  return { ...state, screen: "start", drag: null };
}

/** Follows a drag from the start Point; snapped to a legal end Point, it previews that Move's Regions. */
export function dragTo(state: AppState, start: number, pointer: Vec, snapped: number | null): AppState {
  const preview = snapped === null ? null : previewMove(state.game, { start, end: snapped });
  return { ...state, drag: { start, pointer, snapped, preview } };
}

/** Ends the drag: released on a legal end Point it makes that Move, otherwise nothing changes. */
export function releaseDrag(state: AppState, start: number, end: number | null, random: Random): AppState {
  return end === null ? { ...state, drag: null } : makeMove(state, { start, end }, random);
}
