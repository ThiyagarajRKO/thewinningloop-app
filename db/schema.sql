-- AdVault: ad-spy schema (v1)
-- Field contract derived from 120 live Facebook Ad Library cards.

CREATE TABLE IF NOT EXISTS advertisers (
  handle          TEXT PRIMARY KEY,           -- advertiser_handle: numeric page id as string
  name            TEXT NOT NULL,
  first_seen      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ads (
  library_id         TEXT PRIMARY KEY,        -- 16-digit numeric string, unique 120/120
  ad_details_url     TEXT,
  advertiser_handle  TEXT REFERENCES advertisers(handle) ON DELETE SET NULL,
  advertiser_name    TEXT,                    -- denormalized for fast search
  started_running    DATE,                    -- parsed from "Mon D, YYYY"
  ads_using_creative INT  NOT NULL DEFAULT 1, -- observed 1..23
  cta                TEXT,                    -- null ~78%; case-folded on ingest
  creative_image     TEXT,
  creative_video     TEXT,                    -- mp4 src recovered from raw HTML (<video> tag)
  creative_video_poster TEXT,                 -- video thumbnail
  media_type         TEXT,                    -- 'video' | 'image'
  headline           TEXT,                    -- link-card headline under the creative
  link_description   TEXT,                    -- link-card description line
  display_domain     TEXT,                    -- SHOUTED.DOMAIN shown on the card
  status             TEXT,                    -- 'Active' | 'Inactive'
  video_duration_sec INT,                     -- parsed from the player timecode
  eu_transparency    BOOLEAN DEFAULT false,   -- EU transparency block present
  all_images         TEXT[] DEFAULT '{}',     -- every creative image on the card
  body               TEXT,                    -- parser caps at 2000 chars
  link_text          TEXT,                    -- sparse: 9/120
  landing_url        TEXT,
  landing_domain     TEXT,                    -- 118/120
  platforms          TEXT[] NOT NULL DEFAULT '{}',  -- unreliable from this parser; stored, not filtered
  search_query       TEXT,                    -- which sweep found it
  country            TEXT,
  first_seen         TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ads_domain_idx     ON ads (landing_domain);
CREATE INDEX IF NOT EXISTS ads_started_idx    ON ads (started_running DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS ads_creative_idx   ON ads (ads_using_creative DESC);
CREATE INDEX IF NOT EXISTS ads_advertiser_idx ON ads (advertiser_handle);
-- must stay byte-for-byte identical to the expression in app/api/ads/route.js's
-- search query, or Postgres silently stops using the index and full-scans instead
CREATE INDEX IF NOT EXISTS ads_fts_idx        ON ads USING gin (
  to_tsvector('english',
    coalesce(body,'') || ' ' || coalesce(advertiser_name,'') || ' ' ||
    coalesce(headline,'') || ' ' || coalesce(link_description,'') || ' ' ||
    coalesce(landing_domain,'') || ' ' || coalesce(display_domain,'')
  )
);

-- saved boards
CREATE TABLE IF NOT EXISTS boards (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS board_ads (
  board_id   INT REFERENCES boards(id) ON DELETE CASCADE,
  library_id TEXT REFERENCES ads(library_id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (board_id, library_id)
);

-- sweep log: what we scraped and when
CREATE TABLE IF NOT EXISTS sweeps (
  id         SERIAL PRIMARY KEY,
  query      TEXT,
  country    TEXT,
  url        TEXT,
  ads_found  INT,
  ads_new    INT,
  ran_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Google Trends snapshots, one per (term, geo). Fetched by the assistant session
-- via the google-trends MCP tool (this app has no direct MCP access) and written
-- through POST /api/trends. Read back by GET /api/trends, cached 6h in-process.
CREATE TABLE IF NOT EXISTS trend_snapshots (
  id           SERIAL PRIMARY KEY,
  term         TEXT NOT NULL,
  geo          TEXT NOT NULL DEFAULT '',
  points       JSONB NOT NULL,
  avg_interest NUMERIC,
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trend_snapshots_lookup ON trend_snapshots (term, geo, fetched_at DESC);
