-- ─── Exercise Sharing Fields ────────────────────────────
ALTER TABLE training_exercises
  ADD COLUMN IF NOT EXISTS is_public   BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS share_slug  TEXT        UNIQUE,
  ADD COLUMN IF NOT EXISTS shared_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_count INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clone_count INTEGER     NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_training_exercises_share_slug
  ON training_exercises (share_slug) WHERE share_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_training_exercises_is_public
  ON training_exercises (is_public) WHERE is_public = TRUE;

-- Allow anyone (anon + authenticated) to read public exercises
CREATE POLICY "Public exercises readable by anyone"
  ON training_exercises FOR SELECT
  TO anon, authenticated
  USING (is_public = TRUE);

-- ─── Coach Profiles ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_profiles (
  user_id      UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT        NOT NULL DEFAULT '',
  club_name    TEXT        NOT NULL DEFAULT '',
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach profiles readable by anyone"
  ON coach_profiles FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Users manage own coach profile"
  ON coach_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Counter RPCs (SECURITY DEFINER to bypass row-level ownership) ───
CREATE OR REPLACE FUNCTION increment_exercise_share_count(exercise_slug TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE training_exercises
  SET share_count = share_count + 1
  WHERE share_slug = exercise_slug AND is_public = TRUE;
$$;

CREATE OR REPLACE FUNCTION increment_exercise_clone_count(exercise_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE training_exercises
  SET clone_count = clone_count + 1
  WHERE id = exercise_id AND is_public = TRUE;
$$;
