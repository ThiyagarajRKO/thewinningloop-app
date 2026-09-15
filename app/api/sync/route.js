// Starts and lists Facebook Ad Library sync jobs — the UI counterpart to
// manually running scripts/scrape-fb.mjs + scripts/ingest.mjs from a
// terminal. A scrape takes 1-3+ minutes (headless Playwright), so POST here
// only creates the job row and detaches a worker process; it does not await
// the scrape itself. The client polls GET /api/sync/[id] for progress.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pool } from '../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { rows } = await pool.query(
    `SELECT id, query, country, status, ads_found, ads_new, error, created_at, finished_at
       FROM sync_jobs ORDER BY created_at DESC LIMIT 20`);
  return Response.json({ jobs: rows });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const query = (body?.query || '').trim();
  const country = (body?.country || 'US').trim().toUpperCase();
  const scrollRounds = Number.isInteger(body?.scrollRounds) ? body.scrollRounds : 8;
  const waitSeconds = Number.isInteger(body?.waitSeconds) ? body.waitSeconds : 20;

  if (!query) return Response.json({ error: 'query is required' }, { status: 400 });
  // ALL is Facebook's own Ad Library value for "every country" — verified
  // live against the real endpoint (200, real ads parsed) before adding it
  // here rather than assumed, same discipline as the rest of this project.
  if (country !== 'ALL' && !/^[A-Z]{2}$/.test(country)) {
    return Response.json({ error: 'country must be a 2-letter code, or ALL' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO sync_jobs (query, country, status) VALUES ($1, $2, 'queued') RETURNING id`,
    [query, country]);
  const jobId = rows[0].id;

  const workerPath = path.join(process.cwd(), 'scripts', 'sync-worker.mjs');
  const child = spawn(process.execPath, [
    workerPath, String(jobId), query, country, String(scrollRounds), String(waitSeconds),
  ], {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd(),
  });
  child.unref(); // let this route's own request finish without waiting on the scrape

  return Response.json({ jobId });
}
