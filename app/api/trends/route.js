// Google Trends for a search phrase, so the user sees "is this rising or dying"
// next to their ad results — without leaving the search.
//
// Fetches ONCE PER SEARCH QUERY, never per-ad. Trends is rate-limited by Google;
// 355+ calls (one per ad) would get throttled almost immediately. One call per
// query the user actually typed is the sustainable shape — see decision log.
//
// This route has no scraper of its own: it calls the mcp__google-trends__* tools,
// which are already connected in this session. If those tools aren't available
// in whatever runs this route, this degrades to a clear "unavailable" response
// rather than failing silently.

import { pool } from '../../../lib/db.mjs';
export const dynamic = 'force-dynamic';

// simple in-process cache: Trends data for a given phrase doesn't change
// meaningfully within a few hours, and this avoids re-hitting Google on every
// page load for the same search.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const cache = new Map();

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const q = (p.get('q') || '').trim();
  const geo = (p.get('geo') || '').trim().toUpperCase();

  if (!q) return Response.json({ error: 'missing q' }, { status: 400 });

  const key = `${q}::${geo}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return Response.json({ ...hit.data, cached: true });
  }

  // Cache-only fallback: if the trends DB table has a recent row for this
  // query (written by the assistant session via the google-trends MCP tool —
  // this Next.js server has no direct MCP access, it only reads what was
  // captured), serve that instead of erroring.
  //
  // Prefer an exact geo match, but fall back to ANY geo for the same term
  // rather than reporting unavailable: a US search interest trend is still
  // useful context on a GB search, and the caller doesn't always know which
  // geo was fetched (the grid's search box has no geo field of its own).
  const { rows } = await pool.query(
    `SELECT term, geo, points, avg_interest, fetched_at,
            (geo = $2) AS exact_geo
       FROM trend_snapshots
      WHERE term = $1
      ORDER BY exact_geo DESC, fetched_at DESC LIMIT 1`,
    [q, geo || '']);

  if (!rows.length) {
    return Response.json({
      available: false,
      note: 'No trend snapshot yet for this query. Trends are fetched by the assistant session (via the google-trends MCP tool) and written to trend_snapshots — ask for this query to be checked.',
    });
  }

  const row = rows[0];
  const data = {
    available: true,
    term: row.term,
    geo: row.geo || 'worldwide',
    avg_interest: row.avg_interest,
    points: row.points,
    fetched_at: row.fetched_at,
  };
  cache.set(key, { at: Date.now(), data });
  return Response.json(data);
}

// Write a trend snapshot. Called after fetching real data from the
// mcp__google-trends__* tool (which only the assistant/agent session can call —
// this Next.js server has no direct access to that MCP connection).
export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body?.term || !Array.isArray(body?.points)) {
    return Response.json({ error: 'expected { term, geo, points, avg_interest }' }, { status: 400 });
  }
  const { term, geo = '', points, avg_interest = null } = body;
  await pool.query(
    `INSERT INTO trend_snapshots (term, geo, points, avg_interest, fetched_at)
     VALUES ($1, $2, $3, $4, now())`,
    [term, geo, JSON.stringify(points), avg_interest]);
  return Response.json({ ok: true });
}
