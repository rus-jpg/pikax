import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PIKA_APIS, PIKA_CATEGORIES, isPikaModel, type PikaFilter } from "@/lib/v2/pika-apis";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/pika-mark";
import { ApiFaq } from "@/components/v2/api/faq";
import { ApiContactForm } from "@/components/v2/api/contact-form";

export const Route = createFileRoute("/pika-api/")({
  component: PikaApiIndex,
});

function PikaApiIndex() {
  const [cat, setCat] = useState<PikaFilter>("all");

  const items = useMemo(
    () =>
      cat === "all"
        ? PIKA_APIS
        : cat === "pika"
          ? PIKA_APIS.filter(isPikaModel)
          : PIKA_APIS.filter((a) => a.category === cat),
    [cat],
  );

  return (
    <div className="mx-auto max-w-6xl px-8 pb-16 pt-10">
      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Pika API
        </p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight md:text-6xl">
          Take Pika to go
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          Get the power of Pika's video models from the comfort of your own
          product. One API. Every model. Production-ready.
        </p>
      </section>

      <div className="mt-10 flex justify-center">
        <div className="flex flex-wrap gap-1 rounded-full border border-border/60 bg-card p-1">
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
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((api) => (
          <Link
            key={api.slug}
            to="/pika-api/$"
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
              <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {api.category}
              </span>
              <h2 className="mt-2 font-display text-base font-semibold tracking-tight">
                {api.name}
              </h2>
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

      <div id="faq" className="mt-20">
        <ApiFaq />
      </div>

      <div id="contact" className="mt-16">
        <ApiContactForm />
      </div>
    </div>
  );
}
