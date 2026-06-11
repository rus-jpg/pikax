import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated-v2/v2/labs")({
  component: LabsPage,
});

type Toy = {
  name: string;
  tagline: string;
  description: string;
  accent: string; // tailwind bg class for the panel
  textOnAccent?: string;
  cta?: { label: string; href: string };
};

const TOYS: Toy[] = [
  {
    name: "Pika Riff",
    tagline: "Remix any clip into a 6-second loop",
    description:
      "An experimental playground where any uploaded video becomes a snappy, shareable loop. We're exploring how short-form motion can be authored entirely through prompt-driven edits — no timeline, no trimming, just intent.",
    accent: "bg-[#1ec487]",
    textOnAccent: "text-black",
  },
  {
    name: "Trivia Live",
    tagline: "A nightly AI-hosted game show",
    description:
      "What happens when the host, the questions, and the prize pool are all generated on the fly? Trivia Live is our take on real-time interactive video — a live show that adapts to whoever shows up to play.",
    accent: "bg-[#ffd84d]",
    textOnAccent: "text-black",
  },
  {
    name: "Literally Something",
    tagline: "Prompt-to-app, but for tiny tools",
    description:
      "A scratchpad for one-off utilities: type a sentence, get a working mini-app. We use it internally to ship throwaway dashboards, calculators, and review tools in under a minute.",
    accent: "bg-[#7c5cff]",
    textOnAccent: "text-white",
  },
  {
    name: "Autoblogger",
    tagline: "AI-curated content hubs",
    description:
      "An automated editorial system that watches trends, drafts posts, and routes them through a human reviewer. Born from an internal experiment, now powering a handful of niche publications.",
    accent: "bg-[#ff6b3d]",
    textOnAccent: "text-white",
  },
  {
    name: "Fame Loop",
    tagline: "Be internet-famous for 24 hours",
    description:
      "A social experiment that picks a random participant each day and amplifies them across our network. A study in attention, follower psychology, and the surprisingly fragile mechanics of virality.",
    accent: "bg-[#ff4d8d]",
    textOnAccent: "text-white",
    cta: { label: "Read the case study", href: "#" },
  },
  {
    name: "Emoji Canvas",
    tagline: "Paint with 🎨 your favorite 😍 emojis 🤪",
    description:
      "A tiny drawing tool where every brush is an emoji. Originally a Friday hack, now quietly used by thousands of people who just want to make weird little artworks on their phones.",
    accent: "bg-[#3da9ff]",
    textOnAccent: "text-white",
    cta: { label: "Open Emoji Canvas", href: "#" },
  },
];

function LabsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-10 pb-24 pt-16">
        {/* Hero */}
        <section className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
          <h1 className="font-display text-6xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
            Labs
          </h1>
          <p className="text-base leading-relaxed text-foreground/80">
            Pika has a storied history of in-house experimentation. This playful,
            dynamic nature of building new products and technologies is so
            ingrained in our ethos, it's become its own branch of the company.
            Pika Labs is where we turn market opportunities, hunches about the
            future, and inside jokes into something real. We call these
            experiments "Toys." Not all of them become cultural sensations,
            receive awards, or get acquired, but some do. Check out the products
            born out of Pika Labs below.
          </p>
        </section>

        {/* Toys */}
        <section className="mt-24 space-y-16">
          {TOYS.map((toy) => (
            <article
              key={toy.name}
              className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_1.4fr] md:gap-12"
            >
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  {toy.name}
                </h2>
                <h3 className="mt-1 text-base font-semibold text-foreground">
                  {toy.tagline}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {toy.description}
                </p>
                {toy.cta && (
                  <a
                    href={toy.cta.href}
                    className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {toy.cta.label} →
                  </a>
                )}
              </div>
              <div
                className={`relative aspect-[16/10] overflow-hidden rounded-3xl ${toy.accent} ${toy.textOnAccent ?? "text-white"}`}
              >
                <div className="absolute inset-0 grid place-items-center">
                  <span className="font-display text-4xl font-semibold tracking-tight opacity-90 md:text-5xl">
                    {toy.name}
                  </span>
                </div>
                <div className="absolute bottom-4 right-4 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
                  Pika Labs · Toy
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Footer CTA */}
        <section className="mt-24 rounded-3xl border border-border/60 bg-card p-10 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Got a hunch worth prototyping?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            We're always looking for the next Toy. Pitch us an experiment and
            we'll help bring it to life.
          </p>
          <a
            href="mailto:labs@pika.art"
            className="mt-5 inline-flex rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90"
          >
            Contact Labs
          </a>
        </section>
      </div>
    </div>
  );
}
