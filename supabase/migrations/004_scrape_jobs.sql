-- ============================================================
-- NeoScout — scrape_jobs table
-- Tracks on-demand team scraping jobs triggered from the frontend
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scrape_jobs (
  id TEXT PRIMARY KEY,              -- e.g. "2526-tercera-catalana-mataronesa-ud-a"
  team_slug TEXT NOT NULL,
  team_name TEXT,
  competition TEXT NOT NULL,
  group_name TEXT NOT NULL,
  season TEXT NOT NULL DEFAULT '2526',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | running | done | error
  actas_found INT DEFAULT 0,
  actas_scraped INT DEFAULT 0,
  error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_scrape_jobs"
  ON public.scrape_jobs FOR SELECT TO anon USING (true);

CREATE POLICY "service_all_scrape_jobs"
  ON public.scrape_jobs USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_team_slug
  ON public.scrape_jobs(team_slug);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status
  ON public.scrape_jobs(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_scrape_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_scrape_jobs_updated_at
  BEFORE UPDATE ON public.scrape_jobs
  FOR EACH ROW EXECUTE FUNCTION update_scrape_jobs_updated_at();
