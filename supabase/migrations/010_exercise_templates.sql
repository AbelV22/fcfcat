-- ─── Allow global templates (user_id = NULL, is_template = TRUE) ─────────
-- Templates are curated exercises available to every signed-in user.
-- They live in training_exercises with user_id = NULL.

ALTER TABLE training_exercises
  ALTER COLUMN user_id DROP NOT NULL;

-- Enforce invariant: only templates may have null user_id
ALTER TABLE training_exercises
  ADD CONSTRAINT training_exercises_user_id_or_template
  CHECK (user_id IS NOT NULL OR is_template = TRUE);

-- RLS: templates readable by all authenticated users (not just public ones)
CREATE POLICY "Templates readable by authenticated"
  ON training_exercises FOR SELECT
  TO authenticated
  USING (is_template = TRUE AND user_id IS NULL);

-- Allow anonymous users to read public templates too (for OG images, shared links)
CREATE POLICY "Global templates readable by anon"
  ON training_exercises FOR SELECT
  TO anon
  USING (is_template = TRUE AND user_id IS NULL AND is_public = TRUE);

-- Templates are seeded by scripts/seed-templates.ts using the service role key.
-- Re-run that script after changing training-seed-exercises.ts.
