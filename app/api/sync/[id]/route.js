// Poll one sync job's status — the UI hits this every couple seconds while
// a modal-triggered sync is running.
import { pool } from '../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id || '')) return Response.json({ error: 'invalid job id' }, { status: 400 });

  const { rows } = await pool.query(
    `SELECT id, query, country, status, ads_found, ads_new, error, created_at, finished_at
       FROM sync_jobs WHERE id = $1`, [id]);
  if (!rows.length) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(rows[0]);
}
