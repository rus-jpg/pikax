
## Goal

Make the bottom composer in `/studio` actually reflect the App's recipe (e.g. Pet Hero Portrait → upload pet → pick persona → generate), instead of a generic prompt box. Do this in a way that also sets up the future "publish your agent workflow as an App" feature.

## Approach

Promote the per-App recipe from descriptive copy into a typed **step schema**. One schema drives three things: the "How it works" panel, the guided composer at the bottom, and (later) the publish-as-App format. Built-in Apps and user-published Apps end up being the same primitive.

Agent mode is unchanged — it keeps the freeform prompt box and `GenerativeCard` loop. App mode gets the wizard.

## Step schema

```ts
type AppStep =
  | { id: string; title: string; desc: string; kind: "upload"; accept: "image" | "video" | "audio"; required?: boolean }
  | { id: string; title: string; desc: string; kind: "choice"; options: { id: string; label: string; hint?: string }[]; allowCustom?: boolean }
  | { id: string; title: string; desc: string; kind: "prompt"; placeholder: string; minLength?: number }
  | { id: string; title: string; desc: string; kind: "slider"; min: number; max: number; step?: number; unit?: string };

type AppRecipe = {
  steps: AppStep[];
  // How collected inputs are assembled into the final generation call.
  compose: (inputs: Record<string, unknown>) => { prompt: string; assets?: string[] };
};
```

`STEPS_BY_SKILL_ID` becomes `RECIPES_BY_SKILL_ID: Record<string, AppRecipe>`. The existing `{title, desc}` data is preserved as the first two fields of each step, so the diagram keeps working with zero copy changes.

## Wizard composer (App mode only)

New `AppWizard` component replaces the freeform `PromptInput` when:
- `skill` is set (we're inside an App), AND
- `history.length === 0` (no turns yet), AND
- the skill has a `RECIPES_BY_SKILL_ID[skill.id]` entry.

Behavior:
- Renders the current step inline above (or in place of) the input. One step visible at a time, with a small `1 / 3` indicator and a `Back` affordance.
- `upload` → drag-and-drop tile that pushes into the project's asset store and stores the asset id in wizard state.
- `choice` → chip grid; `allowCustom: true` reveals a text field for "Other".
- `prompt` → multi-line textarea (same look as today's `PromptInputTextarea`).
- `slider` → labeled range.
- Primary button reads `Continue` until the last step, then `Generate`.
- On `Generate`: call `recipe.compose(inputs)`, then route through the existing `handleSend` path so the rest of the conversation rendering, busy state, and result cards stay identical.

After the first generation, the wizard collapses and the regular freeform `PromptInput` takes over for follow-ups ("Create another" path that already exists).

## "How it works" diagram

`HowItWorks` reads from the same recipe (`recipe.steps`) instead of the legacy `STEPS_BY_SKILL_ID` / `STEPS_BY_KIND` maps. Visuals improve based on `step.kind`:
- `upload` → upload-tile icon
- `choice` → chip-cluster icon
- `prompt` → text-cursor icon
- `slider` → slider icon
- final step → sparkle / output icon

This guarantees the diagram and the wizard can never describe different sequences.

## Migration of existing recipes

Convert the ~25 entries in `STEPS_BY_SKILL_ID` to the new typed shape. Most map cleanly:
- "Upload …" steps → `kind: "upload"`
- "Pick a …" / "Set the style" → `kind: "choice"` with a small starter option set (free-text fallback via `allowCustom`)
- "Describe …" / "Write …" → `kind: "prompt"`
- Final "Generate / Render / Export" → not an interactive step; rendered as the diagram's terminal node and triggered by the wizard's submit button.

For Apps without a hand-authored recipe, fall back to a kind-based default (`STEPS_BY_KIND` equivalent, also typed): one `prompt` step for image/audio/speech; one `upload?` + one `prompt` for video.

## Publishing agent workflows as Apps (groundwork only, not shipped this round)

Document the contract so the wizard schema is publish-ready:
- Add a `source: "builtin" | "user"` field on the recipe.
- `user_apps` table sketch (created later, not in this change):
  ```
  id uuid pk
  owner_id uuid → auth user
  name text, description text, icon text
  kind text   -- image/video/audio/speech
  recipe jsonb   -- AppStep[] + compose template
  created_at timestamptz
  ```
- The `compose` function is the only non-serializable piece. Serialize it as a **prompt template string** with `{{stepId}}` placeholders (e.g. `"A {{persona}} portrait of the uploaded pet, gallery framing"`). Built-in recipes can use the same template format so user and built-in Apps are byte-identical at rest.
- A future "Publish as App" button on a completed agent run will: replay the transcript, extract upload turns + decision-pill answers + the final prompt, and propose a draft `AppRecipe` the user can edit and save.

No backend changes in this change set — just the schema shape and a code comment marking where publish will hook in.

## Files touched

- `src/routes/_authenticated/studio.$projectId.tsx`
  - Replace `Step`, `STEPS_BY_KIND`, `STEPS_BY_SKILL_ID` with the typed `AppStep` / `AppRecipe` and `RECIPES_BY_SKILL_ID`.
  - Update `HowItWorks` to read `recipe.steps` and pick icons per `step.kind`.
  - Render new `AppWizard` in the composer slot when conditions above are met.
- `src/components/studio/AppWizard.tsx` (new) — wizard UI, one component per step kind, internal state, submit handler.
- `src/lib/app-recipes.ts` (new) — extract `RECIPES_BY_SKILL_ID` and helpers (`composeFromTemplate`) out of the route file so it stays under control and is reusable by a future publish flow.

## Out of scope for this change

- Actually building the "Publish as App" UI, the `user_apps` table, or the transcript-to-recipe extractor.
- Changing Agent mode's composer.
- Reworking how generated outputs render — wizard funnels into the existing `handleSend`/`GenerativeCard` pipeline.

## Open questions for you

1. For Apps that today are a single freeform prompt (e.g. text-to-image, text-to-music), do you want the wizard to still wrap them as a one-step form, or just keep the plain prompt box? I'd default to **one-step form** for visual consistency, but it does add a click.
2. For `choice` steps (e.g. Pet Portrait → "Pick a persona"), do you want me to author a starter set of 6–8 chips per App, or always start blank with just an "Other / describe" text field? Starter chips are friendlier but more work to maintain.
