import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from '@/lib/supabase-config'

const ADMIN_COOKIE = 'ns_admin_token'
const ADMIN_TOKEN_VALUE = 'ns-admin-ok'

async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(ADMIN_COOKIE)?.value === ADMIN_TOKEN_VALUE
}

function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null
  return createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } })
}

// GET: list all notes OR single note by ?id=
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json([], { status: 200 }) // Return empty if no service key
  }

  const id = request.nextUrl.searchParams.get('id')

  if (id) {
    const [noteRes, lineupsRes, eventsRes, ratingsRes] = await Promise.all([
      supabase.from('match_notes').select('*').eq('id', id).single(),
      supabase.from('match_note_lineups').select('*').eq('match_note_id', id),
      supabase.from('match_note_events').select('*').eq('match_note_id', id).order('minute'),
      supabase.from('match_note_ratings').select('*').eq('match_note_id', id),
    ])

    if (noteRes.error || !noteRes.data) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      ...noteRes.data,
      lineups: lineupsRes.data ?? [],
      events: eventsRes.data ?? [],
      ratings: ratingsRes.data ?? [],
    })
  }

  const { data, error } = await supabase
    .from('match_notes')
    .select('*')
    .order('match_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST: upsert full match note (parent + children)
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 503 })
  }

  const body = await request.json()
  const { matchNoteId, matchData, formation, lineups, events, ratings, summary, status } = body

  // Build note payload (mirrors upsertMatchNote in match-notes-data.ts)
  const payload = {
    opponent: matchData.opponent,
    match_date: matchData.match_date,
    is_home: matchData.is_home,
    goals_for: matchData.goals_for ?? null,
    goals_against: matchData.goals_against ?? null,
    formation: formation ?? null,
    overall_rating: summary?.overall_rating ?? null,
    tactical_approach: summary?.tactical_approach ?? null,
    key_moments: summary?.key_moments ?? null,
    opponent_analysis: summary?.opponent_analysis ?? null,
    areas_to_improve: summary?.areas_to_improve ?? null,
    training_focus: summary?.training_focus ?? null,
    possession_estimate: summary?.possession_estimate ?? null,
    corners_for: summary?.corners_for ?? null,
    corners_against: summary?.corners_against ?? null,
    fouls_for: summary?.fouls_for ?? null,
    fouls_against: summary?.fouls_against ?? null,
    offsides_for: summary?.offsides_for ?? null,
    offsides_against: summary?.offsides_against ?? null,
    shots_for: summary?.shots_for ?? null,
    shots_against: summary?.shots_against ?? null,
    saves: summary?.saves ?? null,
    half_time_score_for: summary?.half_time_score_for ?? null,
    half_time_score_against: summary?.half_time_score_against ?? null,
    shots_blocked_for: summary?.shots_blocked_for ?? null,
    shots_blocked_against: summary?.shots_blocked_against ?? null,
    dribbles_attempted: summary?.dribbles_attempted ?? null,
    dribbles_completed: summary?.dribbles_completed ?? null,
    total_passes_for: summary?.total_passes_for ?? null,
    total_passes_against: summary?.total_passes_against ?? null,
    pass_accuracy: summary?.pass_accuracy ?? null,
    tackles_for: summary?.tackles_for ?? null,
    tackles_against: summary?.tackles_against ?? null,
    clearances: summary?.clearances ?? null,
    aerial_duels_won: summary?.aerial_duels_won ?? null,
    aerial_duels_lost: summary?.aerial_duels_lost ?? null,
    throw_ins_for: summary?.throw_ins_for ?? null,
    throw_ins_against: summary?.throw_ins_against ?? null,
    goal_kicks_for: summary?.goal_kicks_for ?? null,
    goal_kicks_against: summary?.goal_kicks_against ?? null,
    penalties_for: summary?.penalties_for ?? null,
    penalties_against: summary?.penalties_against ?? null,
    penalties_scored: summary?.penalties_scored ?? null,
    penalties_saved: summary?.penalties_saved ?? null,
    high_claims: summary?.high_claims ?? null,
    phase_attack: summary?.phase_attack ?? null,
    phase_defense: summary?.phase_defense ?? null,
    phase_transition_atk: summary?.phase_transition_atk ?? null,
    phase_transition_def: summary?.phase_transition_def ?? null,
    phase_set_pieces: summary?.phase_set_pieces ?? null,
    pitch_condition: summary?.pitch_condition ?? null,
    weather: summary?.weather ?? null,
    captain: summary?.captain ?? null,
    status: status ?? 'draft',
  }

  let noteId: string

  if (matchNoteId) {
    const { error } = await supabase.from('match_notes').update(payload).eq('id', matchNoteId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    noteId = matchNoteId
  } else {
    // Use a fixed admin sentinel user_id so the column constraint is satisfied
    const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001'
    const { data, error } = await supabase
      .from('match_notes')
      .insert({ ...payload, user_id: ADMIN_USER_ID })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    noteId = data.id
  }

  // Replace children in parallel
  await Promise.all([
    supabase.from('match_note_lineups').delete().eq('match_note_id', noteId),
    supabase.from('match_note_events').delete().eq('match_note_id', noteId),
    supabase.from('match_note_ratings').delete().eq('match_note_id', noteId),
  ])

  await Promise.all([
    lineups?.length > 0
      ? supabase.from('match_note_lineups').insert(
          lineups.map((l: Record<string, unknown>) => ({ ...l, match_note_id: noteId }))
        )
      : Promise.resolve(),
    events?.length > 0
      ? supabase.from('match_note_events').insert(
          events.map((e: Record<string, unknown>) => ({ ...e, match_note_id: noteId }))
        )
      : Promise.resolve(),
    ratings?.length > 0
      ? supabase.from('match_note_ratings').insert(
          ratings.map((r: Record<string, unknown>) => ({ ...r, match_note_id: noteId }))
        )
      : Promise.resolve(),
  ])

  return NextResponse.json({ id: noteId })
}

// DELETE: remove a note by ?id=
export async function DELETE(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 503 })
  }
  const { error } = await supabase.from('match_notes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
