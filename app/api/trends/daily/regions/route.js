// Regional breakdown for one term, live. Powers the expanded/modal view of
// the trend detail panel — interestByRegion was ported from the MCP source
// earlier this session but never wired into any route until now (verified
// live: 51 US states returned for a real query before building this).

import { interestByRegion } from '../../../../../lib/trends-client.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const q = (p.get('q') || '').trim();
  const geo = (p.get('geo') || '').trim().toUpperCase();
  const timeframe = (p.get('timeframe') || 'today 3-m').trim();

  if (!q) return Response.json({ error: 'missing q' }, { status: 400 });

  try {
    const regions = await interestByRegion(q, geo, timeframe);
    return Response.json({ available: true, term: q, regions: regions.slice(0, 15) });
  } catch (err) {
    return Response.json({ available: false, error: err.message });
  }
}
