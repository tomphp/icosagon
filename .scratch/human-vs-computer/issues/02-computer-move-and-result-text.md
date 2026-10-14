# 02: Show what the Computer did and the result for the Human

Status: done

**What to build:** Against the Computer, show "Computer played X→Y" naming the Computer's most recent Move. It stays until the Human makes their next Move, and is hidden before the Computer has moved and in Human vs Human. When the game ends, the result reads "You win", "Computer wins" or "Draw", followed by the usual Red and Blue Scores. The stuck game-over message keeps naming the colour. Human vs Human wording is unchanged.

See `.scratch/human-vs-computer/spec.md` and `CONTEXT.md`.

**Blocked by:** 01 (Play against a Random Computer).

- [x] "Computer played X→Y" shown after the Computer moves, naming its Move as `start→end`
- [x] Hidden after the Human moves until the Computer's next Move, before the Computer has moved, and in Human vs Human
- [x] Result against the Computer reads "You win: …", "Computer wins: …" or "Draw: …" with the Red and Blue Score text
- [x] Stuck game-over text unchanged (names the colour)
- [x] Human vs Human result wording unchanged
- [x] Page tests with stubbed `Math.random` cover the "Computer played" text and a finished game's result against the Computer
