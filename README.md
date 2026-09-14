# WinningHunter — Internal

Ad-spy tool over the public Facebook Ad Library, backed by Postgres.

## Status: working end to end
120 real ads ingested and queryable. Dev server on port 3400.

## Run
```bash
npm run dev          # http://localhost:3400
```

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
