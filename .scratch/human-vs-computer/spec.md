# Spec: Human vs Computer

Status: ready-for-agent

## Problem Statement

Icosagon can only be played by two Humans sharing one screen. Someone on their own can't play at all. Nobody can practise against an opponent, or try their play against a simple automatic baseline to see whether they beat it.

## Solution

The page gains a **Play against** selector (`Human` / `Computer`) and a **Strategy** selector (`Random` / `Greedy`). Human vs Human stays the default, and that game is unchanged.

Against the Computer, a coin flip decides at the start of each game whether the Human is Red or Blue. A persistent label shows "You are Red" or "You are Blue". The Computer moves instantly: as soon as the game starts if it is Red, and straight after each Human Move otherwise. The Human therefore only ever sees their own turn, shown as "Your move (Red)". Beneath it, "Computer played 3→12" names the Computer's last Move until the Human moves again.

- **Random** picks uniformly among all legal Moves. `3→12` and `12→3` are different Moves.
- **Greedy** picks the Move that gives it the highest Score once made, using the real rules, so a Move that ends the game with an Award is scored with the Award. Ties are broken at random.

Against the Computer, the result reads "You win", "Computer wins" or "Draw", followed by the usual Red and Blue Scores.

## User Stories

1. As a Human on my own, I want to play against the Computer, so that I can play without a second person.
2. As a pair of Humans, I want Human vs Human to stay available and be the default, so that our shared-screen game is unchanged.
3. As a Human, I want a Play against selector with Human and Computer options, so that I can choose my opponent.
4. As a Human, I want a Strategy selector with Random and Greedy options, so that I can choose how the Computer plays.
5. As a Human, I want Greedy to be the default Strategy, so that I get the more interesting opponent unless I choose otherwise.
6. As a Human, I want the Strategy selector disabled when playing against a Human, so that the page doesn't offer a choice that has no effect.
7. As a Human, I want changing Play against, Strategy or Ending to start a new game, so that a setting always applies to a whole game.
8. As a Human, I want a fair coin to decide whether I am Red or Blue in each game against the Computer, so that neither of us always gets the first Move.
9. As a Human, I want the colours flipped again on every new game, whether from New game, a selector change or page load, so that each game is a fresh draw.
10. As a Human, I want a persistent "You are Red" or "You are Blue" label, so that I always know which colour is mine.
11. As a Human, I want the turn text to read "Your move (Red)" or "Your move (Blue)", so that it is clear it's my turn and which colour I'm playing.
12. As a Human playing Blue, I want the Computer, as Red, to make its first Move as soon as the game starts, so that I'm not left waiting.
13. As a Human, I want the Computer to reply instantly after each of my Moves, so that the game flows without delay.
14. As a Human, I want "Computer played X→Y" shown after the Computer moves, so that I can see which Line is new.
15. As a Human, I want that message to stay until I make my next Move, so that I have time to read it.
16. As a Human, I want the Computer never to make an illegal Move, so that the game stays within the rules.
17. As a Human, I want Random to pick any legal Move with equal chance, in either direction, so that it is a true random baseline.
18. As a Human, I want Greedy to pick the Move that leaves it with the highest Score, so that it is a meaningful one-Move-ahead opponent.
19. As a Human, I want Greedy to count an Award that its Move triggers, so that it doesn't walk into giving me a Region without accounting for it.
20. As a Human, I want Greedy to break ties at random, so that it doesn't play the same game every time.
21. As a Human, I want the selectors to stay unlocked until I have made a Move, so that I can still change settings when the Computer has moved first as Red.
22. As a Human, I want the selectors to lock once I have made a Move, so that settings can't change mid-game.
23. As a pair of Humans, I want the selectors to lock after the first Move, as the Ending selector does now, so that our game is unchanged.
24. As a Human, I want New game to unlock the selectors and keep my choices, so that I can replay with the same or different settings.
25. As a Human, I want the result to read "You win", "Computer wins" or "Draw", followed by the Red and Blue Scores, so that I can see at a glance how I did.
26. As a Human, I want the stuck game-over message to keep naming the colour (e.g. "Blue has no legal Move"), so that it reads the same as in Human vs Human.
27. As a Human, I want the game to end correctly when either I or the Computer has no legal Move, under either Ending, so that both Endings work against the Computer.
28. As a Human, I want to be unable to draw Lines once the game is over, so that the result stands.
29. As a pair of Humans, I want our turn text and result wording unchanged ("Red to move", "Red wins"), so that Human vs Human looks as it does now.

## Implementation Decisions

- **Game module**: unchanged. The Computer works through its existing public functions: creating a game, applying a Move, Move legality and the set of used Points.
- **New Computer module**: a pure function that chooses a Move for a game in progress, given the Strategy and a random-number source (a `() => number` returning values in [0, 1), like `Math.random`). It is only called when the Mover has at least one legal Move.
  - Strategy is a type with two values, Random and Greedy.
  - Random lists every legal directed Move (every ordered pair of unused, non-adjacent Points) and picks one uniformly using the random source.
  - Greedy applies each legal Move with the game module and keeps those that give the Mover the highest Score in the resulting Game. Using the resulting Game means an Award triggered by the Move is counted. It then picks uniformly among the tied best Moves using the random source. Scores are compared with a small tolerance, as the game module does for Draws, so floating-point noise doesn't break ties.
- **Page**
  - Two new selectors sit beside Ending:
    - Play against: `Human` (default) / `Computer`.
    - Strategy: `Random` / `Greedy` (default). Strategy is disabled when Play against is Human.
  - The page keeps track of which Player, if any, the Computer controls. On every new game (page load, New game, or a change to any selector) with Play against set to Computer, it flips a coin with `Math.random` to give the Computer Red or Blue.
  - Whenever the game is in progress and the Mover is the Computer's Player, the page immediately applies the Computer's chosen Move (using `Math.random` as the random source) before rendering. This happens after creating a game where the Computer is Red, and after each Human Move. There is no delay. Drags are therefore only ever possible on the Human's turn.
  - **Locking**: all three selectors are disabled once a Human has made a Move. In Human vs Human, that is the first Move, as now. Against the Computer, it is the Human's first Move, so the selectors stay usable after the Computer's opening Move as Red. New game re-enables them and keeps their values.
  - **Text against the Computer**:
    - A persistent label reads "You are Red" or "You are Blue". It is hidden in Human vs Human.
    - The turn text reads "Your move (Red)" or "Your move (Blue)".
    - "Computer played X→Y" names the Computer's most recent Move. It is hidden after the Human moves and when the Computer hasn't moved yet.
    - The result line reads "You win: …", "Computer wins: …" or "Draw: …", followed by the existing Red and Blue Score text.
    - The stuck game-over text is unchanged and names the colour.
  - Human vs Human text is unchanged.
- **Glossary**: `CONTEXT.md` already defines Human, Computer, Strategy, Random and Greedy, and says to avoid "AI", "bot" and "CPU".

## Testing Decisions

- Tests check external behaviour only. For the Computer module, that is the Move it returns for a given game, Strategy and random source. For the page, it is what the page shows and allows. Tests don't check how candidate Moves are listed or compared.
- **Computer module unit tests** (prior art: the game module's unit tests, which build positions by applying scripted Moves):
  - Random returns a legal Move from a fresh game and from a scripted mid-game position.
  - Random's choice depends on the random source. Different fixed values can produce both `a→b` and `b→a` for the same pair, and a random source near 0 or near 1 maps to the first and last candidates without going out of range.
  - Greedy returns a Move whose resulting Score for the Mover is at least that of every other legal Move. Check this against a brute-force comparison in the test, or with a hand-built position where the best Move is known.
  - Greedy counts an Award. In a scripted position where the Move with the best immediate Split would trigger an Award to the Opponent, Greedy avoids it (or the reverse, picking a Move whose Award benefits it). Pick a script where this changes the choice.
  - Greedy breaks ties using the random source. From a fresh game, many Moves tie by symmetry, so different fixed random values give different Moves, all with the best Score.
  - Neither Strategy ever returns a Move to a used Point or between adjacent Points.
- **Page tests** (prior art: the Puppeteer groups "the Ending on the page" and "the end of a game on the page", and the shared page helpers):
  - Stub `Math.random` with Puppeteer's `evaluateOnNewDocument` before the page loads, using a scripted sequence, so the coin flip and the Computer's choices are predictable.
  - Defaults: Play against shows Human, Strategy shows Greedy and is disabled, and there is no "You are" label.
  - Switching to Computer with the coin giving the Human Red shows "You are Red" and "Your move (Red)", and the Board is empty.
  - With the coin giving the Human Blue, the Computer has already moved: there is one Line, "Computer played X→Y" is shown, the turn text reads "Your move (Blue)", and the selectors are still enabled.
  - After a Human drag, the Computer's reply appears at once. The Move count rises by two, the "Computer played" text updates, and the selectors are locked.
  - New game unlocks the selectors, keeps their values and flips the colours again.
  - Playing to the end against the Computer shows "You win", "Computer wins" or "Draw" with Red and Blue Scores.
  - Existing Human vs Human page tests continue to pass unchanged.

## Out of Scope

- Computer vs Computer.
- A delay or "thinking" animation before the Computer moves.
- Highlighting the Computer's last Line on the Board.
- Strategies other than Random and Greedy (e.g. look-ahead or minimax).
- Choosing your colour against the Computer. It is always a coin flip.
- Remembering selector values across page reloads.

## Further Notes

- The coin flip happens on every new game, so a Human who wants to play Red again can press New game until the coin lands that way. That is acceptable.
- Greedy evaluates every legal Move with the full game rules. That is at most 20×19 = 380 Moves per turn. This is cheap enough to run instantly, so no optimisation is planned.
