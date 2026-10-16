# 02: Start Screen on the canvas

**What to build:** The game opens on a canvas-drawn Start Screen. Pill rows choose the Opponent (Human / Computer), the Strategy (Random, Greedy, Hoarder, Clever Hoarder, plus one "Neural: …" per Model; the row wraps and is hidden in Human vs Human) and the Ending (Award / Skip). The defaults are Computer, Greedy and Award. A How to play block (text in the spec's Further Notes) is always visible, and a Start button begins the game with the chosen Settings. On returning to the Start Screen, the last-used Settings are kept for the session. This ticket builds the shared widgets (buttons, pill rows, hit-testing), the light look (warm off-white background, system-ui bold, rounded buttons with soft shadows) and the visually hidden DOM mirror of real buttons. The mirror must stay clickable by puppeteer, so it is clipped rather than `display: none`. The `<select>`s and the New game button are removed. See `.scratch/pretty-ui/spec.md`.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The page opens on the Start Screen with Computer, Greedy and Award selected
- [ ] Every pill and the Start button work by pointer on the canvas and through the hidden DOM buttons (keyboard focus and Enter/Space)
- [ ] The Strategy row lists each Model and is hidden when the Opponent is Human
- [ ] How to play is shown with both Endings explained
- [ ] Start begins a game with the selected Settings (coin flip against the Computer, as today)
- [ ] Returning to the Start Screen keeps the last Settings
- [ ] The old `<select>`s and New game button are gone; the browser tests use the mirror's buttons, and the mid-game settings-lock tests are replaced by Start Screen flow tests
- [ ] Works at phone width with no horizontal scroll
