import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, Upload as UploadIcon, X, Image as ImageIcon, Video as VideoIcon, Music as MusicIcon, Mic as MicIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadProjectAsset } from "@/lib/projects.functions";
import type { ProjectAsset } from "@/lib/project-state";
import {
  SKILLS_BY_KIND,
  DEFAULT_MODEL_BY_KIND,
  type SkillKind,
} from "@/lib/skills";
import {
  paramsFor,
  defaultValuesFor,
  type ParamControl,
} from "@/lib/model-params";
import {
  AssetPickerDialog,
  type PickerResult,
} from "@/components/v2/apps/asset-picker-dialog";
import { cn } from "@/lib/utils";

const MODES: { id: SkillKind; label: string; icon: typeof ImageIcon }[] = [
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "video", label: "Video", icon: VideoIcon },
  { id: "audio", label: "Audio", icon: MusicIcon },
  { id: "speech", label: "Voice", icon: MicIcon },
];

async function fileToProjectAsset(
  file: File,
  projectId: string,
): Promise<ProjectAsset> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const bytesB64 = btoa(bin);
  return uploadProjectAsset({
    data: {
      projectId,
      kind: "reference",
      mime: file.type || "application/octet-stream",
      name: file.name,
      bytesB64,
    },
  });
}

export type CreateSubmit = {
  mode: SkillKind;
  model: string;
  prompt: string;
  assets: ProjectAsset[];
  params: Record<string, string | number | boolean>;
};

export function CreateAppWizard({
  projectId,
  busy,
  seedPrompt,
  seedMode,
  seedModel,
  seedAsset,
  onSeedConsumed,
  onSubmit,
}: {
  projectId: string;
  busy: boolean;
  seedPrompt?: string;
  seedMode?: SkillKind;
  seedModel?: string;
  seedAsset?: ProjectAsset | null;
  onSeedConsumed?: () => void;
  onSubmit: (args: CreateSubmit) => void;
}) {
  const [mode, setMode] = useState<SkillKind>(seedMode ?? "image");
  const [model, setModel] = useState<string>(
    seedModel ?? DEFAULT_MODEL_BY_KIND[seedMode ?? "image"],
  );
  const [prompt, setPrompt] = useState<string>(seedPrompt ?? "");
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [params, setParams] = useState<Record<string, string | number | boolean>>(
    () => defaultValuesFor(seedModel ?? DEFAULT_MODEL_BY_KIND[seedMode ?? "image"]),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Seed asset (e.g. "Use in app").
  const seededRef = useRef<string | null>(null);
  useEffect(() => {
    if (!seedAsset) return;
    if (seededRef.current === seedAsset.id) return;
    seededRef.current = seedAsset.id;
    setAssets((prev) => [...prev, seedAsset]);
    onSeedConsumed?.();
  }, [seedAsset, onSeedConsumed]);

  // Available models for the current mode.
  const MODEL_CATEGORIES = new Set(["Image", "Video", "Music", "Speech"]);
  const models = useMemo(
    () => SKILLS_BY_KIND(mode).filter((s) => MODEL_CATEGORIES.has(s.category)),
    [mode],
  );
  const controls = useMemo(() => paramsFor(model), [model]);

  const handleModeChange = (next: SkillKind) => {
    setMode(next);
    const nextModel = DEFAULT_MODEL_BY_KIND[next];
    setModel(nextModel);
    setParams(defaultValuesFor(nextModel));
  };

  const handleModelChange = (next: string) => {
    setModel(next);
    setParams(defaultValuesFor(next));
  };

  const handlePicked = async (result: PickerResult) => {
    if (result.kind === "library") {
      setAssets((prev) => [...prev, ...result.assets]);
      return;
    }
    setUploading(true);
    try {
      const out: ProjectAsset[] = [];
      for (const f of result.files) {
        out.push(await fileToProjectAsset(f, projectId));
      }
      setAssets((prev) => [...prev, ...out]);
    } catch (err) {
      console.error("[create-app] upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const removeAsset = (id: string) =>
    setAssets((prev) => prev.filter((a) => a.id !== id));

  const canSubmit = prompt.trim().length > 0;
  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ mode, model, prompt: prompt.trim(), assets, params });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Mode tabs */}
      <div className="flex gap-1 border-b border-border/50 px-4 pb-3 pt-4">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Reference uploads */}
        {mode !== "audio" && mode !== "speech" && (
          <div className="mb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                disabled={uploading}
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/30 text-[10px] text-muted-foreground transition hover:border-primary/60 hover:text-foreground disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UploadIcon className="h-4 w-4" />
                    Reference
                  </>
                )}
              </button>
              {assets.map((a) => (
                <div
                  key={a.id}
                  className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40"
                >
                  {a.mime.startsWith("image/") ? (
                    <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                      {a.mime.startsWith("video/") ? "▶" : "•"}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAsset(a.id)}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-background/80 text-foreground opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <AssetPickerDialog
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              accept="image"
              multiple
              onPick={(result) => void handlePicked(result)}
            />
          </div>
        )}

        {/* Prompt */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            mode === "speech"
              ? "Paste the text you want spoken…"
              : mode === "audio"
                ? "Describe the music or sound — genre, tempo, instruments, mood…"
                : mode === "video"
                  ? "Describe your shot — subject, motion, camera, atmosphere…"
                  : "Describe your shot, add image references, or sketch a scene."
          }
          rows={8}
          className="min-h-[180px] w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>

      {/* Bottom bar: params + model + generate */}
      <div className="border-t border-border/50 bg-card/40 px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {controls.map((c) => (
            <ParamChip
              key={c.key}
              control={c}
              value={params[c.key]}
              onChange={(v) => setParams((prev) => ({ ...prev, [c.key]: v }))}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
            className="min-w-0 flex-1 truncate rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-primary"
          >
            {models.map((s) => (
              <option key={s.id} value={s.model}>
                {s.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || busy || uploading}
            className="shrink-0"
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}

function ParamChip({
  control,
  value,
  onChange,
}: {
  control: ParamControl;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  if (control.type === "select") {
    return (
      <label className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1 text-[11px] font-medium">
        <span className="text-muted-foreground">{control.label}</span>
        <select
          value={String(value ?? control.default)}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-foreground outline-none"
        >
          {control.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (control.type === "slider") {
    const v = typeof value === "number" ? value : control.default;
    return (
      <label className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium">
        <span className="text-muted-foreground">{control.label}</span>
        <input
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 w-20 accent-primary"
        />
        <span className="tabular-nums text-foreground">
          {v}
          {control.unit ?? ""}
        </span>
      </label>
    );
  }
  const v = typeof value === "boolean" ? value : control.default;
  return (
    <button
      type="button"
      onClick={() => onChange(!v)}
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-medium transition",
        v
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground",
      )}
    >
      {control.label}
    </button>
  );
}
