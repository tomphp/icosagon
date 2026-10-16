import { applyMove, capturedRegions, type Game, type Region, type Scores } from "./game.ts";

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
  const flash = capturedRegions(before, move);
  if (!(after.stuck && after.ending === "award")) {
    return [{ at: 0, regions, scores, flash, over: after.outcome !== "in-progress" }];
  }
  // The same Move under Skip is the game just before the Award, which recolours one Region in place.
  const preAward = applyMove({ ...before, ending: "skip" }, move);
  // shortcut: an awarded Region already in the stuck Player's colour doesn't flash; find it by its Points if that matters.
  const awarded = regions.filter((region, i) => region.colour !== preAward.regions[i].colour);
  return [
    { at: 0, regions: preAward.regions, scores: preAward.scores, flash, over: false },
    { at: FLASH_MS, regions, scores, flash: awarded, over: true },
  ];
}
