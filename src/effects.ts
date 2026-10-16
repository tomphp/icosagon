import { capturedRegions, type Game, type Region, type Scores } from "./game.ts";

/** How long a flash takes to fade, in ms. */
export const FLASH_MS = 500;

/** What the screen shows from `at` ms after a Move. */
export interface Step {
  at: number;
  regions: Region[];
  scores: Scores;
  /** The Regions to flash gold, fading over FLASH_MS from `at`. */
  flash: Region[];
  over: boolean;
}

/** The timed steps the screen shows for the Move that turned `before` into `after`. */
export function effectsOf(before: Game, after: Game): Step[] {
  const move = after.moves.at(-1)!;
  const { regions, scores } = after;
  return [{ at: 0, regions, scores, flash: capturedRegions(before, move), over: after.outcome !== "in-progress" }];
}
