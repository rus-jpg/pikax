import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Upload as UploadIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Skill } from "@/lib/skills";
import { paramsFor, defaultValuesFor } from "@/lib/model-params";
import { uploadProjectAsset } from "@/lib/projects.functions";
import type { AssetKind, ProjectAsset } from "@/lib/project-state";
import {
  AssetPickerDialog,
  type PickerAccept,
  type PickerResult,
} from "@/components/v2/apps/asset-picker-dialog";

// Models that REQUIRE at least one reference attachment to run.
const REQUIRES_REFERENCE = new Set<string>([
  "fal-ai/nano-banana/edit",
  "fal-ai/kling-video/v2.1/standard/image-to-video",
]);

// What kind of attachment a given model accepts (for the picker).
function referenceAcceptFor(kind: Skill["kind"]): PickerAccept {
  if (kind === "video") return "image"; // image-to-video uses still images
  if (kind === "audio") return "audio";
  return "image";
}

function uploadKindFor(kind: Skill["kind"]): AssetKind {
  if (kind === "audio") return "audio";
  if (kind === "video") return "reference"; // still image input
  return "reference";
}

async function fileToProjectAsset(
  file: File,
  projectId: string,
  kind: AssetKind,
): Promise<ProjectAsset> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const bytesB64 = btoa(bin);
  return uploadProjectAsset({
    data: {
      projectId,
      kind,
      mime: file.type || "application/octet-stream",
      name: file.name,
      bytesB64,
    },
  });
}

function promptPlaceholderFor(skill: Skill): string {
  switch (skill.kind) {
    case "video":
      return "Describe the shot — subject, action, camera, lighting, mood…";
    case "audio":
      return "Describe the music or sound — genre, tempo, instruments, mood…";
    case "speech":
      return "Paste the text you want spoken…";
    default:
      return "Describe what you want to see — subject, style, composition…";
  }
}

function promptLabelFor(kind: Skill["kind"]): string {
  if (kind === "speech") return "Script";
  return "Prompt";
}

export function ModelAppPanel({
  skill,
  projectId,
  busy,
  seedAsset,
  onSeedConsumed,
  onSubmit,
}: {
  skill: Skill;
  projectId: string;
  busy: boolean;
  seedAsset?: ProjectAsset | null;
  onSeedConsumed?: () => void;
  onSubmit: (args: {
    prompt: string;
    assets: ProjectAsset[];
    params: Record<string, string | number | boolean>;
  }) => void;
}) {
  const controls = paramsFor(skill.model);
  const requiresRef = REQUIRES_REFERENCE.has(skill.model);
  const refAccept = referenceAcceptFor(skill.kind);

  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState<ProjectAsset[]>([]);
  const [values, setValues] = useState<Record<string, string | number | boolean>>(
    () => defaultValuesFor(skill.model),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Reset when model changes.
  useEffect(() => {
    setPrompt("");
    setReferences([]);
    setValues(defaultValuesFor(skill.model));
  }, [skill.model]);

  // Drop seed asset into references if relevant.
  const seededRef = useRef<string | null>(null);
  useEffect(() => {
    if (!seedAsset) return;
    if (seededRef.current === seedAsset.id) return;
    seededRef.current = seedAsset.id;
    setReferences((prev) => [...prev, seedAsset]);
    onSeedConsumed?.();
  }, [seedAsset, onSeedConsumed]);

  const handlePicked = async (result: PickerResult) => {
    if (result.kind === "library") {
      setReferences((prev) => [...prev, ...result.assets]);
      return;
    }
    setUploading(true);
    try {
      const out: ProjectAsset[] = [];
      for (const f of result.files) {
        out.push(
          await fileToProjectAsset(f, projectId, uploadKindFor(skill.kind)),
        );
      }
      setReferences((prev) => [...prev, ...out]);
    } catch (err) {
      console.error("[model-app-panel] upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const removeRef = (id: string) =>
    setReferences((prev) => prev.filter((a) => a.id !== id));

  const canSubmit =
    prompt.trim().length > 0 && (!requiresRef || references.length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ prompt: prompt.trim(), assets: references, params: values });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Prompt */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-sm font-semibold text-foreground">
            {promptLabelFor(skill.kind)}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {skill.model}
          </div>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={promptPlaceholderFor(skill)}
          rows={skill.kind === "speech" ? 6 : 4}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </section>

      {/* References */}
      {skill.kind !== "speech" && skill.kind !== "audio" && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="text-sm font-semibold text-foreground">
              {requiresRef ? "Input image" : "Reference attachments"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {requiresRef ? "required" : "optional"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/40 px-4 py-5 text-sm text-muted-foreground transition hover:border-primary/60 hover:text-foreground disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <UploadIcon className="h-4 w-4" />
                {references.length ? "Add another" : "Attach an image"}
              </>
            )}
          </button>
          <AssetPickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            accept={refAccept}
            multiple
            onPick={(r) => void handlePicked(r)}
          />
          {references.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {references.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2 pr-3 text-xs"
                >
                  {a.mime.startsWith("image/") ? (
                    <img
                      src={a.url}
                      alt={a.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                      •
                    </div>
                  )}
                  <span className="max-w-[140px] truncate text-foreground">
                    {a.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRef(a.id)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Parameter controls */}
      {controls.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">
            Settings
          </div>
          <div className="flex flex-col gap-4">
            {controls.map((c) => {
              const v = values[c.key];
              if (c.type === "select") {
                return (
                  <div key={c.key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {c.label}
                    </label>
                    <select
                      value={String(v ?? c.default)}
                      onChange={(e) =>
                        setValues((p) => ({ ...p, [c.key]: e.target.value }))
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    >
                      {c.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              if (c.type === "slider") {
                const num = typeof v === "number" ? v : c.default;
                return (
                  <div key={c.key} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">
                        {c.label}
                      </label>
                      <span className="font-mono text-xs text-foreground">
                        {num}
                        {c.unit ?? ""}
                      </span>
                    </div>
                    <Slider
                      value={[num]}
                      min={c.min}
                      max={c.max}
                      step={c.step}
                      onValueChange={(arr) =>
                        setValues((p) => ({ ...p, [c.key]: arr[0] }))
                      }
                    />
                  </div>
                );
              }
              // toggle
              return (
                <label
                  key={c.key}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {c.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(v)}
                    onChange={(e) =>
                      setValues((p) => ({ ...p, [c.key]: e.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                </label>
              );
            })}
          </div>
        </section>
      )}

      <Button
        type="button"
        size="lg"
        onClick={handleSubmit}
        disabled={!canSubmit || busy || uploading}
        className="w-full"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Generate
      </Button>
    </div>
  );
}
