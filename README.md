# Icosagon

Icosagon is a simple turnbased, two-player game.

The game area is a regular icosagon (20 points layed out in a circle, connected
by straight edges).

There are two player (red and blue) and they take it in turns to connect any
two points that have not yet been connected to.

When connected two points, the line will intesect one or more polygons made up
from the previous lines. For each intersection, the polygon will be split in
two, the side to the left of the intersecting like will be the player's colour,
the side to the right will be the other players colour.

The game ends when all 20 points are connected, the winner is calcuated by
which colour occupies the most area.

## Implementation

The initial implementation is a static web-page with a canvas base
implementation. Connecting dots in a click and drag motion, the line is
visibile while dragging and the colours are updated, but the turn isn't
complete until the most has been released on a point. If it is release not on a
point, then the line is reset and they player may choose a new starting
point.

Add geometric and game logic should be in pure logic files, with separate files
for UI and input.

A browser driver and testing framework such as Puppetier should be used to play example games.

## Development

Enter the dev shell with `nix develop` (provides Node.js and Chromium), run `npm install`, then:

- `npm run dev`: start the dev server
- `npm test`: run the unit tests
- `npm run test:browser`: run the browser tests (Puppeteer, using the Chromium from Nix)
- `npm run typecheck` / `npm run build`
- `npm run train -- --generations N --out models/NAME.json`: train a Neural Model (also `--population`, `--hidden`, `--survivors`, `--mutation`, `--seed`), ending with a report against Greedy, Hoarder and Random. Each Generation every network plays Greedy and Hoarder as well as the rest of the Population. Add `--from models/OLD.json` to continue from that Model's Population, adding to its total Generations. Ctrl-C stops early, dropping the Generation in progress and still writing the Model with the Generations completed; a second Ctrl-C quits without writing
- `npm run match -- PARTICIPANT PARTICIPANT... [--games N] [--seed N]`: play Model files, `greedy`, `hoarder` and `random` against each other and print a results table

Both `train` and `match` play their games on every CPU core, with the same results as on one: a seed always gives the same output.
