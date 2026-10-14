# 01: Tracer bullet: draw one Line

Status: done

**What to build:** Set up the project end to end and get the first Move working. Add a Nix dev shell (Node.js), Vite and TypeScript, Vitest, and a Puppeteer test setup that uses the Chromium from Nix. The page draws the Board: a regular icosagon with its 20 Points, numbered 0–19 clockwise from the top. Red can drag from one Point to a legal end Point; the drag snaps to Points within a hit radius. Releasing completes the Move under Full split: the left side (looking from the start Point to the end Point) becomes red and the right side becomes blue. The Scores are shown as percentages in page text.

Following the spec, start the pure game module's public interface (create a game, check legality, apply a Move, read state) with the geometry module behind it. Keep rendering and input separate from the logic.

See `.scratch/icosagon-game/spec.md` and `CONTEXT.md`.

**Blocked by:** None (can start immediately).

- [x] The Nix dev shell provides Node.js; there are commands to start the dev server, run unit tests, and run browser tests
- [x] The Board renders as a regular icosagon with 20 Points, with Point 0 at the top
- [x] Dragging from one Point to a non-adjacent Point and releasing draws the Line and Splits the Board into a red side and a blue side
- [x] Scores are shown as page text with stable identifiers
- [x] Unit test (game module): a diameter Splits the Board 50/50 with the left side going to the Mover; reversing its direction swaps the colours
- [x] Browser test: one real drag on the page results in Scores of 50% / 50%
