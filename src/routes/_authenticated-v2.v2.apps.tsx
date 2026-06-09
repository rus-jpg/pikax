import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { SKILLS, SKILL_BY_ID, type Skill } from "@/lib/skills";
import { AppRunner, type AppRunResult } from "@/components/v2/apps/app-runner";
import { AppResultView } from "@/components/v2/apps/app-result-view";
import { HowItWorksV2 } from "@/components/v2/apps/how-it-works";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  app: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated-v2/v2/apps")({
  validateSearch: searchSchema,
  component: AppsV2,
});

const TABS = [
  "Featured",
  "Photo",
  "Video",
  "Image",
  "Marketing",
  "Audio",
  "Voice",
] as const;
type Tab = (typeof TABS)[number];

function tabMatches(skill: Skill, tab: Tab): boolean {
  if (tab === "Featured") return skill.id.startsWith("app-");
  if (tab === "Photo") return skill.category === "Photo Apps";
  if (tab === "Video")
    return skill.category === "Video Apps" || skill.category === "Video";
  if (tab === "Image") return skill.category === "Image";
  if (tab === "Marketing") return skill.category === "Marketing Apps";
  if (tab === "Audio")
    return skill.category === "Audio Apps" || skill.category === "Music";
  if (tab === "Voice")
    return skill.category === "Voice Apps" || skill.category === "Speech";
  return true;
}

function AppsV2() {
  const { app: appId, projectId } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Featured");
  const [hovered, setHovered] = useState<Skill | null>(null);
  const [result, setResult] = useState<AppRunResult | null>(null);

  const filtered = useMemo(() => SKILLS.filter((s) => tabMatches(s, tab)), [tab]);
  const selected: Skill | null = appId ? SKILL_BY_ID[appId] ?? null : null;
  const showcase = selected ?? hovered ?? filtered[0] ?? null;

  // Clear result when switching apps.
  useEffect(() => {
    setResult(null);
  }, [appId]);

  const selectApp = (s: Skill | null) => {
    void navigate({
      to: "/v2/apps",
      search: { app: s?.id, projectId },
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Middle column */}
      <div className="flex w-[420px] shrink-0 flex-col border-r border-border/50 bg-card/30">
        {selected ? (
          <AppRunner
            skill={selected}
            projectId={projectId}
            onBack={() => selectApp(null)}
            onResult={(r) => setResult(r)}
          />
        ) : (
          <>
            <header className="border-b border-border/50 px-5 pb-3 pt-6">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Apps
              </h1>
              <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition",
                      tab === t
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectApp(s)}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(null)}
                      className="group flex flex-col items-start gap-2 rounded-2xl border border-border/60 bg-card p-3 text-left transition hover:border-foreground/40 hover:shadow-elegant"
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-primary-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-sm font-semibold leading-tight text-foreground">
                        {s.label}
                      </div>
                      <div className="line-clamp-2 text-[11px] text-muted-foreground">
                        {s.description}
                      </div>
                    </button>
                  );
                })}
              </div>
              {filtered.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No apps in this category yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right column — result, timeline or how-it-works */}
      <div className="flex-1 overflow-y-auto bg-background">
        {result && selected ? (
          <AppResultView
            result={result}
            skill={selected}
            onRunAgain={() => setResult(null)}
          />
        ) : showcase ? (
          <HowItWorksV2 skill={showcase} />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Pick an app to get started.
          </div>
        )}
      </div>
    </div>
  );
}
      </div>
    </div>
  );
}
