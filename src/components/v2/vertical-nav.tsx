import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Code2, FolderOpen, Sparkles, LibraryBig } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BrandMark } from "@/components/pika-mark";
import { AccountPopoverV2 } from "@/components/v2/account-popover";
import { listLibrary } from "@/lib/library.functions";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/v2/projects", label: "Projects", icon: FolderOpen },
  { to: "/v2/apps", label: "Apps", icon: Sparkles },
  { to: "/v2/library", label: "Library", icon: LibraryBig },
  { to: "/v2/jobs", label: "Jobs", icon: Activity },
] as const;

const ITEM_CLASS =
  "group flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium tracking-wide transition";

export function VerticalNavV2() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const fetchLib = useServerFn(listLibrary);
  const jobsQ = useQuery({
    queryKey: ["v2-jobs"],
    queryFn: () => fetchLib(),
    refetchInterval: 5000,
  });
  const jobCount = jobsQ.data?.queue?.length ?? 0;

  return (
    <aside className="flex h-screen w-[80px] flex-col items-center border-r border-border/50 bg-card/60 py-4 backdrop-blur">
      <Link to="/v2/projects" className="mb-6 grid h-10 w-10 place-items-center">
        <BrandMark className="h-7 w-7" />
      </Link>

      <nav className="flex flex-1 flex-col items-stretch gap-1 self-stretch px-2">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.to || pathname.startsWith(item.to + "/");
          const isJobs = item.to === "/v2/jobs";
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
              <span className="relative">
                <item.icon className="h-5 w-5" />
                {isJobs && jobCount > 0 && (
                  <span className="absolute -right-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {jobCount}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex w-full flex-col items-stretch gap-2 px-2 pt-2">
        <Link
          to="/v2/api"
          className={cn(
            "group flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-medium uppercase tracking-wider transition",
            pathname.startsWith("/v2/api")
              ? "bg-muted text-foreground"
              : "text-muted-foreground/70 hover:bg-muted hover:text-foreground",
          )}
        >
          <Code2 className="h-4 w-4" />
          <span>API</span>
        </Link>
        <div className="flex items-center justify-center pt-1">
          <AccountPopoverV2 />
        </div>
      </div>
    </aside>
  );
}
