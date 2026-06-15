# Logged-out Homepage Build Plan

Build a new logged-out homepage at the public landing route with 9 sections, light & editorial tone, using existing design tokens in `src/styles.css`.

## Sections

1. **Top Nav** — Transparent bar, Pika wordmark left, nav links center (Product, Research, API, Pricing), "Login" pill right. Sticky with blur on scroll.

2. **Hero** — Centered display headline, subhead, primary CTA pill, 16:9 hero media frame (placeholder video/image), row of small feature chips below.

3. **Built for all creative workflows** — Bento grid: one tall tile left, two stacked middle, one tall right. Pill tabs above the grid swap the bento content (client-side state, no route change).

4. **Video apps for everything** — Row of 5 square app icon tiles, below a 2-up carousel with dots pager.

5. **Made with Pika** — Auto-scrolling marquee of 5 portrait video tiles; click opens a full-screen lightbox.

6. **Powered by Pika Research** — Two-column editorial: heading + copy left, paper-like card grid of research items right.

7. **Pika API** — Two-column editorial: copy left, code snippet card on right.

8. **Final CTA** — Large centered display headline + single CTA pill on a soft gradient band.

9. **Footer** — Dark band: large Pika watermark, socials, 3-4 link columns, copyright.

## Technical

- New route: `src/routes/index.tsx` (or update existing public landing). Use TanStack Start `createFileRoute` with full `head()` metadata (title, description, og:title, og:description, og:image).
- Componentize each section under `src/components/v2/landing/`:
  - `LandingNav.tsx`, `Hero.tsx`, `WorkflowsBento.tsx`, `VideoApps.tsx`, `MadeWithPika.tsx`, `ResearchSection.tsx`, `ApiSection.tsx`, `FinalCta.tsx`, `LandingFooter.tsx`.
- Tabs in WorkflowsBento: local `useState`, content keyed by tab.
- Marquee: CSS `@keyframes` infinite scroll, pause on hover; duplicated track for seamless loop.
- Lightbox: simple portal with backdrop + close on Esc/click outside.
- All styling via semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `border`, `text-muted-foreground`). Add any new tokens (e.g. `--gradient-hero`, `--shadow-soft`) to `src/styles.css`.
- Placeholder media: use existing assets in `src/assets/` if present; otherwise generate light editorial hero + tile images.
- Auth-aware redirect: if user is logged in, redirect to `/v2/home` from the landing route loader (client-side check via existing auth context — no protected server fn in loader).

## Out of scope

- No real backend wiring for Research/API content (static copy for now).
- No video uploads — use looping placeholder MP4/poster images.
- v1 routes untouched.
