import { createClient } from '@/lib/supabase-client'
import type {
  TrainingExercise,
  TrainingSession,
  TrainingSessionFull,
  TrainingSessionExercise,
  TrainingAttendance,
  TrainingMicrocycle,
  ExerciseCategory,
  Intensity,
  SessionStatus,
  SessionPhase,
  FocusArea,
  CoachProfile,
  PublicExercise,
} from './training-types'

// ─── EXERCISES CRUD ─────────────────────────────────────

/** Fetch all exercises for the current user */
export async function fetchUserExercises(): Promise<TrainingExercise[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('training_exercises')
    .select('*')
    .order('name')

  if (error) throw error
  return data ?? []
}

/** Fetch exercises filtered by category */
export async function fetchExercisesByCategory(category: ExerciseCategory): Promise<TrainingExercise[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('training_exercises')
    .select('*')
    .eq('category', category)
    .order('name')

  if (error) throw error
  return data ?? []
}

/** Create or update an exercise */
export async function upsertExercise(
  exercise: Partial<TrainingExercise> & { name: string; category: ExerciseCategory }
): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const payload = {
    name: exercise.name,
    category: exercise.category,
    description: exercise.description ?? null,
    duration_min: exercise.duration_min ?? 15,
    intensity: exercise.intensity ?? 'medium',
    min_players: exercise.min_players ?? 2,
    equipment: exercise.equipment ?? [],
    tactical_objective: exercise.tactical_objective ?? null,
    diagram_data: exercise.diagram_data ?? { elements: [] },
    is_favorite: exercise.is_favorite ?? false,
    is_template: exercise.is_template ?? false,
    tags: exercise.tags ?? [],
  }

  if (exercise.id) {
    const { error } = await supabase
      .from('training_exercises')
      .update(payload)
      .eq('id', exercise.id)
    if (error) throw error
    return exercise.id
  }

  const { data, error } = await supabase
    .from('training_exercises')
    .insert({ ...payload, user_id: user.id })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/** Toggle exercise favorite */
export async function toggleExerciseFavorite(id: string, isFavorite: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('training_exercises')
    .update({ is_favorite: isFavorite })
    .eq('id', id)
  if (error) throw error
}

/** Delete an exercise */
export async function deleteExercise(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('training_exercises').delete().eq('id', id)
  if (error) throw error
}

// ─── SESSIONS CRUD ──────────────────────────────────────

/** Fetch all sessions for the current user */
export async function fetchUserSessions(): Promise<TrainingSession[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*')
    .order('session_date', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** Fetch sessions for a date range (dd-mm-yyyy strings) */
export async function fetchSessionsForRange(
  startDate: string,
  endDate: string,
): Promise<TrainingSession[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*')
    .gte('session_date', startDate)
    .lte('session_date', endDate)
    .order('session_date')

  if (error) throw error
  return data ?? []
}

/** Fetch a single session with all children */
export async function fetchTrainingSession(id: string): Promise<TrainingSessionFull | null> {
  const supabase = createClient()

  const [sessionRes, exercisesRes, attendanceRes] = await Promise.all([
    supabase.from('training_sessions').select('*').eq('id', id).single(),
    supabase
      .from('training_session_exercises')
      .select('*, exercise:training_exercises(*)')
      .eq('session_id', id)
      .order('phase')
      .order('sort_order'),
    supabase.from('training_attendance').select('*').eq('session_id', id).order('player_name'),
  ])

  if (sessionRes.error || !sessionRes.data) return null

  return {
    ...sessionRes.data,
    exercises: exercisesRes.data ?? [],
    attendance: attendanceRes.data ?? [],
  }
}

/** Create or update a training session (parent only) */
export async function upsertSession(
  session: Partial<TrainingSession> & { session_date: string }
): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const payload = {
    title: session.title ?? null,
    session_date: session.session_date,
    session_type: session.session_type ?? 'mixed',
    duration_min: session.duration_min ?? 90,
    planned_intensity: session.planned_intensity ?? 'medium',
    actual_intensity: session.actual_intensity ?? null,
    status: session.status ?? 'planned',
    match_day_delta: session.match_day_delta ?? null,
    linked_match_id: session.linked_match_id ?? null,
    focus_areas: session.focus_areas ?? [],
    coach_notes: session.coach_notes ?? null,
    weather: session.weather ?? null,
    pitch_condition: session.pitch_condition ?? null,
    microcycle_id: session.microcycle_id ?? null,
  }

  if (session.id) {
    const { error } = await supabase
      .from('training_sessions')
      .update(payload)
      .eq('id', session.id)
    if (error) throw error
    return session.id
  }

  const { data, error } = await supabase
    .from('training_sessions')
    .insert({ ...payload, user_id: user.id })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/** Delete a training session (cascades children) */
export async function deleteSession(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('training_sessions').delete().eq('id', id)
  if (error) throw error
}

/** Update session status */
export async function updateSessionStatus(
  id: string,
  status: SessionStatus,
  actualIntensity?: Intensity,
): Promise<void> {
  const supabase = createClient()
  const payload: Record<string, unknown> = { status }
  if (actualIntensity) payload.actual_intensity = actualIntensity
  const { error } = await supabase.from('training_sessions').update(payload).eq('id', id)
  if (error) throw error
}

/** Move a session to a new date */
export async function moveSession(id: string, newDate: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('training_sessions')
    .update({ session_date: newDate })
    .eq('id', id)
  if (error) throw error
}

// ─── SESSION EXERCISES CRUD ─────────────────────────────

/** Replace all exercises for a session */
export async function upsertSessionExercises(
  sessionId: string,
  exercises: Omit<TrainingSessionExercise, 'id' | 'session_id' | 'exercise'>[]
): Promise<void> {
  const supabase = createClient()

  await supabase.from('training_session_exercises').delete().eq('session_id', sessionId)

  if (exercises.length > 0) {
    const { error } = await supabase.from('training_session_exercises').insert(
      exercises.map((e) => ({
        session_id: sessionId,
        exercise_id: e.exercise_id ?? null,
        sort_order: e.sort_order,
        phase: e.phase,
        duration_min: e.duration_min,
        coach_notes: e.coach_notes ?? null,
        player_groups: e.player_groups ?? null,
        inline_name: e.inline_name ?? null,
        inline_description: e.inline_description ?? null,
        inline_diagram_data: e.inline_diagram_data ?? null,
      }))
    )
    if (error) throw error
  }
}

// ─── ATTENDANCE CRUD ────────────────────────────────────

/** Replace all attendance for a session */
export async function upsertAttendance(
  sessionId: string,
  attendance: Omit<TrainingAttendance, 'id' | 'session_id'>[]
): Promise<void> {
  const supabase = createClient()

  await supabase.from('training_attendance').delete().eq('session_id', sessionId)

  if (attendance.length > 0) {
    const { error } = await supabase.from('training_attendance').insert(
      attendance.map((a) => ({
        session_id: sessionId,
        player_name: a.player_name,
        player_slug: a.player_slug ?? null,
        status: a.status,
        minutes_trained: a.minutes_trained ?? null,
        intensity_override: a.intensity_override ?? null,
        notes: a.notes ?? null,
      }))
    )
    if (error) throw error
  }
}

// ─── MICROCYCLES CRUD ───────────────────────────────────

/** Fetch microcycles for a date range */
export async function fetchMicrocycles(): Promise<TrainingMicrocycle[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('training_microcycles')
    .select('*')
    .order('week_start', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** Create or update a microcycle */
export async function upsertMicrocycle(
  microcycle: Partial<TrainingMicrocycle> & { week_start: string; week_end: string }
): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const payload = {
    week_start: microcycle.week_start,
    week_end: microcycle.week_end,
    match_date: microcycle.match_date ?? null,
    linked_match_id: microcycle.linked_match_id ?? null,
    objective: microcycle.objective ?? null,
    notes: microcycle.notes ?? null,
  }

  if (microcycle.id) {
    const { error } = await supabase
      .from('training_microcycles')
      .update(payload)
      .eq('id', microcycle.id)
    if (error) throw error
    return microcycle.id
  }

  const { data, error } = await supabase
    .from('training_microcycles')
    .insert({ ...payload, user_id: user.id })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/** Delete a microcycle */
export async function deleteMicrocycle(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('training_microcycles').delete().eq('id', id)
  if (error) throw error
}

// ─── EXERCISE SHARING ───────────────────────────────────

function generateShareSlug(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 8)
}

/** Publish an exercise: generates a unique slug and sets is_public = true */
export async function publishExercise(id: string): Promise<string> {
  const supabase = createClient()
  // Reuse existing slug if already set, otherwise generate new
  const { data: existing } = await supabase
    .from('training_exercises')
    .select('share_slug')
    .eq('id', id)
    .single()

  const slug = existing?.share_slug || generateShareSlug()

  const { error } = await supabase
    .from('training_exercises')
    .update({ is_public: true, share_slug: slug, shared_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  return slug
}

/** Unpublish: sets is_public = false (slug is preserved so the link can be re-enabled) */
export async function unpublishExercise(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('training_exercises')
    .update({ is_public: false })
    .eq('id', id)
  if (error) throw error
}

/** Fetch a public exercise by slug — works without authentication (anon RLS) */
export async function fetchPublicExercise(slug: string): Promise<PublicExercise | null> {
  // Lazy import server client to avoid bundling server-only code in client components
  const { createClient: createServerClient } = await import('@/lib/supabase-server')
  const supabase = await createServerClient()

  const { data: exercise, error } = await supabase
    .from('training_exercises')
    .select('*')
    .eq('share_slug', slug)
    .eq('is_public', true)
    .single()

  if (error || !exercise) return null

  const { data: coach } = await supabase
    .from('coach_profiles')
    .select('*')
    .eq('user_id', exercise.user_id)
    .single()

  return { ...(exercise as TrainingExercise), coach: (coach as CoachProfile) ?? null }
}

/** Clone a public exercise into the current user's library */
export async function clonePublicExercise(exerciseId: string): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: source, error: fetchErr } = await supabase
    .from('training_exercises')
    .select('*')
    .eq('id', exerciseId)
    .eq('is_public', true)
    .single()

  if (fetchErr || !source) throw new Error('Exercise not found or not public')

  const { data: cloned, error } = await supabase
    .from('training_exercises')
    .insert({
      user_id: user.id,
      name: source.name,
      category: source.category,
      description: source.description,
      duration_min: source.duration_min,
      intensity: source.intensity,
      min_players: source.min_players,
      equipment: source.equipment,
      tactical_objective: source.tactical_objective,
      diagram_data: source.diagram_data,
      tags: source.tags,
      is_public: false,
    })
    .select('id')
    .single()

  if (error || !cloned) throw error ?? new Error('Clone failed')

  // Fire-and-forget: increment clone counter on the original
  supabase.rpc('increment_exercise_clone_count', { exercise_id: exerciseId }).then(() => {})

  return cloned.id
}

/** Upsert the authenticated user's coach profile */
export async function upsertCoachProfile(profile: Partial<CoachProfile>): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('coach_profiles')
    .upsert({ ...profile, user_id: user.id, updated_at: new Date().toISOString() })
  if (error) throw error
}

/** Fetch the coach profile for the current user (returns null if not set up yet) */
export async function fetchMyCoachProfile(): Promise<CoachProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('coach_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()
  return (data as CoachProfile) ?? null
}

// ─── FULL SESSION SAVE ──────────────────────────────────

/** Save an entire session with exercises and attendance */
export async function saveFullSession(
  state: {
    sessionId: string | null
    session: Partial<TrainingSession> & { session_date: string }
    exercises: Omit<TrainingSessionExercise, 'id' | 'session_id' | 'exercise'>[]
    attendance: Omit<TrainingAttendance, 'id' | 'session_id'>[]
  },
  status: SessionStatus = 'planned'
): Promise<string> {
  const sessionId = await upsertSession({
    ...state.session,
    id: state.sessionId ?? undefined,
    status,
  })

  await Promise.all([
    upsertSessionExercises(sessionId, state.exercises),
    upsertAttendance(sessionId, state.attendance),
  ])

  return sessionId
}
