import { createFileRoute, redirect } from "@tanstack/react-router";

// V2 doesn't have a separate Studio page — the project detail lives inside
// the Projects 3-column layout. Redirect old URLs to /v2/projects?p=$id.
export const Route = createFileRoute("/_authenticated-v2/v2/studio/$projectId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/v2/projects",
      search: { p: params.projectId },
    });
  },
});
