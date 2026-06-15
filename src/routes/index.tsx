import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroBg from "@/assets/hero-bg.jpg";
import s1 from "@/assets/sample-1.jpg";
import s2 from "@/assets/sample-2.jpg";
import s3 from "@/assets/sample-3.jpg";
import s4 from "@/assets/sample-4.jpg";
import modelsStrip from "@/assets/models-strip.png.asset.json";
import { BrandMark } from "@/components/pika-mark";
import {
  Play, Sparkles, Wand2, Film,
  Mic, Music, Cpu, Code2, ArrowRight, X,
} from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (data?.user) throw redirect({ to: "/v2/home" });
  },
  head: () => ({
    meta: [
      { title: "Pika — Video apps for everything" },
      { name: "description", content: "Pika is the creative video platform — generate, edit, and remix with AI built for every workflow." },
      { property: "og:title", content: "Pika — Video apps for everything" },
      { property: "og:description", content: "Generate, edit, and remix with AI built for every workflow." },
      { property: "og:url", content: "https://pikax.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://pikax.lovable.app/" }],
  }),
  component: LandingPage,
});

const samples = [s1, s2, s3, s4, heroBg];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <Hero />
      <WorkflowsBento />
      <VideoApps />
      <MadeWithPika />
      <ResearchSection />
      <ApiSection />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}

/* ───────── Nav ───────── */
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all ${
        scrolled ? "bg-background/75 backdrop-blur-md border-b border-border" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark className="h-6 w-auto" />
          <span className="font-display text-xl tracking-tight">Pika</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          <a href="#workflows" className="text-muted-foreground hover:text-foreground">Product</a>
          <a href="#research" className="text-muted-foreground hover:text-foreground">Research</a>
          <a href="#api" className="text-muted-foreground hover:text-foreground">API</a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</a>
        </nav>
        <Link
          to="/login"
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Login
        </Link>
      </div>
    </header>
  );
}

/* ───────── Hero ───────── */
function Hero() {
  return (
    <section className="relative px-6 pt-32 pb-20">
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-surface)" }} />
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
          Welcome to the <span className="text-gradient">Pika Universe</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Pika is the creative video platform — generate, edit, and remix with AI
          built for every workflow.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/login"
            className="rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background hover:opacity-90"
          >
            Try Pika free
          </Link>
          <a
            href="#workflows"
            className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium hover:bg-secondary"
          >
            See it in action
          </a>
        </div>
        <div className="relative mx-auto mt-14 aspect-[16/9] max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
          <img src={heroBg} alt="Pika hero preview" className="h-full w-full object-cover" />
          <button
            aria-label="Play hero video"
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/95 shadow-elegant hover:scale-105 transition"
          >
            <Play className="h-6 w-6 fill-foreground" />
          </button>
        </div>
        <div className="mt-10">
          <img
            src={modelsStrip.url}
            alt="Powered by the best models in the biz — Pika 2.5, Gemini Omni, Seedance 2.0"
            className="mx-auto w-full max-w-5xl"
          />
        </div>
      </div>
    </section>
  );
}

/* ───────── Workflows bento ───────── */
const workflowTabs = [
  { id: "marketing", label: "Marketing", lead: "Market", img: s1 },
  { id: "social", label: "Social Media", lead: "Post", img: s2 },
  { id: "founder", label: "Founder", lead: "Pitch", img: s3 },
  { id: "influencer", label: "Influencer", lead: "Engage", img: s4 },
  { id: "shortform", label: "Short-form", lead: "Hook", img: heroBg },
] as const;

function WorkflowsBento() {
  const [tab, setTab] = useState<(typeof workflowTabs)[number]["id"]>("marketing");
  const content = workflowTabs.find((t) => t.id === tab)!;

  return (
    <section id="workflows" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col items-center text-center">
          <h2 className="font-display text-4xl md:text-5xl">Built for all creative workflows</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            One platform, every part of the pipeline — from blank canvas to final cut.
          </p>
          <div className="mt-6 inline-flex rounded-full border border-border bg-card p-1">
            {workflowTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  tab === t.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2">
          <BentoTile className="md:col-span-1 md:row-span-2" title={`${content.lead} stunning footage`} subtitle="Prompt to video in seconds" image={content.img} tall />
          <BentoTile className="md:col-span-2" title="Frame-perfect editing" subtitle="Cut, mask, replace" image={s2} />
          <BentoTile className="md:col-span-1 md:row-span-2" title="Sound + voice" subtitle="Lip-sync, score, SFX" image={s3} tall />
          <BentoTile className="md:col-span-2" title="Collaborate in real time" subtitle="Comments, versions, exports" image={s4} />
        </div>
      </div>
    </section>
  );
}

function BentoTile({
  className = "", title, subtitle, image, tall = false,
}: { className?: string; title: string; subtitle: string; image: string; tall?: boolean }) {
  return (
    <div className={`group relative overflow-hidden rounded-3xl border border-border bg-card ${tall ? "min-h-[420px]" : "min-h-[200px]"} ${className}`}>
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5 text-background">
        <p className="text-xs uppercase tracking-wider opacity-80">{subtitle}</p>
        <h3 className="font-display text-xl">{title}</h3>
      </div>
    </div>
  );
}

/* ───────── Video apps ───────── */
function VideoApps() {
  const apps = [
    { icon: Sparkles, label: "Generate" },
    { icon: Wand2,    label: "Edit" },
    { icon: Film,     label: "Storyboard" },
    { icon: Mic,      label: "Voice" },
    { icon: Music,    label: "Music" },
  ];
  const slides = [
    { title: "Storyboard", body: "Draft a sequence from a single prompt.", img: s1 },
    { title: "Lipsync",    body: "Sync any voice to any face.",            img: s2 },
    { title: "Upscale",    body: "Take SD to 4K without artifacts.",       img: s3 },
    { title: "Score",      body: "Generate a soundtrack to match.",        img: s4 },
  ];
  const [idx, setIdx] = useState(0);
  const visible = [slides[idx % slides.length], slides[(idx + 1) % slides.length]];
  return (
    <section className="bg-secondary/40 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-display text-4xl md:text-5xl">Video apps for everything</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Purpose-built tools that snap together — pick what you need.
        </p>

        <div className="mt-10 grid grid-cols-5 gap-4">
          {apps.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-3">
              <div className="flex aspect-square w-full items-center justify-center rounded-3xl border border-border bg-card shadow-elegant">
                <Icon className="h-8 w-8" />
              </div>
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          {visible.map((s, i) => (
            <div key={i} className="overflow-hidden rounded-3xl border border-border bg-card">
              <img src={s.img} alt={s.title} className="aspect-[16/10] w-full object-cover" />
              <div className="p-5">
                <h3 className="font-display text-xl">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 w-2 rounded-full transition ${i === idx ? "bg-foreground w-6" : "bg-foreground/20"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Made with Pika marquee ───────── */
function MadeWithPika() {
  const [open, setOpen] = useState<string | null>(null);
  const tiles = [...samples, ...samples];
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <section className="overflow-hidden px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-4xl md:text-5xl">Made with Pika</h2>
            <p className="mt-3 text-muted-foreground">A look at what creators are shipping today.</p>
          </div>
          <a href="#" className="hidden text-sm text-muted-foreground hover:text-foreground md:inline">View gallery →</a>
        </div>
      </div>
      <div className="relative mt-10 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max gap-4 animate-[marquee_40s_linear_infinite]">
          {tiles.map((src, i) => (
            <button
              key={i}
              onClick={() => setOpen(src)}
              className="relative aspect-[9/16] w-[220px] shrink-0 overflow-hidden rounded-2xl border border-border bg-card"
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition hover:bg-foreground/20">
                <Play className="h-10 w-10 text-background opacity-0 transition hover:opacity-100" />
              </div>
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/85 p-6"
          onClick={() => setOpen(null)}
        >
          <button
            onClick={() => setOpen(null)}
            className="absolute right-6 top-6 rounded-full bg-background/90 p-2"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img src={open} alt="" className="max-h-[90vh] max-w-[90vw] rounded-2xl" />
        </div>
      )}
    </section>
  );
}

/* ───────── Research ───────── */
function ResearchSection() {
  const papers = [
    { tag: "Diffusion", title: "Temporal coherence in long-form generation" },
    { tag: "Audio",     title: "Cross-modal lip and voice alignment" },
    { tag: "Editing",   title: "Mask-free object replacement at 4K" },
    { tag: "Systems",   title: "Sub-second inference on commodity GPUs" },
  ];
  return (
    <section id="research" className="bg-secondary/40 px-6 py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
            <Cpu className="h-3.5 w-3.5" /> Pika Research
          </span>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">
            Powered by research that pushes the medium forward.
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Our team publishes the methods behind Pika — peer-reviewed, open, and
            reproducible.
          </p>
          <a href="#" className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
            Read the papers <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {papers.map((p) => (
            <article key={p.title} className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
              <span className="text-xs text-muted-foreground">{p.tag}</span>
              <h3 className="mt-2 font-display text-lg leading-snug">{p.title}</h3>
              <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                <span>2026</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── API ───────── */
function ApiSection() {
  return (
    <section id="api" className="px-6 py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
            <Code2 className="h-3.5 w-3.5" /> Pika API
          </span>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">
            Bring Pika into your product.
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            One endpoint, every model. Generate, edit, and stream video from a
            single, simple API.
          </p>
          <Link
            to="/pika-api"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
          >
            Read the docs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-foreground text-background shadow-elegant">
          <div className="flex items-center gap-2 border-b border-background/10 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-background/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-background/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-background/30" />
            <span className="ml-2 font-mono text-xs opacity-70">curl</span>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed">
{`curl https://api.pika.art/v1/generate \\
  -H "Authorization: Bearer $PIKA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "pika-2.5",
    "prompt": "A neon koi swimming through clouds",
    "duration": 6
  }'`}
          </pre>
        </div>
      </div>
    </section>
  );
}

/* ───────── Final CTA ───────── */
function FinalCta() {
  return (
    <section className="px-6 py-32" style={{ background: "var(--gradient-surface)" }}>
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="font-display text-5xl leading-tight md:text-7xl">
          Make something <span className="text-gradient">unreal.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Start free. No credit card. Be making in under a minute.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3.5 text-sm font-medium text-background hover:opacity-90"
        >
          Try Pika free <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* ───────── Footer ───────── */
function LandingFooter() {
  const cols = [
    { title: "Product", links: ["Features", "Pricing", "Apps", "Changelog"] },
    { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
    { title: "Resources", links: ["Docs", "API", "Community", "Status"] },
    { title: "Legal", links: ["Terms", "Privacy", "Cookies", "DMCA"] },
  ];
  return (
    <footer className="relative overflow-hidden bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-10">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <div className="font-display text-2xl">pika</div>
            <p className="mt-3 max-w-xs text-sm opacity-70">
              The creative video platform.
            </p>
            <div className="mt-6 flex gap-3">
              {["IG", "X", "YT", "GH"].map((label) => (
                <a key={label} href="#" className="rounded-full border border-background/15 px-3 py-2 text-xs font-medium hover:bg-background/10">
                  {label}
                </a>
              ))}
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold">{col.title}</h4>
              <ul className="mt-3 space-y-2 text-sm opacity-70">
                {col.links.map((l) => (
                  <li key={l}><a href="#" className="hover:opacity-100">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex items-center justify-between border-t border-background/10 pt-6 text-xs opacity-60">
          <span>© 2026 Pika Labs</span>
          <span>Made with Pika</span>
        </div>
        <div
          aria-hidden
          className="pointer-events-none select-none text-center font-display text-[24vw] leading-none tracking-tight opacity-[0.06]"
        >
          pika
        </div>
      </div>
    </footer>
  );
}
