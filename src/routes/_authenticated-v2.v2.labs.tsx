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
    name: "Pika Generative UI",
    tagline: "You talk, your agent designs",
    description:
      "Visuals and voice combined. Your agent reflows the interface in real time as you talk.",
    accent: "bg-[#7c5cff]",
    textOnAccent: "text-white",
    cta: { label: "Start on GitHub", href: "https://github.com/Pika-Labs/Pika-Experiments" },
  },
  {
    name: "Pika Director Suite",
    tagline: "An AI co-director for long-form scenes",
    description: "Storyboard, shoot, and re-cut coverage on the fly.",
    accent: "bg-[#1ec487]",
    textOnAccent: "text-black",
  },
  {
    name: "Pika Voice Stage",
    tagline: "Real-time voice performances",
    description: "Speak in, hear any character back — synced to a generated face.",
    accent: "bg-[#ffd84d]",
    textOnAccent: "text-black",
  },
  {
    name: "Pika Loops",
    tagline: "Seamless video loops from a prompt",
    description: "Ambient backdrops, reactive wallpapers, stream overlays.",
    accent: "bg-[#ff6b3d]",
    textOnAccent: "text-white",
  },
  {
    name: "Pika Remix",
    tagline: "Any clip into a chain of variations",
    description: "Alternate styles, swapped subjects, new endings.",
    accent: "bg-[#ff4d8d]",
    textOnAccent: "text-white",
  },
  {
    name: "Pika Sticker Lab",
    tagline: "Generative stickers, GIFs, and reactions",
    description: "Tiny, expressive motion from a single sentence.",
    accent: "bg-[#3da9ff]",
    textOnAccent: "text-white",
  },
];

function LabsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-10 pb-24 pt-16">
        {/* Hero */}
        <section className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Pika Experiments
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[0.95] tracking-tight md:text-6xl">
              Every breakthrough starts with an experiment
            </h1>
          </div>
          <div className="space-y-4 text-base leading-relaxed text-foreground/80">
            <p>
              Big announcement: we're opening up the Pika workshop. We've been
              hard at work building some exciting breakthroughs in agentic AI,
              and we're deciding not to be precious about it. Starting today,
              we're sharing the rough ideas we've been experimenting with so
              you can poke at early explorations and make them your own. This
              is Pika Experiments. Let's break some sh*t together.
            </p>
            <p>
              We believe things can be useful, inspiring, and fun long before
              they're finished. So periodically, we'll drop new experiments:
              prototypes, rough interfaces, and tools still taking shape. Our
              code stays out in the open — take it apart, build on it, run with
              it. There will be bugs and quirks. That's the point.
            </p>
          </div>
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
            Feedback welcome
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            This is all very new and we're still figuring out the nuances. Tell
            us what's working, what's broken, and what you want to see next.
            Join the community and weigh in.
          </p>
          <a
            href="https://discord.com/invite/t9BWbKzjn"
            className="mt-5 inline-flex rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90"
          >
            Join the Discord
          </a>
        </section>
      </div>
    </div>
  );
}
