// Runs one sync_jobs row to completion: scrape the Ad Library, ingest into
// Postgres, update the job's status as it goes. Spawned as a detached child
// process by POST /api/sync (a scrape takes 1-3+ minutes — far too long to
// hold open inside a request/response cycle), so this file owns its own DB
// connection lifecycle rather than sharing the app's pool.
//
// Usage: node scripts/sync-worker.mjs <jobId> "<query>" <COUNTRY> [scrollRounds] [waitSeconds]
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

import { scrapeAdLibrary, buildUrl } from './scrape-fb.mjs';
import { normalizeAd } from './normalize.mjs';

const [jobId, query, country = 'US', scrollRounds = '8', waitSeconds = '20'] = process.argv.slice(2);
if (!jobId || !query) {
  console.error('usage: node scripts/sync-worker.mjs <jobId> "<query>" [COUNTRY] [scrollRounds] [waitSeconds]');
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
  await pool.query(`UPDATE sync_jobs SET ${sets} WHERE id = $1`, [jobId, ...values]);
}

try {
  await setStatus('scraping');
  const url = buildUrl({ query, country });
  const result = await scrapeAdLibrary(url, {
    scrollRounds: parseInt(scrollRounds, 10) || 8,
    waitSeconds: parseInt(waitSeconds, 10) || 20,
  });

  if (!result.success) {
    await setStatus('error', { error: result.note || 'No ads parsed', finished_at: new Date(), ads_found: 0 });
    process.exit(0);
  }

  await setStatus('ingesting', { ads_found: result.ads.length });

  const rows = result.ads.map(r => normalizeAd(r, { query, country })).filter(r => r.library_id);
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
           creative_image = COALESCE(EXCLUDED.creative_image, ads.creative_image),
           creative_video        = COALESCE(EXCLUDED.creative_video, ads.creative_video),
           creative_video_poster = COALESCE(EXCLUDED.creative_video_poster, ads.creative_video_poster),
           media_type            = COALESCE(EXCLUDED.media_type, ads.media_type),
           landing_url    = COALESCE(EXCLUDED.landing_url, ads.landing_url),
           landing_domain = COALESCE(EXCLUDED.landing_domain, ads.landing_domain),
           cta            = COALESCE(EXCLUDED.cta, ads.cta),
           link_text      = COALESCE(EXCLUDED.link_text, ads.link_text),
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
      [query, country, url, rows.length, inserted]);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }

  await setStatus('done', { ads_new: inserted, finished_at: new Date() });
} catch (err) {
  await setStatus('error', { error: String(err.message || err).slice(0, 2000), finished_at: new Date() }).catch(() => {});
} finally {
  await pool.end();
}
