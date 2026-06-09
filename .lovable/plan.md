## Goal

Reorganize the v2 navigation so Projects and Apps share a unified two-column "apps on the left, project outputs on the right" workspace, while Projects gets a dedicated grid index page.

---

## 1. Projects index → grid page

**File:** `src/routes/_authenticated-v2.v2.projects.tsx` (rewrite)

- Remove the current 3-column (list | detail) layout.
- New layout: full-width page with a header ("Projects" + "New project" button) and a responsive grid of project cards (similar to `src/routes/_authenticated/projects.tsx` but using v2 styling tokens).
- Each card shows thumbnail, title, updated date, scene count, delete-on-hover.
- Card click navigates to `/v2/projects/$projectId` (new route below). "New project" creates a project and navigates into it.

## 2. Project detail → new route at `/v2/projects/$projectId`

**New file:** `src/routes/_authenticated-v2.v2.projects.$projectId.tsx`

Two-column workspace, reusing the exact same building blocks as Apps:

- **Left column** (~420px): the apps list (same Tabs + grid of app cards as today's Apps page). Clicking an app swaps the column to `AppRunner` with the current `projectId`. A back arrow returns to the apps list. Generating runs against this project.
- **Right column**: `ProjectOutputsPanel` for this `projectId`. The existing title dropdown already supports switching to other projects and "New project", which fully covers the requested "title dropdown above with project name and ability to go to other projects" — "New project" in the dropdown will route to `/v2/apps` (no project selected).

Delete the now-unused `src/components/v2/projects/project-detail.tsx` and remove the `?p=` search param wiring.

## 3. Apps page → app picker + How it works

**File:** `src/routes/_authenticated-v2.v2.apps.tsx` (edit)

Keep the existing two-column shell, with two changes:

- **Right column when no app selected and no project:** replace the current `ProjectOutputsPanel` placeholder with a centered "Select an app to see how it works" empty state.
- **Right column when an app IS selected but no generation has happened yet (no `projectId`):** render `HowItWorksV2` for the selected skill instead of the outputs panel.
- **Right column once a generation starts / `projectId` is set:** render `ProjectOutputsPanel` exactly like today (the title dropdown + project switcher already exist).

The first successful run already creates a project via `handleStartFromWizard` and writes `projectId` into the URL — this already produces the "new project with generations shown in the main column, title in dropdown" behavior. No backend changes needed.

## 4. Navigation tweaks

**File:** `src/components/v2/vertical-nav.tsx` — no structural change, but Projects icon still routes to `/v2/projects` (now the grid). The existing "Open in timeline" button on `ProjectOutputsPanel` becomes "Open project" and links to `/v2/projects/$projectId` (the new detail route) so behavior stays consistent across Apps and Projects.

---

## Technical notes

- New route file naming: `_authenticated-v2.v2.projects.$projectId.tsx` (TanStack flat dot routing).
- The project detail route reuses the Apps page's `AppRunner` + `ProjectOutputsPanel` orchestration. To avoid duplication, extract the orchestration body of `AppsV2` (state, `startRun`, handlers, JSX) into a shared `<AppsWorkspace projectId? appId? />` component under `src/components/v2/apps/apps-workspace.tsx`. Both `_authenticated-v2.v2.apps.tsx` and `_authenticated-v2.v2.projects.$projectId.tsx` become thin route wrappers that pass search params into it. The project route forces `projectId` from the URL params and uses search for `?app=`.
- `HowItWorksV2` rendered in the right column when `selected && !projectId`.
- Empty right-column placeholder is a small inline component in `apps-workspace.tsx`.
- Delete `src/components/v2/projects/project-detail.tsx` after the rewrite.
- TimelinePanel is no longer reachable from v2 nav; leaving it in place (used by v1) is fine.
