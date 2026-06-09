import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated-v2/v2/library")({
  component: LibraryV2,
});

function LibraryV2() {
  return (
    <main className="mx-auto max-w-[1400px] px-8 py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        Library
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        v2 layout — scaffolding placeholder.
      </p>
    </main>
  );
}
