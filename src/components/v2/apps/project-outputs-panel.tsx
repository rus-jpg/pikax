import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  Film,
  Loader2,
  PanelRightClose,
  Plus,
  RotateCcw,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getProject, listProjects } from "@/lib/projects.functions";
import { SKILLS, SKILL_BY_ID, type Skill } from "@/lib/skills";
import { getRecipeForSkill } from "@/lib/app-recipes";
import type { ProjectAsset } from "@/lib/project-state";

export type OutputMeta = { prompt: string; skillId: string };

export type ActiveRunView = {
  id: string;
  skill: Skill;
  projectId: string;
  prompt: string;
  phase: "starting" | "polling" | "error";
  error?: string;
};

function appsAcceptingMime(mime: string): Skill[] {
  const want = mime.startsWith("image/")
    ? "image"
    : mime.startsWith("video/")
      ? "video"
      : mime.startsWith("audio/")
        ? "audio"
        : null;
  if (!want) return [];
  return SKILLS.filter((s) => {
    const upload = getRecipeForSkill(s).steps.find((st) => st.kind === "upload");
    if (!upload) return false;
    return upload.accept === want || upload.accept === "any";
  });
}

export function ProjectOutputsPanel({
  projectId,
  activeRuns,
  outputMeta,
  onRegenerate,
  onUseInApp,
  onNewProject,
  onDismissRun,
}: {
  projectId?: string;
  activeRuns: ActiveRunView[];
  outputMeta: Record<string, OutputMeta>;
  onRegenerate: (args: { skill: Skill; prompt: string; projectId: string }) => void;
  onUseInApp: (args: { skill: Skill; asset: ProjectAsset }) => void;
  onNewProject: () => void;
  onDismissRun: (id: string) => void;
}) {
  const navigate = useNavigate();
  const fetchList = useServerFn(listProjects);
  const fetchProject = useServerFn(getProject);

  const listQ = useQuery({
    queryKey: ["v2-projects"],
    queryFn: () => fetchList(),
  });
  const projects = listQ.data?.projects ?? [];

  const runsForThisProject = activeRuns.filter(
    (r) => r.projectId === projectId,
  );
  const hasPendingHere = runsForThisProject.some(
    (r) => r.phase === "starting" || r.phase === "polling",
  );

  const projectQ = useQuery({
    queryKey: ["v2-project", projectId],
    queryFn: () => fetchProject({ data: { id: projectId! } }),
    enabled: !!projectId,
    refetchInterval: hasPendingHere ? 4000 : false,
  });


  const project = projectQ.data?.project;
  const assets = projectQ.data?.assets ?? [];
  const outputs = useMemo(
    () =>
      assets
        .filter((a) =>
          [
            "keyframe",
            "image",
            "reference",
            "video",
            "audio",
            "music",
            "voiceover",
            "final",
          ].includes(a.kind),
        )
        .slice()
        .reverse(),
    [assets],
  );

  const hasRunsHere = runsForThisProject.length > 0;


  const selectProject = (id: string) => {
    void navigate({
      to: "/v2/projects/$projectId",
      params: { projectId: id },
    });
  };


  return (
    <div className="flex h-full flex-col">
      {/* Project header */}
      <header className="flex items-center justify-between gap-3 border-b border-border/50 px-6 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-1 -ml-2 hover:bg-muted">
              <h2 className="truncate font-display text-xl font-semibold tracking-tight">
                {projectId ? project?.title ?? "Loading…" : "New project"}
              </h2>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuItem onSelect={onNewProject}>
              <Plus className="mr-2 h-4 w-4" />
              New project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {projects.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                No other projects yet.
              </div>
            )}
            {projects.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onSelect={() => selectProject(p.id)}
                className="flex items-center gap-2"
              >
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md bg-muted">
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    {p.title || "Untitled"}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                {p.id === projectId && (
                  <span className="text-[10px] text-muted-foreground">current</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {projectId && (
          <Button asChild variant="ghost" size="sm">
            <Link
              to="/v2/projects/$projectId"
              params={{ projectId }}
            >
              <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
              Open project
            </Link>
          </Button>
        )}
      </header>

      {/* Outputs scrollable list */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {runsForThisProject.map((r) => (
          <RunCard key={r.id} run={r} onDismiss={() => onDismissRun(r.id)} />
        ))}

        {outputs.length === 0 && !hasRunsHere ? (
          <div className="grid h-full place-items-center rounded-3xl border border-dashed border-border/60 bg-muted/20 px-6 py-16 text-center">
            <div className="max-w-sm">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No outputs yet. Configure the app on the left and hit Generate
                — results show up here.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {outputs.map((o) => {
              const meta = outputMeta[o.id];
              const skill = meta ? SKILL_BY_ID[meta.skillId] : null;
              return (
                <li
                  key={o.id}
                  className="overflow-hidden rounded-3xl border border-border bg-card shadow-elegant"
                >
                  <div className="grid place-items-center bg-muted/30 p-3">
                    {o.mime.startsWith("image/") && (
                      <img
                        src={o.url}
                        alt=""
                        className="max-h-[60vh] max-w-full rounded-2xl object-contain"
                      />
                    )}
                    {o.mime.startsWith("video/") && (
                      <video
                        src={o.url}
                        controls
                        className="max-h-[60vh] max-w-full rounded-2xl"
                      />
                    )}
                    {o.mime.startsWith("audio/") && (
                      <div className="w-full max-w-xl py-6 text-center">
                        <div className="mb-3 text-4xl text-muted-foreground">♪</div>
                        <audio src={o.url} controls className="w-full" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-3 border-t border-border/50 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      {skill && (
                        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          <skill.icon className="h-3 w-3" />
                          {skill.label}
                        </div>
                      )}
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {meta?.prompt ?? o.name ?? ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <UseInAppMenu asset={o} onUseInApp={onUseInApp} />
                      {meta && skill && projectId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onRegenerate({
                              skill,
                              prompt: meta.prompt,
                              projectId,
                            })
                          }
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Regenerate
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function RunCard({
  run,
  onDismiss,
}: {
  run: ActiveRunView;
  onDismiss: () => void;
}) {
  const Icon = run.skill.icon;
  const isError = run.phase === "error";
  return (
    <div
      className={
        "mb-4 overflow-hidden rounded-3xl border bg-card shadow-elegant " +
        (isError ? "border-destructive/40" : "border-primary/30")
      }
    >
      <div className="relative grid place-items-center bg-brand-gradient/10 p-10">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-background/80 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="relative">
          {!isError && (
            <div className="absolute inset-0 animate-pulse rounded-3xl bg-brand-gradient opacity-30 blur-2xl" />
          )}
          <div
            className={
              "relative grid h-20 w-20 place-items-center rounded-3xl text-primary-foreground shadow-elegant " +
              (isError ? "bg-destructive" : "bg-brand-gradient")
            }
          >
            <Sparkles className="h-8 w-8" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-border/50 px-4 py-3">
        {isError ? (
          <X className="h-4 w-4 text-destructive" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Icon className="h-3 w-3" />
            {run.skill.label} ·{" "}
            {isError
              ? "failed"
              : run.phase === "starting"
                ? "submitting"
                : "generating"}
          </div>
          <p
            className={
              "line-clamp-2 text-xs " +
              (isError ? "text-destructive" : "text-muted-foreground")
            }
          >
            {isError ? run.error ?? "Generation failed" : run.prompt}
          </p>
        </div>
      </div>
    </div>
  );
}


function UseInAppMenu({
  asset,
  onUseInApp,
}: {
  asset: ProjectAsset;
  onUseInApp: (args: { skill: Skill; asset: ProjectAsset }) => void;
}) {
  const apps = useMemo(() => appsAcceptingMime(asset.mime), [asset.mime]);
  if (apps.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Wand2 className="mr-1.5 h-3.5 w-3.5" />
          Edit with app
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[60vh] w-64 overflow-y-auto">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Apply an app to this asset
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {apps.map((s) => {
          const Icon = s.icon;
          return (
            <DropdownMenuItem
              key={s.id}
              onSelect={() => onUseInApp({ skill: s, asset })}
              className="flex items-start gap-2"
            >
              <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-gradient text-primary-foreground">
                <Icon className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{s.label}</div>
                <div className="line-clamp-1 text-[10px] text-muted-foreground">
                  {s.description}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
