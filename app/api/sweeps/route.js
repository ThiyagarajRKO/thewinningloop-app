import { pool } from '../../../lib/db.mjs';
export const dynamic = 'force-dynamic';

// Distinct keywords that have actually been swept, used by Keyword Research to
// tell "search what's indexed" apart from "nothing scraped for this yet".
export async function GET() {
  const { rows } = await pool.query(
    `SELECT DISTINCT query FROM sweeps WHERE query IS NOT NULL ORDER BY query`);
  return Response.json({ sweeps: rows.map(r => r.query) });
}
