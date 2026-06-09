import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, X } from "lucide-react";
import { z } from "zod";
import { SKILLS, SKILL_BY_ID, type Skill, DEFAULT_MODEL_BY_KIND } from "@/lib/skills";
import { AppRunner, type AppRunResult } from "@/components/v2/apps/app-runner";
import { AppResultView } from "@/components/v2/apps/app-result-view";
import { HowItWorksV2 } from "@/components/v2/apps/how-it-works";
import {
  directGenerateStart,
  directGeneratePoll,
} from "@/lib/generate.functions";
import { updateProjectState } from "@/lib/projects.functions";
import type { ProjectAsset } from "@/lib/project-state";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  app: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated-v2/v2/apps")({
  validateSearch: searchSchema,
  component: AppsV2,
});

const TABS = [
  "Featured",
  "Photo",
  "Video",
  "Image",
  "Marketing",
  "Audio",
  "Voice",
] as const;
type Tab = (typeof TABS)[number];

function tabMatches(skill: Skill, tab: Tab): boolean {
  if (tab === "Featured") return skill.id.startsWith("app-");
  if (tab === "Photo") return skill.category === "Photo Apps";
  if (tab === "Video")
    return skill.category === "Video Apps" || skill.category === "Video";
  if (tab === "Image") return skill.category === "Image";
  if (tab === "Marketing") return skill.category === "Marketing Apps";
  if (tab === "Audio")
    return skill.category === "Audio Apps" || skill.category === "Music";
  if (tab === "Voice")
    return skill.category === "Voice Apps" || skill.category === "Speech";
  return true;
}

type RunStatus =
  | { phase: "idle" }
  | {
      phase: "starting" | "polling";
      skill: Skill;
      projectId: string;
      prompt: string;
    }
  | {
      phase: "error";
      skill: Skill;
      projectId: string;
      prompt: string;
      error: string;
    };

function AppsV2() {
  const { app: appId, projectId } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const runStart = useServerFn(directGenerateStart);
  const runPoll = useServerFn(directGeneratePoll);
  const updateState = useServerFn(updateProjectState);

  const [tab, setTab] = useState<Tab>("Featured");
  const [hovered, setHovered] = useState<Skill | null>(null);
  const [run, setRun] = useState<RunStatus>({ phase: "idle" });
  const [result, setResult] = useState<AppRunResult | null>(null);

  const filtered = useMemo(() => SKILLS.filter((s) => tabMatches(s, tab)), [tab]);
  const selected: Skill | null = appId ? SKILL_BY_ID[appId] ?? null : null;
  const showcase = selected ?? hovered ?? filtered[0] ?? null;

  const isRunning = run.phase === "starting" || run.phase === "polling";

  const selectApp = (s: Skill | null) => {
    void navigate({
      to: "/v2/apps",
      search: { app: s?.id, projectId },
    });
  };

  const setProjectIdInUrl = (id: string) => {
    if (projectId === id) return;
    void navigate({
      to: "/v2/apps",
      search: { app: appId, projectId: id },
      replace: true,
    });
  };

  const startRun = async ({
    skill,
    projectId: pid,
    prompt,
    assets,
  }: {
    skill: Skill;
    projectId: string;
    prompt: string;
    assets: ProjectAsset[];
  }) => {
    // Clear previous result so the new generating view takes over.
    setResult(null);
    setRun({ phase: "starting", skill, projectId: pid, prompt });
    setProjectIdInUrl(pid);

    try {
      const userId = crypto.randomUUID();
      const assistantId = crypto.randomUUID();
      const refUrls = assets
        .filter((a) => a.mime.startsWith("image/"))
        .map((a) => a.url)
        .filter((u) => /^https?:/.test(u));

      const started = await runStart({
        data: {
          projectId: pid,
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
      setRun({ phase: "polling", skill, projectId: pid, prompt });

      const deadline = Date.now() + 10 * 60_000;
      let finalAsset: { assetId: string; assetUrl: string; mime: string } | null =
        null;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3000));
        const tick = await runPoll({
          data: {
            projectId: pid,
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

      const isVisual =
        finalAsset.mime.startsWith("image/") ||
        finalAsset.mime.startsWith("video/");
      if (isVisual) {
        try {
          await updateState({
            data: {
              id: pid,
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

      setResult({ ...finalAsset, projectId: pid, prompt });
      setRun({ phase: "idle" });
      void qc.invalidateQueries({ queryKey: ["v2-library"] });
      void qc.invalidateQueries({ queryKey: ["v2-library-picker"] });
      void qc.invalidateQueries({ queryKey: ["v2-projects"] });
      void qc.invalidateQueries({ queryKey: ["v2-project", pid] });
    } catch (e) {
      setRun((prev) => {
        if (prev.phase === "idle") return prev;
        return {
          phase: "error",
          skill: prev.skill,
          projectId: prev.projectId,
          prompt: prev.prompt,
          error: e instanceof Error ? e.message : String(e),
        };
      });
    }
  };

  // If user switches to a new app, hide the stale "result" pane so the
  // showcase / new run takes over the right column.
  useEffect(() => {
    if (result && selected && result.projectId !== projectId) {
      setResult(null);
    }
  }, [selected, projectId, result]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Middle column */}
      <div className="flex w-[420px] shrink-0 flex-col border-r border-border/50 bg-card/30">
        {selected ? (
          <AppRunner
            skill={selected}
            projectId={projectId}
            busy={isRunning}
            onBack={() => selectApp(null)}
            onProjectReady={(id) => setProjectIdInUrl(id)}
            onStartRun={(args) => void startRun(args)}
          />
        ) : (
          <>
            <header className="border-b border-border/50 px-5 pb-3 pt-6">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Apps
              </h1>
              {projectId && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Adding to current project · pick another app to add more
                  media.
                </p>
              )}
              <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition",
                      tab === t
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectApp(s)}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(null)}
                      className="group flex flex-col items-start gap-2 rounded-2xl border border-border/60 bg-card p-3 text-left transition hover:border-foreground/40 hover:shadow-elegant"
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-primary-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-sm font-semibold leading-tight text-foreground">
                        {s.label}
                      </div>
                      <div className="line-clamp-2 text-[11px] text-muted-foreground">
                        {s.description}
                      </div>
                    </button>
                  );
                })}
              </div>
              {filtered.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No apps in this category yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right column — generating, result, or how-it-works */}
      <div className="flex-1 overflow-y-auto bg-background">
        {isRunning && run.phase !== "idle" ? (
          <GeneratingView
            skill={run.skill}
            prompt={run.prompt}
            phase={run.phase}
            onBackToApps={() => selectApp(null)}
          />
        ) : run.phase === "error" ? (
          <ErrorView
            skill={run.skill}
            error={run.error}
            onDismiss={() => setRun({ phase: "idle" })}
          />
        ) : result ? (
          <AppResultView
            result={result}
            skill={selected ?? SKILL_BY_ID[result.projectId] ?? showcase!}
            onRunAgain={() => setResult(null)}
          />
        ) : showcase ? (
          <HowItWorksV2 skill={showcase} />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Pick an app to get started.
          </div>
        )}
      </div>
    </div>
  );
}

function GeneratingView({
  skill,
  prompt,
  phase,
  onBackToApps,
}: {
  skill: Skill;
  prompt: string;
  phase: "starting" | "polling";
  onBackToApps: () => void;
}) {
  const Icon = skill.icon;
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-8 py-12 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-pulse rounded-3xl bg-brand-gradient opacity-30 blur-2xl" />
        <div className="relative grid h-24 w-24 place-items-center rounded-3xl bg-brand-gradient text-primary-foreground shadow-elegant">
          <Sparkles className="h-10 w-10" />
        </div>
      </div>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {skill.label}
      </div>
      <h2 className="font-display text-3xl font-semibold tracking-tight">
        {phase === "starting" ? "Submitting your job…" : "Generating…"}
      </h2>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        This usually takes a minute or two. You can pick another app and queue
        more media in the same project — this one keeps running.
      </p>
      {prompt && (
        <p className="mt-6 line-clamp-3 max-w-xl rounded-2xl border border-border/60 bg-card px-4 py-3 text-xs italic text-muted-foreground">
          “{prompt}”
        </p>
      )}
      <div className="mt-8 flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {phase === "starting" ? "Starting" : "Working"}
        </div>
        <span className="text-muted-foreground/40">·</span>
        <button
          type="button"
          onClick={onBackToApps}
          className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
        >
          Browse more apps
        </button>
      </div>
    </div>
  );
}

function ErrorView({
  skill,
  error,
  onDismiss,
}: {
  skill: Skill;
  error: string;
  onDismiss: () => void;
}) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-8 py-12 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <X className="h-6 w-6" />
      </div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        {skill.label} failed
      </h2>
      <p className="mt-3 max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-6 text-xs font-medium text-foreground underline-offset-4 hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}
