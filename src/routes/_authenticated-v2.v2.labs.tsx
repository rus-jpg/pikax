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
    name: "Pika Director Suite",
    tagline: "An AI co-director for long-form scenes",
    description:
      "A multi-shot planning canvas where you describe a scene and Pika storyboards it, suggests camera moves, and renders coverage you can re-cut on the fly. Built to explore how generative video scales past the single clip.",
    accent: "bg-[#1ec487]",
    textOnAccent: "text-black",
  },
  {
    name: "Pika Voice Stage",
    tagline: "Real-time voice performances for any character",
    description:
      "Speak into your mic and hear it come back as any character, accent, or emotional read — synced to a generated face. We're using it to prototype interactive dubbing and live AI puppeteering.",
    accent: "bg-[#ffd84d]",
    textOnAccent: "text-black",
  },
  {
    name: "Pika Generative UI",
    tagline: "Interfaces that draw themselves around your intent",
    description:
      "An experiment in UI that assembles itself from a prompt: controls, panels, and layouts generated on demand for whatever you're trying to do. A glimpse at what creative tools look like when the chrome is fluid.",
    accent: "bg-[#7c5cff]",
    textOnAccent: "text-white",
  },
  {
    name: "Pika Loops",
    tagline: "Endless, seamless video loops from a single prompt",
    description:
      "A tiny tool for generating perfectly looping clips — ambient backdrops, reactive wallpapers, stream overlays. Born from a Friday hack, now quietly used across our marketing site.",
    accent: "bg-[#ff6b3d]",
    textOnAccent: "text-white",
  },
  {
    name: "Pika Remix",
    tagline: "Turn any clip into a chain of variations",
    description:
      "Drop in a video and Pika riffs on it — alternate styles, swapped subjects, new endings. A study in how generative editing can feel more like jamming than prompting.",
    accent: "bg-[#ff4d8d]",
    textOnAccent: "text-white",
    cta: { label: "Read the case study", href: "#" },
  },
  {
    name: "Pika Sticker Lab",
    tagline: "Generative stickers, GIFs, and reactions",
    description:
      "A playful surface for making animated stickers and reaction GIFs from a sentence. The first Pika experiment we shipped to consumer messaging apps — and a sandbox for tiny, expressive motion.",
    accent: "bg-[#3da9ff]",
    textOnAccent: "text-white",
    cta: { label: "Open Sticker Lab", href: "#" },
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
