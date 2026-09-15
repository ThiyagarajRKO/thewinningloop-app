import { pool } from '../../../../lib/db.mjs';
export const dynamic = 'force-dynamic';

// Single-ad detail. Everything here comes from the grid sweep — Facebook's own
// ?id=<library_id> detail page returns "No ads match your search criteria" to a
// headless browser, so a second fetch buys nothing. The card markup in the search
// grid already carries the full record.
export async function GET(_req, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id || '')) {
    return Response.json({ error: 'invalid library_id' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT library_id, ad_details_url, advertiser_handle, advertiser_name,
            started_running, ads_using_creative, cta, body, link_text,
            landing_url, landing_domain, display_domain, headline, link_description,
            creative_image, creative_video, creative_video_poster, media_type,
            all_images, platforms, status, video_duration_sec, eu_transparency,
            country, search_query, first_seen, last_seen
       FROM ads WHERE library_id = $1`, [id]);

  if (!rows.length) return Response.json({ error: 'not found' }, { status: 404 });
  const ad = rows[0];

  // sibling ads from the same advertiser — the "what else are they running" view.
  // Carries the real creative_video/all_images (not just the poster) so the
  // attachments section can actually play/show and download each one, not
  // just link back to the sibling's own detail page.
  const { rows: siblings } = await pool.query(
    `SELECT library_id, headline, creative_image, creative_video,
            creative_video_poster, all_images, media_type,
            ads_using_creative, started_running
       FROM ads
      WHERE advertiser_handle = $1 AND library_id <> $2
      ORDER BY ads_using_creative DESC NULLS LAST
      LIMIT 12`,
    [ad.advertiser_handle, id]);

  // same-domain competitors, for market context
  const { rows: sameDomain } = await pool.query(
    `SELECT count(*)::int AS ads,
            count(DISTINCT advertiser_handle)::int AS advertisers,
            sum(ads_using_creative)::int AS creatives
       FROM ads WHERE landing_domain = $1`, [ad.landing_domain]);

  return Response.json({ ad, siblings, domainStats: sameDomain[0] || null });
}
