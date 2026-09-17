# AdVault

Ad-spy tool over the public Facebook Ad Library, backed by Postgres.

## Status: working end to end

120 real ads ingested and queryable. Dev server on port 3400.

## Run

```bash
npm run dev          # http://localhost:3400
```

## Sign in

The whole app — every page and the entire `/api` surface — sits behind a
session gate (`middleware.js`). Only `/login`, `/privacy` and `/terms` are
reachable without one, because ad-platform app review fetches the legal pages
anonymously.

Credentials live in `.env`:

| Variable        | Purpose                                                  |
| --------------- | -------------------------------------------------------- |
| `AUTH_USERNAME` | The single operator account.                             |
| `AUTH_PASSWORD` | Its password.                                            |
| `AUTH_SECRET`   | 32 random bytes, the signing key for the session cookie. |

There is no user table and no password store — the credential is compared
server-side on each attempt (`lib/auth.mjs`) and the result is a signed,
`HttpOnly` cookie valid for 7 days. Two consequences worth knowing:

- Changing any of the three values signs everyone out. That is the intent.
- If `AUTH_USERNAME` / `AUTH_PASSWORD` are unset the app falls back to
  development defaults so a fresh clone still works. The login page says so on
  screen. Do not expose that configuration to the internet.

Signing in uses a Server Action, so the password is never held in client state
and the form still works with JavaScript disabled. Sign out is a plain form
`POST` to `/api/auth/logout` — `GET` is deliberately not supported, or any
third-party `<img src>` could log the operator out.

## Add more ads (the sweep loop)

1. Build the URL:
   ```bash
   node scripts/sweep-url.mjs "posture corrector" US
   ```
2. Ask Claude to call the MCP tool `scrape_ad_library_url` with that URL
   (`scroll_rounds: 10`, `wait_seconds: 30`). It saves a JSON payload to disk.
3. Ingest it:
   ```bash
   node scripts/ingest.mjs <payload.json> "posture corrector" US
   ```
   Re-running is safe — `library_id` is the primary key, so repeats update rather than duplicate.

## Scraper notes (learned from live runs)

- **`search_ad_library` (keyword tool) is unusable** — HTTP 403, zero cards parsed.
  Use `scrape_ad_library_url` with a built URL instead.
- **HTTP 403 is cosmetic.** Meta flags the headless browser but still serves the
  content; the MCP source says so at line 36. 120 ads parsed on a 403 response.
- **Always pass `locale=en_US`** — the page otherwise renders in the machine's
  local language (it came back Tamil) and country filters appear ignored.
- **`platforms` is dead data.** The parser scans the wrong chunk, so it is empty
  118/120. Stored, but never filter on it.
- `cta` is null ~78% of the time. `link_text` appears on 9/120.

## Schema

`ads` (PK `library_id`), `advertisers`, `boards` + `board_ads`, `sweeps` log.
Full-text index over body + advertiser name; indexes on domain, date, creative count.

## Ranking signal

`ads_using_creative` = how many ads reuse one creative. High counts mean the
advertiser is scaling it — that is the "winning" signal. Observed range 1–23.
