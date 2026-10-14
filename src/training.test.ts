import { describe, expect, it } from "vitest";
import type { Strategy } from "./computer.ts";
import { loadModel, saveModel, type Model } from "./model.ts";
import { match, train, type Progress, type TrainingOptions } from "./training.ts";

/** Tiny settings so Training takes moments: 4 networks, 2 Generations, 2 hidden units, 1 survivor, 4 report games. */
const tiny: TrainingOptions = {
  generations: 2,
  population: 4,
  hidden: 2,
  survivors: 0.25,
  mutation: 0.1,
  seed: 1,
  reportGames: 4,
};

/** Trains with the options, collecting every Generation's progress. */
function trainCollecting(options: TrainingOptions) {
  const progress: Progress[] = [];
  const model = train({ ...options, onGeneration: (p) => progress.push(p) });
  return { model, progress };
}

const { model, progress } = trainCollecting(tiny);

describe("Training", () => {
  it("gives a Model that loads, with its seed, its Generations and no parent", () => {
    expect(loadModel(JSON.parse(JSON.stringify(model)))).toEqual(model);
    expect(model.seed).toBe(1);
    expect(model.generations).toBe(2);
    expect(model.parent).toBeNull();
    expect(model.shape.hidden).toBe(2);
  });

  it("gives an identical Model for the same seed and a different one for a different seed", () => {
    expect(train(tiny)).toEqual(model);
    expect(train({ ...tiny, seed: 2 }).population).not.toEqual(model.population);
  });

  it("preserves the Population size", () => {
    expect(model.population).toHaveLength(4);
    for (const { ranked } of progress) expect(ranked).toHaveLength(4);
  });

  it("reports each Generation, with the Population ranked best first by Fitness", () => {
    expect(progress.map(({ generation }) => generation)).toEqual([1, 2]);
    for (const { ranked } of progress) {
      const fitness = ranked.map((r) => r.fitness);
      expect(fitness).toEqual([...fitness].sort((a, b) => b - a));
    }
  });

  it("stores the survivors of the last Generation first, best first", () => {
    const last = progress[1].ranked;
    expect(model.population[0]).toEqual(last[0].network);
  });

  it("keeps the survivors unchanged in the next Generation and replaces the rest with mutated copies", () => {
    const [first, second] = progress.map(({ ranked }) => ranked.map((r) => r.network));
    // One survivor of 4 (25%), so the second Generation holds it and 3 new networks.
    expect(second).toContainEqual(first[0]);
    for (const network of first.slice(1)) expect(second).not.toContainEqual(network);
  });

  it("keeps at least one survivor however small the share", () => {
    const { progress } = trainCollecting({ ...tiny, survivors: 0 });
    expect(progress[1].ranked.map((r) => r.network)).toContainEqual(progress[0].ranked[0].network);
  });

  it("plays the round-robin under both colours and both Endings plus 4 Greedy games per network", () => {
    // 6 pairs × 4 games + 4 networks × 4 games against Greedy.
    for (const { games } of progress) expect(games).toBe(6 * 4 + 4 * 4);
  });

  it("measures Fitness as an average Score margin, between -1 and 1", () => {
    for (const { ranked } of progress) {
      for (const { fitness } of ranked) expect(Math.abs(fitness)).toBeLessThanOrEqual(1);
    }
  });
});

describe("Training's final report", () => {
  it("plays the best network against Greedy and Random, its counts adding up to the games played", () => {
    for (const results of [model.report!.greedy, model.report!.random]) {
      expect(results.wins + results.draws + results.losses).toBe(4);
      expect(Math.abs(results.margin)).toBeLessThanOrEqual(1);
    }
  });

  it("is stored in the saved Model, its margins rounded", () => {
    const saved = loadModel(JSON.parse(saveModel(model))).report!;
    for (const opponent of ["greedy", "random"] as const) {
      const { margin, ...counts } = model.report![opponent];
      expect(saved[opponent]).toMatchObject(counts);
      expect(saved[opponent].margin).toBeCloseTo(margin, 4);
    }
  });
});

describe("match", () => {
  const neural = (model: Model): Strategy => ({ kind: "neural", model });
  const participants: Strategy[] = [neural(model), neural(train({ ...tiny, seed: 2 })), "greedy", "random"];
  const pairings = match(participants, { games: 2, seed: 7 });

  it("plays every pair of participants once", () => {
    expect(pairings.map(({ a, b }) => [a, b])).toEqual([
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ]);
  });

  it("plays 4 × N games per pairing, but only the 4 distinct games for Neural vs Neural", () => {
    expect(pairings.map(({ games }) => games)).toEqual([4, 8, 8, 8, 8, 8]);
  });

  it("gives counts that add up to the games played, mirrored between the two participants", () => {
    for (const { games, results } of pairings) {
      const [a, b] = results;
      expect(a.wins + a.draws + a.losses).toBe(games);
      expect([b.wins, b.draws, b.losses]).toEqual([a.losses, a.draws, a.wins]);
      expect(b.margin).toBeCloseTo(-a.margin);
    }
  });

  it("gives identical results for the same seed", () => {
    expect(match(participants, { games: 2, seed: 7 })).toEqual(pairings);
  });
});
