import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Maximize2,
  PanelRightClose,
  Pause,
  Play,
  Plus,
  Share2,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getProject, updateProjectState } from "@/lib/projects.functions";
import type { ProjectAsset, TimelineState } from "@/lib/project-state";
import { cn } from "@/lib/utils";

const CLIP_SECONDS = 5;

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function applyTimeline(
  assets: ProjectAsset[],
  timeline: TimelineState | undefined,
): ProjectAsset[] {
  const hidden = new Set(timeline?.hidden ?? []);
  const filtered = assets.filter((a) => !hidden.has(a.id));
  const order = timeline?.order ?? [];
  if (order.length === 0) return filtered;
  const byId = new Map(filtered.map((a) => [a.id, a] as const));
  const seen = new Set<string>();
  const ordered: ProjectAsset[] = [];
  for (const id of order) {
    const a = byId.get(id);
    if (a) {
      ordered.push(a);
      seen.add(id);
    }
  }
  for (const a of filtered) if (!seen.has(a.id)) ordered.push(a);
  return ordered;
}

// Cheap, deterministic waveform from an asset id so it looks the same on
// every render without decoding audio.
function fakeWave(seed: string, bars = 80): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const v = ((h >>> 8) % 100) / 100;
    // shape: gentle envelope
    const env = 0.35 + 0.55 * Math.sin((i / bars) * Math.PI);
    out.push(0.2 + v * 0.8 * env);
  }
  return out;
}

export function ProjectTimelinePanel({
  projectId,
  onClose,
}: {
  projectId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fetchProject = useServerFn(getProject);
  const updateState = useServerFn(updateProjectState);
  const projectQ = useQuery({
    queryKey: ["v2-project", projectId],
    queryFn: () => fetchProject({ data: { id: projectId! } }),
    enabled: !!projectId,
  });

  const serverAssets = projectQ.data?.assets ?? [];
  const timeline = projectQ.data?.project?.projectState?.timeline;

  // Locally orchestrated order/hidden for snappy DnD/delete; we seed from
  // the server, then sync after mutations.
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [localHidden, setLocalHidden] = useState<string[] | null>(null);

  const effectiveTimeline: TimelineState = useMemo(
    () => ({
      order: localOrder ?? timeline?.order ?? [],
      hidden: localHidden ?? timeline?.hidden ?? [],
    }),
    [localOrder, localHidden, timeline?.order, timeline?.hidden],
  );

  const visualAssets = useMemo(
    () =>
      applyTimeline(
        serverAssets.filter(
          (a) => a.mime.startsWith("image/") || a.mime.startsWith("video/"),
        ),
        effectiveTimeline,
      ),
    [serverAssets, effectiveTimeline],
  );

  const audioAssets = useMemo(
    () => serverAssets.filter((a) => a.mime.startsWith("audio/")),
    [serverAssets],
  );

  const totalSeconds = Math.max(visualAssets.length * CLIP_SECONDS, CLIP_SECONDS);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    visualAssets.find((a) => a.id === selectedId) ?? visualAssets[0] ?? null;
  useEffect(() => {
    if (!selected && visualAssets[0]) setSelectedId(visualAssets[0].id);
  }, [visualAssets, selected]);

  // Transport state
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTickRef = useRef<number | null>(null);

  // Drive currentTime with rAF when playing (works for both image & video).
  useEffect(() => {
    if (!isPlaying) {
      lastTickRef.current = null;
      return;
    }
    let raf = 0;
    const tick = (ts: number) => {
      if (lastTickRef.current == null) lastTickRef.current = ts;
      const dt = (ts - lastTickRef.current) / 1000;
      lastTickRef.current = ts;
      setCurrentTime((t) => {
        const next = t + dt;
        if (next >= totalSeconds) {
          setIsPlaying(false);
          return totalSeconds;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, totalSeconds]);

  // Keep selected clip in sync with playhead.
  useEffect(() => {
    if (!visualAssets.length) return;
    const idx = Math.min(
      Math.floor(currentTime / CLIP_SECONDS),
      visualAssets.length - 1,
    );
    const id = visualAssets[idx]?.id;
    if (id && id !== selectedId) setSelectedId(id);
  }, [currentTime, visualAssets, selectedId]);

  // Sync the video element with transport when current clip is a video.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (isPlaying) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isPlaying, muted, selected?.id]);

  // Persist timeline changes (debounced + fire-and-forget).
  const persist = (next: TimelineState) => {
    if (!projectId) return;
    void updateState({ data: { id: projectId, patch: { timeline: next } } })
      .then(() => qc.invalidateQueries({ queryKey: ["v2-project", projectId] }))
      .catch((e) => console.error("[timeline] persist failed", e));
  };

  // Drag & drop reorder
  const [dragId, setDragId] = useState<string | null>(null);
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const cur = visualAssets.map((a) => a.id);
    const from = cur.indexOf(dragId);
    const to = cur.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = cur.slice();
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setLocalOrder(next);
    persist({ order: next, hidden: effectiveTimeline.hidden });
    setDragId(null);
  };

  const handleDelete = (id: string) => {
    const nextHidden = Array.from(
      new Set([...(effectiveTimeline.hidden ?? []), id]),
    );
    setLocalHidden(nextHidden);
    if (selectedId === id) {
      const remaining = visualAssets.filter((a) => a.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
    }
    persist({ order: effectiveTimeline.order, hidden: nextHidden });
  };

  const seekTo = (t: number) => {
    const clamped = Math.max(0, Math.min(totalSeconds, t));
    setCurrentTime(clamped);
  };

  const playheadPct = totalSeconds > 0 ? (currentTime / totalSeconds) * 100 : 0;

  return (
    <div className="flex h-full flex-col bg-card/40">
      {/* Slim header */}
      <header className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
        <div className="text-xs font-medium text-muted-foreground">Timeline</div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close timeline">
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </header>

      {/* Centered editor */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-5">
        <div className="flex w-full max-w-3xl flex-col items-center gap-4">
          {/* Preview */}
          <div className="w-full overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-elegant">
            <div className="relative aspect-video w-full">
              {selected ? (
                selected.mime.startsWith("video/") ? (
                  <video
                    key={selected.id}
                    ref={videoRef}
                    src={selected.url}
                    className="h-full w-full object-cover"
                    playsInline
                    muted={muted}
                  />
                ) : (
                  <img
                    key={selected.id}
                    src={selected.url}
                    alt={selected.label ?? selected.name}
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                  No clips yet
                </div>
              )}
            </div>
          </div>

          {/* Transport */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="text-muted-foreground transition hover:text-foreground"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
              {fmt(currentTime)}
            </span>
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              disabled={!selected}
              className="flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background shadow-elegant transition hover:opacity-90 disabled:opacity-40"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              {isPlaying ? "Pause" : "Preview"}
            </button>
            <span className="w-10 font-mono text-xs tabular-nums text-muted-foreground">
              {fmt(totalSeconds)}
            </span>
            <button
              type="button"
              className="text-muted-foreground transition hover:text-foreground"
              aria-label="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Time ruler + clip strip (horizontally scrollable) */}
          <div className="w-full overflow-x-auto">
            <div
              className="relative min-w-full"
              style={{ width: Math.max(visualAssets.length * 96 + 64, 480) }}
            >
              {/* Ruler */}
              <div
                className="relative mb-1 h-5 cursor-pointer select-none"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - r.left) / r.width;
                  seekTo(pct * totalSeconds);
                }}
              >
                {Array.from({
                  length: Math.max(Math.ceil(totalSeconds) + 1, 1),
                }).map((_, i) => {
                  const isMajor = i % 5 === 0;
                  const left = (i / totalSeconds) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 flex flex-col items-center"
                      style={{ left: `${left}%` }}
                    >
                      <div
                        className={cn(
                          "w-px bg-border",
                          isMajor ? "h-2.5" : "h-1.5",
                        )}
                      />
                      {isMajor && i !== 0 && (
                        <span className="mt-0.5 text-[10px] text-muted-foreground">
                          {i}s
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Clip strip */}
              <div className="relative flex items-center gap-1.5">
                {visualAssets.map((a) => {
                  const isSel = a.id === selected?.id;
                  return (
                    <div
                      key={a.id}
                      draggable
                      onDragStart={() => setDragId(a.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(a.id)}
                      onClick={() => {
                        setSelectedId(a.id);
                        const idx = visualAssets.findIndex((v) => v.id === a.id);
                        if (idx >= 0) seekTo(idx * CLIP_SECONDS);
                      }}
                      className={cn(
                        "group relative h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-muted transition",
                        isSel
                          ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                          : "ring-1 ring-border hover:ring-foreground/40",
                      )}
                    >
                      {a.mime.startsWith("image/") ? (
                        <img
                          src={a.url}
                          alt=""
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <video
                          src={a.url}
                          muted
                          className="h-full w-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(a.id);
                        }}
                        className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-md bg-background/80 text-foreground opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
                        aria-label="Delete clip"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="grid h-14 w-10 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
                  aria-label="Add clip"
                >
                  <Plus className="h-4 w-4" />
                </button>

                {/* Playhead */}
                {visualAssets.length > 0 && (
                  <div
                    className="pointer-events-none absolute -top-5 bottom-0 w-px bg-[oklch(0.7_0.18_45)]"
                    style={{
                      left: `calc(${(playheadPct / 100) * (visualAssets.length * (80 + 6))}px)`,
                    }}
                  >
                    <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-[oklch(0.7_0.18_45)]" />
                  </div>
                )}
              </div>

              {/* Audio track(s) */}
              <div className="mt-3 space-y-1.5">
                {(audioAssets.length > 0
                  ? audioAssets
                  : [{ id: "placeholder", name: "Audio", url: "" } as Partial<ProjectAsset>]
                ).map((a) => {
                  const wave = fakeWave(a.id ?? "audio", 96);
                  const isPlaceholder = !a.url;
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "flex h-10 items-center gap-2 overflow-hidden rounded-lg border border-border/60 bg-secondary/60 px-2",
                        isPlaceholder && "opacity-50",
                      )}
                    >
                      <span className="shrink-0 text-[10px] font-medium text-secondary-foreground">
                        {a.name ?? "Audio"}
                      </span>
                      <div className="flex h-full flex-1 items-center gap-[2px]">
                        {wave.map((v, i) => (
                          <div
                            key={i}
                            className="w-[2px] rounded-full bg-secondary-foreground/60"
                            style={{ height: `${Math.round(v * 70)}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Share / Export */}
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="ghost" size="sm">
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share
            </Button>
            <Button size="sm" className="bg-foreground text-background hover:opacity-90">
              Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
