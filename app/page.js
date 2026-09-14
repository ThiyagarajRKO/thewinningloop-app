'use client';
import { useEffect, useState, useCallback } from 'react';
import './globals.css';

export default function Home() {
  const [ads, setAds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="wrap">
      <header>
        <h1>WinningHunter — Internal</h1>
        <p>Facebook Ad Library spy. High creative counts signal ads worth copying.</p>
      </header>

      <div className="stats">
        <div className="stat"><b>{stats?.stats?.ads ?? '—'}</b><span>Ads</span></div>
        <div className="stat"><b>{stats?.stats?.advertisers ?? '—'}</b><span>Advertisers</span></div>
        <div className="stat"><b>{stats?.stats?.domains ?? '—'}</b><span>Domains</span></div>
        <div className="stat"><b>{ads.length}</b><span>Showing</span></div>
      </div>

      <div className="filters">
        <input placeholder="Search copy or advertiser…" value={f.q} onChange={set('q')} style={{ minWidth: 240 }} />
        <input placeholder="Domain…" value={f.domain} onChange={set('domain')} />
        <input placeholder="Min creatives" type="number" min="1" value={f.minCreatives} onChange={set('minCreatives')} style={{ width: 130 }} />
        <select value={f.sort} onChange={set('sort')}>
          <option value="creatives">Most creatives</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <button onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
      </div>

      {!loading && ads.length === 0 && <div className="empty">No ads match these filters.</div>}

      <div className="grid">
        {ads.map(a => (
          <a className="card" key={a.library_id} href={a.ad_details_url} target="_blank" rel="noreferrer">
            {a.creative_image && <img src={a.creative_image} alt="" loading="lazy" />}
            <div className="b">
              <div className="adv">{a.advertiser_name || 'Unknown'}</div>
              <div className="meta">
                <span className={'tag' + (a.ads_using_creative >= 5 ? ' hot' : '')}>{a.ads_using_creative} creatives</span>
                {a.started_running && <span className="tag">{new Date(a.started_running).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                {a.cta && <span className="tag">{a.cta}</span>}
              </div>
              {a.body && <div className="body">{a.body.slice(0, 220)}</div>}
              {a.landing_domain && <div className="dom">{a.landing_domain}</div>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
