
# Timeline interactions — gap analysis & rebuild plan

After reading `src/components/v2/apps/project-timeline-panel.tsx`, here is where the current behavior diverges from iMovie/Final Cut, and what I'd change.

## What's actually implemented today

- **Trim handles**: 1.5px wide strips on each clip edge. Drag updates `trim.start`/`trim.end`. Capped at `naturalDuration` for video/audio, or 600s for images. No live readout. Following clips do not shift while you trim.
- **Move (drag body)**: shows a ghost following the cursor + a vertical insertion line. On release, the clip is reordered into the slot whose midpoint you crossed. Any explicit `offset` on the moved clip is cleared so it flows sequentially.
- **Free position / overlap**: not supported. Reorder is always "between two neighbors". The `offset` field exists but is only used to preserve a gap after a delete.
- **Snapping**: a `snapTime` helper exists but `beginMove` never calls it. The midpoint heuristic is what actually decides where the clip lands.
- **Split**: only at the playhead, and the button is disabled unless there's a visual clip. Audio cannot be split.
- **Delete**: leaves a "footprint" gap; user must click the gap to collapse. There is no one-shot ripple delete.
- **Cross-track drag**: visual ↔ audio is blocked (correct). But within audio there is only one row, so two audio clips can never overlap.
- **Selection / keyboard**: only `selectedId` (visual) is tracked. Arrow keys step through visual clips. Audio is not really selectable, can't be nudged, can't be split, can't be duplicated.
- **Playhead**: advances during preview but the ruler doesn't appear to support click-to-seek or drag-to-scrub.

## Where this falls short of iMovie / FCP

1. **Trim is not "rubber-band" editing.** In iMovie, dragging the right edge of clip A pushes B, C, D right in real time (ripple). Here, trimming a clip's end only changes its own width — following clips visibly overlap or detach until the next reflow. There's also no on-clip duration HUD ("0:04.20 / 0:07.00") while dragging, and no edge-snap to the playhead or to neighbors.
2. **No free placement.** I cannot grab a clip and drop it at second 12.4 over an empty stretch. The drag always snaps into a strictly sequential slot. iMovie/FCP allow free positioning on secondary tracks and allow gaps.
3. **No real overlap / J-K-L cut style edits.** Two clips can never occupy the same time on the same row. FCP-style "connected clips" (B-roll over A-roll, music under video) requires multiple visual rows; today there is one visual row + one audio row.
4. **Insertion is midpoint-based, not insertion-line-based.** I can't drop a clip "before clip B at exactly its start" if my cursor is past B's midpoint — it jumps to after B. iMovie uses a hard insertion line that tracks the actual gap under the cursor.
5. **Split only works at the playhead and only for visuals.** FCP's blade tool splits whatever clip is under the cursor, on any track, at the cursor X.
6. **Delete is two-step.** Pressing delete leaves a gap and requires a second click on the gap to ripple-close it. iMovie defaults to ripple delete (gap collapses immediately); Option+Delete is the "leave gap" variant.
7. **Snap promise isn't kept.** Trim handles don't snap to the playhead or to other clip edges, and the move handler doesn't use the snap helper at all.
8. **Trim limits are arbitrary.** Images cap at 600s with no UI hint. Trimming past the natural duration of a video silently clamps with no feedback.
9. **No drag affordance on the handles.** 1.5px hit area, invisible until hover, no cursor change off-handle, no visual "trim mode" highlight on the clip while dragging.
10. **No playhead scrub, no zoom-to-fit, no shortcut hints.** Ruler is read-only.
11. **Audio is a second-class citizen.** Can't split, can't duplicate via keyboard, no waveform, no volume/fade handles.
12. **No multi-select, no nudge.** Can't shift-click to select a range, can't arrow-key nudge a clip by 1 frame / 1 second.

## Proposed rebuild (phased)

I'd land this in 3 phases so each delivers a usable improvement without a huge single PR. **I want your input on Phase 1 scope before we start.**

### Phase 1 — Fix the fundamentals (recommended starting point)

The "this feels broken" parts. Pure interaction polish, no schema changes.

- **Trim**
  - Widen hit area to 8px, show a visible vertical bar on hover/drag.
  - Live HUD on the clip showing new duration and source in/out while dragging.
  - Ripple by default: trimming a clip's right edge shifts subsequent clips on the same track. Hold Option for "trim in place" (leave a gap).
  - Snap edges to: playhead, other clip starts/ends, project start. Re-use existing `snapTime` helper.
  - Cursor changes to `ew-resize` only over the actual handle, `grab`/`grabbing` over the body.

- **Move**
  - Switch insertion logic from "midpoint of neighbor" to "nearest gap edge under cursor", with the insertion line drawn at that exact gap.
  - Honor `snapTime` on body drag (snap clip start AND end to neighbor edges + playhead).
  - Drop on empty timeline area appends at end with a small gap (or snaps to last clip end).
  - While dragging, dim only the source clip's slot, not every other clip.

- **Split**
  - Enable for audio clips too.
  - Add a "blade" mode (or just: shift-click on a clip splits at click X). Keep the playhead split as the default keyboard action (S).

- **Delete**
  - Default action ripple-deletes (gap closes). Option/Alt+Delete = current "leave gap" behavior.
  - Gaps remain clickable to collapse, but they're now the exception.

- **Playhead**
  - Click on ruler to seek. Drag on ruler to scrub. Audio scrubs along.

- **Selection / keyboard**
  - Make audio clips selectable. Arrow keys cycle through visual + audio. Left/Right with Option = nudge selected clip by 1 frame (1/30s). Cmd+D duplicates selected on either track.

### Phase 2 — Free placement & overlap

Requires extending `TimelineTrim` to always carry an explicit `offset` once a clip has been moved off the sequential flow.

- Body drag can drop a clip at an arbitrary time → writes `offset` for that clip.
- Visible empty space at the start of a track stays empty until you delete it (already supported, surface it better).
- Overlap on the same row resolves by stacking visually (later clip wins on top) and the drop indicator shows the overlap region in red so you know you're overlapping.
- "Snap to magnetic flow" toggle in the toolbar that re-runs sequential layout (clears all `offset`s on that track).

### Phase 3 — Multi-track, waveforms, J/L cuts

Bigger lift; requires data-model changes (`tracks: TimelineTrack[]` instead of one visual row + one audio row).

- Multiple visual rows (A-roll + B-roll). Drag a clip up/down to change row.
- Multiple audio rows.
- Audio waveform rendering (decode + cache in IndexedDB).
- Per-clip volume rubber band + fade in/out handles.
- J/L cuts (audio extends past video edge).

## Technical notes (for me, you can skim)

- All trim/move state lives in `effectiveTrims: Record<string, TimelineTrim>`. `TimelineTrim = { start, end, offset? }`. Phase 1 doesn't touch this shape; Phase 2 makes `offset` first-class.
- Layout is computed by two `useMemo`s (`cumStarts`, `audioStarts`). Ripple-trim just needs to recompute these as the trim drag progresses — already reactive on `effectiveTrims`, so updating `localTrims` during pointer-move is enough.
- `beginMove` already builds an `others` array with `{start, end}`. Switching to "nearest gap under cursor" is a 10-line change. Wiring `snapTime` into `beginMove`/`beginTrim` is straightforward.
- Ripple delete is `commitSnap({ order: order.without(ref), trims: trims.without(ref) })` without the "pin next clip's offset" step that exists today.

## Questions before I start

1. **Scope**: Start with Phase 1 only (fundamentals), or also include Phase 2 (free placement / overlap) in the first pass?
2. **Default delete**: confirm you want ripple-delete by default (gap closes), Option+Delete to leave the gap.
3. **Snap strength**: 12px snap distance feels right for mouse; should I keep the existing 12px or tighten to 6px?
4. **Multi-track (Phase 3)**: is that on the roadmap or out of scope for now?
