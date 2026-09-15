'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../../globals.css';
import { Icon } from '../../icons';
import { Sidebar } from '../../nav';

const fmt = n => new Intl.NumberFormat('en-US').format(n ?? 0);
const fmtDate = d => d ? new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)) : '—';
const fmtDur = s => s == null ? null : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// A direct client-side fetch() to fbcdn fails: the CDN 302-redirects to a
// signed URL that doesn't carry Access-Control-Allow-Origin, so the browser's
// CORS check rejects the follow-through — confirmed live in the browser
// console (a plain `curl -I` on the first URL looked clean, but curl doesn't
// enforce CORS at all, so that first check was misleading). Routed through
// our own /api/ads/download instead: a server-to-server fetch has no CORS
// restriction, and the route sets Content-Disposition: attachment so the
// browser actually saves the file rather than navigating to it.
async function downloadFile(url, filename) {
  const proxied = `/api/ads/download?${new URLSearchParams({ url, filename })}`;
  const res = await fetch(proxied);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

// "Download all" — one .zip instead of looping downloadFile() per item.
// A client-side loop of N individual downloads is unreliable past 2-3 files
// (browsers block rapid multi-downloads as popup spam, and there's no single
// progress signal), so this mirrors Google Photos: one request, one archive,
// built server-side by /api/ads/download-zip and streamed straight to disk.
async function downloadZipFile(files, zipName) {
  const res = await fetch('/api/ads/download-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, zipName }),
  });
  if (!res.ok) throw new Error(`zip download failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `${zipName}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

// video > carousel (2+ images) > single image > none — same classification
// the main creative block already uses via all_images?.length > 1.
function classifyMedia(item) {
  if (item.creative_video) return 'video';
  if (item.all_images?.length > 1) return 'carousel';
  if (item.creative_image) return 'image';
  return 'none';
}

// Ad Score — a synthetic "is this winning" signal, since Facebook's Ad
// Library exposes none of the real engagement data (likes/comments/shares
// live behind Graph API + page ownership, not this surface — see the
// fbpost nav entry's `need` text). Built entirely from what IS public:
// creative reuse, run longevity, and advertiser scale. Each sub-score is
// capped at 0-100 via a log curve so one huge outlier (a 10k-ad domain)
// doesn't blow the composite past what the other two signals support.
const scoreCurve = (n, cap) => Math.max(0, Math.min(100, Math.round((Math.log10((n || 0) + 1) / Math.log10(cap + 1)) * 100)));

function computeAdScore(ad, domainStats) {
  const creativeScore = scoreCurve(ad.ads_using_creative, 50);      // 50+ reused creatives = maxed
  const daysRunning = ad.started_running
    ? Math.max(0, Math.floor((Date.now() - new Date(ad.started_running)) / 86400000))
    : 0;
  const durationScore = scoreCurve(daysRunning, 180);               // 180+ days = maxed
  const volumeScore = scoreCurve(domainStats?.ads, 200);            // 200+ ads on the domain = maxed

  const composite = Math.round(creativeScore * 0.4 + durationScore * 0.35 + volumeScore * 0.25);
  return { composite, creativeScore, durationScore, volumeScore, daysRunning };
}

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

  if (err) return <Shell><div className="empty"><h2>Ad not found</h2><p>{err}</p><Link className="btn" href="/?view=fb">Back to library</Link></div></Shell>;
  if (!data) return <Shell><DetailSkeleton /></Shell>;

  const { ad, siblings, domainStats } = data;
  const dur = fmtDur(ad.video_duration_sec);
  const score = computeAdScore(ad, domainStats);

  return (
    <Shell>
      <nav className="detail-crumb">
        <Link href="/?view=fb">Facebook Adlibrary</Link>
        <span aria-hidden="true">/</span>
        <b>{ad.advertiser_name || 'Unknown advertiser'}</b>
        <Link className="btn btn-ghost detail-crumb-back" href="/?view=fb">
          <Icon.chevronLeft size={14} /> Back to list
        </Link>
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
            {ad.ad_details_url && (
              <a className="btn btn-ghost detail-head-fb" href={ad.ad_details_url} target="_blank" rel="noreferrer">
                <Icon.link size={13} /> Open on Facebook
              </a>
            )}
          </div>

          <AdScoreCard score={score} />

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
          </section>
        </div>
      </div>

      {siblings?.length > 0 && (
        <AttachmentsSection siblings={siblings} advertiserName={ad.advertiser_name} />
      )}

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
  const router = useRouter();
  // This page lives outside the main ?view= shell, so selecting a nav item
  // sends the user back to / on that view rather than swapping in place —
  // same destination as clicking it from the shell itself.
  const goTo = id => router.push(`/?view=${id}`);

  return (
    <div className="shell">
      <Sidebar view="fb" onSelect={goTo} />
      <div className="main">
        <header className="topbar">
          <span className="crumb"><Link href="/?view=fb">Facebook Adlibrary</Link></span>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

function AdScoreCard({ score }) {
  const tier = score.composite >= 70 ? 'Strong signal' : score.composite >= 40 ? 'Moderate signal' : 'Early signal';
  const breakdown = [
    { label: 'Creative reuse', value: score.creativeScore, hint: null },
    { label: 'Run length', value: score.durationScore, hint: `${score.daysRunning}d` },
    { label: 'Advertiser scale', value: score.volumeScore, hint: null },
  ];
  return (
    <div className="ad-score">
      <div className="ad-score-top">
        <div className="ad-score-dial">
          <span className="ad-score-num">{score.composite}</span>
          <span className="ad-score-max">/100</span>
        </div>
        <div className="ad-score-id">
          <span className="ad-score-tier">{tier}</span>
          <span className="kpi-k">Ad Score</span>
        </div>
      </div>

      <div className="ad-score-meters">
        {breakdown.map(b => (
          <div className="ad-score-meter" key={b.label}>
            <div className="ad-score-meter-label">
              <span>{b.label}</span>
              <span className="ad-score-meter-val">{b.value}{b.hint && <i className="mono-dim"> · {b.hint}</i>}</span>
            </div>
            <div className="ad-score-bar"><i style={{ transform: `scaleX(${b.value / 100})` }} /></div>
          </div>
        ))}
      </div>

      <p className="ad-score-note">
        <Icon.alert size={12} />
        Derived from creative reuse, run duration and advertiser ad volume — the only
        signals the Ad Library publishes. Not engagement data; likes/comments/shares
        aren&apos;t exposed on this surface.
      </p>
    </div>
  );
}

function AttachmentsSection({ siblings, advertiserName }) {
  const [busy, setBusy] = useState(null); // library_id currently downloading, or 'all'

  const items = siblings
    .map(s => ({ ...s, kind: classifyMedia(s) }))
    .filter(s => s.kind !== 'none');

  if (!items.length) return null;

  const downloadOne = async item => {
    setBusy(item.library_id);
    try {
      const ext = item.kind === 'video' ? 'mp4' : 'jpg';
      await downloadFile(item.creative_video || item.creative_image, `${item.library_id}.${ext}`);
    } catch {
      // fetch failing (network, expired fbcdn signature) shouldn't crash the
      // page — the user can still open the item directly via its own link
    } finally {
      setBusy(null);
    }
  };

  const downloadAll = async () => {
    setBusy('all');
    try {
      const files = items.map(item => {
        const ext = item.kind === 'video' ? 'mp4' : 'jpg';
        return { url: item.creative_video || item.creative_image, filename: `${item.library_id}.${ext}` };
      });
      await downloadZipFile(files, `${advertiserName || 'attachments'}`);
    } catch {
      // zip build failing (network, all fbcdn signatures expired) shouldn't
      // crash the page — individual items can still be downloaded one by one
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="detail-attachments">
      <div className="detail-attachments-head">
        <div>
          <h2>Attachments from other ads</h2>
          <p className="mono-dim">{items.length} video{items.length === 1 ? '' : 's'}, images &amp; carousels from {advertiserName}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={downloadAll} disabled={busy !== null}>
          {busy === 'all' ? <><span className="row-spinner" /> Zipping…</> : <><Icon.download size={14} /> Download all (.zip)</>}
        </button>
      </div>

      <div className="attach-grid">
        {items.map(item => (
          <AttachmentCard key={item.library_id} item={item}
            downloading={busy === item.library_id}
            disabled={busy !== null}
            onDownload={() => downloadOne(item)} />
        ))}
      </div>
    </section>
  );
}

function AttachmentCard({ item, downloading, disabled, onDownload }) {
  return (
    <div className="attach-card">
      <Link href={`/ad/${item.library_id}`} className="attach-media">
        {item.kind === 'video' ? (
          <video src={item.creative_video} poster={item.creative_video_poster || item.creative_image || undefined}
                 controls playsInline preload="metadata" />
        ) : (
          <img src={item.all_images?.[0] || item.creative_image} alt="" loading="lazy" />
        )}
        <span className="attach-badge">
          {item.kind === 'video' && <><Icon.play size={11} />Video</>}
          {item.kind === 'carousel' && <><Icon.image size={11} />Carousel · {item.all_images.length}</>}
          {item.kind === 'image' && <><Icon.image size={11} />Image</>}
        </span>
      </Link>
      <div className="attach-foot">
        <span className="mono-dim">{fmt(item.ads_using_creative)}× creatives</span>
        <button type="button" className="btn-mini" onClick={onDownload} disabled={disabled}
          aria-label={`Download ${item.kind}`} title="Download">
          {downloading ? <span className="row-spinner" /> : <Icon.download size={13} />}
        </button>
      </div>
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
