import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, FolderOpen, Library, Loader2, Upload, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { listLibrary } from "@/lib/library.functions";
import type { ProjectAsset } from "@/lib/project-state";

export type PickerAccept = "image" | "video" | "audio" | "any";

export type PickerResult =
  | { kind: "library"; assets: ProjectAsset[] }
  | { kind: "files"; files: File[] };

function acceptString(accept: PickerAccept): string {
  if (accept === "image") return "image/*";
  if (accept === "video") return "video/*";
  if (accept === "audio") return "audio/*";
  return "*/*";
}

function mimeMatches(mime: string, accept: PickerAccept): boolean {
  if (accept === "any") return true;
  return mime.startsWith(`${accept}/`);
}

export function AssetPickerDialog({
  open,
  onOpenChange,
  accept,
  multiple,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accept: PickerAccept;
  multiple?: boolean;
  onPick: (result: PickerResult) => void;
}) {
  const listLibraryFn = useServerFn(listLibrary);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<"library" | "camera" | "computer">("library");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setTab("library");
    }
  }, [open]);

  const libraryQuery = useQuery({
    queryKey: ["v2-library-picker"],
    queryFn: () => listLibraryFn(),
    enabled: open,
  });

  const items = useMemo(() => {
    const lib = libraryQuery.data;
    if (!lib) return [];
    const all = [...(lib.references ?? []), ...(lib.generations ?? [])];
    return all.filter((a: { mime: string }) => mimeMatches(a.mime, accept));
  }, [libraryQuery.data, accept]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (!multiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  const confirmLibrary = () => {
    const picked = items
      .filter((it) => selected.has(it.id))
      .map(
        (it): ProjectAsset => ({
          id: it.id,
          kind:
            (it.kind as ProjectAsset["kind"]) ?? "reference",
          mime: it.mime,
          name: it.name,
          url: it.url,
          label: it.label ?? undefined,
        }),
      );
    if (picked.length === 0) return;
    onPick({ kind: "library", assets: picked });
    onOpenChange(false);
  };

  const onComputerFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onPick({ kind: "files", files: Array.from(files) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add a file</DialogTitle>
          <DialogDescription>
            Pick from your Library, take a photo, or upload from your computer.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="library" className="gap-2">
              <Library className="h-4 w-4" /> Library
            </TabsTrigger>
            <TabsTrigger
              value="camera"
              className="gap-2"
              disabled={accept !== "image" && accept !== "any"}
            >
              <Camera className="h-4 w-4" /> Camera
            </TabsTrigger>
            <TabsTrigger value="computer" className="gap-2">
              <FolderOpen className="h-4 w-4" /> Computer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4">
            {libraryQuery.isLoading ? (
              <div className="grid h-64 place-items-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="grid h-64 place-items-center text-sm text-muted-foreground">
                Nothing in your library matches yet.
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto pr-1">
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {items.map((it) => {
                    const active = selected.has(it.id);
                    return (
                      <button
                        type="button"
                        key={it.id}
                        onClick={() => toggle(it.id)}
                        className={
                          "group relative overflow-hidden rounded-xl border bg-card text-left transition " +
                          (active
                            ? "border-primary ring-2 ring-primary"
                            : "border-border hover:border-primary/50")
                        }
                      >
                        {it.mime.startsWith("image/") ? (
                          <img
                            src={it.url}
                            alt={it.name}
                            className="aspect-square w-full object-cover"
                          />
                        ) : it.mime.startsWith("video/") ? (
                          <video
                            src={it.url}
                            muted
                            className="aspect-square w-full object-cover"
                          />
                        ) : (
                          <div className="grid aspect-square w-full place-items-center bg-muted text-muted-foreground">
                            ♪
                          </div>
                        )}
                        <div className="truncate px-2 py-1.5 text-[11px] text-muted-foreground">
                          {it.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={confirmLibrary} disabled={selected.size === 0}>
                Use {selected.size || ""} selected
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="camera" className="mt-4">
            <CameraCapture
              onCapture={(file) => {
                onPick({ kind: "files", files: [file] });
                onOpenChange(false);
              }}
            />
          </TabsContent>

          <TabsContent value="computer" className="mt-4">
            <div className="grid h-64 place-items-center rounded-xl border border-dashed border-border bg-background/40">
              <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                <Upload className="h-6 w-6" />
                <div>Drag &amp; drop or select files from your computer.</div>
                <Button onClick={() => fileRef.current?.click()}>
                  Choose files
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept={acceptString(accept)}
                  multiple={multiple}
                  onChange={(e) => onComputerFiles(e.target.files)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CameraCapture({ onCapture }: { onCapture: (file: File) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch (err) {
        console.error("[camera] getUserMedia failed", err);
        setError("Couldn't access the camera. Check browser permissions.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const snap = async () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) return;
    const file = new File([blob], `camera-${Date.now()}.png`, {
      type: "image/png",
    });
    onCapture(file);
  };

  if (error) {
    return (
      <div className="grid h-64 place-items-center rounded-xl border border-border bg-background/40 text-sm text-destructive">
        <div className="flex items-center gap-2">
          <X className="h-4 w-4" /> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full overflow-hidden rounded-xl border border-border bg-black">
        <video
          ref={videoRef}
          className="max-h-[420px] w-full object-contain"
          playsInline
          muted
        />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>
      <Button onClick={snap} disabled={!ready}>
        <Camera className="mr-2 h-4 w-4" /> Take photo
      </Button>
    </div>
  );
}
