'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import './globals.css';
import { Icon, BrandMark } from './icons';

/* Nav mirrors AdVault's feature set. `live` = real data behind it today.
   Locked features render an honest not-connected state naming exactly what each needs —
   never a fake table of invented numbers. */
const NAV = [
  { group: 'Ad intelligence', items: [
    { id: 'fb',        label: 'Facebook Adlibrary', icon: 'megaphone', live: true },
    { id: 'tiktok',    label: 'TikTok Adspy',       icon: 'music',
      need: 'Blocked on both routes. The API is research-only (academic/non-profit, EU data only; commercial users explicitly ineligible). And library.tiktok.com/robots.txt disallows /ads, /api and /other-commercial-content by name, plus a blanket Disallow: / — so a scraper is not a legitimate workaround. Licensed resellers (Apify and similar) are the remaining option.' },
    { id: 'pinterest', label: 'Pinterest Adspy',    icon: 'image',
      need: 'No public ads API, and pinterest.com/robots.txt runs an explicit bot allowlist — unlisted crawlers are disallowed by default, with a submission form for approval. Scraping without being allowlisted is not a legitimate path. Options: apply to their bot allowlist, or use a licensed data reseller.' },
    { id: 'fbpost',    label: 'Facebook Post Adspy', icon: 'message',
      need: 'Tested the Ad Library page-scoped view (view_all_page_id) through the existing scraper: HTTP 403, zero cards parsed, page rendered in the wrong locale. The MCP notes this view often fails to hydrate headless. Organic posts are a different surface again and need Graph API page access, which requires owning or being granted access to the Page.' },
  ]},
  { group: 'Product research', items: [
    { id: 'stores',   label: 'Store Explorer',   icon: 'store',    live: true },
    { id: 'magic',    label: 'Magic AI',         icon: 'sparkles', live: true },
    { id: 'gtrends',  label: 'Google Trends',    icon: 'trending', live: true },
    { id: 'tracker',  label: 'Store Tracker',    icon: 'chart',
      need: 'Needs repeat polling of each store over time. Public /products.json works on some stores (corecareshop.com returns 200) but not all (niraloom.com returns 503), so the worker needs per-store fallbacks and a scheduler.' },
    { id: 'reverse',  label: 'AI Reverse Ad Search', icon: 'search',
      need: 'pgvector 0.8.6 is already available on this Postgres. What is missing is an embedding model to vectorise the 228 stored creatives, plus a vector column and index. This is the closest blocked feature to done.' },
  ]},
  { group: 'Output', items: [
    { id: 'import',  label: 'Product Importing', icon: 'package',
      need: 'Writes a chosen product into trackify-com.myshopify.com as a draft. SHOPIFY_ADMIN_CLIENT_ID and secret are set, but SHOPIFY_STOREFRONT_API_TOKEN is empty and no Admin API access token has been exchanged yet.' },
    { id: 'boards',  label: 'Saved Boards', icon: 'bookmark', live: true },
  ]},
];
const ALL = NAV.flatMap(g => g.items);

const fmt = n => new Intl.NumberFormat('en-US').format(n ?? 0);
const fmtDate = d => d ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(d)) : '';

export default function App() {
  const [view, setView] = useState('magic');
  const current = ALL.find(i => i.id === view);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <BrandMark />
          <span className="brand-name">Ad<em>Vault</em></span>
        </div>
        <nav className="nav" aria-label="Features">
          {NAV.map(g => (
            <div key={g.group}>
              <div className="nav-label">{g.group}</div>
              {g.items.map(it => {
                const I = Icon[it.icon];
                return (
                  <button key={it.id} className={'nav-item' + (it.live ? '' : ' locked')}
                    aria-current={view === it.id ? 'page' : undefined}
                    onClick={() => setView(it.id)}>
                    <I /><span>{it.label}</span>
                    <span className="dot" title={it.live ? 'Connected' : 'Not connected'} />
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="crumb">{current?.live ? 'Connected' : 'Not connected'} / <b>{current?.label}</b></span>
          <div className="topbar-right"><SweepMeta /><ThemeToggle /></div>
        </header>
        <main className="content">
          {view === 'fb' && <AdLibrary />}
          {view === 'stores' && <Stores mode="explorer" />}
          {view === 'magic' && <MagicAI onOpenLibrary={() => setView('fb')} />}
          {view === 'gtrends' && <TrendsPage />}
          {view === 'boards' && <Boards />}
          {!current?.live && <NotConnected item={current} />}
        </main>
      </div>
    </div>
  );
}

function SweepMeta() {
  const [s, setS] = useState(null);
  useEffect(() => { fetch('/api/stats').then(r => r.json()).then(setS).catch(() => {}); }, []);
  if (!s?.stats) return null;
  return <span className="sweep-meta">{fmt(s.stats.ads)} ads · {fmt(s.stats.domains)} stores</span>;
}

/* Google Trends for the current search phrase — one LIVE fetch per query
   (lib/trends-client.mjs calls trends.google.com directly, no MCP, no Claude
   session required), cached 30m server-side so re-rendering doesn't refetch. */
function TrendsCard({ term }) {
  const [data, setData] = useState(null);
  const q = term.trim();

  useEffect(() => {
    if (!q) { setData(null); return; }
    let live = true;
    fetch(`/api/trends?q=${encodeURIComponent(q)}`)
      .then(r => r.json()).then(d => { if (live) setData(d); }).catch(() => setData(null));
    return () => { live = false; };
  }, [q]);

  if (!q || !data) return null;

  if (!data.available) {
    return (
      <div className="trends-card trends-empty">
        <Icon.trending size={16} />
        <span>No Google Trends snapshot for &quot;{q}&quot; yet.</span>
      </div>
    );
  }

  const pts = data.points || [];
  const max = Math.max(1, ...pts.map(p => p.value));
  const first = pts[0]?.value ?? 0, last = pts[pts.length - 1]?.value ?? 0;
  const delta = first > 0 ? Math.round(((last - first) / first) * 100) : 0;

  return (
    <div className="trends-card">
      <div className="trends-head">
        <Icon.trending size={16} />
        <span className="trends-title">Google Trends · &quot;{data.term}&quot;{data.geo ? ` · ${data.geo}` : ''}</span>
        <span className={'trends-delta ' + (delta >= 0 ? 'up' : 'down')}>
          {delta >= 0 ? '+' : ''}{delta}% over period
        </span>
      </div>
      <div className="trends-spark" aria-hidden="true">
        {pts.map((p, i) => (
          <i key={i} style={{ height: `${Math.max(4, (p.value / max) * 100)}%` }} title={`${p.date}: ${p.value}`} />
        ))}
      </div>
      <div className="trends-foot">
        <span>avg interest {data.avg_interest}</span>
        <span className="mono-dim">as of {new Date(data.fetched_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

/* ---------- Magic AI: one keyword in, ads + demand out ---------- */
function MagicAI({ onOpenLibrary }) {
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [ads, setAds] = useState(null);
  const [swept, setSwept] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/sweeps').then(r => r.json()).then(d => setSwept(d.sweeps || [])).catch(() => {});
  }, []);

  const load = async term => {
    setLoading(true);
    setSubmitted(term);
    const adsRes = await fetch(`/api/ads?q=${encodeURIComponent(term)}&sort=creatives&limit=60`)
      .then(r => r.json()).catch(() => ({ ads: [] }));
    setAds(adsRes.ads || []);
    setLoading(false);
  };

  const onSubmit = e => { e.preventDefault(); if (q.trim()) load(q.trim()); };

  // is this exact term one of the keywords we've actually swept? (case-insensitive)
  const isSwept = submitted && swept.some(s => s.toLowerCase() === submitted.toLowerCase());
  const hot = (ads || []).filter(a => a.ads_using_creative >= 5).length;
  const domains = new Set((ads || []).map(a => a.landing_domain).filter(Boolean));

  return (
    <>
      <div className="research-intro">
        <h1>Magic AI</h1>
        <p>Type a product idea. See who is running ads for it and how the market is trending.</p>
      </div>

      <form className="filters research-form" onSubmit={onSubmit} role="search">
        <div className="field" style={{ flex: 1, minWidth: 260 }}>
          <Icon.search />
          <label htmlFor="rq" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search keyword</label>
          <input id="rq" placeholder="e.g. posture corrector, led face mask…" value={q}
                 onChange={e => setQ(e.target.value)} style={{ width: '100%' }} autoFocus />
        </div>
        <button className="btn" type="submit" disabled={loading || !q.trim()}>
          {loading ? 'Searching…' : 'Research'}
        </button>
      </form>

      {!submitted && (
        <div className="empty">
          <EmptyGlyph />
          <h2>Search a product idea</h2>
          <p>Checks the ads already indexed for that keyword and shows Google Trends alongside them.</p>
          {swept.length === 0 && (
            <div className="empty-need">
              <b>Try one of these — already indexed</b>
              <code>posture corrector · led face mask</code>
            </div>
          )}
        </div>
      )}

      {submitted && (
        <>
          <TrendsCard term={submitted} />

          {loading ? (
            <SkeletonGrid />
          ) : ads && ads.length > 0 ? (
            <>
              <div className="kpis">
                <Kpi label="Ads found" value={ads.length} />
                <Kpi label="Advertisers" value={new Set(ads.map(a => a.advertiser_handle)).size} />
                <Kpi label="Stores" value={domains.size} />
                <Kpi label="Scaling now" value={hot} hint="5+ creatives" />
              </div>
              <div className="grid">{ads.map((a, i) => <AdCard key={a.library_id} ad={a} i={i} />)}</div>
              <button className="btn btn-ghost" style={{ marginTop: 'var(--s4)' }} onClick={onOpenLibrary}>
                Open full Ad Library for more filters
              </button>
            </>
          ) : (
            <div className="empty">
              <EmptyGlyph />
              <h2>No ads indexed for &quot;{submitted}&quot;</h2>
              {isSwept ? (
                <p>This keyword was swept but returned nothing — the term may be too narrow, or the sweep found no active ads that day.</p>
              ) : (
                <>
                  <p>This keyword hasn&apos;t been swept from the Facebook Ad Library yet. Trends above still show demand even with no ads indexed.</p>
                  <div className="empty-need">
                    <b>Run a sweep for this keyword</b>
                    <code>node scripts/scrape-fb.mjs &quot;{submitted}&quot; US 8 22</code>
                    <code>node scripts/ingest.mjs payloads/&lt;output&gt;.json &quot;{submitted}&quot; US</code>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ---------- Facebook Ad Library ---------- */
function AdLibrary() {
  const [ads, setAds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ q: '', domain: '', minCreatives: '', media: '', sort: 'creatives' });

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== ''));
    const r = await fetch('/api/ads?' + p).then(r => r.json()).catch(() => ({ ads: [] }));
    setAds(r.ads || []); setLoading(false);
  }, [f]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {}); }, []);

  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }));
  const onSubmit = e => { e.preventDefault(); load(); };
  const top = stats?.topDomains || [];
  const hot = ads.filter(a => a.ads_using_creative >= 5).length;

  return (
    <>
      <div className="kpis">
        <Kpi label="Ads indexed" value={stats?.stats?.ads} spark={top.map(d => d.ads)} />
        <Kpi label="Advertisers" value={stats?.stats?.advertisers} />
        <Kpi label="Stores" value={stats?.stats?.domains} />
        <Kpi label="Scaling now" value={hot} hint="5+ creatives" />
      </div>

      {/* One Trends fetch per SEARCH, not per ad — Google throttles hard past that. */}
      <TrendsCard term={f.q} />

      <form className="filters" onSubmit={onSubmit} role="search">
        <div className="field">
          <Icon.search />
          <label htmlFor="q" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search ad copy or advertiser</label>
          <input id="q" placeholder="Search copy or advertiser…" value={f.q} onChange={set('q')} style={{ minWidth: 230 }} />
        </div>
        <label htmlFor="dom" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Filter by domain</label>
        <input id="dom" placeholder="Domain…" value={f.domain} onChange={set('domain')} style={{ width: 150 }} />
        <label htmlFor="minc" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Minimum creatives</label>
        <input id="minc" type="number" min="1" placeholder="Min creatives" value={f.minCreatives} onChange={set('minCreatives')} style={{ width: 128 }} />
        <label htmlFor="sort" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Sort order</label>
        <label htmlFor="media" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Media type</label>
        <select id="media" value={f.media} onChange={set('media')}>
          <option value="">All media</option>
          <option value="video">Video only</option>
          <option value="image">Image only</option>
        </select>
        <label htmlFor="sort" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Sort order</label>
        <select id="sort" value={f.sort} onChange={set('sort')}>
          <option value="creatives">Most creatives</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Loading…' : 'Apply'}</button>
        <span className="count">{loading ? '—' : `${ads.length} shown`}</span>
      </form>

      {loading ? <SkeletonGrid /> : ads.length === 0 ? <NoMatch /> : (
        <div className="grid">{ads.map((a, i) => <AdCard key={a.library_id} ad={a} i={i} />)}</div>
      )}
    </>
  );
}

function Kpi({ label, value, spark, hint }) {
  const max = spark?.length ? Math.max(...spark) : 0;
  return (
    <div className="kpi">
      <span className="kpi-v">{value == null ? '—' : fmt(value)}</span>
      <span className="kpi-k">{label}{hint ? ` · ${hint}` : ''}</span>
      {spark?.length > 0 && (
        <div className="kpi-spark" aria-hidden="true">
          {spark.slice(0, 8).map((v, i) => <i key={i} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />)}
        </div>
      )}
    </div>
  );
}

/* Staggered entrance on data-load (App-shell motion track), transform/opacity only. */
function AdCard({ ad, i }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const t = setTimeout(() => el.classList.add('in'), Math.min(i, 12) * 28);
    return () => clearTimeout(t);
  }, [i]);

  const scale = ad.ads_using_creative || 1;
  const bars = Math.min(5, Math.max(1, Math.round(scale / 5)));
  return (
    <article className="card" data-reveal ref={ref}>
      <Link className="card-media" href={`/ad/${ad.library_id}`}
         aria-label={`View details for ${ad.advertiser_name || 'this advertiser'}`}
         onMouseEnter={e => { const v = e.currentTarget.querySelector('video'); if (v) v.play().catch(() => {}); }}
         onMouseLeave={e => { const v = e.currentTarget.querySelector('video'); if (v) { v.pause(); v.currentTime = 0; } }}>
        {ad.creative_video ? (
          <>
            {/* fbcdn mp4 recovered from the raw HTML <video> tag. Poster shows until
                hover; muted+playsInline so it can autoplay on hover without sound. */}
            <video src={ad.creative_video} poster={ad.creative_video_poster || ad.creative_image || undefined}
                   width="258" height="258" muted playsInline preload="none" loop />
            <span className="media-badge" aria-label="Video ad"><Icon.play size={11} />Video</span>
          </>
        ) : ad.creative_image
          ? <img src={ad.creative_image} alt="" width="258" height="258" loading="lazy" />
          : <NoCreative />}
        <span className="scale-badge" title={`${scale} ads reuse this creative`}>
          <span className="bars" aria-hidden="true">
            {Array.from({ length: 5 }, (_, n) => (
              <i key={n} style={{ height: `${(n + 1) * 20}%`, opacity: n < bars ? 1 : .25 }} />
            ))}
          </span>
          {scale}×
        </span>
      </Link>
      <div className="card-b">
        <h3 className="card-adv" title={ad.advertiser_name}>{ad.advertiser_name || 'Unknown advertiser'}</h3>
        {ad.body && <p className="card-body">{ad.body}</p>}
        <div className="card-f">
          {ad.landing_domain && <span className="card-dom" title={ad.landing_domain}>{ad.landing_domain}</span>}
          <span className="card-date">{fmtDate(ad.started_running)}</span>
        </div>
      </div>
    </article>
  );
}

function NoCreative() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
      <Icon.image size={22} />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading ads">
      {Array.from({ length: 8 }, (_, i) => (
        <div className="sk" key={i}><div className="sk-media" /><div className="sk-line" /><div className="sk-line short" /></div>
      ))}
    </div>
  );
}

function NoMatch() {
  return (
    <div className="empty">
      <EmptyGlyph />
      <h2>No ads match these filters</h2>
      <p>Widen the search, or run a new sweep to pull fresh ads into the index.</p>
      <div className="empty-need">
        <b>Run a sweep</b>
        <code>node scripts/sweep-url.mjs &quot;your product&quot; US</code>
        <code>node scripts/ingest.mjs payloads/out.json &quot;your product&quot; US</code>
      </div>
    </div>
  );
}

/* ---------- Store Explorer + Magic AI (both derived from the same query) ---------- */
function Stores({ mode }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/stores?' + new URLSearchParams(q ? { q } : {})).then(r => r.json()).catch(() => ({ stores: [] }));
    setRows(r.stores || []); setLoading(false);
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const max = rows.length ? Math.max(...rows.map(r => r.creatives || 0)) : 1;
  const saturation = r => r.advertisers >= 3 ? 'hot' : r.advertisers === 2 ? 'warm' : 'cool';
  const satLabel = r => r.advertisers >= 3 ? 'Saturated' : r.advertisers === 2 ? 'Contested' : 'Open';

  return (
    <>
      <div className="kpis">
        <Kpi label="Stores found" value={rows.length} />
        <Kpi label="Saturated" value={rows.filter(r => r.advertisers >= 3).length} hint="3+ sellers" />
        <Kpi label="Open lanes" value={rows.filter(r => r.advertisers === 1).length} hint="single seller" />
      </div>

      <form className="filters" onSubmit={e => { e.preventDefault(); load(); }} role="search">
        <div className="field">
          <Icon.search />
          <label htmlFor="sq" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Filter stores by domain</label>
          <input id="sq" placeholder="Filter stores…" value={q} onChange={e => setQ(e.target.value)} style={{ minWidth: 220 }} />
        </div>
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Loading…' : 'Apply'}</button>
        <span className="count">{loading ? '—' : `${rows.length} stores`}</span>
      </form>

      {loading ? <TableSkeleton /> : rows.length === 0 ? (
        <div className="empty"><EmptyGlyph /><h2>No stores yet</h2>
          <p>Stores are derived from the landing domains of ads you have already swept.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <th scope="col">Store</th>
              <th scope="col" style={{ textAlign: 'right' }}>Ads</th>
              <th scope="col" style={{ textAlign: 'right' }}>Creatives</th>
              <th scope="col" style={{ width: '22%' }}>Scale</th>
              {mode === 'saturation'
                ? <><th scope="col" style={{ textAlign: 'right' }}>Sellers</th><th scope="col">Competition</th></>
                : <><th scope="col">Markets</th><th scope="col">Latest ad</th></>}
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.domain}>
                  <td><a className="store-link" href={`https://${r.domain}`} target="_blank" rel="noreferrer">{r.domain}</a></td>
                  <td className="num">{fmt(r.ads)}</td>
                  <td className="num">{fmt(r.creatives)}</td>
                  <td><div className="bar" style={{ width: `${Math.max(4, (r.creatives / max) * 100)}%` }}
                           title={`${r.creatives} creatives`} /></td>
                  {mode === 'saturation' ? (
                    <><td className="num">{r.advertisers}</td>
                      <td><span className={`sat ${saturation(r)}`}><i />{satLabel(r)}</span></td></>
                  ) : (
                    <><td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                        {(r.countries || []).filter(Boolean).join(' ')}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                        {fmtDate(r.latest_ad)}</td></>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="sk" aria-busy="true" aria-label="Loading stores" style={{ padding: 'var(--s4)' }}>
      {Array.from({ length: 8 }, (_, i) => <div className="sk-line" key={i} style={{ margin: '14px 0' }} />)}
    </div>
  );
}

/* ---------- Google Trends: standalone lookup, live fetch, any term ---------- */
const TREND_GEOS = [
  { v: '', label: 'Worldwide' }, { v: 'US', label: 'United States' },
  { v: 'GB', label: 'United Kingdom' }, { v: 'IN', label: 'India' },
  { v: 'AU', label: 'Australia' }, { v: 'CA', label: 'Canada' },
];
const TREND_TIMEFRAMES = [
  { v: 'now 7-d', label: 'Past 7 days' }, { v: 'today 1-m', label: 'Past month' },
  { v: 'today 3-m', label: 'Past 3 months' }, { v: 'today 12-m', label: 'Past 12 months' },
];

function TrendsPage() {
  const [q, setQ] = useState('');
  const [geo, setGeo] = useState('');
  const [timeframe, setTimeframe] = useState('today 3-m');
  const [term, setTerm] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const run = async (t, g, tf) => {
    setLoading(true); setErr(null); setTerm(t);
    const p = new URLSearchParams({ q: t, geo: g, timeframe: tf });
    const d = await fetch('/api/trends?' + p).then(r => r.json()).catch(() => null);
    if (!d) { setErr('Request failed.'); setData(null); }
    else if (!d.available) { setErr(d.note || d.error || 'No data available.'); setData(null); }
    else { setData(d); setErr(null); }
    setLoading(false);
  };

  const onSubmit = e => { e.preventDefault(); if (q.trim()) run(q.trim(), geo, timeframe); };

  const pts = data?.points || [];
  const max = Math.max(1, ...pts.map(p => p.value));
  const first = pts[0]?.value ?? 0, last = pts[pts.length - 1]?.value ?? 0;
  const delta = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  const peak = pts.reduce((a, p) => (p.value > (a?.value ?? -1) ? p : a), null);

  return (
    <>
      <div className="research-intro">
        <h1>Google Trends</h1>
        <p>Live search-interest data, fetched directly from Google on every request — no pre-seeded cache required.</p>
      </div>

      <form className="filters research-form" onSubmit={onSubmit} role="search">
        <div className="field" style={{ flex: 1, minWidth: 220 }}>
          <Icon.trending />
          <label htmlFor="tq" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search term</label>
          <input id="tq" placeholder="e.g. air fryer, cold plunge…" value={q}
                 onChange={e => setQ(e.target.value)} style={{ width: '100%' }} autoFocus />
        </div>
        <label htmlFor="tgeo" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Region</label>
        <select id="tgeo" value={geo} onChange={e => setGeo(e.target.value)}>
          {TREND_GEOS.map(g => <option key={g.v} value={g.v}>{g.label}</option>)}
        </select>
        <label htmlFor="ttf" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Timeframe</label>
        <select id="ttf" value={timeframe} onChange={e => setTimeframe(e.target.value)}>
          {TREND_TIMEFRAMES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
        <button className="btn" type="submit" disabled={loading || !q.trim()}>
          {loading ? 'Fetching…' : 'Check trend'}
        </button>
      </form>

      {!term && (
        <div className="empty">
          <EmptyGlyph />
          <h2>Search any term</h2>
          <p>Fetches directly from Google Trends — works for anything, not just terms already in your ad index.</p>
        </div>
      )}

      {term && loading && (
        <div className="sk" aria-busy="true" style={{ padding: 'var(--s6)' }}>
          <div className="sk-line" /><div className="sk-line short" />
        </div>
      )}

      {term && !loading && err && (
        <div className="empty">
          <EmptyGlyph />
          <h2>Couldn&apos;t fetch &quot;{term}&quot;</h2>
          <p>{err}</p>
        </div>
      )}

      {term && !loading && !err && data && (
        <>
          <div className="kpis">
            <Kpi label="Avg interest" value={data.avg_interest} hint="0-100 scale" />
            <Kpi label="Latest" value={last} />
            <Kpi label="Peak" value={peak?.value ?? '—'} hint={peak?.date} />
            <Kpi label="Change" value={`${delta >= 0 ? '+' : ''}${delta}%`} hint="over period" />
          </div>

          <div className="trends-card">
            <div className="trends-head">
              <Icon.trending size={16} />
              <span className="trends-title">
                &quot;{data.term}&quot; · {data.geo === 'worldwide' ? 'Worldwide' : data.geo} · {timeframe}
              </span>
              <span className={'trends-delta ' + (delta >= 0 ? 'up' : 'down')}>
                {delta >= 0 ? '+' : ''}{delta}%
              </span>
            </div>
            <div className="trends-spark trends-spark-lg" aria-hidden="true">
              {pts.map((p, i) => (
                <i key={i} style={{ height: `${Math.max(4, (p.value / max) * 100)}%` }} title={`${p.date}: ${p.value}`} />
              ))}
            </div>
            <div className="trends-foot">
              <span>{data.source === 'live' ? 'Live from Google' : data.source === 'cache-fallback' ? 'Cached (live fetch failed)' : 'Cached'}</span>
              <span className="mono-dim">{pts.length} data points</span>
            </div>
            {data.note && <p className="detail-desc" style={{ margin: 0 }}>{data.note}</p>}
          </div>
        </>
      )}
    </>
  );
}

function Boards() {
  return (
    <div className="empty">
      <EmptyGlyph />
      <h2>No saved boards yet</h2>
      <p>Boards group ads you want to come back to. The tables exist and are wired; nothing has been saved into them.</p>
      <div className="empty-need">
        <b>Schema ready</b>
        <code>boards · board_ads (FK to ads.library_id)</code>
      </div>
    </div>
  );
}

/* Honest state for every feature with no data source behind it.
   Names the exact blocker rather than showing invented numbers. */
function NotConnected({ item }) {
  const I = Icon[item.icon] || Icon.alert;
  return (
    <div className="empty">
      <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--s4)' }}><I size={28} /></div>
      <h2>{item.label} is not connected</h2>
      <p>This feature has no data source wired up yet. Nothing here is simulated — the panel stays empty until a real source is connected.</p>
      <div className="empty-need">
        <b>What it needs</b>
        <code>{item.need}</code>
      </div>
    </div>
  );
}


/* Theme toggle. Explicit choice persists and beats the system preference;
   the pre-paint script in layout.js applies it before first render. */
function ThemeToggle() {
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    setTheme(document.documentElement.getAttribute('data-theme') || 'light');
  }, []);
  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('advault-theme', next); } catch {}
    setTheme(next);
  };
  return (
    <button className="theme-toggle" onClick={flip}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Light theme' : 'Dark theme'}>
      {theme === 'dark' ? <Icon.sun /> : <Icon.moon />}
    </button>
  );
}

/* Code-native SVG — the unDraw library is not populated on this machine,
   so empty states use a geometric glyph in the locked palette rather than
   a claimed illustration. */
function EmptyGlyph() {
  return (
    <svg width="46" height="46" viewBox="0 0 48 48" aria-hidden="true"
         style={{ marginBottom: 'var(--s4)', opacity: .9 }}>
      <circle cx="24" cy="24" r="15" fill="none" stroke="var(--border)" strokeWidth="2" />
      <path d="M24 9a15 15 0 0 1 15 15" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
      <rect x="20" y="26" width="3" height="7" rx="1.5" fill="var(--primary)" opacity=".8" />
      <rect x="25" y="20" width="3" height="13" rx="1.5" fill="var(--accent)" opacity=".8" />
    </svg>
  );
}
