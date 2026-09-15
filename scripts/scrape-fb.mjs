// Standalone Facebook Ad Library scraper — lives in this project, no MCP dependency.
//
// Reads the PUBLIC page at facebook.com/ads/library/ in headless Chromium (same
// boundary as the existing MCP scraper — robots.txt places no restriction on this
// page, and Facebook itself serves it to any browser with no login). Extracts:
//   - everything the old markdown-based parser got (advertiser, body, CTA, image, dates)
//   - creative_video / creative_video_poster — <video> tags that markdown conversion
//     was silently dropping, recovered from the same raw HTML crawl4ai already fetched
//   - platforms — same fix, read from data attributes rather than flattened text
//
// This does NOT call Facebook's private /api/graphql/ endpoint or use any harvested
// session token. It renders the public page and reads the DOM, the same category of
// access as opening it in a browser and viewing source.
//
// Usage: node scripts/scrape-fb.mjs "<query>" <COUNTRY> [scrollRounds] [waitSeconds]
//   node scripts/scrape-fb.mjs "posture corrector" US 8 20
// Or with a full prebuilt URL:
//   node scripts/scrape-fb.mjs --url "https://www.facebook.com/ads/library/?..."

import { chromium } from 'playwright';

const AD_LIBRARY_BASE = 'https://www.facebook.com/ads/library/';

export function buildUrl({ query, country = 'US', activeStatus = 'active', mediaType = 'all', adType = 'all', pageId = '' }) {
  const p = new URLSearchParams({ active_status: activeStatus, ad_type: adType, country, media_type: mediaType });
  if (pageId) {
    p.set('view_all_page_id', pageId);
    p.set('search_type', 'page');
    if (query) p.set('q', query);
  } else {
    p.set('search_type', 'keyword_unordered');
    p.set('q', query);
  }
  p.set('locale', 'en_US'); // without this the page can render in the machine's local language
  return AD_LIBRARY_BASE + '?' + p.toString();
}

// -- CTA button labels the Ad Library actually uses --
// Facebook renders CTA BUTTON labels from the account/IP locale, NOT from the
// URL's locale=en_US (which only localises page chrome). From this machine they
// came back Tamil: 65x "ஷாப் செய்க" = Shop now. An English-only word list matched
// just 35/157 ads and capped headline extraction, since the CTA terminates the
// link-card match. These are the observed labels, mapped back to English.
const CTA_I18N = {
  'ஷாப் செய்க': 'Shop now',
  'மேலும் அறிக': 'Learn more',
  'விவரங்களைக் காண்க': 'See details',
  'ஆர்டர்செய்க': 'Order now',
  'பதிவுபெறுக': 'Sign up',
  'பதிவிறக்குக': 'Download',
};
const CTA_WORDS = ['Shop now', 'Shop Now', 'Learn more', 'Learn More', 'Sign up', 'Sign Up',
  'Send message', 'Send Message', 'Get offer', 'Get Offer', 'Download', 'Watch more',
  'Watch More', 'Apply now', 'Apply Now', 'Book now', 'Book Now', 'Contact us', 'Subscribe',
  'See details', 'Order now', ...Object.keys(CTA_I18N)];
const esc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CTA_ALT = CTA_WORDS.map(esc).join('|');
const CTA_RE = new RegExp('(' + CTA_ALT + ')');

// normalise a scraped CTA back to its English label
function normalizeCta(raw) {
  if (!raw) return null;
  const t = raw.trim();
  return CTA_I18N[t] || t;
}

function decodeLandingUrl(fbLink) {
  try {
    const u = new URL(fbLink);
    const inner = u.searchParams.get('u');
    return inner ? decodeURIComponent(inner) : fbLink;
  } catch { return fbLink; }
}

// Render the page, scroll to load more cards, return both the visible-text and
// raw HTML for the same DOM.
//
// Video hydration finding: Facebook mounts each card's <video> element via an
// intersection observer keyed to real scroll position, not just DOM presence.
// Jumping straight to scrollHeight (the old approach) loads the ad cards but skips
// past most of them too fast for that observer to ever fire — measured 1/67 video
// tags that way. Scrolling in small steps (~500px, paused) instead gives every
// card time in the viewport, measured 103/130 (~79%) with this approach. This is
// the single biggest lever on video recovery, more than scroll COUNT.
async function renderAdLibrary(url, { waitSeconds = 8, scrollRounds = 8, stepPx = 500, stepDelayMs = 900 } = {}) {
  const browser = await chromium.launch({ headless: true });
  try {
    // locale + Accept-Language are the real lever on BUTTON labels; the URL's
    // locale=en_US only localises page chrome. Without these, CTA buttons came
    // back in the machine's local language (Tamil) even on an en_US URL.
    const page = await browser.newPage({
      viewport: { width: 1400, height: 1600 },
      locale: 'en-US',
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    let status = 0;
    page.on('response', r => { if (r.url() === url || r.url().startsWith(AD_LIBRARY_BASE)) status = r.status(); });
    await page.goto(url, { timeout: 60000, waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(Math.max(3000, waitSeconds * 1000));

    // scrollRounds now means "how many 500px steps", not "how many jump-to-bottom cycles"
    const steps = Math.max(1, scrollRounds) * 4; // ~4 small steps ≈ one old-style round of viewport travel
    for (let i = 0; i < steps; i++) {
      await page.evaluate(px => window.scrollBy(0, px), stepPx);
      await page.waitForTimeout(stepDelayMs);
    }
    await page.waitForTimeout(2000);

    const html = await page.content();
    const text = await page.evaluate(() => document.body.innerText || '');
    return { html, text, status };
  } finally {
    await browser.close();
  }
}

// Extract creative_video/poster per library_id from raw HTML. Facebook's <video>
// carries poster (thumbnail) and src (mp4); markdown conversion drops both because
// neither is visible text.
function extractVideosByLibraryId(html) {
  const out = new Map();
  const chunks = html.split(/Library ID:?\s*/);
  for (let i = 1; i < chunks.length; i++) {
    // NO arbitrary cap: split() already ends this chunk at the next Library ID, so
    // the chunk IS one card. The old slice(0, 8000) cut straight through the
    // 7178-8019 char band where Facebook emits <video>, dropping 58 of 59 videos.
    const chunk = chunks[i];
    const lidM = chunk.match(/^(\d+)/);
    if (!lidM) continue;
    const lid = lidM[1];
    if (out.has(lid)) continue;
    const vWithPoster = chunk.match(/<video[^>]*\bposter="([^"]*)"[^>]*\bsrc="([^"]+)"/);
    if (vWithPoster) {
      out.set(lid, { video: decodeHtmlEntities(vWithPoster[2]), poster: decodeHtmlEntities(vWithPoster[1]) });
      continue;
    }
    const vOnly = chunk.match(/<video[^>]*\bsrc="([^"]+)"/);
    if (vOnly) out.set(lid, { video: decodeHtmlEntities(vOnly[1]), poster: null });
  }
  return out;
}

function decodeHtmlEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// Parse ad cards from the rendered text (innerText is the Node/Playwright equivalent
// of the markdown-conversion the old scraper used — same visible-text boundary),
// then attach video data recovered from the HTML pass above.
function parseAdCards(text, html) {
  const videos = extractVideosByLibraryId(html);
  const ads = [];
  const seen = new Set();
  const chunks = text.split(/\nLibrary ID:\s*/);

  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const lidM = chunk.match(/^(\d+)/);
    if (!lidM) continue;
    const lid = lidM[1];
    if (seen.has(lid)) continue;
    seen.add(lid);

    // locale=en_US matters here too: without it the detail page renders in the
    // machine's local language (observed: Tamil), same bug the search URL had.
    const ad = { library_id: lid, ad_details_url: `https://www.facebook.com/ads/library/?id=${lid}&locale=en_US` };

    const dateM = chunk.match(/Started running on ([A-Za-z]{3} \d{1,2}, \d{4})/);
    ad.started_running = dateM ? dateM[1] : null;

    const scaleM = chunk.match(/(\d+)\s+ads?\s+use this creative/);
    ad.ads_using_creative = scaleM ? parseInt(scaleM[1], 10) : 1;

    const advM = chunk.match(/([^\n]{2,80})\nSponsored/);
    if (advM) ad.advertiser = advM[1].trim();

    const ctaM = chunk.match(CTA_RE);
    ad.cta = ctaM ? normalizeCta(ctaM[1]) : null;

    const bodyM = chunk.match(/Sponsored\n([\s\S]{0,2000}?)(?:\nActive\n|\nInactive\n|$)/);
    ad.body = bodyM ? bodyM[1].trim().slice(0, 2000) : null;

    // Platform icons are <img>, not text — the old text-match approach always
    // returned [] because the names never appear as visible text. Read them from
    // the HTML chunk's icon markup instead (filled in by attachFromHtml below).
    ad.platforms = [];

    // status line: "Active" / "Inactive" sits at the end of each card
    const statusM = chunk.match(/\n(Active|Inactive)\s*$/m);
    ad.status = statusM ? statusM[1] : null;

    // video duration, shown as the player timecode "0:00 / 0:15"
    const durM = chunk.match(/0:00\s*\/\s*(\d+):(\d{2})/);
    ad.video_duration_sec = durM ? (+durM[1] * 60 + +durM[2]) : null;

    // The block under the creative: SHOUTED.DOMAIN / headline / description / CTA.
    // This is the link card Facebook renders, and it carries the ad's real headline
    // — distinct from body copy, and not captured before.
    // Shape is SHOUTED.DOMAIN / headline / [optional description] / CTA.
    // The description line is frequently ABSENT — requiring it matched only 12/149
    // cards. Capture the 1-2 lines between the domain and the CTA instead, then
    // decide which is headline vs description by position.
    // use the SAME alternation as CTA_RE so localised buttons terminate the match too
    const cardM = chunk.match(
      new RegExp('\\n([A-Z0-9][A-Z0-9.\\-]{3,})\\n((?:[^\\n]+\\n){1,2}?)(?:' + CTA_ALT + ')', 'i'));
    if (cardM) {
      ad.display_domain = cardM[1].trim();
      const lines = cardM[2].split('\n').map(l => l.trim()).filter(Boolean);
      ad.headline = lines[0] ? lines[0].slice(0, 300) : null;
      ad.link_description = lines[1] ? lines[1].slice(0, 400) : null;
    } else {
      ad.display_domain = null; ad.headline = null; ad.link_description = null;
    }

    ad.eu_transparency = /EU transparency/i.test(chunk);

    const vid = videos.get(lid);
    ad.creative_video = vid ? vid.video : null;
    ad.creative_video_poster = vid ? vid.poster : null;
    ad.media_type = vid ? 'video' : 'image';

    ads.push(ad);
  }
  return ads;
}

// Images: reuse the same size-preference logic already proven in the MCP fix —
// prefer the largest stp=dst-jpg_sNxN variant. Read from HTML <img> tags since
// innerText never carries image URLs at all.
function extractImagesByLibraryId(html) {
  const out = new Map();
  const chunks = html.split(/Library ID:?\s*/);
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];   // same fix as the video extractor: no arbitrary cap
    const lidM = chunk.match(/^(\d+)/);
    if (!lidM) continue;
    const lid = lidM[1];
    if (out.has(lid)) continue;
    const cands = [...chunk.matchAll(/<img[^>]*\bsrc="(https:\/\/scontent[^"]+)"/g)].map(m => decodeHtmlEntities(m[1]));
    if (!cands.length) continue;
    const px = u => { const m = u.match(/stp=dst-jpg_s(\d+)x(\d+)/); return m ? +m[1] * +m[2] : 0; };
    out.set(lid, cands.reduce((a, b) => (px(b) > px(a) ? b : a)));
  }
  return out;
}

function attachLandingUrls(ads, html) {
  const chunks = html.split(/Library ID:?\s*/);
  const byId = new Map();
  for (let i = 1; i < chunks.length; i++) {
    const c = chunks[i];   // same fix: chunk already ends at the next card
    const lidM = c.match(/^(\d+)/);
    if (!lidM) continue;
    const m = c.match(/l\.facebook\.com\/l\.php\?u=([^"&]+)/);
    if (m) byId.set(lidM[1], decodeURIComponent(m[1]));
  }
  const images = extractImagesByLibraryId(html);
  const allImages = extractAllImagesByLibraryId(html);
  const platforms = extractPlatformsByLibraryId(html);
  const handles = extractAdvertiserHandlesByLibraryId(html);
  for (const ad of ads) {
    const landing = byId.get(ad.library_id);
    if (landing) {
      ad.landing_url = landing;
      try { ad.landing_domain = new URL(landing).hostname; } catch { ad.landing_domain = null; }
    } else {
      ad.landing_url = null; ad.landing_domain = null;
    }
    ad.creative_image = images.get(ad.library_id) || null;
    ad.all_images = allImages.get(ad.library_id) || [];
    ad.advertiser_handle = handles.get(ad.library_id) || null;
    const pf = platforms.get(ad.library_id);
    ad.platform_count = pf ? pf.count : 0;
    ad.platforms = pf ? pf.names : [];
  }
}

// The advertiser's Page id, from the facebook.com/<handle> profile link every card
// carries (47/47 observed). Without this the advertisers table stays empty and the
// detail view's "other ads by this advertiser" always returns nothing — a real
// regression vs the old MCP scraper, which read the same link.
function extractAdvertiserHandlesByLibraryId(html) {
  const out = new Map();
  const chunks = html.split(/Library ID:?\s*/);
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const lidM = chunk.match(/^(\d+)/);
    if (!lidM) continue;
    if (out.has(lidM[1])) continue;
    // prefer a numeric page id; fall back to a vanity handle
    const m = chunk.match(/facebook\.com\/(\d{6,})\/?["?]/)
           || chunk.match(/facebook\.com\/([A-Za-z0-9._-]{3,})\/?["?]/);
    if (m && !/^(ads|business|policies|help|privacy)$/i.test(m[1])) out.set(lidM[1], m[1]);
  }
  return out;
}

// Every creative image on a card (not just the largest), for a detail view.
function extractAllImagesByLibraryId(html) {
  const out = new Map();
  const chunks = html.split(/Library ID:?\s*/);
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const lidM = chunk.match(/^(\d+)/);
    if (!lidM) continue;
    if (out.has(lidM[1])) continue;
    const urls = [...new Set(
      [...chunk.matchAll(/<img[^>]*\bsrc="(https:\/\/scontent[^"]+)"/g)].map(m => decodeHtmlEntities(m[1]))
    )];
    out.set(lidM[1], urls);
  }
  return out;
}

// Platform indicators are CSS sprites, not text or named icons:
//   <div style="... mask-image: url(.../uhBloS7nYQk.webp); mask-position: 0px -955px">
// The platform identity lives ONLY in the sprite offset. Facebook's sprite layout
// is undocumented and shifts between builds, so mapping offset -> "Instagram" would
// be guesswork presented as fact. We therefore record the raw offsets and a reliable
// COUNT, and leave names empty rather than invent them. This is why the old
// text-matching approach always produced [] — the names are never in the DOM at all.
const PLATFORM_SPRITE_RE = /mask-position:\s*0px\s*(-?\d+)px/g;
function extractPlatformsByLibraryId(html) {
  const out = new Map();
  const chunks = html.split(/Library ID:?\s*/);
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const lidM = chunk.match(/^(\d+)/);
    if (!lidM) continue;
    if (out.has(lidM[1])) continue;
    const head = chunk.slice(0, chunk.indexOf('Sponsored') + 1 || 4000);
    const offsets = [...new Set([...head.matchAll(PLATFORM_SPRITE_RE)].map(m => m[1]))];
    out.set(lidM[1], { count: offsets.length, offsets, names: [] });
  }
  return out;
}

export async function scrapeAdLibrary(url, opts = {}) {
  const { html, text, status } = await renderAdLibrary(url, opts);
  const ads = parseAdCards(text, html);
  attachLandingUrls(ads, html);
  return {
    success: ads.length > 0,
    url, status_code: status,
    total_ads_parsed: ads.length,
    ads,
    note: ads.length === 0
      ? 'No ad cards parsed. Facebook flags headless browsers with 403 but usually still serves content — retry with a higher waitSeconds, or the query may genuinely have no results.'
      : undefined,
  };
}

// CLI entry
if (process.argv[1] && process.argv[1].endsWith('scrape-fb.mjs')) {
  const args = process.argv.slice(2);
  let url;
  if (args[0] === '--url') {
    url = args[1];
  } else {
    const [q, country = 'US', scrollRounds = '8', waitSeconds = '20'] = args;
    if (!q) {
      console.error('usage: node scripts/scrape-fb.mjs "<query>" [COUNTRY] [scrollRounds] [waitSeconds]');
      console.error('   or: node scripts/scrape-fb.mjs --url "<full ad library url>"');
      process.exit(1);
    }
    url = buildUrl({ query: q, country });
    var _scrollRounds = parseInt(scrollRounds, 10);
    var _waitSeconds = parseInt(waitSeconds, 10);
  }
  const result = await scrapeAdLibrary(url, {
    scrollRounds: typeof _scrollRounds === 'number' ? _scrollRounds : 8,
    waitSeconds: typeof _waitSeconds === 'number' ? _waitSeconds : 20,
  });
  const withVideo = result.ads.filter(a => a.creative_video).length;
  console.error(`parsed=${result.total_ads_parsed} withVideo=${withVideo} status=${result.status_code}`);
  console.log(JSON.stringify(result));
}
