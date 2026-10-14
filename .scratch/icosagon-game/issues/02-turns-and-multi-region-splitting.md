# 02: Turns and Splitting several Regions

Status: ready-for-agent

**What to build:** Make full play work under Full split. Players alternate turns, starting with Red. A Line that crosses earlier Lines Splits every Region it passes through: the left side of each becomes the Mover's colour and the right side the Opponent's. Regions the Line doesn't pass through keep their colour. This must hold when Lines pass through an existing crossing point (for example, several diameters meeting at the centre). The game module rejects illegal Moves: a used Point, the same Point twice, or neighbouring Points. The page shows whose turn it is, and the Scores update after every Move.

See `.scratch/icosagon-game/spec.md` and `CONTEXT.md`.

**Blocked by:** 01 (Tracer bullet: draw one Line).

- [ ] Turns alternate Red, Blue, Red, …, and the turn indicator shows whose turn it is as page text
- [ ] A Line crossing earlier Lines Splits every Region it passes through, coloured according to Full split
- [ ] Regions the Line doesn't pass through keep their colour
- [ ] Unit tests: two crossing Lines give four Regions with the expected colours
- [ ] Unit tests: several diameters through the centre give correct Regions and Scores
- [ ] Unit tests: Moves using a used Point, the same Point twice, or neighbouring Points are rejected
- [ ] Unit test: after the first Move, total coloured area always equals the Board's area
