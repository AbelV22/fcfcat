-- ============================================================
-- 002 — Match Notes (Apunts de Partit)
-- Retroactive migration for tables created ad-hoc in Supabase
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. MATCH NOTES (parent table — one per match observation)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent        TEXT NOT NULL,
  match_date      TEXT NOT NULL,              -- "dd-mm-yyyy"
  is_home         BOOLEAN NOT NULL DEFAULT TRUE,
  goals_for       INTEGER,
  goals_against   INTEGER,
  formation       TEXT,                       -- e.g. "4-3-3"
  overall_rating  INTEGER,                    -- 1-10
  tactical_approach TEXT,                     -- 'possession','counter','high-press','low-block'
  key_moments     TEXT,
  opponent_analysis TEXT,
  areas_to_improve TEXT,
  status          TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'completed'

  -- Match stats (manual input)
  possession_estimate INTEGER,               -- 0-100
  corners_for     INTEGER,
  corners_against INTEGER,
  fouls_for       INTEGER,
  fouls_against   INTEGER,
  offsides_for    INTEGER,
  offsides_against INTEGER,
  shots_for       INTEGER,
  shots_against   INTEGER,
  saves           INTEGER,
  half_time_score_for INTEGER,
  half_time_score_against INTEGER,

  -- Attack
  shots_blocked_for INTEGER,
  shots_blocked_against INTEGER,
  dribbles_attempted INTEGER,
  dribbles_completed INTEGER,

  -- Distribution
  total_passes_for INTEGER,
  total_passes_against INTEGER,
  pass_accuracy   INTEGER,                   -- 0-100

  -- Defense
  tackles_for     INTEGER,
  tackles_against INTEGER,
  clearances      INTEGER,
  aerial_duels_won INTEGER,
  aerial_duels_lost INTEGER,

  -- Set pieces
  throw_ins_for   INTEGER,
  throw_ins_against INTEGER,
  goal_kicks_for  INTEGER,
  goal_kicks_against INTEGER,
  penalties_for   INTEGER,
  penalties_against INTEGER,
  penalties_scored INTEGER,
  penalties_saved INTEGER,

  -- Goalkeeping
  high_claims     INTEGER,

  -- Phase ratings (1-5)
  phase_attack    INTEGER,
  phase_defense   INTEGER,
  phase_transition_atk INTEGER,
  phase_transition_def INTEGER,
  phase_set_pieces INTEGER,

  -- Tactical / notes
  training_focus  TEXT,
  pitch_condition TEXT,
  weather         TEXT,
  captain         TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_notes_user
  ON match_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_match_notes_date
  ON match_notes(match_date);

-- ──────────────────────────────────────────────────────────
-- 2. MATCH NOTE LINEUPS (players in each match)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_note_lineups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_note_id   UUID NOT NULL REFERENCES match_notes(id) ON DELETE CASCADE,
  player_name     TEXT NOT NULL,
  player_slug     TEXT,
  position_x      FLOAT,                     -- 0-1 (left to right)
  position_y      FLOAT,                     -- 0-1 (own goal to opponent goal)
  role            TEXT,                       -- 'GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'
  is_starter      BOOLEAN NOT NULL DEFAULT TRUE,
  attendance      TEXT NOT NULL DEFAULT 'present', -- 'present','absent','injured','sanctioned'
  sub_minute      INTEGER,
  sub_out_minute  INTEGER,
  sub_reason      TEXT,                       -- 'tactical','injury','fatigue','disciplinary'
  effort_rating   INTEGER,                    -- 1-5
  is_captain      BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_match_note_lineups_note
  ON match_note_lineups(match_note_id);

-- ──────────────────────────────────────────────────────────
-- 3. MATCH NOTE EVENTS (goals, cards, subs, etc.)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_note_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_note_id   UUID NOT NULL REFERENCES match_notes(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,              -- 'goal','yellow_card','red_card','substitution', etc.
  minute          INTEGER NOT NULL DEFAULT 0,
  player_name     TEXT NOT NULL,
  secondary_player TEXT,
  goal_type       TEXT,                       -- 'right_foot','left_foot','header','penalty','free_kick','own_goal'
  goal_origin     TEXT,                       -- 'open_play','corner','free_kick','penalty','throw_in','counter_attack'
  shot_zone       TEXT,                       -- 'inside_box','outside_box'
  note            TEXT,
  is_opponent     BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_match_note_events_note
  ON match_note_events(match_note_id);

-- ──────────────────────────────────────────────────────────
-- 4. MATCH NOTE RATINGS (player ratings per match)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_note_ratings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_note_id   UUID NOT NULL REFERENCES match_notes(id) ON DELETE CASCADE,
  player_name     TEXT NOT NULL,
  player_slug     TEXT,
  rating          INTEGER NOT NULL,           -- 1-10
  effort_rating   INTEGER,                    -- 1-5
  tags            JSONB DEFAULT '[]',         -- array of tag keys
  note            TEXT
);

CREATE INDEX IF NOT EXISTS idx_match_note_ratings_note
  ON match_note_ratings(match_note_id);

-- ──────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY
-- Users can only access their own match notes
-- ──────────────────────────────────────────────────────────
ALTER TABLE match_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_note_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_note_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_note_ratings ENABLE ROW LEVEL SECURITY;

-- Match notes: user can CRUD their own
CREATE POLICY "Users can read own match notes"
  ON match_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own match notes"
  ON match_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own match notes"
  ON match_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own match notes"
  ON match_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Child tables: access via parent match_note ownership
CREATE POLICY "Users can read own lineups"
  ON match_note_lineups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM match_notes WHERE match_notes.id = match_note_lineups.match_note_id AND match_notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own lineups"
  ON match_note_lineups FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM match_notes WHERE match_notes.id = match_note_lineups.match_note_id AND match_notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own lineups"
  ON match_note_lineups FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM match_notes WHERE match_notes.id = match_note_lineups.match_note_id AND match_notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own lineups"
  ON match_note_lineups FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM match_notes WHERE match_notes.id = match_note_lineups.match_note_id AND match_notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can read own events"
  ON match_note_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM match_notes WHERE match_notes.id = match_note_events.match_note_id AND match_notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own events"
  ON match_note_events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM match_notes WHERE match_notes.id = match_note_events.match_note_id AND match_notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own events"
  ON match_note_events FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM match_notes WHERE match_notes.id = match_note_events.match_note_id AND match_notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own events"
  ON match_note_events FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM match_notes WHERE match_notes.id = match_note_events.match_note_id AND match_notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can read own ratings"
  ON match_note_ratings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM match_notes WHERE match_notes.id = match_note_ratings.match_note_id AND match_notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own ratings"
  ON match_note_ratings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM match_notes WHERE match_notes.id = match_note_ratings.match_note_id AND match_notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own ratings"
  ON match_note_ratings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM match_notes WHERE match_notes.id = match_note_ratings.match_note_id AND match_notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own ratings"
  ON match_note_ratings FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM match_notes WHERE match_notes.id = match_note_ratings.match_note_id AND match_notes.user_id = auth.uid()
  ));

-- ──────────────────────────────────────────────────────────
-- 6. UPDATED_AT trigger for match_notes
-- ──────────────────────────────────────────────────────────
CREATE TRIGGER trg_match_notes_updated_at
  BEFORE UPDATE ON match_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
