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

// ---------------------------------------------------------------------------
// The rest below were unused until now — ported from the same MCP source but
// never wired into the app. All three run through the same explore() token
// exchange as interestOverTime; only the widget kind and the widgetdata
// endpoint differ.
// ---------------------------------------------------------------------------

export async function relatedSearchesRaw(token, request, opts = {}) {
  const hl = opts.hl ?? 'en-US';
  const tz = opts.tz ?? 360;
  const url = new URL(`${BASE}/widgetdata/relatedsearches`);
  url.searchParams.set('hl', hl);
  url.searchParams.set('tz', String(tz));
  url.searchParams.set('token', token);
  url.searchParams.set('req', JSON.stringify(request));
  const raw = await fetchTrends(url.toString(), 'relatedsearches');
  return JSON.parse(stripPrefix(raw));
}

export async function comparedGeo(token, request, opts = {}) {
  const hl = opts.hl ?? 'en-US';
  const tz = opts.tz ?? 360;
  const url = new URL(`${BASE}/widgetdata/comparedgeo`);
  url.searchParams.set('hl', hl);
  url.searchParams.set('tz', String(tz));
  url.searchParams.set('token', token);
  url.searchParams.set('req', JSON.stringify(request));
  const raw = await fetchTrends(url.toString(), 'comparedgeo');
  return JSON.parse(stripPrefix(raw));
}

function decodeXmlEntities(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function tagText(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m?.[1] ? decodeXmlEntities(m[1].trim()) : '';
}

// Today's trending searches for a country. Google removed the old JSON
// dailytrends endpoint (now 404s); this reads the RSS feed that backs
// trends.google.com/trending instead, same as the MCP's fallback.
export async function dailyTrends(geo, opts = {}) {
  const hl = opts.hl ?? 'en-US';
  const url = new URL('https://trends.google.com/trending/rss');
  url.searchParams.set('geo', geo.toUpperCase());
  url.searchParams.set('hl', hl);

  const res = await fetch(url.toString(), { headers: baseHeaders(sessionCookie) });
  if (res.status === 429) throw new Error('Google Trends rate-limited this request (HTTP 429).');
  if (res.status === 400 || res.status === 404) {
    throw new Error(`Google Trends does not recognize the geo code "${geo}".`);
  }
  if (!res.ok) throw new Error(`Trending RSS request failed with status ${res.status}.`);

  const xml = await res.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const trending = items.map(item => {
    const query = tagText(item, 'title');
    const traffic = tagText(item, 'ht:approx_traffic');
    const newsBlocks = item.match(/<ht:news_item>[\s\S]*?<\/ht:news_item>/g) ?? [];
    const articles = newsBlocks.map(nb => ({
      title: tagText(nb, 'ht:news_item_title'),
      url: tagText(nb, 'ht:news_item_url'),
      source: tagText(nb, 'ht:news_item_source'),
    }));
    return { query, formattedTraffic: traffic, articles };
  });
  return trending;
}

// High-level: top + rising related queries for one term.
export async function relatedQueries(term, geo = '', timeframe = 'today 12-m') {
  const exploreData = await explore([term], geo, timeframe);
  const widget = findWidget(exploreData.widgets, 'RELATED_QUERIES');
  if (!widget) throw new Error('No RELATED_QUERIES widget in Trends explore response.');

  const data = await relatedSearchesRaw(widget.token, widget.request);
  const rankedList = data.default.rankedList;
  const top = (rankedList[0]?.rankedKeyword ?? []).map(k => ({ query: k.query, value: k.value }));
  const rising = (rankedList[1]?.rankedKeyword ?? []).map(k => ({ query: k.query, value: k.value }));
  return { top, rising };
}

// High-level: interest by region for one term.
export async function interestByRegion(term, geo = '', timeframe = 'today 12-m') {
  const exploreData = await explore([term], geo, timeframe);
  const widget = findWidget(exploreData.widgets, 'GEO_MAP');
  if (!widget) throw new Error('No GEO_MAP widget in Trends explore response.');

  const data = await comparedGeo(widget.token, widget.request);
  return (data.default.geoMapData || [])
    .map(r => ({ region: r.geoName, code: r.geoCode, value: r.value[0] ?? 0 }))
    .sort((a, b) => b.value - a.value);
}
