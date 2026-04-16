-- Disambiguate team slugs by appending {competition_short_code}-g{group_number}.
-- See procoach-next/lib/team-slug.ts and scraper/team_slug.py for the spec.
--
-- Before: fundacio-unio-esportiva-cornella-a  (collides across 4 competitions)
-- After:  fundacio-unio-esportiva-cornella-a-pc15-g3
--         fundacio-unio-esportiva-cornella-a-pc16-g4
--         fundacio-unio-esportiva-cornella-a-pi14-g2
--         fundacio-unio-esportiva-cornella-a-j1-g12
--
-- Tables touched:
--   fcf_standings.team_slug
--   fcf_matches.home_slug, fcf_matches.away_slug
--   fcf_scorers.team_slug
--   fcf_player_stats.team_slug
--
-- Player slugs are left untouched — players are globally unique by canonical_slug.

BEGIN;

-- ── 1. Helper functions (IMMUTABLE, pure) ────────────────────────────────────

-- Mirror of base_slugify() in Python / baseSlugify() in TS.
-- Postgres does not ship with unaccent in default schema; install if missing.
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION _base_slugify(name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(unaccent(coalesce(name, ''))),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$;

-- Short code per competition (must match COMPETITION_SHORT_CODE in both languages).
CREATE OR REPLACE FUNCTION _competition_short_code(comp text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE comp
    -- Adult
    WHEN 'tercera-federacio' THEN 'tf'
    WHEN 'lliga-elit' THEN 'le'
    WHEN 'primera-catalana' THEN '1c'
    WHEN 'segona-catalana' THEN '2c'
    WHEN 'tercera-catalana' THEN '3c'
    WHEN 'quarta-catalana' THEN '4c'
    -- Juvenil
    WHEN 'divisio-honor-juvenil' THEN 'dhj'
    WHEN 'lliga-nacional-juvenil' THEN 'lnj'
    WHEN 'preferent-juvenils' THEN 'pj'
    WHEN 'juvenil-primera-divisio' THEN 'j1'
    WHEN 'segona-catalana-juvenil' THEN 'j2'
    WHEN 'tercera-catalana-juvenil' THEN 'j3'
    -- Cadet S16
    WHEN 'divisio-honor-cadet-s16' THEN 'dhc16'
    WHEN 'preferent-cadet-s16' THEN 'pc16'
    WHEN 'cadet-primera-divisio-s16' THEN 'c1-16'
    WHEN 'cadet-segona-divisio-s16' THEN 'c2-16'
    -- Cadet S15
    WHEN 'divisio-honor-cadet-s15' THEN 'dhc15'
    WHEN 'preferent-cadet-s15' THEN 'pc15'
    WHEN 'cadet-primera-divisio-s15' THEN 'c1-15'
    WHEN 'cadet-segona-divisio-s15' THEN 'c2-15'
    -- Infantil S14
    WHEN 'divisio-honor-infantil-s14' THEN 'dhi14'
    WHEN 'preferent-infantil-s14' THEN 'pi14'
    WHEN 'primera-divisio-infantil-s14' THEN 'i1-14'
    -- Infantil S13
    WHEN 'divisio-honor-infantil-s13' THEN 'dhi13'
    WHEN 'preferent-infantil-s13' THEN 'pi13'
    WHEN 'infantil-primera-divisio-s13' THEN 'i1-13'
    ELSE _base_slugify(comp)
  END;
$$;

-- Extract numeric part of a group name: 'grup-3' -> 3, 'grup-10' -> 10, else 1.
CREATE OR REPLACE FUNCTION _group_number(grp text)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(
    NULLIF(substring(coalesce(grp, '') from '(\d+)'), '')::int,
    1
  );
$$;

CREATE OR REPLACE FUNCTION compose_team_slug(team_name text, comp text, grp text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT _base_slugify(team_name) || '-' || _competition_short_code(comp)
      || '-g' || _group_number(grp);
$$;

-- ── 2. Rewrite every team_slug / home_slug / away_slug ───────────────────────

UPDATE fcf_standings
SET team_slug = compose_team_slug(team_name, competition, group_name)
WHERE team_name IS NOT NULL AND competition IS NOT NULL;

UPDATE fcf_matches
SET home_slug = compose_team_slug(home_team, competition, group_name),
    away_slug = compose_team_slug(away_team, competition, group_name)
WHERE competition IS NOT NULL;

UPDATE fcf_scorers
SET team_slug = compose_team_slug(team_name, competition, group_name)
WHERE team_name IS NOT NULL AND competition IS NOT NULL;

UPDATE fcf_player_stats
SET team_slug = compose_team_slug(team_name, competition, group_name)
WHERE team_name IS NOT NULL AND competition IS NOT NULL;

-- ── 3. Unique constraint on fcf_standings to prevent future collisions ───────
-- (Skip if it already exists.)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fcf_standings_slug_per_group_unique'
  ) THEN
    ALTER TABLE fcf_standings
      ADD CONSTRAINT fcf_standings_slug_per_group_unique
      UNIQUE (season, competition, group_name, team_slug);
  END IF;
END$$;

COMMIT;
