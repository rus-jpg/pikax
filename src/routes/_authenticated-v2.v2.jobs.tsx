import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Loader2, CheckCircle2, FolderOpen } from "lucide-react";
import { listLibrary } from "@/lib/library.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated-v2/v2/jobs")({
  component: JobsScreen,
});

function JobsScreen() {
  const fetchLib = useServerFn(listLibrary);
  const q = useQuery({
    queryKey: ["v2-jobs"],
    queryFn: () => fetchLib(),
    refetchInterval: 5000,
  });

  const queue = q.data?.queue ?? [];
  const recent = (q.data?.generations ?? []).slice(0, 30);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-border/50 px-8 pb-4 pt-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Jobs
          </h1>
          <p className="text-xs text-muted-foreground">
            Everything that's running, queued, or recently finished.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/v2/apps">Start something new</Link>
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            In progress
            <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] text-foreground">
              {queue.length}
            </span>
          </h2>
          {q.isLoading ? (
            <div className="grid h-24 place-items-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : queue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
              Nothing generating right now.
            </div>
          ) : (
            <ul className="space-y-2">
              {queue.map((j) => (
                <li
                  key={j.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {j.projectTitle}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {j.status} · started{" "}
                      {new Date(j.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/v2/projects/$projectId" params={{ projectId: j.projectId }}>
                      <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                      Open
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Recently finished
          </h2>
          {recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
              No completed generations yet.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-2"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {g.mime.startsWith("image/") ? (
                      <img
                        src={g.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : g.mime.startsWith("video/") ? (
                      <video
                        src={g.url}
                        className="h-full w-full object-cover"
                        muted
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-lg text-muted-foreground">
                        ♪
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/v2/projects/$projectId"
                      params={{ projectId: g.projectId }}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {g.projectTitle}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">
                      {new Date(g.createdAt).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
