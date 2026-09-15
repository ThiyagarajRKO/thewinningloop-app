'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import '../../globals.css';
import { Icon, BrandMark } from '../../icons';

const fmt = n => new Intl.NumberFormat('en-US').format(n ?? 0);
const fmtDate = d => d ? new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)) : '—';
const fmtDur = s => s == null ? null : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function AdDetail({ params }) {
  const { id } = use(params);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch(`/api/ads/${id}`)
      .then(r => r.json())
      .then(d => (d.error ? setErr(d.error) : setData(d)))
      .catch(() => setErr('failed to load'));
  }, [id]);

  if (err) return <Shell><div className="empty"><h2>Ad not found</h2><p>{err}</p><Link className="btn" href="/">Back to library</Link></div></Shell>;
  if (!data) return <Shell><DetailSkeleton /></Shell>;

  const { ad, siblings, domainStats } = data;
  const dur = fmtDur(ad.video_duration_sec);

  return (
    <Shell>
      <nav className="detail-crumb">
        <Link href="/">Facebook Adlibrary</Link>
        <span aria-hidden="true">/</span>
        <b>{ad.advertiser_name || 'Unknown advertiser'}</b>
      </nav>

      <div className="detail-grid">
        {/* ---- creative ---- */}
        <div className="detail-media">
          {ad.creative_video ? (
            <video src={ad.creative_video} poster={ad.creative_video_poster || ad.creative_image || undefined}
                   controls playsInline preload="metadata" />
          ) : ad.creative_image ? (
            <img src={ad.creative_image} alt="" />
          ) : (
            <div className="detail-nomedia"><Icon.image size={28} /></div>
          )}

          {ad.all_images?.length > 1 && (
            <div className="detail-thumbs">
              {ad.all_images.map((src, i) => (
                <img key={i} src={src} alt={`Creative ${i + 1}`} loading="lazy" />
              ))}
            </div>
          )}
        </div>

        {/* ---- facts ---- */}
        <div className="detail-side">
          <div className="detail-head">
            <h1>{ad.advertiser_name || 'Unknown advertiser'}</h1>
            <span className={'status-pill ' + (ad.status === 'Active' ? 'on' : 'off')}>
              {ad.status || 'Unknown'}
            </span>
          </div>

          <div className="stat-row">
            <Stat label="Creatives" value={fmt(ad.ads_using_creative)} hint="ads reusing this" />
            <Stat label="Media" value={ad.media_type === 'video' ? (dur || 'Video') : 'Image'} />
            <Stat label="Running since" value={fmtDate(ad.started_running)} />
          </div>

          {ad.headline && (
            <section className="detail-block">
              <b>Link card</b>
              {ad.display_domain && <span className="mono-dim">{ad.display_domain}</span>}
              <p className="detail-headline">{ad.headline}</p>
              {ad.link_description && <p className="detail-desc">{ad.link_description}</p>}
            </section>
          )}

          {ad.body && (
            <section className="detail-block">
              <b>Ad copy</b>
              <p className="detail-body">{ad.body}</p>
            </section>
          )}

          <section className="detail-block">
            <b>Destination</b>
            {ad.landing_url ? (
              <a className="store-link" href={ad.landing_url} target="_blank" rel="noreferrer">
                {ad.landing_domain} <Icon.link size={11} />
              </a>
            ) : <span className="mono-dim">not captured</span>}
            {domainStats?.ads > 0 && (
              <p className="detail-desc">
                {fmt(domainStats.ads)} ads on this domain
                {domainStats.advertisers > 1 ? ` from ${domainStats.advertisers} advertisers` : ''}
                {domainStats.creatives ? ` · ${fmt(domainStats.creatives)} creatives total` : ''}
              </p>
            )}
          </section>

          <section className="detail-block">
            <b>Record</b>
            <dl className="kv">
              <dt>Library ID</dt><dd className="mono-dim">{ad.library_id}</dd>
              <dt>Country</dt><dd className="mono-dim">{ad.country || '—'}</dd>
              <dt>Found via</dt><dd className="mono-dim">{ad.search_query || '—'}</dd>
              <dt>CTA</dt><dd className="mono-dim">{ad.cta || '—'}</dd>
              {ad.eu_transparency && <><dt>EU data</dt><dd className="mono-dim">available</dd></>}
            </dl>
            <a className="btn btn-ghost" href={ad.ad_details_url} target="_blank" rel="noreferrer">
              Open in Ad Library <Icon.link size={11} />
            </a>
          </section>
        </div>
      </div>

      {siblings?.length > 0 && (
        <section className="detail-siblings">
          <h2>Other ads from {ad.advertiser_name}</h2>
          <div className="grid">
            {siblings.map(s => (
              <Link className="card" key={s.library_id} href={`/ad/${s.library_id}`}>
                <div className="card-media">
                  {(s.creative_video_poster || s.creative_image)
                    ? <img src={s.creative_video_poster || s.creative_image} alt="" loading="lazy" />
                    : <div className="detail-nomedia"><Icon.image size={20} /></div>}
                  {s.media_type === 'video' && (
                    <span className="media-badge"><Icon.play size={11} />Video</span>
                  )}
                </div>
                <div className="card-b">
                  <h3 className="card-adv">{s.headline || 'Untitled ad'}</h3>
                  <div className="card-f">
                    <span className="card-dom">{fmt(s.ads_using_creative)}× creatives</span>
                    <span className="card-date">{fmtDate(s.started_running)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="detail-shell">
      <header className="topbar">
        <Link href="/" className="brand" style={{ padding: 0, height: 'auto' }}>
          <BrandMark />
          <span className="brand-name">Ad<em>Vault</em></span>
        </Link>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="kpi">
      <span className="kpi-v" style={{ fontSize: 18 }}>{value}</span>
      <span className="kpi-k">{label}{hint ? ` · ${hint}` : ''}</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="detail-grid" aria-busy="true">
      <div className="sk" style={{ aspectRatio: 1 }} />
      <div>
        {Array.from({ length: 6 }, (_, i) => <div className="sk-line" key={i} style={{ margin: '16px 0' }} />)}
      </div>
    </div>
  );
}
