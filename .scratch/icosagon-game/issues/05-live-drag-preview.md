# 05: Live drag preview

Status: done

**What to build:** While a drag is in progress, the Line follows the pointer. When the drag is snapped to a legal end Point, the Board shows the Regions and colours that releasing there would produce. Over empty space or an illegal Point, only the Line is shown and the Board keeps its current colours. Add a preview operation to the game module's public interface that returns the resulting Regions without changing the game.

See `.scratch/icosagon-game/spec.md` and `CONTEXT.md`.

**Blocked by:** 01 (Tracer bullet: draw one Line).

- [x] The in-progress Line follows the pointer during a drag
- [x] The colour preview appears only while snapped to a legal end Point
- [x] Moving off a legal Point clears the preview
- [x] Unit test: a preview returns the same Regions as applying the Move, and the game state is unchanged afterwards
