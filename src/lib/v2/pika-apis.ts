// Catalogue of Pika model APIs exposed via fal.ai. Static metadata used by
// the V2 "API" surface (list + detail pages).

export type PikaCategory =
  | "image-to-video"
  | "text-to-video"
  | "video-to-video"
  | "audio-to-video"
  | "text-to-image"
  | "image-to-image"
  | "text-to-audio";

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

  // ─── Third-party models available via fal.ai ─────────────────────────────
  ...thirdPartyFalModels(),
];

function fal(endpointId: string) {
  return {
    endpointId,
    falUrl: `https://fal.ai/models/${endpointId}`,
    schemaUrl: `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=${endpointId}`,
  };
}

function thumb(endpointId: string) {
  return `https://fal.ai/api/models/thumbnail/${endpointId}`;
}

function thirdPartyFalModels(): PikaApi[] {
  return [
    // ─── Video ──────────────────────────────────────────────────────────────
    {
      slug: "bytedance/seedance-2.0/text-to-video",
      ...fal("bytedance/seedance-2.0/text-to-video"),
      name: "Seedance 2.0 — Text to Video",
      tagline: "ByteDance's flagship text-to-video model",
      category: "text-to-video",
      description:
        "ByteDance's most advanced text-to-video model. Cinematic output with native audio, multi-shot editing, real-world physics, and director-level camera control.",
      cover: thumb("bytedance/seedance-2.0/text-to-video"),
      coverVideo:
        "https://v3b.fal.media/files/b/0a959980/O8bR1l3Z8tvZiNDNVUBDM_video.mp4",
      tags: ["bytedance", "cinematic", "audio"],
      pricing: "$0.30/sec (720p)",
      inputs: ["Prompt", "Aspect ratio, duration"],
      outputs: ["MP4 video with native audio"],
      exampleVideo:
        "https://v3b.fal.media/files/b/0a959980/O8bR1l3Z8tvZiNDNVUBDM_video.mp4",
    },
    {
      slug: "bytedance/seedance-2.0/image-to-video",
      ...fal("bytedance/seedance-2.0/image-to-video"),
      name: "Seedance 2.0 — Image to Video",
      tagline: "Animate a still image with ByteDance Seedance 2.0",
      category: "image-to-video",
      description:
        "ByteDance's most advanced image-to-video model. Animate still images into cinematic video with synchronized audio, start/end frame control, and motion prompts.",
      cover: thumb("bytedance/seedance-2.0/image-to-video"),
      coverVideo:
        "https://v3b.fal.media/files/b/0a95998b/Y2JKGGVWMyjhMKf_FoqS5_video.mp4",
      tags: ["bytedance", "cinematic"],
      pricing: "$0.30/sec (720p)",
      inputs: ["Image URL", "Prompt"],
      outputs: ["MP4 video with native audio"],
      exampleVideo:
        "https://v3b.fal.media/files/b/0a95998b/Y2JKGGVWMyjhMKf_FoqS5_video.mp4",
    },
    {
      slug: "fal-ai/veo3",
      ...fal("fal-ai/veo3"),
      name: "Google Veo 3",
      tagline: "Google DeepMind's flagship video model. With sound on.",
      category: "text-to-video",
      description:
        "Veo 3 by Google — the most advanced AI video generation model in the world, with photoreal motion and synchronized native audio.",
      cover: thumb("fal-ai/veo3"),
      coverVideo:
        "https://v3.fal.media/files/penguin/D-wlVxx1E8BPr2AG9cxhb_output.mp4",
      tags: ["google", "photoreal", "audio"],
      pricing: "$0.20/sec (audio off) · $0.40/sec (audio on)",
      inputs: ["Prompt", "Aspect ratio, duration"],
      outputs: ["MP4 video with audio"],
      exampleVideo:
        "https://v3.fal.media/files/penguin/D-wlVxx1E8BPr2AG9cxhb_output.mp4",
    },
    {
      slug: "fal-ai/veo3/image-to-video",
      ...fal("fal-ai/veo3/image-to-video"),
      name: "Google Veo 3 — Image to Video",
      tagline: "Animate stills with Google Veo 3",
      category: "image-to-video",
      description:
        "Veo 3 image-to-video: turn a still into photoreal, audio-synced video with the latest Google DeepMind model.",
      cover:
        "https://storage.googleapis.com/falserverless/example_inputs/veo3-i2v-input.png",
      coverVideo:
        "https://storage.googleapis.com/falserverless/example_outputs/veo3-i2v-output.mp4",
      tags: ["google", "photoreal", "audio"],
      pricing: "$0.20/sec (audio off) · $0.40/sec (audio on)",
      inputs: ["Image URL", "Prompt"],
      outputs: ["MP4 video with audio"],
      exampleVideo:
        "https://storage.googleapis.com/falserverless/example_outputs/veo3-i2v-output.mp4",
      exampleImages: [
        "https://storage.googleapis.com/falserverless/example_inputs/veo3-i2v-input.png",
      ],
    },
    {
      slug: "fal-ai/kling-video/v2/master/text-to-video",
      ...fal("fal-ai/kling-video/v2/master/text-to-video"),
      name: "Kling 2.0 Master — Text to Video",
      tagline: "Kuaishou Kling — flagship cinematic text-to-video",
      category: "text-to-video",
      description:
        "Kling 2.0 Master delivers state-of-the-art motion realism and prompt adherence for cinematic generations.",
      cover: thumb("fal-ai/kling-video/v2/master/text-to-video"),
      coverVideo:
        "https://v3.fal.media/files/rabbit/5fu6OSZdvV825r2s_c0S8_output.mp4",
      tags: ["kling", "cinematic", "realism"],
      pricing: "Per-second pricing",
      inputs: ["Prompt", "Duration"],
      outputs: ["MP4 video"],
      exampleVideo:
        "https://v3.fal.media/files/rabbit/5fu6OSZdvV825r2s_c0S8_output.mp4",
    },
    {
      slug: "fal-ai/kling-video/v2/master/image-to-video",
      ...fal("fal-ai/kling-video/v2/master/image-to-video"),
      name: "Kling 2.0 Master — Image to Video",
      tagline: "Animate images with Kling 2.0 Master",
      category: "image-to-video",
      description:
        "Bring images to life with Kling's flagship image-to-video model, with strong subject preservation and cinematic motion.",
      cover:
        "https://storage.googleapis.com/falserverless/example_inputs/kling-o3/standard-v2v-reference/element1_front.png",
      coverVideo:
        "https://v3.fal.media/files/koala/VvGXP5xEhTR9ovGjpulJ7_output.mp4",
      tags: ["kling", "image-to-video"],
      pricing: "Per-second pricing",
      inputs: ["Image URL", "Prompt"],
      outputs: ["MP4 video"],
      exampleVideo:
        "https://v3.fal.media/files/koala/VvGXP5xEhTR9ovGjpulJ7_output.mp4",
      exampleImages: [
        "https://storage.googleapis.com/falserverless/example_inputs/kling-o3/standard-v2v-reference/element1_front.png",
      ],
    },
    {
      slug: "fal-ai/minimax/hailuo-02/pro/text-to-video",
      ...fal("fal-ai/minimax/hailuo-02/pro/text-to-video"),
      name: "MiniMax Hailuo 02 [Pro] — Text to Video",
      tagline: "MiniMax flagship 1080p text-to-video",
      category: "text-to-video",
      description:
        "Hailuo 02 [Pro] generates expressive, cinematic 1080p video with strong character control and physical realism.",
      cover: thumb("fal-ai/minimax/hailuo-02/pro/text-to-video"),
      coverVideo:
        "https://v3.fal.media/files/kangaroo/_qEOfY3iKHsc86kqHUUh2_output.mp4",
      tags: ["minimax", "hailuo", "1080p"],
      pricing: "$0.08/sec",
      inputs: ["Prompt", "Duration"],
      outputs: ["MP4 video, 1080p"],
      exampleVideo:
        "https://v3.fal.media/files/kangaroo/_qEOfY3iKHsc86kqHUUh2_output.mp4",
    },
    {
      slug: "fal-ai/minimax/hailuo-02/pro/image-to-video",
      ...fal("fal-ai/minimax/hailuo-02/pro/image-to-video"),
      name: "MiniMax Hailuo 02 [Pro] — Image to Video",
      tagline: "MiniMax flagship 1080p image-to-video",
      category: "image-to-video",
      description:
        "Hailuo 02 [Pro] image-to-video — advanced 1080p generation with strong subject preservation.",
      cover:
        "https://storage.googleapis.com/falserverless/example_inputs/hailuo23/standard_i2v_in.jpg",
      coverVideo:
        "https://v3.fal.media/files/monkey/xF9OsLwGjjNURyAxD8RM1_output.mp4",
      tags: ["minimax", "hailuo", "1080p"],
      pricing: "$0.08/sec",
      inputs: ["Image URL", "Prompt"],
      outputs: ["MP4 video, 1080p"],
      exampleVideo:
        "https://v3.fal.media/files/monkey/xF9OsLwGjjNURyAxD8RM1_output.mp4",
      exampleImages: [
        "https://storage.googleapis.com/falserverless/example_inputs/hailuo23/standard_i2v_in.jpg",
      ],
    },
    {
      slug: "fal-ai/wan/v2.2-a14b/text-to-video",
      ...fal("fal-ai/wan/v2.2-a14b/text-to-video"),
      name: "Wan 2.2 A14B — Text to Video",
      tagline: "Alibaba Wan — open text-to-video",
      category: "text-to-video",
      description:
        "Wan 2.2 A14B is Alibaba's open-source flagship text-to-video model — high visual quality, fluid motion, strong prompt understanding.",
      cover: thumb("fal-ai/wan/v2.2-a14b/text-to-video"),
      coverVideo:
        "https://storage.googleapis.com/falserverless/model_tests/wan/v2.2-woman-output.mp4",
      tags: ["wan", "alibaba", "open"],
      pricing: "$0.08/sec (720p)",
      inputs: ["Prompt", "Duration"],
      outputs: ["MP4 video"],
      exampleVideo:
        "https://storage.googleapis.com/falserverless/model_tests/wan/v2.2-woman-output.mp4",
    },
    {
      slug: "fal-ai/wan/v2.7/image-to-video",
      ...fal("fal-ai/wan/v2.7/image-to-video"),
      name: "Wan 2.7 — Image to Video",
      tagline: "Latest Wan generation — smoother motion, sharper scenes",
      category: "image-to-video",
      description:
        "Wan 2.7 is the latest Wan generation, delivering enhanced motion smoothness, superior scene fidelity, and greater visual coherence.",
      cover: thumb("fal-ai/wan/v2.7/image-to-video"),
      coverVideo:
        "https://v3.fal.media/files/panda/f7tXRCjvwEcVlmxHuw8kO_2c7ab2540af44eceaf5ffde4e8d094ed.mp4",
      tags: ["wan", "alibaba", "image-to-video"],
      pricing: "$0.10/sec (720p) · $0.15/sec (1080p)",
      inputs: ["Image URL", "Prompt"],
      outputs: ["MP4 video"],
      exampleVideo:
        "https://v3.fal.media/files/panda/f7tXRCjvwEcVlmxHuw8kO_2c7ab2540af44eceaf5ffde4e8d094ed.mp4",
    },
    {
      slug: "fal-ai/luma-dream-machine/ray-2",
      ...fal("fal-ai/luma-dream-machine/ray-2"),
      name: "Luma Ray 2",
      tagline: "Luma's flagship Dream Machine video model",
      category: "text-to-video",
      description:
        "Ray 2 is a large-scale video generative model capable of creating realistic visuals with natural, coherent motion.",
      cover: thumb("fal-ai/luma-dream-machine/ray-2"),
      coverVideo:
        "https://v3.fal.media/files/panda/OignI3JOje8d5PY_hNHDn_output.mp4",
      tags: ["luma", "ray-2", "dream-machine"],
      pricing: "$0.50 per 5 seconds",
      inputs: ["Prompt", "Duration"],
      outputs: ["MP4 video"],
      exampleVideo:
        "https://v3.fal.media/files/panda/OignI3JOje8d5PY_hNHDn_output.mp4",
    },
    {
      slug: "fal-ai/luma-dream-machine/ray-2/image-to-video",
      ...fal("fal-ai/luma-dream-machine/ray-2/image-to-video"),
      name: "Luma Ray 2 — Image to Video",
      tagline: "Animate stills with Luma Ray 2",
      category: "image-to-video",
      description:
        "Ray 2 image-to-video produces realistic, coherent motion from a single image with cinematic camera control.",
      cover: thumb("fal-ai/luma-dream-machine/ray-2/image-to-video"),
      coverVideo:
        "https://v3.fal.media/files/zebra/9aDde3Te2kuJYHdR0Kz8R_output.mp4",
      tags: ["luma", "ray-2", "image-to-video"],
      pricing: "$0.50 per 5 seconds",
      inputs: ["Image URL", "Prompt"],
      outputs: ["MP4 video"],
      exampleVideo:
        "https://v3.fal.media/files/zebra/9aDde3Te2kuJYHdR0Kz8R_output.mp4",
    },

    // ─── Image generation ──────────────────────────────────────────────────
    {
      slug: "openai/gpt-image-2",
      ...fal("openai/gpt-image-2"),
      name: "GPT Image 2",
      tagline: "OpenAI's quality-first image model",
      category: "text-to-image",
      description:
        "GPT Image 2, OpenAI's latest image model, is capable of creating extremely detailed images with pixel-perfect text rendering and brand-consistent product photography.",
      cover:
        "https://v3b.fal.media/files/b/0a981c3d/hdg8iaY8yShEwChTPjFah_OZUgg7Z4.jpg",
      tags: ["openai", "text-to-image", "typography"],
      pricing: "Token-based — text $5/1M in · $10/1M out; image $8/1M in · $30/1M out",
      inputs: ["Prompt", "Optional reference images", "Size, quality"],
      outputs: ["PNG image"],
    },
    {
      slug: "openai/gpt-image-2/edit",
      ...fal("openai/gpt-image-2/edit"),
      name: "GPT Image 2 — Edit",
      tagline: "Fine-grained image editing with GPT Image 2",
      category: "image-to-image",
      description:
        "GPT Image 2's edit endpoint makes fine-grained, detailed edits to your images while preserving identity and style.",
      cover:
        "https://v3b.fal.media/files/b/0a970c4a/BkrYELYOiaZMXCw-pgRcB_QlgOenEx.png",
      tags: ["openai", "edit", "typography"],
      pricing: "Token-based pricing",
      inputs: ["Reference image", "Edit prompt"],
      outputs: ["Edited PNG image"],
    },
    {
      slug: "fal-ai/nano-banana-2",
      ...fal("fal-ai/nano-banana-2"),
      name: "Nano Banana 2",
      tagline: "Google's next-gen fast image generation",
      category: "text-to-image",
      description:
        "Nano Banana 2 is Google's new state-of-the-art fast image generation and editing model — vibrant, high-fidelity images in 5–10 seconds.",
      cover:
        "https://storage.googleapis.com/falserverless/example_outputs/nano-banana-2-t2i-output.png",
      tags: ["google", "gemini", "fast"],
      pricing: "$0.08/image (1K) · 1.5× at 2K · 2× at 4K",
      inputs: ["Prompt", "Optional reference images"],
      outputs: ["PNG image"],
    },
    {
      slug: "fal-ai/gemini-25-flash-image/edit",
      ...fal("fal-ai/gemini-25-flash-image/edit"),
      name: "Nano Banana — Edit (Gemini 2.5 Flash Image)",
      tagline: "Google's famous image editing model",
      category: "image-to-image",
      description:
        "Gemini 2.5 Flash Image (aka Nano Banana) edits images with conversational refinement — change subjects, styles, and scenes from a text prompt.",
      cover:
        "https://storage.googleapis.com/falserverless/example_inputs/nano-banana-edit-input.png",
      tags: ["google", "gemini", "edit"],
      pricing: "$0.039/image",
      inputs: ["Reference image(s)", "Edit prompt"],
      outputs: ["PNG image"],
      exampleImages: [
        "https://storage.googleapis.com/falserverless/example_inputs/nano-banana-edit-input.png",
        "https://storage.googleapis.com/falserverless/example_inputs/nano-banana-edit-input-2.png",
      ],
    },
    {
      slug: "fal-ai/flux-pro/v1.1-ultra",
      ...fal("fal-ai/flux-pro/v1.1-ultra"),
      name: "FLUX 1.1 [pro] ultra",
      tagline: "Black Forest Labs — flagship FLUX up to 4MP",
      category: "text-to-image",
      description:
        "FLUX 1.1 [pro] ultra delivers 4MP high-resolution images with exceptional prompt adherence and detail.",
      cover:
        "https://storage.googleapis.com/falserverless/flux-lora/example-images/knight.jpeg",
      tags: ["flux", "bfl", "high-res"],
      pricing: "Per-image pricing",
      inputs: ["Prompt", "Aspect ratio"],
      outputs: ["PNG / JPEG image up to 4MP"],
    },
    {
      slug: "fal-ai/flux-pro/kontext",
      ...fal("fal-ai/flux-pro/kontext"),
      name: "FLUX.1 Kontext [pro]",
      tagline: "In-context image editing with FLUX",
      category: "image-to-image",
      description:
        "FLUX.1 Kontext [pro] handles in-context image editing — change subjects, styles, and scenes with text instructions.",
      cover:
        "https://fal.media/files/elephant/foZaaLzgc--Vlcy3XwrNQ_c51f2cc166534c5997dcc0b072e41e09.jpg",
      tags: ["flux", "edit", "kontext"],
      pricing: "Per-image pricing",
      inputs: ["Reference image", "Edit prompt"],
      outputs: ["Edited image"],
      exampleImages: [
        "https://storage.googleapis.com/falserverless/model_tests/leffa/person_image.jpg",
      ],
    },
    {
      slug: "fal-ai/ideogram/v3",
      ...fal("fal-ai/ideogram/v3"),
      name: "Ideogram 3.0",
      tagline: "State-of-the-art typography in images",
      category: "text-to-image",
      description:
        "Ideogram 3.0 generates images with industry-leading legible text rendering and strong design aesthetics.",
      cover: thumb("fal-ai/ideogram/v3"),
      tags: ["ideogram", "typography", "design"],
      pricing: "Per-image pricing",
      inputs: ["Prompt", "Style, aspect ratio"],
      outputs: ["PNG image"],
    },
    {
      slug: "fal-ai/recraft/v3/text-to-image",
      ...fal("fal-ai/recraft/v3/text-to-image"),
      name: "Recraft V3",
      tagline: "Brand-grade image & vector generation",
      category: "text-to-image",
      description:
        "Recraft V3 generates images and vector art with brand-consistent styles and excellent text rendering.",
      cover:
        "https://storage.googleapis.com/falserverless/example_outputs/recraft-v4/standard-output.webp",
      tags: ["recraft", "vector", "brand"],
      pricing: "Per-image pricing",
      inputs: ["Prompt", "Style preset"],
      outputs: ["Raster or vector image"],
    },

    // ─── Audio ────────────────────────────────────────────────────────────
    {
      slug: "fal-ai/elevenlabs/tts/multilingual-v2",
      ...fal("fal-ai/elevenlabs/tts/multilingual-v2"),
      name: "ElevenLabs Multilingual v2",
      tagline: "Lifelike text-to-speech in 29 languages",
      category: "text-to-audio",
      description:
        "ElevenLabs Multilingual v2 produces natural, expressive voiceover across 29 languages with voice cloning support.",
      cover: thumb("fal-ai/elevenlabs/tts/multilingual-v2"),
      coverVideo:
        "https://storage.googleapis.com/falserverless/example_outputs/elevenlabs/e11_dubbing_out.mp4",
      tags: ["elevenlabs", "tts", "voice"],
      pricing: "Per-character pricing",
      inputs: ["Text", "Voice", "Stability / similarity"],
      outputs: ["MP3 audio"],
    },
    {
      slug: "fal-ai/stable-audio-25/audio-to-audio",
      ...fal("fal-ai/stable-audio-25/audio-to-audio"),
      name: "Stable Audio 2.5",
      tagline: "Stability AI — music & sound effects",
      category: "text-to-audio",
      description:
        "Stable Audio 2.5 from Stability AI generates high-quality music and sound effects with enterprise-grade creative control.",
      cover: thumb("fal-ai/stable-audio-25/audio-to-audio"),
      tags: ["stability", "music", "sfx"],
      pricing: "$0.20 per audio",
      inputs: ["Prompt or reference audio", "Duration"],
      outputs: ["WAV / MP3 audio"],
    },
  ];
}

export function getPikaApi(slug: string): PikaApi | undefined {
  return PIKA_APIS.find((a) => a.slug === slug);
}

export const PIKA_CATEGORIES: { id: PikaCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "image-to-video", label: "Image to Video" },
  { id: "text-to-video", label: "Text to Video" },
  { id: "video-to-video", label: "Video to Video" },
  { id: "audio-to-video", label: "Audio to Video" },
  { id: "text-to-image", label: "Text to Image" },
  { id: "image-to-image", label: "Image to Image" },
  { id: "text-to-audio", label: "Text to Audio" },
];
