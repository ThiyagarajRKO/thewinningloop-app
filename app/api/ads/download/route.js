// Proxies a single fbcdn creative so the browser can actually save it.
//
// The client originally tried fetch() straight to fbcdn and hit a CORS wall —
// verified live: the video host answers the initial request fine but 302s to
// a redirect target that doesn't carry Access-Control-Allow-Origin, so the
// browser's CORS check fails on the follow-through even though a plain
// `curl -I` on the first URL looked clean (curl doesn't enforce CORS at all,
// which is why that first check was misleading). A server-to-server fetch
// has no CORS restriction, so proxying through our own route sidesteps it
// entirely, and lets us set Content-Disposition: attachment so the browser
// actually saves the file instead of navigating to it.
//
// Restricted to fbcdn hosts only — this must not become an open proxy for
// arbitrary URLs (SSRF risk).
const ALLOWED_HOST_SUFFIX = '.fbcdn.net';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const src = p.get('url') || '';
  const filename = (p.get('filename') || 'download').replace(/[^a-zA-Z0-9._-]/g, '_');

  let target;
  try {
    target = new URL(src);
  } catch {
    return Response.json({ error: 'invalid url' }, { status: 400 });
  }
  if (target.protocol !== 'https:' || !target.hostname.endsWith(ALLOWED_HOST_SUFFIX)) {
    return Response.json({ error: 'host not allowed' }, { status: 400 });
  }

  const upstream = await fetch(target, { redirect: 'follow' });
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: `upstream fetch failed (${upstream.status})` }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      ...(upstream.headers.get('content-length') ? { 'Content-Length': upstream.headers.get('content-length') } : {}),
    },
  });
}
