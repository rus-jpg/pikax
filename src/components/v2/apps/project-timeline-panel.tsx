import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Film, GripVertical, PanelRightClose, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getProject } from "@/lib/projects.functions";
import type { ProjectAsset } from "@/lib/project-state";

export function ProjectTimelinePanel({
  projectId,
  onClose,
}: {
  projectId?: string;
  onClose: () => void;
}) {
  const fetchProject = useServerFn(getProject);
  const projectQ = useQuery({
    queryKey: ["v2-project", projectId],
    queryFn: () => fetchProject({ data: { id: projectId! } }),
    enabled: !!projectId,
  });

  const assets = projectQ.data?.assets ?? [];
  const items: ProjectAsset[] = useMemo(
    () =>
      assets.filter((a) =>
        a.mime.startsWith("image/") ||
        a.mime.startsWith("video/") ||
        a.mime.startsWith("audio/"),
      ),
    [assets],
  );

  // Each clip is treated as 5s by default (matches scenesAppend default).
  const totalSeconds = items.length * 5;
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");

  return (
    <div className="flex h-full flex-col bg-card/40">
      <header className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2">
          <Film className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-base font-semibold tracking-tight">
            Timeline
          </h2>
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Clock className="h-3 w-3" /> {mm}:{ss}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close timeline"
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="grid h-full place-items-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
            <p className="max-w-xs text-xs text-muted-foreground">
              No clips yet. Generated outputs will appear here as ordered
              timeline items you can arrange.
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {items.map((a, i) => (
              <li
                key={a.id}
                className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-2 transition hover:border-foreground/40"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                  {i + 1}
                </div>
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {a.mime.startsWith("image/") && (
                    <img
                      src={a.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                  {a.mime.startsWith("video/") && (
                    <video
                      src={a.url}
                      muted
                      className="h-full w-full object-cover"
                    />
                  )}
                  {a.mime.startsWith("audio/") && (
                    <div className="grid h-full w-full place-items-center text-lg text-muted-foreground">
                      ♪
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">
                    {a.label || a.name || a.kind}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {a.mime.split("/")[0]} · 5.0s
                  </div>
                </div>
                <button
                  type="button"
                  className="opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove clip"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 px-3 py-3 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Add clip
              </button>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}
