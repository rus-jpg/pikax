import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FileJson,
  ImagePlus,
  LogIn,
  Music2,
  Plus,
  RotateCcw,
  Video,
  X,
} from "lucide-react";
import { getPikaApi, resolveExample } from "@/lib/v2/pika-apis";

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
  const example = useMemo(() => resolveExample(api), [api]);

  const [prompt, setPrompt] = useState(example.prompt);
  const [images, setImages] = useState<string[]>(example.images);
  const [audio, setAudio] = useState<string | undefined>(example.audio);
  const [videoSource, setVideoSource] = useState<string | undefined>(
    example.videoSource,
  );

  const reset = () => {
    setPrompt(example.prompt);
    setImages(example.images);
    setAudio(example.audio);
    setVideoSource(example.videoSource);
  };

  const showImages =
    api.category === "image-to-video" || api.category === "audio-to-video";
  const showAudio = api.category === "audio-to-video";
  const showVideo = api.category === "video-to-video";
  const showPrompt = true;
  const allowMultipleImages =
    api.slug === "v2.2/pikaframes" || api.slug === "v2.2/pikascenes";
  const maxImages = allowMultipleImages ? 5 : 1;

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
        <div className="mx-auto grid max-w-6xl gap-6 px-8 py-6 lg:grid-cols-2">
          {/* LEFT — Input */}
          <section className="flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <h2 className="font-display text-sm font-semibold tracking-tight">
                Input
              </h2>
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" /> Reset to example
              </button>
            </div>

            <div className="flex flex-col gap-5 p-5">
              {showImages && (
                <Field
                  label={allowMultipleImages ? "Keyframes / images" : "Image"}
                  hint={
                    allowMultipleImages
                      ? `Up to ${maxImages} reference images.`
                      : "Click a thumbnail to replace, or drop a new one in."
                  }
                >
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {images.map((src, i) => (
                      <div
                        key={`${src}-${i}`}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted/40"
                      >
                        <img
                          src={src}
                          alt={`Input ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={() =>
                            setImages(images.filter((_, idx) => idx !== i))
                          }
                          className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-background/80 opacity-0 transition group-hover:opacity-100"
                          aria-label="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {images.length < maxImages && (
                      <button
                        type="button"
                        onClick={() =>
                          setImages([...images, api.cover])
                        }
                        className="grid aspect-square place-items-center rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
                      >
                        {images.length === 0 ? (
                          <span className="flex flex-col items-center gap-1">
                            <ImagePlus className="h-4 w-4" />
                            Add image
                          </span>
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </Field>
              )}

              {showVideo && (
                <Field label="Source video">
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/40">
                    {videoSource ? (
                      <div className="relative aspect-video w-full">
                        <img
                          src={videoSource}
                          alt="Source video"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 grid place-items-center bg-foreground/30">
                          <Video className="h-6 w-6 text-background" />
                        </div>
                        <button
                          onClick={() => setVideoSource(undefined)}
                          className="absolute right-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px]"
                        >
                          Replace
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setVideoSource(api.cover)}
                        className="grid aspect-video w-full place-items-center text-xs text-muted-foreground hover:text-foreground"
                      >
                        <span className="flex items-center gap-1">
                          <Video className="h-4 w-4" /> Add video
                        </span>
                      </button>
                    )}
                  </div>
                </Field>
              )}

              {showAudio && (
                <Field label="Audio">
                  {audio ? (
                    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-3">
                      <Music2 className="h-4 w-4 text-muted-foreground" />
                      <audio
                        src={audio}
                        controls
                        className="h-8 flex-1"
                      />
                      <button
                        onClick={() => setAudio(undefined)}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAudio(example.audio)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    >
                      <Music2 className="h-4 w-4" /> Add audio clip
                    </button>
                  )}
                </Field>
              )}

              {showPrompt && (
                <Field label="Prompt">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40"
                    placeholder="Describe the motion, mood, lighting…"
                  />
                </Field>
              )}

              <button
                type="button"
                disabled
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3 text-sm font-semibold text-background opacity-90 transition hover:opacity-100"
                title="You need to sign in to run this model."
              >
                <LogIn className="h-4 w-4" /> Sign in to run
              </button>
              <p className="-mt-2 text-center text-[11px] text-muted-foreground">
                Estimated cost: {api.pricing}
              </p>
            </div>
          </section>

          {/* RIGHT — Result + Logs */}
          <section className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-3xl border border-border/60 bg-card">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                <h2 className="font-display text-sm font-semibold tracking-tight">
                  Result
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                  Example
                </span>
              </div>
              {example.resultVideo ? (
                <video
                  src={example.resultVideo}
                  poster={example.resultImagePoster}
                  controls
                  loop
                  muted
                  playsInline
                  className="aspect-video w-full bg-black object-contain"
                />
              ) : (
                <img
                  src={example.resultImagePoster}
                  alt={`${api.name} example`}
                  className="aspect-video w-full object-cover"
                />
              )}
              <div className="border-t border-border/60 px-5 py-3 text-[11px] text-muted-foreground">
                Output for the pre-filled inputs above. Edit the inputs and sign
                in to render your own.
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-border/60 bg-card">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                <h2 className="font-display text-sm font-semibold tracking-tight">
                  Logs
                </h2>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {api.endpointId}
                </span>
              </div>
              <pre className="max-h-72 overflow-auto bg-foreground/[0.03] px-5 py-4 text-[11px] leading-relaxed text-muted-foreground">
                {example.logs.join("\n")}
              </pre>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card p-5">
              <h3 className="font-display text-sm font-semibold tracking-tight">
                About
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {api.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {api.tags.map((t: string) => (
                  <span
                    key={t}
                    className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
        {hint && (
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
