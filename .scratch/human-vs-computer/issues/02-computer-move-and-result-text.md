# 02: Show what the Computer did and the result for the Human

Status: ready-for-agent

**What to build:** Against the Computer, show "Computer played X→Y" naming the Computer's most recent Move. It stays until the Human makes their next Move, and is hidden before the Computer has moved and in Human vs Human. When the game ends, the result reads "You win", "Computer wins" or "Draw", followed by the usual Red and Blue Scores. The stuck game-over message keeps naming the colour. Human vs Human wording is unchanged.

See `.scratch/human-vs-computer/spec.md` and `CONTEXT.md`.

**Blocked by:** 01 (Play against a Random Computer).

- [ ] "Computer played X→Y" shown after the Computer moves, naming its Move as `start→end`
- [ ] Hidden after the Human moves until the Computer's next Move, before the Computer has moved, and in Human vs Human
- [ ] Result against the Computer reads "You win: …", "Computer wins: …" or "Draw: …" with the Red and Blue Score text
- [ ] Stuck game-over text unchanged (names the colour)
- [ ] Human vs Human result wording unchanged
- [ ] Page tests with stubbed `Math.random` cover the "Computer played" text and a finished game's result against the Computer
