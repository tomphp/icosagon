import { describe, expect, it, vi } from "vitest";
import type { Strategy } from "./computer.ts";
import { loadModel, saveModel, type Model } from "./model.ts";
import { match, report, train, type Progress, type TrainingOptions } from "./training.ts";

// Training plays the Hoarders, whose games are slow, so these tests need longer than the default.
vi.setConfig({ testTimeout: 30_000 });

/** Tiny settings so Training takes moments: 4 networks, 2 Generations, 2 hidden units, 1 survivor, 1 scripted game, 4 report games. */
const tiny: TrainingOptions = {
  generations: 2,
  population: 4,
  hidden: 2,
  survivors: 0.25,
  mutation: 0.1,
  scriptedGames: 1,
  seed: 1,
  reportGames: 4,
};

/** Trains with the options, collecting every Generation's progress. */
async function trainCollecting(options: TrainingOptions) {
  const progress: Progress[] = [];
  const model = await train({ ...options, onGeneration: (p) => progress.push(p) });
  return { model, progress };
}

const { model, progress } = await trainCollecting(tiny);

describe("Training", () => {
  it("gives a Model that loads, with its seed, its Generations and no parent", () => {
    expect(loadModel(JSON.parse(JSON.stringify(model)))).toEqual(model);
    expect(model.seed).toBe(1);
    expect(model.generations).toBe(2);
    expect(model.parent).toBeNull();
    expect(model.shape.hidden).toBe(2);
  });

  it("gives an identical Model for the same seed and a different one for a different seed", async () => {
    expect(await train(tiny)).toEqual(model);
    expect((await train({ ...tiny, seed: 2 })).population).not.toEqual(model.population);
  });

  it("gives an identical Model whether or not its games run in parallel", async () => {
    expect(await train({ ...tiny, workers: 3 })).toEqual(await train({ ...tiny, workers: 1 }));
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

  it("keeps at least one survivor however small the share", async () => {
    const { progress } = await trainCollecting({ ...tiny, survivors: 0 });
    expect(progress[1].ranked.map((r) => r.network)).toContainEqual(progress[0].ranked[0].network);
  });

  it("plays the round-robin under both colours and both Endings plus 4 games per network against each scripted opponent", () => {
    // 6 pairs × 4 games + 4 networks × 4 games against each of the 3 scripted opponents.
    for (const { games } of progress) expect(games).toBe(6 * 4 + 4 * 4 * 3);
  });

  it("plays each network's 4 games against each scripted opponent as many times over as asked", async () => {
    const { progress } = await trainCollecting({ ...tiny, generations: 1, scriptedGames: 3 });
    // 6 pairs × 4 games + 3 repeats × 4 networks × 4 games against each of the 3 scripted opponents.
    expect(progress[0].games).toBe(6 * 4 + 3 * 4 * 4 * 3);
  });

  it("reports the Population's average margin against each scripted opponent, which the round-robin games don't affect", () => {
    for (const { ranked, margins } of progress) {
      expect(Object.keys(margins)).toEqual(["greedy", "hoarder", "clever-hoarder"]);
      // The round-robin margins cancel out. Each network plays 4 games against each of the 3 others and each scripted opponent.
      const scripted = Object.values(margins);
      const gamesPerNetwork = 3 * 4 + 4 * scripted.length;
      const averageFitness = ranked.reduce((sum, r) => sum + r.fitness, 0) / ranked.length;
      expect(scripted.reduce((sum, m) => sum + m, 0)).toBeCloseTo((averageFitness * gamesPerNetwork) / 4);
      for (const margin of scripted) expect(Math.abs(margin)).toBeLessThanOrEqual(1);
    }
  });

  it("measures Fitness as an average Score margin, between -1 and 1", () => {
    for (const { ranked } of progress) {
      for (const { fitness } of ranked) expect(Math.abs(fitness)).toBeLessThanOrEqual(1);
    }
  });
});

const continuing = await trainCollecting({ ...tiny, generations: 3, seed: 5, from: { model, name: "gen-1" } });

describe("Continuing a Model", () => {
  const { model: continued, progress } = continuing;

  it("starts from the Model's Population as stored", () => {
    const first = progress[0].ranked.map((r) => r.network);
    expect(first).toHaveLength(model.population.length);
    expect(first).toEqual(expect.arrayContaining(model.population));
  });

  it("adds this run's Generations to the Model's total and records the parent", () => {
    expect(continued.generations).toBe(2 + 3);
    expect(continued.parent).toBe("gen-1");
    expect(continued.seed).toBe(5);
  });

  it("keeps the Model's Population size and shape, whatever the options say", async () => {
    const { model: resized } = await trainCollecting({ ...tiny, population: 6, hidden: 3, from: { model, name: "gen-1" } });
    expect(resized.population).toHaveLength(4);
    expect(resized.shape).toEqual(model.shape);
  });

  it("gives an identical Model for the same seed", async () => {
    expect(await train({ ...tiny, generations: 3, seed: 5, from: { model, name: "gen-1" } })).toEqual(continued);
  });
});

describe("Stopping Training early", () => {
  it("keeps the Generations completed before it was stopped", async () => {
    const controller = new AbortController();
    const stopped = await train({
      ...tiny,
      generations: 5,
      signal: controller.signal,
      onGeneration: ({ generation }) => generation === 2 && controller.abort(),
    });
    expect(stopped.generations).toBe(2);
    expect(stopped.population).toEqual(model.population);
    expect(stopped.report).not.toBeNull();
  });

  it("drops the Generation in progress when stopped while its games run in parallel", async () => {
    const controller = new AbortController();
    const generationsPlayed: number[] = [];
    const stopped = await train({
      ...tiny,
      generations: 1000,
      workers: 2,
      signal: controller.signal,
      onGeneration: ({ generation }) => {
        generationsPlayed.push(generation);
        // Stop during the next Generation's games.
        if (generation === 3) setTimeout(() => controller.abort(), 5);
      },
    });
    expect(stopped.generations).toBe(generationsPlayed.length);
    expect(stopped.generations).toBeLessThan(1000);
    expect(stopped.population).toEqual((await train({ ...tiny, generations: stopped.generations })).population);
  });
});

describe("Training's final report", () => {
  it("plays the best network against Greedy, Hoarder, Clever Hoarder and Random, its counts adding up to the games played", () => {
    expect(Object.keys(model.report!)).toEqual(["greedy", "hoarder", "clever-hoarder", "random"]);
    for (const results of Object.values(model.report!)) {
      expect(results.wins + results.draws + results.losses).toBe(4);
      expect(Math.abs(results.margin)).toBeLessThanOrEqual(1);
    }
  });

  it("is stored in the saved Model, its margins rounded", () => {
    const saved = loadModel(JSON.parse(saveModel(model))).report!;
    for (const [opponent, { margin, ...counts }] of Object.entries(model.report!)) {
      expect(saved[opponent as keyof typeof saved]).toMatchObject(counts);
      expect(saved[opponent as keyof typeof saved]!.margin).toBeCloseTo(margin, 4);
    }
  });
});

describe("report", () => {
  it("plays a Model's best network against the same opponents as Training's final report, the seed fixing the results", async () => {
    const reported = await report(model, { games: 4, seed: 3 });
    expect(Object.keys(reported)).toEqual(Object.keys(model.report!));
    for (const results of Object.values(reported)) expect(results.wins + results.draws + results.losses).toBe(4);
    expect(await report(model, { games: 4, seed: 3, workers: 1 })).toEqual(reported);
  });
});

const neural = (model: Model): Strategy => ({ kind: "neural", model });
const participants: Strategy[] = [neural(model), neural(await train({ ...tiny, seed: 2 })), "greedy", "random"];
const pairings = await match(participants, { games: 2, seed: 7 });

describe("match", () => {
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

  it("gives identical results for the same seed", async () => {
    expect(await match(participants, { games: 2, seed: 7 })).toEqual(pairings);
  });

  it("gives identical results whether or not its games run in parallel", async () => {
    const options = { games: 2, seed: 7 };
    expect(await match(participants, { ...options, workers: 3 })).toEqual(await match(participants, { ...options, workers: 1 }));
  });
});
