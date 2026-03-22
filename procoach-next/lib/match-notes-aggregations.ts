import { createClient } from '@/lib/supabase-client'
import type { MatchNote } from './match-notes-types'

// ─── Player Aggregation (client-side from fetched data) ──────

export interface PlayerAgg {
  name: string
  matchesRated: number
  avgRating: number
  attended: number
  totalNotes: number
  goals: number
  assists: number
  preAssists: number
  yellows: number
  reds: number
  goalTypes: Record<string, number>
  ratingHistory: { date: string; rating: number; opponent: string }[]
  tags: Record<string, number>
}

export async function fetchPlayerAggregations(userId: string): Promise<PlayerAgg[]> {
  const supabase = createClient()

  // Fetch all completed notes with children
  const { data: notes } = await supabase
    .from('match_notes')
    .select('id, match_date, opponent, status')
    .eq('status', 'completed')
    .order('match_date')

  const allNotes = notes ?? []
  if (allNotes.length === 0) return []

  const noteIds = allNotes.map((n) => n.id)
  const noteMap = Object.fromEntries(allNotes.map((n) => [n.id, n]))

  const [ratingsRes, eventsRes, lineupsRes] = await Promise.all([
    supabase.from('match_note_ratings').select('*').in('match_note_id', noteIds),
    supabase.from('match_note_events').select('*').in('match_note_id', noteIds),
    supabase.from('match_note_lineups').select('*').in('match_note_id', noteIds),
  ])

  const ratings = ratingsRes.data ?? []
  const events = eventsRes.data ?? []
  const lineups = lineupsRes.data ?? []

  // Aggregate by player
  const players = new Map<string, PlayerAgg>()

  function getPlayer(name: string): PlayerAgg {
    if (!players.has(name)) {
      players.set(name, {
        name,
        matchesRated: 0,
        avgRating: 0,
        attended: 0,
        totalNotes: allNotes.length,
        goals: 0,
        assists: 0,
        preAssists: 0,
        yellows: 0,
        reds: 0,
        goalTypes: {},
        ratingHistory: [],
        tags: {},
      })
    }
    return players.get(name)!
  }

  // Ratings
  for (const r of ratings) {
    const p = getPlayer(r.player_name)
    p.matchesRated++
    p.avgRating += r.rating
    p.ratingHistory.push({
      date: noteMap[r.match_note_id]?.match_date || '',
      rating: r.rating,
      opponent: noteMap[r.match_note_id]?.opponent || '',
    })
    if (r.tags) {
      for (const t of r.tags) {
        p.tags[t] = (p.tags[t] || 0) + 1
      }
    }
  }

  // Events
  for (const e of events) {
    const p = getPlayer(e.player_name)
    switch (e.event_type) {
      case 'goal':
        p.goals++
        if (e.goal_type) p.goalTypes[e.goal_type] = (p.goalTypes[e.goal_type] || 0) + 1
        break
      case 'assist': p.assists++; break
      case 'pre_assist': p.preAssists++; break
      case 'yellow_card': p.yellows++; break
      case 'red_card': p.reds++; break
    }
  }

  // Attendance
  for (const l of lineups) {
    if (l.player_name && l.attendance === 'present') {
      const p = getPlayer(l.player_name)
      p.attended++
    }
  }

  // Finalize averages
  for (const p of players.values()) {
    if (p.matchesRated > 0) {
      p.avgRating = Math.round((p.avgRating / p.matchesRated) * 10) / 10
    }
    p.ratingHistory.sort((a, b) => a.date.localeCompare(b.date))
  }

  return Array.from(players.values()).sort((a, b) => b.matchesRated - a.matchesRated)
}

// ─── Team Summary (from MatchNote[] passed client-side) ──────

export interface TeamSummary {
  totalMatches: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  formationUsage: { formation: string; count: number; wins: number }[]
  goalTimingBuckets: { bucket: string; count: number }[]
  homeAway: { home: { played: number; wins: number; gf: number; ga: number }; away: { played: number; wins: number; gf: number; ga: number } }
}

export function computeTeamSummary(notes: MatchNote[]): TeamSummary {
  const completed = notes.filter((n) => n.status === 'completed' && n.goals_for !== null)

  const summary: TeamSummary = {
    totalMatches: completed.length,
    wins: 0, draws: 0, losses: 0,
    goalsFor: 0, goalsAgainst: 0,
    formationUsage: [],
    goalTimingBuckets: [],
    homeAway: {
      home: { played: 0, wins: 0, gf: 0, ga: 0 },
      away: { played: 0, wins: 0, gf: 0, ga: 0 },
    },
  }

  const formMap = new Map<string, { count: number; wins: number }>()

  for (const n of completed) {
    const gf = n.goals_for!
    const ga = n.goals_against!
    summary.goalsFor += gf
    summary.goalsAgainst += ga

    if (gf > ga) summary.wins++
    else if (gf === ga) summary.draws++
    else summary.losses++

    // Home/Away
    const side = n.is_home ? summary.homeAway.home : summary.homeAway.away
    side.played++
    side.gf += gf
    side.ga += ga
    if (gf > ga) side.wins++

    // Formation
    if (n.formation) {
      const f = formMap.get(n.formation) || { count: 0, wins: 0 }
      f.count++
      if (gf > ga) f.wins++
      formMap.set(n.formation, f)
    }
  }

  summary.formationUsage = Array.from(formMap.entries())
    .map(([formation, v]) => ({ formation, ...v }))
    .sort((a, b) => b.count - a.count)

  return summary
}

// ─── Trends (performance over time) ──────

export interface TrendPoint {
  date: string
  opponent: string
  result: 'W' | 'D' | 'L'
  goalsFor: number
  goalsAgainst: number
  formation: string | null
  rating: number | null
}

export function computeTrends(notes: MatchNote[]): TrendPoint[] {
  return notes
    .filter((n) => n.status === 'completed' && n.goals_for !== null)
    .sort((a, b) => a.match_date.localeCompare(b.match_date))
    .map((n) => ({
      date: n.match_date,
      opponent: n.opponent,
      result: n.goals_for! > n.goals_against! ? 'W' : n.goals_for === n.goals_against ? 'D' : 'L',
      goalsFor: n.goals_for!,
      goalsAgainst: n.goals_against!,
      formation: n.formation,
      rating: n.overall_rating,
    }))
}
