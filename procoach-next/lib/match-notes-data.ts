import { createClient } from '@/lib/supabase-client'
import type {
  MatchNote,
  MatchNoteFull,
  MatchNoteLineup,
  MatchNoteEvent,
  MatchNoteRating,
} from './match-notes-types'

// ─── CRUD Operations ─────────────────────────────────────

/** Fetch all match notes for the current user */
export async function fetchUserMatchNotes(): Promise<MatchNote[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('match_notes')
    .select('*')
    .order('match_date', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** Fetch a single match note with all related data */
export async function fetchMatchNote(id: string): Promise<MatchNoteFull | null> {
  const supabase = createClient()

  const [noteRes, lineupsRes, eventsRes, ratingsRes] = await Promise.all([
    supabase.from('match_notes').select('*').eq('id', id).single(),
    supabase.from('match_note_lineups').select('*').eq('match_note_id', id),
    supabase.from('match_note_events').select('*').eq('match_note_id', id).order('minute'),
    supabase.from('match_note_ratings').select('*').eq('match_note_id', id),
  ])

  if (noteRes.error || !noteRes.data) return null

  return {
    ...noteRes.data,
    lineups: lineupsRes.data ?? [],
    events: eventsRes.data ?? [],
    ratings: ratingsRes.data ?? [],
  }
}

/** Create or update a match note (parent only). Returns the note id. */
export async function upsertMatchNote(
  note: Partial<MatchNote> & { opponent: string; match_date: string; is_home: boolean }
): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (note.id) {
    const { error } = await supabase
      .from('match_notes')
      .update({
        opponent: note.opponent,
        match_date: note.match_date,
        is_home: note.is_home,
        goals_for: note.goals_for,
        goals_against: note.goals_against,
        formation: note.formation,
        overall_rating: note.overall_rating,
        tactical_approach: note.tactical_approach,
        key_moments: note.key_moments,
        opponent_analysis: note.opponent_analysis,
        areas_to_improve: note.areas_to_improve,
        status: note.status ?? 'draft',
      })
      .eq('id', note.id)

    if (error) throw error
    return note.id
  }

  const { data, error } = await supabase
    .from('match_notes')
    .insert({
      user_id: user.id,
      opponent: note.opponent,
      match_date: note.match_date,
      is_home: note.is_home,
      goals_for: note.goals_for ?? null,
      goals_against: note.goals_against ?? null,
      formation: note.formation ?? null,
      overall_rating: note.overall_rating ?? null,
      tactical_approach: note.tactical_approach ?? null,
      key_moments: note.key_moments ?? null,
      opponent_analysis: note.opponent_analysis ?? null,
      areas_to_improve: note.areas_to_improve ?? null,
      status: note.status ?? 'draft',
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/** Replace all lineups for a match note */
export async function upsertLineups(
  matchNoteId: string,
  lineups: Omit<MatchNoteLineup, 'id' | 'match_note_id'>[]
): Promise<void> {
  const supabase = createClient()

  // Delete existing and re-insert
  await supabase.from('match_note_lineups').delete().eq('match_note_id', matchNoteId)

  if (lineups.length > 0) {
    const { error } = await supabase.from('match_note_lineups').insert(
      lineups.map((l) => ({ ...l, match_note_id: matchNoteId }))
    )
    if (error) throw error
  }
}

/** Replace all events for a match note */
export async function upsertEvents(
  matchNoteId: string,
  events: Omit<MatchNoteEvent, 'id' | 'match_note_id'>[]
): Promise<void> {
  const supabase = createClient()

  await supabase.from('match_note_events').delete().eq('match_note_id', matchNoteId)

  if (events.length > 0) {
    const { error } = await supabase.from('match_note_events').insert(
      events.map((e) => ({ ...e, match_note_id: matchNoteId }))
    )
    if (error) throw error
  }
}

/** Replace all ratings for a match note */
export async function upsertRatings(
  matchNoteId: string,
  ratings: Omit<MatchNoteRating, 'id' | 'match_note_id'>[]
): Promise<void> {
  const supabase = createClient()

  await supabase.from('match_note_ratings').delete().eq('match_note_id', matchNoteId)

  if (ratings.length > 0) {
    const { error } = await supabase.from('match_note_ratings').insert(
      ratings.map((r) => ({ ...r, match_note_id: matchNoteId }))
    )
    if (error) throw error
  }
}

/** Delete a match note and all related data (cascades) */
export async function deleteMatchNote(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('match_notes').delete().eq('id', id)
  if (error) throw error
}

/** Save the entire wizard state to Supabase in one batch */
export async function saveFullMatchNote(
  state: {
    matchNoteId: string | null
    matchData: { opponent: string; match_date: string; is_home: boolean; goals_for: number | null; goals_against: number | null }
    formation: string | null
    lineups: Omit<MatchNoteLineup, 'id' | 'match_note_id'>[]
    events: Omit<MatchNoteEvent, 'id' | 'match_note_id'>[]
    ratings: Omit<MatchNoteRating, 'id' | 'match_note_id'>[]
    summary: {
      overall_rating: number | null
      tactical_approach: string | null
      key_moments: string
      opponent_analysis: string
      areas_to_improve: string
    }
  },
  status: 'draft' | 'completed' = 'completed'
): Promise<string> {
  // 1. Upsert the parent note
  const noteId = await upsertMatchNote({
    id: state.matchNoteId ?? undefined,
    opponent: state.matchData.opponent,
    match_date: state.matchData.match_date,
    is_home: state.matchData.is_home,
    goals_for: state.matchData.goals_for,
    goals_against: state.matchData.goals_against,
    formation: state.formation,
    overall_rating: state.summary.overall_rating,
    tactical_approach: (state.summary.tactical_approach || null) as MatchNote['tactical_approach'],
    key_moments: state.summary.key_moments || null,
    opponent_analysis: state.summary.opponent_analysis || null,
    areas_to_improve: state.summary.areas_to_improve || null,
    status,
  })

  // 2. Upsert children in parallel
  await Promise.all([
    upsertLineups(noteId, state.lineups),
    upsertEvents(noteId, state.events),
    upsertRatings(noteId, state.ratings),
  ])

  return noteId
}

// ─── Data Queries for Dashboards ─────────────────────────

/** Fetch team matches from fcf_matches for a given club name */
export async function fetchTeamMatches(clubName: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fcf_matches')
    .select('*')
    .or(`home_team.ilike.%${clubName}%,away_team.ilike.%${clubName}%`)
    .order('match_date', { ascending: false })
    .limit(40)

  if (error) throw error
  return data ?? []
}

/** Fetch player roster from fcf_player_stats for a given team slug */
export async function fetchTeamRoster(teamSlug: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fcf_player_stats')
    .select('player_name, player_slug, appearances, goals')
    .eq('team_slug', teamSlug)
    .order('appearances', { ascending: false })

  if (error) throw error
  return data ?? []
}
