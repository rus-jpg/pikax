import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProjects } from "@/lib/projects.functions";

export const Route = createFileRoute("/_authenticated-v2/v2/projects")({
  component: ProjectsV2,
});

function ProjectsV2() {
  const fetchList = useServerFn(listProjects);
  const q = useQuery({
    queryKey: ["projects-list"],
    queryFn: () => fetchList(),
  });

  return (
    <main className="mx-auto max-w-[1400px] px-8 py-12">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Projects
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            v2 layout — scaffolding. Backend shared with classic.
          </p>
        </div>
      </div>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(q.data ?? []).map((p) => (
            <Link
              key={p.id}
              to="/v2/studio/$projectId"
              params={{ projectId: p.id }}
              className="rounded-2xl border border-border/60 bg-card p-5 transition hover:border-border hover:bg-muted/40"
            >
              <div className="text-sm font-semibold">{p.title ?? "Untitled"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {new Date(p.updated_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
          {(q.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          )}
        </div>
      )}
    </main>
  );
}
