# 02: Start Screen on the canvas

**What to build:** The game opens on a canvas-drawn Start Screen. Pill rows choose the Opponent (Human / Computer), the Strategy (Random, Greedy, Hoarder, Clever Hoarder, plus one "Neural: …" per Model; the row wraps and is hidden in Human vs Human) and the Ending (Award / Skip). The defaults are Computer, Greedy and Award. A How to play block (text in the spec's Further Notes) is always visible, and a Start button begins the game with the chosen Settings. On returning to the Start Screen, the last-used Settings are kept for the session. This ticket builds the shared widgets (buttons, pill rows, hit-testing), the light look (warm off-white background, system-ui bold, rounded buttons with soft shadows) and the visually hidden DOM mirror of real buttons. The mirror must stay clickable by puppeteer, so it is clipped rather than `display: none`. The `<select>`s and the New game button are removed. See `.scratch/pretty-ui/spec.md`.

**Blocked by:** 01

**Status:** done

- [x] The page opens on the Start Screen with Computer, Greedy and Award selected
- [x] Every pill and the Start button work by pointer on the canvas and through the hidden DOM buttons (keyboard focus and Enter/Space)
- [x] The Strategy row lists each Model and is hidden when the Opponent is Human
- [x] How to play is shown with both Endings explained
- [x] Start begins a game with the selected Settings (coin flip against the Computer, as today)
- [x] Returning to the Start Screen keeps the last Settings
- [x] The old `<select>`s and New game button are gone; the browser tests use the mirror's buttons, and the mid-game settings-lock tests are replaced by Start Screen flow tests
- [x] Works at phone width with no horizontal scroll

**Notes:** The mirror buttons are transparent and laid exactly over their canvas widgets, not clipped to 1px, so the browser does the pointer hit-testing and the keyboard focus ring shows on the drawn widget. A minimal Menu button (top right, with a `TOP_BAND` kept clear above the Board) gives a way back to the Start Screen until ticket 03 places it in the header. The old HUD spans stay until tickets 03 and 04.
