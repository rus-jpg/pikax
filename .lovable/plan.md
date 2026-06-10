# Timeline polish + app-driven editing

## 1. Header polish (small visual cleanup)

`src/components/v2/apps/project-timeline-panel.tsx`
- Replace the muted "Timeline" label with the same treatment as the project title in the outputs panel: `font-display text-xl font-semibold tracking-tight`.
- Move the **Share** and **Export** buttons out of the bottom row and into the header's right side (next to the close button). Remove the bottom share/export row.

`src/components/v2/apps/project-outputs-panel.tsx`
- When `timelineOpen` is true, hide the "Close Timeline" button entirely (close lives in the timeline header). When closed, keep the "Open Timeline" button as today.

## 2. Stop auto-adding generated outputs to the timeline

Today every new visual asset shows up in the timeline because `applyTimeline` returns "all assets minus `hidden`". Flip the semantics so the timeline is an **explicit allowlist**:

`src/lib/project-state.ts`
- Keep `TimelineState.order: string[]`, drop reliance on `hidden`. The timeline shows exactly the assets whose ids appear in `order`, in that order. (`hidden` stays in the type for backward compat but is ignored by the panel.)

`src/components/v2/apps/apps-workspace.tsx` — `startRun`
- Remove the `scenesAppend` write that fires after every generation. Generations land in the Project Assets panel only; the user adds them to the timeline via the flow in §3.

`src/components/v2/apps/project-timeline-panel.tsx`
- `visualAssets` = assets filtered to ids in `timeline.order` (preserve order). Empty state: "No clips yet — click + to add one."

## 3. App-driven add/edit from the timeline

Two new entry points inside the timeline panel, both popovers built on `@/components/ui/popover` + the existing `appsAcceptingMime`-style filter:

**Click a clip → "Edit with app" popover**
- Lists apps whose upload step accepts the clip's mime (image or video).
- Selecting an app calls a new prop `onUseInApp({ skill, asset, intent: { kind: "replaceClip", assetId } })` exposed by `AppsWorkspace`.

**Click the `+` on the clip strip → "Add clip" popover**
- Lists apps whose output is image or video.
- Selecting an app calls `onUseInApp({ skill, asset: null, intent: { kind: "appendVisual" } })`.

**Audio track: `+` button and click-on-track → "Add/Edit audio" popover**
- Audio track gets the same `+` tile next to the waveform plus a click-to-edit affordance on existing audio rows.
- Audio apps list filtered to skills whose output kind is audio. Intents: `{ kind: "appendAudio" }` or `{ kind: "replaceAudio", assetId }`.

## 4. Wiring the intent through `AppsWorkspace`

`src/components/v2/apps/apps-workspace.tsx`
- Add `const [pendingIntent, setPendingIntent] = useState<TimelineIntent | null>(null)` where
  ```ts
  type TimelineIntent =
    | { kind: "appendVisual" }
    | { kind: "appendAudio" }
    | { kind: "replaceClip"; assetId: string }
    | { kind: "replaceAudio"; assetId: string }
  ```
- `handleUseInApp` already seeds the app and switches the left panel; extend it to also set `pendingIntent`.
- In `startRun`, after the final asset arrives, if `pendingIntent` exists, write to `timeline` via `updateProjectState`:
  - `appendVisual` / `appendAudio` → append `finalAsset.assetId` to `timeline.order`.
  - `replaceClip` / `replaceAudio` → swap `assetId` with the new id in `timeline.order` at the same position.
  Then clear `pendingIntent`.
- The `scenesAppend` block is removed in §2; this replaces it as the single point where the timeline is mutated by generation.

## 5. Out of scope

- Trim handles, multi-track audio mixing, real share/export, drag-to-reorder audio. The existing visual reorder/delete DnD stays as-is.
- No backend schema changes beyond using existing `timeline.order`.
