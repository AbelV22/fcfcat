import { createClient } from '@/lib/supabase-client'
import {
  FORMATIONS,
  type MatchNote,
  type MatchNoteFull,
  type MatchNoteLineup,
  type MatchNoteEvent,
  type MatchNoteRating,
  type ActaData,
  type WizardState,
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

  const payload = {
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
    // Stats
    possession_estimate: note.possession_estimate ?? null,
    corners_for: note.corners_for ?? null,
    corners_against: note.corners_against ?? null,
    fouls_for: note.fouls_for ?? null,
    fouls_against: note.fouls_against ?? null,
    offsides_for: note.offsides_for ?? null,
    offsides_against: note.offsides_against ?? null,
    shots_for: note.shots_for ?? null,
    shots_against: note.shots_against ?? null,
    saves: note.saves ?? null,
    half_time_score_for: note.half_time_score_for ?? null,
    half_time_score_against: note.half_time_score_against ?? null,
    // Attack
    shots_blocked_for: (note as any).shots_blocked_for ?? null,
    shots_blocked_against: (note as any).shots_blocked_against ?? null,
    dribbles_attempted: (note as any).dribbles_attempted ?? null,
    dribbles_completed: (note as any).dribbles_completed ?? null,
    // Distribution
    total_passes_for: (note as any).total_passes_for ?? null,
    total_passes_against: (note as any).total_passes_against ?? null,
    pass_accuracy: (note as any).pass_accuracy ?? null,
    // Defense
    tackles_for: (note as any).tackles_for ?? null,
    tackles_against: (note as any).tackles_against ?? null,
    clearances: (note as any).clearances ?? null,
    aerial_duels_won: (note as any).aerial_duels_won ?? null,
    aerial_duels_lost: (note as any).aerial_duels_lost ?? null,
    // Set pieces
    throw_ins_for: (note as any).throw_ins_for ?? null,
    throw_ins_against: (note as any).throw_ins_against ?? null,
    goal_kicks_for: (note as any).goal_kicks_for ?? null,
    goal_kicks_against: (note as any).goal_kicks_against ?? null,
    penalties_for: (note as any).penalties_for ?? null,
    penalties_against: (note as any).penalties_against ?? null,
    penalties_scored: (note as any).penalties_scored ?? null,
    penalties_saved: (note as any).penalties_saved ?? null,
    // Goalkeeping
    high_claims: (note as any).high_claims ?? null,
    // Phase ratings
    phase_attack: note.phase_attack ?? null,
    phase_defense: note.phase_defense ?? null,
    phase_transition_atk: note.phase_transition_atk ?? null,
    phase_transition_def: note.phase_transition_def ?? null,
    phase_set_pieces: note.phase_set_pieces ?? null,
    // Tactical / notes
    training_focus: note.training_focus ?? null,
    pitch_condition: note.pitch_condition ?? null,
    weather: note.weather ?? null,
    captain: note.captain ?? null,
  }

  if (note.id) {
    const { error } = await supabase
      .from('match_notes')
      .update(payload)
      .eq('id', note.id)

    if (error) throw error
    return note.id
  }

  const { data, error } = await supabase
    .from('match_notes')
    .insert({ ...payload, user_id: user.id })
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
      lineups.map((l) => ({
        ...l,
        match_note_id: matchNoteId,
        sub_reason: l.sub_reason ?? null,
        effort_rating: l.effort_rating ?? null,
        is_captain: l.is_captain ?? false,
      }))
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
      events.map((e) => ({
        ...e,
        match_note_id: matchNoteId,
        goal_origin: e.goal_origin ?? null,
        shot_zone: e.shot_zone ?? null,
        is_opponent: e.is_opponent ?? false,
      }))
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
      ratings.map((r) => ({
        ...r,
        match_note_id: matchNoteId,
        effort_rating: r.effort_rating ?? null,
      }))
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
    summary: WizardState['summary']
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
    training_focus: state.summary.training_focus || null,
    possession_estimate: state.summary.possession_estimate ?? null,
    corners_for: state.summary.corners_for ?? null,
    corners_against: state.summary.corners_against ?? null,
    fouls_for: state.summary.fouls_for ?? null,
    fouls_against: state.summary.fouls_against ?? null,
    offsides_for: state.summary.offsides_for ?? null,
    offsides_against: state.summary.offsides_against ?? null,
    shots_for: state.summary.shots_for ?? null,
    shots_against: state.summary.shots_against ?? null,
    saves: state.summary.saves ?? null,
    half_time_score_for: state.summary.half_time_score_for ?? null,
    half_time_score_against: state.summary.half_time_score_against ?? null,
    // New expanded stats
    shots_blocked_for: state.summary.shots_blocked_for ?? null,
    shots_blocked_against: state.summary.shots_blocked_against ?? null,
    dribbles_attempted: state.summary.dribbles_attempted ?? null,
    dribbles_completed: state.summary.dribbles_completed ?? null,
    total_passes_for: state.summary.total_passes_for ?? null,
    total_passes_against: state.summary.total_passes_against ?? null,
    pass_accuracy: state.summary.pass_accuracy ?? null,
    tackles_for: state.summary.tackles_for ?? null,
    tackles_against: state.summary.tackles_against ?? null,
    clearances: state.summary.clearances ?? null,
    aerial_duels_won: state.summary.aerial_duels_won ?? null,
    aerial_duels_lost: state.summary.aerial_duels_lost ?? null,
    throw_ins_for: state.summary.throw_ins_for ?? null,
    throw_ins_against: state.summary.throw_ins_against ?? null,
    goal_kicks_for: state.summary.goal_kicks_for ?? null,
    goal_kicks_against: state.summary.goal_kicks_against ?? null,
    penalties_for: state.summary.penalties_for ?? null,
    penalties_against: state.summary.penalties_against ?? null,
    penalties_scored: state.summary.penalties_scored ?? null,
    penalties_saved: state.summary.penalties_saved ?? null,
    high_claims: state.summary.high_claims ?? null,
    // Phase ratings
    phase_attack: state.summary.phase_attack ?? null,
    phase_defense: state.summary.phase_defense ?? null,
    phase_transition_atk: state.summary.phase_transition_atk ?? null,
    phase_transition_def: state.summary.phase_transition_def ?? null,
    phase_set_pieces: state.summary.phase_set_pieces ?? null,
    pitch_condition: state.summary.pitch_condition ?? null,
    weather: state.summary.weather ?? null,
    captain: state.summary.captain ?? null,
    status,
  } as any)

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
  // Quote values with double-quotes so commas in team names don't break .or() parsing
  const pattern = `%${clubName}%`
  const { data, error } = await supabase
    .from('fcf_matches')
    .select('*')
    .or(`home_team.ilike."${pattern}",away_team.ilike."${pattern}"`)
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

// ─── Acta Data Fetcher (for pre-filling wizard) ────────────

/** Fetch acta data from fcf_referee_matches for a specific match */
export async function fetchActaDataForMatch(
  homeTeam: string,
  awayTeam: string,
  jornada?: number | null,
  matchDate?: string | null,
  competition?: string | null,
): Promise<ActaData | null> {
  const supabase = createClient()

  // Strategy 1: Match by competition + jornada + teams (most reliable)
  if (jornada && competition) {
    const { data } = await supabase
      .from('fcf_referee_matches')
      .select('*')
      .eq('competition', competition)
      .eq('jornada', jornada)
      .ilike('home_team', `%${homeTeam}%`)
      .ilike('away_team', `%${awayTeam}%`)
      .limit(1)
      .single()
    if (data) return parseActaRow(data)
  }

  // Strategy 2: Match by jornada + teams only (cross-competition fallback)
  if (jornada) {
    const { data } = await supabase
      .from('fcf_referee_matches')
      .select('*')
      .eq('jornada', jornada)
      .ilike('home_team', `%${homeTeam}%`)
      .ilike('away_team', `%${awayTeam}%`)
      .limit(1)
      .single()
    if (data) return parseActaRow(data)
  }

  // Strategy 3: Match by date + teams
  if (matchDate) {
    const { data } = await supabase
      .from('fcf_referee_matches')
      .select('*')
      .eq('match_date', matchDate)
      .ilike('home_team', `%${homeTeam}%`)
      .ilike('away_team', `%${awayTeam}%`)
      .limit(1)
      .single()
    if (data) return parseActaRow(data)
  }

  // Strategy 4: Just teams (last resort)
  const { data } = await supabase
    .from('fcf_referee_matches')
    .select('*')
    .ilike('home_team', `%${homeTeam}%`)
    .ilike('away_team', `%${awayTeam}%`)
    .order('jornada', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null
  return parseActaRow(data)
}

/** Parse a raw fcf_referee_matches row into ActaData */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseActaRow(data: any): ActaData {
  return {
    goals: Array.isArray(data.goals) ? data.goals : [],
    yellow_cards: Array.isArray(data.yellow_cards) ? data.yellow_cards : [],
    red_cards: Array.isArray(data.red_cards) ? data.red_cards : [],
    substitutions: Array.isArray(data.substitutions) ? data.substitutions : [],
    home_lineup: Array.isArray(data.home_lineup) ? data.home_lineup : [],
    away_lineup: Array.isArray(data.away_lineup) ? data.away_lineup : [],
    home_bench: Array.isArray(data.home_bench) ? data.home_bench : [],
    away_bench: Array.isArray(data.away_bench) ? data.away_bench : [],
  }
}

/** Convert acta data into wizard events (pre-fill) — includes both teams */
export function actaToWizardEvents(
  acta: ActaData,
  isHome: boolean,
): Omit<MatchNoteEvent, 'id' | 'match_note_id'>[] {
  const events: Omit<MatchNoteEvent, 'id' | 'match_note_id'>[] = []
  const myTeam = isHome ? 'home' : 'away'
  const rivalTeam = isHome ? 'away' : 'home'

  // Goals (both teams)
  for (const g of acta.goals) {
    events.push({
      event_type: 'goal',
      minute: parseInt(g.minute) || 0,
      player_name: formatPlayerName(g.player),
      secondary_player: null,
      goal_type: null,
      goal_origin: null,
      shot_zone: null,
      note: 'Pre-carregat des de l\'acta FCF',
      is_opponent: g.team === rivalTeam,
    })
  }

  // Yellow cards (both teams)
  for (const c of acta.yellow_cards) {
    events.push({
      event_type: c.is_double_yellow_dismissal ? 'red_card' : 'yellow_card',
      minute: parseInt(c.minute) || 0,
      player_name: formatPlayerName(c.player),
      secondary_player: null,
      goal_type: null,
      goal_origin: null,
      shot_zone: null,
      note: c.is_double_yellow_dismissal ? 'Doble groga' : (c.team === rivalTeam ? 'Rival' : null),
      is_opponent: c.team === rivalTeam,
    })
  }

  // Red cards (both teams)
  for (const c of acta.red_cards) {
    events.push({
      event_type: 'red_card',
      minute: parseInt(c.minute) || 0,
      player_name: formatPlayerName(c.player),
      secondary_player: null,
      goal_type: null,
      goal_origin: null,
      shot_zone: null,
      note: c.team === rivalTeam ? 'Rival' : null,
      is_opponent: c.team === rivalTeam,
    })
  }

  // Substitutions (both teams)
  for (const s of acta.substitutions) {
    events.push({
      event_type: 'substitution',
      minute: parseInt(s.minute) || 0,
      player_name: formatPlayerName(s.player_in),
      secondary_player: formatPlayerName(s.player_out),
      goal_type: null,
      goal_origin: null,
      shot_zone: null,
      note: s.team === rivalTeam ? 'Rival' : null,
      is_opponent: s.team === rivalTeam,
    })
  }

  return events.sort((a, b) => a.minute - b.minute)
}

/** Convert acta lineup to wizard lineup entries */
export function actaToWizardLineups(
  acta: ActaData,
  isHome: boolean,
  formation: string,
): Omit<MatchNoteLineup, 'id' | 'match_note_id'>[] {
  const positions = FORMATIONS[formation] || FORMATIONS['4-3-3']
  const lineup = isHome ? acta.home_lineup : acta.away_lineup
  const bench = isHome ? acta.home_bench : acta.away_bench

  const lineups: Omit<MatchNoteLineup, 'id' | 'match_note_id'>[] = []

  // Starters: assign to formation positions
  const starters = lineup.filter((p) => p.is_starter)
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]
    const player = starters[i]
    lineups.push({
      player_name: player ? formatPlayerName(player.name) : '',
      player_slug: null,
      position_x: pos.x,
      position_y: pos.y,
      role: pos.role,
      is_starter: true,
      attendance: 'present',
      sub_minute: null,
      sub_out_minute: null,
      sub_reason: null,
      effort_rating: null,
      is_captain: false,
    })
  }

  // Bench players
  for (const p of bench) {
    lineups.push({
      player_name: formatPlayerName(p.name),
      player_slug: null,
      position_x: null,
      position_y: null,
      role: null,
      is_starter: false,
      attendance: 'present',
      sub_minute: null,
      sub_out_minute: null,
      sub_reason: null,
      effort_rating: null,
      is_captain: false,
    })
  }

  return lineups
}

/** Format FCF player names from "SURNAME, NAME" to "Name Surname" */
function formatPlayerName(raw: string): string {
  if (!raw) return ''
  // FCF format: "FONT FARRE, JOSEP" -> "Josep Font Farre"
  const parts = raw.split(',').map((s) => s.trim())
  if (parts.length === 2) {
    const [surname, name] = parts
    return titleCase(name) + ' ' + titleCase(surname)
  }
  return titleCase(raw)
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
