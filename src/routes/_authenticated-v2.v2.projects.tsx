import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Film, Loader2, Plus, Trash2 } from "lucide-react";

import {
  listProjects,
  createProject,
  deleteProject,
} from "@/lib/projects.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated-v2/v2/projects")({
  component: ProjectsV2,
});

function ProjectsV2() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchList = useServerFn(listProjects);
  const createProj = useServerFn(createProject);
  const deleteProj = useServerFn(deleteProject);

  const q = useQuery({
    queryKey: ["v2-projects"],
    queryFn: () => fetchList(),
  });
  const projects = q.data?.projects ?? [];

  const createMut = useMutation({
    mutationFn: () => createProj({ data: { title: "Untitled project" } }),
    onSuccess: ({ id }) => {
      void qc.invalidateQueries({ queryKey: ["v2-projects"] });
      void navigate({
        to: "/v2/projects/$projectId",
        params: { projectId: id },
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProj({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["v2-projects"] }),
  });

  return (
    <main className="min-h-screen w-full bg-background px-8 py-12 text-foreground">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              Projects
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick up where you left off, or start something new from{" "}
              <Link
                to="/v2/apps"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Apps
              </Link>
              .
            </p>
          </div>
          <Button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            size="lg"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New project
          </Button>
        </header>

        {q.isLoading ? (
          <div className="grid place-items-center py-24 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center">
            <Film className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Head to{" "}
              <Link
                to="/v2/apps"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Apps
              </Link>{" "}
              and generate something — it'll start a new project automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card transition hover:border-foreground/40 hover:shadow-elegant"
              >
                <Link
                  to="/v2/projects/$projectId"
                  params={{ projectId: p.id }}
                  className="block"
                >
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt={p.title}
                      loading="lazy"
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-video w-full place-items-center bg-brand-gradient text-primary-foreground">
                      <Film className="h-8 w-8" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="truncate text-base font-semibold">
                      {p.title || "Untitled"}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {p.sceneCount} shot{p.sceneCount === 1 ? "" : "s"} ·
                      updated {new Date(p.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Delete "${p.title || "Untitled"}"? This cannot be undone.`,
                      )
                    )
                      deleteMut.mutate(p.id);
                  }}
                  aria-label="Delete project"
                  className="absolute right-2 top-2 hidden h-8 w-8 place-items-center rounded-full bg-background/80 text-muted-foreground hover:text-destructive group-hover:grid"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
