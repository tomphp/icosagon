# Spec: Neural Strategy

Status: ready-for-agent

## Problem Statement

The Computer's only Strategies are Random and Greedy. Greedy looks just one Move ahead, so a Human soon learns to beat it, and there is no stronger opponent to try. There is also no way to grow an opponent that improves with practice and then compare its stages: to train some, keep the results, and see whether more Training made it stronger.

## Solution

There is a new Strategy, **Neural**, that plays with a **Model**: a trained Population of neural networks stored as a file. Models are produced by **Training**, a command-line run that plays thousands of games in memory with no browser. The Population evolves over many **Generations**: every network plays every other network and Greedy, the fittest survive, and mutated copies of them replace the rest (see ADR 0001). The run ends by writing a Model file and printing how its best network does against Greedy and Random.

Training can continue from an existing Model, so you can build a lineage (`gen-1.json`, `gen-2.json`, …). A second command, **match**, plays any mix of Models, Greedy and Random against each other and prints a results table, so you can see how stages of a lineage compare.

Every Model in the project's `models/` folder appears on the page as its own Strategy option, e.g. "Neural: gen-4 (120 gens)", listed after Random and Greedy. Greedy stays the default.

## User Stories

### Playing against a Model

1. As a Human, I want each Model in the models folder offered as its own option in the Strategy selector, so that I can choose which trained opponent to play.
2. As a Human, I want each Model option labelled with "Neural:", the Model's name and its total Generations (e.g. "Neural: gen-4 (120 gens)"), so that I can tell Models apart and see how much Training each had.
3. As a Human, I want Model options listed after Random and Greedy and sorted by name, so that a lineage reads in order.
4. As a Human, I want Greedy to stay the default Strategy, so that adding Models doesn't change what I get by default.
5. As a Human, I want the Strategy selector unchanged when there are no Models, so that the page still works without any Training.
6. As a Human, I want a Neural Computer to behave like any other Computer: coin flip for colours, instant Moves, "Computer played X→Y", and the same result wording. That way the only difference is how well it plays.
7. As a Human, I want a Neural Computer to make only legal Moves under either Ending, so that the game stays within the rules.
8. As a Human, I want a Neural Computer to handle being stuck under either Ending, so that both Endings work against it.
9. As a Human, I want a Neural Computer to play with the best network in its Model, so that I face its strongest form.
10. As a Human, I want a Neural Computer to always play the Move its network rates highest, so that it plays exactly as it was trained.
11. As a Human, I want exact ties in its ratings broken at random, as Greedy does, so that it behaves consistently with the other Strategies.
12. As a Human, I want a Model built with an older, incompatible format left out of the selector (with a warning in the browser console), so that a stale file can't break the page.
13. As a Human, I want Models available on the deployed page, not just in development, so that I can play trained opponents anywhere.
14. As a developer, I want a Model dropped into the models folder to show up in the running dev server, so that I can play a fresh Model without restarting.

### Training

15. As a developer, I want a `train` command that runs entirely in memory from the command line, so that I can train without a browser.
16. As a developer, I want to set the number of Generations with `--generations`, so that I control how long Training runs.
17. As a developer, I want to set the Population size (default 24), so that I can trade speed for diversity.
18. As a developer, I want to set the hidden layer size (default 32), the share of survivors (default 25%) and the mutation strength, so that I can experiment with the evolution, with sensible defaults when I don't.
19. As a developer, I want to name the output file with `--out`, so that I can keep separate Models for separate stages.
20. As a developer, I want `--from <model>` to continue Training from an existing Model's whole Population, so that a lineage resumes exactly where the last run stopped.
21. As a developer, I want Training to start from a fresh random Population when `--from` is omitted, so that I can begin a new lineage.
22. As a developer, I want `--seed` to make Training reproducible, so that the same command and seed always produce the same Model.
23. As a developer, I want a random seed chosen, printed and saved when I don't pass one, so that I can still reproduce any run.
24. As a developer, I want each Generation to pit every network against every other under both colours and both Endings, so that Fitness reflects all-round play.
25. As a developer, I want each network to also play Greedy under both colours and both Endings every Generation, so that the Population can't drift into strategies that only beat each other.
26. As a developer, I want Fitness to be the average Score margin across a network's games, so that even a Population that always loses can be ranked by how badly.
27. As a developer, I want the fittest share kept unchanged and the rest replaced by mutated copies of them, so that progress is never lost between Generations.
28. As a developer, I want Training to use all CPU cores, so that a run of many Generations takes minutes, not tens of minutes.
29. As a developer, I want progress printed each Generation (the best and average Fitness), so that I can see whether Training is improving.
30. As a developer, I want the number of games played printed at the end, so that I know how much play went into the Model.
31. As a developer, I want Training to end by playing the best network against Greedy and Random and printing win/draw/loss and average margin, so that I immediately see how strong the Model is.
32. As a developer, I want that final report saved in the Model, so that I can look it up later.
33. As a developer, I want the Model file to record its format version, network shape, seed, total Generations across the lineage and the Model it was trained from, so that each file explains where it came from.

### Comparing Models

34. As a developer, I want a `match` command that takes any number of participants (Model files, `greedy`, `random`), so that I can compare stages of a lineage with each other and with the baselines.
35. As a developer, I want every pair of participants to play under both colours and both Endings, so that neither first Move nor Ending biases the result.
36. As a developer, I want `--games N` to set how many times each pairing is repeated, so that I can trade precision for time.
37. As a developer, I want a Neural vs Neural pairing to play only its 4 distinct games, since repeating them is pointless.
38. As a developer, I want a results table of win/draw/loss and average margin for each pairing, so that I can see at a glance which participant is stronger.
39. As a developer, I want `match` to use all CPU cores, so that large comparisons finish quickly.
40. As a developer, I want `match` to accept a `--seed`, so that results involving Random or Greedy are reproducible.
41. As a developer, I want a clear error when a participant is neither a readable, compatible Model nor `greedy` or `random`, so that typos don't silently skew results.

## Implementation Decisions

- **Game module**: unchanged. Neural and Training use its public functions, as Greedy does.
- **The network (new module)**: a small fully connected network with one hidden layer, written by hand with no ML library. It rates a position from the point of view of the Player who has just moved. Its inputs, given that position:
  - the colour at a fixed grid of about 60 sample spots spread over the Board, each +1 for that Player's colour, −1 for the other Player's, or 0 if uncoloured;
  - for each of the 20 Points, whether it is used;
  - both Scores, that Player's first;
  - the Ending.
  
  The output is a single rating. The input layout is fixed by the Model format version: changing it means a new version.
- **Neural Strategy** (Computer module): for each legal Move, it applies the Move with the Game module and rates the resulting position with the Model's best network, from the Mover's point of view. It picks the highest rating, and breaks exact ties with the random source. It is only called when the Mover has a legal Move, as for the other Strategies.
  - `Strategy` grows from a plain name to also allow a Neural Strategy that carries its Model. `chooseMove(game, strategy, random)` stays the single entry point.
- **Model**: a JSON document holding:
  - the format version and network shape;
  - the whole Population, best first, each network's weights as plain number arrays;
  - the seed, the total Generations across the lineage and the parent Model's name (when trained `--from` one);
  - the final report against Greedy and Random.
  
  The Model module validates and loads a document. It rejects any version other than the current one, and any shape mismatch.
- **Training module**: two functions, both deterministic for a given seed.
  - `train(options) → Model`. Options: Generations, Population size, hidden size, survivor share, mutation strength, seed, and an optional starting Model.
    - Each Generation: round-robin over every pair under both colours and both Endings, plus 4 games per network against Greedy. Fitness is the average Score margin (own Score minus Opponent's at Game over). The fittest share (rounded, at least 1) survives unchanged; the rest of the Population is refilled with copies of survivors given Gaussian noise on every weight. There is no crossover.
    - A fresh Population starts from random weights.
    - When continuing a Model, Training starts from its Population as stored, and the new Model's total Generations is the old total plus this run's.
    - Ends by playing the best network against Greedy and Random (e.g. 200 games each, alternating colours and Endings) and storing the report.
    - Reports progress through a callback, so the CLI can print it and tests can ignore it.
  - `match(participants, options) → results`. Participants are Models, Greedy or Random. Every pair plays both colours × both Endings × N repetitions; Neural vs Neural plays its 4 games once. Results per pairing: wins, draws, losses and average margin.
  - All randomness (mutation, Greedy and Random tie-breaks, initial weights) comes from one seeded generator, so a seed fully determines the outcome.
  - Games are spread across worker threads, one per core. This parallelism is hidden inside the module: results must be identical to a single-threaded run with the same seed, so each game's randomness must not depend on which worker plays it.
- **CLIs**: `train` and `match` as npm scripts, run with Node from the dev shell, with TypeScript run directly (no build step). They are thin wrappers that parse flags, read and write Model files, print progress and tables, and call the Training module.
- **Page**:
  - Every `models/*.json` is bundled when the page is built and picked up live by the dev server.
  - Compatible Models are added to the Strategy selector after Greedy, sorted by filename, labelled "Neural: <filename without extension> (<total Generations> gens)". Incompatible ones are left out with a console warning.
  - Greedy stays selected by default, and the selector's enabling, locking and new-game behaviour is unchanged.
- **Models folder**: lives at the repo root and is committed to git. It contains a tiny fixture Model used by the browser tests.

## Testing Decisions

- Good tests use only public interfaces and check behaviour a Human or developer would notice: which Moves are legal and chosen, what a Model file says, and what the selector offers. They don't check the internals of the network maths, the worker plumbing or the sampling grid.
- **Computer module** (unit, alongside the existing Random and Greedy tests):
  - Neural always returns a legal Move, from fresh and mid-game positions under both Endings, including when a Move triggers an Award.
  - With a hand-built Model whose ratings are predictable (e.g. a network that rates by the Mover's Score), Neural picks the expected Move.
  - Exact ties are broken by the random source.
  - Neural uses the best network, the first in the Population.
- **Model module** (unit): loading accepts a valid document and rejects a wrong version and a shape mismatch.
- **Training module** (unit, with tiny settings, e.g. population 4 and 2 Generations):
  - The same seed gives an identical Model.
  - A different seed gives a different one.
  - The Population size is preserved and stored best first by Fitness.
  - Survivors appear unchanged in the next Generation.
  - Continuing a Model adds up the total Generations and records the parent.
  - The final report is present and its win/draw/loss counts add up to the games played.
  - `match` gives each pairing 4 × N games (only 4 for Neural vs Neural), its counts add up, and a pairing's results mirror between its two participants.
  - Results are identical whether or not games run in parallel.
- **Page** (browser, alongside the existing Human vs Computer tests, using the committed fixture Model):
  - The selector lists Random, Greedy, then the fixture Model's option with its label.
  - Greedy is selected by default.
  - Choosing the fixture Model and playing a game to Game over gives only legal Computer Moves and the usual result wording.
  - An incompatible Model is left out.
- **Prior art**: the unit tests for the Random and Greedy Strategies (scripted positions, a stubbed random source), and the puppeteer tests for Human vs Computer (stubbed `Math.random`, reading the selectors and turn text).

## Out of Scope

- Gradient-based training, a value network trained by backprop, or any ML library (see ADR 0001).
- Crossover, speciation, or keeping a league of past Models in Training.
- Training, uploading or picking Model files from inside the browser.
- Neural vs Neural or Computer vs Computer games shown on the page.
- Randomised or "temperature" play by the Neural Strategy.
- Snapshots of several Models from one Training run (a convenience that could come later).
- Separate Models per Ending.
- Changing Random, Greedy, or the Game module's rules.

## Further Notes

- A Greedy vs Greedy game currently takes about 6 ms. Neural games will be slower because every candidate Move is also sampled and rated. A Generation of population 24 is about 1,200 games, so expect seconds per Generation across all cores. If it is much slower, the colour-sampling step is the first place to optimise.
- Model files grow with Population × network size. At the defaults that is roughly 24 networks of about 3,000 weights each, a few hundred KB of JSON. That's fine to commit, but it's worth rounding weights when saving.
- Glossary terms: Neural, Model, Training, Population, Generation, Fitness (see `CONTEXT.md`). "Generation" means one round of Training, never a saved file, even if a file is named `gen-4.json`.
