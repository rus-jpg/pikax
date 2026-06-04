import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/lib/projects.functions";
import {
  SKILLS,
  SKILL_CATEGORIES,
  SKILL_BY_ID,
  type Skill,
} from "@/lib/skills";
import { suggestApp, type AppSuggestion } from "@/lib/app-suggest.functions";

export const Route = createFileRoute("/_authenticated/apps")({
  component: AppsPage,
});

function AppsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createNew = useServerFn(createProject);
  const suggest = useServerFn(suggestApp);

  const [intent, setIntent] = useState("");
  const [suggestions, setSuggestions] = useState<AppSuggestion[] | null>(null);

  const launchMut = useMutation({
    mutationFn: (skill: Skill) =>
      createNew({
        data: {
          title: skill.label,
          skill: skill.id,
          studioMode: skill.kind,
          studioModel: skill.model,
        },
      }),
    onSuccess: ({ id }) => {
      void queryClient.invalidateQueries({ queryKey: ["projects-list"] });
      void navigate({ to: "/studio/$projectId", params: { projectId: id } });
    },
  });

  const startBlankMut = useMutation({
    mutationFn: (title?: string) => createNew({ data: { title } }),
    onSuccess: ({ id }) => {
      void queryClient.invalidateQueries({ queryKey: ["projects-list"] });
      void navigate({ to: "/studio/$projectId", params: { projectId: id } });
    },
  });

  const suggestMut = useMutation({
    mutationFn: (text: string) => suggest({ data: { intent: text } }),
    onSuccess: (res) => setSuggestions(res.suggestions),
    onError: (err: Error) => toast.error(err.message ?? "Suggestion failed"),
  });

  const launchById = (skillId: string) => {
    const skill = SKILL_BY_ID[skillId];
    if (skill) launchMut.mutate(skill);
  };

  const top = suggestions?.[0];
  const rest = suggestions?.slice(1) ?? [];

  return (
    <main className="min-h-screen w-full px-8 py-12 text-foreground">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Apps
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Pick an app — curated creative use-cases like Character Swap,
            Background Swap, Animate-a-Photo — or jump straight to a raw
            model. Each one spins up a fresh project tuned for the job.
            Powered by Fal.
          </p>
        </header>

        {/* Intent composer */}
        <div className="mb-12 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            What do you want to create?
          </div>
          <Textarea
            value={intent}
            onChange={(e) => {
              setIntent(e.target.value);
              if (suggestions) setSuggestions(null);
            }}
            placeholder="e.g. I want to turn my pet into a superhero"
            className="mt-3 min-h-[80px] resize-none border-0 bg-transparent p-0 text-lg shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (intent.trim()) suggestMut.mutate(intent.trim());
              }
            }}
          />
          <div className="mt-4 flex items-center justify-end">

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() =>
                  startBlankMut.mutate(intent.trim().slice(0, 80) || undefined)
                }
                disabled={startBlankMut.isPending || !intent.trim()}
                className="rounded-full"
              >
                Skip — use Agent mode
              </Button>
              <Button
                onClick={() => suggestMut.mutate(intent.trim())}
                disabled={suggestMut.isPending || !intent.trim()}
                className="rounded-full"
              >
                {suggestMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Find best App
              </Button>
            </div>
          </div>

          {suggestions && suggestions.length === 0 && (
            <div className="mt-5 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No App was a strong match. You can still start a project in{" "}
              <button
                onClick={() =>
                  startBlankMut.mutate(intent.trim().slice(0, 80) || undefined)
                }
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Agent mode
              </button>{" "}
              and describe it freely.
            </div>
          )}

          {top && (
            <div className="mt-5 space-y-3">
              <SuggestionCard
                suggestion={top}
                primary
                onPick={() => launchById(top.skillId)}
                pending={launchMut.isPending}
              />
              {rest.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="self-center text-xs text-muted-foreground">
                    Or try:
                  </span>
                  {rest.map((s) => (
                    <button
                      key={s.skillId}
                      onClick={() => launchById(s.skillId)}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-accent"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {SKILL_CATEGORIES.map((cat) => {
          const items = SKILLS.filter((s) => s.category === cat);
          return (
            <section key={cat} className="mb-12">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {cat}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => {
                  const Icon = s.icon;
                  const pending =
                    launchMut.isPending &&
                    (launchMut.variables as Skill | undefined)?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      disabled={launchMut.isPending}
                      onClick={() => launchMut.mutate(s)}
                      className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/50 hover:shadow-glow disabled:opacity-60"
                    >
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-primary-foreground shadow-glow">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-lg font-semibold tracking-tight">
                        {s.label}
                      </div>
                      <div className="text-sm leading-relaxed text-muted-foreground">
                        {s.description}
                      </div>
                      <div className="mt-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
                        {pending ? "launching…" : s.model}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function SuggestionCard({
  suggestion,
  primary,
  onPick,
  pending,
}: {
  suggestion: AppSuggestion;
  primary?: boolean;
  onPick: () => void;
  pending?: boolean;
}) {
  const skill = SKILL_BY_ID[suggestion.skillId];
  const Icon = skill?.icon;
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-4 ${
        primary
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-background"
      }`}
    >
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-gradient text-primary-foreground">
        {Icon ? <Icon className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate font-semibold">{suggestion.label}</div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {Math.round(suggestion.confidence * 100)}% match
          </span>
        </div>
        {suggestion.reason && (
          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {suggestion.reason}
          </div>
        )}
      </div>
      <Button
        onClick={onPick}
        disabled={pending}
        className="shrink-0 rounded-full"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Start <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
