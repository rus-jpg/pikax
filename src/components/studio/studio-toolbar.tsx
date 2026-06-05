import { useState } from "react";
import {
  Bot,
  ChevronDown,
  Image as ImageIcon,
  Mic as MicIcon,
  Music as MusicIcon,
  Sparkles,
  Video as VideoIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SKILLS,
  SKILLS_BY_KIND,
  STUDIO_MODES,
  type Skill,
  type StudioMode,
} from "@/lib/skills";

const MODE_ICON: Record<StudioMode, React.ComponentType<{ className?: string }>> = {
  agent: Bot,
  image: ImageIcon,
  video: VideoIcon,
  audio: MusicIcon,
  speech: MicIcon,
};

export type StudioToolbarProps = {
  mode: StudioMode;
  model: string | null;
  onChange: (next: { mode: StudioMode; model: string | null }) => void;
};

export function StudioToolbar({ mode, model, onChange }: StudioToolbarProps) {
  const [skillsOpen, setSkillsOpen] = useState(false);
  const agent = mode === "agent";

  // Raw Fal models for the current kind (exclude recipe Apps, which start
  // with "app-"). Dedupe by model id.
  const kindModels = (() => {
    if (agent) return [] as Skill[];
    const seen = new Set<string>();
    return SKILLS_BY_KIND(mode)
      .filter((s) => !s.id.startsWith("app-"))
      .filter((s) => {
        if (seen.has(s.model)) return false;
        seen.add(s.model);
        return true;
      });
  })();

  // Apps for the current mode. In agent mode show every App.
  const apps = (() => {
    const all = SKILLS.filter((s) => s.id.startsWith("app-"));
    return agent ? all : all.filter((s) => s.kind === mode);
  })();
  const appCategories = Array.from(new Set(apps.map((a) => a.category)));

  const setMode = (next: StudioMode) => {
    if (!next || !STUDIO_MODES.some((m) => m.id === next)) return;
    if (next === "agent") return onChange({ mode: "agent", model: null });
    const list = SKILLS_BY_KIND(next).filter((s) => !s.id.startsWith("app-"));
    const stillValid = list.find((s) => s.model === model);
    onChange({
      mode: next,
      model: stillValid?.model ?? list[0]?.model ?? null,
    });
  };

  const pickSkill = (s: Skill) => {
    setSkillsOpen(false);
    onChange({ mode: s.kind, model: s.model });
  };

  const ModeIcon = MODE_ICON[mode];
  const currentLabel = STUDIO_MODES.find((m) => m.id === mode)?.label ?? mode;

  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      {/* Mode dropdown */}
      <Select value={mode} onValueChange={(v) => setMode(v as StudioMode)}>
        <SelectTrigger className="h-7 w-auto min-w-0 gap-1 border-0 bg-transparent px-2 text-xs shadow-none hover:bg-muted/50 focus:ring-0 focus:ring-offset-0">
          <div className="flex items-center gap-1.5">
            <ModeIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">{currentLabel}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {STUDIO_MODES.map((m) => {
            const Icon = MODE_ICON[m.id];
            return (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {m.label}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Model dropdown — Fal models for this kind */}
      {!agent && kindModels.length > 0 && (
        <Select
          value={model ?? kindModels[0].model}
          onValueChange={(v) => onChange({ mode, model: v })}
        >
          <SelectTrigger className="h-7 w-auto max-w-[220px] min-w-0 gap-1 border-0 bg-transparent px-2 text-xs shadow-none hover:bg-muted/50 focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Pick a model" className="truncate" />
          </SelectTrigger>
          <SelectContent>
            {kindModels.map((s) => (
              <SelectItem key={s.model} value={s.model} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Apps dropdown — next to the model selector, filtered by mode */}
      {apps.length > 0 && (
        <Popover open={skillsOpen} onOpenChange={setSkillsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {agent ? "Apps" : `${currentLabel} apps`}
              <ChevronDown className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[360px] max-h-[60vh] overflow-y-auto p-0"
          >
            {appCategories.map((cat) => (
              <div key={cat} className="border-b border-border/60 last:border-b-0">
                <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {cat}
                </div>
                <ul className="px-1.5 pb-2">
                  {apps
                    .filter((s) => s.category === cat)
                    .map((s) => {
                      const Icon = s.icon;
                      const active = s.model === model && s.kind === mode;
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => pickSkill(s)}
                            className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                              active ? "bg-muted" : "hover:bg-muted/60"
                            }`}
                          >
                            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-foreground">
                                {s.label}
                              </div>
                              <div className="truncate text-[11px] text-muted-foreground">
                                {s.description}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </PopoverContent>
        </Popover>
      )}

      <div className="flex-1" />
    </div>
  );
}
