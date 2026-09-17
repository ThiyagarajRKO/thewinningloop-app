/* Static, server-side authentication.

   There is exactly one operator account, no user table, and no password
   storage: the credential lives in the server's environment (AUTH_USERNAME /
   AUTH_PASSWORD) and is compared here. A successful sign-in sets a signed,
   HttpOnly cookie. Nothing about the credential ever reaches the browser —
   the login form posts a Server Action, so the password is never held in
   React state or sent in a fetch() body.

   Deliberately built on Web Crypto (globalThis.crypto.subtle) rather than
   node:crypto. The same module is imported by middleware.js, which Next runs
   in the Edge runtime where node:crypto does not exist — Web Crypto is the
   one crypto surface both runtimes share, so there is a single signing
   implementation rather than two that can drift apart.

   Nothing in here reads next/headers or anything else runtime-specific, so
   the module stays importable from Edge middleware, route handlers and
   Server Components alike. */

const SECRET_FALLBACK_PREFIX = "advault-dev-secret::";

// Used only when the env vars are absent, so `npm run dev` on a fresh clone
// still has a way in. usingDefaultCredentials() reports this state and the
// login page shows a warning — it is a development convenience, not a
// supported production configuration.
const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "advault-dev";

export const SESSION_COOKIE = "advault_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // seconds

export const sessionCookieOptions = {
  httpOnly: true, // not readable from document.cookie
  sameSite: "lax", // top-level POST from the login form still sends it
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const configureUsername = () => process.env.AUTH_USERNAME || DEFAULT_USERNAME;
const configurePassword = () => process.env.AUTH_PASSWORD || DEFAULT_PASSWORD;

/* Signing key. When AUTH_SECRET is unset it is derived from the password, so a
   cookie signed on one boot still verifies on the next. Changing either value
   invalidates every existing session — which is the intended effect. */
const signingKey = () =>
  process.env.AUTH_SECRET || `${SECRET_FALLBACK_PREFIX}${configurePassword()}`;

export function usingDefaultCredentials() {
  return !process.env.AUTH_USERNAME || !process.env.AUTH_PASSWORD;
}

export function usingFallbackSecret() {
  return !process.env.AUTH_SECRET;
}

/* ---------- encoding ---------- */

// String.fromCharCode(...bytes) blows the call stack on large arrays; chunk it.
function bytesToBinary(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return out;
}

const b64urlEncode = (bytes) =>
  btoa(bytesToBinary(bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

function b64urlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "===".slice((padded.length + 3) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/* ---------- primitives ---------- */

async function sha256(text) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(text)),
  );
}

async function hmac(text) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(text)),
  );
}

/* Comparing with === leaks how many bytes matched, and comparing lengths leaks
   length. Hashing first makes both sides a fixed 32 bytes, so the loop below
   runs the same number of times no matter what was supplied. */
function fixedTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* ---------- credentials ---------- */

/**
 * @param {unknown} username
 * @param {unknown} password
 * @returns {Promise<boolean>}
 */
export async function checkCredentials(username, password) {
  const [userHash, givenUser, passHash, givenPass] = await Promise.all([
    sha256(configureUsername()),
    sha256(String(username ?? "")),
    sha256(configurePassword()),
    sha256(String(password ?? "")),
  ]);
  // Bitwise AND, not &&: both comparisons always execute, so a correct
  // username does not become measurably faster to detect than a wrong one.
  return (
    (fixedTimeEqual(userHash, givenUser) &
      fixedTimeEqual(passHash, givenPass)) ===
    1
  );
}

/* ---------- session token ---------- */

/**
 * @param {string} user
 * @returns {Promise<string>} `base64url(payload).base64url(hmac)`
 */
export async function createSessionToken(user) {
  const issued = Math.floor(Date.now() / 1000);
  const payload = {
    u: String(user),
    iat: issued,
    exp: issued + SESSION_MAX_AGE,
  };
  const body = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  return `${body}.${b64urlEncode(await hmac(body))}`;
}

/**
 * @param {unknown} token
 * @returns {Promise<{u: string, iat: number, exp: number} | null>} payload when the
 *          signature verifies and the token has not expired, otherwise null.
 */
export async function verifySessionToken(token) {
  if (typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  let provided;
  try {
    provided = b64urlDecode(token.slice(dot + 1));
  } catch {
    return null; // not valid base64url — malformed, so no signature to check
  }
  if (!fixedTimeEqual(provided, await hmac(body))) return null;

  try {
    const payload = JSON.parse(decoder.decode(b64urlDecode(body)));
    if (!payload || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
