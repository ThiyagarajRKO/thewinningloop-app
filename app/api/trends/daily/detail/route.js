// Row-level detail for one Trending Now item: its own interest-over-time
// sparkline, live. Separate from /api/trends (Magic AI's full flow) because
// this only needs the timeseries, not the market cross-reference the caller
// already has from the daily list response.
//
// timeframe now accepts either a relative Trends string ("now 7-d", the
// default) or an explicit "YYYY-MM-DD YYYY-MM-DD" day-level range — that's
// the real format trends.google.com's own explore endpoint takes for a
// custom range (verified against the live endpoint, not assumed from docs).
// A `from`+`to` pair on the query string is converted into that string here
// so the client only ever deals with two <input type="date"> values.

import { interestOverTime } from '../../../../../lib/trends-client.mjs';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const q = (p.get('q') || '').trim();
  const geo = (p.get('geo') || '').trim().toUpperCase();
  const from = (p.get('from') || '').trim();
  const to = (p.get('to') || '').trim();

  if (!q) return Response.json({ error: 'missing q' }, { status: 400 });

  let timeframe = 'now 7-d';
  if (from || to) {
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      return Response.json({ error: 'from/to must both be YYYY-MM-DD' }, { status: 400 });
    }
    if (from > to) {
      return Response.json({ error: '"from" date must be before "to" date' }, { status: 400 });
    }
    timeframe = `${from} ${to}`;
  }

  try {
    const points = await interestOverTime([q], geo, timeframe);
    return Response.json({ available: true, term: q, timeframe, points });
  } catch (err) {
    return Response.json({ available: false, error: err.message });
  }
}
