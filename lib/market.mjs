// Shared "how many advertisers are already running this term" cross-check
// against the ads table. Previously duplicated between /api/trends and
// /api/trends/daily with two slightly different queries — factored out so
// /api/trends/related can reuse it too instead of a third copy.

import { pool } from './db.mjs';

// Single term -> { ads, advertisers, creatives }. Used by /api/trends for the
// demand-vs-supply verdict on the searched term itself.
export async function marketContext(term) {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS ads,
            count(DISTINCT advertiser_handle)::int AS advertisers,
            sum(ads_using_creative)::int AS creatives
       FROM ads
      WHERE to_tsvector('english',
              coalesce(body,'') || ' ' || coalesce(advertiser_name,'') || ' ' ||
              coalesce(headline,'') || ' ' || coalesce(link_description,'')
            ) @@ plainto_tsquery('english', $1)`,
    [term]);
  const r = rows[0] || { ads: 0, advertisers: 0, creatives: 0 };
  return { ads: r.ads, advertisers: r.advertisers, creatives: r.creatives || 0 };
}

// Many terms -> Map<term, advertiserCount>, one query instead of N. Used by
// /api/trends/daily and /api/trends/related, both of which list many terms
// at once (trending topics, or related-query results) and would otherwise
// fire one query per row.
//
// unnest() can't be referenced by name in a correlated subquery directly —
// alias it through a CTE first so the subquery has a real column to
// correlate on (this bit Postgres rejected the naive version outright).
export async function advertiserCountsByTerm(terms) {
  if (!terms.length) return new Map();
  const { rows } = await pool.query(
    `WITH terms(term) AS (SELECT unnest($1::text[]))
     SELECT t.term,
            (SELECT count(DISTINCT advertiser_handle) FROM ads
              WHERE to_tsvector('english', coalesce(body,'') || ' ' || coalesce(headline,''))
                    @@ plainto_tsquery('english', t.term)) AS advertisers
       FROM terms t`,
    [terms]).catch(() => ({ rows: [] }));
  return new Map(rows.map(r => [r.term, r.advertisers]));
}

// Buckets, not a fake precise score — Trends search volume and "advertisers
// we've happened to index" aren't measuring the same thing, so a single
// decimal number would imply more precision than the data supports. A 2x2
// read (demand x competition) is honest about that.
export function marketVerdict(avgInterest, advertisers) {
  const highDemand = avgInterest >= 40;
  const lowCompetition = advertisers <= 2;
  if (highDemand && lowCompetition) return { label: 'Opportunity', detail: 'Real search demand, few advertisers indexed yet.' };
  if (highDemand && !lowCompetition) return { label: 'Saturated', detail: 'Real demand, but many advertisers already competing for it.' };
  if (!highDemand && lowCompetition) return { label: 'Untested', detail: 'Low search interest and little competition — likely a niche, not a gap.' };
  return { label: 'Low priority', detail: 'Weak search interest despite advertisers already running it.' };
}
