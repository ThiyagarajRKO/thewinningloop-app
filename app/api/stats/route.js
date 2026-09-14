import { pool } from '../../../lib/db.mjs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const { rows:[s] } = await pool.query(`SELECT
     (SELECT count(*) FROM ads) AS ads,
     (SELECT count(*) FROM advertisers) AS advertisers,
     (SELECT count(DISTINCT landing_domain) FROM ads WHERE landing_domain IS NOT NULL) AS domains,
     (SELECT max(ran_at) FROM sweeps) AS last_sweep`);
  const { rows: top } = await pool.query(
    `SELECT landing_domain, count(*)::int AS ads, sum(ads_using_creative)::int AS creatives
     FROM ads WHERE landing_domain IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8`);
  return Response.json({ stats: s, topDomains: top });
}
