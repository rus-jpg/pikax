## Changes

### 1. Rename "Apps" → "Create" in the vertical nav
File: `src/components/v2/vertical-nav.tsx`
- Change the label `"Apps"` → `"Create"` for the `/v2/apps` nav item.
- Replace the `LayoutGrid` icon with a custom inline SVG component built as a 2×2 grid of shapes (uses `currentColor`, `strokeWidth=2`, sized to match the other 20px lucide icons):
  - top-left: circle
  - top-right: square
  - bottom-left: triangle
  - bottom-right: plus

### 2. Clicking a Project opens it in Create
File: `src/routes/_authenticated-v2.v2.projects.index.tsx`
- Change the project card `<Link>` from `to="/v2/projects/$projectId"` to `to="/v2/apps"` with `search={{ projectId: p.id }}`.
- `AppsWorkspace` already accepts `projectId` via search params and loads that project's state (current app, assets, outputs), so no workspace changes are needed — the existing camera/draft behavior just gets reused.

The `/v2/projects/$projectId` route file stays in place so existing deep links keep working; we just stop linking into it from the index grid.

### Out of scope
No changes to the Projects tab itself, no auto-save status UI, no route consolidation — keeping this strictly to the two requests above.
