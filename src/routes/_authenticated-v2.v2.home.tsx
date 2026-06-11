import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Film } from "lucide-react";

import { HomeComposer } from "@/components/v2/home/home-composer";
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
  { appId: "app-character-swap", tagline: "Drop a new character into any scene — pose, lighting, and composition stay locked." },
  { appId: "app-animate-photo", tagline: "Turn any still into a living frame with subtle motion and atmosphere." },
  { appId: "app-headshot-studio", tagline: "From casual selfie to polished, photoreal portrait in seconds." },
];

const APP_GROUPS: AppGroup[] = [
  {
    title: "Image apps",
    description: "Generate, edit, and re-style stills.",
    tab: "Photo",
    moreLabel: "More image apps",
    appIds: [
      "app-character-swap",
      "app-background-swap",
      "app-outfit-try-on",
      "app-room-redesign",
      "app-glow-up",
      "app-object-remove",
    ],
  },
  {
    title: "Video apps",
    description: "Bring scenes to life — animate, b-roll, trailers.",
    tab: "Video",
    moreLabel: "More video apps",
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
    moreLabel: "More creator apps",
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
    moreLabel: "More marketing apps",
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
  const projects = (q.data?.projects ?? []).slice(0, 8);

  return (
    <main className="h-full overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-8 py-16">
        <section className="flex flex-col items-center gap-8 pt-8 text-center">
          <h1 className="font-display text-5xl font-black uppercase tracking-tight md:text-6xl">
            What will you create
            <br />
            with Pika today?
          </h1>
          <div className="w-full max-w-3xl">
            <HomeComposer />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-lg font-semibold">
              Recent projects
            </h2>
            <Link
              to="/v2/projects"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
            >
              See all
            </Link>
          </div>
          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
              Nothing yet — type a prompt above to get started.
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  to="/v2/projects/$projectId"
                  params={{ projectId: p.id }}
                  className="group flex w-64 shrink-0 items-center gap-3 rounded-2xl border border-border bg-card p-2 transition hover:border-foreground/40 hover:shadow-elegant"
                >
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt={p.title}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-gradient text-primary-foreground">
                      <Film className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {p.title || "Untitled"}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      Jump back in
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {(() => {
          const hero = SKILL_BY_ID[FEATURED_MODULES[0].appId];
          return hero ? (
            <FeaturedHero skill={hero} tagline={FEATURED_MODULES[0].tagline} />
          ) : null;
        })()}

        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-lg font-semibold">Featured apps</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {FEATURED_MODULES.slice(1).map((m) => {
              const skill = SKILL_BY_ID[m.appId];
              if (!skill) return null;
              return <FeaturedAppModule key={m.appId} skill={skill} tagline={m.tagline} />;
            })}
          </div>
        </section>


        {APP_GROUPS.map((group) => (
          <AppGroupSection key={group.title} group={group} />
        ))}

        <section className="flex justify-center pb-8">
          <Link
            to="/v2/apps"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold transition hover:border-foreground/40 hover:shadow-elegant"
          >
            See all apps <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}

function FeaturedHero({ skill, tagline }: { skill: Skill; tagline: string }) {
  const Icon = skill.icon;
  const swatch = getAppSwatch(skill.id);
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Featured app
          </div>
          <h2 className="font-display text-2xl font-semibold">{skill.label}</h2>
        </div>
        <Link
          to="/v2/apps"
          search={{ app: skill.id }}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90"
        >
          Try {skill.label} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="grid gap-4 p-5 md:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className="grid h-14 w-14 shrink-0 place-items-center rounded-[28%]"
                style={{ backgroundColor: swatch.bg, color: swatch.fg }}
              >
                <Icon className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{skill.label}</div>
                <div className="text-[11px] text-muted-foreground">
                  {skill.category}
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {tagline}
            </p>
            <p className="text-xs text-muted-foreground/70">
              Example outputs from {skill.label}
            </p>
            <Link
              to="/v2/apps"
              search={{ app: skill.id }}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold transition hover:border-foreground/40"
            >
              Use this app <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square w-full overflow-hidden rounded-xl"
                style={{ backgroundColor: swatch.bg }}
              >
                <div className="grid h-full w-full place-items-center opacity-20">
                  <Icon className="h-8 w-8" style={{ color: swatch.fg }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedAppModule({ skill, tagline }: { skill: Skill; tagline: string }) {
  const Icon = skill.icon;
  const swatch = getAppSwatch(skill.id);
  return (
    <Link
      to="/v2/apps"
      search={{ app: skill.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-foreground/40 hover:shadow-elegant"
    >
      <div
        className="relative aspect-video w-full overflow-hidden"
        style={{ backgroundColor: swatch.bg }}
      >
        <div className="absolute inset-0 grid place-items-center opacity-30">
          <Icon className="h-24 w-24" style={{ color: swatch.fg }} />
        </div>
      </div>
      <div className="flex items-start gap-3 p-4">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[24%]"
          style={{ backgroundColor: swatch.bg, color: swatch.fg }}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold leading-tight">
            {skill.label}
          </div>
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {tagline}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
        <span className="text-xs text-muted-foreground">Featured app</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
          Try it <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
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
      <div
        className="aspect-video w-full overflow-hidden rounded-xl"
        style={{ backgroundColor: swatch.bg }}
      >
        <div className="grid h-full w-full place-items-center opacity-30">
          <Icon className="h-10 w-10" style={{ color: swatch.fg }} />
        </div>
      </div>
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
