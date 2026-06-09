import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { listLibrary } from "@/lib/library.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated-v2/v2/library")({
  component: LibraryV2,
});

type Filter = "all" | "image" | "video" | "audio" | "reference";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
  { id: "audio", label: "Audio" },
  { id: "reference", label: "References" },
];

function LibraryV2() {
  const fetchLib = useServerFn(listLibrary);
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["v2-library"],
    queryFn: () => fetchLib(),
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const items = useMemo(() => {
    const data = q.data;
    if (!data) return [];
    const merged = [...data.generations, ...data.references];
    return merged.filter((i) => {
      if (filter === "image" && !i.mime.startsWith("image/")) return false;
      if (filter === "video" && !i.mime.startsWith("video/")) return false;
      if (filter === "audio" && !i.mime.startsWith("audio/")) return false;
      if (filter === "reference" && i.kind !== "reference" && i.kind !== "likeness")
        return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !(i.label ?? "").toLowerCase().includes(s) &&
          !i.name.toLowerCase().includes(s) &&
          !i.projectTitle.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [q.data, filter, search]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { projectId: string; projectTitle: string; items: typeof items; latest: string }
    >();
    for (const item of items) {
      const existing = map.get(item.projectId);
      if (existing) {
        existing.items.push(item);
        if (item.createdAt > existing.latest) existing.latest = item.createdAt;
      } else {
        map.set(item.projectId, {
          projectId: item.projectId,
          projectTitle: item.projectTitle,
          items: [item],
          latest: item.createdAt,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.latest < b.latest ? 1 : -1,
    );
  }, [items]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="border-b border-border/50 px-8 pb-4 pt-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Library
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you've created and uploaded.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-1 rounded-full border border-border/60 bg-card p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  filter === f.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 pb-8 pt-4">
        {q.isLoading ? (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            No assets yet — try an app to create your first.
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {grouped.map((group) => (
              <section key={group.projectId}>
                <div className="mb-3 flex items-baseline justify-between">
                  <button
                    onClick={() =>
                      navigate({
                        to: "/v2/projects",
                        search: { p: group.projectId },
                      })
                    }
                    className="group flex items-baseline gap-2 text-left"
                  >
                    <h2 className="font-display text-lg font-semibold tracking-tight group-hover:underline">
                      {group.projectTitle}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {group.items.length} {group.items.length === 1 ? "item" : "items"}
                    </span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        navigate({
                          to: "/v2/projects",
                          search: { p: item.projectId },
                        })
                      }
                      className="group overflow-hidden rounded-2xl border border-border/60 bg-card text-left transition hover:border-foreground/40 hover:shadow-elegant"
                    >
                      <div className="aspect-square w-full bg-muted/40">
                        {item.mime.startsWith("image/") ? (
                          <img
                            src={item.url}
                            alt={item.name}
                            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                          />
                        ) : item.mime.startsWith("video/") ? (
                          <video
                            src={item.url}
                            className="h-full w-full object-cover"
                            muted
                            loop
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => e.currentTarget.pause()}
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-3xl text-muted-foreground">
                            {item.mime.startsWith("audio/") ? "♪" : "•"}
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="truncate text-sm font-medium text-foreground">
                          {item.label || item.name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
