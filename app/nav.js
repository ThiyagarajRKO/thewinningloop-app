"use client";
import { Icon, BrandMark } from "./icons";

/* Nav mirrors AdVault's feature set. `live` = real data behind it today.
   Locked features render an honest not-connected state naming exactly what each needs —
   never a fake table of invented numbers.
   Shared between the main shell (app/page.js) and the ad detail page (app/ad/[id]/page.js)
   so both surfaces navigate through the same feature list instead of the detail page being
   a dead end you can only Back out of. */
export const NAV = [
  {
    group: "Ad intelligence",
    items: [
      { id: "fb", label: "Facebook Adlibrary", icon: "megaphone", live: true },
      {
        id: "tiktok",
        label: "TikTok Adspy",
        icon: "music",
        need: "Blocked on both routes. The API is research-only (academic/non-profit, EU data only; commercial users explicitly ineligible). And library.tiktok.com/robots.txt disallows /ads, /api and /other-commercial-content by name, plus a blanket Disallow: / — so a scraper is not a legitimate workaround. Licensed resellers (Apify and similar) are the remaining option.",
      },
      {
        id: "pinterest",
        label: "Pinterest Adspy",
        icon: "image",
        need: "No public ads API, and pinterest.com/robots.txt runs an explicit bot allowlist — unlisted crawlers are disallowed by default, with a submission form for approval. Scraping without being allowlisted is not a legitimate path. Options: apply to their bot allowlist, or use a licensed data reseller.",
      },
      {
        id: "fbpost",
        label: "Facebook Post Adspy",
        icon: "message",
        need: "Tested the Ad Library page-scoped view (view_all_page_id) through the existing scraper: HTTP 403, zero cards parsed, page rendered in the wrong locale. The MCP notes this view often fails to hydrate headless. Organic posts are a different surface again and need Graph API page access, which requires owning or being granted access to the Page.",
      },
    ],
  },
  {
    group: "Product research",
    items: [
      { id: "stores", label: "Store Explorer", icon: "store", live: true },
      { id: "magic", label: "Magic AI", icon: "sparkles", live: true },
      { id: "gtrends", label: "Google Trends", icon: "trending", live: true },
      { id: "tracker", label: "Brand Tracker", icon: "chart", live: true },
      {
        id: "reverse",
        label: "AI Reverse Ad Search",
        icon: "search",
        need: "pgvector 0.8.6 is already available on this Postgres. What is missing is an embedding model to vectorise the 228 stored creatives, plus a vector column and index. This is the closest blocked feature to done.",
      },
    ],
  },
  {
    group: "Output",
    items: [
      {
        id: "import",
        label: "Product Importing",
        icon: "package",
        need: "Writes a chosen product into trackify-com.myshopify.com as a draft. SHOPIFY_ADMIN_CLIENT_ID and secret are set, but SHOPIFY_STOREFRONT_API_TOKEN is empty and no Admin API access token has been exchanged yet.",
      },
      { id: "boards", label: "Saved Boards", icon: "bookmark", live: true },
    ],
  },
];
export const ALL_NAV = NAV.flatMap((g) => g.items);

/**
 * @param {string} view - current nav id, or '' if nothing should be highlighted (e.g. ad detail page)
 * @param {(id: string) => void} onSelect
 */
export function Sidebar({ view, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <BrandMark />
        <span className="brand-name">
          Ad<em>Vault</em>
        </span>
      </div>
      <nav className="nav" aria-label="Features">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="nav-label">{g.group}</div>
            {g.items.map((it) => {
              const I = Icon[it.icon];
              return (
                <button
                  key={it.id}
                  className={"nav-item" + (it.live ? "" : " locked")}
                  aria-current={view === it.id ? "page" : undefined}
                  onClick={() => onSelect(it.id)}
                >
                  <I />
                  <span>{it.label}</span>
                  <span
                    className="dot"
                    title={it.live ? "Connected" : "Not connected"}
                  />
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
