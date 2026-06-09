import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  FolderOpen,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getProject, listProjects } from "@/lib/projects.functions";
import { SKILL_BY_ID, type Skill } from "@/lib/skills";

export type OutputMeta = { prompt: string; skillId: string };

export type ActiveRunView = {
  id: string;
  skill: Skill;
  projectId: string;
  prompt: string;
  phase: "starting" | "polling" | "error";
  error?: string;
};

export function ProjectOutputsPanel({
  projectId,
  activeRuns,
  outputMeta,
  onRegenerate,
  onNewProject,
  onDismissRun,
}: {
  projectId?: string;
  activeRuns: ActiveRunView[];
  outputMeta: Record<string, OutputMeta>;
  onRegenerate: (args: { skill: Skill; prompt: string; projectId: string }) => void;
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

  const isPendingHere =
    !!pendingProjectId && pendingProjectId === projectId && !!pendingSkill;

  const selectProject = (id: string) => {
    void navigate({
      to: "/v2/apps",
      search: (prev: { app?: string; projectId?: string }) => ({
        ...prev,
        projectId: id,
      }),
    });
  };

  if (!projectId) {
    return (
      <div className="grid h-full place-items-center px-8 text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-elegant">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-display text-xl font-semibold tracking-tight">
            Pick an app to start a project
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Generating with an app will create a new project here. Each output
            you create lands in the list — switch projects from the title
            dropdown to keep things organized.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Project header */}
      <header className="flex items-center justify-between gap-3 border-b border-border/50 px-6 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-1 -ml-2 hover:bg-muted">
              <h2 className="truncate font-display text-xl font-semibold tracking-tight">
                {project?.title ?? "Loading…"}
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

        <Button asChild variant="ghost" size="sm">
          <Link to="/v2/projects" search={{ p: projectId }}>
            <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
            Open in timeline
          </Link>
        </Button>
      </header>

      {/* Outputs scrollable list */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isPendingHere && (
          <PendingCard
            skill={pendingSkill!}
            prompt={pendingPrompt ?? ""}
            phase={pendingPhase ?? "polling"}
          />
        )}

        {outputs.length === 0 && !isPendingHere ? (
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
                    {meta && skill && (
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
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function PendingCard({
  skill,
  prompt,
  phase,
}: {
  skill: Skill;
  prompt: string;
  phase: "starting" | "polling";
}) {
  const Icon = skill.icon;
  return (
    <div className="mb-4 overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-elegant">
      <div className="grid place-items-center bg-brand-gradient/10 p-10">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-3xl bg-brand-gradient opacity-30 blur-2xl" />
          <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-brand-gradient text-primary-foreground shadow-elegant">
            <Sparkles className="h-8 w-8" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-border/50 px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Icon className="h-3 w-3" />
            {skill.label} · {phase === "starting" ? "submitting" : "generating"}
          </div>
          <p className="line-clamp-1 text-xs text-muted-foreground">{prompt}</p>
        </div>
      </div>
    </div>
  );
}
