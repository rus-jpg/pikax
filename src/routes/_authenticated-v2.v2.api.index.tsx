import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PIKA_APIS, PIKA_CATEGORIES, type PikaCategory } from "@/lib/v2/pika-apis";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated-v2/v2/api/")({
  component: ApiIndex,
});

function ApiIndex() {
  const [cat, setCat] = useState<PikaCategory | "all">("all");

  const items = useMemo(
    () =>
      cat === "all" ? PIKA_APIS : PIKA_APIS.filter((a) => a.category === cat),
    [cat],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="border-b border-border/50 px-8 pb-4 pt-6">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            API
          </h1>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Pika models on fal.ai
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Direct access to every Pika endpoint. Tap a model to see inputs,
          outputs, pricing and docs.
        </p>
        <div className="mt-5 flex flex-wrap gap-1 rounded-full border border-border/60 bg-card p-1 w-fit">
          {PIKA_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                cat === c.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 pb-8 pt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((api) => (
            <Link
              key={api.slug}
              to="/v2/api/$"
              params={{ _splat: api.slug }}
              className="group overflow-hidden rounded-2xl border border-border/60 bg-card text-left transition hover:border-foreground/40 hover:shadow-elegant"
            >
              <div className="aspect-video w-full overflow-hidden bg-muted/40">
                {api.coverVideo ? (
                  <video
                    src={api.coverVideo}
                    poster={api.cover}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <img
                    src={api.cover}
                    alt={api.name}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate font-display text-base font-semibold tracking-tight">
                    {api.name}
                  </h2>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {api.category}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {api.description}
                </p>
                <code className="mt-3 block truncate text-[10px] text-muted-foreground">
                  {api.endpointId}
                </code>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
