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
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getProject,
  updateProjectState,
  attachLibraryAssetToProject,
} from "@/lib/projects.functions";
import type { ProjectAsset } from "@/lib/project-state";
import { SKILLS, type Skill } from "@/lib/skills";
import { getRecipeForSkill } from "@/lib/app-recipes";
import { getAppSwatch } from "@/lib/app-swatch";
import { cn } from "@/lib/utils";
import { LibraryPickerModal } from "@/components/v2/library-picker-modal";
import type { TimelineIntent } from "@/components/v2/apps/apps-workspace";

const CLIP_SECONDS = 5;
const TIMELINE_INSTANCE_SEP = "::timeline-instance::";

function makeTimelineRef(assetId: string) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${assetId}${TIMELINE_INSTANCE_SEP}${id}`;
}

function assetIdFromTimelineRef(ref: string) {
  return ref.includes(TIMELINE_INSTANCE_SEP)
    ? ref.split(TIMELINE_INSTANCE_SEP)[0]
    : ref;
}

function timelineRefAssetId(refOrAssetId: string, existingRefs: string[]) {
  return existingRefs.includes(refOrAssetId)
    ? assetIdFromTimelineRef(refOrAssetId)
    : refOrAssetId;
}

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Apps whose upload step accepts a given media kind (for "Edit with app").
function appsAcceptingKind(want: "image" | "video" | "audio"): Skill[] {
  return SKILLS.filter((s) => {
    const upload = getRecipeForSkill(s).steps.find((st) => st.kind === "upload");
    if (!upload) return false;
    return upload.accept === want || upload.accept === "any";
  });
}

// Apps that PRODUCE a given media kind (for "Add clip / Add audio").
function appsProducingKind(want: "visual" | "audio"): Skill[] {
  return SKILLS.filter((s) => {
    if (want === "audio") return s.kind === "audio" || s.kind === "speech";
    return s.kind === "image" || s.kind === "video";
  });
}

// Deterministic decorative waveform.
function fakeWave(seed: string, bars = 80): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const v = ((h >>> 8) % 100) / 100;
    const env = 0.35 + 0.55 * Math.sin((i / bars) * Math.PI);
    out.push(0.2 + v * 0.8 * env);
  }
  return out;
}

function AppPickerList({
  apps,
  onPick,
}: {
  apps: Skill[];
  onPick: (s: Skill) => void;
}) {
  if (apps.length === 0) {
    return (
      <p className="px-2 py-3 text-xs text-muted-foreground">
        No matching apps.
      </p>
    );
  }
  return (
    <div className="max-h-[60vh] overflow-y-auto">
      {apps.map((s) => {
        const Icon = s.icon;
        const sw = getAppSwatch(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s)}
            className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-muted"
          >
            <div
              className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md"
              style={{ backgroundColor: sw.bg, color: sw.fg }}
            >
              <Icon className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{s.label}</div>
              <div className="line-clamp-1 text-[10px] text-muted-foreground">
                {s.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ProjectTimelinePanel({
  projectId,
  onClose,
  onUseInApp,
}: {
  projectId?: string;
  onClose: () => void;
  onUseInApp?: (args: {
    skill: Skill;
    asset: ProjectAsset | null;
    intent?: TimelineIntent;
  }) => void;
}) {
  const qc = useQueryClient();
  const fetchProject = useServerFn(getProject);
  const updateState = useServerFn(updateProjectState);
  const attachLibrary = useServerFn(attachLibraryAssetToProject);
  const [libraryPickerFor, setLibraryPickerFor] = useState<
    null | { kind: "visual" | "audio" }
  >(null);
  const projectQ = useQuery({
    queryKey: ["v2-project", projectId],
    queryFn: () => fetchProject({ data: { id: projectId! } }),
    enabled: !!projectId,
  });

  const serverAssets = projectQ.data?.assets ?? [];
  const timeline = projectQ.data?.project?.projectState?.timeline;

  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  // Seed timeline with all existing project assets the first time it's
  // opened. After this, only outputs from apps invoked from the timeline
  // (via the popovers) are added automatically.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (!projectId) return;
    if (!projectQ.data) return;
    if (timeline?.seeded) {
      seededRef.current = true;
      return;
    }
    if (serverAssets.length === 0) return;
    seededRef.current = true;
    const initial = serverAssets.map((a) => a.id);
    setLocalOrder(initial);
    void updateState({
      data: {
        id: projectId,
        patch: { timeline: { order: initial, seeded: true } },
      },
    })
      .then(() => qc.invalidateQueries({ queryKey: ["v2-project", projectId] }))
      .catch((e) => console.error("[timeline] seed failed", e));
  }, [projectId, projectQ.data, timeline?.seeded, serverAssets, updateState, qc]);

  const effectiveOrder = localOrder ?? timeline?.order ?? [];

  // Allowlist semantics: only assets whose ids appear in `order` are shown.
  const assetsById = useMemo(
    () => new Map(serverAssets.map((a) => [a.id, a] as const)),
    [serverAssets],
  );

  const visualEntries = useMemo(() => {
    const out: { ref: string; asset: ProjectAsset }[] = [];
    for (const ref of effectiveOrder) {
      const a = assetsById.get(assetIdFromTimelineRef(ref));
      if (a && (a.mime.startsWith("image/") || a.mime.startsWith("video/"))) {
        out.push({ ref, asset: a });
      }
    }
    return out;
  }, [effectiveOrder, assetsById]);

  const visualAssets = useMemo(
    () => visualEntries.map((entry) => entry.asset),
    [visualEntries],
  );

  const audioEntries = useMemo(() => {
    const out: { ref: string; asset: ProjectAsset }[] = [];
    for (const ref of effectiveOrder) {
      const a = assetsById.get(assetIdFromTimelineRef(ref));
      if (a && a.mime.startsWith("audio/")) out.push({ ref, asset: a });
    }
    return out;
  }, [effectiveOrder, assetsById]);

  const audioAssets = useMemo(
    () => audioEntries.map((entry) => entry.asset),
    [audioEntries],
  );

  const totalSeconds = Math.max(visualAssets.length * CLIP_SECONDS, CLIP_SECONDS);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedEntry =
    visualEntries.find((entry) => entry.ref === selectedId) ?? visualEntries[0] ?? null;
  const selected = selectedEntry?.asset ?? null;
  useEffect(() => {
    if (!selectedEntry && visualEntries[0]) setSelectedId(visualEntries[0].ref);
  }, [visualEntries, selectedEntry]);

  // Transport
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTickRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!visualAssets.length) return;
    const idx = Math.min(
      Math.floor(currentTime / CLIP_SECONDS),
      visualAssets.length - 1,
    );
    const ref = visualEntries[idx]?.ref;
    if (ref && ref !== selectedId) setSelectedId(ref);
  }, [currentTime, visualAssets, visualEntries, selectedId]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (isPlaying) v.play().catch(() => {});
    else v.pause();
  }, [isPlaying, muted, selectedId]);

  // Audio playback sync — play all timeline audio tracks together with transport
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  useEffect(() => {
    for (const el of audioRefs.current.values()) {
      el.muted = muted;
      if (isPlaying) {
        // Resync from start on play to keep alignment simple
        try {
          el.currentTime = Math.min(currentTime, el.duration || currentTime);
        } catch {}
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    }
    // Only react to play/mute toggles, not every tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, muted, audioEntries.map((entry) => entry.ref).join(",")]);


  const persist = (nextOrder: string[]) => {
    if (!projectId) return;
    void updateState({
      data: { id: projectId, patch: { timeline: { order: nextOrder } } },
    })
      .then(() => qc.invalidateQueries({ queryKey: ["v2-project", projectId] }))
      .catch((e) => console.error("[timeline] persist failed", e));
  };

  const [dragId, setDragId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<"visual" | "audio" | null>(null);

  const readDragData = (e: React.DragEvent) => {
    const timelineRef =
      e.dataTransfer.getData("application/x-v2-timeline-ref") || dragId;
    const assetId =
      e.dataTransfer.getData("application/x-v2-asset-id") ||
      (timelineRef ? timelineRefAssetId(timelineRef, effectiveOrder) : "");
    return { timelineRef, assetId };
  };

  const insertTimelineItem = (
    next: string[],
    assetId: string,
    timelineRef: string | null,
    targetRef: string | null,
    place: "before" | "after" | "append",
  ) => {
    const isMove = !!timelineRef && next.includes(timelineRef);
    const refToInsert = isMove ? timelineRef : makeTimelineRef(assetId);
    if (targetRef === refToInsert) return next;
    if (isMove) next.splice(next.indexOf(refToInsert), 1);
    if (!targetRef || place === "append") {
      next.push(refToInsert);
      return next;
    }
    const targetIndex = next.indexOf(targetRef);
    if (targetIndex < 0) {
      next.push(refToInsert);
      return next;
    }
    next.splice(place === "before" ? targetIndex : targetIndex + 1, 0, refToInsert);
    return next;
  };

  const dropPlacementFromElement = (el: HTMLElement, clientX: number) => {
    const rect = el.getBoundingClientRect();
    return clientX < rect.left + rect.width / 2 ? "before" : "after";
  };

  const dropTargetFromTrack = (
    track: HTMLElement,
    clientX: number,
    selector: string,
  ) => {
    const items = Array.from(track.querySelectorAll<HTMLElement>(selector));
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      if (clientX < rect.left + rect.width / 2) {
        return { targetRef: item.dataset.timelineRef ?? null, place: "before" as const };
      }
    }
    const last = items.at(-1);
    return {
      targetRef: last?.dataset.timelineRef ?? null,
      place: last ? ("after" as const) : ("append" as const),
    };
  };

  const handleDropOnItem = (targetRef: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropHint(null);
    const { timelineRef, assetId } = readDragData(e);
    if (!assetId) return;
    const next = effectiveOrder.slice();
    insertTimelineItem(next, assetId, timelineRef, targetRef, dropPlacementFromElement(e.currentTarget as HTMLElement, e.clientX));
    setLocalOrder(next);
    persist(next);
    setDragId(null);
  };

  const handleAppendDrop = (
    e: React.DragEvent,
    kind: "visual" | "audio",
  ) => {
    e.preventDefault();
    setDropHint(null);
    const { timelineRef, assetId } = readDragData(e);
    if (!assetId) return;
    const mime =
      e.dataTransfer.getData("application/x-v2-asset-mime") ||
      assetsById.get(assetId)?.mime ||
      "";
    const isAudio = mime.startsWith("audio/");
    const isVisual = mime.startsWith("image/") || mime.startsWith("video/");
    if (kind === "visual" && !isVisual) return;
    if (kind === "audio" && !isAudio) return;
    const next = effectiveOrder.slice();
    const selector = kind === "visual" ? "[data-timeline-kind='visual']" : "[data-timeline-kind='audio']";
    const target = dropTargetFromTrack(e.currentTarget as HTMLElement, e.clientX, selector);
    insertTimelineItem(next, assetId, timelineRef, target.targetRef, target.place);
    setLocalOrder(next);
    persist(next);
    setDragId(null);
  };

  const handleDelete = (ref: string) => {
    const next = effectiveOrder.filter((x) => x !== ref);
    setLocalOrder(next);
    if (selectedId === ref) {
      const remaining = visualEntries.filter((entry) => entry.ref !== ref);
      setSelectedId(remaining[0]?.ref ?? null);
    }
    persist(next);
  };

  const seekTo = (t: number) => {
    const clamped = Math.max(0, Math.min(totalSeconds, t));
    setCurrentTime(clamped);
  };

  const playheadPct = totalSeconds > 0 ? (currentTime / totalSeconds) * 100 : 0;

  // Popover open state
  const [editClipFor, setEditClipFor] = useState<string | null>(null);
  const [addClipOpen, setAddClipOpen] = useState(false);
  const [editAudioFor, setEditAudioFor] = useState<string | null>(null);
  const [addAudioOpen, setAddAudioOpen] = useState(false);

  const pickEditClip = (skill: Skill, asset: ProjectAsset, targetRef: string) => {
    onUseInApp?.({
      skill,
      asset,
      intent: { kind: "replaceClip", targetRef },
    });
    setEditClipFor(null);
  };
  const pickAddClip = (skill: Skill) => {
    onUseInApp?.({ skill, asset: null, intent: { kind: "appendVisual" } });
    setAddClipOpen(false);
  };
  const pickEditAudio = (skill: Skill, asset: ProjectAsset, targetRef: string) => {
    onUseInApp?.({
      skill,
      asset,
      intent: { kind: "replaceAudio", targetRef },
    });
    setEditAudioFor(null);
  };
  const pickAddAudio = (skill: Skill) => {
    onUseInApp?.({ skill, asset: null, intent: { kind: "appendAudio" } });
    setAddAudioOpen(false);
  };

  const handleLibraryPick = async (item: { id: string; mime: string }) => {
    if (!projectId) return;
    try {
      const asset = await attachLibrary({
        data: { sourceAssetId: item.id, targetProjectId: projectId },
      });
      const next = effectiveOrder.slice();
      next.push(makeTimelineRef(asset.id));
      setLocalOrder(next);
      persist(next);
      await qc.invalidateQueries({ queryKey: ["v2-project", projectId] });
    } catch (e) {
      console.error("[timeline] library attach failed", e);
    }
  };


  return (
    <div className="flex h-full flex-col bg-card/40">
      {/* Header — matches project title font */}
      <header className="flex items-center justify-between gap-3 border-b border-border/50 px-6 py-4">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Timeline
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="shadow-none hover:bg-foreground hover:text-background">
            Share
          </Button>
          <Button variant="secondary" size="sm" className="shadow-none hover:bg-foreground hover:text-background">
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close timeline"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
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
                    key={selectedId}
                    ref={videoRef}
                    src={selected.url}
                    className="h-full w-full object-cover"
                    playsInline
                    muted={muted}
                  />
                ) : (
                  <img
                    key={selectedId}
                    src={selected.url}
                    alt={selected.label ?? selected.name}
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="grid h-full w-full place-items-center px-6 text-center text-xs text-muted-foreground">
                  No clips yet — click the <Plus className="mx-1 inline h-3 w-3" /> below to add one.
                </div>
              )}
            </div>
          </div>

          {/* Hidden audio elements for timeline preview playback */}
          {audioEntries.map(({ ref, asset: a }) => (
            <audio
              key={ref}
              src={a.url}
              ref={(el) => {
                if (el) audioRefs.current.set(ref, el);
                else audioRefs.current.delete(ref);
              }}
              preload="auto"
              className="hidden"
            />
          ))}

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

          {/* Time ruler + clip strip */}
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
              <div
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg p-1 -m-1 transition",
                  dropHint === "visual" && "bg-foreground/5 ring-2 ring-foreground/30",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropHint("visual");
                }}
                onDragLeave={() => setDropHint(null)}
                onDrop={(e) => handleAppendDrop(e, "visual")}
              >
                {visualEntries.map(({ ref, asset: a }) => {
                  const isSel = ref === selectedId;
                  return (
                    <Popover
                      key={ref}
                      open={editClipFor === ref}
                      onOpenChange={(o) => setEditClipFor(o ? ref : null)}
                    >
                      <PopoverTrigger asChild>
                        <div
                          draggable
                          data-timeline-kind="visual"
                          data-timeline-ref={ref}
                          onDragStart={(e) => {
                            setDragId(ref);
                            e.dataTransfer.setData("application/x-v2-timeline-ref", ref);
                            e.dataTransfer.setData("application/x-v2-asset-id", a.id);
                            e.dataTransfer.setData("application/x-v2-asset-mime", a.mime);
                            e.dataTransfer.effectAllowed = "copyMove";
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropOnItem(ref, e)}
                          onClick={() => {
                            setSelectedId(ref);
                            const idx = visualEntries.findIndex((v) => v.ref === ref);
                            if (idx >= 0) seekTo(idx * CLIP_SECONDS);
                            setEditClipFor(ref);
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
                              handleDelete(ref);
                            }}
                            className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-md bg-background/80 text-foreground opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
                            aria-label="Delete clip"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align="start"
                        className="w-72 p-2"
                      >
                        <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <Wand2 className="h-3 w-3" />
                          Edit clip with app
                        </div>
                        <AppPickerList
                          apps={appsAcceptingKind(
                            a.mime.startsWith("video/") ? "video" : "image",
                          )}
                          onPick={(s) => pickEditClip(s, a, ref)}
                        />
                      </PopoverContent>
                    </Popover>
                  );
                })}

                {/* Add-clip + button */}
                <Popover open={addClipOpen} onOpenChange={setAddClipOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="grid h-14 w-10 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
                      aria-label="Add clip"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-72 p-2">
                    <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <Plus className="h-3 w-3" />
                      Add a clip with an app
                    </div>
                    <AppPickerList
                      apps={appsProducingKind("visual")}
                      onPick={pickAddClip}
                    />
                    <div className="my-2 border-t border-border/60" />
                    <button
                      type="button"
                      onClick={() => {
                        setAddClipOpen(false);
                        setLibraryPickerFor({ kind: "visual" });
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-muted"
                    >
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-foreground">
                        <Plus className="h-3 w-3" />
                      </div>
                      <span>Choose from library</span>
                    </button>
                  </PopoverContent>
                </Popover>

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

              {/* Audio tracks */}
              <div
                className={cn(
                  "mt-3 space-y-1.5 rounded-lg p-1 -m-1 transition",
                  dropHint === "audio" && "bg-foreground/5 ring-2 ring-foreground/30",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropHint("audio");
                }}
                onDragLeave={() => setDropHint(null)}
                onDrop={(e) => handleAppendDrop(e, "audio")}
              >
                {audioEntries.map(({ ref, asset: a }) => {
                  const wave = fakeWave(a.id, 96);
                  return (
                    <Popover
                      key={ref}
                      open={editAudioFor === ref}
                      onOpenChange={(o) => setEditAudioFor(o ? ref : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          draggable
                          data-timeline-kind="audio"
                          data-timeline-ref={ref}
                          onDragStart={(e) => {
                            setDragId(ref);
                            e.dataTransfer.setData("application/x-v2-timeline-ref", ref);
                            e.dataTransfer.setData("application/x-v2-asset-id", a.id);
                            e.dataTransfer.setData("application/x-v2-asset-mime", a.mime);
                            e.dataTransfer.effectAllowed = "copyMove";
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropOnItem(ref, e)}
                          className="flex h-10 w-full items-center gap-2 overflow-hidden rounded-lg border border-border/60 bg-secondary/60 px-2 text-left transition hover:border-foreground/40"
                        >
                          <span className="shrink-0 text-[10px] font-medium text-secondary-foreground">
                            {a.label ?? a.name ?? "Audio"}
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
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="start" className="w-72 p-2">
                        <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <Wand2 className="h-3 w-3" />
                          Edit audio with app
                        </div>
                        <AppPickerList
                          apps={appsAcceptingKind("audio")}
                          onPick={(s) => pickEditAudio(s, a, ref)}
                        />
                      </PopoverContent>
                    </Popover>
                  );
                })}

                {/* Add-audio + button */}
                <Popover open={addAudioOpen} onOpenChange={setAddAudioOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-secondary/30 text-xs text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
                      aria-label="Add audio"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add audio with an app
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-72 p-2">
                    <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <Plus className="h-3 w-3" />
                      Add audio with an app
                    </div>
                    <AppPickerList
                      apps={appsProducingKind("audio")}
                      onPick={pickAddAudio}
                    />
                    <div className="my-2 border-t border-border/60" />
                    <button
                      type="button"
                      onClick={() => {
                        setAddAudioOpen(false);
                        setLibraryPickerFor({ kind: "audio" });
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-muted"
                    >
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-foreground">
                        <Plus className="h-3 w-3" />
                      </div>
                      <span>Choose from library</span>
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LibraryPickerModal
        open={!!libraryPickerFor}
        onClose={() => setLibraryPickerFor(null)}
        accept={libraryPickerFor?.kind === "audio" ? "audio" : "any"}
        onPick={(item) => {
          if (libraryPickerFor?.kind === "visual") {
            if (
              !item.mime.startsWith("image/") &&
              !item.mime.startsWith("video/")
            )
              return;
          }
          if (libraryPickerFor?.kind === "audio") {
            if (!item.mime.startsWith("audio/")) return;
          }
          void handleLibraryPick(item);
        }}
      />
    </div>
  );
}
