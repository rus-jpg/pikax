// Catalogue of Pika model APIs exposed via fal.ai. Static metadata used by
// the V2 "API" surface (list + detail pages).

export type PikaCategory =
  | "image-to-video"
  | "text-to-video"
  | "video-to-video"
  | "audio-to-video";

export type PikaApi = {
  /** URL-safe slug used as the splat param, e.g. "v2.2/pikaframes". */
  slug: string;
  /** Full fal-ai endpoint id, e.g. "fal-ai/pika/v2.2/pikaframes". */
  endpointId: string;
  /** Display name. */
  name: string;
  /** One-line tagline used on the detail page header. */
  tagline: string;
  category: PikaCategory;
  /** Short marketing description used on cards. */
  description: string;
  /** Cover image URL. */
  cover: string;
  /** Optional cover video URL (autoplays muted/looped in cards). */
  coverVideo?: string;
  /** Tags rendered as chips. */
  tags: string[];
  /** Per-second pricing copy. */
  pricing: string;
  /** Bullet list of supported inputs. */
  inputs: string[];
  /** Bullet list of outputs. */
  outputs: string[];
  /** External link to fal.ai detail page. */
  falUrl: string;
  /** External link to fal.ai OpenAPI schema. */
  schemaUrl: string;
  /** Optional example output. If a video URL, it autoplays muted; otherwise treated as an image. Falls back to `cover` when omitted. */
  exampleVideo?: string;
  /** Pre-filled prompt for the playground. */
  examplePrompt?: string;
  /** Pre-filled input image URLs. */
  exampleImages?: string[];
  /** Pre-filled audio URL. */
  exampleAudio?: string;
  /** Pre-filled source video URL (for video-to-video). */
  exampleVideoSource?: string;
};

/** Resolved example payload used by the playground UI. */
export type ResolvedExample = {
  prompt: string;
  images: string[];
  audio?: string;
  videoSource?: string;
  resultVideo?: string;
  resultImagePoster: string;
  logs: string[];
};

const DEFAULT_PROMPTS: Record<string, string> = {
  "v2.2/pikaframes":
    "Smooth cinematic transition between the keyframes, soft camera dolly, gentle motion blur.",
  "v2.2/image-to-video":
    "Cinematic slow zoom in, golden hour light, subtle wind on the subject, 24fps.",
  "v2.2/text-to-video":
    "A neon-lit Tokyo alley at night, light rain on the pavement, reflective puddles, cinematic.",
  "v2.2/pikascenes":
    "Stitch the scenes together with seamless transitions and consistent lighting.",
  "v1.5/pikaffects":
    "inflate",
  "v2/turbo/image-to-video":
    "Energetic forward dolly, bright punchy colors, snappy motion.",
  "v2/turbo/text-to-video":
    "A golden retriever puppy chasing bubbles in a sunny backyard, slow motion.",
  "v2/pikadditions":
    "Add a small playful corgi running alongside the subject, matching shadows and lighting.",
  "v2.1/text-to-video":
    "An astronaut riding a horse across a Martian canyon at sunset, cinematic wide shot.",
  "v2.1/image-to-video":
    "Subtle parallax camera move, soft cinematic grade, gentle ambient motion.",
  "pikaformance/lipsync":
    "Warm, expressive delivery — smile slightly between phrases, natural eye contact.",
};

const EXAMPLE_AUDIO =
  "https://storage.googleapis.com/falserverless/example_inputs/sample_audio.wav";

export function resolveExample(api: PikaApi): ResolvedExample {
  const prompt = api.examplePrompt ?? DEFAULT_PROMPTS[api.slug] ?? "";
  const images = api.exampleImages ?? (api.category === "text-to-video" ? [] : [api.cover]);
  const audio = api.exampleAudio ?? (api.category === "audio-to-video" ? EXAMPLE_AUDIO : undefined);
  const videoSource = api.exampleVideoSource ?? (api.category === "video-to-video" ? api.cover : undefined);

  const jobId = `req_${api.slug.replace(/[^a-z0-9]/gi, "").slice(0, 10)}_8f3c`;
  const logs = [
    `[12:04:01.121] POST /run  endpoint=${api.endpointId}`,
    `[12:04:01.184] queued job ${jobId}`,
    `[12:04:01.611] validating inputs  ok`,
    `[12:04:01.998] loading model weights  cached=true`,
    `[12:04:02.413] generating  resolution=720p fps=24`,
    `[12:04:18.704] progress 24/120 frames`,
    `[12:04:31.220] progress 72/120 frames`,
    `[12:04:42.901] progress 120/120 frames  encoding mp4`,
    `[12:04:45.317] upload  outputs/${jobId}.mp4 (1.51 MB)`,
    `[12:04:45.402] completed in 44.28s  status=COMPLETED`,
  ];

  return {
    prompt,
    images,
    audio,
    videoSource,
    resultVideo: api.exampleVideo,
    resultImagePoster: api.cover,
    logs,
  };
}

const base = (slug: string) => ({
  endpointId: `fal-ai/pika/${slug}`,
  falUrl: `https://fal.ai/models/fal-ai/pika/${slug}`,
  schemaUrl: `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/pika/${slug}`,
});

// Asset pointers (CDN-hosted via Lovable Assets).
import i2v21In from "@/assets/pika-api/i2v21_in.asset.json";
import i2v21Out from "@/assets/pika-api/i2v21_out.asset.json";
import i2v22In from "@/assets/pika-api/i2v22_in.asset.json";
import i2v22Out from "@/assets/pika-api/i2v22_out.asset.json";
import framesIn1 from "@/assets/pika-api/frames_in1.asset.json";
import framesIn2 from "@/assets/pika-api/frames_in2.asset.json";
import framesOut from "@/assets/pika-api/frames_out.asset.json";
import scenesA from "@/assets/pika-api/scenes_a.asset.json";
import scenesB from "@/assets/pika-api/scenes_b.asset.json";
import scenesC from "@/assets/pika-api/scenes_c.asset.json";
import scenesOut from "@/assets/pika-api/scenes_out.asset.json";
import t2v21Out from "@/assets/pika-api/t2v21_out.asset.json";
import t2v22Out from "@/assets/pika-api/t2v22_out.asset.json";
import turboI2vIn from "@/assets/pika-api/turbo_i2v_in.asset.json";
import turboI2vOut from "@/assets/pika-api/turbo_i2v_out.asset.json";
import turboT2vOut from "@/assets/pika-api/turbo_t2v_out.asset.json";
import pkfCakeIn from "@/assets/pika-api/pkf_cake_in.asset.json";
import pkfCakeOut from "@/assets/pika-api/pkf_cake_out.asset.json";

// Fallback brand imagery (still used for models without provided assets).
const PIKA_BRAND_COVER =
  "https://cdn.pika.art/pika/2.5/launch/b648eb7d-8a2f-4350-9d84-7fae958c633a.jpg";
const PIKA_BRAND_VIDEO =
  "https://cdn.pika.art/pika/api/launch/512be5d5-5b83-4106-bbca-1eff6c73b44c.mp4";

export const PIKA_APIS: PikaApi[] = [
  {
    slug: "v2.2/pikaframes",
    ...base("v2.2/pikaframes"),
    name: "Pikaframes",
    tagline: "Keyframe interpolation (v2.2)",
    category: "image-to-video",
    description:
      "Upload up to 5 keyframes, customize transition length and prompts, and watch them come to life as a seamless video.",
    cover: framesIn1.url,
    coverVideo: framesOut.url,
    tags: ["keyframes", "interpolation", "narrative"],
    pricing: "$0.04/sec (720p) · $0.06/sec (1080p) · 5s minimum",
    inputs: ["2–5 image URLs", "Per-transition prompts", "Transition durations"],
    outputs: ["MP4 video up to 25 seconds total"],
    exampleVideo: framesOut.url,
    exampleImages: [framesIn1.url, framesIn2.url],
  },
  {
    slug: "v2.2/image-to-video",
    ...base("v2.2/image-to-video"),
    name: "Pika v2.2 — Image to Video",
    tagline: "Photo → dynamic video up to 1080p",
    category: "image-to-video",
    description:
      "Turn photos into mind-blowing, dynamic videos in up to 1080p with sharper visuals and better clarity.",
    cover: i2v22In.url,
    coverVideo: i2v22Out.url,
    tags: ["editing", "effects", "animation"],
    pricing: "$0.04/sec (720p) · $0.06/sec (1080p)",
    inputs: ["Image URL", "Prompt", "Duration, resolution"],
    outputs: ["MP4 video, 720p or 1080p"],
    exampleVideo: i2v22Out.url,
    exampleImages: [i2v22In.url],
  },
  {
    slug: "v2.2/text-to-video",
    ...base("v2.2/text-to-video"),
    name: "Pika v2.2 — Text to Video",
    tagline: "Prompt-only generation in up to 1080p",
    category: "text-to-video",
    description:
      "Start with a simple text prompt to create dynamic generations that defy expectations in up to 1080p.",
    cover: PIKA_BRAND_COVER,
    coverVideo: t2v22Out.url,
    tags: ["editing", "effects", "animation"],
    pricing: "$0.04/sec (720p) · $0.06/sec (1080p)",
    inputs: ["Prompt", "Aspect ratio, resolution, duration"],
    outputs: ["MP4 video, 720p or 1080p"],
    exampleVideo: t2v22Out.url,
  },
  {
    slug: "v2.2/pikascenes",
    ...base("v2.2/pikascenes"),
    name: "Pika Scenes v2.2",
    tagline: "Compose video scenes from multiple images",
    category: "image-to-video",
    description:
      "Pika Scenes v2.2 creates videos from multiple input images with high quality output and scene-aware composition.",
    cover: scenesA.url,
    coverVideo: scenesOut.url,
    tags: ["editing", "effects", "animation"],
    pricing: "$0.04/sec (720p) · $0.06/sec (1080p)",
    inputs: ["Multiple image URLs", "Prompt", "Resolution"],
    outputs: ["MP4 video with scene composition"],
    exampleVideo: scenesOut.url,
    exampleImages: [scenesA.url, scenesB.url, scenesC.url],
  },
  {
    slug: "v1.5/pikaffects",
    ...base("v1.5/pikaffects"),
    name: "Pikaffects",
    tagline: "AI-powered video effects for objects & scenes",
    category: "image-to-video",
    description:
      "Pika Effects are AI-powered video effects designed to modify objects, characters, and environments in fun, engaging ways.",
    cover: pkfCakeIn.url,
    coverVideo: pkfCakeOut.url,
    tags: ["editing", "effects", "animation"],
    pricing: "Per-generation pricing",
    inputs: ["Image URL", "Effect preset (inflate, melt, crush, …)"],
    outputs: ["MP4 video with applied effect"],
    exampleVideo: pkfCakeOut.url,
    exampleImages: [pkfCakeIn.url],
  },
  {
    slug: "v2/turbo/image-to-video",
    ...base("v2/turbo/image-to-video"),
    name: "Pika v2 Turbo — Image to Video",
    tagline: "Up to 3× faster image-to-video",
    category: "image-to-video",
    description:
      "Turbo is the model to use when you feel the need for speed. Turn images into stunning video up to 3× faster with high quality outputs.",
    cover: turboI2vIn.url,
    coverVideo: turboI2vOut.url,
    tags: ["fast", "editing", "animation"],
    pricing: "Lower per-second cost optimized for throughput",
    inputs: ["Image URL", "Prompt"],
    outputs: ["MP4 video, faster turnaround"],
    exampleVideo: turboI2vOut.url,
    exampleImages: [turboI2vIn.url],
  },
  {
    slug: "v2/turbo/text-to-video",
    ...base("v2/turbo/text-to-video"),
    name: "Pika v2 Turbo — Text to Video",
    tagline: "Fast prompt-only video generation",
    category: "text-to-video",
    description:
      "Pika v2 Turbo creates videos from a text prompt with high quality output at faster speeds.",
    cover: PIKA_BRAND_COVER,
    coverVideo: turboT2vOut.url,
    tags: ["fast", "editing", "animation"],
    pricing: "Lower per-second cost optimized for throughput",
    inputs: ["Prompt", "Aspect ratio, duration"],
    outputs: ["MP4 video, faster turnaround"],
    exampleVideo: turboT2vOut.url,
  },
  {
    slug: "v2/pikadditions",
    ...base("v2/pikadditions"),
    name: "Pikadditions",
    tagline: "Add anyone or anything into any video",
    category: "video-to-video",
    description:
      "Pikadditions is a powerful video-to-video AI model that lets you add anyone or anything to any video with seamless integration.",
    cover: PIKA_BRAND_COVER,
    coverVideo: PIKA_BRAND_VIDEO,
    tags: ["video-to-video", "compositing", "effects"],
    pricing: "Per-generation pricing",
    inputs: ["Source video URL", "Subject image", "Prompt"],
    outputs: ["MP4 video with subject composited in"],
  },
  {
    slug: "v2.1/text-to-video",
    ...base("v2.1/text-to-video"),
    name: "Pika v2.1 — Text to Video",
    tagline: "Cinematic prompt-only generation",
    category: "text-to-video",
    description:
      "Anything you dream can come to life with sharp details, impressive character control and cinematic camera moves.",
    cover: PIKA_BRAND_COVER,
    coverVideo: t2v21Out.url,
    tags: ["editing", "effects", "animation"],
    pricing: "Per-second pricing",
    inputs: ["Prompt", "Aspect ratio, duration"],
    outputs: ["MP4 video"],
    exampleVideo: t2v21Out.url,
  },
  {
    slug: "v2.1/image-to-video",
    ...base("v2.1/image-to-video"),
    name: "Pika v2.1 — Image to Video",
    tagline: "Cinematic image-to-video",
    category: "image-to-video",
    description:
      "Turn photos into mind-blowing, dynamic videos with sharp details, character control and cinematic camera moves.",
    cover: i2v21In.url,
    coverVideo: i2v21Out.url,
    tags: ["editing", "effects", "animation"],
    pricing: "Per-second pricing",
    inputs: ["Image URL", "Prompt"],
    outputs: ["MP4 video"],
    exampleVideo: i2v21Out.url,
    exampleImages: [i2v21In.url],
  },
  {
    slug: "pikaformance/lipsync",
    endpointId: "pika/pikaformance",
    falUrl: "https://pika.art/api",
    schemaUrl: "https://pika.art/api",
    name: "Pikaformance — Lip Sync",
    tagline: "Audio-driven lip sync & facial performance",
    category: "audio-to-video",
    description:
      "Pika's audio-driven performance model. Provide a face image plus an audio clip and Pikaformance animates lips, eyes, and expressions in sync with the sound — speech, singing, rapping, even non-verbal sounds.",
    cover: PIKA_BRAND_COVER,
    coverVideo: PIKA_BRAND_VIDEO,
    tags: ["lip-sync", "talking-avatar", "performance"],
    pricing: "Per-second pricing (see pika.art/api)",
    inputs: [
      "Portrait or character image",
      "Audio clip (speech, song, or sound)",
      "Optional style / performance prompt",
    ],
    outputs: ["MP4 video with lips and expressions synced to audio"],
  },
];

export function getPikaApi(slug: string): PikaApi | undefined {
  return PIKA_APIS.find((a) => a.slug === slug);
}

export const PIKA_CATEGORIES: { id: PikaCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "image-to-video", label: "Image to Video" },
  { id: "text-to-video", label: "Text to Video" },
  { id: "video-to-video", label: "Video to Video" },
  { id: "audio-to-video", label: "Audio to Video" },
];
