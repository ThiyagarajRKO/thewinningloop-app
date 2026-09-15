// Assembles one Brand Tracker profile: store info/theme/products (Shopify's
// own products.json + homepage HTML), tracking pixels (runtime-checked via a
// real browser — static HTML regex under-detects since Shopify proxies pixel
// loading through its own "trekkie" wrapper, confirmed live), a visible
// contact email (the store's own /pages/contact, a normal public page, not a
// bulk email-finder service), and that brand's Meta/Facebook ads (Page-scoped
// Ad Library search reusing scripts/scrape-fb.mjs, keyed to the advertiser
// Page id already captured in `ads` for domains we've swept before).
//
// Deliberately excludes: traffic/revenue estimates (no legitimate free
// source), Trustpilot (robots.txt disallows all crawlers except Google),
// TikTok/Pinterest/Google ad counts (same walls as the locked nav items).
//
// Usage: node scripts/brand-worker.mjs <domain>
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

import { chromium } from 'playwright';

const [domain] = process.argv.slice(2);
if (!domain) {
  console.error('usage: node scripts/brand-worker.mjs <domain>');
  process.exit(1);
}

const pool = new pg.Pool({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, max: 2,
});

async function setStatus(status, extra = {}) {
  const fields = ['status'];
  const values = [status];
  for (const [k, v] of Object.entries(extra)) { fields.push(k); values.push(v); }
  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  await pool.query(`UPDATE brand_profiles SET ${sets} WHERE domain = $1`, [domain, ...values]);
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function fetchProducts() {
  const res = await fetch(`https://${domain}/products.json?limit=12`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return { products: [], productCount: null };
  const data = await res.json();
  const products = (data.products || []).map(p => ({
    title: p.title, handle: p.handle,
    image: p.images?.[0]?.src || null,
    price: p.variants?.[0]?.price || null,
  }));
  return { products, productCount: products.length };
}

async function fetchStorePage(page) {
  await page.goto(`https://${domain}/`, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const html = await page.content();
  const themeMatch = html.match(/Shopify\.theme\s*=\s*\{[^}]*"name":"([^"]+)"/);
  const storeName = (await page.title() || '').split(/[-|–]/)[0].trim() || null;

  const pixels = await page.evaluate(() => {
    const found = [];
    if (typeof window.fbq === 'function') found.push('meta');
    if (typeof window.ttq === 'object' && window.ttq) found.push('tiktok');
    if (typeof window.gtag === 'function' || typeof window.dataLayer !== 'undefined') found.push('google');
    if (typeof window.pintrk === 'function') found.push('pinterest');
    if (typeof window._learnq !== 'undefined' || typeof window.klaviyo !== 'undefined') found.push('klaviyo');
    return found;
  });

  return {
    themeName: themeMatch ? themeMatch[1].replace(/\\\//g, '/') : null,
    storeName,
    pixels,
  };
}

async function fetchContactEmail(page) {
  for (const path of ['/pages/contact', '/pages/contact-us', '/policies/contact-information']) {
    const res = await page.goto(`https://${domain}${path}`, { timeout: 15000 }).catch(() => null);
    if (!res || !res.ok()) continue;
    const html = await page.content();
    const emails = [...new Set(
      (html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])
        .filter(e => !/\.(png|jpg|jpeg|svg|gif)$/i.test(e) && !/sentry|example\.com|wixpress/i.test(e))
    )];
    if (emails.length) return emails[0];
  }
  return null;
}

async function fetchMetaAds() {
  // A domain can be run through several advertiser Page identities at once
  // (brand variants, rebrands, multiple ad accounts) — confirmed live on a
  // real store: myhematix.com has 5 distinct advertiser_handle values in our
  // own indexed ads. A single Page-scoped scrape only ever sees one of those,
  // so the active count comes from our own already-ingested data (summed
  // across every handle for this domain) rather than one more live FB call —
  // more accurate, and doesn't cost an extra 30-60s scrape.
  const { rows } = await pool.query(
    `SELECT advertiser_handle,
            count(*) AS total,
            count(*) FILTER (WHERE status = 'Active') AS active_count
       FROM ads WHERE landing_domain = $1 AND advertiser_handle IS NOT NULL
       GROUP BY advertiser_handle ORDER BY total DESC`, [domain]);
  if (!rows.length) return { pageId: null, activeAds: null };

  const pageId = rows[0].advertiser_handle; // most-active handle, for display/linking
  const activeAds = rows.reduce((sum, r) => sum + Number(r.active_count), 0);
  return { pageId, activeAds };
}

try {
  await setStatus('fetching');

  const { products, productCount } = await fetchProducts();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: UA });
  const { themeName, storeName, pixels } = await fetchStorePage(page);
  const contactEmail = await fetchContactEmail(page);
  await browser.close();

  const { pageId, activeAds } = await fetchMetaAds();

  await setStatus('done', {
    store_name: storeName,
    theme_name: themeName,
    product_count: productCount,
    products: JSON.stringify(products),
    pixels,
    contact_email: contactEmail,
    fb_page_id: pageId,
    fb_active_ads: activeAds,
    fetched_at: new Date(),
    error: null,
  });
} catch (err) {
  await setStatus('error', { error: String(err.message || err).slice(0, 2000), fetched_at: new Date() }).catch(() => {});
} finally {
  await pool.end();
}
