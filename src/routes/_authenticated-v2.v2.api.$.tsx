import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, FileJson } from "lucide-react";
import { getPikaApi } from "@/lib/v2/pika-apis";

export const Route = createFileRoute("/_authenticated-v2/v2/api/$")({
  loader: ({ params }) => {
    const api = getPikaApi(params._splat ?? "");
    if (!api) throw notFound();
    return { api };
  },
  component: ApiDetail,
  notFoundComponent: () => (
    <div className="grid h-screen place-items-center text-sm text-muted-foreground">
      Model not found.{" "}
      <Link to="/v2/api" className="ml-1 underline">
        Back to API list
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="grid h-screen place-items-center text-sm text-destructive">
      {error.message}
    </div>
  ),
});

function ApiDetail() {
  const { api } = Route.useLoaderData();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="border-b border-border/50 px-8 pb-5 pt-6">
        <Link
          to="/v2/api"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All APIs
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                {api.name}
              </h1>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {api.category}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{api.tagline}</p>
            <code className="mt-3 inline-block rounded-md bg-muted px-2 py-1 text-xs">
              {api.endpointId}
            </code>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={api.falUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90"
            >
              Open on fal.ai <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href={api.schemaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold transition hover:border-foreground/40"
            >
              <FileJson className="h-3.5 w-3.5" /> OpenAPI schema
            </a>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-5xl gap-6 px-8 py-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-card">
            <img
              src={api.cover}
              alt={api.name}
              className="aspect-video w-full object-cover"
            />
            <div className="space-y-3 p-5">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                About
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {api.description}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {api.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Card title="Pricing" body={api.pricing} />
            <Card
              title="Inputs"
              list={api.inputs}
            />
            <Card
              title="Outputs"
              list={api.outputs}
            />
            <div className="rounded-3xl border border-border/60 bg-card p-5">
              <h3 className="font-display text-sm font-semibold tracking-tight">
                Try it
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Run this model interactively on fal.ai's playground.
              </p>
              <a
                href={api.falUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90"
              >
                Open playground <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  body,
  list,
}: {
  title: string;
  body?: string;
  list?: string[];
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5">
      <h3 className="font-display text-sm font-semibold tracking-tight">
        {title}
      </h3>
      {body && (
        <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      )}
      {list && (
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {list.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-foreground/40">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
