import { createFileRoute, redirect } from "@tanstack/react-router";

// V2 doesn't have a separate Studio page — redirect old URLs to the project
// detail page.
export const Route = createFileRoute("/_authenticated-v2/v2/studio/$projectId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/v2/projects/$projectId",
      params: { projectId: params.projectId },
    });
  },
});
