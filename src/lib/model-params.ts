// Per-model parameter schema. Each entry lists the extra controls the Create
// app surfaces for a given fal model. Values selected by the user are merged
// into the upstream fal input body via directGenerateStart.

export type ParamControl =
  | {
      key: string;
      type: "select";
      label: string;
      options: { value: string; label: string }[];
      default: string;
    }
  | {
      key: string;
      type: "slider";
      label: string;
      min: number;
      max: number;
      step: number;
      default: number;
      unit?: string;
    }
  | {
      key: string;
      type: "toggle";
      label: string;
      default: boolean;
    };

const ASPECT_OPTIONS = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "21:9", label: "21:9" },
];

const IMAGE_COUNT: ParamControl = {
  key: "num_images",
  type: "slider",
  label: "Count",
  min: 1,
  max: 4,
  step: 1,
  default: 1,
};

const IMAGE_BASE: ParamControl[] = [
  {
    key: "aspect_ratio",
    type: "select",
    label: "Aspect",
    options: ASPECT_OPTIONS,
    default: "1:1",
  },
  IMAGE_COUNT,
];

const VIDEO_BASE: ParamControl[] = [
  {
    key: "aspect_ratio",
    type: "select",
    label: "Aspect",
    options: ASPECT_OPTIONS,
    default: "16:9",
  },
  {
    key: "duration",
    type: "select",
    label: "Duration",
    options: [
      { value: "5", label: "5s" },
      { value: "10", label: "10s" },
    ],
    default: "5",
  },
];

const AUDIO_BASE: ParamControl[] = [
  {
    key: "duration",
    type: "slider",
    label: "Duration",
    min: 5,
    max: 60,
    step: 5,
    default: 30,
    unit: "s",
  },
];

const SPEECH_BASE: ParamControl[] = [
  {
    key: "voice",
    type: "select",
    label: "Voice",
    options: [
      { value: "Rachel", label: "Rachel (warm female)" },
      { value: "Adam", label: "Adam (deep male)" },
      { value: "Bella", label: "Bella (soft female)" },
      { value: "Antoni", label: "Antoni (smooth male)" },
      { value: "Domi", label: "Domi (energetic female)" },
    ],
    default: "Rachel",
  },
];

export const MODEL_PARAMS: Record<string, ParamControl[]> = {
  // Image models
  "fal-ai/nano-banana": IMAGE_BASE,
  "fal-ai/nano-banana/edit": IMAGE_BASE,
  "fal-ai/flux/schnell": [
    ...IMAGE_BASE,
    {
      key: "num_inference_steps",
      type: "slider",
      label: "Steps",
      min: 1,
      max: 12,
      step: 1,
      default: 4,
    },
  ],
  "fal-ai/flux-pro/v1.1": IMAGE_BASE,
  "fal-ai/ideogram/v3": [
    ...IMAGE_BASE,
    {
      key: "style",
      type: "select",
      label: "Style",
      options: [
        { value: "AUTO", label: "Auto" },
        { value: "GENERAL", label: "General" },
        { value: "REALISTIC", label: "Realistic" },
        { value: "DESIGN", label: "Design" },
      ],
      default: "AUTO",
    },
  ],

  // Video models
  "fal-ai/kling-video/v2.1/standard/image-to-video": VIDEO_BASE,
  "fal-ai/kling-video/v2.1/master/text-to-video": VIDEO_BASE,
  "fal-ai/luma-dream-machine/ray-2": VIDEO_BASE,
  "fal-ai/minimax/video-01": VIDEO_BASE,

  // Audio models
  "fal-ai/cassetteai/music-generator": AUDIO_BASE,
  "fal-ai/stable-audio-25/text-to-audio": AUDIO_BASE,

  // Speech models
  "fal-ai/elevenlabs/tts/multilingual-v2": SPEECH_BASE,
};

export function paramsFor(model: string): ParamControl[] {
  return MODEL_PARAMS[model] ?? [];
}

export function defaultValuesFor(
  model: string,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const p of paramsFor(model)) out[p.key] = p.default;
  return out;
}
