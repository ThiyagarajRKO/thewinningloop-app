// Build a Facebook Ad Library URL for the MCP's scrape_ad_library_url tool.
// The keyword tool (search_ad_library) returns 403 with zero cards; the URL tool works.
const BASE = 'https://www.facebook.com/ads/library/';

export function buildUrl({ query, country = 'US', activeStatus = 'active', mediaType = 'all', adType = 'all', pageId = '' }) {
  const p = new URLSearchParams({ active_status: activeStatus, ad_type: adType, country, media_type: mediaType });
  if (pageId) {
    p.set('view_all_page_id', pageId);
    p.set('search_type', 'page');
    if (query) p.set('q', query);
  } else {
    p.set('search_type', 'keyword_unordered');
    p.set('q', query);
  }
  p.set('locale', 'en_US');   // force English; page defaulted to Tamil without this
  return BASE + '?' + p.toString();
}

// CLI entry: node scripts/sweep-url.mjs "<query>" [COUNTRY]
if (process.argv[1] && process.argv[1].endsWith('sweep-url.mjs')) {
  const [q, country = 'US'] = process.argv.slice(2);
  if (!q) {
    console.error('usage: node scripts/sweep-url.mjs "<query>" [COUNTRY]');
    process.exit(1);
  }
  console.log(buildUrl({ query: q, country }));
}
