
## Goal

Rework `src/routes/_authenticated-v2.v2.home.tsx` so the layout matches the attached Figma mockup. Pure presentational change — no data model, server function, or routing changes.

## New page structure (top to bottom)

```text
┌─────────────────────────────────────────────────────────┐
│ [Explore][Video][Image][Audio][Favorites]      [Search] │  ← Tab bar row
├──────────────────────────────────┬──────────────────────┤
│                                  │  ▢ Create w/ Nano…   │
│   FEATURED HERO (big image)      ├──────────┬───────────┤
│   {Featured App title}           │ ▢ Animate│ ▢ Create  │
│   short copy   [Try Now →]       │   image  │   video…  │
└──────────────────────────────────┴──────────┴───────────┘
  Your Projects ›
  [thumb][thumb][thumb][thumb][thumb][thumb][thumb] →

  Featured Apps                                    ‹  ›
  ┌─────────────────────────┬─────────────────────────┐
  │ {App Title}      ▢ prev │ {App Title}      ▢ prev │
  │ copy  [Try Now →]       │ copy  [Try Now →]       │
  └─────────────────────────┴─────────────────────────┘

  Animate Photos                          More Animate Apps ›
  [card][card][card][card]

  Video apps                              More Video Apps ›
  [card][card][card][card]

  Influencers                             More Influencer Apps ›
  [card][card][card][card]

  Marketing apps                          More Marketing Apps ›
  [card][card][card][card]
```

## Section-by-section changes

1. **Remove** the big "What will you create with Pika today?" centered heading.

2. **Top tab bar** (new): pill tabs `Explore | Video | Image | Audio | Favorites` left-aligned, with a `Search…` pill on the right. Tabs link into `/v2/apps?tab=…` (reusing existing tab values where they match: Video, Image, Audio; Explore → Featured; Favorites → new pass-through). Visual only — no client-side filtering of the home page itself.

3. **Hero split row** (new): two-column grid.
   - Left (≈⅔ width): one large featured card — full-bleed image background, title + 2-line copy + "Try Now" pill bottom-left, pagination dots bottom-center. Sourced from `FEATURED_MODULES[0]`.
   - Right (≈⅓ width): 1 tall tile on top spanning full width ("Create with {model}"), then 2 square tiles below ("Animate an image", "Create video using text"). All three are app shortcuts using small swatch dot + title + 1-line copy. Maps to existing skills: `app-create` (Nano Banana / current default text-to-something), `app-animate-photo`, `app-create` with video seed.

4. **Your Projects ›** (rework existing "Recent projects"):
   - Rename label to `Your Projects ›` (link to `/v2/projects`).
   - Compact horizontal scroll of small square thumbnails (≈80px) with project title underneath, plus a trailing `＋` tile that links to `/v2/apps`.
   - Drop the wider card with "Jump back in" subtitle.

5. **Featured Apps carousel** (rework existing "Featured apps" grid):
   - Horizontal scroll of wide cards (2 visible at a time on desktop). Each card: left side = title + tagline + `Try Now →` pill; right side = large rounded preview rectangle (`bg-muted`, no icon). Sourced from `FEATURED_MODULES.slice(1)`.
   - Add ‹ › arrow buttons in the section header (scroll the container; no extra deps).
   - Remove the current `FeaturedHero` block (the one with the 6 small squares) and the second ad-creative `FeaturedHero`.

6. **Category grids** (Animate Photos / Video apps / Influencers / Marketing apps): keep as-is structurally. Minor: ensure section title casing matches mockup ("Animate Photos", "Video apps", "Influencers", "Marketing apps") and right-side link text matches ("More Animation Apps ›", etc. — already close).

7. **Remove** the bottom centered "See all apps" pill button (the mockup ends after Marketing).

## Files touched

- `src/routes/_authenticated-v2.v2.home.tsx` — only file edited. Restructure JSX, add small inline components (`TopTabBar`, `HeroSplit`, `QuickTile`, `ProjectsStrip`, `FeaturedCarousel`, `FeaturedWideCard`). Reuse existing `AppGroupSection` / `AppCard` unchanged. Delete `FeaturedHero` and `FeaturedAppModule`.

## Out of scope

- No changes to vertical nav, account popover, routing, server functions, skills data, or `AppCard` styling.
- No real search behavior — the search pill is a visual stub linking to `/v2/apps`.
- No tab filtering on the home page itself — tabs deep-link to `/v2/apps`.
- No new images/assets; preview rectangles stay `bg-muted` placeholders (matches your earlier "neutralize thumbnails" direction).

## Open question

The mockup's hero shows a single big "Featured App" with copy + pagination dots, implying a rotating carousel of multiple featured apps. For v1 I'll render a **static** hero from `FEATURED_MODULES[0]` (dots are decorative). Say the word if you want it auto-rotating through all of `FEATURED_MODULES` instead.
