// Google Trends client, ported from the google-trends MCP server
// (C:\Users\thiya\mcp-servers\google-trends-mcp\src\trends-client.ts).
//
// Calls trends.google.com's own unofficial internal API directly — the same
// endpoints trends.google.com itself uses. No API key, no MCP dependency:
// this runs as a plain fetch() from this Next.js server, so a click in the
// browser triggers a real live request, not a lookup against a pre-seeded row.
//
// These are undocumented endpoints. Google may change or block them without
// notice — that risk is inherent to every "Google Trends API" wrapper that
// exists, including the one the official npm packages use.

const BASE = 'https://trends.google.com/trends/api';

function stripPrefix(raw) {
  return raw.replace(/^\)\]\}',?\n?/, '');
}

function baseHeaders(sessionCookie) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://trends.google.com/',
  };
  if (sessionCookie) headers['Cookie'] = sessionCookie;
  return headers;
}

// Google 429s a cookie-less request but hands back a Set-Cookie on that same
// 429 — capture it and retry once. Cached per-process (module-level), same
// as the MCP version, so only the first request per server start pays this.
let sessionCookie = null;

async function fetchTrends(url, label) {
  let res = await fetch(url, { headers: baseHeaders(sessionCookie) });

  if (res.status === 429) {
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
      res = await fetch(url, { headers: baseHeaders(sessionCookie) });
    }
  }
  if (res.status === 429) {
    throw new Error('Google Trends rate-limited this request (HTTP 429). Wait a few minutes and try again.');
  }
  if (res.status === 400) {
    throw new Error(`Google Trends rejected the ${label} request (HTTP 400) — check the geo/timeframe.`);
  }
  if (!res.ok) {
    throw new Error(`Google Trends ${label} request failed with status ${res.status}.`);
  }
  return res.text();
}

function compItem(keyword, geo, timeframe) {
  return { keyword, geo, time: timeframe };
}

export function findWidget(widgets, kind) {
  return widgets.find(w => w.id === kind || w.type === kind);
}

export async function explore(terms, geo, timeframe, opts = {}) {
  const hl = opts.hl ?? 'en-US';
  const tz = opts.tz ?? 360;
  const req = JSON.stringify({
    comparisonItem: terms.map(t => compItem(t, geo, timeframe)),
    category: 0,
    property: '',
  });
  const url = new URL(`${BASE}/explore`);
  url.searchParams.set('hl', hl);
  url.searchParams.set('tz', String(tz));
  url.searchParams.set('req', req);
  const raw = await fetchTrends(url.toString(), 'explore');
  return JSON.parse(stripPrefix(raw));
}

export async function multiline(token, request, opts = {}) {
  const hl = opts.hl ?? 'en-US';
  const tz = opts.tz ?? 360;
  const url = new URL(`${BASE}/widgetdata/multiline`);
  url.searchParams.set('hl', hl);
  url.searchParams.set('tz', String(tz));
  url.searchParams.set('token', token);
  url.searchParams.set('req', JSON.stringify(request));
  const raw = await fetchTrends(url.toString(), 'multiline');
  return JSON.parse(stripPrefix(raw));
}

// High-level helper matching the MCP tool's interest_over_time behaviour:
// explore -> find TIMESERIES widget -> multiline -> flat point array.
export async function interestOverTime(terms, geo = '', timeframe = 'today 3-m') {
  const exploreData = await explore(terms, geo, timeframe);
  const widget = findWidget(exploreData.widgets, 'TIMESERIES');
  if (!widget) throw new Error('No TIMESERIES widget in Trends explore response.');

  const data = await multiline(widget.token, widget.request);
  const rows = data.default.timelineData;
  if (!rows.length) throw new Error('Google Trends returned no data for this term/timeframe.');

  // multiline returns one value PER TERM in value[]; we only ever pass one
  // term from the UI, so value[0] is that term's score for this point.
  return rows.map(r => ({ date: r.formattedTime, value: r.value[0] ?? 0 }));
}
