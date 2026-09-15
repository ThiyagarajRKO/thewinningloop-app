// Zips multiple fbcdn creatives server-side and streams the archive back —
// the "Download all" counterpart to /api/ads/download. A client-side loop of
// individual downloads is unreliable past 2-3 files (popup/multi-download
// blockers, no combined progress), so this follows the same shape Google
// Photos uses: one request, one .zip.
//
// POST body (not GET — 10+ full fbcdn URLs with signed query params blow
// past a safe URL length): { files: [{ url, filename }], zipName }
//
// Same host allowlist as the single-file proxy, same reasoning: this must
// never become an open proxy for arbitrary URLs (SSRF risk).
// archiver 8.x has no default export and no legacy archiver('zip', opts)
// factory — its own package is ESM-only with named class exports. ZipArchive
// itself extends Node's Transform stream, so it can be constructed directly
// and fed straight into Readable.toWeb() with no separate PassThrough needed.
// Confirmed by reading node_modules/archiver/index.js + lib/core.js after the
// factory-call form threw "archiver is not a function" in the dev server.
import { ZipArchive } from 'archiver';
import { Readable } from 'node:stream';

const ALLOWED_HOST_SUFFIX = '.fbcdn.net';
const MAX_FILES = 30;

export const dynamic = 'force-dynamic';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const files = Array.isArray(body?.files) ? body.files.slice(0, MAX_FILES) : [];
  if (!files.length) return Response.json({ error: 'no files given' }, { status: 400 });

  const validated = [];
  for (const f of files) {
    let target;
    try {
      target = new URL(f?.url || '');
    } catch {
      continue; // skip malformed entries rather than failing the whole batch
    }
    if (target.protocol !== 'https:' || !target.hostname.endsWith(ALLOWED_HOST_SUFFIX)) continue;
    const filename = String(f.filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    validated.push({ target, filename });
  }
  if (!validated.length) return Response.json({ error: 'no valid fbcdn urls' }, { status: 400 });

  const zipName = String(body.zipName || 'attachments').replace(/[^a-zA-Z0-9._-]/g, '_');

  const archive = new ZipArchive({ zlib: { level: 6 } });

  // Fetch and append each file in the background; archiver's own stream is
  // what actually gets returned to the client, so a slow/failed individual
  // fetch just gets skipped rather than blocking or failing the whole zip.
  (async () => {
    for (const { target, filename } of validated) {
      try {
        const upstream = await fetch(target, { redirect: 'follow' });
        if (!upstream.ok || !upstream.body) continue;
        const buf = Buffer.from(await upstream.arrayBuffer());
        archive.append(buf, { name: filename });
      } catch {
        // one bad fetch shouldn't sink the rest of the archive
      }
    }
    archive.finalize();
  })();

  const webStream = Readable.toWeb(archive);

  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}.zip"`,
    },
  });
}
