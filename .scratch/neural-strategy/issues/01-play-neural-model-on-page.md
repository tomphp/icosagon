# 01: Play against a Neural Model on the page

Status: done

**What to build:** Add the Neural Strategy and let a Human play against a Model in the browser. A small hand-written network (one hidden layer, no ML library) rates a position from the point of view of the Player who has just moved. Its inputs are:

- the colour at a fixed grid of about 60 sample spots on the Board (+1 for that Player's colour, −1 for the other Player's, 0 uncoloured);
- which of the 20 Points are used;
- both Scores, that Player's first;
- the Ending.

A Model is a JSON document with a format version, the network shape, the Population best first, and metadata: seed, total Generations, parent Model and an optional report. Loading a Model rejects a wrong version or a mismatched shape.

The Neural Strategy tries every legal Move, rates each resulting position with the Model's best network, and plays the highest. Exact ties are broken with the random source. `chooseMove` stays the single entry point; `Strategy` can now also be a Neural Strategy carrying its Model.

Every `models/*.json` at the repo root is bundled into the page (and picked up live by the dev server). Each compatible Model is added to the Strategy selector after Greedy, sorted by filename and labelled "Neural: <name> (<total Generations> gens)". Incompatible ones are left out with a console warning. Greedy stays the default, and the selector's enabling, locking and new-game behaviour is unchanged. Commit a tiny fixture Model with random weights to `models/` for the browser tests.

See `.scratch/neural-strategy/spec.md`, `CONTEXT.md` and `docs/adr/0001-neuroevolution-for-neural-strategy.md`.

**Blocked by:** None (can start immediately).

- [x] Neural returns a legal Move from fresh and mid-game positions under both Endings, including a Move that triggers an Award
- [x] With a hand-built Model whose ratings are predictable, Neural picks the expected Move
- [x] Neural breaks exact ties with the random source
- [x] Neural plays with the first (best) network in the Population
- [x] Loading a Model accepts a valid document and rejects a wrong version and a shape mismatch
- [x] The Strategy selector lists Random, Greedy, then each compatible Model as "Neural: <name> (<N> gens)", sorted by filename; Greedy stays the default
- [x] An incompatible Model is left out of the selector, with a console warning
- [x] With no Models, the selector is unchanged
- [x] A fixture Model is committed in `models/`; a page test plays a game against it to Game over, with only legal Computer Moves and the usual result wording

## Comments

- Leaving out an incompatible Model, and the selector with no Models, are unit-tested through `neuralOptions` in `src/model.ts` rather than on the page. `main.ts` only feeds it `import.meta.glob` and `console.warn`. A browser test would have needed an incompatible file in the shipped `models/` folder, or a test that changes the folder while the dev server reloads the other tests' pages.
- Model options are sorted by name with numbers in order (`gen-2` before `gen-10`), so a lineage reads in order.
