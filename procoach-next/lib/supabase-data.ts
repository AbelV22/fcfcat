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
import { getGoalData } from '@/lib/data'

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

// ─── Calendar / Resultats ─────────────────────────────────────────────────────

/** Full calendar (past + future) for a competition from fcf_matches table */
export async function getCompetitionCalendarDB(slug: string) {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('fcf_matches')
    .select('jornada, match_date, match_time, home_team, away_team, home_score, away_score, status, acta_url, group_name')
    .eq('competition', slug)
    .order('jornada', { ascending: true })
    .order('match_date', { ascending: true })

  if (error || !data) return []

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

  const { data, error } = await supabase
    .from('fcf_referee_matches')
    .select('id, jornada, match_date, home_team, away_team, home_score, away_score, group_name, main_referee, yellow_cards, red_cards')
    .eq('competition', slug)
    .order('jornada', { ascending: false })
    .order('match_date', { ascending: false })

  if (error || !data) return []

  return data.map(m => ({
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

  const { data, error } = await supabase
    .from('fcf_scorers')
    .select('player_name, team_name, goals, penalties, matches, goals_per_match, group_name')
    .eq('competition', slug)
    .order('goals', { ascending: false })

  if (error || !data) return []

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

  const { data, error } = await supabase
    .from('fcf_referee_matches')
    .select('home_team, away_team, home_score, away_score, yellow_cards, red_cards')
    .eq('competition', slug)

  if (error || !data || data.length === 0) return { players: [], teams: [], riskPlayers: [] }

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
  const riskPlayers = players.filter(p => p.yellows >= 4 && p.yellows % 4 === 0)

  return { players, teams, riskPlayers }
}

// ─── Referee Ranking ──────────────────────────────────────────────────────────

/** Referee ranking for a competition from fcf_referee_matches */
export async function getCompetitionRefereeRankingDB(slug: string) {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('fcf_referee_matches')
    .select('main_referee, yellow_cards, red_cards')
    .eq('competition', slug)

  if (error || !data) return []

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

  const { data, error } = await supabase
    .from('fcf_standings')
    .select('team_name, team_slug, competition, group_name, season')
    .limit(5000)

  if (error || !data) {
    console.error('[getAllTeamsDB] Supabase error:', error?.message || 'no data')
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

  const { data, error } = await supabase
    .from('fcf_referee_matches')
    .select('main_referee, competition, yellow_cards, red_cards, match_date')

  if (error || !data) return []

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
    .in('competition', ['segona-catalana', 'tercera-catalana', 'preferent-juvenils', 'juvenil-primera-divisio', 'quarta-catalana'])
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
      goals: p.goals || 0,
      yellow_cards: p.yellow_cards || 0,
      red_cards: p.red_cards || 0,
      minutes_played: p.minutes_played || 0,
      // FCF suspension thresholds: 4, 9, 14 yellow cards
      risk: [4, 9, 14].includes(p.yellow_cards || 0),
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

  // Fetch all referee names to find the one that maps to this slug
  const { data: nameRows } = await supabase
    .from('fcf_referee_matches')
    .select('main_referee')
    .not('main_referee', 'is', null)

  if (!nameRows) return null

  const refName = nameRows
    .map(r => r.main_referee as string)
    .find(name => name && slugify(name) === slug)

  if (!refName) return null

  // Fetch all matches for this referee
  const { data: matches, error } = await supabase
    .from('fcf_referee_matches')
    .select('competition, group_name, jornada, match_date, home_team, away_team, home_score, away_score, yellow_cards, red_cards')
    .eq('main_referee', refName)
    .order('match_date', { ascending: false })

  if (error || !matches || matches.length === 0) return null

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
type PlayerEntry = { name: string; appearances: number; goals: number; yellow_cards: number; red_cards: number; minutes_played: number; risk: boolean }
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
  // Card distribution home/away
  home_yellows: number
  away_yellows: number
  home_bias: number | null  // home_yellows/total_yellows * 100, null if 0 yellows
  // Half-time split (requires minute field on cards; 0 if not available)
  first_half_cards: number
  second_half_cards: number
  // Competition breakdown
  competitionBreakdown: Array<{ competition: string; matches: number; yellows: number; reds: number }>
  // Goals context
  avg_goals_per_match: number
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
    'primera-catalana',
    'segona-catalana',
    'tercera-catalana',
    'quarta-catalana',
    'preferent-juvenils',
    'juvenil-primera-divisio',
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
    goals: p.goals || 0,
    yellow_cards: p.yellow_cards || 0,
    red_cards: p.red_cards || 0,
    minutes_played: p.minutes_played || 0,
    risk: [4, 9, 14].includes(p.yellow_cards || 0),
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

  // Home/away split using standing data (most accurate)
  const home: SplitStats = {
    played: (standing.home_won || 0) + (standing.home_drawn || 0) + (standing.home_lost || 0),
    wins: standing.home_won || 0,
    draws: standing.home_drawn || 0,
    losses: standing.home_lost || 0,
    gf: homePlayed.reduce((s, m) => s + (m.goalsFor || 0), 0),
    ga: homePlayed.reduce((s, m) => s + (m.goalsAgainst || 0), 0),
    points: (standing.home_won || 0) * 3 + (standing.home_drawn || 0),
  }
  const away: SplitStats = {
    played: (standing.away_won || 0) + (standing.away_drawn || 0) + (standing.away_lost || 0),
    wins: standing.away_won || 0,
    draws: standing.away_drawn || 0,
    losses: standing.away_lost || 0,
    gf: awayPlayed.reduce((s, m) => s + (m.goalsFor || 0), 0),
    ga: awayPlayed.reduce((s, m) => s + (m.goalsAgainst || 0), 0),
    points: (standing.away_won || 0) * 3 + (standing.away_drawn || 0),
  }

  // ── Round 2: rival + referee + h2h in parallel ────────────────────────────
  const rivalSlug = nextMatch?.opponentSlug || ''
  const rivalName = nextMatch?.opponent || ''
  const refereeName = nextMatch?.referee || ''

  // Priority competitions for referee percentile calculation
  const PRIORITY_COMPETITIONS = [
    'primera-catalana', 'segona-catalana', 'tercera-catalana', 'quarta-catalana',
    'preferent-juvenils', 'juvenil-primera-divisio',
  ]

  const [rivalStandingRes, rivalHomeRes, rivalAwayRes, rivalPlayersRes, refereeMatchesRes, h2hHomeRes, h2hAwayRes, allRefereesRes] = await Promise.all([
    rivalSlug
      ? supabase.from('fcf_standings').select('position, team_name, team_slug, played, won, drawn, lost, goals_for, goals_against, points, home_won, home_drawn, home_lost, away_won, away_drawn, away_lost').eq('team_slug', rivalSlug).eq('competition', competition).limit(1)
      : Promise.resolve({ data: [] as any[] }),
    rivalName
      ? supabase.from('fcf_referee_matches').select('jornada, match_date, home_team, away_team, home_score, away_score, main_referee').eq('competition', competition).eq('home_team', rivalName).not('home_score', 'is', null).order('jornada', { ascending: false }).limit(15)
      : Promise.resolve({ data: [] as any[] }),
    rivalName
      ? supabase.from('fcf_referee_matches').select('jornada, match_date, home_team, away_team, home_score, away_score, main_referee').eq('competition', competition).eq('away_team', rivalName).not('away_score', 'is', null).order('jornada', { ascending: false }).limit(15)
      : Promise.resolve({ data: [] as any[] }),
    rivalSlug
      ? supabase.from('fcf_player_stats').select('player_name, appearances, goals, yellow_cards, red_cards, minutes_played').eq('team_slug', rivalSlug).eq('competition', competition).order('appearances', { ascending: false }).limit(30)
      : Promise.resolve({ data: [] as any[] }),
    refereeName
      ? supabase.from('fcf_referee_matches').select('competition, jornada, match_date, home_team, away_team, home_score, away_score, yellow_cards, red_cards').eq('main_referee', refereeName).order('match_date', { ascending: false }).limit(30)
      : Promise.resolve({ data: [] as any[] }),
    // H2H: team at home vs rival away
    rivalName && teamName
      ? supabase.from('fcf_referee_matches').select('jornada, match_date, home_team, away_team, home_score, away_score, main_referee').eq('home_team', teamName).eq('away_team', rivalName).not('home_score', 'is', null).order('match_date', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] as any[] }),
    // H2H: rival at home vs team away
    rivalName && teamName
      ? supabase.from('fcf_referee_matches').select('jornada, match_date, home_team, away_team, home_score, away_score, main_referee').eq('home_team', rivalName).eq('away_team', teamName).not('home_score', 'is', null).order('match_date', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] as any[] }),
    // Global referee stats for percentile computation (only when we have a referee)
    refereeName
      ? supabase.from('fcf_referee_matches').select('main_referee, yellow_cards, red_cards, home_score, away_score').in('competition', PRIORITY_COMPETITIONS).not('main_referee', 'is', null).limit(3000)
      : Promise.resolve({ data: [] as any[] }),
  ])

  // ── Load pre-computed goal timing from goal_buckets.json ─────────────────
  const teamGoalData = getGoalData(competition, groupName, slug)
  const teamGoalBuckets: GoalBucketEntry[] = teamGoalData?.buckets ?? []

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
      goals: p.goals || 0,
      yellow_cards: p.yellow_cards || 0,
      red_cards: p.red_cards || 0,
      minutes_played: p.minutes_played || 0,
      risk: [4, 9, 14].includes(p.yellow_cards || 0),
    }))

    const rHome: SplitStats = rs
      ? { played: (rs.home_won||0)+(rs.home_drawn||0)+(rs.home_lost||0), wins: rs.home_won||0, draws: rs.home_drawn||0, losses: rs.home_lost||0, gf: rHomePlayed.reduce((s:number,m:any)=>s+(m.goalsFor||0),0), ga: rHomePlayed.reduce((s:number,m:any)=>s+(m.goalsAgainst||0),0), points: (rs.home_won||0)*3+(rs.home_drawn||0) }
      : _splitStats(rAllPlayed, 'home')
    const rAway: SplitStats = rs
      ? { played: (rs.away_won||0)+(rs.away_drawn||0)+(rs.away_lost||0), wins: rs.away_won||0, draws: rs.away_drawn||0, losses: rs.away_lost||0, gf: rAwayPlayed.reduce((s:number,m:any)=>s+(m.goalsFor||0),0), ga: rAwayPlayed.reduce((s:number,m:any)=>s+(m.goalsAgainst||0),0), points: (rs.away_won||0)*3+(rs.away_drawn||0) }
      : _splitStats(rAllPlayed, 'away')

    // Rival goal timing + insights from global_referees
    // Load pre-computed goal timing + insights for rival from goal_buckets.json
    const rivalGoalData = getGoalData(competition, groupName, rivalSlug)
    const rivalGoalBuckets: GoalBucketEntry[] = rivalGoalData?.buckets ?? []
    const rivalInsightsRaw = rivalGoalData?.insights ?? null
    const rivalInsights: RivalInsights | null = rivalInsightsRaw && (rivalInsightsRaw.matchesAnalyzed ?? 0) >= 3
      ? {
          comebackRate: rivalInsightsRaw.comebackRate ?? null,
          scoreFirstWinRate: rivalInsightsRaw.scoreFirstWinRate ?? null,
          concededFirstWinRate: rivalInsightsRaw.concededFirstWinRate ?? null,
          cleanSheetRate: rivalInsightsRaw.cleanSheetRate ?? null,
          lateGoalRate: rivalInsightsRaw.lateGoalRate ?? null,
          firstHalfGoals: rivalInsightsRaw.firstHalfGoals ?? 0,
          secondHalfGoals: rivalInsightsRaw.secondHalfGoals ?? 0,
          matchesAnalyzed: rivalInsightsRaw.matchesAnalyzed ?? 0,
        }
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
      mostMinutes: [...rivalPlayers].sort((a,b) => b.minutes_played - a.minutes_played).filter(p => p.minutes_played > 0).slice(0, 5),
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
    const home_bias = totalYellows > 0 ? Math.round((home_yellows / totalYellows) * 100) : null

    // Half-time split (cards with a numeric minute field)
    let first_half_cards = 0
    let second_half_cards = 0
    const allCards = [...allYellowCards, ...allRedCards]
    for (const c of allCards) {
      if (c.minute !== undefined && c.minute !== null) {
        const min = _parseGoalMinute(c.minute)
        if (min >= 1 && min <= 45) first_half_cards++
        else if (min >= 46) second_half_cards++
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
    if ((allRefereesRes.data || []).length > 0) {
      // Group by referee name and compute per-match averages
      const globalRefMap: Record<string, { matches: number; yellows: number; reds: number }> = {}
      for (const row of (allRefereesRes.data as any[])) {
        const name = row.main_referee
        if (!name) continue
        if (!globalRefMap[name]) globalRefMap[name] = { matches: 0, yellows: 0, reds: 0 }
        globalRefMap[name].matches++
        globalRefMap[name].yellows += (Array.isArray(row.yellow_cards) ? row.yellow_cards : []).filter((c: any) => c.recipient_type === 'player').length
        globalRefMap[name].reds += (Array.isArray(row.red_cards) ? row.red_cards : []).filter((c: any) => c.recipient_type === 'player').length
      }
      // Filter to referees with ≥3 matches for meaningful comparison
      const qualified = Object.values(globalRefMap).filter(r => r.matches >= 3)
      if (qualified.length > 1) {
        const ypm = qualified.map(r => r.yellows / r.matches)
        const rpm = qualified.map(r => r.reds / r.matches)
        const yBelow = ypm.filter(v => v < yellows_per_match).length
        const rBelow = rpm.filter(v => v < reds_per_match).length
        yellows_percentile = Math.round((yBelow / qualified.length) * 100)
        reds_percentile = Math.round((rBelow / qualified.length) * 100)
      }
    }

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
      home_yellows,
      away_yellows,
      home_bias,
      first_half_cards,
      second_half_cards,
      competitionBreakdown,
      avg_goals_per_match,
    }
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
  }
}
