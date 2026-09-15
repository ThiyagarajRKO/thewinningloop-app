// Poll one brand profile's status/data, or delete a tracked brand.
import { pool } from '../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { domain } = await params;
  const { rows } = await pool.query(
    `SELECT domain, store_name, theme_name, product_count, products, pixels,
            contact_email, fb_page_id, fb_active_ads, status, error, fetched_at, created_at
       FROM brand_profiles WHERE domain = $1`, [domain]);
  if (!rows.length) return Response.json({ error: 'not found' }, { status: 404 });

  // Real Meta ads for this store's "Meta ads" tab — every ad already indexed
  // whose landing_domain matches, across all advertiser handles (a domain can
  // run through several Page identities; see brand-worker.mjs's fetchMetaAds).
  const { rows: metaAds } = await pool.query(
    `SELECT library_id, headline, creative_image, creative_video_poster, media_type,
            ads_using_creative, started_running, status, advertiser_name
       FROM ads WHERE landing_domain = $1
       ORDER BY status = 'Active' DESC, ads_using_creative DESC NULLS LAST LIMIT 60`, [domain]);

  return Response.json({ ...rows[0], metaAds });
}

export async function DELETE(_req, { params }) {
  const { domain } = await params;
  await pool.query(`DELETE FROM brand_profiles WHERE domain = $1`, [domain]);
  return Response.json({ ok: true });
}
