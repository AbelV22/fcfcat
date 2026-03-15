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
import { slugify } from '@/lib/data'

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
