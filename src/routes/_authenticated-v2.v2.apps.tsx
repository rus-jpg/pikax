import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { AppsWorkspace } from "@/components/v2/apps/apps-workspace";

const searchSchema = z.object({
  app: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated-v2/v2/apps")({
  validateSearch: searchSchema,
  component: AppsV2,
});

function AppsV2() {
  const { app: appId, projectId } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <AppsWorkspace
      appId={appId}
      projectId={projectId}
      onSelectApp={(id) =>
        void navigate({
          to: "/v2/apps",
          search: { app: id, projectId },
        })
      }
      onProjectIdChange={(id) =>
        void navigate({
          to: "/v2/apps",
          search: { app: appId, projectId: id },
          replace: true,
        })
      }
    />
  );
}
