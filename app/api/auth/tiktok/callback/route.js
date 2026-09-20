// TikTok for Business OAuth callback — the "Advertiser redirect URL" to
// register in the TikTok developer portal:
//
//   https://app.thewinningloop.com/api/auth/tiktok/callback
//
// TikTok redirects here with ?auth_code=...&state=... after the advertiser
// authorizes. This exchanges the code for a long-lived access token via
// TikTok's /oauth2/access_token/ endpoint and stores it as the single
// operator's connection (id=1, see db/schema.sql). Single-operator app, so
// there is no per-user token — reconnecting overwrites the existing row.
import { pool } from '../../../../../lib/db.mjs';

export const dynamic = 'force-dynamic';

function readCookie(req, name) {
  const raw = req.headers.get('cookie') || '';
  const match = raw.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(req) {
  const url = new URL(req.url);
  const authCode = url.searchParams.get('auth_code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  if (errorParam) {
    return Response.json({ error: `TikTok authorization failed: ${errorParam}` }, { status: 400 });
  }
  if (!authCode) {
    return Response.json({ error: 'missing auth_code' }, { status: 400 });
  }

  const expectedState = readCookie(req, 'tiktok_oauth_state');
  if (!expectedState || expectedState !== state) {
    return Response.json({ error: 'state mismatch — retry the connect flow' }, { status: 400 });
  }

  const appId = process.env.TIKTOK_APP_ID;
  const appSecret = process.env.TIKTOK_APP_SECRET;
  if (!appId || !appSecret) {
    return Response.json(
      { error: 'TIKTOK_APP_ID / TIKTOK_APP_SECRET are not configured' },
      { status: 500 },
    );
  }

  let tokenRes;
  try {
    tokenRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: appId,
        secret: appSecret,
        auth_code: authCode,
      }),
    });
  } catch (err) {
    return Response.json({ error: `token exchange request failed: ${err.message}` }, { status: 502 });
  }

  const payload = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !payload || payload.code !== 0 || !payload.data?.access_token) {
    return Response.json(
      { error: 'token exchange failed', detail: payload || (await tokenRes.text().catch(() => null)) },
      { status: 502 },
    );
  }

  const { access_token, advertiser_ids, scope } = payload.data;
  // advertiser_ids is a list; a Business Center connection can authorize more
  // than one. This schema stores a single connection, so the first id is kept
  // as the primary — expand to a proper table if multi-advertiser support is
  // needed later.
  const advertiserId = Array.isArray(advertiser_ids) ? advertiser_ids[0] : null;

  await pool.query(
    `INSERT INTO tiktok_oauth_tokens (id, advertiser_id, access_token, scope, updated_at)
     VALUES (1, $1, $2, $3, now())
     ON CONFLICT (id) DO UPDATE SET
       advertiser_id = EXCLUDED.advertiser_id,
       access_token  = EXCLUDED.access_token,
       scope         = EXCLUDED.scope,
       updated_at    = now()`,
    [advertiserId, access_token, Array.isArray(scope) ? scope : []],
  );

  const response = Response.redirect(new URL('/', req.url), 302);
  response.headers.append(
    'Set-Cookie',
    `tiktok_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`,
  );
  return response;
}
