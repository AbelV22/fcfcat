/**
 * /api/scrape
 *
 * GET  ?slug=mataronesa-ud-a        → returns job status from scrape_jobs table
 * POST { slug, competition, group, season?, team_name? }
 *      → triggers FCF scraping via next/server `after()` (runs on Cloudflare
 *        outbound IPs which are NOT blocked by FCF, unlike Supabase's IPs).
 */

import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { runScrapeInBackground } from '@/lib/fcf-scraper'

// Supabase project constants — hardcoded so they work on Cloudflare Pages without env
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://nxgyduqprxbhtpqsepgj.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Z3lkdXFwcnhiaHRwcXNlcGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTc5NjcsImV4cCI6MjA4ODU3Mzk2N30.qb-T1ja19sGFyDIOLU6C8SM1OBOa9RnmzEakc9g2Y2U'

// ── Rate limiting (in-memory, per-instance) ──────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX_POST = 5       // max 5 scrape triggers per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX_POST
}

// Allowed competition slugs to prevent arbitrary scraping
const ALLOWED_COMPETITIONS = new Set([
  'segona-catalana', 'tercera-catalana', 'preferent-juvenils',
  'juvenil-primera-divisio', 'primera-catalana', 'quarta-catalana',
])

// Validate group format: grup-1 through grup-20
function isValidGroup(g: string): boolean {
  return /^grup-([1-9]|1\d|20)$/.test(g)
}

function sbHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  }
}

// ── GET /api/scrape?slug=... ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 })
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/scrape_jobs?team_slug=eq.${encodeURIComponent(slug)}&order=created_at.desc&limit=1`,
    { headers: sbHeaders(), cache: 'no-store' },
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch job status' }, { status: 502 })
  }

  const rows: Array<{
    id: string
    team_slug: string
    competition: string
    group_name: string
    season: string
    status: string
    actas_found: number
    actas_scraped: number
    error_msg: string | null
    updated_at: string
  }> = await res.json()

  if (rows.length === 0) {
    return NextResponse.json({ status: 'not_found' })
  }

  const job = rows[0]
  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    actas_found: job.actas_found,
    actas_scraped: job.actas_scraped,
    error_msg: job.error_msg,
    updated_at: job.updated_at,
  })
}

// ── POST /api/scrape ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get('cf-connecting-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in a minute.' },
      { status: 429 },
    )
  }

  let body: {
    slug: string
    competition: string
    group: string
    season?: string
    team_name?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { slug, competition, group, season = '2526', team_name = '' } = body

  if (!slug || !competition || !group) {
    return NextResponse.json(
      { error: 'Missing required fields: slug, competition, group' },
      { status: 400 },
    )
  }

  // Validate competition and group to prevent arbitrary scraping
  if (!ALLOWED_COMPETITIONS.has(competition)) {
    return NextResponse.json(
      { error: 'Invalid competition' },
      { status: 400 },
    )
  }
  if (!isValidGroup(group)) {
    return NextResponse.json(
      { error: 'Invalid group format' },
      { status: 400 },
    )
  }

  // Validate slug format (kebab-case, reasonable length)
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) {
    return NextResponse.json(
      { error: 'Invalid slug format' },
      { status: 400 },
    )
  }

  const jobId = `${season}-${competition}-${slug}`

  // ── Check for existing done job ────────────────────────────────────────────
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/scrape_jobs?team_slug=eq.${encodeURIComponent(slug)}&order=created_at.desc&limit=1`,
    { headers: sbHeaders(), cache: 'no-store' },
  )

  if (checkRes.ok) {
    const existing: Array<{ id: string; status: string; actas_scraped: number }> = await checkRes.json()
    if (existing.length > 0) {
      const job = existing[0]
      // Permanently cached — don't re-scrape
      if (job.status === 'done') {
        return NextResponse.json({ jobId: job.id, status: 'done', cached: true, actas_scraped: job.actas_scraped })
      }
      // Already in progress — tell banner to poll
      if (job.status === 'running' || job.status === 'pending') {
        return NextResponse.json({ jobId: job.id, status: job.status, cached: true })
      }
      // status === 'error': fall through and re-trigger
    }
  }

  // ── Extra safety: check if player stats already exist ─────────────────────
  const statsCheckRes = await fetch(
    `${SUPABASE_URL}/rest/v1/fcf_player_stats?team_slug=eq.${encodeURIComponent(slug)}&competition=eq.${encodeURIComponent(competition)}&limit=1&select=id`,
    { headers: sbHeaders(), cache: 'no-store' },
  )
  if (statsCheckRes.ok) {
    const existingStats: Array<{ id: string }> = await statsCheckRes.json()
    if (existingStats.length > 0) {
      return NextResponse.json({ jobId, status: 'done', cached: true, actas_scraped: 1 })
    }
  }

  // ── Create job record (anon key is enough — scrape_jobs RLS allows all) ───
  await fetch(`${SUPABASE_URL}/rest/v1/scrape_jobs?on_conflict=id`, {
    method: 'POST',
    headers: {
      ...sbHeaders(),
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([{
      id: jobId,
      team_slug: slug,
      team_name: team_name || slug,
      competition,
      group_name: group,
      season,
      status: 'running',
      actas_found: 0,
      actas_scraped: 0,
      error_msg: null,
    }]),
  })

  // ── Schedule scraping AFTER the response is sent ───────────────────────────
  // `after()` maps to Cloudflare's ctx.waitUntil() — runs on Cloudflare's
  // outbound IPs which are NOT blocked by FCF (unlike Supabase's IPs).
  after(async () => {
    await runScrapeInBackground({ jobId, slug, teamName: team_name || slug, competition, group, season })
  })

  return NextResponse.json({ jobId, status: 'running' })
}
