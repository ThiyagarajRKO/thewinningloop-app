// Normalize one raw Facebook Ad Library card (as emitted by the MCP) into DB columns.
const MONTHS = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};

// "Oct 31, 2024" -> "2024-10-31"; anything else -> null
export function parseStarted(s) {
  if (!s) return null;
  const m = /^([A-Z][a-z]{2})\s+(\d{1,2}),\s*(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const mo = MONTHS[m[1]];
  if (!mo) return null;
  return `${m[3]}-${String(mo).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
}

// "Shop now" / "Shop Now" -> "Shop now"
export function normCta(c) {
  if (!c) return null;
  const t = c.trim();
  if (!t) return null;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export function normalizeAd(raw, { query = null, country = null } = {}) {
  return {
    library_id: String(raw.library_id || '').trim(),
    ad_details_url: raw.ad_details_url || null,
    advertiser_handle: raw.advertiser_handle ? String(raw.advertiser_handle) : null,
    advertiser_name: raw.advertiser || null,
    started_running: parseStarted(raw.started_running),
    ads_using_creative: Number.isInteger(raw.ads_using_creative) ? raw.ads_using_creative : 1,
    cta: normCta(raw.cta),
    creative_image: raw.creative_image || null,
    // recovered from the raw HTML <video> tag — markdown conversion drops these
    creative_video: raw.creative_video || null,
    creative_video_poster: raw.creative_video_poster || null,
    media_type: raw.media_type || (raw.creative_video ? 'video' : 'image'),
    // detail-page fields, extracted from the same grid sweep (the ?id= detail page
    // itself returns "No ads match your search criteria" to a headless browser,
    // so everything a detail view needs must come from the card markup)
    headline: raw.headline || null,
    link_description: raw.link_description || null,
    display_domain: raw.display_domain || null,
    status: raw.status || null,
    video_duration_sec: Number.isInteger(raw.video_duration_sec) ? raw.video_duration_sec : null,
    eu_transparency: raw.eu_transparency === true,
    all_images: Array.isArray(raw.all_images) ? raw.all_images : [],
    body: raw.body || null,
    link_text: raw.link_text || null,
    landing_url: raw.landing_url || null,
    landing_domain: raw.landing_domain || null,
    platforms: Array.isArray(raw.platforms) ? raw.platforms : [],
    search_query: query,
    country,
  };
}
