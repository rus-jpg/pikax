import { useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Film,
  Plus,
} from "lucide-react";

import { listProjects } from "@/lib/projects.functions";
import { SKILL_BY_ID, type Skill } from "@/lib/skills";
import { getAppSwatch } from "@/lib/app-swatch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated-v2/v2/home")({
  component: HomePage,
});

type AppsTab =
  | "Featured"
  | "Photo"
  | "Video"
  | "Image"
  | "Marketing"
  | "Audio"
  | "Voice";

type AppGroup = {
  title: string;
  description: string;
  tab: AppsTab;
  moreLabel: string;
  appIds: string[];
};

const FEATURED_MODULES: { appId: string; tagline: string }[] = [
  { appId: "app-pika-lipsync", tagline: "Sync any face to any voice — drop in a portrait and an audio clip, get a perfectly lipsynced talking video." },
  { appId: "app-animate-photo", tagline: "Turn any still into a living frame with subtle motion and atmosphere." },
  { appId: "app-headshot-studio", tagline: "From casual selfie to polished, photoreal portrait in seconds." },
  { appId: "app-poster-maker", tagline: "Design scroll-stopping posters and key art in seconds." },
];


const QUICK_TILES: { appId: string; title: string; copy: string }[] = [
  { appId: "app-create", title: "Create with Nano Banana", copy: "Text-to-image with the latest model." },
  { appId: "app-animate-photo", title: "Animate an image", copy: "Add subtle motion to a still." },
  { appId: "app-create", title: "Create video using text", copy: "Describe a scene, get a clip." },
];

const APP_GROUPS: AppGroup[] = [
  {
    title: "Animate Photos",
    description: "Bring stills to life with subtle, cinematic motion.",
    tab: "Video",
    moreLabel: "More Animation Apps",
    appIds: [
      "app-animate-photo",
      "app-product-demo-loop",
      "app-cinematic-broll",
      "app-music-video-clip",
      "video-kling-i2v",
      "video-luma",
    ],
  },
  {
    title: "Video apps",
    description: "Bring scenes to life — animate, b-roll, trailers.",
    tab: "Video",
    moreLabel: "More Video Apps",
    appIds: [
      "app-animate-photo",
      "app-cinematic-broll",
      "app-music-video-clip",
      "app-product-demo-loop",
      "app-trailer-snippet",
    ],
  },
  {
    title: "Influencers",
    description: "Portraits, try-ons, and creator-ready looks.",
    tab: "Photo",
    moreLabel: "More Influencer Apps",
    appIds: [
      "app-headshot-studio",
      "app-outfit-try-on",
      "app-glow-up",
      "app-pet-portrait",
      "app-character-swap",
    ],
  },
  {
    title: "Marketing apps",
    description: "Posters, ads, product shots, and pitch-ready mockups.",
    tab: "Marketing",
    moreLabel: "More Marketing Apps",
    appIds: [
      "app-poster-maker",
      "app-product-shot",
      "app-logo-mockup",
      "app-ad-creative",
      "app-album-cover",
      "app-storyboard-frames",
    ],
  },
];

function HomePage() {
  const fetchList = useServerFn(listProjects);
  const q = useQuery({
    queryKey: ["v2-projects"],
    queryFn: () => fetchList(),
  });
  const projects = (q.data?.projects ?? []).slice(0, 10);

  const heroSkill = SKILL_BY_ID[FEATURED_MODULES[0].appId];

  return (
    <main className="h-full overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-8 py-8">
        {heroSkill && (
          <HeroSplit skill={heroSkill} tagline={FEATURED_MODULES[0].tagline} />
        )}

        <ProjectsStrip projects={projects} />

        <FeaturedCarousel />

        {APP_GROUPS.map((group) => (
          <AppGroupSection key={group.title} group={group} />
        ))}
      </div>
    </main>
  );
}


function HeroSplit({ skill, tagline }: { skill: Skill; tagline: string }) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Link
        to="/v2/apps"
        search={{ app: skill.id }}
        className="group relative col-span-1 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-muted/60 to-muted md:col-span-2"
      >
        <div className="aspect-[16/9] w-full bg-muted md:aspect-auto md:h-full md:min-h-[320px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6">
          <h2 className="font-display text-3xl font-semibold text-white">
            {skill.label}
          </h2>
          <p className="line-clamp-2 max-w-md text-sm text-white/85">
            {tagline}
          </p>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black">
              Try Now <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1 rounded-full bg-white/60",
                i === 0 ? "w-6" : "w-1.5 bg-white/40",
              )}
            />
          ))}
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
        <QuickTile tile={QUICK_TILES[0]} wide />
        <div className="col-span-2 grid grid-cols-2 gap-3 md:col-span-1">
          <QuickTile tile={QUICK_TILES[1]} />
          <QuickTile tile={QUICK_TILES[2]} />
        </div>
      </div>
    </section>
  );
}

function QuickTile({
  tile,
  wide,
}: {
  tile: (typeof QUICK_TILES)[number];
  wide?: boolean;
}) {
  const skill = SKILL_BY_ID[tile.appId];
  const swatch = skill ? getAppSwatch(skill.id) : { bg: "#e5e5e5", fg: "#000" };
  return (
    <Link
      to="/v2/apps"
      search={skill ? { app: skill.id } : undefined}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-foreground/40 hover:shadow-elegant",
        wide ? "min-h-[112px]" : "min-h-[112px]",
      )}
    >
      <div
        className="grid h-8 w-8 place-items-center rounded-full"
        style={{ backgroundColor: swatch.bg }}
      />
      <div className="mt-auto">
        <div className="text-sm font-semibold leading-tight">{tile.title}</div>
        <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
          {tile.copy}
        </div>
      </div>
    </Link>
  );
}

type ProjectCardData = {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  mediaUrls?: string[];
  sceneCount?: number;
  updatedAt?: string;
};

function ProjectsStrip({ projects }: { projects: ProjectCardData[] }) {
  return (
    <section>
      <Link
        to="/v2/projects"
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:underline"
      >
        Your Projects <ChevronRight className="h-4 w-4" />
      </Link>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {projects.slice(0, 6).map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
        <Link
          to="/v2/apps"
          className="flex min-h-[112px] items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> New project
        </Link>
      </div>
    </section>
  );
}

function ProjectCard({ project }: { project: ProjectCardData }) {
  const media = (
    project.mediaUrls && project.mediaUrls.length
      ? project.mediaUrls
      : project.thumbnailUrl
        ? [project.thumbnailUrl]
        : []
  ).slice(0, 3);
  const details =
    project.sceneCount && project.sceneCount > 0
      ? `${project.sceneCount} shot${project.sceneCount === 1 ? "" : "s"}${
          project.updatedAt
            ? ` · updated ${new Date(project.updatedAt).toLocaleDateString()}`
            : ""
        }`
      : project.updatedAt
        ? `Updated ${new Date(project.updatedAt).toLocaleDateString()}`
        : "Empty project";

  const rotations = ["-rotate-6", "rotate-3", "-rotate-2"];
  const offsets = ["right-16 top-3", "right-8 top-1", "right-1 top-4"];

  return (
    <Link
      to="/v2/projects/$projectId"
      params={{ projectId: project.id }}
      className="group relative flex min-h-[112px] items-center justify-between gap-4 overflow-hidden rounded-2xl border border-border bg-card pl-5 pr-3 transition hover:border-foreground/40 hover:shadow-elegant"
    >
      <div className="min-w-0 flex-1 py-4">
        <div className="truncate text-base font-semibold leading-tight">
          {project.title || "Untitled"}
        </div>
        <div className="mt-1 truncate text-sm text-muted-foreground">
          {details}
        </div>
      </div>
      <div className="relative h-[88px] w-[120px] shrink-0">
        {media.length === 0 ? (
          <div className="grid h-full w-full place-items-center rounded-xl bg-brand-gradient text-primary-foreground">
            <Film className="h-5 w-5" />
          </div>
        ) : (
          media.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className={cn(
                "absolute h-[72px] w-[64px] rounded-xl border-2 border-background object-cover shadow-sm transition",
                rotations[i] ?? "",
                offsets[i] ?? "right-1 top-2",
              )}
              style={{ zIndex: i + 1 }}
            />
          ))
        )}
      </div>
    </Link>
  );
}

function FeaturedCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const cards = FEATURED_MODULES.slice(1)
    .map((m) => ({ skill: SKILL_BY_ID[m.appId], tagline: m.tagline }))
    .filter((c) => c.skill);

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="font-display text-lg font-semibold">Featured Apps</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((c) => (
          <FeaturedWideCard
            key={c.skill!.id}
            skill={c.skill!}
            tagline={c.tagline}
          />
        ))}
      </div>
    </section>
  );
}

function FeaturedWideCard({
  skill,
  tagline,
}: {
  skill: Skill;
  tagline: string;
}) {
  return (
    <Link
      to="/v2/apps"
      search={{ app: skill.id }}
      className="group flex w-[calc(50%-0.5rem)] min-w-[420px] shrink-0 snap-start gap-5 overflow-hidden rounded-3xl border border-border bg-card p-5 transition hover:border-foreground/40 hover:shadow-elegant"
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 py-2">
        <div>
          <div className="font-display text-2xl font-semibold leading-tight">
            {skill.label}
          </div>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
            {tagline}
          </p>
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background">
            Try Now <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
      <div className="aspect-square h-44 shrink-0 rounded-2xl bg-muted" />
    </Link>
  );
}

function AppGroupSection({ group }: { group: AppGroup }) {
  const skills = group.appIds
    .map((id) => SKILL_BY_ID[id])
    .filter(Boolean) as Skill[];
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{group.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{group.description}</p>
        </div>
        <Link
          to="/v2/apps"
          search={{ tab: group.tab }}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {group.moreLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {skills.slice(0, 4).map((s) => (
          <AppCard key={s.id} skill={s} />
        ))}
      </div>
    </section>
  );
}

function AppCard({ skill }: { skill: Skill }) {
  const Icon = skill.icon;
  const swatch = getAppSwatch(skill.id);
  return (
    <Link
      to="/v2/apps"
      search={{ app: skill.id }}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-3 transition hover:border-foreground/40 hover:shadow-elegant",
      )}
    >
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted" />
      <div className="flex items-start gap-2 px-1 pb-1">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[24%]"
          style={{ backgroundColor: swatch.bg, color: swatch.fg }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight">
            {skill.label}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
            {skill.description}
          </div>
        </div>
      </div>
    </Link>
  );
}
