import { Link, useRouterState } from "@tanstack/react-router";
import { FolderOpen, Sparkles, LibraryBig } from "lucide-react";
import { BrandMark } from "@/components/pika-mark";
import { AccountPopoverV2 } from "@/components/v2/account-popover";
import { JobsPopoverV2 } from "@/components/v2/jobs-popover";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/v2/projects", label: "Projects", icon: FolderOpen },
  { to: "/v2/apps", label: "Apps", icon: Sparkles },
  { to: "/v2/library", label: "Library", icon: LibraryBig },
] as const;

export function VerticalNavV2() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="flex h-screen w-[68px] flex-col items-center border-r border-border/50 bg-card/60 py-4 backdrop-blur">
      <Link to="/v2/projects" className="mb-6 grid h-10 w-10 place-items-center">
        <BrandMark className="h-7 w-7" />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              className={cn(
                "group relative grid h-11 w-11 place-items-center rounded-2xl text-muted-foreground transition",
                active
                  ? "bg-foreground text-background"
                  : "hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md transition group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-3">
        <JobsPopoverV2 />
        <AccountPopoverV2 />
      </div>
    </aside>
  );
}
