import type { NamedStrategy, Strategy } from "./computer.ts";
import { INPUT_SIZE, type Network } from "./network.ts";

/** The Model format version. It changes whenever the network's inputs or the file layout do. */
export const MODEL_VERSION = 2;

/** How one participant did against another: game counts and its average Score margin. */
export interface Results {
  wins: number;
  draws: number;
  losses: number;
  /** Average of its Score minus its Opponent's at Game over. */
  margin: number;
}

/** A trained Population of networks, the best first, and where it came from. */
export interface Model {
  version: typeof MODEL_VERSION;
  shape: { inputs: number; hidden: number };
  population: Network[];
  seed: number;
  /** Generations of Training across the whole lineage. */
  generations: number;
  /** The name of the Model this was trained from, if any. */
  parent: string | null;
  /**
   * How the best network did against each opponent at the end of Training. Models trained before an
   * opponent was added have no entry for it.
   */
  report: Partial<Record<NamedStrategy, Results>> | null;
}

/** Whether the value is an array of exactly `length` numbers. */
const isNumbers = (value: unknown, length: number): value is number[] =>
  Array.isArray(value) && value.length === length && value.every((n) => typeof n === "number");

/** Whether the network's weight arrays have the sizes the shape gives. */
function fitsShape(network: Network, { inputs, hidden }: Model["shape"]): boolean {
  return (
    Array.isArray(network?.hiddenWeights) &&
    network.hiddenWeights.length === hidden &&
    network.hiddenWeights.every((row) => isNumbers(row, inputs)) &&
    isNumbers(network.hiddenBiases, hidden) &&
    isNumbers(network.outputWeights, hidden) &&
    typeof network.outputBias === "number"
  );
}

/** Checks a parsed Model document, throwing if it isn't one this version can play with. */
export function loadModel(document: unknown): Model {
  if (typeof document !== "object" || document === null) throw new Error("Not a Model");
  const model = document as Model;
  if (model.version !== MODEL_VERSION) {
    throw new Error(`Model version ${model.version} is not the current version ${MODEL_VERSION}`);
  }
  const { shape } = model;
  if (shape?.inputs !== INPUT_SIZE || !Number.isInteger(shape.hidden) || shape.hidden < 1) {
    throw new Error(`Model shape ${JSON.stringify(shape)} does not match ${INPUT_SIZE} inputs`);
  }
  if (!Array.isArray(model.population) || model.population.length === 0) throw new Error("Model has no Population");
  if (!model.population.every((network) => fitsShape(network, shape))) {
    throw new Error("A network in the Population does not match the Model's shape");
  }
  if (!Number.isInteger(model.generations) || model.generations < 0) {
    throw new Error(`Model total Generations ${model.generations} is not a whole number`);
  }
  return model;
}

/** A Strategy selector option for a Model. */
export interface NeuralOption {
  value: string;
  label: string;
  strategy: Strategy;
}

/**
 * The selector options for the Model documents, keyed by file path, sorted by file name with numbers
 * in order. Incompatible Models are left out and reported through `warn`.
 */
export function neuralOptions(files: Record<string, unknown>, warn: (message: string) => void): NeuralOption[] {
  const named = Object.entries(files).map(([path, document]) => ({
    name: path.replace(/^.*\//, "").replace(/\.json$/, ""),
    document,
  }));
  named.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  return named.flatMap(({ name, document }) => {
    try {
      const model = loadModel(document);
      return [{ value: `neural:${name}`, label: `Neural: ${name} (${model.generations} gens)`, strategy: { kind: "neural", model } }];
    } catch (error) {
      warn(`Model ${name} left out: ${(error as Error).message}`);
      return [];
    }
  });
}

/** The Model as JSON, its numbers rounded to keep the file small. */
export function saveModel(model: Model): string {
  return JSON.stringify(model, (_, value) => (typeof value === "number" ? Math.round(value * 1e4) / 1e4 : value));
}
