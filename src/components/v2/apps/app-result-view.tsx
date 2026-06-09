import { Link } from "@tanstack/react-router";
import { Check, FolderOpen, ImageIcon, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppRunResult } from "@/components/v2/apps/app-runner";
import type { Skill } from "@/lib/skills";

export function AppResultView({
  result,
  skill,
  onRunAgain,
}: {
  result: AppRunResult;
  skill: Skill;
  onRunAgain: () => void;
}) {
  const isImage = result.mime.startsWith("image/");
  const isVideo = result.mime.startsWith("video/");
  const isAudio = result.mime.startsWith("audio/");

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col px-8 py-8">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-emerald-600">
        <Check className="h-4 w-4" /> Result ready
      </div>

      <div className="flex-1 overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
        <div className="grid h-full place-items-center bg-muted/30 p-4">
          {isImage && (
            <img
              src={result.assetUrl}
              alt=""
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
          )}
          {isVideo && (
            <video
              src={result.assetUrl}
              className="max-h-full max-w-full rounded-2xl"
              controls
              autoPlay
              loop
            />
          )}
          {isAudio && (
            <div className="w-full max-w-xl text-center">
              <div className="mb-4 text-5xl text-muted-foreground">♪</div>
              <audio src={result.assetUrl} controls className="w-full" />
            </div>
          )}
        </div>
      </div>

      {result.prompt && (
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
          “{result.prompt}”
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button asChild size="lg" className="h-14">
          <Link to="/v2/projects/$projectId" params={{ projectId: result.projectId }}>
            <FolderOpen className="mr-2 h-5 w-5" />
            Open in project
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14">
          <Link to="/v2/apps" search={{ app: skill.id, projectId: result.projectId }}>
            <Sparkles className="mr-2 h-5 w-5" />
            Edit in app
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14">
          <Link to="/v2/library">
            <ImageIcon className="mr-2 h-5 w-5" />
            View in library
          </Link>
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="h-14"
          onClick={onRunAgain}
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          Run again
        </Button>
      </div>
    </div>
  );
}
