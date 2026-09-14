import { pool } from '../../../lib/db.mjs';
export const dynamic = 'force-dynamic';

// Store Explorer + Magic AI saturation, both derived from ads we already hold.
// No new data source needed: landing_domain gives the store, advertiser count gives saturation.
export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const q = (p.get('q') || '').trim();
  const vals = [];
  let where = "landing_domain IS NOT NULL";
  if (q) { vals.push(`%${q}%`); where += ` AND landing_domain ILIKE $${vals.length}`; }

  const { rows } = await pool.query(
    `SELECT landing_domain AS domain,
            count(*)::int AS ads,
            count(DISTINCT advertiser_handle)::int AS advertisers,
            sum(ads_using_creative)::int AS creatives,
            max(ads_using_creative)::int AS top_creative,
            min(started_running) AS first_ad,
            max(started_running) AS latest_ad,
            array_agg(DISTINCT country) AS countries
     FROM ads WHERE ${where}
     GROUP BY landing_domain
     ORDER BY creatives DESC NULLS LAST
     LIMIT 100`, vals);

  return Response.json({ count: rows.length, stores: rows });
}
