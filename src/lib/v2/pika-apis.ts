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
  /** Cover image URL (from fal's gallery). */
  cover: string;
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
};

const base = (slug: string) => ({
  endpointId: `fal-ai/pika/${slug}`,
  falUrl: `https://fal.ai/models/fal-ai/pika/${slug}`,
  schemaUrl: `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/pika/${slug}`,
});

export const PIKA_APIS: PikaApi[] = [
  {
    slug: "v2.2/pikaframes",
    ...base("v2.2/pikaframes"),
    name: "Pikaframes",
    tagline: "Keyframe interpolation (v2.2)",
    category: "image-to-video",
    description:
      "Upload up to 5 keyframes, customize transition length and prompts, and watch them come to life as a seamless video.",
    cover:
      "https://v3b.fal.media/files/b/koala/CtOfvKi8w3X6qO495bKva_4377f203234f47d69a57efef836c93aa.jpg",
    tags: ["keyframes", "interpolation", "narrative"],
    pricing: "$0.04/sec (720p) · $0.06/sec (1080p) · 5s minimum",
    inputs: ["2–5 image URLs", "Per-transition prompts", "Transition durations"],
    outputs: ["MP4 video up to 25 seconds total"],
  },
  {
    slug: "v2.2/image-to-video",
    ...base("v2.2/image-to-video"),
    name: "Pika v2.2 — Image to Video",
    tagline: "Photo → dynamic video up to 1080p",
    category: "image-to-video",
    description:
      "Turn photos into mind-blowing, dynamic videos in up to 1080p with sharper visuals and better clarity.",
    cover:
      "https://v3b.fal.media/files/b/koala/mATl0lc8FwiR6WceFEDfH_692743a190bc4859a00caa338a1809c5.jpg",
    tags: ["editing", "effects", "animation"],
    pricing: "$0.04/sec (720p) · $0.06/sec (1080p)",
    inputs: ["Image URL", "Prompt", "Duration, resolution"],
    outputs: ["MP4 video, 720p or 1080p"],
  },
  {
    slug: "v2.2/text-to-video",
    ...base("v2.2/text-to-video"),
    name: "Pika v2.2 — Text to Video",
    tagline: "Prompt-only generation in up to 1080p",
    category: "text-to-video",
    description:
      "Start with a simple text prompt to create dynamic generations that defy expectations in up to 1080p.",
    cover:
      "https://v3b.fal.media/files/b/panda/d7bGY17P07W2dKiNoWXfQ_fb8e23d259a44c5a893f04ae7a710b95.jpg",
    tags: ["editing", "effects", "animation"],
    pricing: "$0.04/sec (720p) · $0.06/sec (1080p)",
    inputs: ["Prompt", "Aspect ratio, resolution, duration"],
    outputs: ["MP4 video, 720p or 1080p"],
  },
  {
    slug: "v2.2/pikascenes",
    ...base("v2.2/pikascenes"),
    name: "Pika Scenes v2.2",
    tagline: "Compose video scenes from multiple images",
    category: "image-to-video",
    description:
      "Pika Scenes v2.2 creates videos from multiple input images with high quality output and scene-aware composition.",
    cover:
      "https://v3b.fal.media/files/b/lion/3FYXmzqtjqf6xQ5YVxbKi_bf6ff3d3904a42c783662e7e1fa21ce9.jpg",
    tags: ["editing", "effects", "animation"],
    pricing: "$0.04/sec (720p) · $0.06/sec (1080p)",
    inputs: ["Multiple image URLs", "Prompt", "Resolution"],
    outputs: ["MP4 video with scene composition"],
  },
  {
    slug: "v1.5/pikaffects",
    ...base("v1.5/pikaffects"),
    name: "Pikaffects",
    tagline: "AI-powered video effects for objects & scenes",
    category: "image-to-video",
    description:
      "Pika Effects are AI-powered video effects designed to modify objects, characters, and environments in fun, engaging ways.",
    cover:
      "https://v3b.fal.media/files/b/kangaroo/2uSfx4xu1fXv4am4PvLAm_499f61b93f924a7496982491a87fb169.jpg",
    tags: ["editing", "effects", "animation"],
    pricing: "Per-generation pricing",
    inputs: ["Image URL", "Effect preset (inflate, melt, crush, …)"],
    outputs: ["MP4 video with applied effect"],
  },
  {
    slug: "v2/turbo/image-to-video",
    ...base("v2/turbo/image-to-video"),
    name: "Pika v2 Turbo — Image to Video",
    tagline: "Up to 3× faster image-to-video",
    category: "image-to-video",
    description:
      "Turbo is the model to use when you feel the need for speed. Turn images into stunning video up to 3× faster with high quality outputs.",
    cover:
      "https://v3b.fal.media/files/b/panda/izszWyAu5LZ56Z-ZK63x5_1c8004b9a1054d0d849848569196d293.jpg",
    tags: ["fast", "editing", "animation"],
    pricing: "Lower per-second cost optimized for throughput",
    inputs: ["Image URL", "Prompt"],
    outputs: ["MP4 video, faster turnaround"],
  },
  {
    slug: "v2/turbo/text-to-video",
    ...base("v2/turbo/text-to-video"),
    name: "Pika v2 Turbo — Text to Video",
    tagline: "Fast prompt-only video generation",
    category: "text-to-video",
    description:
      "Pika v2 Turbo creates videos from a text prompt with high quality output at faster speeds.",
    cover:
      "https://v3b.fal.media/files/b/kangaroo/D6kbQkNiBrPL9m05gdWnE_48bca5e513bd42a6b777dfb9b08e0ca9.jpg",
    tags: ["fast", "editing", "animation"],
    pricing: "Lower per-second cost optimized for throughput",
    inputs: ["Prompt", "Aspect ratio, duration"],
    outputs: ["MP4 video, faster turnaround"],
  },
  {
    slug: "v2/pikadditions",
    ...base("v2/pikadditions"),
    name: "Pikadditions",
    tagline: "Add anyone or anything into any video",
    category: "video-to-video",
    description:
      "Pikadditions is a powerful video-to-video AI model that lets you add anyone or anything to any video with seamless integration.",
    cover:
      "https://storage.googleapis.com/falserverless/gallery/1wavesunset.webp",
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
    cover:
      "https://v3b.fal.media/files/b/penguin/CUxIh-EAd_N4npYGWlEqA_d08d3d9739e947e9814d7d2f2a1c998d.jpg",
    tags: ["editing", "effects", "animation"],
    pricing: "Per-second pricing",
    inputs: ["Prompt", "Aspect ratio, duration"],
    outputs: ["MP4 video"],
  },
  {
    slug: "v2.1/image-to-video",
    ...base("v2.1/image-to-video"),
    name: "Pika v2.1 — Image to Video",
    tagline: "Cinematic image-to-video",
    category: "image-to-video",
    description:
      "Turn photos into mind-blowing, dynamic videos with sharp details, character control and cinematic camera moves.",
    cover:
      "https://v3b.fal.media/files/b/monkey/9yJyc4ezyAPejLJlzquI9_f8b95aa25041426fbc0c0861ae80a2c6.jpg",
    tags: ["editing", "effects", "animation"],
    pricing: "Per-second pricing",
    inputs: ["Image URL", "Prompt"],
    outputs: ["MP4 video"],
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
    cover:
      "https://v3b.fal.media/files/b/penguin/CUxIh-EAd_N4npYGWlEqA_d08d3d9739e947e9814d7d2f2a1c998d.jpg",
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
