# Style lock — AdVault

Established 2026-09-15. Cold start (no references, no prior profile).

## Classification
**App shell** — sidebar + topbar internal tool. NOT a marketing page.
- No hero, no scroll narrative, no macrostructure rotation (Step 2.5 skipped per SKILL.md).
- Density: dense/information-heavy. Nav rows at `space-3` (12px) floor.
- Motion: App-shell track only (panel transitions, staggered table entrance, skeletons).

## Mood
**technical**. Builder-facing research tool.

## Color contract
Generated: `generate_palette.py --mood technical --seed 21` — **true companion pair**
(same seed, both modes), triadic, base hue 170.9 / accent hue 290.9. Each mode
independently contrast-solved and verified.

### Light (default)
| Role | Hex |
|---|---|
| text | `#121d19` |
| bg | `#f2fcf8` |
| surface | `#e8f2ee` |
| primary | `#158569` |
| on-primary | `#ffffff` |
| secondary | `#c1e9da` |
| accent | `#7664bb` |
| border | `#d7e1dd` |

**Text-safe (>=4.5)**: text/on-primary 17.28, text/bg 16.50, text/surface 15.11,
text/border 12.92, accent/on-primary 4.87, bg/accent 4.65, primary/on-primary 4.57
**UI-safe (>=3.0)**: bg/primary 4.37, surface/accent 4.26, surface/primary 4.00,
text/primary 3.78, accent/border 3.64, text/accent 3.55, primary/border 3.42
**Decorative (<3.0)**: border/on-primary, bg/border, surface/border, surface/on-primary,
bg/surface, primary/accent, bg/on-primary

### Dark (companion, same seed)
| Role | Hex |
|---|---|
| text | `#e7f6f0` |
| bg | `#09100d` |
| surface | `#141b18` |
| primary | `#158569` |
| on-primary | `#ffffff` |
| secondary | `#11352b` |
| accent | `#9f8fea` |
| border | `#1f2724` |

**Text-safe (>=4.5)**: bg/on-primary 19.24, surface/on-primary 17.50, text/bg 17.26,
text/surface 15.70, border/on-primary 15.28, text/border 13.71, bg/accent 6.95,
surface/accent 6.33, accent/border 5.53, primary/on-primary 4.57
**UI-safe (>=3.0)**: bg/primary 4.21, text/primary 4.10, surface/primary 3.83, primary/border 3.34

### Derived tokens (not from the generator — verified separately)
- `--accent-text` **light** `#584a91`: the raw accent fails the 4.5 text floor on light
  surfaces (3.55-4.26). Darkened variant verified **7.15:1 on bg, 6.55:1 on surface**.
  In dark mode `--accent-text` = the raw accent (already 6.33 on surface).
- `--text-muted` **light** `#5a6b65` verified **5.38:1 on bg, 4.93:1 on surface**;
  **dark** `#8ba39b` (carried from the previous verified dark set).

**Rules:**
- Button labels on `primary` fill -> `on-primary` (4.57 light / 4.57 dark).
- Small accent-coloured TEXT must use `--accent-text`, never raw `--accent`.
- Raw `--accent` is for non-text marks only (status dots, focus rings, brand mark).
- `border` hairlines are decorative-only in both modes — never the sole state signal.

## Dark mode
**Runtime toggle — both modes ship, user-switchable.** `data-theme` attribute on
`<html>`, defaulting from `prefers-color-scheme`, explicit choice persisted to
`localStorage` under `advault-theme`, applied by a pre-paint inline script in
`layout.js` so a returning dark user sees no flash of light.


## Light-mode surface rework (Google/Material model)
User feedback: the sidebar and stat cards read wrong as a tinted mint fill darker
than the canvas. Reworked to Google's surface model — **white cards on a tinted-grey
canvas**, separated by elevation shadow + hairline rather than by fill weight.

The M3 docs page is JS-rendered and returned no body to fetch, so these neutrals are
derived from the approach and **measured**, not copied from a spec sheet.

| Role | Was (mint) | Now (Google model) |
|---|---|---|
| bg (canvas) | `#f2fcf8` | `#f4f6f8` |
| surface (cards/sidebar) | `#e8f2ee` | `#ffffff` |
| border | `#d7e1dd` | `#e1e5ea` |
| text | `#121d19` | `#1a1f24` |
| secondary (hover) | `#c1e9da` | `#f1f3f5` |
| active-fill (new) | — | `#e6f2ee` |

Re-verified after the swap: text/surface 16.60, text/bg 15.32, surface/primary 4.57,
surface/accent 4.87, text-muted/surface 5.64, text-muted/bg 5.20, accent-text/surface 7.49,
accent-text/bg 6.91, text/secondary-hover 14.92, text/active-fill 14.46.

**Measured failure that shaped the design:** `primary` `#158569` as TEXT on the active
pill `#e6f2ee` is **3.99:1 — fails the 4.5 floor**. So the active nav row carries state
via the tinted fill + a primary-tinted icon + weight, with the label in `--text`.
Primary is never used as text on that pill.

`primary` and `accent` are unchanged, so the brand mark is identical in both modes.
Dark mode is untouched.

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

## Behavioral primitives (Step 1.5)
Stack has no Tailwind/shadcn (plain React + hand-rolled CSS, confirmed in package.json)
— registries don't apply, but library-selection.md's *behavioral* defaults still do since
they're framework-agnostic, unstyled component libraries:
- **Slide-in / overlay panels** → `@base-ui/react` (Dialog). Installed 1.8.0.
  Caught mid-install: `@base-ui-components/react` (the RC package) is **deprecated**,
  renamed to `@base-ui/react` — installed the wrong one first via npm's own suggestion,
  caught the deprecation warning, switched. Unstyled by design; styled entirely to the
  tokens above (`.panel-*` classes in globals.css). Uses its own `[data-open]`/
  `[data-starting-style]`/`[data-ending-style]` attributes for enter/exit, not manual
  state tracking — the CSS `transform`/`opacity` transitions key off those.
- **Charts** → `recharts` 3.10.1. "Never hand-roll a chart" per library-selection.md —
  the previous 8-bar CSS sparkline is gone from the detail view; `TrendsCard`'s small
  inline sparkline (top-of-page, not the detail panel) still uses the CSS bars, which is
  fine per that same rule — it's a decorative trend indicator, not a chart someone reads
  values off of. The panel's `AreaChart` has real axes, gridlines, and a tooltip.

## Trend detail panel — expand, date range, regions
- **Expand**: one `Dialog.Root` throughout; expand toggles `.panel-popup-modal` on the
  same Popup rather than mounting a second dialog. Drawer motion is `translateX`, modal
  motion is `scale` — both transform-only (gate 29), never simultaneous.
- **Date range**: `/api/trends/daily/detail` accepts `from`/`to` (`YYYY-MM-DD`), converted
  to Google's own custom-range timeframe string. Verified live against the real endpoint
  before building the UI around it (not assumed from docs) — 41 real points for a
  2026-08-01..2026-09-10 range. State lives inside `TrendDetailPanel`, keyed to `row.query`
  so it resets per-row rather than leaking across a different term.
- **Regions**: new `/api/trends/daily/regions`, wired to `interestByRegion()` — ported from
  the MCP source earlier in the project but never called from a route until this pass.
  Verified live (51 US states for a real term) before wiring. Only rendered when expanded.

## Contrast catch (Step 4 rule 5, worked correctly)
Draft error text used `--primary` on `--bg` — that pairing is UI-safe (4.21/4.37) in the
Color contract, not text-safe (needs 4.5), and using it for body-size error text would
have shipped a failing pairing. It was also the wrong choice semantically: `primary` reads
as brand/active state everywhere else in the shell (active nav pill, buttons, chart line),
so using it for an error would have been misleading even if the numbers had passed.
No dedicated error hue exists in this palette — inventing one wasn't warranted for one
inline validation message. Fixed by reusing `text` on `bg` (already text-safe, 16.50/17.26)
and moving the severity signal to an alert icon instead of a color.

## Scan dispositions (recorded, not silently ignored)
- `viewport-height` HIGH x2 — **fixed**: `.shell` and `.sidebar` now use `100dvh`.
- `missing-alt` HIGH at icons.js:2 — **false positive**: line 2 is a comment. Every inline `<svg>` sets
  `aria-hidden="true"`; the single real `<img>` (ad creative) has explicit `alt=""` + width/height.
- `long-duration` MEDIUM, `shimmer 1.4s` — **earned, kept**: a skeleton shimmer is a continuous
  loading affordance, not a UI state transition. The 300ms budget governs state changes. The audit
  explicitly allows explained motion. It is reduced-motion gated.
- `long-duration` MEDIUM, `.row-spinner spin .7s` (added for the trend detail panel) — **earned,
  kept**: same reasoning as the shimmer above — a spinner on an in-flight network request is a
  continuous loading affordance, not a state transition, and stopping it at 300ms while the fetch
  is still running would misrepresent the actual wait. Reduced-motion swaps it for a static color
  break (border-top-color change) instead of a frozen rotation frame.
