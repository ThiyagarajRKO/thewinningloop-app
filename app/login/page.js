import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import "../globals.css";
import { Icon, BrandMark } from "../icons";
import { ThemeToggle } from "../theme-toggle";
import {
  SESSION_COOKIE,
  checkCredentials,
  createSessionToken,
  sessionCookieOptions,
  usingDefaultCredentials,
  verifySessionToken,
} from "../../lib/auth.mjs";

export const metadata = {
  title: "Sign in · TheWinningLoop",
  description: "Sign in to TheWinningLoop.",
  // A login form is not a search result.
  robots: { index: false, follow: false },
};

/* Only a same-site path is ever accepted as a post-sign-in destination.
   Without this, `?next=//evil.example` would bounce a freshly authenticated
   user straight off-site — the classic open redirect in a login form. */
function safeNext(value) {
  if (typeof value !== "string") return "/";
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  )
    return "/";
  return value;
}

/* The whole sign-in is a Server Action, so:
     - the password is posted straight to the server and never lives in React
       state, a fetch() body, or the URL;
     - the cookie is set by the server as HttpOnly, so no client script can
       read or forge it;
     - it still works with JavaScript disabled — the browser does a normal
       form POST, and redirect() turns a pass or a fail into the next page. */
async function signIn(formData) {
  "use server";
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!(await checkCredentials(username, password))) {
    // Redirect back to the form rather than returning state, so there is no
    // client component holding the attempt. `u` re-fills the username only —
    // never the password.
    redirect(
      `/login?${new URLSearchParams({ error: "1", u: username, next })}`,
    );
  }

  (await cookies()).set(
    SESSION_COOKIE,
    await createSessionToken(username),
    sessionCookieOptions,
  );
  redirect(next);
}

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const next = safeNext(params?.next);

  // Already signed in — skip the form, go where they were headed.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) redirect(next);

  const failed = params?.error === "1";
  const attempted = typeof params?.u === "string" ? params.u : "";

  return (
    <div className="auth-wrap">
      <div className="auth-theme">
        <ThemeToggle />
      </div>

      <div className="auth-card">
        <div className="auth-brand">
          <BrandMark size={26} />
          <span className="brand-name">
            The<em>WinningLoop</em>
          </span>
        </div>

        <div>
          <h1>Sign in</h1>
          <p className="auth-sub">
            TheWinningLoop has a single operator account. Use the credentials held in
            the server&apos;s <code>AUTH_USERNAME</code> and{" "}
            <code>AUTH_PASSWORD</code> settings.
          </p>
        </div>

        {failed && (
          <p className="auth-error" role="alert">
            <Icon.alert size={15} />
            <span>
              That username and password combination was not accepted. Check
              both and try again.
            </span>
          </p>
        )}

        {usingDefaultCredentials() && (
          <p className="auth-note">
            <b>Default credentials are in use.</b> Set{" "}
            <code>AUTH_USERNAME</code>, <code>AUTH_PASSWORD</code> and{" "}
            <code>AUTH_SECRET</code> in <code>.env</code> before this server is
            reachable from anywhere other than localhost.
          </p>
        )}

        <form className="auth-form" action={signIn}>
          <input type="hidden" name="next" value={next} />

          <div className="auth-field">
            <label htmlFor="username">
              <Icon.user size={12} /> Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              defaultValue={attempted}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">
              <Icon.lock size={12} /> Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <button className="btn" type="submit">
            Sign in
          </button>
        </form>
      </div>

      {/* Plain text, no chrome — the simplest thing that still puts both
          documents one click from the sign-in form.
          target="_blank" so a half-typed sign-in is still waiting when the
          reader comes back, and rel="noreferrer" so window.opener is not handed
          to another document. Drop target="_blank" to open in the same tab. */}
      <nav className="auth-legal">
        <Link href="/privacy" target="_blank" rel="noreferrer">
          Privacy Policy
        </Link>
        <span className="sep" aria-hidden="true">
          |
        </span>
        <Link href="/terms" target="_blank" rel="noreferrer">
          Terms &amp; Conditions
        </Link>
      </nav>
    </div>
  );
}
