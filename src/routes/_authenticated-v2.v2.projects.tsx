import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import {
  createProject,
  deleteProject,
  listProjects,
} from "@/lib/projects.functions";
import { ProjectDetailV2 } from "@/components/v2/projects/project-detail";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  p: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated-v2/v2/projects")({
  validateSearch: searchSchema,
  component: ProjectsV2,
});

function ProjectsV2() {
  const { p: selectedId } = Route.useSearch();
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

  // Auto-select first project if nothing chosen.
  useEffect(() => {
    if (!selectedId && projects.length > 0) {
      void navigate({
        to: "/v2/projects",
        search: { p: projects[0].id },
        replace: true,
      });
    }
  }, [selectedId, projects, navigate]);

  const handleCreate = async () => {
    const out = await createProj({ data: { title: "Untitled project" } });
    await qc.invalidateQueries({ queryKey: ["v2-projects"] });
    void navigate({ to: "/v2/projects", search: { p: out.id } });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    await deleteProj({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["v2-projects"] });
    if (selectedId === id) {
      void navigate({ to: "/v2/projects", search: {} });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Project list column */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-border/50 bg-card/30">
        <header className="border-b border-border/50 px-4 pb-3 pt-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Projects
            </h1>
            <Button size="icon" variant="ghost" onClick={handleCreate} title="New project">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-2">
          {q.isLoading ? (
            <div className="grid h-32 place-items-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No projects yet.
              <Button size="sm" className="mt-3 w-full" onClick={handleCreate}>
                <Plus className="mr-1 h-4 w-4" /> New project
              </Button>
            </div>
          ) : (
            <ul className="space-y-1">
              {projects.map((p) => {
                const active = p.id === selectedId;
                return (
                  <li key={p.id}>
                    <div
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-2 py-2 transition",
                        active
                          ? "bg-foreground text-background"
                          : "hover:bg-muted",
                      )}
                    >
                      <button
                        onClick={() =>
                          navigate({
                            to: "/v2/projects",
                            search: { p: p.id },
                          })
                        }
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {p.thumbnailUrl ? (
                            <img
                              src={p.thumbnailUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {p.title || "Untitled"}
                          </div>
                          <div
                            className={cn(
                              "truncate text-[11px]",
                              active
                                ? "text-background/70"
                                : "text-muted-foreground",
                            )}
                          >
                            {new Date(p.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className={cn(
                          "grid h-7 w-7 place-items-center rounded-md opacity-0 transition group-hover:opacity-100",
                          active
                            ? "hover:bg-background/20"
                            : "hover:bg-destructive/10 hover:text-destructive",
                        )}
                        aria-label="Delete project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Detail column */}
      <div className="flex-1 overflow-hidden">
        {selectedId ? (
          <ProjectDetailV2 projectId={selectedId} />
        ) : (
          <div className="grid h-full place-items-center p-8 text-center">
            <div>
              <p className="text-sm text-muted-foreground">
                Create a project to get started.
              </p>
              <Button className="mt-4" onClick={handleCreate}>
                <Plus className="mr-1 h-4 w-4" /> New project
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
