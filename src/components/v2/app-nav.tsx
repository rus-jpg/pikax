import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/pika-mark";
import { AccountPopoverV2 } from "@/components/v2/account-popover";

const NAV_ITEMS = [
  { to: "/v2/projects", label: "Projects" },
  { to: "/v2/apps", label: "Apps" },
  { to: "/v2/library", label: "Library" },
] as const;

export function AppNavV2() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-8">
        <Link to="/v2/projects" className="flex items-center gap-3">
          <BrandMark className="h-8 w-8" />
          <span className="font-display text-xl font-semibold tracking-tight">
            Pika X
          </span>
          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            v2
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
              activeProps={{
                className: "text-sm font-semibold text-foreground",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <AccountPopoverV2 />
      </div>
    </header>
  );
}
