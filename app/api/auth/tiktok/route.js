// Starts the TikTok for Business OAuth flow: redirects the operator to
// TikTok's authorization screen. This is for the Business API (read access to
// ad accounts the operator connects) — NOT the Ad Library discovery feature,
// which stays blocked for the reasons documented in app/nav.js.
//
// Requires TIKTOK_APP_ID and TIKTOK_REDIRECT_URI in the environment. See
// .env.example. state is a random value stored in a short-lived cookie and
// checked again in the callback, so the redirect can't be replayed against a
// session that didn't request it.

export const dynamic = 'force-dynamic';

export async function GET() {
  const appId = process.env.TIKTOK_APP_ID;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!appId || !redirectUri) {
    return Response.json(
      { error: 'TIKTOK_APP_ID / TIKTOK_REDIRECT_URI are not configured' },
      { status: 500 },
    );
  }

  const state = crypto.randomUUID();

  const authorizeUrl = new URL('https://business-api.tiktok.com/portal/auth');
  authorizeUrl.searchParams.set('app_id', appId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('state', state);

  const response = Response.redirect(authorizeUrl.toString(), 302);
  response.headers.append(
    'Set-Cookie',
    `tiktok_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`,
  );
  return response;
}
