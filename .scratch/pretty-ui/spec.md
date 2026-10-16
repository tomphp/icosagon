# Spec: Pretty, canvas-drawn UI

Status: ready-for-agent

## Problem Statement

The game works but looks plain. The settings, Scores and messages are a row of DOM controls crammed above a square canvas. It isn't obvious whose turn it is. Percentages are bare text, and a finished game is announced in a small line of text. While a Player drags a Line, nothing shows what the Move will do until the drag snaps to a legal end Point. Early in a drag the Player gets no feedback about which side they will capture.

## Solution

The whole UI is drawn on one full-window canvas, organised as three screens:

- **Start Screen**: choose the Opponent, the Strategy and the Ending, read How to play, press Start.
- **Playing**: the Board with the two Players named at the top. The Mover is boxed in their colour, and a screen-wide red/blue score bar with a 50% marker runs along the bottom.
- **Game Over**: the final Board under a translucent grey overlay, announcing who won, with a button back to the Start Screen.

While a Player drags a Line, the Board predicts the Move early. Before the drag snaps, it guesses the end Point from the drag's direction and tints the Regions that would change in a pale version of their new colour. Once the drag snaps it shows the exact result in full colour, as it does today.

Game rules, Strategies, Scores and the Computer's behaviour do not change at all. Behind the canvas, a visually hidden DOM mirror of buttons and status text keeps the game usable with a keyboard and a screen reader.

## User Stories

1. As a Player, I want the game to open on a Start Screen, so that I choose how to play before the first Move.
2. As a Player, I want the Start Screen to default to Human vs Computer, Greedy and Award, so that I can press Start straight away for the usual game.
3. As a Player, I want to pick the Opponent (Human or Computer) with pill buttons, so that the choice is quick and the current option is obvious.
4. As a Player, I want to pick the Strategy from pill buttons including each Neural Model, so that I can choose how strong the Computer is.
5. As a Player in Human vs Human, I want the Strategy row hidden, so that I'm not offered a setting that does nothing.
6. As a Player, I want to pick the Ending (Award or Skip) with pill buttons, so that I can decide what happens when the game ends after 9 Moves.
7. As a new Player, I want a How to play section on the Start Screen, so that I can learn the rules without leaving the game.
8. As a new Player, I want How to play to explain Award and Skip, so that the Ending setting makes sense.
9. As a Player, I want a Start button, so that the game begins only when I'm ready.
10. As a Player returning from a game, I want the Start Screen to remember my last settings, so that I don't re-pick them every time.
11. As a Human against the Computer, I want my name ("Human") at the top left in my colour, so that I always know where I am.
12. As a Human against the Computer, I want "Computer" at the top right in its colour, so that I know who I'm facing.
13. As two Humans, I want Red at the top left and Blue at the top right, both labelled "Human", so that each of us has a fixed side.
14. As a Player, I want the Mover's name boxed in their colour, so that it is unmistakable whose turn it is.
15. As a Human against the Computer, I want to see the Computer's last Move (e.g. "played 5→15") under its name, so that I can follow what it did.
16. As a Player, I want the Scores shown as a screen-wide bar split between the two colours, so that I can see the balance at a glance.
17. As a Player, I want a marker at 50% on the score bar, so that I can see immediately who is ahead.
18. As a Player, I want each side of the bar to match the Player on that side of the header, so that label, box and bar line up even when the coin flip makes the Human Blue.
19. As a Player, I want each end of the bar to show the exact percentage, so that close games can be read precisely.
20. As a Player, I want a Menu button during play, so that I can abandon a game and return to the Start Screen.
21. As a Player, I want the Board as large as the space between the header and the score bar allows, so that Points are easy to hit.
22. As a Player, when the game ends, I want the final Board to stay visible under a translucent grey overlay, so that I can still see how it finished.
23. As a Player, I want Game Over to announce "Red wins", "Blue wins" or "Draw", so that the result is clear.
24. As a Human against the Computer, I want a "You win!" or "Computer wins" subtitle, so that I don't have to remember which colour I was.
25. As a Player, when the game ended after 9 Moves, I want Game Over to say which Player had no legal Move, and under Award which Region they took, so that the early end doesn't look like a bug.
26. As a Player, I want a Back to Start Screen button on Game Over, so that I can set up the next game.
27. As a Player dragging a Line, I want a pale tint of the Regions my Line would capture, aimed by my drag's direction, before I reach an end Point, so that I can see early which side will be coloured.
28. As a Player dragging a Line, I want the predicted end Point ringed and the dashed line extended faintly towards it, so that I know which Move the prediction assumes.
29. As a Player dragging a Line, I want the preview to switch to full colours once the drag snaps to a legal end Point, so that I can tell a guess from the real result.
30. As a Player starting a drag, I want no prediction while the pointer is still within 20px of the start Point, so that the Board doesn't flicker on tiny movements.
31. As a Player, I want releasing a drag that hasn't snapped to still make no Move, so that a prediction never plays a Move I didn't choose.
32. As a Player on a phone, I want the layout to fit the screen without horizontal scrolling, so that I can play on a small device.
33. As a Player resizing the window, I want the layout to reflow and stay sharp, so that the game looks right at any size.
34. As a keyboard user, I want every Start Screen, Menu and Game Over button reachable and pressable with the keyboard, so that I can set up and leave games without a mouse.
35. As a screen-reader user, I want the turn, the Scores, the Computer's last Move and the result announced, so that I can follow the game.
36. As a Player, I want the Board's Region colours unchanged, so that the game still feels like the same game.

## Implementation Decisions

- **No rule changes.** The game module, the Strategies, the Models and Training are untouched. Game Over text and the Computer's Move timing behave as today, only drawn differently.
- **Screen state machine.** A new pure module, with no DOM, holds the app state:
  - the Screen (`start`, `playing` or `over`);
  - the Settings (Opponent, Strategy, Ending);
  - the current Game and the Player the Computer controls (or none);
  - the drag in progress.

  Its transitions are: start a game with the given Settings (including the coin flip and the Computer's opening Move as Red), make a Move (followed by the Computer's reply), and return to the menu. The Screen becomes `over` when the Game's outcome is no longer in progress.
- **UI modules.** Everything to do with drawing and hit-testing lives together, separate from the screen state:
  - shared widgets: buttons, pill rows, player labels, the score bar and hit-testing;
  - the Board drawing (today's renderer, plus the prediction tint);
  - one module per Screen;
  - the hidden DOM mirror.

  The entry point only wires the canvas, the resizing, the input and the DOM mirror together.
- **Full-window canvas.** The canvas fills the window at the device pixel ratio. The Board layout takes a rectangle (the square left between the header and the score bar) instead of a canvas size. Input hit-testing uses the same layout.
- **Sides.** The left side is the Human against the Computer, or Red in Human vs Human. The right side is the other Player. The label colour, the Mover's box and the bar segments all follow this mapping.
- **Score bar.** The left segment's width is the left Player's Score and the right segment's is the right Player's. Any uncoloured area (only before the first Move) is a neutral gap between them. The 50% marker sits at the centre. Percentages use one decimal place, as today.
- **Prediction.** A pure function takes the Game, the start Point and the pointer position and returns a predicted end Point, or none:
  - It returns none while the pointer is less than 20px from the start Point, or when there is no legal end Point.
  - Otherwise it casts a ray from the start Point through the pointer to the Board's edge and picks the legal end Point closest by angle around the Board's centre to where the ray hits.

  The existing Move preview of that Move supplies the Regions. Only the Regions whose colour would change are drawn, in their new colour about 45% mixed toward white. A snapped drag keeps the full-colour preview.
- **DOM mirror.** Real, visually hidden `<button>`s exist for every canvas button and pill. They mirror the current Screen and selection and are pressed by keyboard or click. An `aria-live` region carries the same status text the canvas shows: turn, Scores, the Computer's last Move, the result and the stuck reason. The canvas is not itself focusable, and drawing Lines stays pointer-only.
- **Settings lifecycle.** Settings exist only on the Start Screen, and changing a setting mid-game is no longer possible. The Start Screen opens with the last-used Settings for the session, or the defaults on first load.
- **Look.** A light, warm off-white background, system-ui bold type, and rounded buttons with soft shadows. The Region fills keep their current red, blue and grey. The Game Over overlay is grey at about 60% opacity.

## Testing Decisions

- Good tests here check what a Player sees and does: they press buttons, drag between Points, and read the announced text. They don't reach into the screen state or the drawing calls.
- **Seam 1: the page (existing).** The browser tests keep driving real mouse and touch drags. They switch from the old selectors and status elements to the DOM mirror's buttons and `aria-live` text. Their screen-position helper uses the new Board rectangle. They cover:
  - the defaults;
  - the Start → Playing → Game Over → Start flow;
  - the Menu button;
  - the left/right side mapping and the Mover's highlight (through the status text);
  - the Computer's last Move;
  - the Game Over headline, subtitle and stuck reason under both Endings;
  - remembered Settings.

  The existing tests of settings locking mid-game are replaced by flow tests. The prior art is the existing game and Computer browser tests and their page helpers.
- **Seam 2: choosing the predicted end Point (new).** Unit tests cover the 20px threshold, aiming by angle, skipping used or adjacent Points, and having no legal end Point. The prior art is the existing unit tests of the game module.
- The screen state machine has no unit tests of its own. The page tests cover it from the outside.

## Out of Scope

- Any change to the rules, the Strategies, the Scores, the Models or the Computer's timing.
- A "Play again" button on Game Over.
- A dark theme.
- Drawing Lines by keyboard.
- Animations between Screens.
- Glossary or ADR changes: the Screens and the prediction are UI, not game language.

## Further Notes

- The `CONTEXT.md` vocabulary applies throughout: Player, Mover, Line, Point, Region, Strategy, Ending, Award, Skip, Score and Game over. The UI says "Computer", never "AI".
- How to play text:
  - Take turns drawing a Line between two unused, non-adjacent Points. Drag from one Point to another.
  - Every Region the Line crosses is cut in two. The side on your left as you draw becomes your colour.
  - Red moves first. The game lasts 10 Moves, or 9 if the last two unused Points are adjacent.
  - **Award**: the Player who can't move takes the Region beside those two Points. **Skip**: they just miss the Move.
  - The Player with the most coloured area wins.
- Risk: the browser tests will press visually hidden buttons. Hide them in a way puppeteer can still click, for example clipped to 1px rather than `display: none`.
