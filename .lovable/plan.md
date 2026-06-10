Rebuild `src/components/v2/apps/project-timeline-panel.tsx` to match the reference: a centered editor with large preview, transport controls, horizontal scrollable clip strip, audio track, and share/export.

## Layout (inside existing right-side resizable panel)

Vertically + horizontally centered column, max-width fills the panel with padding. Stacked sections:

1. **Preview** — large rounded video/image element, aspect-video, fills available width. Shows the currently selected clip (or first clip). Resizes naturally as the panel resizes.
2. **Transport row** — centered: mute icon · current timecode · big dark pill Play/Preview button · end timecode · fullscreen icon.
3. **Clip strip** — horizontally scrollable row of thumbnails (image/video frames), each ~80×56, rounded. Selected clip gets a thick ring. Trailing `+` tile to add a clip. Time ruler (5s / 10s / 15s ticks) above the strip. Vertical orange playhead line overlaid.
4. **Audio track** — full-width rounded lavender bar with file name + waveform placeholder (SVG bars derived from audio asset count, or a static decorative waveform when none).
5. **Share / Export** — right-aligned row: ghost "Share" button + primary "Export" button.

Header keeps a small Close (PanelRightClose) button + "Timeline" label and duration chip, but slimmed down.

## Interactions

- **Play/pause + scrubbing**: native `<video>` ref; play button toggles `video.play()/pause()`; track `currentTime` via `timeupdate` to drive the orange playhead position (computed as `currentTime / totalDuration * stripWidth`). Click on the time ruler seeks. Mute button toggles `video.muted`. Each clip = 5s (existing convention); when a clip ends, advance to next.
- **Select clip**: click thumbnail → sets `selectedClipId`, swaps preview source, seeks playhead to that clip's start.
- **Reorder clips (drag)**: HTML5 drag-and-drop on thumbnails. On drop, call a new `reorderAssets` server function that updates `project.assets` order via `updateProjectState` (add `assetsOrder: string[]` patch field in `src/lib/project-state.ts` + handler in `src/lib/projects.functions.ts`). Optimistic local reorder, then invalidate `["v2-project", projectId]`.
- **Delete clip**: trash button on hover or when selected → calls new `removeAsset` patch (`assetsRemove: string[]`) through `updateProjectState`. Same optimistic + invalidate pattern.
- **Share/Export**: visual only this pass (buttons present, no handlers wired) — confirms layout without scope creep.

## Files

- `src/components/v2/apps/project-timeline-panel.tsx` — rewrite to new layout + interactions.
- `src/lib/project-state.ts` — extend `ProjectStatePatch` with `assetsOrder?: string[]` and `assetsRemove?: string[]`; apply in the reducer that builds new state.
- `src/lib/projects.functions.ts` — handle the two new patch fields inside `updateProjectState`'s handler (reorder by id list; filter out removed ids).
- No route or styles.css changes; reuse existing tokens (`bg-card`, `border-border`, `bg-foreground/text-background` for the dark pill, `primary` accent for playhead — verify against current palette).

## Out of scope

- Trim handles on clips (mentioned in request but not in answers; skip this round, leave hooks for later).
- Multi-track audio editing, waveform from real audio decoding (decorative SVG only).
- Real share/export functionality.