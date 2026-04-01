/**
 * supabase-data.ts
 * Async data-fetching functions that read from Supabase tables.
 * Used at build time (force-static server components) so data is baked
 * into the static HTML deployed to Cloudflare Pages.
 *
 * Tables used:
 *   fcf_standings       — official FCF standings per group
 *   fcf_matches         — full calendar (played + upcoming) for all competitions
 *   fcf_scorers         — top scorers per group
 *   fcf_referee_matches — referee acta data (cards, goals) — only competitions with actas
 */

import { createClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils'
// getGoalData no longer needed — goal timing is computed live from Supabase

// Competition display names — mirrors lib/data.ts COMPETITION_NAMES
const COMPETITION_NAMES: Record<string, string> = {
  'tercera-federacio': 'Tercera Federació',
  'lliga-elit': 'Lliga Elit',
  'primera-catalana': 'Primera Catalana',
  'segona-catalana': 'Segona Catalana',
  'tercera-catalana': 'Tercera Catalana',
  'quarta-catalana': 'Quarta Catalana',
  'divisio-honor-juvenil': "Divisió d'Honor Juvenil",
  'lliga-nacional-juvenil': 'Lliga Nacional Juvenil',
  'preferent-juvenils': 'Preferent Juvenil',
  'juvenil-primera-divisio': 'Juvenil Primera Divisió',
  'segona-catalana-juvenil': 'Juvenil Segona Divisió',
  'tercera-catalana-juvenil': 'Juvenil Tercera Divisió',
  'divisio-honor-cadet-s16': "Divisió d'Honor Cadet S16",
  'preferent-cadet-s16': 'Preferent Cadet S16',
  'cadet-primera-divisio-s16': 'Cadet Primera Divisió S16',
  'cadet-segona-divisio-s16': 'Cadet Segona Divisió S16',
  'divisio-honor-cadet-s15': "Divisió d'Honor Cadet S15",
  'preferent-cadet-s15': 'Preferent Cadet S15',
  'cadet-primera-divisio-s15': 'Cadet Primera Divisió S15',
  'cadet-segona-divisio-s15': 'Cadet Segona Divisió S15',
  'divisio-honor-infantil-s14': "Divisió d'Honor Infantil S14",
  'preferent-infantil-s14': 'Preferent Infantil S14',
  'primera-divisio-infantil-s14': 'Infantil Primera Divisió S14',
  'divisio-honor-infantil-s13': "Divisió d'Honor Infantil S13",
  'preferent-infantil-s13': 'Preferent Infantil S13',
  'infantil-primera-divisio-s13': 'Infantil Primera Divisió S13',
}

// Anon key is public by design — safe to expose in client code.
// Supabase RLS policies control what anon users can read.
const DEFAULT_URL = 'https://nxgyduqprxbhtpqsepgj.supabase.co'
const DEFAULT_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Z3lkdXFwcnhiaHRwcXNlcGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTc5NjcsImV4cCI6MjA4ODU3Mzk2N30.qb-T1ja19sGFyDIOLU6C8SM1OBOa9RnmzEakc9g2Y2U'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON
  return createClient(url, key)
}

/** Paginated fetch helper — Supabase returns max 1000 rows per request.
 *  Fetches all rows from a query builder by paging in chunks of 1000. */
async function fetchAllRows<T = any>(
  queryFn: (from: number, to: number) => ReturnType<ReturnType<ReturnType<typeof createClient>['from']>['select']>
): Promise<T[]> {
  const PAGE = 1000
  const all: T[] = []
  let offset = 0
  while (true) {
    const { data, error } = await (queryFn(offset, offset + PAGE - 1) as any)
    if (error || !data || data.length === 0) break
    all.push(...(data as T[]))
    if (data.length < PAGE) break
    offset += PAGE
  }
  return all
}

// ─── Calendar / Resultats ─────────────────────────────────────────────────────

/** Full calendar (past + future) for a competition from fcf_matches table */
export async function getCompetitionCalendarDB(slug: string) {
  const supabase = getSupabase()
  if (!supabase) return []

  const data = await fetchAllRows((from, to) =>
    supabase
      .from('fcf_matches')
      .select('jornada, match_date, match_time, home_team, away_team, home_score, away_score, status, acta_url, group_name')
      .eq('competition', slug)
      .order('jornada', { ascending: true })
      .order('match_date', { ascending: true })
      .range(from, to)
  )

  if (!data || data.length === 0) return []

  return data.map(m => ({
    jornada: m.jornada,
    date: m.match_date || '',
    time: m.match_time || '',
    home_team: m.home_team || '',
    away_team: m.away_team || '',
    home_score: m.home_score ?? null,
    away_score: m.away_score ?? null,
    status: m.status || '',
    acta_url: m.acta_url || '',
    venue: '',
    group: m.group_name || '',
  }))
}

/**
 * Played matches with referee/card data for the Resultats tab.
 *
 * Uses fcf_referee_matches as the primary source because the FCF /calendari/
 * page does not expose inline scores — only "ACTA TANCADA" status — so
 * fcf_matches.home_score is NULL for most played matches. fcf_referee_matches
 * is populated from actual actas and always has scores.
 */
export async function getCompetitionMatchesDB(slug: string) {
  const supabase = getSupabase()
  if (!supabase) return []

  const data = await fetchAllRows((from, to) =>
    supabase
      .from('fcf_referee_matches')
      .select('id, jornada, match_date, home_team, away_team, home_score, away_score, group_name, main_referee, yellow_cards, red_cards')
      .eq('competition', slug)
      .order('jornada', { ascending: false })
      .order('match_date', { ascending: false })
      .range(from, to)
  )

  if (!data || data.length === 0) return []

  return data.map((m: any) => ({
    id: m.id,
    date: m.match_date || '',
    jornada: m.jornada,
    group: m.group_name || '',
    home_team: m.home_team || '',
    away_team: m.away_team || '',
    home_score: m.home_score,
    away_score: m.away_score,
    main_referee: m.main_referee || null,
    yellows: (Array.isArray(m.yellow_cards) ? m.yellow_cards : [])
      .filter((c: any) => c.recipient_type === 'player').length,
    reds: (Array.isArray(m.red_cards) ? m.red_cards : [])
      .filter((c: any) => c.recipient_type === 'player').length,
  }))
}

// ─── FCF Standings ────────────────────────────────────────────────────────────

/** Official FCF standings for a competition (all groups) from fcf_standings */
export async function getCompetitionFCFStandingsDB(slug: string) {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('fcf_standings')
    .select('position, team_name, team_slug, played, won, drawn, lost, goals_for, goals_against, goal_diff, points, form, group_name')
    .eq('competition', slug)
    .order('group_name', { ascending: true })
    .order('position', { ascending: true })

  if (error || !data) return []

  return data.map(s => ({
    position: s.position,
    name: s.team_name || '',
    slug: s.team_slug || slugify(s.team_name || ''),
    played: s.played || 0,
    won: s.won || 0,
    drawn: s.drawn || 0,
    lost: s.lost || 0,
    goals_for: s.goals_for || 0,
    goals_against: s.goals_against || 0,
    goal_diff: s.goal_diff || 0,
    points: s.points || 0,
    form: s.form || '',
    group: s.group_name || '',
  }))
}

/** Teams list for a competition (from standings) */
export async function getCompetitionTeamsDB(slug: string) {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('fcf_standings')
    .select('team_name, team_slug, played, goals_for, goals_against')
    .eq('competition', slug)

  if (error || !data) return []

  return data.map(t => ({
    name: t.team_name || '',
    slug: t.team_slug || slugify(t.team_name || ''),
    played: t.played || 0,
    goals_for: t.goals_for || 0,
    goals_against: t.goals_against || 0,
  }))
}

// ─── Scorers ──────────────────────────────────────────────────────────────────

/** Top scorers for a competition from fcf_scorers */
export async function getCompetitionScorersDB(slug: string) {
  const supabase = getSupabase()
  if (!supabase) return []

  const data = await fetchAllRows((from, to) =>
    supabase
      .from('fcf_scorers')
      .select('player_name, team_name, goals, penalties, matches, goals_per_match, group_name')
      .eq('competition', slug)
      .order('goals', { ascending: false })
      .range(from, to)
  )

  if (!data || data.length === 0) return []

  return data.map(s => ({
    name: s.player_name || '',
    team: s.team_name || '',
    goals: s.goals || 0,
    matches: s.matches || 0,
    goals_per_match: s.goals_per_match || 0,
    penalties: s.penalties || 0,
    group: s.group_name || '',
  }))
}

// ─── Discipline ───────────────────────────────────────────────────────────────

/** Player & team discipline stats from fcf_referee_matches (acta data) */
export async function getCompetitionDisciplineDB(slug: string) {
  const supabase = getSupabase()
  if (!supabase) return { players: [], teams: [], riskPlayers: [] }

  const data = await fetchAllRows((from, to) =>
    supabase
      .from('fcf_referee_matches')
      .select('home_team, away_team, home_score, away_score, yellow_cards, red_cards')
      .eq('competition', slug)
      .range(from, to)
  )

  if (!data || data.length === 0) return { players: [], teams: [], riskPlayers: [] }

  const playerStats: Record<string, { name: string; team: string; yellows: number; reds: number }> = {}
  const teamStats: Record<string, { name: string; slug: string; yellows: number; reds: number; matches: number }> = {}

  for (const m of data) {
    const homeSlug = slugify(m.home_team || '')
    const awaySlug = slugify(m.away_team || '')

    if (m.home_team && !teamStats[homeSlug])
      teamStats[homeSlug] = { name: m.home_team, slug: homeSlug, yellows: 0, reds: 0, matches: 0 }
    if (m.away_team && !teamStats[awaySlug])
      teamStats[awaySlug] = { name: m.away_team, slug: awaySlug, yellows: 0, reds: 0, matches: 0 }

    if (m.home_score !== null && m.away_score !== null) {
      if (teamStats[homeSlug]) teamStats[homeSlug].matches++
      if (teamStats[awaySlug]) teamStats[awaySlug].matches++
    }

    const yellows = Array.isArray(m.yellow_cards) ? m.yellow_cards : []
    const reds = Array.isArray(m.red_cards) ? m.red_cards : []
    const allCards = [...yellows, ...reds]

    for (const card of allCards) {
      if (card.recipient_type !== 'player') continue
      const playerName = card.player
      if (!playerName) continue
      const teamName = card.team === 'home' ? m.home_team : m.away_team
      const tSlug = card.team === 'home' ? homeSlug : awaySlug

      if (!playerStats[playerName])
        playerStats[playerName] = { name: playerName, team: teamName, yellows: 0, reds: 0 }

      if (card.card_type === 'yellow' && !card.is_double_yellow_dismissal) {
        playerStats[playerName].yellows++
        if (teamStats[tSlug]) teamStats[tSlug].yellows++
      } else if (card.card_type === 'red' || card.is_double_yellow_dismissal) {
        playerStats[playerName].reds++
        if (teamStats[tSlug]) teamStats[tSlug].reds++
      }
    }
  }

  const players = Object.values(playerStats)
    .sort((a, b) => (b.yellows * 1 + b.reds * 5) - (a.yellows * 1 + a.reds * 5))
  const teams = Object.values(teamStats)
    .sort((a, b) => (b.yellows + b.reds * 3) - (a.yellows + a.reds * 3))
  // FCF Art.336: suspensió automàtica als 5, 10, 15... grocs. Apercibido = 4, 9, 14...
  const riskPlayers = players.filter(p => p.yellows % 5 === 4)

  return { players, teams, riskPlayers }
}

// ─── Referee Ranking ──────────────────────────────────────────────────────────

/** Referee ranking for a competition from fcf_referee_matches */
export async function getCompetitionRefereeRankingDB(slug: string) {
  const supabase = getSupabase()
  if (!supabase) return []

  const data = await fetchAllRows((from, to) =>
    supabase
      .from('fcf_referee_matches')
      .select('main_referee, yellow_cards, red_cards')
      .eq('competition', slug)
      .range(from, to)
  )

  if (!data || data.length === 0) return []

  const refStats: Record<string, { name: string; slug: string; matches: number; yellows: number; reds: number }> = {}

  for (const m of data) {
    const name = m.main_referee
    if (!name) continue
    const rs = slugify(name)

    if (!refStats[rs]) refStats[rs] = { name, slug: rs, matches: 0, yellows: 0, reds: 0 }

    refStats[rs].matches++
    refStats[rs].yellows += (Array.isArray(m.yellow_cards) ? m.yellow_cards : [])
      .filter((c: any) => c.recipient_type === 'player').length
    refStats[rs].reds += (Array.isArray(m.red_cards) ? m.red_cards : [])
      .filter((c: any) => c.recipient_type === 'player').length
  }

  return Object.values(refStats).map(r => ({
    ...r,
    yellows_per_match: r.matches > 0 ? +(r.yellows / r.matches).toFixed(1) : 0,
    reds_per_match: r.matches > 0 ? +(r.reds / r.matches).toFixed(2) : 0,
  })).sort((a, b) => b.matches - a.matches)
}

// ─── Global / Cerca ───────────────────────────────────────────────────────────

// Priority order for competition deduplication — when the same team slug appears
// in multiple competitions (e.g. a club with adult + youth teams sharing a slug),
// prefer the first matching competition in this list.
const COMPETITION_PRIORITY = [
  'tercera-federacio', 'lliga-elit', 'primera-catalana',
  'segona-catalana', 'tercera-catalana', 'quarta-catalana',
  'divisio-honor-juvenil', 'lliga-nacional-juvenil',
  'preferent-juvenils', 'juvenil-primera-divisio',
  'divisio-honor-cadet-s16', 'divisio-honor-cadet-s15',
]
function competitionRank(c: string) {
  const i = COMPETITION_PRIORITY.indexOf(c)
  return i === -1 ? 999 : i
}

/** All fields from Supabase (replaces fields.json) */
export async function getFieldsDB() {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('fields')
    .select('name, fcf_venue, team, city, address, length_m, width_m, confirmed, notes')
    .order('name')
  if (error || !data) {
    console.error('[getFieldsDB] Supabase error:', error?.message || 'no data')
    return []
  }
  return data as {
    name: string
    fcf_venue: string | null
    team: string | null
    city: string
    address: string | null
    length_m: number
    width_m: number
    confirmed: boolean
    notes: string
  }[]
}

/** All unique teams from standings (for cerca page) */
export async function getAllTeamsDB() {
  const supabase = getSupabase()
  if (!supabase) return []

  const data = await fetchAllRows((from, to) =>
    supabase
      .from('fcf_standings')
      .select('team_name, team_slug, competition, group_name, season')
      .range(from, to)
  )

  if (!data || data.length === 0) {
    console.error('[getAllTeamsDB] Supabase error: no data')
    return []
  }
  console.log(`[getAllTeamsDB] Fetched ${data.length} rows from fcf_standings`)

  // Sort by competition priority so deduplication keeps the most relevant one.
  // Same team_slug can appear in multiple competitions (different age groups or cups).
  data.sort((a, b) => competitionRank(a.competition || '') - competitionRank(b.competition || ''))

  // Deduplicate by slug — first occurrence wins (highest priority competition)
  const seen = new Set<string>()
  return data
    .filter(t => {
      const s = t.team_slug || slugify(t.team_name || '')
      if (seen.has(s)) return false
      seen.add(s)
      return true
    })
    .map(t => ({
      slug: t.team_slug || slugify(t.team_name || ''),
      name: t.team_name || '',
      competition: t.competition || '',
      competitionName: COMPETITION_NAMES[t.competition || ''] || t.competition || '',
      group: t.group_name || '',
      season: t.season || '2526',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** All unique referees aggregated from fcf_referee_matches (for cerca page) */
export async function getAllRefereesDB() {
  const supabase = getSupabase()
  if (!supabase) return []

  const data = await fetchAllRows((from, to) =>
    supabase
      .from('fcf_referee_matches')
      .select('main_referee, competition, yellow_cards, red_cards, match_date')
      .range(from, to)
  )

  if (!data || data.length === 0) return []

  const refMap: Record<string, {
    name: string; slug: string; matches: number; yellows: number; reds: number;
    competitions: Set<string>; lastMatch: string
  }> = {}

  for (const m of data) {
    const name = m.main_referee
    if (!name) continue
    const slug = slugify(name)

    if (!refMap[slug]) {
      refMap[slug] = { name, slug, matches: 0, yellows: 0, reds: 0, competitions: new Set(), lastMatch: '' }
    }
    const r = refMap[slug]
    r.matches++
    r.yellows += (Array.isArray(m.yellow_cards) ? m.yellow_cards : [])
      .filter((c: any) => c.recipient_type === 'player').length
    r.reds += (Array.isArray(m.red_cards) ? m.red_cards : [])
      .filter((c: any) => c.recipient_type === 'player').length
    r.competitions.add(m.competition)
    if ((m.match_date || '') > r.lastMatch) r.lastMatch = m.match_date || ''
  }

  return Object.values(refMap).map(r => ({
    name: r.name,
    slug: r.slug,
    matches: r.matches,
    yellows: r.yellows,
    reds: r.reds,
    competitions: Array.from(r.competitions),
    lastMatch: r.lastMatch,
    yellows_per_match: r.matches > 0 ? +(r.yellows / r.matches).toFixed(2) : 0,
    reds_per_match: r.matches > 0 ? +(r.reds / r.matches).toFixed(2) : 0,
  })).sort((a, b) => b.matches - a.matches)
}

// ─── Team basic data (fallback for pages without local JSON) ─────────────────

/** Basic team info from Supabase — used when local team JSON is unavailable */
export async function getTeamBasicDataDB(slug: string) {
  const supabase = getSupabase()

  // Find team standing by slug — restrict to priority competitions so
  // clubs that also have youth teams don't return the wrong category
  const { data: standingRows } = await supabase
    .from('fcf_standings')
    .select('*')
    .eq('team_slug', slug)
    .in('competition', ['tercera-federacio', 'lliga-elit', 'primera-catalana', 'segona-catalana', 'tercera-catalana', 'quarta-catalana', 'divisio-honor-juvenil', 'lliga-nacional-juvenil', 'preferent-juvenils', 'juvenil-primera-divisio', 'divisio-honor-cadet-s16', 'divisio-honor-cadet-s15'])
    .limit(1)

  const standing = standingRows?.[0] || null
  if (!standing) return null

  const teamName = (standing.team_name || '') as string
  const competition = (standing.competition || '') as string

  // Helper: parse DD-MM-YYYY → Date (returns null if unparseable)
  function parseMatchDate(d: string): Date | null {
    const m = d?.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
    if (!m) return null
    return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Played matches from fcf_referee_matches (has real scores from actas) ──
  // fcf_referee_matches has no home_slug/away_slug, so we use two .eq() queries
  // on home_team/away_team to avoid the PostgREST comma-parsing bug with .or().
  const [homeRefRes, awayRefRes, upcomingRes, groupStandingsRes, playerStatsRes] = await Promise.all([
    supabase
      .from('fcf_referee_matches')
      .select('jornada, match_date, home_team, away_team, home_score, away_score')
      .eq('competition', competition)
      .eq('home_team', teamName)
      .order('jornada', { ascending: false })
      .limit(20),
    supabase
      .from('fcf_referee_matches')
      .select('jornada, match_date, home_team, away_team, home_score, away_score')
      .eq('competition', competition)
      .eq('away_team', teamName)
      .order('jornada', { ascending: false })
      .limit(20),
    // Upcoming matches — fcf_matches has correct future dates even without scores.
    // Filter by competition + group_name to avoid cross-group slug collisions.
    // Fetch 30 candidates and filter by date >= today in JS (DD-MM-YYYY
    // doesn't sort correctly as a string in PostgREST).
    supabase
      .from('fcf_matches')
      .select('jornada, match_date, match_time, home_team, away_team, home_slug, away_slug')
      .eq('competition', competition)
      .eq('group_name', standing.group_name)
      .or(`home_slug.eq.${slug},away_slug.eq.${slug}`)
      .is('home_score', null)
      .order('jornada', { ascending: true })
      .limit(30),
    supabase
      .from('fcf_standings')
      .select('position, team_name, team_slug, played, won, drawn, lost, goals_for, goals_against, goal_diff, points')
      .eq('competition', competition)
      .eq('group_name', standing.group_name)
      .order('position', { ascending: true }),
    supabase
      .from('fcf_player_stats')
      .select('player_name, appearances, starts, goals, yellow_cards, red_cards, minutes_played')
      .eq('team_slug', slug)
      .eq('competition', competition)
      .order('appearances', { ascending: false })
      .limit(35),
  ])

  // Build played matches list (with scores) sorted by jornada desc
  const allPlayedMatches = [
    ...(homeRefRes.data || []).map(m => {
      const gf = m.home_score, ga = m.away_score
      return {
        date: m.match_date || '', jornada: m.jornada,
        opponent: m.away_team || '', opponentSlug: slugify(m.away_team || ''),
        isHome: true, goalsFor: gf, goalsAgainst: ga,
        result: (gf === null || ga === null ? null : gf > ga ? 'W' : gf < ga ? 'L' : 'D') as 'W' | 'D' | 'L' | null,
        referee: null as string | null,
      }
    }),
    ...(awayRefRes.data || []).map(m => {
      const gf = m.away_score, ga = m.home_score
      return {
        date: m.match_date || '', jornada: m.jornada,
        opponent: m.home_team || '', opponentSlug: slugify(m.home_team || ''),
        isHome: false, goalsFor: gf, goalsAgainst: ga,
        result: (gf === null || ga === null ? null : gf > ga ? 'W' : gf < ga ? 'L' : 'D') as 'W' | 'D' | 'L' | null,
        referee: null as string | null,
      }
    }),
  ].sort((a, b) => b.jornada - a.jornada)

  const recentMatches = allPlayedMatches.slice(0, 10)

  // Home/away split goals from actual played matches
  const hasMatchData = allPlayedMatches.length > 0
  const homeMatches = allPlayedMatches.filter(m => m.isHome)
  const awayMatches = allPlayedMatches.filter(m => !m.isHome)
  const homeGF = homeMatches.reduce((s, m) => s + (m.goalsFor ?? 0), 0)
  const homeGA = homeMatches.reduce((s, m) => s + (m.goalsAgainst ?? 0), 0)
  const awayGF = awayMatches.reduce((s, m) => s + (m.goalsFor ?? 0), 0)
  const awayGA = awayMatches.reduce((s, m) => s + (m.goalsAgainst ?? 0), 0)

  // Next upcoming match: first candidate whose date >= today
  const nextRaw = (upcomingRes.data || []).find(m => {
    const d = parseMatchDate(m.match_date || '')
    return !d || d >= today
  }) || null
  const nextMatch = nextRaw ? (() => {
    const isHome = nextRaw.home_slug === slug
    return {
      jornada: nextRaw.jornada,
      date: nextRaw.match_date || '',
      time: nextRaw.match_time || '',
      opponent: isHome ? (nextRaw.away_team || '') : (nextRaw.home_team || ''),
      opponentSlug: isHome ? (nextRaw.away_slug || '') : (nextRaw.home_slug || ''),
      isHome,
      venue: '',
      referee: null as string | null,
      referees: [] as string[],
    }
  })() : null

  const groupStandings = groupStandingsRes.data

  return {
    name: standing.team_name || '',
    slug: standing.team_slug || slug,
    competition: standing.competition || '',
    group: standing.group_name || '',
    position: standing.position || null,
    played: standing.played || 0,
    wins: standing.won || 0,
    draws: standing.drawn || 0,
    losses: standing.lost || 0,
    gf: standing.goals_for || 0,
    ga: standing.goals_against || 0,
    points: standing.points || 0,
    form: standing.form || '',
    standings: (groupStandings || []).map((s: any) => ({
      position: s.position,
      name: s.team_name || '',
      slug: s.team_slug || slugify(s.team_name || ''),
      played: s.played || 0,
      wins: s.won || 0,
      draws: s.drawn || 0,
      losses: s.lost || 0,
      gf: s.goals_for || 0,
      ga: s.goals_against || 0,
      points: s.points || 0,
      // Home/away split not available from standings table
      home_won: 0, home_drawn: 0, home_lost: 0,
      away_won: 0, away_drawn: 0, away_lost: 0,
    })),
    recentMatches,
    nextMatch: nextMatch ? {
      ...nextMatch,
      // Add MatchResult required fields
      goalsFor: null as null,
      goalsAgainst: null as null,
      result: null as null,
    } : null,
    // Player stats from fcf_player_stats (populated when acta data is available)
    players: (playerStatsRes.data || []).map((p: any) => ({
      name: p.player_name || '',
      appearances: p.appearances || 0,
      starts: p.starts || 0,
      goals: p.goals || 0,
      yellow_cards: p.yellow_cards || 0,
      red_cards: p.red_cards || 0,
      minutes_played: p.minutes_played || 0,
      // FCF suspension thresholds: 4, 9, 14 yellow cards
      risk: (p.yellow_cards || 0) % 5 === 4,
    })),
    sanctions: [] as any[],
    goalBuckets: [] as any[],
    home: {
      played: (standing.home_won || 0) + (standing.home_drawn || 0) + (standing.home_lost || 0),
      wins: standing.home_won || 0,
      draws: standing.home_drawn || 0,
      losses: standing.home_lost || 0,
      gf: hasMatchData ? homeGF : null,
      ga: hasMatchData ? homeGA : null,
      points: (standing.home_won || 0) * 3 + (standing.home_drawn || 0),
    },
    away: {
      played: (standing.away_won || 0) + (standing.away_drawn || 0) + (standing.away_lost || 0),
      wins: standing.away_won || 0,
      draws: standing.away_drawn || 0,
      losses: standing.away_lost || 0,
      gf: hasMatchData ? awayGF : null,
      ga: hasMatchData ? awayGA : null,
      points: (standing.away_won || 0) * 3 + (standing.away_drawn || 0),
    },
    rival: null,
    headToHead: [],
  }
}

// ─── Home page aggregate stats ────────────────────────────────────────────────

/**
 * Counts used by the landing page StatsBar.
 * Reads from Supabase so it works on Cloudflare Pages (no local JSON access).
 *   matchCount  — played matches with acta data (rows in fcf_referee_matches)
 *   refereeCount — distinct main referees in fcf_referee_matches
 *   teamCount    — distinct teams in fcf_standings
 */
export async function getHomePageStatsDB(): Promise<{
  matchCount: number
  refereeCount: number
  teamCount: number
}> {
  const supabase = getSupabase()

  const [refMatchRes, standingsRes] = await Promise.all([
    supabase
      .from('fcf_referee_matches')
      .select('main_referee', { count: 'exact', head: false }),
    supabase
      .from('fcf_standings')
      .select('team_name', { count: 'exact', head: false }),
  ])

  const allRefRows = refMatchRes.data || []
  const matchCount = allRefRows.length

  const uniqueReferees = new Set(
    allRefRows.map((r: any) => r.main_referee).filter(Boolean)
  )
  const refereeCount = uniqueReferees.size

  const allTeamRows = standingsRes.data || []
  const uniqueTeams = new Set(
    allTeamRows.map((t: any) => t.team_name).filter(Boolean)
  )
  const teamCount = uniqueTeams.size

  return { matchCount, refereeCount, teamCount }
}

/** Single referee profile by slug from fcf_referee_matches */
export async function getRefereeBySlugDB(slug: string) {
  const supabase = getSupabase()
  if (!supabase) return null

  // Fetch all referee names (paginated) to find the one that maps to this slug
  const nameRows = await fetchAllRows<{ main_referee: string }>((from, to) =>
    supabase
      .from('fcf_referee_matches')
      .select('main_referee')
      .not('main_referee', 'is', null)
      .range(from, to)
  )

  if (!nameRows || nameRows.length === 0) return null

  const refName = nameRows
    .map(r => r.main_referee)
    .find(name => name && slugify(name) === slug)

  if (!refName) return null

  // Fetch all matches for this referee (paginated)
  const matches = await fetchAllRows((from, to) =>
    supabase
      .from('fcf_referee_matches')
      .select('competition, group_name, jornada, match_date, home_team, away_team, home_score, away_score, yellow_cards, red_cards')
      .eq('main_referee', refName)
      .order('match_date', { ascending: false })
      .range(from, to)
  )

  if (!matches || matches.length === 0) return null

  const yellows = matches.flatMap(m =>
    (Array.isArray(m.yellow_cards) ? m.yellow_cards : [])
      .filter((c: any) => c.recipient_type === 'player')
  )
  const reds = matches.flatMap(m =>
    (Array.isArray(m.red_cards) ? m.red_cards : [])
      .filter((c: any) => c.recipient_type === 'player')
  )

  return {
    name: refName,
    slug,
    matches: matches.length,
    yellows: yellows.length,
    reds: reds.length,
    staffCards: 0,
    yellows_per_match: matches.length > 0 ? +(yellows.length / matches.length).toFixed(2) : 0,
    reds_per_match: matches.length > 0 ? +(reds.length / matches.length).toFixed(2) : 0,
    competitions: [...new Set(matches.map(m => m.competition))],
    recentMatches: matches.slice(0, 10).map(m => ({
      date: m.match_date,
      home_team: m.home_team,
      away_team: m.away_team,
      home_score: m.home_score,
      away_score: m.away_score,
      yellows: (Array.isArray(m.yellow_cards) ? m.yellow_cards : [])
        .filter((c: any) => c.recipient_type === 'player').length,
      reds: (Array.isArray(m.red_cards) ? m.red_cards : [])
        .filter((c: any) => c.recipient_type === 'player').length,
      competition: m.competition,
      group: m.group_name,
      jornada: m.jornada,
    })),
  }
}

// ─── Recent results (for /resultats page) ─────────────────────────────────────

/** Recent played matches across all competitions — replaces getRecentResults() local JSON */
export async function getRecentResultsDB(limit = 50) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('fcf_referee_matches')
    .select('id, jornada, match_date, home_team, away_team, home_score, away_score, competition, group_name, main_referee')
    .not('home_score', 'is', null)
    .order('match_date', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map(m => ({
    id: m.id,
    date: m.match_date || '',
    jornada: m.jornada,
    home_team: m.home_team || '',
    away_team: m.away_team || '',
    home_score: m.home_score,
    away_score: m.away_score,
    competition: m.competition || '',
    group: m.group_name || '',
    main_referee: m.main_referee || null,
  }))
}

// ─── Full team report (SSR — replaces buildTeamReport filesystem reader) ──────

type SplitStats = { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number }
type PlayerEntry = { name: string; appearances: number; starts: number; goals: number; yellow_cards: number; red_cards: number; minutes_played: number; risk: boolean }

/** Competitions where FCF actas lack substitution data — minutes are unreliable */
export const COMPETITIONS_WITHOUT_MINUTES = new Set([
  'quarta-catalana',
  'juvenil-primera-divisio',
  'preferent-juvenils',
])
type MatchEntry = { date: string; jornada: number; opponent: string; opponentSlug: string; isHome: boolean; goalsFor: number | null; goalsAgainst: number | null; result: 'W' | 'D' | 'L' | null; referee: string | null }
type StandingEntry = { position: number; name: string; slug: string; played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number }
type GoalBucketEntry = { label: string; scored: number; conceded: number }

export type RivalInsights = {
  comebackRate: number | null        // % matches where they were trailing at some point AND drew/won
  scoreFirstWinRate: number | null   // % of matches where they scored first AND won
  concededFirstWinRate: number | null // % of matches where opponent scored first AND rival won
  cleanSheetRate: number | null      // % of played matches with 0 goals conceded
  lateGoalRate: number | null        // % of goals scored in min 75+
  firstHalfGoals: number
  secondHalfGoals: number
  matchesAnalyzed: number            // matches that had goal-level data
}

// Goal timing bucket definitions for computeGoalBucketsFromRefs
const GOAL_BUCKETS = [
  { label: "1–15'",  min: 1,  max: 15  },
  { label: "16–30'", min: 16, max: 30  },
  { label: "31–45'", min: 31, max: 45  },
  { label: "46–60'", min: 46, max: 60  },
  { label: "61–75'", min: 61, max: 75  },
  { label: "76–90'", min: 76, max: 999 },
]

/** Parse a goal minute string like "45+2", "90", "18" → integer */
function _parseGoalMinute(m: string | number | undefined): number {
  const s = String(m ?? '0')
  const match = s.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

type RefMatch = {
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  competition: string
  group: string
  goals?: Array<{ player: string; minute: string | number; team: 'home' | 'away' }>
  home_slug?: string
  away_slug?: string
}

/**
 * Compute goal timing buckets from global_referees.json match data.
 * Identifies which side is "our team" by matching slug to home/away team name.
 */
export function computeGoalBucketsFromRefs(matches: RefMatch[], teamSlug: string): GoalBucketEntry[] {
  const buckets = GOAL_BUCKETS.map(b => ({ label: b.label, scored: 0, conceded: 0, min: b.min, max: b.max }))

  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue
    if (!Array.isArray(m.goals) || m.goals.length === 0) continue

    const isHome = slugify(m.home_team || '') === teamSlug
    const side = isHome ? 'home' : 'away'
    const opSide = isHome ? 'away' : 'home'

    for (const g of m.goals) {
      const min = _parseGoalMinute(g.minute)
      const bucket = buckets.find(b => min >= b.min && min <= b.max)
      if (!bucket) continue
      if (g.team === side) bucket.scored++
      else if (g.team === opSide) bucket.conceded++
    }
  }

  return buckets.map(({ label, scored, conceded }) => ({ label, scored, conceded }))
}

/**
 * Compute rival insights from goal-event-level data in global_referees.json.
 * All stats are from the rival's perspective.
 */
export function computeRivalInsights(matches: RefMatch[], rivalSlug: string): RivalInsights {
  let matchesAnalyzed = 0
  let comebackMatches = 0
  let comebackOpportunities = 0
  let scoreFirstWins = 0
  let scoreFirstTotal = 0
  let concededFirstWins = 0
  let concededFirstTotal = 0
  let cleanSheets = 0
  let lateGoals = 0
  let totalGoals = 0
  let firstHalfGoals = 0
  let secondHalfGoals = 0

  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue

    const isHome = slugify(m.home_team || '') === rivalSlug
    const rivalSide: 'home' | 'away' = isHome ? 'home' : 'away'
    const finalGF = isHome ? (m.home_score ?? 0) : (m.away_score ?? 0)
    const finalGA = isHome ? (m.away_score ?? 0) : (m.home_score ?? 0)

    matchesAnalyzed++

    const hasGoalData = Array.isArray(m.goals) && m.goals.length > 0

    // Clean sheet: rival conceded 0 goals
    if (finalGA === 0) cleanSheets++

    if (!hasGoalData) continue

    const goals = [...(m.goals || [])].sort((a, b) =>
      _parseGoalMinute(a.minute) - _parseGoalMinute(b.minute)
    )

    // Reconstruct score progression to detect comebacks + who scored first
    let rivalScore = 0
    let opScore = 0
    let rivalWasTrailing = false
    let rivalScoredFirst = false
    let opponentScoredFirst = false
    let firstGoalRecorded = false

    for (const g of goals) {
      if (!firstGoalRecorded) {
        if (g.team === rivalSide) rivalScoredFirst = true
        else opponentScoredFirst = true
        firstGoalRecorded = true
      }
      if (g.team === rivalSide) rivalScore++
      else opScore++

      if (rivalScore < opScore) rivalWasTrailing = true
    }

    // Comeback: was trailing at some point AND ended with D or W
    if (rivalWasTrailing) {
      comebackOpportunities++
      if (finalGF >= finalGA) comebackMatches++
    }

    // Score first win rate
    if (rivalScoredFirst) {
      scoreFirstTotal++
      if (finalGF > finalGA) scoreFirstWins++
    }

    // Conceded first win rate
    if (opponentScoredFirst) {
      concededFirstTotal++
      if (finalGF > finalGA) concededFirstWins++
    }

    // Goal timing stats
    for (const g of goals) {
      if (g.team !== rivalSide) continue
      const min = _parseGoalMinute(g.minute)
      totalGoals++
      if (min >= 75) lateGoals++
      if (min >= 1 && min <= 45) firstHalfGoals++
      else if (min >= 46) secondHalfGoals++
    }
  }

  return {
    comebackRate: comebackOpportunities > 0 ? Math.round((comebackMatches / comebackOpportunities) * 100) : null,
    scoreFirstWinRate: scoreFirstTotal > 0 ? Math.round((scoreFirstWins / scoreFirstTotal) * 100) : null,
    concededFirstWinRate: concededFirstTotal > 0 ? Math.round((concededFirstWins / concededFirstTotal) * 100) : null,
    cleanSheetRate: matchesAnalyzed > 0 ? Math.round((cleanSheets / matchesAnalyzed) * 100) : null,
    lateGoalRate: totalGoals > 0 ? Math.round((lateGoals / totalGoals) * 100) : null,
    firstHalfGoals,
    secondHalfGoals,
    matchesAnalyzed,
  }
}

export type RefereeStatsDB = {
  name: string
  slug: string
  matches: number
  yellows: number
  reds: number
  yellows_per_match: number
  reds_per_match: number
  matches_with_red_pct: number
  recentMatches: Array<{ date: string; home_team: string; away_team: string; home_score: number | null; away_score: number | null; yellows: number; reds: number; competition: string; jornada: number }>
  // Percentiles (0-100, how strict vs all referees this season with ≥3 matches)
  yellows_percentile: number
  reds_percentile: number
  // Division-specific percentiles (within the coach's competition only)
  division_yellows_percentile: number
  division_reds_percentile: number
  division_name: string  // display name for the division used
  division_referee_count: number  // how many referees in this division sample
  // Card distribution home/away
  home_yellows: number
  away_yellows: number
  home_reds: number
  away_reds: number
  home_bias: number | null  // home_yellows/total_yellows * 100, null if 0 yellows
  // Half-time split (requires minute field on cards; 0 if not available)
  first_half_cards: number
  second_half_cards: number
  first_half_yellows: number
  second_half_yellows: number
  first_half_reds: number
  second_half_reds: number
  // Competition breakdown
  competitionBreakdown: Array<{ competition: string; matches: number; yellows: number; reds: number }>
  // Goals context
  avg_goals_per_match: number
  // Severity score (0-100) — composite strictness index
  severity_score: number
  // Whether referee is predicted (most recent in group) vs officially assigned
  predicted: boolean
}

export type RivalDataDB = {
  name: string
  slug: string
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  points: number
  position: number | null
  home: SplitStats
  away: SplitStats
  players: PlayerEntry[]
  form: MatchEntry[]
  topScorers: PlayerEntry[]
  mostMinutes: PlayerEntry[]
  apercibits: PlayerEntry[]
  goalBuckets: GoalBucketEntry[]
  awayByFieldSize: never[]  // not available from Supabase; always empty
  insights: RivalInsights | null
}

export type FieldDimsDB = {
  length_m: number
  width_m: number
  field_name: string
}

export type FullTeamReportDB = {
  name: string
  slug: string
  competition: string
  group: string
  position: number | null
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  points: number
  home: SplitStats
  away: SplitStats
  players: PlayerEntry[]
  form: MatchEntry[]
  goalBuckets: GoalBucketEntry[]
  standings: StandingEntry[]
  sanctions: never[]
  nextMatch: (MatchEntry & { venue: string; time: string; referees: string[] }) | null
  rival: RivalDataDB | null
  headToHead: MatchEntry[]
  referee: RefereeStatsDB | null
  homePitch: FieldDimsDB | null
  rivalPitch: FieldDimsDB | null
  fieldSizeRecord: Record<string, { played: number; wins: number; draws: number; losses: number; gf: number; ga: number }> | null
}

function _splitStats(matches: Array<{ isHome: boolean; goalsFor: number; goalsAgainst: number }>, filter?: 'home' | 'away'): SplitStats {
  let played = 0, wins = 0, draws = 0, losses = 0, gf = 0, ga = 0
  for (const m of matches) {
    if (filter === 'home' && !m.isHome) continue
    if (filter === 'away' && m.isHome) continue
    played++
    gf += m.goalsFor
    ga += m.goalsAgainst
    if (m.goalsFor > m.goalsAgainst) wins++
    else if (m.goalsFor === m.goalsAgainst) draws++
    else losses++
  }
  return { played, wins, draws, losses, gf, ga, points: wins * 3 + draws }
}

function _toMatchEntry(m: any, isHome: boolean, teamName: string): MatchEntry {
  const opponent = isHome ? (m.away_team || '') : (m.home_team || '')
  const gf = isHome ? m.home_score : m.away_score
  const ga = isHome ? m.away_score : m.home_score
  return {
    date: m.match_date || '',
    jornada: m.jornada || 0,
    opponent,
    opponentSlug: slugify(opponent),
    isHome,
    goalsFor: gf ?? null,
    goalsAgainst: ga ?? null,
    result: gf !== null && ga !== null ? (gf > ga ? 'W' : gf < ga ? 'L' : 'D') : null,
    referee: m.main_referee || null,
  }
}

function _parseMatchDate(d: string): Date | null {
  const m = (d || '').match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (!m) return null
  return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
}

/**
 * Full team report from Supabase — SSR replacement for buildTeamReport().
 * Two parallel query rounds: first for team data, second for rival + referee.
 *
 * @param competitionHint — if provided, filters standings to this specific competition
 *   (avoids slug collisions across competitions). If omitted, falls back to priority
 *   competition ordering (adult competitions preferred over youth).
 */
export async function getFullTeamReportDB(slug: string, competitionHint?: string): Promise<FullTeamReportDB | null> {
  const supabase = getSupabase()

  // Priority order for resolving slug collisions across competitions.
  // Adult competitions come first so that, e.g., poble-nou-at-a resolves to
  // quarta-catalana rather than juvenil-primera-divisio.
  const COMPETITION_PRIORITY = [
    'tercera-federacio',
    'lliga-elit',
    'primera-catalana',
    'segona-catalana',
    'tercera-catalana',
    'quarta-catalana',
    'divisio-honor-juvenil',
    'lliga-nacional-juvenil',
    'preferent-juvenils',
    'juvenil-primera-divisio',
    'divisio-honor-cadet-s16',
    'divisio-honor-cadet-s15',
  ]

  // ── Round 1: Find team standing ──────────────────────────────────────────
  // IMPORTANT: filter to priority competitions only — many clubs share
  // the same slug across youth categories (e.g. parets-cf-a in 6 competitions).
  // Without this filter, LIMIT 1 returns a random youth category row.
  let standingQuery = supabase
    .from('fcf_standings')
    .select('*')
    .eq('team_slug', slug)

  if (competitionHint) {
    standingQuery = standingQuery.eq('competition', competitionHint)
  } else {
    standingQuery = standingQuery.in('competition', COMPETITION_PRIORITY)
  }

  const { data: standingRows, error: standingErr } = await standingQuery

  if (standingErr) {
    console.error('[getFullTeamReportDB] standings error for', slug, standingErr)
  }

  // If a hint was provided, take the first row. Otherwise pick by priority order.
  let standing: any = null
  if (competitionHint) {
    standing = standingRows?.[0]
  } else if (standingRows && standingRows.length > 0) {
    if (standingRows.length === 1) {
      standing = standingRows[0]
    } else {
      // Multiple rows — pick the one with the highest priority competition
      standing = standingRows.slice().sort((a: any, b: any) => {
        const ai = COMPETITION_PRIORITY.indexOf(a.competition ?? '')
        const bi = COMPETITION_PRIORITY.indexOf(b.competition ?? '')
        const aRank = ai === -1 ? 999 : ai
        const bRank = bi === -1 ? 999 : bi
        return aRank - bRank
      })[0]
    }
  }
  if (!standing) {
    console.warn('[getFullTeamReportDB] no standing row found for slug:', slug, '| rows:', standingRows)
    return null
  }

  const teamName = (standing.team_name || '') as string
  const competition = (standing.competition || '') as string
  const groupName = (standing.group_name || '') as string
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Round 1 parallel: matches + upcoming + standings + player stats ──────
  const [homeRefRes, awayRefRes, upcomingRes, groupStandingsRes, playerStatsRes] = await Promise.all([
    supabase
      .from('fcf_referee_matches')
      .select('jornada, match_date, home_team, away_team, home_score, away_score, main_referee')
      .eq('competition', competition)
      .eq('home_team', teamName)
      .not('home_score', 'is', null)
      .order('jornada', { ascending: false })
      .limit(20),
    supabase
      .from('fcf_referee_matches')
      .select('jornada, match_date, home_team, away_team, home_score, away_score, main_referee')
      .eq('competition', competition)
      .eq('away_team', teamName)
      .not('away_score', 'is', null)
      .order('jornada', { ascending: false })
      .limit(20),
    // Fetch ALL calendar entries for this team (scores never written to fcf_matches,
    // so .is('home_score', null) matches everything — we filter by date in JS).
    // Need all 30+ jornadas to find the first one with date >= today.
    supabase
      .from('fcf_matches')
      .select('jornada, match_date, match_time, home_team, away_team, home_slug, away_slug, referee')
      .eq('competition', competition)
      .eq('group_name', groupName)
      .or(`home_slug.eq.${slug},away_slug.eq.${slug}`)
      .order('jornada', { ascending: true })
      .limit(35),
    supabase
      .from('fcf_standings')
      .select('position, team_name, team_slug, played, won, drawn, lost, goals_for, goals_against, points')
      .eq('competition', competition)
      .eq('group_name', groupName)
      .order('position', { ascending: true }),
    supabase
      .from('fcf_player_stats')
      .select('player_name, appearances, starts, goals, yellow_cards, red_cards, minutes_played')
      .eq('team_slug', slug)
      .eq('competition', competition)
      .order('appearances', { ascending: false })
      .limit(35),
  ])

  // Build played matches list
  const homePlayed = (homeRefRes.data || []).map(m => ({ ...m, isHome: true, goalsFor: m.home_score as number, goalsAgainst: m.away_score as number }))
  const awayPlayed = (awayRefRes.data || []).map(m => ({ ...m, isHome: false, goalsFor: m.away_score as number, goalsAgainst: m.home_score as number }))
  const allPlayed = [...homePlayed, ...awayPlayed].sort((a, b) => b.jornada - a.jornada)

  // Upcoming match
  const nextRaw = (upcomingRes.data || []).find(m => {
    const d = _parseMatchDate(m.match_date || '')
    return !d || d >= today
  }) || null

  const nextMatch = nextRaw ? (() => {
    const isHome = (nextRaw as any).home_slug === slug
    const opponent = isHome ? ((nextRaw as any).away_team || '') : ((nextRaw as any).home_team || '')
    const referee = (nextRaw as any).referee || null
    return {
      jornada: (nextRaw as any).jornada || 0,
      date: (nextRaw as any).match_date || '',
      time: (nextRaw as any).match_time || '',
      opponent,
      opponentSlug: isHome ? ((nextRaw as any).away_slug || slugify(opponent)) : ((nextRaw as any).home_slug || slugify(opponent)),
      isHome,
      venue: '',
      referee,
      referees: referee ? [referee] : [] as string[],
      goalsFor: null as null,
      goalsAgainst: null as null,
      result: null as null,
    }
  })() : null

  // Players
  const players: PlayerEntry[] = (playerStatsRes.data || []).map((p: any) => ({
    name: p.player_name || '',
    appearances: p.appearances || 0,
    starts: p.starts || 0,
    goals: p.goals || 0,
    yellow_cards: p.yellow_cards || 0,
    red_cards: p.red_cards || 0,
    minutes_played: p.minutes_played || 0,
    risk: (p.yellow_cards || 0) % 5 === 4,
  }))

  // Group standings
  const standings: StandingEntry[] = (groupStandingsRes.data || []).map((s: any) => ({
    position: s.position || 0,
    name: s.team_name || '',
    slug: s.team_slug || slugify(s.team_name || ''),
    played: s.played || 0,
    wins: s.won || 0,
    draws: s.drawn || 0,
    losses: s.lost || 0,
    gf: s.goals_for || 0,
    ga: s.goals_against || 0,
    points: s.points || 0,
  }))

  // Form (last 8 played, most recent first)
  const form: MatchEntry[] = allPlayed.slice(0, 8).map(m => _toMatchEntry(m, m.isHome, teamName))

  // Home/away split using standing data (most accurate).
  // GF/GA: use referee_matches sums ONLY when we have all actas (totals match standings).
  // If any actas are missing, the home/away goal split would be wrong — use standings totals
  // for overall GF/GA and leave home/away GF/GA as the sum from available actas.
  const homePlayedCount = (standing.home_won || 0) + (standing.home_drawn || 0) + (standing.home_lost || 0)
  const awayPlayedCount = (standing.away_won || 0) + (standing.away_drawn || 0) + (standing.away_lost || 0)
  const allActasPresent = homePlayed.length === homePlayedCount && awayPlayed.length === awayPlayedCount

  const homeGfFromActas = homePlayed.reduce((s, m) => s + (m.goalsFor || 0), 0)
  const homeGaFromActas = homePlayed.reduce((s, m) => s + (m.goalsAgainst || 0), 0)
  const awayGfFromActas = awayPlayed.reduce((s, m) => s + (m.goalsFor || 0), 0)
  const awayGaFromActas = awayPlayed.reduce((s, m) => s + (m.goalsAgainst || 0), 0)

  const home: SplitStats = {
    played: homePlayedCount,
    wins: standing.home_won || 0,
    draws: standing.home_drawn || 0,
    losses: standing.home_lost || 0,
    gf: allActasPresent ? homeGfFromActas : homeGfFromActas,
    ga: allActasPresent ? homeGaFromActas : homeGaFromActas,
    points: (standing.home_won || 0) * 3 + (standing.home_drawn || 0),
  }
  const away: SplitStats = {
    played: awayPlayedCount,
    wins: standing.away_won || 0,
    draws: standing.away_drawn || 0,
    losses: standing.away_lost || 0,
    gf: allActasPresent ? awayGfFromActas : awayGfFromActas,
    ga: allActasPresent ? awayGaFromActas : awayGaFromActas,
    points: (standing.away_won || 0) * 3 + (standing.away_drawn || 0),
  }

  // ── Round 2: rival + referee + h2h in parallel ────────────────────────────
  const rivalSlug = nextMatch?.opponentSlug || ''
  const rivalName = nextMatch?.opponent || ''
  // fcf_matches.referee is populated by update_upcoming_referees.py which scrapes
  // the FCF acta page before each match weekend.
  const refereeName = nextMatch?.referee || ''
  const refereeIsPredicted = false

  // Senior-level competitions — only these count for referee stats & percentiles.
  // Excludes cadets, infantils, and lower juvenil (different refereeing dynamics).
  const SENIOR_LEVEL_COMPETITIONS = [
    'tercera-federacio', 'lliga-elit', 'primera-catalana',
    'segona-catalana', 'tercera-catalana', 'quarta-catalana',
    'divisio-honor-juvenil', 'lliga-nacional-juvenil', 'preferent-juvenils',
  ]

  const [rivalStandingRes, rivalHomeRes, rivalAwayRes, rivalPlayersRes, refereeMatchesRes, h2hHomeRes, h2hAwayRes, fieldsRes, allRefereesRes, teamGoalsHomeRes, teamGoalsAwayRes] = await Promise.all([
    rivalSlug
      ? supabase.from('fcf_standings').select('position, team_name, team_slug, played, won, drawn, lost, goals_for, goals_against, points, home_won, home_drawn, home_lost, away_won, away_drawn, away_lost').eq('team_slug', rivalSlug).eq('competition', competition).limit(1)
      : Promise.resolve({ data: [] as any[] }),
    rivalName
      ? supabase.from('fcf_referee_matches').select('jornada, match_date, home_team, away_team, home_score, away_score, main_referee, goals').eq('competition', competition).eq('home_team', rivalName).not('home_score', 'is', null).order('jornada', { ascending: false }).limit(15)
      : Promise.resolve({ data: [] as any[] }),
    rivalName
      ? supabase.from('fcf_referee_matches').select('jornada, match_date, home_team, away_team, home_score, away_score, main_referee, goals').eq('competition', competition).eq('away_team', rivalName).not('away_score', 'is', null).order('jornada', { ascending: false }).limit(15)
      : Promise.resolve({ data: [] as any[] }),
    rivalSlug
      ? supabase.from('fcf_player_stats').select('player_name, appearances, starts, goals, yellow_cards, red_cards, minutes_played').eq('team_slug', rivalSlug).eq('competition', competition).order('appearances', { ascending: false }).limit(30)
      : Promise.resolve({ data: [] as any[] }),
    refereeName
      ? supabase.from('fcf_referee_matches').select('competition, jornada, match_date, home_team, away_team, home_score, away_score, yellow_cards, red_cards').eq('main_referee', refereeName).in('competition', SENIOR_LEVEL_COMPETITIONS).order('match_date', { ascending: false }).limit(50)
      : Promise.resolve({ data: [] as any[] }),
    // H2H: team at home vs rival away
    rivalName && teamName
      ? supabase.from('fcf_referee_matches').select('jornada, match_date, home_team, away_team, home_score, away_score, main_referee').eq('home_team', teamName).eq('away_team', rivalName).not('home_score', 'is', null).order('match_date', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] as any[] }),
    // H2H: rival at home vs team away
    rivalName && teamName
      ? supabase.from('fcf_referee_matches').select('jornada, match_date, home_team, away_team, home_score, away_score, main_referee').eq('home_team', rivalName).eq('away_team', teamName).not('home_score', 'is', null).order('match_date', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] as any[] }),
    // Field dimensions for PitchCompare (team + rival)
    supabase.from('fields').select('name, team, fcf_venue, length_m, width_m').order('name'),
    // Global referee stats for percentile computation — senior-level only
    refereeName
      ? supabase.from('fcf_referee_matches').select('main_referee, competition, yellow_cards, red_cards, home_score, away_score').in('competition', SENIOR_LEVEL_COMPETITIONS).not('main_referee', 'is', null).limit(5000)
      : Promise.resolve({ data: [] as any[] }),
    // Team goals data for goal timing (home matches)
    supabase.from('fcf_referee_matches').select('competition, group_name, home_team, away_team, home_score, away_score, goals').eq('competition', competition).eq('home_team', teamName).not('home_score', 'is', null).order('jornada', { ascending: false }),
    // Team goals data for goal timing (away matches)
    supabase.from('fcf_referee_matches').select('competition, group_name, home_team, away_team, home_score, away_score, goals').eq('competition', competition).eq('away_team', teamName).not('away_score', 'is', null).order('jornada', { ascending: false }),
  ])

  // ── Compute goal timing from Supabase (live, covers ALL teams) ───────────
  const _mapGoalRow = (r: any): RefMatch => ({ ...r, group: r.group_name || '' })
  const teamGoalMatches: RefMatch[] = [
    ...(teamGoalsHomeRes.data || []).map(_mapGoalRow),
    ...(teamGoalsAwayRes.data || []).map(_mapGoalRow),
  ]
  const teamGoalBuckets: GoalBucketEntry[] = computeGoalBucketsFromRefs(teamGoalMatches, slug)

  // ── Build rival ────────────────────────────────────────────────────────────
  let rival: RivalDataDB | null = null
  if (rivalSlug && rivalName) {
    const rs = (rivalStandingRes.data || [])[0] as any
    const rHomePlayed = (rivalHomeRes.data || []).map((m: any) => ({ ...m, isHome: true, goalsFor: m.home_score as number, goalsAgainst: m.away_score as number }))
    const rAwayPlayed = (rivalAwayRes.data || []).map((m: any) => ({ ...m, isHome: false, goalsFor: m.away_score as number, goalsAgainst: m.home_score as number }))
    const rAllPlayed = [...rHomePlayed, ...rAwayPlayed].sort((a, b) => b.jornada - a.jornada)

    const rivalPlayers: PlayerEntry[] = (rivalPlayersRes.data || []).map((p: any) => ({
      name: p.player_name || '',
      appearances: p.appearances || 0,
      starts: p.starts || 0,
      goals: p.goals || 0,
      yellow_cards: p.yellow_cards || 0,
      red_cards: p.red_cards || 0,
      minutes_played: p.minutes_played || 0,
      risk: (p.yellow_cards || 0) % 5 === 4,
    }))

    // Rival home/away GF/GA: use acta sums (real data from available matches)
    const rHome: SplitStats = rs
      ? { played: (rs.home_won||0)+(rs.home_drawn||0)+(rs.home_lost||0), wins: rs.home_won||0, draws: rs.home_drawn||0, losses: rs.home_lost||0, gf: rHomePlayed.reduce((s:number,m:any)=>s+(m.goalsFor||0),0), ga: rHomePlayed.reduce((s:number,m:any)=>s+(m.goalsAgainst||0),0), points: (rs.home_won||0)*3+(rs.home_drawn||0) }
      : _splitStats(rAllPlayed, 'home')
    const rAway: SplitStats = rs
      ? { played: (rs.away_won||0)+(rs.away_drawn||0)+(rs.away_lost||0), wins: rs.away_won||0, draws: rs.away_drawn||0, losses: rs.away_lost||0, gf: rAwayPlayed.reduce((s:number,m:any)=>s+(m.goalsFor||0),0), ga: rAwayPlayed.reduce((s:number,m:any)=>s+(m.goalsAgainst||0),0), points: (rs.away_won||0)*3+(rs.away_drawn||0) }
      : _splitStats(rAllPlayed, 'away')

    // Rival goal timing + insights — computed live from Supabase goals data
    const rivalGoalMatches: RefMatch[] = [
      ...(rivalHomeRes.data || []).map(_mapGoalRow),
      ...(rivalAwayRes.data || []).map(_mapGoalRow),
    ]
    const rivalGoalBuckets: GoalBucketEntry[] = computeGoalBucketsFromRefs(rivalGoalMatches, rivalSlug)
    const rivalInsights: RivalInsights | null = rivalGoalMatches.length >= 3
      ? computeRivalInsights(rivalGoalMatches, rivalSlug)
      : null

    rival = {
      name: rivalName,
      slug: rivalSlug,
      played: rs?.played || rAllPlayed.length,
      wins: rs?.won || rAllPlayed.filter((m:any) => m.goalsFor > m.goalsAgainst).length,
      draws: rs?.drawn || rAllPlayed.filter((m:any) => m.goalsFor === m.goalsAgainst).length,
      losses: rs?.lost || rAllPlayed.filter((m:any) => m.goalsFor < m.goalsAgainst).length,
      gf: rs?.goals_for ?? rAllPlayed.reduce((s:number,m:any)=>s+(m.goalsFor||0),0),
      ga: rs?.goals_against ?? rAllPlayed.reduce((s:number,m:any)=>s+(m.goalsAgainst||0),0),
      points: rs ? (rs.won||0)*3+(rs.drawn||0) : 0,
      position: rs?.position ?? null,
      home: rHome,
      away: rAway,
      players: rivalPlayers,
      form: rAllPlayed.slice(0, 5).map((m:any) => _toMatchEntry(m, m.isHome, rivalName)),
      topScorers: [...rivalPlayers].sort((a,b) => b.goals - a.goals).filter(p => p.goals > 0).slice(0, 5),
      mostMinutes: COMPETITIONS_WITHOUT_MINUTES.has(competition)
        ? [...rivalPlayers].sort((a,b) => b.starts - a.starts).filter(p => p.starts > 0).slice(0, 7)
        : [...rivalPlayers].sort((a,b) => b.minutes_played - a.minutes_played).filter(p => p.minutes_played > 0).slice(0, 7),
      apercibits: rivalPlayers.filter(p => p.risk),
      goalBuckets: rivalGoalBuckets,
      awayByFieldSize: [],    // pitch dimension data not available from Supabase
      insights: rivalInsights,
    }
  }

  // ── Build head-to-head ─────────────────────────────────────────────────────
  const h2hAll = [
    ...(h2hHomeRes.data || []).map((m: any) => ({ ...m, wasHome: true })),
    ...(h2hAwayRes.data || []).map((m: any) => ({ ...m, wasHome: false })),
  ].sort((a: any, b: any) => (b.match_date || '').localeCompare(a.match_date || '')).slice(0, 5)

  const headToHead: MatchEntry[] = h2hAll.map((m: any) => _toMatchEntry(m, m.wasHome, teamName))

  // ── Build referee stats ────────────────────────────────────────────────────
  let referee: RefereeStatsDB | null = null
  if (refereeName && (refereeMatchesRes.data || []).length > 0) {
    const rm = refereeMatchesRes.data as any[]

    // Basic card counts
    const allYellowCards = rm.flatMap(m => (Array.isArray(m.yellow_cards) ? m.yellow_cards : []).filter((c: any) => c.recipient_type === 'player'))
    const allRedCards = rm.flatMap(m => (Array.isArray(m.red_cards) ? m.red_cards : []).filter((c: any) => c.recipient_type === 'player'))
    const totalYellows = allYellowCards.length
    const totalReds = allRedCards.length
    const matchesWithRed = rm.filter(m => (Array.isArray(m.red_cards) ? m.red_cards : []).some((c: any) => c.recipient_type === 'player')).length

    // Home/away card split
    const home_yellows = allYellowCards.filter((c: any) => c.team === 'home').length
    const away_yellows = allYellowCards.filter((c: any) => c.team === 'away').length
    const home_reds = allRedCards.filter((c: any) => c.team === 'home').length
    const away_reds = allRedCards.filter((c: any) => c.team === 'away').length
    const home_bias = totalYellows > 0 ? Math.round((home_yellows / totalYellows) * 100) : null

    // Half-time split (cards with a numeric minute field)
    let first_half_cards = 0
    let second_half_cards = 0
    let first_half_yellows = 0
    let second_half_yellows = 0
    let first_half_reds = 0
    let second_half_reds = 0
    for (const c of allYellowCards) {
      if (c.minute !== undefined && c.minute !== null) {
        const min = _parseGoalMinute(c.minute)
        if (min >= 1 && min <= 45) { first_half_cards++; first_half_yellows++ }
        else if (min >= 46) { second_half_cards++; second_half_yellows++ }
      }
    }
    for (const c of allRedCards) {
      if (c.minute !== undefined && c.minute !== null) {
        const min = _parseGoalMinute(c.minute)
        if (min >= 1 && min <= 45) { first_half_cards++; first_half_reds++ }
        else if (min >= 46) { second_half_cards++; second_half_reds++ }
      }
    }

    // Goals per match
    const totalGoals = rm.reduce((s: number, m: any) => s + (m.home_score ?? 0) + (m.away_score ?? 0), 0)
    const avg_goals_per_match = rm.length > 0 ? +(totalGoals / rm.length).toFixed(2) : 0

    // Competition breakdown
    const compMap: Record<string, { matches: number; yellows: number; reds: number }> = {}
    for (const m of rm) {
      const comp = m.competition || 'Desconeguda'
      if (!compMap[comp]) compMap[comp] = { matches: 0, yellows: 0, reds: 0 }
      compMap[comp].matches++
      compMap[comp].yellows += (Array.isArray(m.yellow_cards) ? m.yellow_cards : []).filter((c: any) => c.recipient_type === 'player').length
      compMap[comp].reds += (Array.isArray(m.red_cards) ? m.red_cards : []).filter((c: any) => c.recipient_type === 'player').length
    }
    const competitionBreakdown = Object.entries(compMap)
      .map(([comp, stats]) => ({ competition: comp, ...stats }))
      .sort((a, b) => b.matches - a.matches)

    // Percentiles — compute from global referee data
    const yellows_per_match = rm.length ? +(totalYellows / rm.length).toFixed(2) : 0
    const reds_per_match = rm.length ? +(totalReds / rm.length).toFixed(2) : 0

    let yellows_percentile = 50
    let reds_percentile = 50
    let division_yellows_percentile = 50
    let division_reds_percentile = 50
    let division_referee_count = 0
    if ((allRefereesRes.data || []).length > 0) {
      // Group by referee name and compute per-match averages
      const globalRefMap: Record<string, { matches: number; yellows: number; reds: number }> = {}
      // Also track per-division stats for the coach's competition
      const divisionRefMap: Record<string, { matches: number; yellows: number; reds: number }> = {}
      for (const row of (allRefereesRes.data as any[])) {
        const name = row.main_referee
        if (!name) continue
        if (!globalRefMap[name]) globalRefMap[name] = { matches: 0, yellows: 0, reds: 0 }
        globalRefMap[name].matches++
        const yc = (Array.isArray(row.yellow_cards) ? row.yellow_cards : []).filter((c: any) => c.recipient_type === 'player').length
        const rc = (Array.isArray(row.red_cards) ? row.red_cards : []).filter((c: any) => c.recipient_type === 'player').length
        globalRefMap[name].yellows += yc
        globalRefMap[name].reds += rc
        // Division-specific tracking
        if (row.competition === competition) {
          if (!divisionRefMap[name]) divisionRefMap[name] = { matches: 0, yellows: 0, reds: 0 }
          divisionRefMap[name].matches++
          divisionRefMap[name].yellows += yc
          divisionRefMap[name].reds += rc
        }
      }
      // Global percentiles — referees with ≥3 matches
      const qualified = Object.values(globalRefMap).filter(r => r.matches >= 3)
      if (qualified.length > 1) {
        const ypm = qualified.map(r => r.yellows / r.matches)
        const rpm = qualified.map(r => r.reds / r.matches)
        const yBelow = ypm.filter(v => v < yellows_per_match).length
        const rBelow = rpm.filter(v => v < reds_per_match).length
        yellows_percentile = Math.round((yBelow / qualified.length) * 100)
        reds_percentile = Math.round((rBelow / qualified.length) * 100)
      }
      // Division-specific percentiles — referees with ≥2 matches in this competition
      const divQualified = Object.values(divisionRefMap).filter(r => r.matches >= 2)
      division_referee_count = divQualified.length
      if (divQualified.length > 1) {
        // Use this referee's stats within the division only
        const divRef = divisionRefMap[refereeName]
        const divYpm = divRef ? divRef.yellows / divRef.matches : yellows_per_match
        const divRpm = divRef ? divRef.reds / divRef.matches : reds_per_match
        const dypm = divQualified.map(r => r.yellows / r.matches)
        const drpm = divQualified.map(r => r.reds / r.matches)
        division_yellows_percentile = Math.round((dypm.filter(v => v < divYpm).length / divQualified.length) * 100)
        division_reds_percentile = Math.round((drpm.filter(v => v < divRpm).length / divQualified.length) * 100)
      }
    }

    // Severity score (0-100): composite index weighting yellows, reds, and expulsion rate
    const severity_score = Math.min(100, Math.round(
      yellows_percentile * 0.5 + reds_percentile * 0.3 + (rm.length ? (matchesWithRed / rm.length) * 100 : 0) * 0.2
    ))

    referee = {
      name: refereeName,
      slug: slugify(refereeName),
      matches: rm.length,
      yellows: totalYellows,
      reds: totalReds,
      yellows_per_match,
      reds_per_match,
      matches_with_red_pct: rm.length ? Math.round((matchesWithRed / rm.length) * 100) : 0,
      recentMatches: rm.slice(0, 10).map(m => ({
        date: m.match_date || '',
        home_team: m.home_team || '',
        away_team: m.away_team || '',
        home_score: m.home_score,
        away_score: m.away_score,
        yellows: (Array.isArray(m.yellow_cards) ? m.yellow_cards : []).filter((c: any) => c.recipient_type === 'player').length,
        reds: (Array.isArray(m.red_cards) ? m.red_cards : []).filter((c: any) => c.recipient_type === 'player').length,
        competition: m.competition || '',
        jornada: m.jornada || 0,
      })),
      yellows_percentile,
      reds_percentile,
      division_yellows_percentile,
      division_reds_percentile,
      division_name: COMPETITION_NAMES[competition] || competition,
      division_referee_count,
      home_yellows,
      away_yellows,
      home_reds,
      away_reds,
      home_bias,
      first_half_cards,
      second_half_cards,
      first_half_yellows,
      second_half_yellows,
      first_half_reds,
      second_half_reds,
      competitionBreakdown,
      avg_goals_per_match,
      severity_score,
      predicted: refereeIsPredicted,
    }
  }

  // ── Field dimensions lookup ─────────────────────────────────────────────────
  const allFields = (fieldsRes.data || []) as Array<{ name: string; team: string | null; fcf_venue: string | null; length_m: number; width_m: number }>
  function findPitch(name: string, venueHint?: string): FieldDimsDB | null {
    // 1. Exact team name match
    const upper = name.toUpperCase()
    let field = allFields.find(f => f.team && f.team.toUpperCase() === upper)
    // 2. Prefix match (e.g. "CLUB B" matches field saved for "CLUB")
    if (!field) field = allFields.find(f => f.team && upper.startsWith(f.team.toUpperCase()))
    // 3. Reverse prefix (field saved for "CLUB B", searching "CLUB")
    if (!field) field = allFields.find(f => f.team && f.team.toUpperCase().startsWith(upper))
    // 4. Match by FCF venue (same stadium = same club)
    if (!field && venueHint) {
      const vn = venueHint.split('  ')[0].trim().toUpperCase()
      if (vn) field = allFields.find(f => f.fcf_venue && f.fcf_venue.split('  ')[0].trim().toUpperCase() === vn)
    }
    if (field) {
      const l = Number(field.length_m)
      const w = Number(field.width_m)
      if (l > 0 && w > 0) {
        return { length_m: l, width_m: w, field_name: field.name }
      }
    }
    return null
  }
  const homePitch = findPitch(teamName)
  const rivalPitch = rivalName ? findPitch(rivalName) : null
  if (!homePitch || !rivalPitch) {
    console.log('[PitchLookup]', { teamName, rivalName, homePitchFound: !!homePitch, rivalPitchFound: !!rivalPitch, totalFields: allFields.length, fieldTeams: allFields.map(f => f.team).join(' | ') })
  }

  // ── Team record by field size category ────────────────────────────────────
  // For each match the team played, look up the home team's field dimensions
  // and classify it as petit/mitjà/gran. Then tally W/D/L per category.
  const fieldSizeRecord: Record<string, { played: number; wins: number; draws: number; losses: number; gf: number; ga: number }> = {}
  let hasFieldSizeData = false
  for (const m of allPlayed) {
    const homeTeam = m.isHome ? teamName : (m.home_team || m.away_team || '')
    const pitch = findPitch(homeTeam)
    if (!pitch) continue
    const area = pitch.length_m * pitch.width_m
    const cat = area < 5500 ? 'petit' : area < 6300 ? 'mitja' : 'gran'
    if (!fieldSizeRecord[cat]) fieldSizeRecord[cat] = { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 }
    const s = fieldSizeRecord[cat]
    s.played++
    s.gf += m.goalsFor
    s.ga += m.goalsAgainst
    if (m.goalsFor > m.goalsAgainst) s.wins++
    else if (m.goalsFor === m.goalsAgainst) s.draws++
    else s.losses++
    hasFieldSizeData = true
  }

  return {
    name: teamName,
    slug,
    competition,
    group: groupName,
    position: standing.position ?? null,
    played: standing.played || 0,
    wins: standing.won || 0,
    draws: standing.drawn || 0,
    losses: standing.lost || 0,
    gf: standing.goals_for || 0,
    ga: standing.goals_against || 0,
    points: standing.points || 0,
    home,
    away,
    players,
    form,
    goalBuckets: teamGoalBuckets,
    standings,
    sanctions: [],
    nextMatch,
    rival,
    headToHead,
    referee,
    homePitch,
    rivalPitch,
    fieldSizeRecord: hasFieldSizeData ? fieldSizeRecord : null,
  }
}

// ─── Player Profiles ──────────────────────────────────────────────────────────

export type PlayerProfileDB = {
  id: string
  slug: string
  displayName: string
  bio: string | null
  position: string | null
  preferredFoot: string | null
  birthYear: number | null
  heightCm: number | null
  weightKg: number | null
  photoUrl: string | null
  highlightUrl: string | null
  phone: string | null
  contactEmail: string | null
  instagram: string | null
  whatsapp: boolean
  claimed: boolean
  verified: boolean
  optedOut: boolean
  contactVisible: boolean
  lookingForTeam: boolean
  /** Aggregated career stats across all seasons/teams */
  career: {
    appearances: number
    starts: number
    goals: number
    yellowCards: number
    redCards: number
    minutesPlayed: number
  }
  /** Per-season/team/competition breakdown */
  seasons: {
    season: string
    competition: string
    competitionName: string
    groupName: string
    teamName: string
    teamSlug: string
    appearances: number
    starts: number
    goals: number
    yellowCards: number
    redCards: number
    minutesPlayed: number
  }[]
}

/** Fetch a single player profile by slug, with linked stats */
export async function getPlayerProfile(slug: string): Promise<PlayerProfileDB | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  // 1. Get the profile
  const { data: profile, error: profileErr } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('canonical_slug', slug)
    .single()

  if (profileErr || !profile) return null

  // GDPR opt-out: return minimal data
  if (profile.opted_out) {
    return {
      id: profile.id,
      slug: profile.canonical_slug,
      displayName: profile.display_name,
      bio: null, position: null, preferredFoot: null, birthYear: null,
      heightCm: null, weightKg: null, photoUrl: null, highlightUrl: null,
      phone: null, contactEmail: null, instagram: null, whatsapp: false,
      claimed: !!profile.claimed_by, verified: profile.verified,
      optedOut: true, contactVisible: false, lookingForTeam: false,
      career: { appearances: 0, starts: 0, goals: 0, yellowCards: 0, redCards: 0, minutesPlayed: 0 },
      seasons: [],
    }
  }

  // 2. Get linked stats via join
  const { data: links } = await supabase
    .from('player_stats_links')
    .select('player_stats_id')
    .eq('profile_id', profile.id)

  const statsIds = (links || []).map(l => l.player_stats_id)

  let seasons: PlayerProfileDB['seasons'] = []
  if (statsIds.length > 0) {
    const { data: stats } = await supabase
      .from('fcf_player_stats')
      .select('*')
      .in('id', statsIds)
      .order('season', { ascending: false })

    seasons = (stats || []).map(s => ({
      season: s.season,
      competition: s.competition,
      competitionName: COMPETITION_NAMES[s.competition] || s.competition,
      groupName: s.group_name,
      teamName: s.team_name,
      teamSlug: s.team_slug,
      appearances: s.appearances || 0,
      starts: s.starts || 0,
      goals: s.goals || 0,
      yellowCards: s.yellow_cards || 0,
      redCards: s.red_cards || 0,
      minutesPlayed: s.minutes_played || 0,
    }))
  }

  // 3. Aggregate career totals
  const career = seasons.reduce(
    (acc, s) => ({
      appearances: acc.appearances + s.appearances,
      starts: acc.starts + s.starts,
      goals: acc.goals + s.goals,
      yellowCards: acc.yellowCards + s.yellowCards,
      redCards: acc.redCards + s.redCards,
      minutesPlayed: acc.minutesPlayed + s.minutesPlayed,
    }),
    { appearances: 0, starts: 0, goals: 0, yellowCards: 0, redCards: 0, minutesPlayed: 0 }
  )

  return {
    id: profile.id,
    slug: profile.canonical_slug,
    displayName: profile.display_name,
    bio: profile.bio,
    position: profile.position,
    preferredFoot: profile.preferred_foot,
    birthYear: profile.birth_year,
    heightCm: profile.height_cm,
    weightKg: profile.weight_kg,
    photoUrl: profile.photo_url,
    highlightUrl: profile.highlight_url,
    phone: profile.phone,
    contactEmail: profile.contact_email,
    instagram: profile.instagram,
    whatsapp: profile.whatsapp ?? false,
    claimed: !!profile.claimed_by,
    verified: profile.verified ?? false,
    optedOut: false,
    contactVisible: profile.contact_visible ?? false,
    lookingForTeam: profile.looking_for_team ?? false,
    career,
    seasons,
  }
}

/** Fetch all players from player_profiles with aggregated stats for search/discovery */
export async function getAllPlayersDB() {
  const supabase = getSupabase()
  if (!supabase) return []

  // Get all non-opted-out profiles
  const profiles = await fetchAllRows((from, to) =>
    supabase
      .from('player_profiles')
      .select('canonical_slug, display_name, position, looking_for_team, verified, photo_url, opted_out')
      .eq('opted_out', false)
      .range(from, to)
  )

  if (!profiles || profiles.length === 0) return []

  // Get all player stats for aggregation
  const allStats = await fetchAllRows((from, to) =>
    supabase
      .from('fcf_player_stats')
      .select('player_slug, team_name, team_slug, competition, appearances, goals, yellow_cards, red_cards, minutes_played')
      .range(from, to)
  )

  // Aggregate stats by player_slug
  const statsMap: Record<string, {
    team: string; teamSlug: string; competition: string
    appearances: number; goals: number; yellowCards: number; redCards: number
  }> = {}

  for (const s of allStats || []) {
    const slug = s.player_slug
    if (!slug) continue
    if (!statsMap[slug]) {
      statsMap[slug] = {
        team: s.team_name, teamSlug: s.team_slug, competition: s.competition,
        appearances: 0, goals: 0, yellowCards: 0, redCards: 0,
      }
    }
    const entry = statsMap[slug]
    entry.appearances += s.appearances || 0
    entry.goals += s.goals || 0
    entry.yellowCards += s.yellow_cards || 0
    entry.redCards += s.red_cards || 0
    // Keep the team with most appearances as "main team"
    if ((s.appearances || 0) > (entry.appearances - (s.appearances || 0))) {
      entry.team = s.team_name
      entry.teamSlug = s.team_slug
      entry.competition = s.competition
    }
  }

  return profiles.map(p => {
    const slug = p.canonical_slug
    const stats = statsMap[slug]
    return {
      slug,
      name: p.display_name,
      position: p.position,
      team: stats?.team || '',
      teamSlug: stats?.teamSlug || '',
      competition: stats?.competition || '',
      appearances: stats?.appearances || 0,
      goals: stats?.goals || 0,
      yellow_cards: stats?.yellowCards || 0,
      red_cards: stats?.redCards || 0,
      lookingForTeam: p.looking_for_team ?? false,
      verified: p.verified ?? false,
      photoUrl: p.photo_url,
    }
  }).sort((a, b) => b.appearances - a.appearances)
}

// ─── Featured Players (homepage) ──────────────────────────────────────────────

/** Divisions to feature on the homepage */
const FEATURED_COMPETITIONS = [
  'primera-catalana',
  'segona-catalana',
  'tercera-catalana',
  'quarta-catalana',
  'preferent-juvenils',
  'lliga-elit',
]

/** Divisions where we have minutes_played data (exclude those without substitution data) */
const COMPETITIONS_WITH_MINUTES = FEATURED_COMPETITIONS.filter(c => !COMPETITIONS_WITHOUT_MINUTES.has(c))

export interface FeaturedPlayer {
  slug: string
  name: string
  team: string
  teamSlug: string
  competition: string
  competitionName: string
  goals: number
  appearances: number
  minutesPlayed: number
  goalsPerMinute: number | null
}

export interface FeaturedPlayersData {
  topScorersByCompetition: Record<string, FeaturedPlayer[]>
  topGoalsPerMinuteByCompetition: Record<string, FeaturedPlayer[]>
}

/** Minimum minutes to qualify for goals-per-minute ranking */
const MIN_MINUTES_FOR_RATIO = 200

export async function getFeaturedPlayersDB(): Promise<FeaturedPlayersData> {
  const supabase = getSupabase()
  const empty: FeaturedPlayersData = { topScorersByCompetition: {}, topGoalsPerMinuteByCompetition: {} }
  if (!supabase) return empty

  // Fetch player stats for featured competitions with goals > 0
  const { data: stats, error } = await supabase
    .from('fcf_player_stats')
    .select('player_slug, team_name, team_slug, competition, appearances, goals, minutes_played')
    .in('competition', FEATURED_COMPETITIONS)
    .gt('goals', 0)
    .order('goals', { ascending: false })

  if (error || !stats) return empty

  // Group by competition → top 5 scorers
  const topScorersByCompetition: Record<string, FeaturedPlayer[]> = {}
  const countByComp: Record<string, number> = {}

  for (const s of stats) {
    const comp = s.competition
    if (!countByComp[comp]) countByComp[comp] = 0
    if (countByComp[comp] >= 5) continue
    countByComp[comp]++

    if (!topScorersByCompetition[comp]) topScorersByCompetition[comp] = []
    topScorersByCompetition[comp].push({
      slug: s.player_slug,
      name: s.player_slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      team: s.team_name,
      teamSlug: s.team_slug,
      competition: comp,
      competitionName: COMPETITION_NAMES[comp] || comp,
      goals: s.goals || 0,
      appearances: s.appearances || 0,
      minutesPlayed: s.minutes_played || 0,
      goalsPerMinute: null,
    })
  }

  // Enrich names from player_profiles
  const allSlugs = stats.map(s => s.player_slug).filter(Boolean)
  const uniqueSlugs = [...new Set(allSlugs)]

  // Fetch display names in batches
  const namesMap: Record<string, string> = {}
  for (let i = 0; i < uniqueSlugs.length; i += 500) {
    const batch = uniqueSlugs.slice(i, i + 500)
    const { data: profiles } = await supabase
      .from('player_profiles')
      .select('canonical_slug, display_name')
      .in('canonical_slug', batch)
    for (const p of profiles || []) {
      namesMap[p.canonical_slug] = p.display_name
    }
  }

  // Apply display names
  for (const players of Object.values(topScorersByCompetition)) {
    for (const p of players) {
      if (namesMap[p.slug]) p.name = namesMap[p.slug]
    }
  }

  // Goals per minute ratio — only competitions with minutes data
  const topGoalsPerMinuteByCompetition: Record<string, FeaturedPlayer[]> = {}

  const withMinutes = stats.filter(
    s => COMPETITIONS_WITH_MINUTES.includes(s.competition) &&
      (s.minutes_played || 0) >= MIN_MINUTES_FOR_RATIO &&
      (s.goals || 0) > 0
  )

  // Sort by goals/minute ratio (desc)
  withMinutes.sort((a, b) => {
    const ratioA = (a.goals || 0) / (a.minutes_played || 1)
    const ratioB = (b.goals || 0) / (b.minutes_played || 1)
    return ratioB - ratioA
  })

  const countByComp2: Record<string, number> = {}
  for (const s of withMinutes) {
    const comp = s.competition
    if (!countByComp2[comp]) countByComp2[comp] = 0
    if (countByComp2[comp] >= 5) continue
    countByComp2[comp]++

    if (!topGoalsPerMinuteByCompetition[comp]) topGoalsPerMinuteByCompetition[comp] = []
    const ratio = (s.goals || 0) / (s.minutes_played || 1)
    topGoalsPerMinuteByCompetition[comp].push({
      slug: s.player_slug,
      name: namesMap[s.player_slug] || s.player_slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      team: s.team_name,
      teamSlug: s.team_slug,
      competition: comp,
      competitionName: COMPETITION_NAMES[comp] || comp,
      goals: s.goals || 0,
      appearances: s.appearances || 0,
      minutesPlayed: s.minutes_played || 0,
      goalsPerMinute: ratio,
    })
  }

  return { topScorersByCompetition, topGoalsPerMinuteByCompetition }
}

// ─── Scouting / Discover Players ─────────────────────────────────────────────

/** Age category inferred from competition slug (season 2025-26) */
const COMPETITION_AGE_CATEGORY: Record<string, { label: string; birthYearRange: [number, number] }> = {
  'divisio-honor-juvenil':       { label: 'Juvenil (U19)',      birthYearRange: [2007, 2008] },
  'lliga-nacional-juvenil':      { label: 'Juvenil (U19)',      birthYearRange: [2007, 2008] },
  'preferent-juvenils':          { label: 'Juvenil (U19)',      birthYearRange: [2007, 2008] },
  'juvenil-primera-divisio':     { label: 'Juvenil (U19)',      birthYearRange: [2007, 2008] },
  'segona-catalana-juvenil':     { label: 'Juvenil (U19)',      birthYearRange: [2007, 2008] },
  'tercera-catalana-juvenil':    { label: 'Juvenil (U19)',      birthYearRange: [2007, 2008] },
  'divisio-honor-cadet-s16':     { label: 'Cadet S16 (U17)',    birthYearRange: [2009, 2010] },
  'preferent-cadet-s16':         { label: 'Cadet S16 (U17)',    birthYearRange: [2009, 2010] },
  'cadet-primera-divisio-s16':   { label: 'Cadet S16 (U17)',    birthYearRange: [2009, 2010] },
  'cadet-segona-divisio-s16':    { label: 'Cadet S16 (U17)',    birthYearRange: [2009, 2010] },
  'divisio-honor-cadet-s15':     { label: 'Cadet S15 (U16)',    birthYearRange: [2010, 2011] },
  'preferent-cadet-s15':         { label: 'Cadet S15 (U16)',    birthYearRange: [2010, 2011] },
  'cadet-primera-divisio-s15':   { label: 'Cadet S15 (U16)',    birthYearRange: [2010, 2011] },
  'cadet-segona-divisio-s15':    { label: 'Cadet S15 (U16)',    birthYearRange: [2010, 2011] },
  'divisio-honor-infantil-s14':  { label: 'Infantil S14 (U15)', birthYearRange: [2011, 2012] },
  'preferent-infantil-s14':      { label: 'Infantil S14 (U15)', birthYearRange: [2011, 2012] },
  'primera-divisio-infantil-s14':{ label: 'Infantil S14 (U15)', birthYearRange: [2011, 2012] },
  'divisio-honor-infantil-s13':  { label: 'Infantil S13 (U14)', birthYearRange: [2012, 2013] },
  'preferent-infantil-s13':      { label: 'Infantil S13 (U14)', birthYearRange: [2012, 2013] },
  'infantil-primera-divisio-s13':{ label: 'Infantil S13 (U14)', birthYearRange: [2012, 2013] },
}

export { COMPETITION_AGE_CATEGORY }

export interface ScoutingPlayer {
  slug: string
  name: string
  team: string
  teamSlug: string
  competition: string
  competitionName: string
  group: string
  appearances: number
  starts: number
  goals: number
  yellowCards: number
  redCards: number
  minutesPlayed: number
  goalsPerMatch: number | null
  /** From player_profiles if available */
  birthYear: number | null
  /** Inferred from competition category */
  ageCategory: string | null
  /** Estimated age range from competition */
  estimatedBirthYearRange: [number, number] | null
  position: string | null
  lookingForTeam: boolean
  verified: boolean
}

export async function getScoutingPlayersDB(): Promise<ScoutingPlayer[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  // Fetch all player stats
  const allStats = await fetchAllRows((from, to) =>
    supabase
      .from('fcf_player_stats')
      .select('player_slug, player_name, team_name, team_slug, competition, group_name, appearances, starts, goals, yellow_cards, red_cards, minutes_played')
      .range(from, to)
  )

  if (!allStats || allStats.length === 0) return []

  // Fetch profile data (birth_year, position, etc.)
  const profiles = await fetchAllRows((from, to) =>
    supabase
      .from('player_profiles')
      .select('canonical_slug, display_name, birth_year, position, looking_for_team, verified, opted_out')
      .eq('opted_out', false)
      .range(from, to)
  )

  const profileMap: Record<string, typeof profiles[number]> = {}
  for (const p of profiles || []) {
    if (p.canonical_slug) profileMap[p.canonical_slug] = p
  }

  // Build player entries — one per player_slug + competition combo for granularity
  const players: ScoutingPlayer[] = allStats.map(s => {
    const profile = profileMap[s.player_slug]
    const ageCat = COMPETITION_AGE_CATEGORY[s.competition]
    const appearances = s.appearances || 0
    const goals = s.goals || 0

    return {
      slug: s.player_slug,
      name: profile?.display_name || s.player_name || s.player_slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      team: s.team_name,
      teamSlug: s.team_slug,
      competition: s.competition,
      competitionName: COMPETITION_NAMES[s.competition] || s.competition,
      group: s.group_name || '',
      appearances,
      starts: s.starts || 0,
      goals,
      yellowCards: s.yellow_cards || 0,
      redCards: s.red_cards || 0,
      minutesPlayed: s.minutes_played || 0,
      goalsPerMatch: appearances > 0 ? Math.round((goals / appearances) * 100) / 100 : null,
      birthYear: profile?.birth_year ?? null,
      ageCategory: ageCat?.label ?? null,
      estimatedBirthYearRange: ageCat?.birthYearRange ?? null,
      position: profile?.position ?? null,
      lookingForTeam: profile?.looking_for_team ?? false,
      verified: profile?.verified ?? false,
    }
  })

  // Sort by goals desc, then appearances desc
  players.sort((a, b) => b.goals - a.goals || b.appearances - a.appearances)

  return players
}
