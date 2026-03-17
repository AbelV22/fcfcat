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

/** Played matches with optional referee/card data for the Resultats tab */
export async function getCompetitionMatchesDB(slug: string) {
  const supabase = getSupabase()
  if (!supabase) return []

  // Get played matches from fcf_matches
  const { data: matchData, error } = await supabase
    .from('fcf_matches')
    .select('id, jornada, match_date, home_team, away_team, home_score, away_score, group_name')
    .eq('competition', slug)
    .not('home_score', 'is', null)
    .order('jornada', { ascending: false })
    .order('match_date', { ascending: false })

  if (error || !matchData) return []

  // Get referee/card data (if available for this competition)
  const { data: refData } = await supabase
    .from('fcf_referee_matches')
    .select('home_team, away_team, jornada, main_referee, yellow_cards, red_cards')
    .eq('competition', slug)

  // Build lookup by jornada+teams
  const refLookup: Record<string, any> = {}
  for (const rm of refData || []) {
    const key = `J${rm.jornada}-${slugify(rm.home_team || '')}-${slugify(rm.away_team || '')}`
    refLookup[key] = rm
  }

  return matchData.map(m => {
    const key = `J${m.jornada}-${slugify(m.home_team || '')}-${slugify(m.away_team || '')}`
    const ref = refLookup[key]
    return {
      id: m.id,
      date: m.match_date || '',
      jornada: m.jornada,
      group: m.group_name || '',
      home_team: m.home_team || '',
      away_team: m.away_team || '',
      home_score: m.home_score,
      away_score: m.away_score,
      main_referee: ref?.main_referee || null,
      yellows: ref
        ? (Array.isArray(ref.yellow_cards) ? ref.yellow_cards : [])
            .filter((c: any) => c.recipient_type === 'player').length
        : 0,
      reds: ref
        ? (Array.isArray(ref.red_cards) ? ref.red_cards : [])
            .filter((c: any) => c.recipient_type === 'player').length
        : 0,
    }
  })
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

/** All unique teams from standings (for cerca page) */
export async function getAllTeamsDB() {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('fcf_standings')
    .select('team_name, team_slug, competition, group_name, season')

  if (error || !data) return []

  // Deduplicate by slug
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

  // Find team standing by slug
  const { data: standingRows } = await supabase
    .from('fcf_standings')
    .select('*')
    .eq('team_slug', slug)
    .limit(1)

  const standing = standingRows?.[0] || null
  if (!standing) return null

  // Get all played matches (for recent form + home/away goals)
  const { data: recentRaw } = await supabase
    .from('fcf_matches')
    .select('jornada, match_date, home_team, away_team, home_score, away_score, home_slug, away_slug, group_name')
    .or(`home_slug.eq.${slug},away_slug.eq.${slug}`)
    .not('home_score', 'is', null)
    .order('match_date', { ascending: false })
    .limit(50)

  // Get next upcoming match.
  // Exclude played matches: FCF often omits inline scores and only sets
  // status='ACTA TANCADA', so we must filter by BOTH home_score IS NULL
  // AND status not containing 'TANCADA'. Order by jornada (not date,
  // because match_date is stored as DD-MM-YYYY which doesn't sort correctly).
  const { data: upcomingRaw } = await supabase
    .from('fcf_matches')
    .select('jornada, match_date, match_time, home_team, away_team, home_slug, away_slug')
    .or(`home_slug.eq.${slug},away_slug.eq.${slug}`)
    .is('home_score', null)
    .not('status', 'ilike', '%TANCADA%')
    .order('jornada', { ascending: true })
    .limit(1)

  // Get all standings for this group
  const { data: groupStandings } = await supabase
    .from('fcf_standings')
    .select('position, team_name, team_slug, played, won, drawn, lost, goals_for, goals_against, goal_diff, points')
    .eq('competition', standing.competition)
    .eq('group_name', standing.group_name)
    .order('position', { ascending: true })

  const allPlayedMatches = (recentRaw || []).map(m => {
    const isHome = m.home_slug === slug
    const gf = isHome ? m.home_score : m.away_score
    const ga = isHome ? m.away_score : m.home_score
    const result: 'W' | 'D' | 'L' | null =
      gf === null || ga === null ? null : gf > ga ? 'W' : gf < ga ? 'L' : 'D'
    return {
      date: m.match_date || '',
      jornada: m.jornada,
      opponent: isHome ? (m.away_team || '') : (m.home_team || ''),
      opponentSlug: isHome ? (m.away_slug || '') : (m.home_slug || ''),
      isHome,
      goalsFor: gf,
      goalsAgainst: ga,
      result,
      referee: null as string | null,
    }
  })

  const recentMatches = allPlayedMatches.slice(0, 10)

  // Compute home/away goals from match data
  const homeMatches = allPlayedMatches.filter(m => m.isHome)
  const awayMatches = allPlayedMatches.filter(m => !m.isHome)
  const homeGF = homeMatches.reduce((s, m) => s + (m.goalsFor ?? 0), 0)
  const homeGA = homeMatches.reduce((s, m) => s + (m.goalsAgainst ?? 0), 0)
  const awayGF = awayMatches.reduce((s, m) => s + (m.goalsFor ?? 0), 0)
  const awayGA = awayMatches.reduce((s, m) => s + (m.goalsAgainst ?? 0), 0)

  const nextRaw = upcomingRaw?.[0] || null
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
    standings: (groupStandings || []).map(s => ({
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
    // Empty/not-available fields (no acta data for most teams)
    players: [] as any[],
    sanctions: [] as any[],
    goalBuckets: [] as any[],
    home: {
      played: (standing.home_won || 0) + (standing.home_drawn || 0) + (standing.home_lost || 0),
      wins: standing.home_won || 0,
      draws: standing.home_drawn || 0,
      losses: standing.home_lost || 0,
      gf: homeGF,
      ga: homeGA,
      points: (standing.home_won || 0) * 3 + (standing.home_drawn || 0),
    },
    away: {
      played: (standing.away_won || 0) + (standing.away_drawn || 0) + (standing.away_lost || 0),
      wins: standing.away_won || 0,
      draws: standing.away_drawn || 0,
      losses: standing.away_lost || 0,
      gf: awayGF,
      ga: awayGA,
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
