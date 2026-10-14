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

**Settled**:
A Region is Settled when no legal Line passes through it, so its colour can no longer change. At Game over every Region is Settled.
_Avoid_: Safe, locked, untakeable

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

### Who plays

**Human**:
A person controlling a Player by drawing Lines on the Board.

**Computer**:
The program controlling a Player, choosing each Move by its Strategy. In a game against the Computer, a coin flip decides whether the Human is Red or Blue.
_Avoid_: AI, bot, CPU

**Strategy**:
How the Computer chooses its Move. Either **Random**, **Greedy**, **Hoarder**, **Clever Hoarder** or **Neural**.

**Random**:
The Strategy that picks uniformly among all legal Moves, counting `3→12` and `12→3` as different Moves.

**Greedy**:
The Strategy that picks the Move giving the Mover the highest Score once it is made, including any Award that ends the game. Ties are broken at random.

**Hoarder**:
The Strategy that picks the Move leaving the Mover the most Settled area, among the Moves that increase it. Ties go to the higher Score, then at random. When no Move increases the Mover's Settled area, it plays as Greedy.

**Clever Hoarder**:
The Strategy that picks the Move leaving the largest **Settled margin** (the Mover's Settled area minus the Opponent's), among the Moves that increase it. Ties go to the higher Score, then at random. When no Move increases the Settled margin, it plays as Greedy.

**Neural**:
The Strategy that picks the Move its Model rates best. Each Model is offered as its own Strategy (e.g. "Neural: gen-4").

**Model**:
A trained neural network, stored as a file, that the Neural Strategy plays with.
_Avoid_: AI, bot, brain, weights file

### Training

**Training**:
Producing a Model by evolving a Population over many Generations, with every game played by the Computer against itself.

**Population**:
The set of neural networks that evolve together. A Model holds a whole Population; the best one is the one that plays.

**Generation**:
One round of Training: every network in the Population plays every other, and Greedy, Hoarder and Clever Hoarder, to earn its Fitness; the fittest survive unchanged and mutated copies of them replace the rest.
_Avoid_: Using it for a saved Model file

**Fitness**:
How well a network did in a Generation: its average Score margin (its Score minus its Opponent's) at Game over across all its games.
