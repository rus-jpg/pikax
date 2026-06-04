## Goal

While in **Agent mode** in the studio, every user message also runs the App suggester in parallel. If the AI finds a strong match, an **inline suggestion card** appears in the chat. Clicking "Use this App" switches the project to that App and opens its wizard — without clearing the existing chat history.

## UX flow

```text
User (agent mode): "i want to turn my pet into a superhero"
  ├─ Agent: streams its usual reply ("Great! Let's start by…")
  └─ Suggester (parallel): returns { Pet Hero Portrait, 0.92 }
                            ↓
  [ ✨ Suggested App ─────────────────────────── ]
  [  Pet Hero Portrait · 92% match               ]
  [  "Upload a pet, pick a persona, get a hero   ]
  [   portrait." [ Use this App ] [ Dismiss ]    ]

User clicks "Use this App"
  → toolbar flips to Image mode + Pet Portrait model
  → chat history stays visible above
  → AppWizard renders in the composer area (blank, step 1)
```

If confidence < threshold (0.6), no card is shown — silent.
If the user dismisses, suppress further suggestions for that same skill in this session.

## Implementation

### 1. Reuse existing `suggestApp` server fn

Already built in `src/lib/app-suggest.functions.ts` (used by /projects). No backend changes.

### 2. Run suggester in parallel with `handleSend`

In `src/routes/_authenticated/studio.$projectId.tsx`, when `studioMode === "agent"` and the user submits a prompt:
- Fire `suggestApp({ intent })` alongside the existing agent call (not awaited inline — let it resolve independently).
- On result with `confidence >= 0.6` and `skillId` not in a `dismissed` set, store as `pendingSuggestion` state.

Cost note: this doubles LLM calls in agent mode. Acceptable for now (Gemini Flash, small catalog) — we can debounce later if it shows up in usage.

### 3. New `SuggestionCard` component in the chat stream

Rendered inline in the message list as a pseudo-message (not persisted to `project_messages`). Lives next to the latest assistant reply.
- Shows app icon, label, confidence %, one-line reason from the suggester.
- Buttons: **Use this App** (primary) and **Dismiss**.

### 4. Accept → switch + open wizard with history preserved

Currently `showWizard` requires `history.length === 0`. Change to also open when a `forceWizard` flag is set:

```ts
const showWizard =
  !busy && !activeCard && skill !== null && studioMode !== "agent" &&
  (history.length === 0 || forceWizard);
```

On accept:
1. `onToolbarChange({ mode: skill.kind, model: skill.model })` — flips toolbar and persists via existing `updateProjectStudioPrefs`.
2. `setForceWizard(true)` — opens the wizard even though history exists.
3. Clear `pendingSuggestion`.

The chat history stays scrollable above; the wizard takes over the composer. When the wizard submits, `forceWizard` resets so subsequent prompts use the normal PromptInput.

### 5. Dismiss behavior

`setDismissedSkills(prev => new Set(prev).add(skillId))` — prevents the same App from re-appearing this session. Other matches still surface.

### 6. Mode change cancels stale suggestions

If the user changes mode manually while a suggestion is pending, clear `pendingSuggestion`.

## Files touched

- `src/components/studio/suggestion-card.tsx` — new, ~40 lines.
- `src/routes/_authenticated/studio.$projectId.tsx` — wire parallel `suggestApp` call, add `pendingSuggestion` / `dismissedSkills` / `forceWizard` state, render card in chat stream, relax `showWizard` condition.

No DB changes, no new server fns, no toolbar changes.

## Open follow-ups (not in scope here)

- **Cheaper trigger**: keyword pre-filter on the client to skip the LLM call for short/non-intent prompts.
- **Prefill the wizard** from chat content (the "wow" option you skipped) — easy to layer on later by passing extracted values into `AppWizard`.
- **Persisted dismissals**: today dismissals are session-local; could store on the project.
