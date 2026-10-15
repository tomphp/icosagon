import { describe, expect, it, vi } from "vitest";
import { fit, gradient, loss, step, type Sample, type FitOptions } from "./fit.ts";
import { seeded } from "./games.ts";
import { loadModel } from "./model.ts";
import { INPUT_SIZE, type Network } from "./network.ts";
import { randomNetwork, TRAINING_DEFAULTS } from "./training.ts";

// Fitting plays the Hoarders, whose games are slow, so these tests need longer than the default.
vi.setConfig({ testTimeout: 30_000 });

const random = seeded(1);
const network = randomNetwork(3, random);
const batch: Sample[] = Array.from({ length: 5 }, () => ({
  inputs: Array.from({ length: INPUT_SIZE }, () => random() * 2 - 1),
  target: random() - 0.5,
}));

/** Every weight of the network, in a fixed order. */
const flat = (n: Network) => [...n.hiddenWeights.flat(), ...n.hiddenBiases, ...n.outputWeights, n.outputBias];

/** The network with weight `index`, in `flat`'s order, moved by `delta`. */
function nudged(n: Network, index: number, delta: number): Network {
  const copy = structuredClone(n);
  const weights = flat(copy);
  weights[index] += delta;
  let i = 0;
  copy.hiddenWeights = copy.hiddenWeights.map((row) => row.map(() => weights[i++]));
  copy.hiddenBiases = copy.hiddenBiases.map(() => weights[i++]);
  copy.outputWeights = copy.outputWeights.map(() => weights[i++]);
  copy.outputBias = weights[i];
  return copy;
}

describe("Fitting by backprop", () => {
  it("has a gradient that matches finite differences", () => {
    const analytic = flat(gradient(network, batch));
    const h = 1e-6;
    // A spread of weights from every layer: hidden weights, hidden biases, output weights and the output bias.
    for (const index of [0, 7, INPUT_SIZE + 3, 3 * INPUT_SIZE, 3 * INPUT_SIZE + 2, 3 * INPUT_SIZE + 4, analytic.length - 1]) {
      const numeric = (loss(nudged(network, index, h), batch) - loss(nudged(network, index, -h), batch)) / (2 * h);
      expect(analytic[index]).toBeCloseTo(numeric, 6);
    }
  });

  it("lowers the error on a batch with one SGD step", () => {
    expect(loss(step(network, batch, 0.01), batch)).toBeLessThan(loss(network, batch));
  });
});

describe("fit", () => {
  const tiny: FitOptions = { games: 9, epochs: 2, rate: 0.01, hidden: 2, seed: 1, reportGames: 4 };

  it("gives a loadable Model, the same for the same seed and different for another", async () => {
    const model = await fit(tiny);
    expect(loadModel(JSON.parse(JSON.stringify(model)))).toEqual(model);
    expect(model.seed).toBe(1);
    expect(model.report?.greedy).toBeDefined();
    // A full Population, so Training can continue from it with --from.
    expect(model.population).toHaveLength(TRAINING_DEFAULTS.population);
    expect(await fit(tiny)).toEqual(model);
    expect((await fit({ ...tiny, seed: 2 })).population).not.toEqual(model.population);
  });

  it("throws rather than give a Model when fitting diverges", async () => {
    await expect(fit({ ...tiny, rate: 1e308 })).rejects.toThrow(/diverged/);
  });
});
