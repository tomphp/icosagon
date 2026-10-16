# 05: Prediction while dragging

**What to build:** While a Player drags a Line and before it snaps to a legal end Point, the Board predicts the Move from the drag's direction. Once the pointer is at least 20px from the start Point, a ray is cast from the start Point through the pointer to the Board's edge. The predicted end Point is the legal end Point closest by angle around the Board centre to where the ray hits. Using the existing Move preview, the Regions whose colour would change are drawn in a pale tint of their new colour (about 45% toward white). The dashed line extends faintly from the pointer to the predicted Point, which gets a ring. Snapped drags keep today's full-colour preview. Releasing an unsnapped drag still makes no Move. See `.scratch/pretty-ui/spec.md`.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A pure prediction function returns the predicted end Point or none, given the Game, the start Point and the pointer
- [ ] Unit tests cover the 20px threshold, aiming by angle, skipping used and adjacent Points, and having no legal end Point
- [ ] Unsnapped drags show the pale tint, the faint extension and the ring; snapped drags show full colours as today
- [ ] Releasing an unsnapped drag makes no Move
