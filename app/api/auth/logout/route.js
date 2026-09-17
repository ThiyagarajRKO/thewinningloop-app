import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "../../../../lib/auth.mjs";

/* Sign out.

   The cookie is cleared on the response rather than through cookies().delete()
   so the Set-Cookie header and the redirect are guaranteed to travel together
   in one response. Same attributes as when it was set, with maxAge 0 — a
   mismatched path or domain would leave the original cookie in place and the
   user still signed in. */
function signOut(request) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
  return response;
}

// POST is what the sidebar form uses. A GET here would be triggerable by any
// third-party <img src> or <a>, so it is not offered.
export async function POST(request) {
  return signOut(request);
}
