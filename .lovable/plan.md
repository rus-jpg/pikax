## Changes to `src/routes/_authenticated-v2.v2.home.tsx`

1. **Add a 4th featured app** so the "Featured apps" grid (which renders `FEATURED_MODULES.slice(1)`) shows 3 cards. Append one entry to `FEATURED_MODULES` — proposed: `{ appId: "app-poster-maker", tagline: "Design scroll-stopping posters and key art in seconds." }` (swap if you'd prefer a different app).

2. **Neutralize example output thumbnails** — replace the colored swatch + icon previews with plain light rectangles:
   - `FeaturedHero`: the 6 square tiles become `bg-muted` (no icon, no swatch color).
   - `FeaturedAppModule`: the `aspect-video` preview becomes `bg-muted` (no icon, no swatch color).
   - The small app-identity tile next to the title (the rounded square with the icon) stays as-is in both — only the "example output" rectangles change.
   - `AppCard` (used in the lower group sections) is unchanged unless you want it included too.

Out of scope: any other home sections, AppCard styling, swatch system itself.
