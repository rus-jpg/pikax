import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { AppsWorkspace } from "@/components/v2/apps/apps-workspace";

const searchSchema = z.object({
  app: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated-v2/v2/projects/$projectId")({
  validateSearch: searchSchema,
  component: ProjectDetailV2,
});

function ProjectDetailV2() {
  const { projectId } = Route.useParams();
  const { app: appId } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <AppsWorkspace
      projectId={projectId}
      appId={appId}
      lockedProject
      onSelectApp={(id) =>
        void navigate({
          to: "/v2/projects/$projectId",
          params: { projectId },
          search: { app: id },
        })
      }
      onProjectIdChange={(id) => {
        // Project switching from the title dropdown lands us on the other
        // project's detail page; if cleared, go back to the projects index.
        if (!id) {
          void navigate({ to: "/v2/projects" });
          return;
        }
        if (id !== projectId) {
          void navigate({
            to: "/v2/projects/$projectId",
            params: { projectId: id },
            search: { app: appId },
            replace: true,
          });
        }
      }}
    />
  );
}
