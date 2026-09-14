// Embed ad body copy with Gemini, store in pgvector for AI Reverse Ad Search.
// Usage: node scripts/embed.mjs [limit]
//
// Needs GEMINI_API_KEY in .env. Real Gemini keys start with "AIza" (~39 chars).
// An "AQ."-prefixed value is an OAuth/session token, NOT an API key — it will 403.
//
// Dimensions: gemini-embedding-001 returns 3072 by default. pgvector's HNSW and
// IVFFlat indexes cap at 2000 dims, so 3072 can only be searched by sequential
// scan. That is instant at a few hundred rows. Set EMBED_DIMS=1536 to make the
// column indexable later (the model uses Matryoshka learning, so truncating is
// designed-for, not lossy in the naive sense) — but changing dims means
// re-embedding everything and altering the column type.

import { pool } from '../lib/db.mjs';
import dotenv from 'dotenv';
dotenv.config();

const KEY = process.env.GEMINI_API_KEY;
const DIMS = Number(process.env.EMBED_DIMS || 3072);
const MODEL = 'gemini-embedding-001';
const LIMIT = Number(process.argv[2] || 500);

if (!KEY) {
  console.error('GEMINI_API_KEY missing from .env');
  console.error('Get one at https://aistudio.google.com/apikey — it starts with "AIza".');
  process.exit(1);
}
if (!KEY.startsWith('AIza')) {
  console.error(`GEMINI_API_KEY does not look like an API key (starts "${KEY.slice(0, 3)}").`);
  console.error('Gemini API keys start with "AIza". An "AQ." value is an OAuth token and will 403.');
  process.exit(1);
}

async function embed(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${MODEL}`,
        content: { parts: [{ text: text.slice(0, 8000) }] },
        taskType: 'SEMANTIC_SIMILARITY',
        ...(DIMS !== 3072 ? { outputDimensionality: DIMS } : {}),
      }),
    });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const v = j?.embedding?.values;
  if (!Array.isArray(v)) throw new Error('no embedding in response');
  return v;
}

const { rows } = await pool.query(
  `SELECT library_id, advertiser_name, body FROM ads
   WHERE body IS NOT NULL AND body_embedding IS NULL
   ORDER BY ads_using_creative DESC LIMIT $1`, [LIMIT]);

console.log(`embedding ${rows.length} ads (${DIMS} dims, model ${MODEL})`);
let ok = 0, fail = 0;

for (const [i, r] of rows.entries()) {
  const text = [r.advertiser_name, r.body].filter(Boolean).join('\n');
  try {
    const v = await embed(text);
    await pool.query(
      `UPDATE ads SET body_embedding = $1::vector, embedded_at = now() WHERE library_id = $2`,
      [`[${v.join(',')}]`, r.library_id]);
    ok++;
  } catch (e) {
    fail++;
    console.error(`  fail ${r.library_id}: ${e.message}`);
    if (String(e.message).startsWith('429')) await new Promise(r => setTimeout(r, 30000));
  }
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${rows.length} (ok=${ok} fail=${fail})`);
  await new Promise(r => setTimeout(r, 120)); // stay under free-tier rate limits
}

console.log(`done: embedded=${ok} failed=${fail}`);
await pool.end();
