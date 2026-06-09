import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { listLibrary } from "@/lib/library.functions";

export function JobsPopoverV2() {
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
          title="Jobs"
          className="relative grid h-11 w-11 place-items-center rounded-2xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Activity className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count}
            </span>
          )}
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
