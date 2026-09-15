// Starts and lists Brand Tracker profiles — same pattern as /api/sync: a
// full profile (products.json + a headless-browser pass for theme/pixels/
// contact email + a Page-scoped Facebook Ad Library search) takes real time,
// so POST here only queues the row and detaches a worker; the client polls
// GET /api/brands/[domain] for progress.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pool } from '../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { rows } = await pool.query(
    `SELECT domain, store_name, theme_name, product_count, pixels, contact_email,
            fb_page_id, fb_active_ads, status, error, fetched_at, created_at
       FROM brand_profiles ORDER BY created_at DESC LIMIT 50`);
  return Response.json({ brands: rows });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const domain = (body?.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return Response.json({ error: 'a valid domain is required (e.g. example.com)' }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO brand_profiles (domain, status) VALUES ($1, 'queued')
     ON CONFLICT (domain) DO UPDATE SET status = 'queued', error = NULL`,
    [domain]);

  const workerPath = path.join(process.cwd(), 'scripts', 'brand-worker.mjs');
  const child = spawn(process.execPath, [workerPath, domain], {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd(),
  });
  child.unref();

  return Response.json({ domain });
}
