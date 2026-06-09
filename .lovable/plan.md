# Alternate Frontend (v2) — Plan

Set up a parallel `/v2/*` route tree for a full redesign that shares all backend logic with v1, plus a persistent toggle in the account/nav menu.

## Goals

- Both versions live side-by-side, independently editable.
- Zero duplication of server functions, lib code, Supabase integration, or schemas.
- A user can flip between v1 and v2 at any time; their choice persists and auto-routes them on subsequent visits.

## Route structure

Mirror the existing authenticated routes under a new layout segment. TanStack file-based routing makes this clean:

```text
src/routes/
  _authenticated.tsx                   (v1 layout — AppNav + Outlet)
  _authenticated/
    projects.tsx                       (v1)
    apps.tsx                           (v1)
    library.tsx                        (v1)
    studio.index.tsx                   (v1)
    studio.$projectId.tsx              (v1)

  _authenticated-v2.tsx                (NEW — v2 layout, own AppNavV2)
  _authenticated-v2/
    v2.projects.tsx                    → /v2/projects
    v2.apps.tsx                        → /v2/apps
    v2.library.tsx                     → /v2/library
    v2.studio.index.tsx                → /v2/studio
    v2.studio.$projectId.tsx           → /v2/studio/$projectId
```

The `_authenticated-v2` pathless layout reuses the same auth gate logic as `_authenticated` (copy the `beforeLoad` redirect). Children share URL prefix `/v2`.

## Component structure

```text
src/components/
  app-nav.tsx                          (v1, unchanged)
  v2/
    app-nav.tsx                        (NEW v2 nav)
    studio/                            (NEW v2 versions of studio pieces)
      studio-toolbar.tsx
      generative-card.tsx
      app-wizard.tsx
      timeline-panel.tsx
    ...                                (any other redesigned components)
```

Rule: v2 components live under `src/components/v2/**` and import from the same `src/lib/**`, `src/integrations/**`, `src/hooks/**` as v1. No backend forking.

## Shared vs forked

| Layer | Shared | Forked |
|---|---|---|
| Server functions (`src/lib/*.functions.ts`) | ✅ | — |
| Supabase client, auth middleware | ✅ | — |
| `src/lib/skills.ts`, `app-recipes.ts`, project state | ✅ | — |
| Route files | — | ✅ (v2.* siblings) |
| Layout (`_authenticated*`) | — | ✅ |
| Page components / studio UI | — | ✅ (under `components/v2/`) |
| `src/styles.css` design tokens | ✅ base, v2 can add `.theme-v2` scope | optional |

## Version toggle

1. Add a `layoutVersion: "v1" | "v2"` preference stored in `localStorage` under key `pikax.layoutVersion`.
2. New hook `src/hooks/use-layout-version.ts` reads/writes the preference and exposes `{ version, setVersion }`.
3. Extend `src/components/account-popover.tsx` (and a new `src/components/v2/account-popover.tsx`) with a "Switch to classic / new layout" item that:
   - Saves the new preference.
   - Navigates to the equivalent path in the other tree (e.g. `/projects` ↔ `/v2/projects`).
4. Optional auto-redirect on `_authenticated` root load: if `version === "v2"` and the user lands on a v1 URL via bookmark, redirect once to the v2 equivalent (and vice versa). Keep this opt-out friendly — only redirect on the index landing, not deep links.

## Implementation steps

1. Create `src/hooks/use-layout-version.ts` with localStorage-backed state and a `getMirrorPath(pathname)` helper that maps `/foo` ↔ `/v2/foo`.
2. Create `src/routes/_authenticated-v2.tsx` (copy auth gate from `_authenticated.tsx`, render `<AppNavV2 />` + `<Outlet />`).
3. Create `src/components/v2/app-nav.tsx` — a fresh nav matching the v2 design (placeholder styling at first; iterate later).
4. Scaffold v2 route leaves: `src/routes/_authenticated-v2/v2.projects.tsx`, `v2.apps.tsx`, `v2.library.tsx`, `v2.studio.index.tsx`, `v2.studio.$projectId.tsx`. Each renders a minimal placeholder that imports the same data hooks/server functions as v1.
5. Add `src/components/v2/account-popover.tsx` (or extend the existing one with a conditional toggle item) wired to `useLayoutVersion`.
6. Optional: add a `.theme-v2 { ... }` block in `src/styles.css` so v2 layout root can opt into different design tokens without touching v1.
7. Verify the route tree regenerates cleanly and both `/projects` and `/v2/projects` render.

## Technical notes

- **Auth gate duplication**: copy the `beforeLoad` from `_authenticated.tsx` verbatim into `_authenticated-v2.tsx`. Don't try to share — TanStack route configs aren't composable that way and the duplication is ~10 lines.
- **`createFileRoute` strings**: must match generated IDs exactly. Files under `_authenticated-v2/` with `v2.projects.tsx` produce `createFileRoute("/_authenticated-v2/v2/projects")` with URL `/v2/projects`.
- **No SSR for the toggle**: localStorage is browser-only. Read inside `useEffect` or guard with `typeof window !== "undefined"` to avoid hydration mismatch.
- **Backend untouched**: zero changes to `src/lib/*`, `src/integrations/*`, Supabase migrations, or env vars.
- **Deletion path**: when v2 is the winner, delete `_authenticated.tsx` + `_authenticated/**` and rename `_authenticated-v2*` back. Or vice versa.

## Out of scope (for this scaffolding pass)

- Actual v2 visual design — this plan sets up the empty shell. After approval I'll either ask for design directions or build whatever v2 look you describe.
- Per-user persistence in the database (localStorage is enough to start).
- Analytics/feature flag wiring.
