// Ingest a saved MCP payload (JSON file) into Postgres. Usage: node scripts/ingest.mjs <file> [query] [country]
import fs from 'node:fs';
import { pool } from '../lib/db.mjs';
import { normalizeAd } from './normalize.mjs';

const [file, query = null, country = null] = process.argv.slice(2);
if (!file) { console.error('usage: node scripts/ingest.mjs <payload.json> [query] [country]'); process.exit(1); }

const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
const raws = payload.ads || [];
const rows = raws.map(r => normalizeAd(r, { query, country })).filter(r => r.library_id);

const c = await pool.connect();
let inserted = 0;
try {
  await c.query('BEGIN');
  for (const r of rows) {
    if (r.advertiser_handle) {
      await c.query(
        `INSERT INTO advertisers (handle, name) VALUES ($1,$2)
         ON CONFLICT (handle) DO UPDATE SET name=EXCLUDED.name, last_seen=now()`,
        [r.advertiser_handle, r.advertiser_name || r.advertiser_handle]);
    }
    const res = await c.query(
      `INSERT INTO ads (library_id, ad_details_url, advertiser_handle, advertiser_name,
         started_running, ads_using_creative, cta, creative_image, body, link_text,
         landing_url, landing_domain, platforms, search_query, country,
         creative_video, creative_video_poster, media_type,
         headline, link_description, display_domain, status,
         video_duration_sec, eu_transparency, all_images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
               $19,$20,$21,$22,$23,$24,$25)
       ON CONFLICT (library_id) DO UPDATE SET
         ads_using_creative = EXCLUDED.ads_using_creative,
         -- refresh the creative URL: a re-sweep may carry a higher-resolution
         -- variant (s600x600 vs the s60x60 thumbnail), and the CDN URLs are
         -- signed, so the newer one is also the only one that still loads.
         creative_image = COALESCE(EXCLUDED.creative_image, ads.creative_image),
         -- same reasoning for video: fbcdn mp4 URLs are signed and expire, and an
         -- older sweep may predate the video-extraction fix entirely (null here).
         creative_video        = COALESCE(EXCLUDED.creative_video, ads.creative_video),
         creative_video_poster = COALESCE(EXCLUDED.creative_video_poster, ads.creative_video_poster),
         media_type            = COALESCE(EXCLUDED.media_type, ads.media_type),
         landing_url    = COALESCE(EXCLUDED.landing_url, ads.landing_url),
         landing_domain = COALESCE(EXCLUDED.landing_domain, ads.landing_domain),
         cta            = COALESCE(EXCLUDED.cta, ads.cta),
         link_text      = COALESCE(EXCLUDED.link_text, ads.link_text),
         -- detail fields: refresh on re-sweep the same way, so an older row that
         -- predates this extraction picks the data up instead of staying null
         headline           = COALESCE(EXCLUDED.headline, ads.headline),
         link_description   = COALESCE(EXCLUDED.link_description, ads.link_description),
         display_domain     = COALESCE(EXCLUDED.display_domain, ads.display_domain),
         status             = COALESCE(EXCLUDED.status, ads.status),
         video_duration_sec = COALESCE(EXCLUDED.video_duration_sec, ads.video_duration_sec),
         eu_transparency    = EXCLUDED.eu_transparency,
         all_images         = CASE WHEN array_length(EXCLUDED.all_images, 1) > 0
                                   THEN EXCLUDED.all_images ELSE ads.all_images END,
         platforms          = CASE WHEN array_length(EXCLUDED.platforms, 1) > 0
                                   THEN EXCLUDED.platforms ELSE ads.platforms END,
         last_seen = now()
       RETURNING (xmax = 0) AS is_new`,
      [r.library_id, r.ad_details_url, r.advertiser_handle, r.advertiser_name,
       r.started_running, r.ads_using_creative, r.cta, r.creative_image, r.body,
       r.link_text, r.landing_url, r.landing_domain, r.platforms, r.search_query, r.country,
       r.creative_video, r.creative_video_poster, r.media_type,
       r.headline, r.link_description, r.display_domain, r.status,
       r.video_duration_sec, r.eu_transparency, r.all_images]);
    if (res.rows[0]?.is_new) inserted++;
  }
  await c.query(
    `INSERT INTO sweeps (query, country, url, ads_found, ads_new) VALUES ($1,$2,$3,$4,$5)`,
    [query, country, payload.url || null, rows.length, inserted]);
  await c.query('COMMIT');
} catch (e) { await c.query('ROLLBACK'); throw e; }
finally { c.release(); await pool.end(); }

console.log(`parsed=${raws.length} normalized=${rows.length} new=${inserted} updated=${rows.length - inserted}`);
