import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getProject, updateProjectState } from "@/lib/projects.functions";
import { TimelinePanel } from "@/components/studio/timeline-panel";
import { Button } from "@/components/ui/button";
import type { Scene } from "@/lib/project-state";

export function ProjectDetailV2({ projectId }: { projectId: string }) {
  const fetch = useServerFn(getProject);
  const updateState = useServerFn(updateProjectState);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["v2-project", projectId],
    queryFn: () => fetch({ data: { id: projectId } }),
  });

  const [activeSceneId, setActiveSceneId] = useState<string>("");

  const project = q.data?.project;
  const state = project?.projectState;
  const assets = state?.assets ?? [];

  const scenes = useMemo(() => state?.scenes ?? [], [state]);
  const currentSceneId =
    activeSceneId && scenes.some((s) => s.id === activeSceneId)
      ? activeSceneId
      : scenes[0]?.id ?? "";

  const handleSetScenes = async (next: Scene[]) => {
    // Optimistic local update via cache write
    qc.setQueryData(["v2-project", projectId], (prev: typeof q.data) =>
      prev
        ? {
            ...prev,
            project: {
              ...prev.project,
              projectState: { ...prev.project.projectState, scenes: next },
            },
          }
        : prev,
    );
    await updateState({
      data: { id: projectId, patch: { scenesReplace: next } },
    });
  };

  if (q.isLoading) {
    return (
      <div className="grid h-full place-items-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!project || !state) {
    return (
      <div className="grid h-full place-items-center text-sm text-muted-foreground">
        Project not found.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-semibold tracking-tight">
            {project.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {scenes.length} {scenes.length === 1 ? "scene" : "scenes"} ·{" "}
            {assets.length} {assets.length === 1 ? "asset" : "assets"}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/v2/apps" search={{ projectId }}>
            <Sparkles className="mr-2 h-4 w-4" />
            Add from app
          </Link>
        </Button>
      </header>

      <div className="flex-1 overflow-hidden">
        {scenes.length === 0 ? (
          <EmptyProject projectId={projectId} />
        ) : (
          <TimelinePanel
            scenes={scenes}
            setScenes={handleSetScenes}
            activeSceneId={currentSceneId}
            onSelect={setActiveSceneId}
            music={state.music}
            assets={assets}
          />
        )}
      </div>
    </div>
  );
}

function EmptyProject({ projectId }: { projectId: string }) {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-elegant">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl font-semibold tracking-tight">
          Nothing on the timeline yet
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate an image, video, or audio clip with an app — it'll land here
          automatically.
        </p>
        <Button asChild className="mt-5">
          <Link to="/v2/apps" search={{ projectId }}>
            <Sparkles className="mr-2 h-4 w-4" />
            Browse apps
          </Link>
        </Button>
      </div>
    </div>
  );
}
