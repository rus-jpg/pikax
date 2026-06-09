import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { BrandMark } from "@/components/pika-mark";

export const Route = createFileRoute("/pika-api")({
  component: PikaApiLayout,
});

function PikaApiLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
          <Link to="/pika-api" className="flex items-center gap-2">
            <BrandMark className="h-6 w-6" />
            <span className="font-display text-sm font-semibold tracking-tight">
              Pika API
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-xs font-medium text-muted-foreground">
            <Link to="/pika-api" className="hover:text-foreground">
              Models
            </Link>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
            <a
              href="#contact"
              className="rounded-full bg-foreground px-3 py-1.5 text-background hover:opacity-90"
            >
              Get API access
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border/50 px-8 py-6 text-center text-xs text-muted-foreground">
        Pika API · Take Pika to go.
      </footer>
    </div>
  );
}
