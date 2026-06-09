import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated-v2/v2/studio/$projectId")({
  component: StudioV2,
});

function StudioV2() {
  const { projectId } = Route.useParams();
  return (
    <main className="mx-auto max-w-[1400px] px-8 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Studio (v2)
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Project: <code className="font-mono text-xs">{projectId}</code>
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        v2 studio is a blank canvas — add the redesigned components under{" "}
        <code className="font-mono text-xs">src/components/v2/studio/</code>.
      </p>
      <Link
        to="/studio/$projectId"
        params={{ projectId }}
        className="mt-6 inline-block text-sm text-primary underline"
      >
        Open in classic layout →
      </Link>
    </main>
  );
}
