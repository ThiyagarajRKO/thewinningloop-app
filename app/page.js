'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import './globals.css';
import { Icon, BrandMark } from './icons';

/* Nav mirrors WinningHunter's feature set. `live` = real data behind it today.
   Locked features render an honest not-connected state naming exactly what each needs —
   never a fake table of invented numbers. */
const NAV = [
  { group: 'Ad intelligence', items: [
    { id: 'fb',        label: 'Facebook Adlibrary', icon: 'megaphone', live: true },
    { id: 'tiktok',    label: 'TikTok Adspy',       icon: 'music',
      need: 'TikTok Commercial Content API — docs returned 503 on three attempts; approval + region access still unverified.' },
    { id: 'pinterest', label: 'Pinterest Adspy',    icon: 'image',
      need: 'No Pinterest ad source connected. Their ad transparency data has no public API; would need a scraper like the Facebook one.' },
    { id: 'fbpost',    label: 'Facebook Post Adspy', icon: 'message',
      need: 'Organic post data is a separate source from the Ad Library. Needs a Page-scoped scraper or Graph API page access.' },
  ]},
  { group: 'Product research', items: [
    { id: 'stores',   label: 'Store Explorer',   icon: 'store',    live: true },
    { id: 'magic',    label: 'Magic AI',         icon: 'sparkles', live: true },
    { id: 'tracker',  label: 'Store Tracker',    icon: 'chart',
      need: 'Revenue/traffic over time needs repeat polling of each store. Shopify keys are in .env but no tracker worker exists yet.' },
    { id: 'trends',   label: 'Exploding Trends', icon: 'trending',
      need: 'Needs a time series per product. We hold one snapshot per sweep — run sweeps on a schedule first, then this becomes real.' },
    { id: 'reverse',  label: 'AI Reverse Ad Search', icon: 'search',
      need: 'Image-similarity search over ad creatives. Needs an embedding model + pgvector on winninghunter_v1.' },
  ]},
  { group: 'Output', items: [
    { id: 'import',  label: 'Product Importing', icon: 'package',
      need: 'Pushes a chosen product into your Shopify store as a draft. SHOPIFY_ADMIN_CLIENT_ID + secret are set in .env; the write path is not built.' },
    { id: 'boards',  label: 'Saved Boards', icon: 'bookmark', live: true },
  ]},
];
const ALL = NAV.flatMap(g => g.items);

const fmt = n => new Intl.NumberFormat('en-US').format(n ?? 0);
const fmtDate = d => d ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(d)) : '';

export default function App() {
  const [view, setView] = useState('fb');
  const current = ALL.find(i => i.id === view);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <BrandMark />
          <span className="brand-name">Winning<em>Hunter</em></span>
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
          <div className="topbar-right"><SweepMeta /></div>
        </header>
        <main className="content">
          {view === 'fb' && <AdLibrary />}
          {view === 'stores' && <Stores mode="explorer" />}
          {view === 'magic' && <Stores mode="saturation" />}
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

/* ---------- Facebook Ad Library ---------- */
function AdLibrary() {
  const [ads, setAds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ q: '', domain: '', minCreatives: '', sort: 'creatives' });

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
      <a className="card-media" href={ad.ad_details_url} target="_blank" rel="noreferrer"
         aria-label={`Open Ad Library entry for ${ad.advertiser_name || 'this advertiser'}`}>
        {ad.creative_image
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
      </a>
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
                  <td><a href={`https://${r.domain}`} target="_blank" rel="noreferrer"
                         style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 12 }}>{r.domain}</a></td>
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
