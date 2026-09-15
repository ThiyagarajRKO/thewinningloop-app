// Google Trends — LIVE fetch, no MCP dependency.
//
// Earlier version only read pre-seeded rows from trend_snapshots because the
// google-trends MCP tool is only callable from a Claude session, not from this
// server. That's fixed now: lib/trends-client.mjs talks to trends.google.com's
// own internal API directly (the same one the MCP server itself calls under
// the hood — ported from its source), so a browser click triggers a real
// request every time, independent of any Claude session being open.
//
// trend_snapshots is now a CACHE, not the source of truth: written on every
// successful live fetch, read as a fallback if the live call fails (rate
// limited, endpoint down) so a transient Google-side failure doesn't wipe out
// data that was working a minute ago.

import { pool } from '../../../lib/db.mjs';
import { interestOverTime } from '../../../lib/trends-client.mjs';
import { marketContext, marketVerdict } from '../../../lib/market.mjs';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30m in-process, short because this is now live
const cache = new Map();

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const q = (p.get('q') || '').trim();
  const geo = (p.get('geo') || '').trim().toUpperCase();
  const timeframe = (p.get('timeframe') || 'today 3-m').trim();

  if (!q) return Response.json({ error: 'missing q' }, { status: 400 });

  const key = `${q}::${geo}::${timeframe}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return Response.json({ ...hit.data, source: 'memory-cache' });
  }

  try {
    const [points, market] = await Promise.all([
      interestOverTime([q], geo, timeframe),
      marketContext(q),
    ]);
    const avg = points.reduce((a, pt) => a + pt.value, 0) / points.length;
    const avgInterest = Math.round(avg * 10) / 10;

    const data = {
      available: true,
      term: q,
      geo: geo || 'worldwide',
      timeframe,
      avg_interest: avgInterest,
      points,
      fetched_at: new Date().toISOString(),
      source: 'live',
      market: { ...market, verdict: marketVerdict(avgInterest, market.advertisers) },
    };

    cache.set(key, { at: Date.now(), data });
    // best-effort persist; a write failure shouldn't fail the request the
    // user is actually waiting on
    pool.query(
      `INSERT INTO trend_snapshots (term, geo, points, avg_interest, fetched_at)
       VALUES ($1, $2, $3, $4, now())`,
      [q, geo || '', JSON.stringify(points), data.avg_interest]
    ).catch(() => {});

    return Response.json(data);
  } catch (err) {
    // live fetch failed (rate-limited, endpoint change, network) — fall back
    // to the most recent cached snapshot for this term rather than erroring
    const { rows } = await pool.query(
      `SELECT term, geo, points, avg_interest, fetched_at, (geo = $2) AS exact_geo
         FROM trend_snapshots WHERE term = $1
         ORDER BY exact_geo DESC, fetched_at DESC LIMIT 1`,
      [q, geo || '']);

    if (rows.length) {
      const row = rows[0];
      return Response.json({
        available: true,
        term: row.term, geo: row.geo || 'worldwide',
        avg_interest: row.avg_interest, points: row.points,
        fetched_at: row.fetched_at,
        source: 'cache-fallback',
        note: `Live fetch failed (${err.message}); showing the last successful snapshot instead.`,
      });
    }

    return Response.json({
      available: false,
      error: err.message,
      note: 'Live fetch to Google Trends failed and no cached snapshot exists for this term yet. Try again in a few minutes.',
    });
  }
}
