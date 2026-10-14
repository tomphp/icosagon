import { describe, expect, it, vi } from "vitest";
import { loadModel, MODEL_VERSION, neuralOptions } from "./model";
import { INPUT_SIZE } from "./network";

const network = (hidden: number, inputs = INPUT_SIZE) => ({
  hiddenWeights: Array.from({ length: hidden }, () => Array(inputs).fill(0.5)),
  hiddenBiases: Array(hidden).fill(0.1),
  outputWeights: Array(hidden).fill(-0.2),
  outputBias: 0.3,
});

/** A valid Model document, as parsed JSON, with any fields overridden. */
const document = (overrides: Record<string, unknown> = {}) => ({
  version: MODEL_VERSION,
  shape: { inputs: INPUT_SIZE, hidden: 2 },
  population: [network(2), network(2)],
  seed: 42,
  generations: 7,
  parent: "gen-1",
  report: null,
  ...overrides,
});

describe("loading a Model", () => {
  it("accepts a valid document", () => {
    const model = loadModel(document());

    expect(model.population).toHaveLength(2);
    expect(model.generations).toBe(7);
    expect(model.parent).toBe("gen-1");
  });

  it("rejects a wrong version", () => {
    expect(() => loadModel(document({ version: MODEL_VERSION + 1 }))).toThrow(/version/);
    expect(() => loadModel(document({ version: undefined }))).toThrow(/version/);
  });

  it("rejects a shape that doesn't match the inputs", () => {
    expect(() => loadModel(document({ shape: { inputs: INPUT_SIZE - 1, hidden: 2 } }))).toThrow(/shape/);
  });

  it("rejects a network that doesn't match the shape", () => {
    expect(() => loadModel(document({ population: [network(2), network(3)] }))).toThrow(/shape/);
    expect(() => loadModel(document({ population: [network(2, INPUT_SIZE + 1)] }))).toThrow(/shape/);
    expect(() => loadModel(document({ population: [] }))).toThrow(/Population/);
  });

  it("rejects a missing or invalid total of Generations", () => {
    expect(() => loadModel(document({ generations: undefined }))).toThrow(/Generations/);
    expect(() => loadModel(document({ generations: -1 }))).toThrow(/Generations/);
  });

  it("rejects something that isn't a Model at all", () => {
    expect(() => loadModel(null)).toThrow();
    expect(() => loadModel("gen-1")).toThrow();
  });
});

describe("the Neural Strategy options", () => {
  it("offers each compatible Model, sorted by name (numbers in order) and labelled with its total Generations", () => {
    const warn = vi.fn();
    const options = neuralOptions(
      {
        "../models/gen-2.json": document({ generations: 120 }),
        "../models/gen-10.json": document({ generations: 300 }),
        "../models/gen-1.json": document({ generations: 1 }),
      },
      warn,
    );

    expect(options.map(({ label }) => label)).toEqual([
      "Neural: gen-1 (1 gens)",
      "Neural: gen-2 (120 gens)",
      "Neural: gen-10 (300 gens)",
    ]);
    expect(new Set(options.map(({ value }) => value)).size).toBe(3);
    expect(options[2].strategy).toEqual({ kind: "neural", model: document({ generations: 300 }) });
    expect(warn).not.toHaveBeenCalled();
  });

  it("leaves out an incompatible Model, with a warning naming it", () => {
    const warn = vi.fn();
    const options = neuralOptions(
      { "../models/old.json": document({ version: 0 }), "../models/new.json": document() },
      warn,
    );

    expect(options.map(({ label }) => label)).toEqual(["Neural: new (7 gens)"]);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toMatch(/old/);
  });

  it("offers nothing when there are no Models", () => {
    expect(neuralOptions({}, vi.fn())).toEqual([]);
  });
});
