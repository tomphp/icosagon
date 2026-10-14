# 07: Touch and resizing

Status: ready-for-agent

**What to build:** Make the game playable on touchscreens and at any window size. Finger drags behave exactly like mouse drags, including snapping, preview and cancellation. The canvas resizes to fit the window, and Point snapping stays accurate after a resize.

See `.scratch/icosagon-game/spec.md` and `CONTEXT.md`.

**Blocked by:** 01 (Tracer bullet: draw one Line).

- [ ] A touch drag between two legal Points completes a Move
- [ ] The canvas resizes with the window and the Board stays a regular icosagon
- [ ] Snapping to Points works correctly after a resize
- [ ] Browser test: a Move made with touch input in a small window gives the expected Scores
