# 03: Playing header, score bar and Menu

**What to build:** During play, "Human" is written at the top left and "Computer" (or "Human" in Human vs Human) at the top right, each in their Player's colour. The left side is the Human against the Computer, or Red in Human vs Human. The Mover's name is boxed in their colour, so it is clear whose turn it is. While the Computer made the last Move, small "played 5→15" text appears under its name. A screen-wide score bar along the bottom shows the left Player's Score in their colour from the left and the right Player's from the right. Any uncoloured area is a neutral gap. The bar has a 50% marker and a one-decimal percentage at each end. A small Menu button in the top centre abandons the game and returns to the Start Screen. An `aria-live` status mirror carries the same text and replaces `#turn`, `#score-*`, `#you` and `#computer-played`. See `.scratch/pretty-ui/spec.md`.

**Blocked by:** 02

**Status:** done

- [x] Header labels, colours and the left/right mapping follow the spec, including when the coin flip makes the Human Blue
- [x] The Mover is boxed in their colour after every Move, including after the Computer's reply
- [x] The Computer's last Move is shown under its name until the Human moves again
- [x] The score bar segments, 50% marker and percentages match the Scores and line up with the header sides
- [x] The Menu button (canvas and DOM mirror) returns to the Start Screen
- [x] The status mirror announces the turn, Scores and the Computer's last Move; the old HUD elements are removed and the browser tests read the mirror
