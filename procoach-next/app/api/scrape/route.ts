/**
 * /api/scrape
 *
 * GET  ?slug=mataronesa-ud-a        → returns job status from scrape_jobs table
 * POST { slug, competition, group, season?, team_name? }
 *      → triggers edge function (fire-and-forget), returns { jobId, status }
 */

import { NextRequest, NextResponse } from 'next/server'

// Supabase project constants — hardcoded so they work on Cloudflare Pages without env
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://nxgyduqprxbhtpqsepgj.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Z3lkdXFwcnhiaHRwcXNlcGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTc5NjcsImV4cCI6MjA4ODU3Mzk2N30.qb-T1ja19sGFyDIOLU6C8SM1OBOa9RnmzEakc9g2Y2U'

// ── GET /api/scrape?slug=... ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 })
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/scrape_jobs?team_slug=eq.${encodeURIComponent(slug)}&order=created_at.desc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    },
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('[GET /api/scrape] Supabase error:', res.status, text.slice(0, 200))
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

  // Check if there's already a running/recent job to avoid duplicate scrapes
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/scrape_jobs?team_slug=eq.${encodeURIComponent(slug)}&order=created_at.desc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      cache: 'no-store',
    },
  )

  if (checkRes.ok) {
    const existing: Array<{ id: string; status: string; updated_at: string }> = await checkRes.json()
    if (existing.length > 0) {
      const job = existing[0]
      // A completed job means data is permanently stored in fcf_player_stats.
      // Never re-trigger — a second user visiting the same team should just
      // get the cached data immediately.
      if (job.status === 'done') {
        return NextResponse.json({ jobId: job.id, status: 'done', cached: true })
      }
      // If already running, return current status so the banner can poll
      if (job.status === 'running' || job.status === 'pending') {
        return NextResponse.json({ jobId: job.id, status: job.status, cached: true })
      }
      // status === 'error': fall through and re-trigger below
    }
  }

  // Extra safety: check if player stats already exist in fcf_player_stats.
  // This covers the case where data was written without a scrape_jobs record,
  // or the record was lost.
  const statsCheckRes = await fetch(
    `${SUPABASE_URL}/rest/v1/fcf_player_stats?team_slug=eq.${encodeURIComponent(slug)}&competition=eq.${encodeURIComponent(competition)}&limit=1&select=id`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      cache: 'no-store',
    },
  )
  if (statsCheckRes.ok) {
    const existingStats: Array<{ id: string }> = await statsCheckRes.json()
    if (existingStats.length > 0) {
      // Data already in DB — no scrape needed, tell banner to refresh
      return NextResponse.json({ jobId: `${season}-${competition}-${slug}`, status: 'done', cached: true })
    }
  }

  // Fire-and-forget: call the edge function
  // The edge function has verify_jwt:false so the anon key is sufficient to invoke it.
  // It uses its own server-side service key internally for DB writes.
  const edgeFnUrl = `${SUPABASE_URL}/functions/v1/scrape-team`
  const jobId = `${season}-${competition}-${slug}`

  // We don't await — the edge function runs independently
  fetch(edgeFnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ slug, competition, group, season, team_name }),
  }).catch(err => {
    console.error('[POST /api/scrape] edge function call failed:', err)
  })

  return NextResponse.json({ jobId, status: 'running' })
}
