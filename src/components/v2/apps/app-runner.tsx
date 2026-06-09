import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, ImageIcon, FolderPlus, Check } from "lucide-react";
import type { Skill } from "@/lib/skills";
import { DEFAULT_MODEL_BY_KIND } from "@/lib/skills";
import { getRecipeForSkill } from "@/lib/app-recipes";
import { AppWizard } from "@/components/studio/app-wizard";
import {
  directGenerateStart,
  directGeneratePoll,
} from "@/lib/generate.functions";
import {
  createProject,
  updateProjectState,
} from "@/lib/projects.functions";
import type { ProjectAsset } from "@/lib/project-state";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

type RunResult = {
  assetId: string;
  assetUrl: string;
  mime: string;
  projectId: string;
};

export function AppRunner({
  skill,
  projectId: existingProjectId,
  onBack,
  onResult,
}: {
  skill: Skill;
  projectId?: string;
  onBack: () => void;
  onResult?: () => void;
}) {
  const recipe = getRecipeForSkill(skill);
  const runStart = useServerFn(directGenerateStart);
  const runPoll = useServerFn(directGeneratePoll);
  const createProj = useServerFn(createProject);
  const updateState = useServerFn(updateProjectState);
  const qc = useQueryClient();

  // We need a project id to upload to. If we don't have one yet, lazily create
  // a draft one so wizard uploads have somewhere to live.
  const [draftProjectId, setDraftProjectId] = useState<string | null>(
    existingProjectId ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "starting" | "polling" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const ensureProject = async (): Promise<string> => {
    if (draftProjectId) return draftProjectId;
    const out = await createProj({
      data: {
        title: skill.label,
        skill: skill.id,
        studioMode: skill.kind,
        studioModel: skill.model,
      },
    });
    setDraftProjectId(out.id);
    return out.id;
  };

  const handleSubmit = async ({
    prompt,
    assets,
  }: {
    prompt: string;
    assets: ProjectAsset[];
  }) => {
    setError(null);
    setBusy(true);
    setPhase("starting");
    try {
      const projectId = await ensureProject();
      const userId = crypto.randomUUID();
      const assistantId = crypto.randomUUID();
      const refUrls = assets
        .filter((a) => a.mime.startsWith("image/"))
        .map((a) => a.url)
        .filter((u) => /^https?:/.test(u));

      const started = await runStart({
        data: {
          projectId,
          prompt,
          mode: skill.kind,
          model: skill.model || DEFAULT_MODEL_BY_KIND[skill.kind],
          userMessageId: userId,
          assistantMessageId: assistantId,
          referenceImageUrls: refUrls.length ? refUrls : undefined,
        },
      });
      if (!started.ok) {
        throw new Error(started.assistantText ?? "Failed to start");
      }
      setPhase("polling");

      const deadline = Date.now() + 10 * 60_000;
      let finalAsset: { assetId: string; assetUrl: string; mime: string } | null =
        null;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3000));
        const tick = await runPoll({
          data: {
            projectId,
            mode: skill.kind,
            model: skill.model || DEFAULT_MODEL_BY_KIND[skill.kind],
            prompt,
            assistantMessageId: assistantId,
            statusUrl: started.statusUrl,
            responseUrl: started.responseUrl,
          },
        });
        if (tick.status === "done") {
          if (tick.ok) {
            const t = tick as { assetId: string; assetUrl: string; mime: string };
            finalAsset = { assetId: t.assetId, assetUrl: t.assetUrl, mime: t.mime };
          } else {
            const t = tick as { error?: string; assistantText?: string };
            throw new Error(t.assistantText ?? t.error ?? "Generation failed");
          }
          break;
        }
      }
      if (!finalAsset) throw new Error("Generation timed out.");

      // Also append a Scene so the asset shows up on the project's timeline.
      const isVisual =
        finalAsset.mime.startsWith("image/") || finalAsset.mime.startsWith("video/");
      if (isVisual) {
        try {
          await updateState({
            data: {
              id: projectId,
              patch: {
                scenesAppend: [
                  {
                    title: prompt.slice(0, 60) || skill.label,
                    prompt,
                    duration: 5,
                    thumb: finalAsset.assetId,
                    clipUrl: finalAsset.mime.startsWith("video/")
                      ? finalAsset.assetUrl
                      : undefined,
                    status: "ready",
                  },
                ],
              },
            },
          });
        } catch (e) {
          console.error("[v2] scene append failed", e);
        }
      }

      setResult({
        ...finalAsset,
        projectId,
      });
      setPhase("done");
      onResult?.();
      // Refresh library + projects so the new asset appears everywhere.
      void qc.invalidateQueries({ queryKey: ["v2-library"] });
      void qc.invalidateQueries({ queryKey: ["v2-library-picker"] });
      void qc.invalidateQueries({ queryKey: ["v2-projects"] });
      void qc.invalidateQueries({ queryKey: ["v2-project", projectId] });
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const Icon = skill.icon;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border/50 px-5 py-3">
        <button
          onClick={onBack}
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-primary-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{skill.label}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {skill.category}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* If we just finished, show a compact "done" card with actions */}
        {phase === "done" && result ? (
          <ResultPanel
            result={result}
            onReset={() => {
              setResult(null);
              setPhase("idle");
            }}
          />
        ) : (
          <>
            {phase === "polling" || phase === "starting" ? (
              <div className="grid place-items-center rounded-3xl border border-border/60 bg-muted/30 p-8 text-sm text-muted-foreground">
                <Loader2 className="mb-3 h-6 w-6 animate-spin" />
                {phase === "starting" ? "Submitting…" : "Generating… this can take a minute or two."}
              </div>
            ) : (
              <AppWizard
                recipe={recipe}
                projectId={draftProjectId ?? "00000000-0000-0000-0000-000000000000"}
                busy={busy}
                onSubmit={handleSubmit}
              />
            )}
            {error && (
              <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  onReset,
}: {
  result: RunResult;
  onReset: () => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-elegant">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Check className="h-4 w-4 text-emerald-600" /> Result ready
      </div>
      <div className="overflow-hidden rounded-2xl bg-muted/40">
        {result.mime.startsWith("image/") ? (
          <img src={result.assetUrl} alt="" className="w-full" />
        ) : result.mime.startsWith("video/") ? (
          <video src={result.assetUrl} className="w-full" controls autoPlay loop />
        ) : (
          <div className="grid place-items-center p-12 text-3xl text-muted-foreground">
            ♪
            <audio src={result.assetUrl} controls className="mt-4 w-full" />
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild>
          <Link
            to="/v2/projects"
            search={{ p: result.projectId }}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Open in project
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/v2/library">
            <ImageIcon className="mr-2 h-4 w-4" />
            View in library
          </Link>
        </Button>
        <Button variant="ghost" onClick={onReset}>
          Run again
        </Button>
      </div>
    </div>
  );
}
