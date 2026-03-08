-- ============================================================
-- FCFCat — Supabase schema inicial
-- Ejecutar en: Supabase → SQL Editor → New Query → Run
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. CLASIFICACIONES
-- Una fila por equipo/grupo/temporada, se sobreescribe semanalmente
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fcf_standings (
  id            TEXT PRIMARY KEY,   -- "{season}-{competition}-{group}-{team_slug}"
  season        TEXT NOT NULL,
  competition   TEXT NOT NULL,
  group_name    TEXT NOT NULL,
  position      INTEGER,
  team_name     TEXT NOT NULL,
  team_slug     TEXT,
  played        INTEGER DEFAULT 0,
  won           INTEGER DEFAULT 0,
  drawn         INTEGER DEFAULT 0,
  lost          INTEGER DEFAULT 0,
  goals_for     INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_diff     INTEGER DEFAULT 0,
  points        INTEGER DEFAULT 0,
  home_won      INTEGER DEFAULT 0,
  home_drawn    INTEGER DEFAULT 0,
  home_lost     INTEGER DEFAULT 0,
  away_won      INTEGER DEFAULT 0,
  away_drawn    INTEGER DEFAULT 0,
  away_lost     INTEGER DEFAULT 0,
  form          TEXT DEFAULT '',     -- Ej: "WDLWW"
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_standings_comp_group
  ON fcf_standings(competition, group_name, season);

CREATE INDEX IF NOT EXISTS idx_standings_team
  ON fcf_standings(team_slug);

-- ──────────────────────────────────────────────────────────
-- 2. RESULTADOS / CALENDARIO
-- Una fila por partido. home_score / away_score NULL = no jugado
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fcf_matches (
  id          TEXT PRIMARY KEY,   -- "{season}-{competition}-{group}-J{jornada}-{home_slug}-v-{away_slug}"
  season      TEXT NOT NULL,
  competition TEXT NOT NULL,
  group_name  TEXT NOT NULL,
  jornada     INTEGER,
  match_date  TEXT,               -- "dd-mm-yyyy"
  match_time  TEXT,
  home_team   TEXT,
  away_team   TEXT,
  home_slug   TEXT,
  away_slug   TEXT,
  home_score  INTEGER,
  away_score  INTEGER,
  status      TEXT DEFAULT '',    -- "ACTA TANCADA", "Pendent", etc.
  acta_url    TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_comp_group
  ON fcf_matches(competition, group_name, season);

CREATE INDEX IF NOT EXISTS idx_matches_date
  ON fcf_matches(match_date);

CREATE INDEX IF NOT EXISTS idx_matches_teams
  ON fcf_matches(home_team, away_team);

-- ──────────────────────────────────────────────────────────
-- 3. BASE DE DATOS DE ÁRBITROS
-- Una fila por partido arbitrado, con todas las tarjetas
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fcf_referee_matches (
  id            TEXT PRIMARY KEY,   -- "J{n}-{home}-v-{away}"
  competition   TEXT NOT NULL,
  group_name    TEXT NOT NULL,
  season        TEXT NOT NULL,
  jornada       INTEGER,
  match_date    TEXT,               -- "dd-mm-yyyy"
  home_team     TEXT,
  away_team     TEXT,
  home_score    INTEGER,
  away_score    INTEGER,
  main_referee  TEXT,               -- referees[0]
  referees      JSONB DEFAULT '[]', -- lista completa
  yellow_cards  JSONB DEFAULT '[]', -- [{player, minute, team, recipient_type, ...}]
  red_cards     JSONB DEFAULT '[]',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referee_main
  ON fcf_referee_matches(main_referee);

CREATE INDEX IF NOT EXISTS idx_referee_comp
  ON fcf_referee_matches(competition, season);

CREATE INDEX IF NOT EXISTS idx_referee_date
  ON fcf_referee_matches(match_date);

-- ──────────────────────────────────────────────────────────
-- 4. GOLEADORES
-- Top scorers por grupo, sobreescrito semanalmente
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fcf_scorers (
  id              TEXT PRIMARY KEY,  -- "{season}-{competition}-{group}-{player_slug}"
  season          TEXT NOT NULL,
  competition     TEXT NOT NULL,
  group_name      TEXT NOT NULL,
  position        INTEGER,
  player_name     TEXT NOT NULL,
  player_slug     TEXT,
  team_name       TEXT,
  team_slug       TEXT,
  goals           INTEGER DEFAULT 0,
  penalties       INTEGER DEFAULT 0,
  matches         INTEGER DEFAULT 0,
  goals_per_match FLOAT DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scorers_comp_group
  ON fcf_scorers(competition, group_name, season);

CREATE INDEX IF NOT EXISTS idx_scorers_player
  ON fcf_scorers(player_slug);

-- ──────────────────────────────────────────────────────────
-- 5. ESTADÍSTICAS DE JUGADORES (de actas)
-- Una fila por jugador/equipo/grupo/temporada
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fcf_player_stats (
  id              TEXT PRIMARY KEY,  -- "{season}-{competition}-{group}-{player_slug}-{team_slug}"
  season          TEXT NOT NULL,
  competition     TEXT NOT NULL,
  group_name      TEXT NOT NULL,
  player_name     TEXT NOT NULL,
  player_slug     TEXT NOT NULL,
  team_name       TEXT NOT NULL,
  team_slug       TEXT NOT NULL,
  appearances     INTEGER DEFAULT 0,
  starts          INTEGER DEFAULT 0,
  goals           INTEGER DEFAULT 0,
  yellow_cards    INTEGER DEFAULT 0,
  red_cards       INTEGER DEFAULT 0,
  minutes_played  INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_stats_team
  ON fcf_player_stats(team_slug, season);

CREATE INDEX IF NOT EXISTS idx_player_stats_player
  ON fcf_player_stats(player_slug);

CREATE INDEX IF NOT EXISTS idx_player_stats_comp
  ON fcf_player_stats(competition, group_name, season);

-- ──────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- Lectura pública, escritura solo con service_role key
-- ──────────────────────────────────────────────────────────
ALTER TABLE fcf_standings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcf_matches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcf_referee_matches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcf_scorers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcf_player_stats     ENABLE ROW LEVEL SECURITY;

-- Lectura pública (anon key puede leer)
CREATE POLICY "Public read standings"
  ON fcf_standings FOR SELECT USING (true);

CREATE POLICY "Public read matches"
  ON fcf_matches FOR SELECT USING (true);

CREATE POLICY "Public read referee matches"
  ON fcf_referee_matches FOR SELECT USING (true);

CREATE POLICY "Public read scorers"
  ON fcf_scorers FOR SELECT USING (true);

CREATE POLICY "Public read player stats"
  ON fcf_player_stats FOR SELECT USING (true);

-- Escritura solo service_role (GitHub Actions)
-- service_role bypassa automàticament RLS — no cal policy extra

-- ──────────────────────────────────────────────────────────
-- 7. UPDATED_AT automático via trigger
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_standings_updated_at
  BEFORE UPDATE ON fcf_standings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON fcf_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_referee_updated_at
  BEFORE UPDATE ON fcf_referee_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_scorers_updated_at
  BEFORE UPDATE ON fcf_scorers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_player_stats_updated_at
  BEFORE UPDATE ON fcf_player_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
