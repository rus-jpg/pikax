import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Film } from "lucide-react";

import { HomeComposer } from "@/components/v2/home/home-composer";
import { listProjects } from "@/lib/projects.functions";

export const Route = createFileRoute("/_authenticated-v2/v2/home")({
  component: HomePage,
});

function HomePage() {
  const fetchList = useServerFn(listProjects);
  const q = useQuery({
    queryKey: ["v2-projects"],
    queryFn: () => fetchList(),
  });
  const projects = (q.data?.projects ?? []).slice(0, 8);

  return (
    <main className="h-full overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-8 py-16">
        <section className="flex flex-col items-center gap-8 pt-8 text-center">
          <h1 className="font-display text-5xl font-black uppercase tracking-tight md:text-6xl">
            What will you create
            <br />
            with Pika today?
          </h1>
          <div className="w-full max-w-3xl">
            <HomeComposer />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-lg font-semibold">
              Recent projects
            </h2>
            <Link
              to="/v2/projects"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
            >
              See all
            </Link>
          </div>
          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
              Nothing yet — type a prompt above to get started.
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  to="/v2/projects/$projectId"
                  params={{ projectId: p.id }}
                  className="group flex w-64 shrink-0 items-center gap-3 rounded-2xl border border-border bg-card p-2 transition hover:border-foreground/40 hover:shadow-elegant"
                >
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt={p.title}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-gradient text-primary-foreground">
                      <Film className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {p.title || "Untitled"}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      Jump back in
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <PlaceholderShelf title="From the community" />
        <PlaceholderShelf title="Trending" />
      </div>
    </main>
  );
}

function PlaceholderShelf({ title }: { title: string }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">Coming soon</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="aspect-video rounded-2xl border border-dashed border-border bg-muted/30"
          />
        ))}
      </div>
    </section>
  );
}
