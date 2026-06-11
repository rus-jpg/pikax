import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { AppsWorkspace } from "@/components/v2/apps/apps-workspace";

const searchSchema = z.object({
  app: z.string().optional(),
  projectId: z.string().uuid().optional(),
  seedPrompt: z.string().max(2000).optional(),
  seedMode: z.enum(["image", "video", "audio", "speech"]).optional(),
  seedModel: z.string().max(255).optional(),
  tab: z
    .enum([
      "Favorites",
      "Featured",
      "Custom",
      "Models",
      "Photo",
      "Video",
      "Image",
      "Marketing",
      "Audio",
      "Voice",
    ])
    .optional(),
});

export const Route = createFileRoute("/_authenticated-v2/v2/apps")({
  validateSearch: searchSchema,
  component: AppsV2,
});

function AppsV2() {
  const { app: appId, projectId, seedPrompt, seedMode, seedModel, tab } =
    Route.useSearch();
  const navigate = useNavigate();

  return (
    <AppsWorkspace
      appId={appId}
      projectId={projectId}
      seedPrompt={seedPrompt}
      seedMode={seedMode}
      seedModel={seedModel}
      initialTab={tab}
      onSeedConsumed={() =>
        void navigate({
          to: "/v2/apps",
          search: { app: appId, projectId, tab },
          replace: true,
        })
      }
      onSelectApp={(id) =>
        void navigate({
          to: "/v2/apps",
          search: { app: id, projectId, tab },
        })
      }
      onProjectIdChange={(id) =>
        void navigate({
          to: "/v2/apps",
          search: { app: appId, projectId: id, tab },
          replace: true,
        })
      }
    />
  );
}
