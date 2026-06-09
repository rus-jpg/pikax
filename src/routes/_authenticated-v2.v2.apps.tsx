import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { SKILLS, SKILL_BY_ID, type Skill, DEFAULT_MODEL_BY_KIND } from "@/lib/skills";
import { AppRunner } from "@/components/v2/apps/app-runner";
import {
  ProjectOutputsPanel,
  type OutputMeta,
} from "@/components/v2/apps/project-outputs-panel";
import {
  directGenerateStart,
  directGeneratePoll,
} from "@/lib/generate.functions";
import {
  createProject,
  updateProjectState,
} from "@/lib/projects.functions";
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

type ActiveRun = {
  id: string;
  skill: Skill;
  projectId: string;
  prompt: string;
  phase: "starting" | "polling" | "error";
  error?: string;
};


function AppsV2() {
  const { app: appId, projectId } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const runStart = useServerFn(directGenerateStart);
  const runPoll = useServerFn(directGeneratePoll);
  const updateState = useServerFn(updateProjectState);
  const createProj = useServerFn(createProject);

  const [tab, setTab] = useState<Tab>("Featured");
  const [runs, setRuns] = useState<Record<string, ActiveRun>>({});
  const [outputMeta, setOutputMeta] = useState<Record<string, OutputMeta>>({});
  const [seedAsset, setSeedAsset] = useState<ProjectAsset | null>(null);

  const handleUseInApp = ({
    skill,
    asset,
  }: {
    skill: Skill;
    asset: ProjectAsset;
  }) => {
    setSeedAsset(asset);
    void navigate({
      to: "/v2/apps",
      search: { app: skill.id, projectId },
    });
  };


  const filtered = useMemo(() => SKILLS.filter((s) => tabMatches(s, tab)), [tab]);
  const selected: Skill | null = appId ? SKILL_BY_ID[appId] ?? null : null;

  const activeRuns = useMemo(() => Object.values(runs), [runs]);

  const selectApp = (s: Skill | null) => {
    void navigate({
      to: "/v2/apps",
      search: { app: s?.id, projectId },
    });
  };

  const setProjectIdInUrl = (id: string | undefined) => {
    void navigate({
      to: "/v2/apps",
      search: { app: appId, projectId: id },
      replace: true,
    });
  };

  const handleNewProject = () => {
    setProjectIdInUrl(undefined);
  };

  const dismissRun = (id: string) => {
    setRuns((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
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
    const runId = crypto.randomUUID();
    setRuns((prev) => ({
      ...prev,
      [runId]: { id: runId, skill, projectId: pid, prompt, phase: "starting" },
    }));
    setProjectIdInUrl(pid);

    const updatePhase = (phase: ActiveRun["phase"], error?: string) =>
      setRuns((prev) => {
        const cur = prev[runId];
        if (!cur) return prev;
        return { ...prev, [runId]: { ...cur, phase, error } };
      });

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
      updatePhase("polling");

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

      setOutputMeta((prev) => ({
        ...prev,
        [finalAsset!.assetId]: { prompt, skillId: skill.id },
      }));

      dismissRun(runId);
      void qc.invalidateQueries({ queryKey: ["v2-library"] });
      void qc.invalidateQueries({ queryKey: ["v2-library-picker"] });
      void qc.invalidateQueries({ queryKey: ["v2-projects"] });
      void qc.invalidateQueries({ queryKey: ["v2-project", pid] });
      void qc.invalidateQueries({ queryKey: ["v2-jobs"] });
    } catch (e) {
      updatePhase("error", e instanceof Error ? e.message : String(e));
    }
  };

  const handleRegenerate = async ({
    skill,
    prompt,
    projectId: pid,
  }: {
    skill: Skill;
    prompt: string;
    projectId: string;
  }) => {
    await startRun({ skill, projectId: pid, prompt, assets: [] });
  };


  const handleStartFromWizard = async ({
    skill,
    projectId: pidFromRunner,
    prompt,
    assets,
  }: {
    skill: Skill;
    projectId: string;
    prompt: string;
    assets: ProjectAsset[];
  }) => {
    // Always ensure we're running against the currently-selected project in
    // the URL. The runner returns whatever projectId it had; if there's none
    // (user clicked New Project), create one now.
    let pid = projectId ?? pidFromRunner;
    if (!pid) {
      const out = await createProj({
        data: {
          title: skill.label,
          skill: skill.id,
          studioMode: skill.kind,
          studioModel: skill.model,
        },
      });
      pid = out.id;
    }
    await startRun({ skill, projectId: pid, prompt, assets });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Middle column */}
      <div className="flex w-[420px] shrink-0 flex-col border-r border-border/50 bg-card/30">
        {selected ? (
          <AppRunner
            skill={selected}
            projectId={projectId}
            busy={false}
            seedAsset={seedAsset}
            onSeedConsumed={() => setSeedAsset(null)}
            onBack={() => selectApp(null)}
            onProjectReady={(id) => setProjectIdInUrl(id)}
            onStartRun={(args) => void handleStartFromWizard(args)}
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

      {/* Right column — project outputs view */}
      <div className="flex-1 overflow-hidden bg-background">
        <ProjectOutputsPanel
          projectId={projectId ?? activeRuns[0]?.projectId}
          activeRuns={activeRuns}
          outputMeta={outputMeta}
          onRegenerate={(args) => void handleRegenerate(args)}
          onUseInApp={handleUseInApp}
          onNewProject={handleNewProject}
          onDismissRun={dismissRun}
        />
      </div>
    </div>
  );
}

