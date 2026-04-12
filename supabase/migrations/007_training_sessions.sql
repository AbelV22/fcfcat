-- ============================================================
-- 007 — Training Sessions (Entrenaments)
-- Training session planning, exercise library, attendance
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. TRAINING MICROCYCLES (weekly planning blocks)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_microcycles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start      TEXT NOT NULL,              -- "dd-mm-yyyy" (Monday)
  week_end        TEXT NOT NULL,              -- "dd-mm-yyyy" (Sunday)
  match_date      TEXT,                       -- linked match day
  linked_match_id TEXT,                       -- FK to fcf_matches.id (TEXT)
  objective       TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_microcycles_user
  ON training_microcycles(user_id);
CREATE INDEX IF NOT EXISTS idx_training_microcycles_week
  ON training_microcycles(week_start);

-- ──────────────────────────────────────────────────────────
-- 2. TRAINING EXERCISES (user drill library)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  description     TEXT,
  duration_min    INTEGER DEFAULT 15,
  intensity       TEXT DEFAULT 'medium',
  min_players     INTEGER DEFAULT 2,
  equipment       TEXT[] DEFAULT '{}',
  tactical_objective TEXT,
  diagram_data    JSONB DEFAULT '{"elements":[]}',
  is_favorite     BOOLEAN DEFAULT FALSE,
  is_template     BOOLEAN DEFAULT FALSE,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_exercises_user
  ON training_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_training_exercises_category
  ON training_exercises(category);

-- ──────────────────────────────────────────────────────────
-- 3. TRAINING SESSIONS (parent — one per training day)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT,
  session_date    TEXT NOT NULL,
  session_type    TEXT NOT NULL DEFAULT 'mixed',
  duration_min    INTEGER DEFAULT 90,
  planned_intensity TEXT DEFAULT 'medium',
  actual_intensity TEXT,
  status          TEXT NOT NULL DEFAULT 'planned',
  match_day_delta INTEGER,
  linked_match_id TEXT,
  focus_areas     TEXT[] DEFAULT '{}',
  coach_notes     TEXT,
  weather         TEXT,
  pitch_condition TEXT,
  microcycle_id   UUID REFERENCES training_microcycles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_user
  ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date
  ON training_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_training_sessions_microcycle
  ON training_sessions(microcycle_id);

-- ──────────────────────────────────────────────────────────
-- 4. TRAINING SESSION EXERCISES (junction table)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_session_exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  exercise_id     UUID REFERENCES training_exercises(id) ON DELETE SET NULL,
  sort_order      INTEGER DEFAULT 0,
  phase           TEXT NOT NULL DEFAULT 'main',
  duration_min    INTEGER NOT NULL DEFAULT 15,
  coach_notes     TEXT,
  player_groups   JSONB,
  inline_name     TEXT,
  inline_description TEXT,
  inline_diagram_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_training_session_exercises_session
  ON training_session_exercises(session_id);

-- ──────────────────────────────────────────────────────────
-- 5. TRAINING ATTENDANCE (player per session)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  player_name     TEXT NOT NULL,
  player_slug     TEXT,
  status          TEXT NOT NULL DEFAULT 'present',
  minutes_trained INTEGER,
  intensity_override TEXT,
  notes           TEXT,
  UNIQUE(session_id, player_name)
);

CREATE INDEX IF NOT EXISTS idx_training_attendance_session
  ON training_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_player
  ON training_attendance(player_name);

-- ──────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────
ALTER TABLE training_microcycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;

-- Microcycles
CREATE POLICY "Users can read own microcycles" ON training_microcycles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own microcycles" ON training_microcycles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own microcycles" ON training_microcycles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own microcycles" ON training_microcycles FOR DELETE USING (auth.uid() = user_id);

-- Exercises
CREATE POLICY "Users can read own exercises" ON training_exercises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exercises" ON training_exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exercises" ON training_exercises FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own exercises" ON training_exercises FOR DELETE USING (auth.uid() = user_id);

-- Sessions
CREATE POLICY "Users can read own sessions" ON training_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON training_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON training_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON training_sessions FOR DELETE USING (auth.uid() = user_id);

-- Session exercises (child)
CREATE POLICY "Users can read own session exercises" ON training_session_exercises FOR SELECT USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = training_session_exercises.session_id AND training_sessions.user_id = auth.uid()));
CREATE POLICY "Users can insert own session exercises" ON training_session_exercises FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = training_session_exercises.session_id AND training_sessions.user_id = auth.uid()));
CREATE POLICY "Users can update own session exercises" ON training_session_exercises FOR UPDATE USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = training_session_exercises.session_id AND training_sessions.user_id = auth.uid()));
CREATE POLICY "Users can delete own session exercises" ON training_session_exercises FOR DELETE USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = training_session_exercises.session_id AND training_sessions.user_id = auth.uid()));

-- Attendance (child)
CREATE POLICY "Users can read own attendance" ON training_attendance FOR SELECT USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = training_attendance.session_id AND training_sessions.user_id = auth.uid()));
CREATE POLICY "Users can insert own attendance" ON training_attendance FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = training_attendance.session_id AND training_sessions.user_id = auth.uid()));
CREATE POLICY "Users can update own attendance" ON training_attendance FOR UPDATE USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = training_attendance.session_id AND training_sessions.user_id = auth.uid()));
CREATE POLICY "Users can delete own attendance" ON training_attendance FOR DELETE USING (EXISTS (SELECT 1 FROM training_sessions WHERE training_sessions.id = training_attendance.session_id AND training_sessions.user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────
-- 7. UPDATED_AT triggers
-- ──────────────────────────────────────────────────────────
CREATE TRIGGER trg_training_exercises_updated_at
  BEFORE UPDATE ON training_exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_training_sessions_updated_at
  BEFORE UPDATE ON training_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
