# V2 Redesign Plan

A descoped, opinionated frontend. Same backend, same server functions, same database — only routes and components under `/v2/*` and `src/components/v2/**` change.

## Core mental model

- **One project = one timeline.** Every project owns exactly one timeline composition. All generated assets land on it.
- **Apps are the entry point.** A user picks an app, runs a wizard, and the output either starts a new project or is appended to an open one.
- **Library is the asset pool.** Every generated asset lives there too, and can be fed back into any app via a "Pick from Library" picker on each wizard input.
- **No Agent mode in v2.** Removed entirely.

## Layout shell

Persistent **vertical left nav** (~64px collapsed icons, ~220px expanded). Top to bottom:

1. Logo / brand mark
2. Projects (folder icon)
3. Apps (sparkles icon)
4. Library (grid icon)
5. (spacer)
6. Jobs indicator — shows running generations with a badge count; clicking opens a popover with progress
7. Account avatar (popover with settings, switch to classic layout, sign out)

The nav is always visible. Everything else is a 2- or 3-column workspace to its right.

## Page layouts

### Projects — 3 columns

```text
[ nav ] [ project list  ] [ project detail = timeline editor      ]
        | search          | preview canvas at top                 |
        | + New project   | timeline track at bottom              |
        | project A *     | right-side inspector for selected clip|
        | project B       |                                       |
```

- First project auto-selected on load.
- Middle column: searchable list, sorted by updated. Inline rename, delete via context menu.
- Right column: the timeline editor (reuse existing `TimelinePanel` logic, redesigned chrome). A "+ Add from app" button inside the editor opens the Apps picker scoped to add-to-this-project.

### Apps — 3 columns with tabs

```text
[ nav ] [ apps column                ] [ main column            ]
        | Tabs: Featured | Video |    | Default: "How it works" |
        |       Image | Audio | ...   | for selected app        |
        | app card grid               | After run: results +    |
        | (click app -> wizard loads  | "Add to project" / "Save|
        |  inline in this column)     | to Library" actions     |
```

- Tabs across the top of the middle column filter the app grid by category.
- Clicking an app swaps the grid for that app's wizard inline (back button returns to grid).
- Main (third) column shows the app's "How it works" doc by default, then live results once the user runs it.
- Each wizard input that accepts an asset has a **"Pick from Library"** button → opens a library picker modal filtered to the accepted asset type.
- After a result is generated: two CTAs — "Add to a project" (picks/creates a project and appends to its timeline) and "Save to Library only".

### Library — 2 columns

```text
[ nav ] [ library main view                                      ]
        | filter chips: All | Image | Video | Audio | Character  |
        | search                                                  |
        | masonry/grid of assets                                  |
        | item click -> side drawer with metadata, "Use in app", |
        | "Add to project", download, delete                     |
```

No third column — full-width grid as requested.

## Timeline editor as the engagement hook

Every app result becomes a clip on the project's timeline. The editor (reused from v1, redesigned) supports:

- Images → still clip, animatable via an "Animate" action that opens the image-to-video app pre-filled.
- Videos → video clip, trim/reorder.
- Audio → audio track (music or voice).
- Characters → reference asset rail (not a timeline clip; used as input to image/video apps).

The editor surfaces a persistent "+ Add" affordance to encourage multi-shot composition. Export button → render full timeline to MP4 (reuses existing `render.functions.ts`).

## Cross-cutting features

- **Jobs indicator** in nav: subscribes to in-flight generations, shows toast on completion with "View in project / library" actions. Critical because video gens take minutes.
- **Library picker modal**: shared component, filterable by `kind`, used by every app wizard input.
- **Empty states** for each page (no projects, no apps category match, empty library).
- **Mobile/narrow (<900px)**: project list and apps grid collapse into a top drawer; main column stays full-width. Nav becomes bottom tab bar.
- **Account popover** keeps the "Switch to classic layout" toggle from v1.

## Out of scope for this pass

- v1↔v2 default swap (revisit once v2 reaches parity)
- Collaboration / sharing
- Folders/tags in library (filter chips only for now)
- Keyboard shortcuts
- Onboarding tour
- Credits/billing UI changes

## Technical structure

```text
src/routes/
  _authenticated-v2.tsx                  # existing shell, swap to vertical nav
  _authenticated-v2.v2.projects.tsx      # 3-col, project list + timeline
  _authenticated-v2.v2.apps.tsx          # 3-col, tabs + wizard + how-it-works
  _authenticated-v2.v2.library.tsx       # 2-col grid

src/components/v2/
  app-shell.tsx                  # vertical nav + content slot
  vertical-nav.tsx               # icons, jobs badge, account
  jobs-popover.tsx
  library-picker-modal.tsx       # shared input picker
  projects/
    project-list.tsx
    timeline-editor.tsx          # wraps existing TimelinePanel
    add-from-app-menu.tsx
  apps/
    app-tabs.tsx
    app-grid.tsx
    app-wizard-panel.tsx         # wraps existing AppWizard
    how-it-works.tsx
    results-panel.tsx
  library/
    library-grid.tsx
    library-filters.tsx
    asset-drawer.tsx
```

- **Backend untouched.** All v2 components import the same `projects.functions.ts`, `generate.functions.ts`, `library.functions.ts`, `render.functions.ts`, and project-state types.
- **Routing.** Stays under `/v2/*`. Account popover keeps the "Switch to classic" toggle. Default swap deferred.
- **Agent mode.** Studio toolbar's agent code is not deleted — v2 just doesn't surface it. v1 keeps working.

## Build order

1. Shell: vertical nav, app-shell, account/jobs slots (jobs as stub badge).
2. Library page (simplest, single column) + library-picker-modal.
3. Apps page: tabs, grid, wizard panel, results panel, how-it-works.
4. Projects page: list, timeline editor wrapper, add-from-app entry point.
5. Wire app results → "Add to project" / "Save to library" flows.
6. Real jobs indicator subscribing to in-flight generations.
7. Responsive collapse for <900px.

Each step is independently shippable behind `/v2/*`.
