# 07: Touch and resizing

Status: done

**What to build:** Make the game playable on touchscreens and at any window size. Finger drags behave exactly like mouse drags, including snapping, preview and cancellation. The canvas resizes to fit the window, and Point snapping stays accurate after a resize.

See `.scratch/icosagon-game/spec.md` and `CONTEXT.md`.

**Blocked by:** 01 (Tracer bullet: draw one Line).

- [x] A touch drag between two legal Points completes a Move
- [x] The canvas resizes with the window and the Board stays a regular icosagon
- [x] Snapping to Points works correctly after a resize
- [x] Browser test: a Move made with touch input in a small window gives the expected Scores

## Comments

- From the review of 01: `main.ts` builds the layout from `canvas.width/height` (backing pixels), while `input.ts` and the browser tests measure in CSS pixels from `getBoundingClientRect`. They agree only because the canvas is a fixed 600×600 with no CSS scaling or devicePixelRatio. Use one coordinate system when the canvas starts resizing.
