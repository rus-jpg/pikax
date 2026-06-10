## Goal

Give users a fast "type a prompt → get media" path with full control over mode, model, and per-model parameters — without going through a recipe app. Make this the default home and a first-class entry in the left nav.

## Scope

1. **New home: `/v2/home`** — becomes the default logged-in landing page.
   - Big display title ("What will you create today?").
   - Prompt-first composer (the input bar from screenshot 1) directly under it.
   - Below: Recent Projects row (horizontal scroll, 4-6 cards).
   - Below that: placeholder shelves ("From the Community", "Trending") with empty/coming-soon states.
   - `_authenticated-v2.tsx` redirects `/v2` → `/v2/home`. `/v2/projects` stays as the full grid.

2. **New left-nav item: "Create"** (Plus icon, placed at the top, above Projects). Routes to `/v2/home`.

3. **New "Create" app: `app-create`** registered in `src/lib/skills.ts` as a special skill (icon: Sparkles/Plus). Selecting it from `/v2/apps` or submitting from the home composer opens `AppsWorkspace` with this app in the left skinny column — matching screenshot 2's layout (mode tabs at top, prompt area, reference uploads, param chips at bottom, Generate button).

4. **Per-model param schema**: a new `src/lib/model-params.ts` declares per-model supported controls. Each entry lists the params (size/aspect, resolution, duration, fps, n, voice, etc.) with type (select/slider/toggle) and options. The Create app's wizard reads it and renders chips dynamically based on the selected model. Params are passed through to `directGenerateStart` as extra input keys.

## UX flow

```text
/v2/home
├── Title + Composer (mode pill | Apps | aspect | duration | model)
│     ↳ Submit → navigate /v2/apps?app=app-create&seedPrompt=...&mode=...&model=...
├── Recent Projects (horizontal)
└── Community / Trending placeholder shelves

Left nav: Create (→/v2/home) · Apps · Projects · Library · Jobs
```

Inside the Create app (skinny left column):
- Top: Image / Video / Audio / Voice mode tabs (mirrors screenshot 2).
- Reference uploads strip (re-use existing AssetPicker + ProjectAsset flow).
- Big multiline prompt textarea.
- Bottom row: dynamic param chips (driven by `model-params.ts`) + model picker + Generate button.
- Submitting calls the existing `handleStartFromWizard` path in `AppsWorkspace` — outputs land in the middle column, identical to other apps.

## Technical details

### Files to create
- `src/routes/_authenticated-v2.v2.home.tsx` — new home route.
- `src/components/v2/home/home-composer.tsx` — prompt input + mode/model/param pills.
- `src/components/v2/home/recent-projects-row.tsx` — horizontal carousel reading the existing `listProjects` query.
- `src/components/v2/home/placeholder-shelf.tsx` — empty-state shelves for community/trending.
- `src/lib/model-params.ts` — per-model param schema:
  ```ts
  export type ParamControl =
    | { key: string; type: "select"; label: string; options: {value:string;label:string}[]; default: string }
    | { key: string; type: "slider"; label: string; min: number; max: number; step: number; default: number }
    | { key: string; type: "toggle"; label: string; default: boolean };
  export const MODEL_PARAMS: Record<string, ParamControl[]> = { ... };
  ```
- `src/components/v2/apps/create-app-wizard.tsx` — replaces the default `AppWizardV2` rendering when `skill.id === "app-create"`. Renders the mode tabs + dynamic param chips.

### Files to edit
- `src/lib/skills.ts` — add `app-create` skill (kind: "image", model: default per-mode, category: "Create").
- `src/components/v2/vertical-nav.tsx` — add `{ to: "/v2/home", label: "Create", icon: Plus }` at the top.
- `src/routes/_authenticated-v2.tsx` — redirect index match to `/v2/home`.
- `src/components/v2/apps/apps-workspace.tsx` — accept optional `seedPrompt` / `seedMode` / `seedModel` from URL search; when app is `app-create`, render `CreateAppWizard` instead of `AppRunner`'s default wizard.
- `src/routes/_authenticated-v2.v2.apps.tsx` — extend `searchSchema` with `seedPrompt`, `seedMode`, `seedModel`.
- `src/lib/generate.functions.ts` — accept an optional `params: Record<string, unknown>` field and merge into the upstream input payload (passed through to fal).

### Behavior notes
- Mode change in the Create app auto-swaps to that mode's default model (`DEFAULT_MODEL_BY_KIND`) and resets param values to the new model's schema defaults.
- Param values are local state in the wizard; not persisted to project state for v1.
- Recent projects row reuses the existing `listProjects` query — no new server fns.
- Community/Trending shelves are static placeholders ("Coming soon") in v1.

## Out of scope (v1)
- Persisting per-project last-used params.
- Real community feed data.
- Streaming previews during generation (still uses existing poll path).

Ready to build?