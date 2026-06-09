import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Code2, FolderOpen, Sparkles, LibraryBig, Loader2 } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BrandMark } from "@/components/pika-mark";
import { AccountPopoverV2 } from "@/components/v2/account-popover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { listLibrary } from "@/lib/library.functions";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/v2/projects", label: "Projects", icon: FolderOpen },
  { to: "/v2/apps", label: "Apps", icon: Sparkles },
  { to: "/v2/library", label: "Library", icon: LibraryBig },
] as const;

const ITEM_CLASS =
  "group flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium tracking-wide transition";

export function VerticalNavV2() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="flex h-screen w-[80px] flex-col items-center border-r border-border/50 bg-card/60 py-4 backdrop-blur">
      <Link to="/v2/projects" className="mb-6 grid h-10 w-10 place-items-center">
        <BrandMark className="h-7 w-7" />
      </Link>

      <nav className="flex flex-1 flex-col items-stretch gap-1 self-stretch px-2">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                ITEM_CLASS,
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <JobsNavItem />
      </nav>

      <div className="flex flex-col items-center gap-3 pt-2">
        <AccountPopoverV2 />
      </div>
    </aside>
  );
}

function JobsNavItem() {
  const fetchLib = useServerFn(listLibrary);
  const q = useQuery({
    queryKey: ["v2-jobs"],
    queryFn: () => fetchLib(),
    refetchInterval: 5000,
  });
  const queue = q.data?.queue ?? [];
  const count = queue.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            ITEM_CLASS,
            "relative text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span className="relative">
            <Activity className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {count}
              </span>
            )}
          </span>
          <span>Jobs</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-72 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Jobs
        </div>
        {count === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No active jobs.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {queue.map((j) => (
              <li
                key={j.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2 py-1.5 text-xs"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span className="flex-1 truncate">{j.projectTitle}</span>
                <span className="text-muted-foreground">{j.status}</span>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
