# Icosagon

A turn-based, two-player game in which players draw lines across a regular 20-sided polygon and fight for coloured area.

## Language

### The board

**Board**:
The regular icosagon the game is played on.
_Avoid_: Game area, canvas

**Point**:
One of the 20 vertices of the Board, numbered 0–19 clockwise from the top. Each Point can be the endpoint of at most one Line.
_Avoid_: Dot, vertex, node

**Line**:
A straight segment drawn by a player between two unused, non-adjacent Points. It has a direction, from its start Point to its end Point.
_Avoid_: Chord, edge, connection

**Region**:
One of the areas the Board is divided into by the Lines drawn so far. A Region is red, blue, or (only before the first Move) uncoloured.
_Avoid_: Polygon, cell, area

### Play

**Player**:
Red or Blue. Red always makes the first Move.

**Move**:
A Player drawing one Line, written `start→end` (e.g. `3→12`). A game lasts 10 Moves, or 9 if the only two unused Points left are adjacent.
_Avoid_: Turn (a turn is a Player's opportunity to make a Move)

**Mover**:
The Player making the current Move. The other Player is the **Opponent**.

**Split**:
What a Line does to each Region it passes through: it cuts the Region in two. The **left side** is the half on the left when looking from the Line's start Point to its end Point. The left side becomes the Mover's colour; the right side keeps its prior colour (or becomes the Opponent's colour if it had none).

**Game over**:
The game ends after the 10th Move, or after the 9th if the only two unused Points left are adjacent. What happens in the second case depends on the Ending.

**Ending**:
What happens when the game ends after 9 Moves, chosen before the first Move and fixed for the game. Either **Award** or **Skip**.

**Award**:
The Ending where the Player who cannot move takes the whole Region beside the Board side between the two unused Points, whatever its prior colour.

**Skip**:
The Ending where the Player who cannot move simply misses the Move; the Regions are scored as they stand.

**Score**:
A Player's total coloured area. The Player with the larger Score wins; equal Scores are a **Draw**.
