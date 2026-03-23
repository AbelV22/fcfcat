-- ============================================================
-- 005 — Player Profiles (NeoScout "LinkedIn del futbol amateur")
-- Auto-generated from fcf_player_stats, enriched when claimed
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. PLAYER PROFILES
-- One row per unique player identity across all seasons/teams
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_slug  TEXT UNIQUE NOT NULL,     -- slugified canonical name (URL identifier)
  display_name    TEXT NOT NULL,            -- from fcf_player_stats or user-edited

  -- Enriched data (set by claimed user)
  bio             TEXT,
  position        TEXT,                     -- 'porter', 'defensa', 'migcampista', 'davanter'
  preferred_foot  TEXT,                     -- 'dret', 'esquerre', 'ambigu'
  birth_year      INTEGER,
  height_cm       INTEGER,
  weight_kg       INTEGER,
  photo_url       TEXT,
  highlight_url   TEXT,                     -- YouTube/Vimeo link

  -- Contact (phone primary, gated behind premium)
  phone           TEXT,
  contact_email   TEXT,
  instagram       TEXT,
  whatsapp        BOOLEAN DEFAULT FALSE,

  -- Claim/ownership
  claimed_by      UUID REFERENCES auth.users(id),
  claimed_at      TIMESTAMPTZ,
  verified        BOOLEAN DEFAULT FALSE,

  -- Privacy & status
  opted_out       BOOLEAN DEFAULT FALSE,    -- GDPR: hide from public
  contact_visible BOOLEAN DEFAULT FALSE,    -- show contact to coaches?
  looking_for_team BOOLEAN DEFAULT FALSE,   -- "transfer market" flag

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_profiles_slug
  ON player_profiles(canonical_slug);

CREATE INDEX IF NOT EXISTS idx_player_profiles_claimed
  ON player_profiles(claimed_by);

CREATE INDEX IF NOT EXISTS idx_player_profiles_position
  ON player_profiles(position);

CREATE INDEX IF NOT EXISTS idx_player_profiles_looking
  ON player_profiles(looking_for_team) WHERE looking_for_team = true;

-- ──────────────────────────────────────────────────────────
-- 2. PLAYER STATS LINKS
-- Maps fcf_player_stats rows to a canonical profile
-- (handles name variants, multi-team, multi-season)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_stats_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  player_stats_id TEXT NOT NULL,            -- references fcf_player_stats.id
  UNIQUE(player_stats_id)
);

CREATE INDEX IF NOT EXISTS idx_stats_links_profile
  ON player_stats_links(profile_id);

-- ──────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats_links ENABLE ROW LEVEL SECURITY;

-- Public read (anon key can read profiles)
CREATE POLICY "Public read player profiles"
  ON player_profiles FOR SELECT USING (true);

CREATE POLICY "Public read player stats links"
  ON player_stats_links FOR SELECT USING (true);

-- Owner can update their own profile
CREATE POLICY "Owner can update own profile"
  ON player_profiles FOR UPDATE
  USING (auth.uid() = claimed_by)
  WITH CHECK (auth.uid() = claimed_by);

-- Service role bypasses RLS automatically (for scraper/admin)

-- ──────────────────────────────────────────────────────────
-- 4. UPDATED_AT trigger (reuse existing function)
-- ──────────────────────────────────────────────────────────
CREATE TRIGGER trg_player_profiles_updated_at
  BEFORE UPDATE ON player_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────────────────────
-- 5. AUTO-GENERATE profiles from existing fcf_player_stats
-- Groups by player_slug, picks most common player_name
-- ──────────────────────────────────────────────────────────
-- Auto-generate: one profile per player+team (composite slug avoids name collisions)
-- canonical_slug = "player_slug--team_slug" (double dash separator)
INSERT INTO player_profiles (canonical_slug, display_name)
SELECT DISTINCT ON (player_slug, team_slug)
  player_slug || '--' || team_slug,
  player_name
FROM fcf_player_stats
WHERE player_slug IS NOT NULL AND player_slug != ''
  AND team_slug IS NOT NULL AND team_slug != ''
ORDER BY player_slug, team_slug, appearances DESC, player_name
ON CONFLICT (canonical_slug) DO NOTHING;

-- Link all stats rows to their profile
INSERT INTO player_stats_links (profile_id, player_stats_id)
SELECT pp.id, ps.id
FROM fcf_player_stats ps
JOIN player_profiles pp ON pp.canonical_slug = ps.player_slug || '--' || ps.team_slug
ON CONFLICT (player_stats_id) DO NOTHING;
