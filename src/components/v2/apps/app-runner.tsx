import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ArrowLeft } from "lucide-react";
import type { Skill } from "@/lib/skills";
import { getRecipeForSkill } from "@/lib/app-recipes";
import { AppWizardV2 } from "@/components/v2/apps/app-wizard-v2";
import { createProject } from "@/lib/projects.functions";
import type { ProjectAsset } from "@/lib/project-state";

export type AppRunResult = {
  assetId: string;
  assetUrl: string;
  mime: string;
  projectId: string;
  prompt: string;
};

export function AppRunner({
  skill,
  projectId: existingProjectId,
  busy,
  seedAsset,
  onSeedConsumed,
  onBack,
  onProjectReady,
  onStartRun,
}: {
  skill: Skill;
  projectId?: string;
  /** Disable submit (a generation is already in flight). */
  busy: boolean;
  /** Optional asset to pre-fill the first upload step with. */
  seedAsset?: ProjectAsset | null;
  /** Called once the wizard has consumed the seed (so parent can clear it). */
  onSeedConsumed?: () => void;
  onBack: () => void;
  /** Called when a project has been ensured for this app session. */
  onProjectReady?: (projectId: string) => void;
  /** Page-level orchestrator handles the actual generation. */
  onStartRun: (args: {
    skill: Skill;
    projectId: string;
    prompt: string;
    assets: ProjectAsset[];
  }) => void;
}) {
  const recipe = getRecipeForSkill(skill);
  const createProj = useServerFn(createProject);

  const [draftProjectId, setDraftProjectId] = useState<string | null>(
    existingProjectId ?? null,
  );

  // Sync when parent reports a new project id (e.g. after first run).
  useEffect(() => {
    if (existingProjectId && existingProjectId !== draftProjectId) {
      setDraftProjectId(existingProjectId);
    }
  }, [existingProjectId, draftProjectId]);

  const creatingRef = useRef<Promise<string> | null>(null);
  const ensureProject = async (): Promise<string> => {
    if (draftProjectId) return draftProjectId;
    if (creatingRef.current) return creatingRef.current;
    creatingRef.current = (async () => {
      const out = await createProj({
        data: {
          title: skill.label,
          skill: skill.id,
          studioMode: skill.kind,
          studioModel: skill.model,
        },
      });
      setDraftProjectId(out.id);
      onProjectReady?.(out.id);
      return out.id;
    })();
    try {
      return await creatingRef.current;
    } finally {
      creatingRef.current = null;
    }
  };

  useEffect(() => {
    if (!draftProjectId) void ensureProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill.id]);

  const handleSubmit = async ({
    prompt,
    assets,
  }: {
    prompt: string;
    assets: ProjectAsset[];
  }) => {
    const projectId = await ensureProject();
    onStartRun({ skill, projectId, prompt, assets });
  };

  const Icon = skill.icon;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border/50 px-5 py-3">
        <button
          onClick={onBack}
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
          aria-label="Back to apps"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-primary-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{skill.label}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {skill.category}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {!draftProjectId ? (
          <div className="grid place-items-center rounded-3xl border border-border/60 bg-muted/30 p-8 text-sm text-muted-foreground">
            <Loader2 className="mb-3 h-6 w-6 animate-spin" />
            Preparing workspace…
          </div>
        ) : (
          <AppWizardV2
            recipe={recipe}
            projectId={draftProjectId}
            busy={busy}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
