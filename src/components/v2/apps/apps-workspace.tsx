import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, Sparkles } from "lucide-react";
import { useAppFavorites } from "@/hooks/use-app-favorites";

import { SKILLS, SKILL_BY_ID, type Skill, DEFAULT_MODEL_BY_KIND, type SkillKind } from "@/lib/skills";
import { AppRunner } from "@/components/v2/apps/app-runner";
import { CreateAppWizard, type CreateSubmit } from "@/components/v2/apps/create-app-wizard";
import { HowItWorksV2 } from "@/components/v2/apps/how-it-works";
import { HowItWorksButton } from "@/components/v2/apps/how-it-works-button";
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
import { autoTitleProject } from "@/lib/project-title.functions";
import type { ProjectAsset } from "@/lib/project-state";
import { cn } from "@/lib/utils";
import { getAppSwatch } from "@/lib/app-swatch";




const TABS = [
  "Favorites",
  "Featured",
  "Custom",
  "Models",
  "Photo",
  "Video",
  "Image",
  "Marketing",
  "Audio",
  "Voice",
] as const;
type Tab = (typeof TABS)[number];

function tabMatches(skill: Skill, tab: Tab, favorites: string[]): boolean {
  if (tab === "Favorites") return favorites.includes(skill.id);
  if (tab === "Featured") return skill.id.startsWith("app-");
  if (tab === "Custom") return skill.category === "Custom";
  if (tab === "Models") return !skill.id.startsWith("app-") && skill.category !== "Custom";
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
  refImageUrls?: string[];
};

export type TimelineIntent =
  | { kind: "appendVisual" }
  | { kind: "appendAudio" }
  | { kind: "replaceClip"; targetRef: string }
  | { kind: "replaceAudio"; targetRef: string };

const TIMELINE_INSTANCE_SEP = "::timeline-instance::";

function makeTimelineRef(assetId: string) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${assetId}${TIMELINE_INSTANCE_SEP}${id}`;
}

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
  /** Optional one-shot seed for the Create app — populated when arriving from
   * the home composer (?app=app-create&seedPrompt=...&seedMode=...). */
  seedPrompt?: string;
  seedMode?: SkillKind;
  seedModel?: string;
  /** Optional initial tab for the apps browser. */
  initialTab?: Tab;
  /** Called after the seed is consumed so the parent can clear the URL. */
  onSeedConsumed?: () => void;
};

export function AppsWorkspace({
  projectId,
  appId,
  onSelectApp,
  onProjectIdChange,
  lockedProject,
  seedPrompt,
  seedMode,
  seedModel,
  initialTab,
  onSeedConsumed,
}: AppsWorkspaceProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const runStart = useServerFn(directGenerateStart);
  const runPoll = useServerFn(directGeneratePoll);
  const updateState = useServerFn(updateProjectState);
  const createProj = useServerFn(createProject);
  const autoTitle = useServerFn(autoTitleProject);

  const [tab, setTab] = useState<Tab>(initialTab ?? "Featured");
  const [runs, setRuns] = useState<Record<string, ActiveRun>>({});
  const [outputMeta, setOutputMeta] = useState<Record<string, OutputMeta>>({});
  const [seedAsset, setSeedAsset] = useState<ProjectAsset | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<TimelineIntent | null>(null);
  const { favorites, toggle: toggleFav, isFavorite } = useAppFavorites();


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

  const filtered = useMemo(() => SKILLS.filter((s) => tabMatches(s, tab, favorites)), [tab, favorites]);
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
    modeOverride,
    modelOverride,
    params,
  }: {
    skill: Skill;
    projectId: string;
    prompt: string;
    assets: ProjectAsset[];
    modeOverride?: SkillKind;
    modelOverride?: string;
    params?: Record<string, string | number | boolean>;
  }) => {
    const runId = crypto.randomUUID();
    const intent = pendingIntent;
    setPendingIntent(null);
    const refImageUrls = assets
      .filter((a) => a.mime.startsWith("image/"))
      .map((a) => a.url);
    const effectiveMode: SkillKind = modeOverride ?? skill.kind;
    const effectiveModel =
      modelOverride || skill.model || DEFAULT_MODEL_BY_KIND[effectiveMode];
    const runSkill: Skill = modeOverride || modelOverride
      ? { ...skill, kind: effectiveMode, model: effectiveModel }
      : skill;
    setRuns((prev) => ({
      ...prev,
      [runId]: { id: runId, skill: runSkill, projectId: pid, prompt, phase: "starting", intent: intent ?? undefined, refImageUrls },
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
          mode: effectiveMode,
          model: effectiveModel,
          userMessageId: userId,
          assistantMessageId: assistantId,
          referenceImageUrls: refUrls.length ? refUrls : undefined,
          params,
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
            mode: effectiveMode,
            model: effectiveModel,
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

      // Apply timeline intent (if any). Without an intent, the new asset
      // simply lands in the Project Assets panel and the user adds it to
      // the timeline manually via the + button.
      if (intent) {
        try {
          // Fetch current timeline order to compute the next state.
          const cur = qc.getQueryData<{ project?: { projectState?: { timeline?: { order?: string[] } } } }>(
            ["v2-project", pid],
          );
          const curOrder = cur?.project?.projectState?.timeline?.order ?? [];
          const nextOrder = curOrder.slice();
          if (intent.kind === "appendVisual" || intent.kind === "appendAudio") {
            nextOrder.push(makeTimelineRef(finalAsset.assetId));
          } else if (intent.kind === "replaceClip" || intent.kind === "replaceAudio") {
            const idx = nextOrder.indexOf(intent.targetRef);
            if (idx >= 0) nextOrder[idx] = makeTimelineRef(finalAsset.assetId);
            else nextOrder.push(makeTimelineRef(finalAsset.assetId));
          }
          await updateState({
            data: { id: pid, patch: { timeline: { order: nextOrder } } },
          });
        } catch (e) {
          console.error("[v2] timeline intent apply failed", e);
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
    params,
  }: {
    skill: Skill;
    projectId: string;
    prompt: string;
    assets: ProjectAsset[];
    params?: Record<string, string | number | boolean>;
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
    await startRun({ skill, projectId: pid, prompt, assets, params });
  };

  const handleStartFromCreate = async (args: CreateSubmit) => {
    const createSkill = selected!;
    let pid = projectId;
    if (!pid) {
      const out = await createProj({
        data: {
          title: args.prompt.slice(0, 60) || createSkill.label,
          skill: createSkill.id,
          studioMode: args.mode,
          studioModel: args.model,
        },
      });
      pid = out.id;
    }
    await startRun({
      skill: createSkill,
      projectId: pid,
      prompt: args.prompt,
      assets: args.assets,
      modeOverride: args.mode,
      modelOverride: args.model,
      params: args.params,
    });
  };

  // Consume seed once it's been handed off to the wizard.
  const consumedSeedRef = useRef(false);
  useEffect(() => {
    if (!seedPrompt && !seedMode && !seedModel) return;
    if (consumedSeedRef.current) return;
    consumedSeedRef.current = true;
    // Defer so the wizard mounts with the seed first.
    const t = setTimeout(() => onSeedConsumed?.(), 50);
    return () => clearTimeout(t);
  }, [seedPrompt, seedMode, seedModel, onSeedConsumed]);

  // Right column: outputs once we have a project/runs; how-it-works when an
  // app is selected without a project yet; otherwise a generic placeholder.
  const hasOutputsContext =
    !!projectId || activeRuns.length > 0;

  const showTimeline = timelineOpen && !!projectId;
  const isDefaultGrid = !selected && !hasOutputsContext;
  const appsGridCols = isDefaultGrid
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
    : showTimeline
      ? "grid-cols-1"
      : "grid-cols-2";

  const appsBrowser = (
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
            const fav = isFavorite(s.id);
            return (
              <div
                key={s.id}
                className={cn(
                  "group relative flex flex-col items-start rounded-2xl border border-border/60 bg-card text-left transition hover:border-foreground/40 hover:shadow-elegant",
                  isDefaultGrid ? "gap-3 p-3" : "gap-2 p-3",
                )}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFav(s.id);
                  }}
                  aria-label={fav ? "Remove from favorites" : "Add to favorites"}
                  className={cn(
                    "absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full transition",
                    fav
                      ? "text-rose-500 opacity-100"
                      : "text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100",
                  )}
                >
                  <Heart className={cn("h-3.5 w-3.5", fav && "fill-current")} />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectApp(s.id)}
                  className={cn(
                    "flex w-full flex-col text-left",
                    isDefaultGrid ? "gap-3" : "gap-2",
                  )}
                >
                  {isDefaultGrid ? (
                    <>
                      <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted" />
                      <div className="flex items-start gap-3 px-1 pb-1">
                        <div
                          className="grid h-12 w-12 shrink-0 place-items-center rounded-[24%]"
                          style={{ backgroundColor: swatch.bg, color: swatch.fg }}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1 pr-6">
                          <div className="truncate text-base font-semibold leading-tight text-foreground">
                            {s.label}
                          </div>
                          <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {s.description}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="grid h-9 w-9 place-items-center rounded-[30%]"
                        style={{ backgroundColor: swatch.bg, color: swatch.fg }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="pr-6 text-sm font-semibold leading-tight text-foreground">
                        {s.label}
                      </div>
                      <div className="line-clamp-2 text-[11px] text-muted-foreground">
                        {s.description}
                      </div>
                    </>
                  )}
                </button>
              </div>
            );

          })}
        </div>
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {tab === "Favorites"
              ? "No favorites yet. Tap the heart on any app to save it here."
              : "No apps in this category yet."}
          </p>
        )}
      </div>
    </>
  );

  // Default state: no selection, no project — show a beautiful full-width grid
  // without the right "select an app" column.
  if (isDefaultGrid) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        {appsBrowser}
      </div>
    );
  }


  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="h-screen overflow-hidden"
    >
      {/* Left column — apps / runner */}
      <ResizablePanel defaultSize="28%" minSize="20%" maxSize="45%">
        <div className="flex h-full flex-col border-r border-border/50 bg-card/30">
          {selected?.id === "app-create" ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-3 border-b border-border/50 px-5 py-3">
                <button
                  onClick={() => onSelectApp(undefined)}
                  className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
                  aria-label="Back to apps"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">Custom</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    Direct prompt → media
                  </div>
                </div>
                <HowItWorksButton skill={SKILL_BY_ID["app-create"]} />
              </div>
              <div className="flex-1 overflow-hidden">
                <CreateAppWizard
                  projectId={projectId ?? ""}
                  busy={false}
                  seedPrompt={seedPrompt}
                  seedMode={seedMode}
                  seedModel={seedModel}
                  seedAsset={seedAsset}
                  onSeedConsumed={() => setSeedAsset(null)}
                  onSubmit={(args) => void handleStartFromCreate(args)}
                />
              </div>
            </div>
          ) : selected ? (
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
            appsBrowser
          )}

        </div>
      </ResizablePanel>

      <ResizableHandle />

      {/* Middle column — outputs */}
      <ResizablePanel defaultSize={showTimeline ? "25%" : "72%"} minSize="20%">
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
          <ResizablePanel defaultSize="65%" minSize="25%" maxSize="80%">
            <ProjectTimelinePanel
              projectId={projectId}
              onClose={() => setTimelineOpen(false)}
              onUseInApp={handleUseInApp}
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
