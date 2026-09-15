'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../../globals.css';
import { Icon } from '../../icons';
import { Sidebar } from '../../nav';

const fmt = n => new Intl.NumberFormat('en-US').format(n ?? 0);
const fmtDate = d => d ? new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)) : '—';

const PIXEL_LABELS = { meta: 'Meta', tiktok: 'TikTok', google: 'Google', pinterest: 'Pinterest', klaviyo: 'Klaviyo' };

// Tabs modeled on the WinningHunter brand-profile screen the user referenced:
// Store info, Meta ads, and per-platform ad tabs. Meta ads is real (this
// project already indexes Facebook Ad Library data). TikTok/Pinterest/Google
// Ads tabs are shown honestly as not-connected — same reasoning already
// recorded on those items in app/nav.js (TikTok: research-only API + robots.txt
// disallow; Pinterest: bot allowlist required; Google Ads: no scraper built,
// would need its own Ads Transparency Center integration) — not silently
// hidden, and not faked with placeholder numbers either.
const TABS = [
  { id: 'info', label: 'Store info' },
  { id: 'meta', label: 'Meta ads' },
  { id: 'tiktok', label: 'TikTok ads' },
  { id: 'pinterest', label: 'Pinterest ads' },
  { id: 'google', label: 'Google ads' },
];

export default function BrandDetail({ params }) {
  const { domain } = use(params);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState('info');
  const pollRef = useState(() => ({ current: null }))[0];

  useEffect(() => {
    let live = true;
    const load = () => fetch(`/api/brands/${domain}`)
      .then(r => r.json())
      .then(d => { if (live) { if (d.error) setErr(d.error); else setData(d); } })
      .catch(() => { if (live) setErr('failed to load'); });
    load();
    pollRef.current = setInterval(() => {
      if (data && (data.status === 'queued' || data.status === 'fetching')) load();
    }, 2500);
    return () => { live = false; clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  if (err) return <Shell><div className="empty"><h2>Not tracked</h2><p>{err}</p><Link className="btn" href="/?view=tracker">Back to Brand Tracker</Link></div></Shell>;
  if (!data) return <Shell><DetailSkeleton /></Shell>;

  const isPending = data.status === 'queued' || data.status === 'fetching';

  return (
    <Shell>
      <nav className="detail-crumb">
        <Link href="/?view=tracker">Brand Tracker</Link>
        <span aria-hidden="true">/</span>
        <b>{data.store_name || data.domain}</b>
        <Link className="btn btn-ghost detail-crumb-back" href="/?view=tracker">
          <Icon.chevronLeft size={14} /> Back to list
        </Link>
      </nav>

      <div className="brand-detail-head">
        <div>
          <h1>{data.store_name || data.domain}</h1>
          <a className="store-link" href={`https://${data.domain}`} target="_blank" rel="noreferrer">
            {data.domain} <Icon.link size={11} />
          </a>
        </div>
        {isPending && (
          <span className="status-pill"><span className="row-spinner" style={{ marginRight: 4 }} />Fetching…</span>
        )}
      </div>

      {isPending ? (
        <div className="empty">
          <span className="row-spinner row-spinner-lg" />
          <h2>Building this profile</h2>
          <p>Products, theme, pixels, contact info, and Meta ads — usually 20-60 seconds.</p>
        </div>
      ) : (
        <>
          <div className="tab-bar" role="tablist">
            {TABS.map(t => (
              <button key={t.id} role="tab" aria-selected={tab === t.id}
                className={'tab-btn' + (tab === t.id ? ' active' : '')}
                onClick={() => setTab(t.id)}>
                {t.label}
                {t.id === 'meta' && data.fb_active_ads != null && <span className="tab-count">{data.fb_active_ads}</span>}
              </button>
            ))}
          </div>

          {tab === 'info' && <StoreInfoTab data={data} />}
          {tab === 'meta' && <MetaAdsTab data={data} />}
          {tab === 'tiktok' && <LockedAdsTab platform="TikTok"
            reason="Research-only API (academic/non-profit, EU data only) and library.tiktok.com/robots.txt disallows /ads and /api by name — not a legitimate scrape target. A licensed data reseller is the remaining option." />}
          {tab === 'pinterest' && <LockedAdsTab platform="Pinterest"
            reason="No public ads API, and pinterest.com/robots.txt runs an explicit bot allowlist that this scraper isn't on. Options: apply to their allowlist, or use a licensed data reseller." />}
          {tab === 'google' && <LockedAdsTab platform="Google"
            reason="Google's Ads Transparency Center exists but this project has no scraper built for it yet — a real, separate integration, not wired up here." />}
        </>
      )}
    </Shell>
  );
}

function StoreInfoTab({ data }) {
  return (
    <div className="detail-grid">
      <div className="detail-side">
        <section className="detail-block">
          <b>Store</b>
          <dl className="kv">
            <dt>Theme</dt><dd className="mono-dim">{data.theme_name || '—'}</dd>
            <dt>Products</dt><dd className="mono-dim">{data.product_count ?? '—'}</dd>
            <dt>Contact</dt><dd className="mono-dim">{data.contact_email || '—'}</dd>
            <dt>Last fetched</dt><dd className="mono-dim">{fmtDate(data.fetched_at)}</dd>
          </dl>
        </section>

        <section className="detail-block">
          <b>Tracking pixels</b>
          {data.pixels?.length > 0 ? (
            <div className="brand-pixels">
              {data.pixels.map(p => <span key={p} className="pixel-pill">{PIXEL_LABELS[p] || p}</span>)}
            </div>
          ) : <p className="mono-dim" style={{ margin: 0 }}>None detected</p>}
        </section>
      </div>

      <div>
        <section className="detail-block">
          <b>Products</b>
          {data.products?.length > 0 ? (
            <div className="brand-products">
              {data.products.map(p => (
                <div key={p.handle} className="brand-product">
                  {p.image
                    ? <img src={p.image} alt="" loading="lazy" />
                    : <div className="detail-nomedia"><Icon.image size={18} /></div>}
                  <div>
                    <span className="brand-product-title">{p.title}</span>
                    {p.price && <span className="mono-dim">${p.price}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="mono-dim" style={{ margin: 0 }}>No products found</p>}
        </section>
      </div>
    </div>
  );
}

function MetaAdsTab({ data }) {
  const ads = data.metaAds || [];
  if (!ads.length) {
    return (
      <div className="empty">
        <Icon.megaphone size={28} />
        <h2>No Meta ads indexed for this store</h2>
        <p>Sync this domain's keyword from the Facebook Adlibrary view to index its ads.</p>
      </div>
    );
  }
  return (
    <div className="grid">
      {ads.map(a => (
        <Link className="card" key={a.library_id} href={`/ad/${a.library_id}`}>
          <div className="card-media">
            {(a.creative_video_poster || a.creative_image)
              ? <img src={a.creative_video_poster || a.creative_image} alt="" loading="lazy" />
              : <div className="detail-nomedia"><Icon.image size={20} /></div>}
            {a.media_type === 'video' && <span className="media-badge"><Icon.play size={11} />Video</span>}
          </div>
          <div className="card-b">
            <h3 className="card-adv">{a.headline || a.advertiser_name || 'Untitled ad'}</h3>
            <div className="card-f">
              <span className={'status-pill ' + (a.status === 'Active' ? 'on' : 'off')} style={{ fontSize: 9 }}>{a.status || 'Unknown'}</span>
              <span className="card-date">{fmtDate(a.started_running)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function LockedAdsTab({ platform, reason }) {
  return (
    <div className="empty">
      <Icon.alert size={28} />
      <h2>{platform} ads not connected</h2>
      <p>Nothing here is simulated — this stays empty until a real source is connected.</p>
      <div className="empty-need">
        <b>What it needs</b>
        <code>{reason}</code>
      </div>
    </div>
  );
}

function Shell({ children }) {
  const router = useRouter();
  const goTo = id => router.push(`/?view=${id}`);
  return (
    <div className="shell">
      <Sidebar view="tracker" onSelect={goTo} />
      <div className="main">
        <header className="topbar">
          <span className="crumb"><Link href="/?view=tracker">Brand Tracker</Link></span>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="detail-grid" aria-busy="true">
      <div className="sk" style={{ aspectRatio: '2/1' }} />
      <div>
        {Array.from({ length: 6 }, (_, i) => <div className="sk-line" key={i} style={{ margin: '16px 0' }} />)}
      </div>
    </div>
  );
}
