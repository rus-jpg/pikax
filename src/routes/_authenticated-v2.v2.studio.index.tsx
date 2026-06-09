import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated-v2/v2/studio/")({
  beforeLoad: () => {
    throw redirect({ to: "/v2/projects" });
  },
});
