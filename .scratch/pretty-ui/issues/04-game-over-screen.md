# 04: Game Over screen

**What to build:** When the game ends, the final Board, header and score bar stay drawn under a translucent grey overlay. Over it are a headline ("Red wins", "Blue wins" or "Draw"), a "You win!" or "Computer wins" subtitle against the Computer, and the stuck reason when the game ended after 9 Moves. The reason is worded as today: "Blue has no legal Move and takes the Region by Points 7 and 8" under Award, or "Blue has no legal Move" under Skip. A single Back to Start Screen button returns to the Start Screen. The status mirror announces the result, and `#result` is removed. See `.scratch/pretty-ui/spec.md`.

**Blocked by:** 03

**Status:** done

- [x] The grey overlay is drawn over the final Board; no further drags are accepted
- [x] The headline, subtitle and stuck reason are correct for 10-Move games, Award and Skip
- [x] Back to Start Screen (canvas and DOM mirror) returns to the Start Screen with the last Settings
- [x] The status mirror announces the result; `#result` is gone and the browser tests read the mirror
