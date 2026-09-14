# Style lock — AdVault

Established 2026-09-15. Cold start (no references, no prior profile).

## Classification
**App shell** — sidebar + topbar internal tool. NOT a marketing page.
- No hero, no scroll narrative, no macrostructure rotation (Step 2.5 skipped per SKILL.md).
- Density: dense/information-heavy. Nav rows at `space-3` (12px) floor.
- Motion: App-shell track only (panel transitions, staggered table entrance, skeletons).

## Mood
**technical** / dark-native. Builder-facing research tool.

## Color contract
Generated: `generate_palette.py --mood technical --mode dark` (triadic, base hue 188.6)

| Role | Hex |
|---|---|
| text | `#e5f6f4` |
| bg | `#0d1514` |
| surface | `#18201f` |
| primary | `#0e837c` |
| on-primary | `#ffffff` |
| secondary | `#143432` |
| accent | `#b28bd2` |
| border | `#242c2b` |

### Legal pairings (verified, 21 pairs)
- **Text-safe (>=4.5)**: bg/on-primary 18.51, surface/on-primary 16.60, text/bg 16.59, text/surface 14.87, border/on-primary 14.28, text/border 12.80, bg/accent 6.63, surface/accent 5.94, accent/border 5.11, primary/on-primary 4.61
- **UI-safe (>=3.0)**: text/primary 4.13, bg/primary 4.02, surface/primary 3.60, primary/border 3.10
- **Decorative (<3.0, must not be sole state carrier)**: accent/on-primary, text/accent, primary/accent, bg/border, surface/border, text/on-primary, bg/surface

**Rules derived from the matrix:**
- Button labels on `primary` fill → `on-primary` (4.61, text-safe). Never `text` on `primary` (4.13 = UI-safe only, not for body).
- `accent` on `bg`/`surface` is text-safe — use for links/highlights.
- `accent` is NEVER a text-bearing fill (accent/on-primary = 2.79, fails).
- `border` hairlines on bg/surface are decorative-only — never the sole state signal.

## Shell chrome mapping
- Sidebar bg: `surface` · Content bg: `bg` · Topbar: `bg` + `border` hairline
- Active nav: `primary` left-border accent + `surface` fill (one treatment everywhere)
- Hover inactive: `secondary` fill, lighter weight than active
- Breadcrumb: `text` muted, current segment full `text`

## Typography
- Headings: **Archivo** (600/700)
- Body/UI: **IBM Plex Sans** (400/500/600)
- Data, counts, dates, IDs: **IBM Plex Mono** — never long-form body copy
- Zero-chroma neutrals permitted (technical mood exemption, gate 17)

## Density & spacing
4px base. Tokens in use: `space-1` 4, `space-2` 8, `space-3` 12 (nav row floor), `space-4` 16, `space-6` 24 (card internal floor), `space-8` 32.
App-shell: no `space-24`+ section padding — that's marketing-page scale (gate 23 exempts app shells).
Radius: 8px default, 6px controls, 999px pills.

## Motion
- Duration: 180ms UI state, 240ms panel switch. Easing: `cubic-bezier(.2,.6,.2,1)`.
- Stagger: 28ms per row, cap 12 rows.
- No overshoot easing on UI (gate 30). Only `transform`/`opacity` (gate 29).
- `prefers-reduced-motion` branch required everywhere.

## Do not
- No indigo/purple gradient (gate 14). No gradient text.
- No emoji as icons — Iconify set only.
- No `transition: all` (gate 28).
- No mono for paragraphs.
- No fake browser chrome around screenshots.

## Assets
- Icons: Iconify, technical mood set, tinted `#b28bd2`.
- Photography: none — app shell has no photo surface. Ad creatives ARE the imagery (real fbcdn URLs from scraped data).
- Illustrations: unDraw library NOT populated; empty states use code-native SVG in locked palette. Stated honestly, not overclaimed.

## Scan dispositions (recorded, not silently ignored)
- `viewport-height` HIGH x2 — **fixed**: `.shell` and `.sidebar` now use `100dvh`.
- `missing-alt` HIGH at icons.js:2 — **false positive**: line 2 is a comment. Every inline `<svg>` sets
  `aria-hidden="true"`; the single real `<img>` (ad creative) has explicit `alt=""` + width/height.
- `long-duration` MEDIUM, `shimmer 1.4s` — **earned, kept**: a skeleton shimmer is a continuous
  loading affordance, not a UI state transition. The 300ms budget governs state changes. The audit
  explicitly allows explained motion. It is reduced-motion gated.
