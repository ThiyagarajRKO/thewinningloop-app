import { pool } from '../../../lib/db.mjs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const where = [], vals = [];
  const add = (sql, v) => { vals.push(v); where.push(sql.replace('$?', `$${vals.length}`)); };

  const q = (p.get('q') || '').trim();
  // "search everywhere": body, advertiser, headline, link description, and the
  // domain shown on the ad card. This used to only hit body+advertiser, which
  // meant a keyword that only appeared in an ad's headline (e.g. "50% Off") or
  // its landing domain (e.g. "corecareshop") silently returned nothing.
  if (q) add(`to_tsvector('english',
      coalesce(body,'') || ' ' || coalesce(advertiser_name,'') || ' ' ||
      coalesce(headline,'') || ' ' || coalesce(link_description,'') || ' ' ||
      coalesce(landing_domain,'') || ' ' || coalesce(display_domain,'')
    ) @@ plainto_tsquery('english', $?)`, q);
  const domain = (p.get('domain') || '').trim();
  if (domain) add(`landing_domain ILIKE $?`, `%${domain}%`);
  const minCreatives = parseInt(p.get('minCreatives') || '', 10);
  if (Number.isInteger(minCreatives)) add(`ads_using_creative >= $?`, minCreatives);
  const media = (p.get('media') || '').trim();
  if (media === 'video') where.push(`creative_video IS NOT NULL`);
  else if (media === 'image') where.push(`creative_video IS NULL`);
  const since = (p.get('since') || '').trim();
  if (since) add(`started_running >= $?`, since);

  const sortMap = {
    creatives: 'ads_using_creative DESC',
    newest: 'started_running DESC NULLS LAST',
    oldest: 'started_running ASC NULLS LAST',
  };
  const order = sortMap[p.get('sort')] || sortMap.creatives;
  const limit = Math.min(parseInt(p.get('limit') || '60', 10) || 60, 200);

  const sql = `SELECT library_id, ad_details_url, advertiser_name, advertiser_handle,
      started_running, ads_using_creative, cta, creative_image, body, link_text,
      landing_url, landing_domain, creative_video, creative_video_poster, media_type,
      headline, display_domain
    FROM ads ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${order} LIMIT ${limit}`;
  const { rows } = await pool.query(sql, vals);
  return Response.json({ count: rows.length, ads: rows });
}
