# 06: Claim Rule set and selector

Status: ready-for-agent

**What to build:** Add the Claim Rule set. Under Claim, the left side of each Split Region becomes the Mover's colour and the right side keeps its previous colour; an uncoloured right side (only possible on the first Move) becomes the Opponent's colour. Add a Rule set selector to the page. It can be changed before the first Move, locks once the first Line is drawn, shows the current Rule set during play, and unlocks when New game is pressed.

See `.scratch/icosagon-game/spec.md` and `CONTEXT.md`.

**Blocked by:** 02 (Turns and Splitting several Regions), 03 (End of game and New game).

- [ ] A game can be created with either Full split or Claim
- [ ] Under Claim, the right side of a Split keeps its previous colour; on the first Move it becomes the Opponent's colour
- [ ] The selector is enabled before the first Move, disabled after it, and enabled again after New game
- [ ] The current Rule set is visible as page text during play
- [ ] Unit test: the scripted 10-Move game from ticket 03 gives different Scores under Claim than under Full split
- [ ] Browser test: choosing Claim and playing the scripted game shows the Claim Scores, and the selector locks after the first Move
