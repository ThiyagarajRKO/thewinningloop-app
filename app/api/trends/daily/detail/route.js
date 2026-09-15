// Row-level detail for one Trending Now item: its own interest-over-time
// sparkline, live. Separate from /api/trends (Magic AI's full flow) because
// this only needs the timeseries, not the market cross-reference the caller
// already has from the daily list response.

import { interestOverTime } from '../../../../../lib/trends-client.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const q = (p.get('q') || '').trim();
  const geo = (p.get('geo') || '').trim().toUpperCase();

  if (!q) return Response.json({ error: 'missing q' }, { status: 400 });

  try {
    const points = await interestOverTime([q], geo, 'now 7-d');
    return Response.json({ available: true, term: q, points });
  } catch (err) {
    return Response.json({ available: false, error: err.message });
  }
}
