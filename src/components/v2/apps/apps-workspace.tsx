import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";

import { SKILLS, SKILL_BY_ID, type Skill, DEFAULT_MODEL_BY_KIND } from "@/lib/skills";
import { AppRunner } from "@/components/v2/apps/app-runner";
import { HowItWorksV2 } from "@/components/v2/apps/how-it-works";
import {
  ProjectOutputsPanel,
  type OutputMeta,
} from "@/components/v2/apps/project-outputs-panel";
import { ProjectTimelinePanel } from "@/components/v2/apps/project-timeline-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
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
import { getAppSwatch } from "@/lib/app-swatch";




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
  intent?: TimelineIntent;
};

export type TimelineIntent =
  | { kind: "appendVisual" }
  | { kind: "appendAudio" }
  | { kind: "replaceClip"; assetId: string }
  | { kind: "replaceAudio"; assetId: string };

export type AppsWorkspaceProps = {
  /** The project this workspace is bound to. If undefined, this is the free
   * "Apps" landing experience that creates a new project on first run. */
  projectId?: string;
  /** Selected app id (from URL search). */
  appId?: string;
  /** Update URL when the selected app or projectId changes. */
  onSelectApp: (appId: string | undefined) => void;
  onProjectIdChange: (projectId: string | undefined) => void;
  /** If true, the project context is locked (project detail page): the title
   * dropdown's "New project" should navigate away to /v2/apps instead of
   * clearing in-place. */
  lockedProject?: boolean;
};

export function AppsWorkspace({
  projectId,
  appId,
  onSelectApp,
  onProjectIdChange,
  lockedProject,
}: AppsWorkspaceProps) {
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
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<TimelineIntent | null>(null);


  const handleUseInApp = ({
    skill,
    asset,
    intent,
  }: {
    skill: Skill;
    asset: ProjectAsset | null;
    intent?: TimelineIntent;
  }) => {
    setSeedAsset(asset);
    setPendingIntent(intent ?? null);
    onSelectApp(skill.id);
  };

  const filtered = useMemo(() => SKILLS.filter((s) => tabMatches(s, tab)), [tab]);
  const selected: Skill | null = appId ? SKILL_BY_ID[appId] ?? null : null;
  const activeRuns = useMemo(() => Object.values(runs), [runs]);

  const handleNewProject = () => {
    if (lockedProject) {
      void navigate({ to: "/v2/apps", search: {} });
    } else {
      onProjectIdChange(undefined);
    }
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
    const intent = pendingIntent;
    setPendingIntent(null);
    setRuns((prev) => ({
      ...prev,
      [runId]: { id: runId, skill, projectId: pid, prompt, phase: "starting", intent: intent ?? undefined },
    }));
    onProjectIdChange(pid);

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

  // Right column: outputs once we have a project/runs; how-it-works when an
  // app is selected without a project yet; otherwise a generic placeholder.
  const hasOutputsContext =
    !!projectId || activeRuns.length > 0;

  const showTimeline = timelineOpen && !!projectId;
  const appsGridCols = showTimeline ? "grid-cols-1" : "grid-cols-2";

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="h-screen overflow-hidden"
    >
      {/* Left column — apps / runner */}
      <ResizablePanel defaultSize="28%" minSize="20%" maxSize="45%">
        <div className="flex h-full flex-col border-r border-border/50 bg-card/30">
          {selected ? (
            <AppRunner
              skill={selected}
              projectId={projectId}
              busy={false}
              seedAsset={seedAsset}
              onSeedConsumed={() => setSeedAsset(null)}
              onBack={() => onSelectApp(undefined)}
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
                    Adding to current project · pick an app to add more media.
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
                <div className={cn("grid gap-3", appsGridCols)}>
                  {filtered.map((s) => {
                     const Icon = s.icon;
                     const swatch = getAppSwatch(s.id);
                     return (
                       <button
                         key={s.id}
                         onClick={() => onSelectApp(s.id)}
                         className="group flex flex-col items-start gap-2 rounded-2xl border border-border/60 bg-card p-3 text-left transition hover:border-foreground/40 hover:shadow-elegant"
                       >
                         <div
                           className="grid h-9 w-9 place-items-center rounded-[30%]"
                           style={{ backgroundColor: swatch.bg, color: swatch.fg }}
                         >
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
      </ResizablePanel>

      <ResizableHandle />

      {/* Middle column — outputs */}
      <ResizablePanel defaultSize={showTimeline ? "42%" : "72%"} minSize="30%">
        <div className="h-full overflow-hidden bg-background">
          {hasOutputsContext ? (
            <ProjectOutputsPanel
              projectId={projectId ?? activeRuns[0]?.projectId}
              activeRuns={activeRuns}
              outputMeta={outputMeta}
              onRegenerate={(args) => void handleRegenerate(args)}
              onUseInApp={handleUseInApp}
              onNewProject={handleNewProject}
              onDismissRun={dismissRun}
              timelineOpen={showTimeline}
              onToggleTimeline={() => setTimelineOpen((v) => !v)}
            />
          ) : selected ? (
            <div className="grid h-full place-items-center overflow-y-auto p-6">
              <HowItWorksV2 skill={selected} />
            </div>
          ) : (
            <EmptyPickAnApp />
          )}
        </div>
      </ResizablePanel>

      {showTimeline && (
        <>
          <ResizableHandle />
          {/* Right column — timeline */}
          <ResizablePanel defaultSize="30%" minSize="20%" maxSize="50%">
            <ProjectTimelinePanel
              projectId={projectId}
              onClose={() => setTimelineOpen(false)}
            />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}



function EmptyPickAnApp() {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[30%] bg-brand-gradient text-primary-foreground shadow-elegant">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Select an app to see how it works
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick one from the left to view its steps. Once you generate, results
          land here in a new project.
        </p>
      </div>
    </div>
  );
}
