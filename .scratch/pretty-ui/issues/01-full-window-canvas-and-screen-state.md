# 01: Full-window canvas and screen state machine

**What to build:** The canvas fills all the space below the existing HUD, and the Board is laid out in a rectangle inside it instead of a square canvas. The app's state moves into a new pure screen state machine with no DOM: the Screen (start, playing or over), the Settings (Opponent, Strategy, Ending), the Game, the Computer's Player and the drag. Its transitions are start a game with given Settings (coin flip, and the Computer's opening Move as Red), make a Move (then the Computer's reply), and return to the menu. The existing DOM controls and messages are driven off this state and behave exactly as today. This is a prefactor: Players see only a larger canvas. See `.scratch/pretty-ui/spec.md`.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] The canvas fills the window area below the HUD, sharp at the device pixel ratio, reflowing on resize
- [x] The Board layout takes a rectangle; the Board is the largest centred square in the space reserved for it
- [x] Input hit-testing and the browser tests' screen-position helper use the same layout
- [x] All app state lives in the screen state machine; the entry point only wires DOM, canvas and input to it
- [x] Game rules, Strategies and Computer timing are unchanged
- [x] All existing unit and browser tests pass
