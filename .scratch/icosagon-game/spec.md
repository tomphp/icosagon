# Spec: Icosagon game

Status: ready-for-agent

## Problem Statement

Two people want to play Icosagon, a turn-based game where Players draw Lines across a regular 20-sided Board and compete for coloured area. Right now the game exists only as a description in the README: there is nothing to play. The rules also have two plausible ways of colouring a Split Region, and the players want to try both to see which makes the better game.

## Solution

A static web page with one Board on a canvas, shared by two players on the same device (hot-seat). Players take turns dragging from one unused Point to another to draw a Line. While a drag is in progress, the Line follows the pointer. When it snaps to a legal end Point, the page previews the resulting colours. Releasing on that Point completes the Move. Releasing anywhere else cancels the drag, and the same Player tries again.

Before the first Move, players choose a Rule set: **Full split** or **Claim**. Once the first Line is drawn, the Rule set is fixed for the game. After 10 Moves, every Point has been used and the game ends. The Player with the larger Score (coloured area) wins; equal Scores are a Draw.

## User Stories

1. As a Player, I want to see the Board as a regular icosagon with 20 clearly marked Points, so that I know where I can draw.
2. As a Player, I want the Board to start as a single uncoloured Region, so that the first Move is the first claim on the Board.
3. As Red, I want to always make the first Move, so that there's no ambiguity about who starts.
4. As a Player, I want to see whose turn it is, so that we don't lose track in a hot-seat game.
5. As a Player, I want to start a Move by pressing on an unused Point and dragging, so that drawing a Line feels direct.
6. As a Player, I want pressing on a used Point or on empty space to do nothing, so that a stray click doesn't start a Move by accident.
7. As a Player, I want the Line to follow my pointer while I drag, so that I can see what I'm about to draw.
8. As a Player, I want the Line to snap to a legal end Point when my pointer gets close to it, so that I don't have to hit it pixel-perfectly.
9. As a Player, I want the Board to preview the resulting colours while my drag is snapped to a legal end Point, so that I can judge a Move before committing to it.
10. As a Player, I want no colour preview while my pointer is over empty space or an illegal Point, so that the preview only ever shows Moves I can actually make.
11. As a Player, I want my Move to complete only when I release on a legal end Point, so that I can change my mind mid-drag.
12. As a Player, I want releasing on empty space to cancel the drag and leave it still my turn, so that a mistake doesn't cost me my Move.
13. As a Player, I want releasing on my start Point, a neighbouring Point or a used Point to cancel the drag the same way, so that illegal Lines can never be drawn.
14. As a Player, I want each Point to be usable by only one Line, so that the game always lasts exactly 10 Moves.
15. As a Player, I want Lines between neighbouring Points to be impossible, so that every Line cuts through the Board.
16. As a Player, I want my Line to Split every Region it passes through, so that a single Line can affect several Regions at once.
17. As a Player, I want the left side of every Region my Line Splits (looking from my start Point to my end Point) to become my colour, so that the direction I drag in is a strategic choice.
18. As a Player using Full split, I want the right side of each Region I Split to become my Opponent's colour, so that every Split carries a cost as well as a gain.
19. As a Player using Claim, I want the right side of each Region I Split to keep its previous colour, so that a Move only ever gains me area.
20. As a Player using Claim, I want the right side of the very first Split to become my Opponent's colour, so that the Board is fully coloured from the first Move onwards.
21. As a Player, I want Regions my Line doesn't pass through to keep their colour, so that only the Line's path changes the Board.
22. As a Player, I want Lines that cross each other, or that pass through an existing crossing point (such as two diameters meeting at the centre), to Split Regions correctly, so that the Board is never visibly wrong.
23. As a pair of Players, I want to choose the Rule set before the first Move, so that we can try both variants.
24. As a pair of Players, I want the Rule set to lock once the first Line is drawn, so that nobody can change the rules mid-game.
25. As a Player, I want the current Rule set to stay visible during play, so that I remember which rules apply.
26. As a Player, I want to see both Scores as live percentages of the Board's area, so that I know who's ahead after each Move.
27. As a Player, I want the game to end automatically after the 10th Move, so that we don't have to work out when it's over.
28. As a Player, I want a banner announcing "Red wins", "Blue wins" or "Draw" with the final percentages, so that the result is unambiguous.
29. As a Player, I want equal Scores (within a negligible tolerance) to count as a Draw, so that floating-point noise can't decide the winner.
30. As a Player, I want the finished Board to stay visible but locked, so that we can look over the final position.
31. As a Player, I want a "New game" button that resets the Board and unlocks the Rule set selector, so that we can play again straight away.
32. As a Player on a touchscreen device, I want dragging with my finger to work the same way as with a mouse, so that we can play on a tablet or phone.
33. As a Player, I want the canvas to resize to fit the window, so that the Board is usable at any screen size.
34. As a developer, I want the game and geometry logic in pure modules with no knowledge of the browser, so that the rules can be tested quickly and in isolation.
35. As a developer, I want a game to be written as a list of Moves in `start→end` form, with Points numbered 0–19 clockwise from the top, so that test cases are short and readable.
36. As a developer, I want automated browser tests that play complete games through real pointer drags, so that I know the page and the logic work together.
37. As a developer, I want a reproducible dev environment through Nix, so that Node.js and Chromium don't need to be installed separately.

## Implementation Decisions

- **Tooling**: TypeScript, Vite to serve the page in development and to build a static output, Vitest for unit tests, and Puppeteer driving the Chromium from Nix for browser tests. A Nix flake provides a dev shell with Node.js.
- **Module split**: the README asks for pure logic to be kept separate from UI and input.
  - **Game module** (pure): the deep module that holds all the rules. Its public interface:
    - create a game for a given Rule set;
    - check whether a Move is legal;
    - apply a Move;
    - preview a Move, returning the Regions that would result without changing the game;
    - read the current state: Regions with their colours, both Scores, whose turn it is, the Rule set, the Moves played so far, and the outcome (in progress, or red wins / blue wins / Draw).

    It is immutable: applying a Move returns a new game state.
  - **Geometry module** (pure): an internal helper used only by the game module. It covers Point positions on the unit Board, convex polygon splitting by a directed line, which side of a line a point lies on, and polygon area. It is not part of the tested surface.
  - **Rendering module**: draws the Board, the Regions, the Points, the in-progress Line and any preview onto the canvas. It has no game rules of its own.
  - **Input module**: turns pointer events into "drag started at Point p", "drag snapped to / unsnapped from Point q" and "drag released (on Point q or nowhere)". It uses pointer events so mouse and touch behave the same way, and snaps within a hit radius around each Point.
  - **Page wiring**: connects input, game and rendering, and owns the HUD: turn indicator, Scores, Rule set selector, New game button and result banner.
- **Geometry approach**: Lines cut through a convex Board, so every Region stays a convex polygon. A Split clips one convex polygon by a directed line, using a small numeric tolerance. Pieces with negligible area are discarded, which handles Lines through existing crossings and vertices without special cases. A Region is Split only if the Line passes through its interior; touching a Region at a vertex or along an edge does not Split it.
- **Coordinates**: Point *i* sits at angle −90° + *i* × 18° (0 at the top, numbers increasing clockwise on screen). "Left" is measured in screen orientation, looking along the Line from its start Point to its end Point.
- **Scores**: a Score is the sum of that Player's Region areas, displayed as a percentage of the Board's area. A Draw is declared when the two Scores differ by less than a small relative tolerance.
- **Rule sets**:
  - **Full split**: the left side of each Split Region becomes the Mover's colour and the right side becomes the Opponent's.
  - **Claim**: the left side becomes the Mover's colour and the right side keeps its prior colour, or becomes the Opponent's colour if it was uncoloured (which happens only on the first Move).
- **Legal Move**: start and end are distinct Points, both unused, not adjacent (not differing by 1 mod 20), and the game is not over.
- **Testability hooks on the page**: the turn indicator, Scores, Rule set and result banner are rendered as page text with stable identifiers, so browser tests assert on text rather than pixels. Point screen positions can be derived from the canvas's bounding box and the Point numbering.

## Testing Decisions

- **Good tests check external behaviour only**: what a Player could observe (colours of Regions, Scores, turn, outcome, Move legality), never internal data structures or helper functions. Tests should survive any refactor that keeps the rules intact.
- **Seam 1: the game module's public interface (Vitest)**. This is the main test surface. Geometry is checked indirectly through Regions and Scores. Example cases:
  - a fresh game has one uncoloured Region, Red to move, and Scores of 0/0;
  - a single diameter splits the Board exactly 50/50, with the left side going to the Mover;
  - the same Line drawn in the opposite direction gives the opposite colouring;
  - illegal Moves are rejected: used Point, adjacent Points, same Point, and any Move after the game is over;
  - two crossing Lines produce four Regions with the expected colours under each Rule set;
  - multiple diameters through the centre produce correct Regions (the concurrency edge case);
  - a full scripted 10-Move game reaches a known outcome under Full split, and the same Moves give a different Score under Claim;
  - a preview returns the same Regions as actually applying the Move, and leaves the game unchanged;
  - total coloured area always equals the Board's area after the first Move.
- **Seam 2: the page in a real browser (Puppeteer)**. These tests check that rendering, input and wiring work together:
  - one full 10-Move game under Full split ends with the right banner;
  - the same Moves under Claim produce different Scores;
  - a game with invalid drags (released on empty space, on a neighbouring Point, on a used Point) shows that the turn does not pass and the Scores don't change;
  - the Rule set selector locks after the first Move and unlocks on New game.
- **Not tested separately**: the geometry, rendering and input modules. They are covered through the two seams above.
- **Prior art**: none. The repository has no code yet; these tests set the pattern.

## Out of Scope

- AI or computer opponents.
- Networked or online multiplayer.
- Undo, redo or move history navigation.
- Persisting games across page reloads.
- Rule sets beyond Full split and Claim, and Board sizes other than 20 Points.
- Sound, animation beyond the live drag preview, and theming.
- Deployment or hosting.

## Further Notes

- `CONTEXT.md` at the repo root is the glossary for this spec. Use its terms (Board, Point, Line, Region, Move, Mover, Opponent, Split, Rule set, Full split, Claim, Score, Draw) in code, tests and UI text.
- On a regular 20-gon, many diagonals meet at the same point (all diameters pass through the centre), so geometric robustness matters more than it might seem. That's the main reason for the convex-clipping-with-tolerance approach.
