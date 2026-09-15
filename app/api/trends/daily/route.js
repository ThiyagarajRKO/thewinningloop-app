// Daily trending searches for a country, live from Google Trends.
//
// Honest framing: this is Google's GENERAL trending-searches feed (news,
// sports, culture — confirmed by testing: results skewed toward news
// headlines, not products). It is NOT a "trending products" feed and this
// route does not pretend otherwise. What it's actually useful for: cross-
// checking each trending term against the ad index, so a term that's both
// genuinely trending AND has zero advertisers yet is a real, rare signal —
// everything else here is just today's news.

import { dailyTrends } from '../../../../lib/trends-client.mjs';
import { advertiserCountsByTerm } from '../../../../lib/market.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const geo = (p.get('geo') || 'US').trim().toUpperCase();

  let trending;
  try {
    trending = await dailyTrends(geo);
  } catch (err) {
    return Response.json({ available: false, error: err.message });
  }

  if (!trending.length) return Response.json({ available: true, geo, items: [] });

  const byTerm = await advertiserCountsByTerm(trending.map(t => t.query));

  // full article list (Google returns 3 per topic) — a single headline was
  // throwing away real context a row-level detail view actually wants
  const items = trending.map(t => ({
    query: t.query,
    traffic: t.formattedTraffic,
    articles: t.articles,
    advertisers: byTerm.get(t.query) ?? null,
  }));

  return Response.json({ available: true, geo, items });
}
