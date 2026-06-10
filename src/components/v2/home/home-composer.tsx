import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_MODEL_BY_KIND,
  SKILLS_BY_KIND,
  type SkillKind,
} from "@/lib/skills";
import { cn } from "@/lib/utils";

const MODES: { id: SkillKind; label: string }[] = [
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "speech", label: "Voice" },
];

export function HomeComposer() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<SkillKind>("video");
  const [model, setModel] = useState<string>(DEFAULT_MODEL_BY_KIND.video);
  const [prompt, setPrompt] = useState("");

  const handleModeChange = (m: SkillKind) => {
    setMode(m);
    setModel(DEFAULT_MODEL_BY_KIND[m]);
  };

  const submit = () => {
    if (!prompt.trim()) return;
    void navigate({
      to: "/v2/apps",
      search: {
        app: "app-create",
        seedPrompt: prompt.trim(),
        seedMode: mode,
        seedModel: model,
      },
    });
  };

  const models = SKILLS_BY_KIND(mode);

  return (
    <div className="rounded-3xl border border-border bg-card p-3 shadow-elegant">
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border bg-muted/40 text-muted-foreground transition hover:text-foreground"
          aria-label="Add reference"
          onClick={submit}
        >
          <Plus className="h-5 w-5" />
        </button>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="Describe what you want to create…"
          rows={2}
          className="flex-1 resize-none bg-transparent px-2 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="button"
          onClick={submit}
          disabled={!prompt.trim()}
          className="h-12 shrink-0 rounded-2xl px-5"
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          Generate
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 pl-1">
        <div className="flex gap-1 rounded-full bg-muted/50 p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                mode === m.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:border-primary"
        >
          {models.map((s) => (
            <option key={s.id} value={s.model}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
