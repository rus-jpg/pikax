import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy,
  Maximize2,
  PanelRightClose,
  Pause,
  Play,
  Plus,
  Redo2,
  Scissors,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

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
import type { ProjectAsset, TimelineTrim } from "@/lib/project-state";
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
  const [localTrims, setLocalTrims] = useState<Record<string, TimelineTrim> | null>(null);

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
  const effectiveTrims = localTrims ?? timeline?.trims ?? {};

  // Probed media durations (seconds) for audio/video assets whose DB row
  // is missing a stored duration. Filled in by the effect below.
  const [probedDurations, setProbedDurations] = useState<Record<string, number>>(
    {},
  );

  const getNaturalDuration = (assetId: string): number | undefined => {
    const a = assetsById.get(assetId);
    if (a && typeof a.duration === "number" && a.duration > 0) return a.duration;
    const p = probedDurations[assetId];
    return typeof p === "number" && p > 0 ? p : undefined;
  };

  const getTrim = (ref: string): TimelineTrim => {
    if (effectiveTrims[ref]) {
      const t = effectiveTrims[ref];
      // If the stored trim still reflects the placeholder default end and
      // we now know the real natural duration, prefer that.
      if (
        t.start === 0 &&
        (t.end === CLIP_SECONDS || t.end == null) &&
        typeof t.offset !== "number"
      ) {
        const nat = getNaturalDuration(assetIdFromTimelineRef(ref));
        if (nat) return { start: 0, end: nat };
      }
      return t;
    }
    const assetId = assetIdFromTimelineRef(ref);
    const a = assetsById.get(assetId);
    const nat = getNaturalDuration(assetId);
    const natural =
      a && (a.mime.startsWith("audio/") || a.mime.startsWith("video/")) && nat
        ? nat
        : CLIP_SECONDS;
    return { start: 0, end: natural };
  };

  const getDur = (ref: string) => {
    const t = getTrim(ref);
    return Math.max(0.2, t.end - t.start);
  };

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

  // Probe natural durations for audio/video assets whose DB row doesn't
  // include a stored `duration`, so the timeline clip width matches the
  // real media length instead of falling back to CLIP_SECONDS.
  useEffect(() => {
    const toProbe = serverAssets.filter(
      (a) =>
        (a.mime.startsWith("audio/") || a.mime.startsWith("video/")) &&
        !(typeof a.duration === "number" && a.duration > 0) &&
        probedDurations[a.id] == null &&
        !!a.url,
    );
    if (toProbe.length === 0) return;
    let cancelled = false;
    toProbe.forEach((a) => {
      const el = document.createElement(
        a.mime.startsWith("video/") ? "video" : "audio",
      ) as HTMLMediaElement;
      el.preload = "metadata";
      el.src = a.url;
      const done = () => {
        const d = el.duration;
        if (!cancelled && typeof d === "number" && isFinite(d) && d > 0) {
          setProbedDurations((prev) =>
            prev[a.id] ? prev : { ...prev, [a.id]: d },
          );
        }
        el.src = "";
      };
      el.addEventListener("loadedmetadata", done, { once: true });
      el.addEventListener("error", () => {
        if (!cancelled) {
          // Mark as probed with 0 so we don't retry forever.
          setProbedDurations((prev) =>
            prev[a.id] != null ? prev : { ...prev, [a.id]: 0 },
          );
        }
      }, { once: true });
    });
    return () => {
      cancelled = true;
    };
  }, [serverAssets, probedDurations]);

  // Resolved start time (seconds) per visual entry. Uses explicit offset
  // if set; otherwise lays the clip immediately after the previous one.
  const cumStarts = useMemo(() => {
    const out: number[] = [];
    let cursor = 0;
    for (const e of visualEntries) {
      const t = effectiveTrims[e.ref];
      const off = typeof t?.offset === "number" ? t.offset : cursor;
      out.push(off);
      cursor = off + getDur(e.ref);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualEntries, effectiveTrims]);

  const audioStarts = useMemo(() => {
    const out: number[] = [];
    let cursor = 0;
    for (const e of audioEntries) {
      const t = effectiveTrims[e.ref];
      const off = typeof t?.offset === "number" ? t.offset : cursor;
      out.push(off);
      cursor = off + getDur(e.ref);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioEntries, effectiveTrims]);

  const visualEnd = cumStarts.reduce(
    (m, s, i) => Math.max(m, s + getDur(visualEntries[i].ref)),
    0,
  );
  const audioEnd = audioStarts.reduce(
    (m, s, i) => Math.max(m, s + getDur(audioEntries[i].ref)),
    0,
  );
  const visualTotal = Math.max(visualEnd, audioEnd);
  const totalSeconds = Math.max(visualTotal, CLIP_SECONDS);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedEntry =
    visualEntries.find((entry) => entry.ref === selectedId) ??
    audioEntries.find((entry) => entry.ref === selectedId) ??
    visualEntries[0] ??
    audioEntries[0] ??
    null;
  const selected = selectedEntry?.asset ?? null;
  useEffect(() => {
    if (!selectedEntry && (visualEntries[0] || audioEntries[0])) {
      setSelectedId((visualEntries[0] ?? audioEntries[0])!.ref);
    }
  }, [visualEntries, audioEntries, selectedEntry]);

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
    if (!visualEntries.length) return;
    let idx = 0;
    for (let i = 0; i < visualEntries.length; i++) {
      const start = cumStarts[i];
      const end = start + getDur(visualEntries[i].ref);
      if (currentTime >= start && currentTime < end) {
        idx = i;
        break;
      }
      if (currentTime >= end) idx = i;
    }
    const ref = visualEntries[idx]?.ref;
    if (ref && ref !== selectedId) setSelectedId(ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, visualEntries, cumStarts]);

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


  // ---- History (undo/redo) ----
  type Snapshot = { order: string[]; trims: Record<string, TimelineTrim> };
  const historyRef = useRef<{ past: Snapshot[]; future: Snapshot[] }>({
    past: [],
    future: [],
  });
  const [historyTick, setHistoryTick] = useState(0);
  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  const persistSnapshot = (snap: Snapshot) => {
    if (!projectId) return;
    void updateState({
      data: {
        id: projectId,
        patch: { timeline: { order: snap.order, trims: snap.trims } },
      },
    })
      .then(() => qc.invalidateQueries({ queryKey: ["v2-project", projectId] }))
      .catch((e) => console.error("[timeline] persist failed", e));
  };

  const snapshot = (): Snapshot => ({
    order: effectiveOrder.slice(),
    trims: { ...effectiveTrims },
  });

  const commitSnap = (next: Snapshot) => {
    historyRef.current.past.push(snapshot());
    if (historyRef.current.past.length > 50) historyRef.current.past.shift();
    historyRef.current.future = [];
    setHistoryTick((n) => n + 1);
    setLocalOrder(next.order);
    setLocalTrims(next.trims);
    persistSnapshot(next);
  };

  const commit = (nextOrder: string[], nextTrims?: Record<string, TimelineTrim>) =>
    commitSnap({ order: nextOrder, trims: nextTrims ?? effectiveTrims });

  const persist = commit;

  const undo = () => {
    const prev = historyRef.current.past.pop();
    if (!prev) return;
    historyRef.current.future.push(snapshot());
    setHistoryTick((n) => n + 1);
    setLocalOrder(prev.order);
    setLocalTrims(prev.trims);
    persistSnapshot(prev);
  };
  const redo = () => {
    const next = historyRef.current.future.pop();
    if (!next) return;
    historyRef.current.past.push(snapshot());
    setHistoryTick((n) => n + 1);
    setLocalOrder(next.order);
    setLocalTrims(next.trims);
    persistSnapshot(next);
  };

  // ---- Zoom ----
  const [zoom, setZoom] = useState(1); // 0.5 - 2.5
  const clipPx = Math.round(80 * zoom);
  const pxPerSec = clipPx / CLIP_SECONDS;
  const clipGapPx = 6;
  void historyTick;

  // ---- Duplicate selected clip ----
  const duplicateSelected = () => {
    if (!selectedEntry) return;
    const idx = effectiveOrder.indexOf(selectedEntry.ref);
    if (idx < 0) return;
    const next = effectiveOrder.slice();
    const newRef = makeTimelineRef(selectedEntry.asset.id);
    next.splice(idx + 1, 0, newRef);
    // Inherit the same trim window so a duplicate is truly a copy.
    const nextTrims = { ...effectiveTrims, [newRef]: { ...getTrim(selectedEntry.ref) } };
    commit(next, nextTrims);
    setSelectedId(newRef);
  };

  // ---- Split at playhead (works across visual + audio) ----
  const splitAtPlayhead = () => {
    type Track = { kind: "visual" | "audio"; entries: typeof visualEntries; starts: number[] };
    const tracks: Track[] = [
      { kind: "visual", entries: visualEntries, starts: cumStarts },
      { kind: "audio", entries: audioEntries, starts: audioStarts },
    ];
    let target: { ref: string; assetId: string; local: number } | null = null;
    for (const t of tracks) {
      for (let i = 0; i < t.entries.length; i++) {
        const start = t.starts[i];
        const end = start + getDur(t.entries[i].ref);
        if (currentTime >= start && currentTime < end) {
          target = {
            ref: t.entries[i].ref,
            assetId: t.entries[i].asset.id,
            local: currentTime - start,
          };
          break;
        }
      }
      if (target) break;
    }
    if (!target) return;
    performSplit(target.ref, target.assetId, target.local);
  };

  // Split a specific clip at an absolute timeline time.
  const splitAtTime = (ref: string, timelineTime: number) => {
    const inVisual = visualEntries.findIndex((e) => e.ref === ref);
    const inAudio = audioEntries.findIndex((e) => e.ref === ref);
    let start: number | null = null;
    if (inVisual >= 0) start = cumStarts[inVisual];
    else if (inAudio >= 0) start = audioStarts[inAudio];
    if (start == null) return;
    const assetId = assetIdFromTimelineRef(ref);
    performSplit(ref, assetId, timelineTime - start);
  };

  const performSplit = (ref: string, assetId: string, localOffset: number) => {
    const trim = getTrim(ref);
    const cutAt = trim.start + localOffset;
    if (cutAt - trim.start < 0.2 || trim.end - cutAt < 0.2) return;
    const newRef = makeTimelineRef(assetId);
    const next = effectiveOrder.slice();
    const orderIdx = next.indexOf(ref);
    next.splice(orderIdx + 1, 0, newRef);
    const nextTrims = {
      ...effectiveTrims,
      [ref]: { ...effectiveTrims[ref], start: trim.start, end: cutAt },
      [newRef]: { start: cutAt, end: trim.end },
    };
    commit(next, nextTrims);
    setSelectedId(newRef);
  };

  // ---- Trim handles (drag left/right edges of a clip) ----
  const beginTrim = (
    ref: string,
    edge: "start" | "end",
    e: React.PointerEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const baseTrim = getTrim(ref);
    const baseTrims = { ...effectiveTrims };
    const asset = assetsById.get(assetIdFromTimelineRef(ref));
    const isImage = asset?.mime.startsWith("image/") ?? false;
    const probed = asset ? probedDurations[asset.id] : 0;
    const naturalDur =
      typeof asset?.duration === "number" && asset.duration > 0
        ? asset.duration
        : probed && probed > 0
          ? probed
          : null;
    const maxEnd = isImage ? 600 : naturalDur ?? CLIP_SECONDS;

    // Locate this clip on its track to compute its anchored timeline-left.
    const visIdx = visualEntries.findIndex((x) => x.ref === ref);
    const audIdx = audioEntries.findIndex((x) => x.ref === ref);
    const isVisualTrack = visIdx >= 0;
    const clipStartTime = isVisualTrack ? cumStarts[visIdx] ?? 0 : audioStarts[audIdx] ?? 0;
    const nextEntry = isVisualTrack ? visualEntries[visIdx + 1] : audioEntries[audIdx + 1];
    const nextEntryStart = isVisualTrack
      ? cumStarts[visIdx + 1]
      : audioStarts[audIdx + 1];
    const snapTargets = collectSnapTargets(ref).concat([currentTime]);
    const snapSec = SNAP_PX / Math.max(1, pxPerSec);

    let latest = baseTrim;
    let altPin = false;
    const onMove = (ev: PointerEvent) => {
      altPin = ev.altKey;
      const dx = ev.clientX - startX;
      const dSec = dx / Math.max(1, pxPerSec);
      let nextStart = baseTrim.start;
      let nextEnd = baseTrim.end;
      if (edge === "end") {
        nextEnd = Math.max(Math.min(maxEnd, baseTrim.end + dSec), baseTrim.start + 0.2);
        // Snap the timeline right-edge to playhead / neighbor edges.
        const proposedRight = clipStartTime + (nextEnd - baseTrim.start);
        let best = proposedRight;
        let bestDist = snapSec;
        for (const t of snapTargets) {
          const d = Math.abs(proposedRight - t);
          if (d < bestDist) {
            bestDist = d;
            best = t;
          }
        }
        if (best !== proposedRight) {
          const snapped = baseTrim.start + (best - clipStartTime);
          nextEnd = Math.max(Math.min(maxEnd, snapped), baseTrim.start + 0.2);
        }
      } else {
        nextStart = Math.min(Math.max(0, baseTrim.start + dSec), baseTrim.end - 0.2);
        // Trim-start changes clip duration; the timeline-left stays anchored
        // at clipStartTime (sequential), so the moving edge is the right edge:
        // length = end - nextStart. Snap that right edge to neighbors.
        const proposedRight = clipStartTime + (baseTrim.end - nextStart);
        let best = proposedRight;
        let bestDist = snapSec;
        for (const t of snapTargets) {
          const d = Math.abs(proposedRight - t);
          if (d < bestDist) {
            bestDist = d;
            best = t;
          }
        }
        if (best !== proposedRight) {
          const snappedStart = baseTrim.end - (best - clipStartTime);
          nextStart = Math.min(Math.max(0, snappedStart), baseTrim.end - 0.2);
        }
      }
      latest = { ...baseTrim, start: nextStart, end: nextEnd };
      const nextTrims: Record<string, TimelineTrim> = { ...baseTrims, [ref]: latest };
      // Alt = "trim in place": pin the next clip so following clips don't
      // ripple along with this trim.
      if (altPin && nextEntry && typeof nextEntryStart === "number") {
        nextTrims[nextEntry.ref] = {
          ...getTrim(nextEntry.ref),
          offset: nextEntryStart,
        };
      }
      setLocalTrims(nextTrims);
      setTrimHud({
        durSec: latest.end - latest.start,
        leftPx: clipStartTime * pxPerSec,
        widthPx: (latest.end - latest.start) * pxPerSec,
        kind: isVisualTrack ? "visual" : "audio",
        altPin,
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const finalTrims: Record<string, TimelineTrim> = { ...baseTrims, [ref]: latest };
      if (altPin && nextEntry && typeof nextEntryStart === "number") {
        finalTrims[nextEntry.ref] = {
          ...getTrim(nextEntry.ref),
          offset: nextEntryStart,
        };
      }
      setTrimHud(null);
      commitSnap({ order: effectiveOrder.slice(), trims: finalTrims });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ---- Move handles (drag a clip/audio body to reposition in time) ----
  const SNAP_PX = 12;
  const collectSnapTargets = (excludeRef: string): number[] => {
    const out: number[] = [0];
    visualEntries.forEach((e, i) => {
      if (e.ref === excludeRef) return;
      out.push(cumStarts[i]);
      out.push(cumStarts[i] + getDur(e.ref));
    });
    audioEntries.forEach((e, i) => {
      if (e.ref === excludeRef) return;
      out.push(audioStarts[i]);
      out.push(audioStarts[i] + getDur(e.ref));
    });
    return out;
  };
  const snapTime = (t: number, dur: number, targets: number[]) => {
    const snapSec = SNAP_PX / Math.max(1, pxPerSec);
    let best = t;
    let bestDist = snapSec;
    for (const target of targets) {
      // Snap clip start
      const d1 = Math.abs(t - target);
      if (d1 < bestDist) {
        best = target;
        bestDist = d1;
      }
      // Snap clip end (so end aligns with target)
      const d2 = Math.abs(t + dur - target);
      if (d2 < bestDist) {
        best = target - dur;
        bestDist = d2;
      }
    }
    return Math.max(0, best);
  };

  // ---- Drag-to-reorder (iMovie-style) ----
  // While dragging, the clip follows the cursor and a vertical indicator
  // line shows where it will land. On release, the clip snaps into that
  // slot and the timeline reflows.
  type DragState = {
    ref: string;
    kind: "visual" | "audio";
    rowIndex: number; // for audio rows
    ghostLeftPx: number; // left of ghost relative to track
    ghostTopPx: number; // top of ghost relative to track row
    widthPx: number;
    heightPx: number;
    insertIdx: number; // insertion index among the OTHER refs of this kind
    insertX: number; // px where the indicator line should render
  };
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [trimHud, setTrimHud] = useState<null | {
    durSec: number;
    leftPx: number;
    widthPx: number;
    kind: "visual" | "audio";
    altPin: boolean;
  }>(null);

  const beginMove = (
    ref: string,
    e: React.PointerEvent,
    kind: "visual" | "audio",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const clipEl = e.currentTarget as HTMLElement;
    const trackEl = clipEl.closest<HTMLElement>(`[data-track-kind="${kind}"]`);
    if (!trackEl) return;
    const clipRect = clipEl.getBoundingClientRect();
    const trackRect = trackEl.getBoundingClientRect();
    // Shift-click = blade split at click X (no drag).
    if (e.shiftKey) {
      const xSec = (e.clientX - trackRect.left) / Math.max(1, pxPerSec);
      splitAtTime(ref, xSec);
      return;
    }
    const startClipLeft = clipRect.left - trackRect.left;
    const startClipTop = clipRect.top - trackRect.top;
    const grabOffsetX = e.clientX - clipRect.left;
    const grabOffsetY = e.clientY - clipRect.top;
    const widthPx = clipRect.width;
    const heightPx = clipRect.height;

    const entries = kind === "visual" ? visualEntries : audioEntries;
    const starts = kind === "visual" ? cumStarts : audioStarts;
    const others: { ref: string; start: number; end: number }[] = [];
    entries.forEach((en, i) => {
      if (en.ref === ref) return;
      others.push({ ref: en.ref, start: starts[i], end: starts[i] + getDur(en.ref) });
    });

    // iMovie-style insertion: find the gap edge nearest to the cursor X.
    // Edges are the boundaries between sibling clips on the same track,
    // including the track start (0) and the end of the last sibling.
    const movedDur = getDur(ref);
    const snapTargets = collectSnapTargets(ref);
    const computeInsert = (cursorXPx: number) => {
      const cursorSec = cursorXPx / Math.max(1, pxPerSec);
      const edges: { x: number; idx: number }[] = [{ x: 0, idx: 0 }];
      others.forEach((o, i) => {
        edges.push({ x: o.end, idx: i + 1 });
      });
      let best = edges[0];
      let bestDist = Infinity;
      for (const e of edges) {
        const d = Math.abs(cursorSec - e.x);
        if (d < bestDist) {
          bestDist = d;
          best = e;
        }
      }
      return { insertIdx: best.idx, insertX: best.x * pxPerSec };
    };

    let moved = false;
    let latest: DragState = {
      ref,
      kind,
      rowIndex: kind === "audio" ? audioEntries.findIndex((x) => x.ref === ref) : 0,
      ghostLeftPx: startClipLeft,
      ghostTopPx: startClipTop,
      widthPx,
      heightPx,
      insertIdx: -1,
      insertX: 0,
    };

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - (trackRect.left + startClipLeft + grabOffsetX);
      const dy = ev.clientY - (trackRect.top + startClipTop + grabOffsetY);
      if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      moved = true;
      let ghostLeftPx = Math.max(
        -widthPx / 2,
        ev.clientX - trackRect.left - grabOffsetX,
      );
      // Snap ghost start to neighbor edges / playhead.
      const snappedSec = snapTime(
        ghostLeftPx / Math.max(1, pxPerSec),
        movedDur,
        snapTargets.concat([currentTime]),
      );
      ghostLeftPx = snappedSec * pxPerSec;
      const ghostTopPx = ev.clientY - trackRect.top - grabOffsetY;
      const cursorXPx = ev.clientX - trackRect.left;
      const { insertIdx, insertX } = computeInsert(cursorXPx);
      latest = { ...latest, ghostLeftPx, ghostTopPx, insertIdx, insertX };
      setDragState(latest);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragState(null);
      if (!moved) return; // treat as click
      const kindRefs = new Set(entries.map((x) => x.ref));
      const otherRefs = others.map((o) => o.ref);
      const newKindOrder = [
        ...otherRefs.slice(0, latest.insertIdx),
        ref,
        ...otherRefs.slice(latest.insertIdx),
      ];
      let k = 0;
      const newOrder = effectiveOrder.map((r) =>
        kindRefs.has(r) ? newKindOrder[k++] : r,
      );
      // Clear any explicit offset on the moved clip so it flows in its
      // new sequential slot.
      const nextTrims = { ...effectiveTrims };
      const existing = nextTrims[ref];
      if (existing && typeof existing.offset === "number") {
        const { offset: _o, ...rest } = existing;
        void _o;
        nextTrims[ref] = rest;
      }
      commitSnap({ order: newOrder, trims: nextTrims });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        handleDelete(selectedId, { leaveGap: e.altKey });
        return;
      }
      if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && selectedId) {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        // Option/Alt = nudge the selected clip by 1 frame (1/30s) via offset.
        if (e.altKey) {
          const step = dir * (1 / 30);
          const cur = getTrim(selectedId);
          const inVisual = visualEntries.findIndex((v) => v.ref === selectedId);
          const inAudio = audioEntries.findIndex((v) => v.ref === selectedId);
          const baseStart =
            inVisual >= 0
              ? cumStarts[inVisual] ?? 0
              : inAudio >= 0
                ? audioStarts[inAudio] ?? 0
                : 0;
          const nextOffset = Math.max(0, baseStart + step);
          const nextTrims = {
            ...effectiveTrims,
            [selectedId]: { ...cur, offset: nextOffset },
          };
          commitSnap({ order: effectiveOrder.slice(), trims: nextTrims });
          return;
        }
        // Plain arrow: step selection through the merged track list.
        const merged = [
          ...visualEntries.map((v, i) => ({ ref: v.ref, start: cumStarts[i] ?? 0 })),
          ...audioEntries.map((v, i) => ({ ref: v.ref, start: audioStarts[i] ?? 0 })),
        ];
        if (merged.length === 0) return;
        const i = merged.findIndex((m) => m.ref === selectedId);
        const ni =
          dir > 0
            ? Math.min(i + 1, merged.length - 1)
            : Math.max(i - 1, 0);
        const next = merged[ni];
        if (next) {
          setSelectedId(next.ref);
          seekTo(next.start);
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key.toLowerCase() === "s" && !mod) {
        e.preventDefault();
        splitAtPlayhead();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, visualEntries, effectiveOrder]);


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

  const handleDropOnItem = (
    targetRef: string,
    e: React.DragEvent,
    kind: "visual" | "audio",
  ) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleDelete = (ref: string, opts?: { leaveGap?: boolean }) => {
    const visualIdx = visualEntries.findIndex((e) => e.ref === ref);
    const audioIdx = audioEntries.findIndex((e) => e.ref === ref);
    const isVisual = visualIdx >= 0;
    const entries = isVisual ? visualEntries : audioEntries;
    const starts = isVisual ? cumStarts : audioStarts;
    const idx = isVisual ? visualIdx : audioIdx;
    const nextTrims = { ...effectiveTrims };
    if (opts?.leaveGap && idx >= 0) {
      const nextEntry = entries[idx + 1];
      if (nextEntry) {
        const existing = nextTrims[nextEntry.ref];
        if (!existing || typeof existing.offset !== "number") {
          const nextStart = starts[idx + 1];
          nextTrims[nextEntry.ref] = {
            ...getTrim(nextEntry.ref),
            offset: nextStart,
          };
        }
      }
    }
    delete nextTrims[ref];
    const next = effectiveOrder.filter((x) => x !== ref);
    if (selectedId === ref) {
      const fallback =
        (isVisual ? visualEntries : audioEntries).filter((e) => e.ref !== ref)[0] ??
        (isVisual ? audioEntries : visualEntries)[0] ??
        null;
      setSelectedId(fallback?.ref ?? null);
    }
    commitSnap({ order: next, trims: nextTrims });
  };

  // Collapse a gap on a track: clear the explicit offset on the clip that
  // follows the gap so it (and everything after) flows leftward.
  const collapseGap = (_kind: "visual" | "audio", nextRef: string) => {
    const nextTrims = { ...effectiveTrims };
    const existing = nextTrims[nextRef];
    if (existing && typeof existing.offset === "number") {
      const { offset: _o, ...rest } = existing;
      void _o;
      nextTrims[nextRef] = rest;
    }
    commitSnap({ order: effectiveOrder.slice(), trims: nextTrims });
  };

  // Gap segments per track derived from current layout.
  const visualGaps: { start: number; end: number; nextRef: string }[] = [];
  {
    let cursor = 0;
    visualEntries.forEach((e, i) => {
      const s = cumStarts[i];
      if (s > cursor + 0.01) visualGaps.push({ start: cursor, end: s, nextRef: e.ref });
      cursor = s + getDur(e.ref);
    });
  }
  const audioGaps: { start: number; end: number; nextRef: string }[] = [];
  {
    let cursor = 0;
    audioEntries.forEach((e, i) => {
      const s = audioStarts[i];
      if (s > cursor + 0.01) audioGaps.push({ start: cursor, end: s, nextRef: e.ref });
      cursor = s + getDur(e.ref);
    });
  }

  const seekTo = (t: number) => {
    const clamped = Math.max(0, Math.min(totalSeconds, t));
    setCurrentTime(clamped);
  };




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
              disabled={!selected && audioEntries.length === 0}
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

          {/* Editor toolbar */}
          <div className="flex w-full items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
                title="Undo (⌘Z)"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
                title="Redo (⇧⌘Z)"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <div className="mx-1 h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                onClick={splitAtPlayhead}
                disabled={!visualEntries.length && !audioEntries.length}
                aria-label="Split at playhead"
                title="Split at playhead (S)"
              >
                <Scissors className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={duplicateSelected}
                disabled={!selectedEntry}
                aria-label="Duplicate clip"
                title="Duplicate clip (⌘D)"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => selectedId && handleDelete(selectedId, { leaveGap: e.altKey })}
                disabled={!selectedId}
                aria-label="Delete clip"
                title="Delete (⌫)"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ZoomOut className="h-3.5 w-3.5" />
              <Slider
                value={[zoom]}
                min={0.5}
                max={2.5}
                step={0.1}
                onValueChange={(v) => setZoom(v[0] ?? 1)}
                className="w-32"
                aria-label="Zoom"
              />
              <ZoomIn className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Time ruler + clip strip */}
          <div className="w-full overflow-x-auto">
            <div
              className="relative min-w-full"
              style={{ width: Math.max(totalSeconds * pxPerSec + 80, 480) }}
            >
              {/* Ruler */}
              <div
                className="relative mb-1 h-5 cursor-pointer select-none"
                onPointerDown={(e) => {
                  e.preventDefault();
                  const rulerEl = e.currentTarget;
                  const r = rulerEl.getBoundingClientRect();
                  const seek = (clientX: number) =>
                    seekTo(Math.max(0, (clientX - r.left) / Math.max(1, pxPerSec)));
                  seek(e.clientX);
                  const onMove = (ev: PointerEvent) => seek(ev.clientX);
                  const onUp = () => {
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", onUp);
                  };
                  window.addEventListener("pointermove", onMove);
                  window.addEventListener("pointerup", onUp);
                }}
              >
                {Array.from({
                  length: Math.max(Math.ceil(totalSeconds) + 1, 1),
                }).map((_, i) => {
                  const isMajor = i % 5 === 0;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 flex flex-col items-center"
                      style={{ left: `${i * pxPerSec}px` }}
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

              <div
                data-track-kind="visual"
                className={cn(
                  "relative h-14 rounded-lg transition",
                  dropHint === "visual" && "bg-foreground/5 ring-2 ring-foreground/30",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropHint("visual");
                }}
                onDragLeave={() => setDropHint(null)}
                onDrop={(e) => handleAppendDrop(e, "visual")}
              >
                {/* Gaps — click to collapse */}
                {visualGaps.map((g, i) => (
                  <button
                    key={`vgap-${i}`}
                    type="button"
                    onClick={() => collapseGap("visual", g.nextRef)}
                    style={{
                      left: `${g.start * pxPerSec}px`,
                      width: `${(g.end - g.start) * pxPerSec}px`,
                    }}
                    className="group absolute top-0 h-14 rounded-md border border-dashed border-border/60 bg-foreground/[0.02] transition hover:border-foreground/40 hover:bg-foreground/5"
                    aria-label="Remove gap"
                    title="Click to remove gap"
                  >
                    <span className="pointer-events-none flex h-full w-full items-center justify-center text-[10px] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                      Remove gap
                    </span>
                  </button>
                ))}
                {visualEntries.map(({ ref, asset: a }, idx) => {
                  const isSel = ref === selectedId;
                  const dur = getDur(ref);
                  const widthPx = Math.max(24, dur * pxPerSec);
                  const leftPx = cumStarts[idx] * pxPerSec;
                  return (
                    <Popover
                      key={ref}
                      open={editClipFor === ref}
                      onOpenChange={(o) => setEditClipFor(o ? ref : null)}
                    >
                      <PopoverTrigger asChild>
                        <div
                          data-timeline-kind="visual"
                          data-timeline-ref={ref}
                          onPointerDown={(e) => {
                            const t = e.target as HTMLElement;
                            if (t.closest && t.closest("[data-trim-handle]")) return;
                            beginMove(ref, e, "visual");
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropOnItem(ref, e, "visual")}
                          onClick={() => {
                            setSelectedId(ref);
                            seekTo(cumStarts[idx] ?? 0);
                            setEditClipFor(ref);
                          }}
                          style={
                            dragState?.ref === ref
                              ? {
                                  width: widthPx,
                                  left: `${dragState.ghostLeftPx}px`,
                                  top: `${dragState.ghostTopPx}px`,
                                  zIndex: 40,
                                  pointerEvents: "none",
                                  opacity: 0.85,
                                  boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                                }
                              : { width: widthPx, left: `${leftPx}px` }
                          }
                          className={cn(
                            "group absolute top-0 h-14 cursor-grab overflow-hidden rounded-lg bg-muted transition active:cursor-grabbing",
                            isSel
                              ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                              : "ring-1 ring-border hover:ring-foreground/40",
                            dragState && dragState.ref !== ref && "opacity-60",
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
                              draggable={false}
                              className="h-full w-full object-cover"
                            />
                          )}
                          {/* Trim handles */}
                          <div
                            data-trim-handle="start"
                            onPointerDown={(e) => beginTrim(ref, "start", e)}
                            onClick={(e) => e.stopPropagation()}
                            draggable={false}
                            className="absolute inset-y-0 left-0 z-10 w-2.5 cursor-ew-resize bg-foreground/0 transition hover:bg-foreground/50 group-hover:bg-foreground/30"
                            title="Trim start"
                          />
                          <div
                            data-trim-handle="end"
                            onPointerDown={(e) => beginTrim(ref, "end", e)}
                            onClick={(e) => e.stopPropagation()}
                            draggable={false}
                            className="absolute inset-y-0 right-0 z-10 w-2.5 cursor-ew-resize bg-foreground/0 transition hover:bg-foreground/50 group-hover:bg-foreground/30"
                            title="Trim end"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(ref, { leaveGap: e.altKey });
                            }}
                            className="absolute right-1.5 top-0.5 z-20 grid h-5 w-5 place-items-center rounded-md bg-background/80 text-foreground opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
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

                {/* Add-clip + button — pinned to right end of last visual clip */}
                <Popover open={addClipOpen} onOpenChange={setAddClipOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      style={{ left: `${visualEnd * pxPerSec + 6}px` }}
                      className="absolute top-0 grid h-14 w-10 place-items-center rounded-lg border border-border bg-muted text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
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

                {/* Drag insertion indicator */}
                {dragState && dragState.kind === "visual" && (
                  <div
                    className="pointer-events-none absolute -top-1 bottom-0 z-30 w-0.5 rounded-full bg-[oklch(0.7_0.18_45)] shadow-[0_0_8px_oklch(0.7_0.18_45)]"
                    style={{ left: `${dragState.insertX}px` }}
                  />
                )}

                {/* Trim HUD — visual track */}
                {trimHud && trimHud.kind === "visual" && (
                  <div
                    className="pointer-events-none absolute -top-6 z-40 rounded-md bg-foreground px-2 py-0.5 text-[10px] font-medium text-background shadow-lg"
                    style={{ left: `${trimHud.leftPx + trimHud.widthPx / 2 - 30}px` }}
                  >
                    {trimHud.durSec.toFixed(2)}s{trimHud.altPin ? " · pinned" : ""}
                  </div>
                )}
                {/* Playhead */}
                <div
                  className="pointer-events-none absolute -top-5 bottom-0 w-px bg-[oklch(0.7_0.18_45)]"
                  style={{ left: `${currentTime * pxPerSec}px` }}
                >
                  <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-[oklch(0.7_0.18_45)]" />
                </div>
              </div>

              {/* Audio tracks — absolute positioning by time, one row each */}
              <div
                className={cn(
                  "relative mt-3 space-y-1.5 rounded-lg transition",
                  dropHint === "audio" && "bg-foreground/5 ring-2 ring-foreground/30",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropHint("audio");
                }}
                onDragLeave={() => setDropHint(null)}
                onDrop={(e) => handleAppendDrop(e, "audio")}
              >
                {trimHud && trimHud.kind === "audio" && (
                  <div
                    className="pointer-events-none absolute -top-6 z-40 rounded-md bg-foreground px-2 py-0.5 text-[10px] font-medium text-background shadow-lg"
                    style={{ left: `${trimHud.leftPx + trimHud.widthPx / 2 - 30}px` }}
                  >
                    {trimHud.durSec.toFixed(2)}s{trimHud.altPin ? " · pinned" : ""}
                  </div>
                )}
                {audioEntries.map(({ ref, asset: a }, idx) => {
                  const wave = fakeWave(a.id, 96);
                  const dur = getDur(ref);
                  const widthPx = Math.max(40, dur * pxPerSec);
                  const leftPx = audioStarts[idx] * pxPerSec;
                  return (
                    <div key={ref} data-track-kind="audio" className="relative h-10">
                      {/* Gaps for this audio entry — only show on the row whose nextRef matches */}
                      {audioGaps
                        .filter((g) => g.nextRef === ref)
                        .map((g, gi) => (
                          <button
                            key={`agap-${gi}`}
                            type="button"
                            onClick={() => collapseGap("audio", g.nextRef)}
                            style={{
                              left: `${g.start * pxPerSec}px`,
                              width: `${(g.end - g.start) * pxPerSec}px`,
                            }}
                            className="absolute top-0 h-10 rounded-md border border-dashed border-border/60 bg-foreground/[0.02] transition hover:border-foreground/40 hover:bg-foreground/5"
                            aria-label="Remove gap"
                            title="Click to remove gap"
                          />
                        ))}
                      {dragState && dragState.kind === "audio" && dragState.ref === ref && (
                        <div
                          className="pointer-events-none absolute -top-1 bottom-0 z-30 w-0.5 rounded-full bg-[oklch(0.7_0.18_45)] shadow-[0_0_8px_oklch(0.7_0.18_45)]"
                          style={{ left: `${dragState.insertX}px` }}
                        />
                      )}
                      <Popover
                        open={editAudioFor === ref}
                        onOpenChange={(o) => setEditAudioFor(o ? ref : null)}
                      >
                        <PopoverTrigger asChild>
                          <div
                            data-timeline-kind="audio"
                            data-timeline-ref={ref}
                            onPointerDown={(e) => {
                              const t = e.target as HTMLElement;
                              if (t.closest && t.closest("[data-trim-handle]")) return;
                              beginMove(ref, e, "audio");
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropOnItem(ref, e, "audio")}
                            onClick={() => setEditAudioFor(ref)}
                            style={
                              dragState?.ref === ref
                                ? {
                                    left: `${dragState.ghostLeftPx}px`,
                                    top: `${dragState.ghostTopPx}px`,
                                    width: widthPx,
                                    zIndex: 40,
                                    pointerEvents: "none",
                                    opacity: 0.85,
                                    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                                  }
                                : { left: `${leftPx}px`, width: widthPx }
                            }
                            className={cn(
                              "group absolute top-0 flex h-10 cursor-grab items-center gap-2 overflow-hidden rounded-lg border border-border/60 bg-secondary/60 px-2 text-left transition hover:border-foreground/40 active:cursor-grabbing",
                              dragState && dragState.ref !== ref && "opacity-60",
                            )}
                          >
                            <span className="shrink-0 truncate text-[10px] font-medium text-secondary-foreground">
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
                            {/* Trim handles */}
                            <div
                              data-trim-handle="start"
                              onPointerDown={(e) => beginTrim(ref, "start", e)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute inset-y-0 left-0 z-10 w-2.5 cursor-ew-resize bg-foreground/0 transition hover:bg-foreground/50 group-hover:bg-foreground/30"
                              title="Trim start"
                            />
                            <div
                              data-trim-handle="end"
                              onPointerDown={(e) => beginTrim(ref, "end", e)}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute inset-y-0 right-0 z-10 w-2.5 cursor-ew-resize bg-foreground/0 transition hover:bg-foreground/50 group-hover:bg-foreground/30"
                              title="Trim end"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(ref, { leaveGap: e.altKey });
                              }}
                              className="absolute right-1.5 top-0.5 z-20 grid h-4 w-4 place-items-center rounded-md bg-background/80 text-foreground opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
                              aria-label="Delete audio"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
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
                    </div>
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
