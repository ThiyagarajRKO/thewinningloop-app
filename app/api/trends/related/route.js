// Related + rising search queries for a term, live from Google Trends.
//
// Serves two features from one call:
//   - Magic AI / ad detail: "people also search for" — adjacent product
//     discovery using real search data, not a guess.
//   - Sweep-priority queue: cross-checked against `sweeps` so the UI can rank
//     related terms that have NOT been scraped yet by their own Trends score,
//     turning "nothing here" into "here's what to scrape next."

import { pool } from '../../../../lib/db.mjs';
import { relatedQueries, interestOverTime } from '../../../../lib/trends-client.mjs';
import { advertiserCountsByTerm } from '../../../../lib/market.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const q = (p.get('q') || '').trim();
  const geo = (p.get('geo') || '').trim().toUpperCase();
  const timeframe = (p.get('timeframe') || 'today 3-m').trim();
  // ranking the queue costs one Trends call per candidate term, so it's
  // opt-in and capped — this is not free, Google will rate-limit past a
  // handful of calls per request
  const rankQueue = p.get('rankQueue') === '1';

  if (!q) return Response.json({ error: 'missing q' }, { status: 400 });

  let related;
  try {
    related = await relatedQueries(q, geo, timeframe);
  } catch (err) {
    return Response.json({ available: false, error: err.message });
  }

  const { rows: sweptRows } = await pool.query(
    `SELECT DISTINCT lower(query) AS q FROM sweeps WHERE query IS NOT NULL`);
  const swept = new Set(sweptRows.map(r => r.q));

  // same shared cross-check the daily-trends table uses, so the unified
  // table on the frontend gets an "advertisers" number for every row
  // regardless of whether it came from trending-now or a search
  const allTerms = [...related.top, ...related.rising].map(x => x.query);
  const advertiserCounts = await advertiserCountsByTerm(allTerms);

  const withStatus = list => list.map(item => ({
    ...item,
    swept: swept.has(item.query.toLowerCase()),
    advertisers: advertiserCounts.get(item.query) ?? null,
  }));

  const top = withStatus(related.top);
  const rising = withStatus(related.rising);

  let queue = null;
  if (rankQueue) {
    // candidates = unswept terms from top+rising, deduped, capped at 6 —
    // each needs its own live Trends call, so this is the expensive path
    const seen = new Set();
    const candidates = [...top, ...rising]
      .filter(x => !x.swept && !seen.has(x.query.toLowerCase()) && seen.add(x.query.toLowerCase()))
      .slice(0, 6);

    queue = await Promise.all(candidates.map(async c => {
      try {
        const points = await interestOverTime([c.query], geo, timeframe);
        const avg = points.reduce((a, pt) => a + pt.value, 0) / points.length;
        return { query: c.query, avg_interest: Math.round(avg * 10) / 10, relatedValue: c.value };
      } catch {
        return { query: c.query, avg_interest: null, relatedValue: c.value };
      }
    }));
    queue.sort((a, b) => (b.avg_interest ?? -1) - (a.avg_interest ?? -1));
  }

  return Response.json({ available: true, term: q, top, rising, queue });
}
