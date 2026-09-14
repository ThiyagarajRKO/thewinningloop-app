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
         landing_url, landing_domain, platforms, search_query, country)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (library_id) DO UPDATE SET
         ads_using_creative = EXCLUDED.ads_using_creative,
         last_seen = now()
       RETURNING (xmax = 0) AS is_new`,
      [r.library_id, r.ad_details_url, r.advertiser_handle, r.advertiser_name,
       r.started_running, r.ads_using_creative, r.cta, r.creative_image, r.body,
       r.link_text, r.landing_url, r.landing_domain, r.platforms, r.search_query, r.country]);
    if (res.rows[0]?.is_new) inserted++;
  }
  await c.query(
    `INSERT INTO sweeps (query, country, url, ads_found, ads_new) VALUES ($1,$2,$3,$4,$5)`,
    [query, country, payload.url || null, rows.length, inserted]);
  await c.query('COMMIT');
} catch (e) { await c.query('ROLLBACK'); throw e; }
finally { c.release(); await pool.end(); }

console.log(`parsed=${raws.length} normalized=${rows.length} new=${inserted} updated=${rows.length - inserted}`);
