import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth.mjs";

/* Session gate for the whole app.

   Deny by default: every route needs a valid session except the three below,
   so a new page or API route added later is protected without anyone
   remembering to protect it. Keep this list short and deliberate. */
const PUBLIC_PATHS = [
  "/login", // must be reachable, obviously
  "/privacy", // Meta/Google app review and any platform verification fetch
  "/terms", // these anonymously — a login wall would fail the review
];

const isPublic = (pathname) =>
  PUBLIC_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (session) return NextResponse.next();

  // API callers get JSON, not an HTML login page they would try to .json().
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  // Remember where they were headed so sign-in lands them there instead of
  // dumping everyone on the default view. The login page re-validates this
  // as a same-site path before using it (open-redirect guard).
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  // Skip Next's own build output so every asset request does not pay for an
  // HMAC verification. Everything else — pages and the whole /api surface —
  // goes through the gate above.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
