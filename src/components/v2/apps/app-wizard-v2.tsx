import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, Upload as UploadIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadProjectAsset } from "@/lib/projects.functions";
import type { AppRecipe, AppStep } from "@/lib/app-recipes";
import { composePrompt } from "@/lib/app-recipes";
import type { AssetKind, ProjectAsset } from "@/lib/project-state";
import {
  AssetPickerDialog,
  type PickerAccept,
  type PickerResult,
} from "@/components/v2/apps/asset-picker-dialog";

type StepInputs = Record<string, string>;
type StepUploads = Record<string, ProjectAsset[]>;

function pickerAcceptFor(accept: AppStep["accept"]): PickerAccept {
  if (accept === "image" || accept === "video" || accept === "audio")
    return accept;
  return "any";
}


function kindForUpload(accept: AppStep["accept"]): AssetKind {
  if (accept === "audio") return "audio";
  if (accept === "video") return "video";
  return "reference";
}

async function fileToProjectAsset(
  file: File,
  projectId: string,
  accept: AppStep["accept"],
): Promise<ProjectAsset> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const bytesB64 = btoa(bin);
  return uploadProjectAsset({
    data: {
      projectId,
      kind: kindForUpload(accept),
      mime: file.type || "application/octet-stream",
      name: file.name,
      bytesB64,
    },
  });
}

function describeUpload(assets: ProjectAsset[]): string {
  if (!assets.length) return "(no file attached)";
  return assets.map((a) => a.name).join(", ");
}

export function AppWizardV2({
  recipe,
  projectId,
  busy,
  onSubmit,
}: {
  recipe: AppRecipe;
  projectId: string;
  busy: boolean;
  onSubmit: (args: { prompt: string; assets: ProjectAsset[] }) => void;
}) {
  const interactive = useMemo(
    () => recipe.steps.filter((s) => s.kind !== "generate"),
    [recipe],
  );
  const terminal = recipe.steps[recipe.steps.length - 1];

  const [inputs, setInputs] = useState<StepInputs>({});
  const [uploads, setUploads] = useState<StepUploads>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [pickerStepId, setPickerStepId] = useState<string | null>(null);

  const stepIsComplete = (step: AppStep): boolean => {
    if (step.kind === "upload") return (uploads[step.id] ?? []).length > 0;
    return (inputs[step.id] ?? "").trim().length > 0;
  };
  const canSubmit = interactive.every(stepIsComplete);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const uploadsLabel: Record<string, string> = {};
    for (const [id, list] of Object.entries(uploads))
      uploadsLabel[id] = describeUpload(list);
    const prompt = composePrompt(recipe, inputs, uploadsLabel);
    const allAssets = Object.values(uploads).flat();
    onSubmit({ prompt, assets: allAssets });
  };

  const handlePicked = async (step: AppStep, result: PickerResult) => {
    if (result.kind === "library") {
      setUploads((prev) => ({
        ...prev,
        [step.id]: [...(prev[step.id] ?? []), ...result.assets],
      }));
      return;
    }
    setUploadingId(step.id);
    try {
      const out: ProjectAsset[] = [];
      for (const f of result.files) {
        out.push(await fileToProjectAsset(f, projectId, step.accept));
      }
      setUploads((prev) => ({
        ...prev,
        [step.id]: [...(prev[step.id] ?? []), ...out],
      }));
    } catch (err) {
      console.error("[app-wizard-v2] upload failed", err);
    } finally {
      setUploadingId(null);
    }
  };

  const removeUpload = (stepId: string, assetId: string) => {
    setUploads((prev) => ({
      ...prev,
      [stepId]: (prev[stepId] ?? []).filter((a) => a.id !== assetId),
    }));
  };

  if (interactive.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card p-5">
        <Button
          className="w-full"
          disabled={busy}
          onClick={() =>
            onSubmit({ prompt: composePrompt(recipe, {}, {}), assets: [] })
          }
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {terminal?.title ?? "Generate"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {interactive.map((step) => {
        const value = inputs[step.id] ?? "";
        const stepUploads = uploads[step.id] ?? [];
        return (
          <section
            key={step.id}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="mb-3">
              <div className="text-sm font-semibold text-foreground">
                {step.title}
              </div>
              {step.desc && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {step.desc}
                </div>
              )}
            </div>

            {step.kind === "upload" && (
              <div>
                <button
                  type="button"
                  onClick={() => setPickerStepId(step.id)}
                  disabled={uploadingId === step.id}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/40 px-4 py-6 text-sm text-muted-foreground transition hover:border-primary/60 hover:text-foreground disabled:opacity-60"
                >
                  {uploadingId === step.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <UploadIcon className="h-4 w-4" />
                      {stepUploads.length
                        ? "Add another file"
                        : "Choose a file"}
                    </>
                  )}
                </button>
                <AssetPickerDialog
                  open={pickerStepId === step.id}
                  onOpenChange={(v) =>
                    setPickerStepId(v ? step.id : null)
                  }
                  accept={pickerAcceptFor(step.accept)}
                  multiple
                  onPick={(result) => void handlePicked(step, result)}
                />
                {stepUploads.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {stepUploads.map((a) => (
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
                            {a.mime.startsWith("audio/")
                              ? "♪"
                              : a.mime.startsWith("video/")
                                ? "▶"
                                : "•"}
                          </div>
                        )}
                        <span className="max-w-[140px] truncate text-foreground">
                          {a.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeUpload(step.id, a.id)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                          aria-label="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step.kind === "choice" && (
              <div className="flex flex-col gap-3">
                {step.options && step.options.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {step.options.map((opt) => {
                      const active = value === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setInputs((prev) => ({ ...prev, [step.id]: opt }))
                          }
                          className={
                            "rounded-full border px-3 py-1.5 text-xs transition " +
                            (active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:border-primary/50")
                          }
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}
                <input
                  type="text"
                  value={value}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [step.id]: e.target.value }))
                  }
                  placeholder={
                    step.options?.length ? "Or describe your own…" : "Type your choice…"
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            )}

            {step.kind === "prompt" && (
              <textarea
                value={value}
                onChange={(e) =>
                  setInputs((prev) => ({ ...prev, [step.id]: e.target.value }))
                }
                placeholder={step.placeholder ?? "Type here…"}
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            )}
          </section>
        );
      })}

      <Button
        type="button"
        size="lg"
        onClick={handleSubmit}
        disabled={!canSubmit || busy || !!uploadingId}
        className="w-full"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {terminal?.title ?? "Generate"}
      </Button>
    </div>
  );
}
