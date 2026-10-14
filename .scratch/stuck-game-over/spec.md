# Spec: Game over when stuck

Status: done

## Problem Statement

A Line needs two unused, non-adjacent Points. If the only two unused Points left after 9 Moves are adjacent, Blue cannot make the 10th Move. The game then freezes: it still shows "Blue to move", but no drag can complete, and players can only escape by pressing New game. No result is announced and no winner is decided.

Separately, playtesting showed that the Claim colouring makes the better game, so the Full split option and the Rule set selector are now just clutter.

## Solution

When the Mover has no legal Move, the game is over. In practice this only happens after the 9th Move, when the last two unused Points are adjacent: any 4 or more unused Points always include a non-adjacent pair. What happens to the stuck Player, always Blue, depends on the **Ending**, chosen before the first Move:

- **Award** (default): Blue takes the whole Region beside the Board side between the two unused Points, whatever its prior colour. Blue would have claimed it with the last Move if a Line had been possible.
- **Skip**: Blue simply misses the Move, and the Regions are scored as they stand.

The page announces the game over with the reason, e.g. "Game over — Blue has no legal Move and takes the Region by Points 5 and 6" (Award) or "Game over — Blue has no legal Move" (Skip), followed by the usual result and Scores.

Full split is removed. Every Split now follows the Claim rule: the left side becomes the Mover's colour, and the right side keeps its prior colour, or becomes the Opponent's colour if it had none. The Rule set selector goes, and an Ending selector takes its place.

## User Stories

1. As a Player, I want the game to end when the Mover cannot draw any legal Line, so that we are never left with a frozen Board.
2. As Blue, I want the game to end after the 9th Move when the last two unused Points are adjacent, so that I'm not asked to make an impossible Move.
3. As a Player, I want a game where the last two unused Points are not adjacent to still last 10 Moves, so that normal games are unchanged.
4. As a Player, I want the result and Scores announced after a stuck game over, just as after a 10-Move game, so that we know who won.
5. As a Player, I want the game-over message to say that Blue had no legal Move, so that a game ending after 9 Moves doesn't look like a bug.
6. As a Player, I want the message under Award to name the two Points beside the awarded Region, so that I can see which Region changed hands and why.
7. As Blue, under Award, I want the whole Region beside the Board side between the two unused Points to become blue, so that I'm compensated for the Move I couldn't make.
8. As Blue, under Award, I want that Region to become blue whatever colour it was before, so that the award is the same as the Line I would have drawn to claim it.
9. As a Player, under Award, I want the Scores to include the awarded Region, so that the result reflects the award.
10. As a Player, under Skip, I want the Regions scored exactly as they stand after the 9th Move, so that we can compare a game with no compensation.
11. As a Player, I want to choose the Ending (Award or Skip) before the first Move, so that we can try both and see which makes the better game.
12. As a Player, I want Award to be the default Ending, so that the proposed rule is what we play unless we choose otherwise.
13. As a Player, I want the Ending selector to lock once the first Line is drawn, so that nobody can change the Ending mid-game after planning Moves around it.
14. As a Player, I want changing the Ending before the first Move to start a fresh game, so that the setting always applies to the whole game.
15. As a Player, I want the Ending selector to unlock when New game is pressed, keeping the last chosen Ending, so that we can replay with the same or a different Ending.
16. As a Player, I want the current Ending visible during play, so that we both know which rule applies if the game gets stuck.
17. As a Player, I want the award not to count as a Move, so that the Move count still means the number of Lines drawn.
18. As a Player, I want the Board locked after a stuck game over, so that no further Lines can be drawn.
19. As a Player, I want every Split to follow the Claim rule, so that the game uses the rule that playtesting showed to be best.
20. As a Player, I want the Rule set selector gone, so that the page doesn't offer a choice that no longer exists.
21. As a Player, I want the live drag preview to keep showing Claim colours, so that the preview matches what the Move will do.

## Implementation Decisions

- **Game module**
  - The Rule set concept and Full split are removed. Splitting always applies the Claim colouring: left side to the Mover, right side keeps its prior colour or goes to the Opponent if uncoloured.
  - A new Ending type with two values, Award and Skip. The game is created with an Ending in place of a Rule set, and the Game state records it.
  - After each Move, the game checks whether the next Mover has any legal Move (by checking pairs of unused Points), not specifically for an adjacent pair. If the 10th Move has just been made, the game ends as before.
  - When the next Mover has no legal Move but the game isn't over by Move count, the game ends. Under Award, the Region beside the Board side between the two remaining unused Points becomes the stuck Player's colour. That Region is unique: no Line can cross that side or end at its Points. It's the Region whose polygon has both Points' positions as consecutive vertices. Scores are then recomputed and the outcome decided from them. Under Skip, Regions and Scores are left as they are.
  - The award is not recorded as a Move. The Game state exposes enough for the page to describe the game over: whether it was stuck and, under Award, which pair of Points the award was beside. For example, an optional field naming the stuck Player and the pair. The exact shape is the implementer's choice.
  - Once the game is over, every Move is rejected, as now.
- **Page**
  - The Rule set selector is replaced by an Ending selector (options Award and Skip, Award first and default). It's disabled after the first Move, re-enabled by New game (which keeps the selected Ending), and changing it starts a new game. This is the same behaviour the Rule set selector had.
  - On a stuck game over, the turn text shows "Game over — Blue has no legal Move and takes the Region by Points X and Y" under Award, or "Game over — Blue has no legal Move" under Skip. Points are named by their 0–19 numbers in Board order (lower first, or the wrap-around pair as 19 and 0). The result line keeps its existing format. There's no extra highlighting: the Board re-renders with the awarded Region's new colour.
- **Glossary**: `CONTEXT.md` has already been updated with Game over, Ending, Award and Skip, the revised Move entry, and the Claim rule written into Split. Rule set, Full split and Claim are gone from it.

## Testing Decisions

- Tests check external behaviour only: the Game state returned by the game module's public functions, and what the page shows and allows. They don't check internal helpers or how the stuck check is computed.
- **Game module unit tests** (prior art: the "end of the game" and "Claim Rule set" groups in the existing unit tests):
  - A scripted 9-Move game leaving an adjacent pair unused, including a case using the wrap-around pair 19/0, ends with a decided outcome after the 9th Move.
  - Under Award, the Region beside that pair is blue, and the Scores and outcome reflect it. Pick a script where the award changes the Region's colour, ideally one where it changes the winner.
  - Under Skip, the same script leaves Regions and Scores as they were after the 9th Move.
  - The award adds no Move.
  - Every Move after a stuck game over is rejected.
  - A 9-Move position whose last two unused Points are non-adjacent stays in progress, and the game still ends after the 10th Move.
  - Splitting follows Claim colouring with no Rule set argument. Replace the Full-split-vs-Claim comparison test, and update existing expected Scores that assumed Full split.
- **Page tests** (prior art: the Puppeteer tests for the Rule set selector and the end of a game):
  - The Ending selector shows Award by default, can be changed before the first Move, locks after it, and unlocks on New game.
  - Playing the scripted stuck game by mouse drags shows the Award game-over message, result and Scores. Under Skip, it shows the Skip message and the unawarded Scores.
  - Existing page tests that relied on Full split or the Rule set selector are updated to Claim and the Ending selector.

## Out of Scope

- Any other Ending variants (e.g. calling a stuck game a Draw, or a Score bonus).
- Highlighting or animating the awarded Region.
- Keeping Full split available in any form.
- Changes to drag input, snapping, layout or touch handling.

## Further Notes

- The stuck Player is always Blue, because the game can only get stuck after an odd number (9) of Moves. The code should still use "the Mover" rather than hard-coding Blue.
- The original game spec (`.scratch/icosagon-game/spec.md`) still mentions Full split, the Rule set and "always 10 Moves". It's a done, historical spec and is left unchanged.
