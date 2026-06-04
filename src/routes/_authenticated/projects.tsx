import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Film, Trash2, Sparkles, Wand2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  listProjects,
  createProject,
  deleteProject,
} from "@/lib/projects.functions";
import { suggestApp, type AppSuggestion } from "@/lib/app-suggest.functions";
import { SKILL_BY_ID } from "@/lib/skills";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const navigate = useNavigate();
  const fetchList = useServerFn(listProjects);
  const createNew = useServerFn(createProject);
  const remove = useServerFn(deleteProject);
  const suggest = useServerFn(suggestApp);
  const queryClient = useQueryClient();

  const [intent, setIntent] = useState("");
  const [suggestions, setSuggestions] = useState<AppSuggestion[] | null>(null);

  const q = useQuery({
    queryKey: ["projects-list"],
    queryFn: () => fetchList(),
  });

  const createMut = useMutation({
    mutationFn: (input: { title?: string; skill?: string } = {}) =>
      createNew({ data: input }),
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

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["projects-list"] }),
  });

  const projects = q.data?.projects ?? [];

  const handleStart = (skillId?: string) => {
    const title = intent.trim().slice(0, 80) || undefined;
    createMut.mutate({ title, skill: skillId });
  };

  const top = suggestions?.[0];
  const rest = suggestions?.slice(1) ?? [];

  return (
    <main className="min-h-screen w-full bg-background px-8 py-12 text-foreground">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              Your projects
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Describe what you want to make — we'll match you with the right App.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => createMut.mutate({})}
            disabled={createMut.isPending}
            className="rounded-full"
          >
            <Plus className="h-4 w-4" /> Blank project
          </Button>
        </div>

        {/* Intent composer */}
        <div className="mb-10 rounded-3xl border border-border bg-card p-6 shadow-sm">
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
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Press ⌘↵ to find the best App
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => handleStart()}
                disabled={createMut.isPending || !intent.trim()}
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
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Find best App
              </Button>
            </div>
          </div>

          {suggestions && suggestions.length === 0 && (
            <div className="mt-5 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No App was a strong match. You can still start a project in{" "}
              <button
                onClick={() => handleStart()}
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
                onPick={() => handleStart(top.skillId)}
                pending={createMut.isPending}
              />
              {rest.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="self-center text-xs text-muted-foreground">
                    Or try:
                  </span>
                  {rest.map((s) => (
                    <button
                      key={s.skillId}
                      onClick={() => handleStart(s.skillId)}
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

        {q.isLoading && (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}
        {!q.isLoading && projects.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center">
            <Film className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe something above to get started.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/50 hover:shadow-glow"
            >
              <Link
                to="/studio/$projectId"
                params={{ projectId: p.id }}
                className="block"
              >
                {p.thumbnailUrl ? (
                  <img
                    src={p.thumbnailUrl}
                    alt={p.title}
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="grid aspect-video w-full place-items-center bg-brand-gradient text-primary-foreground">
                    <Film className="h-8 w-8" />
                  </div>
                )}
                <div className="p-4">
                  <div className="truncate text-base font-semibold">
                    {p.title}
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {p.sceneCount} shot{p.sceneCount === 1 ? "" : "s"} · updated{" "}
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${p.title}"? This cannot be undone.`))
                    deleteMut.mutate(p.id);
                }}
                aria-label="Delete project"
                className="absolute right-2 top-2 hidden h-8 w-8 place-items-center rounded-full bg-background/80 text-muted-foreground hover:text-destructive group-hover:grid"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
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
