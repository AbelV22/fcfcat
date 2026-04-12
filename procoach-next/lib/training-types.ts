// Types for the Training Sessions (Entrenaments) feature

// ─── Enums / Union Types ────────────────────────────────

export type ExerciseCategory =
  | 'warmup'
  | 'rondo'
  | 'possession'
  | 'finishing'
  | 'defensive_shape'
  | 'set_pieces'
  | 'conditioning'
  | 'cooldown'
  | 'tactical'
  | 'technical'
  | 'ssg'
  | 'mixed'

export type Intensity = 'low' | 'medium' | 'high' | 'very_high'

export type SessionType =
  | 'pre_match'
  | 'post_match'
  | 'recovery'
  | 'technical'
  | 'tactical'
  | 'physical'
  | 'mixed'

export type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export type SessionPhase = 'warmup' | 'main' | 'cooldown'

export type TrainingAttendanceStatus = 'present' | 'absent' | 'injured' | 'late' | 'modified'

export type FocusArea = 'technical' | 'tactical' | 'physical' | 'mental'

// ─── Diagram Types ──────────────────────────────────────

export type DiagramElementType =
  | 'player'
  | 'opponent'
  | 'arrow'
  | 'curved_arrow'
  | 'ball'
  | 'zone'
  | 'text'
  | 'cone'
  | 'goal'

export interface DiagramElement {
  id: string
  type: DiagramElementType
  x: number
  y: number
  x2?: number       // end point for arrows
  y2?: number
  cx?: number       // control point for curved arrows
  cy?: number
  width?: number    // for zones
  height?: number   // for zones
  color?: string
  label?: string
  rotation?: number
  opacity?: number  // for zones
}

export interface DiagramData {
  elements: DiagramElement[]
}

// ─── Database Models ────────────────────────────────────

export interface TrainingExercise {
  id: string
  user_id: string
  name: string
  category: ExerciseCategory
  description: string | null
  duration_min: number
  intensity: Intensity
  min_players: number
  equipment: string[]
  tactical_objective: string | null
  diagram_data: DiagramData
  is_favorite: boolean
  is_template: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

export interface TrainingSession {
  id: string
  user_id: string
  title: string | null
  session_date: string          // dd-mm-yyyy
  session_type: SessionType
  duration_min: number
  planned_intensity: Intensity
  actual_intensity: Intensity | null
  status: SessionStatus
  match_day_delta: number | null
  linked_match_id: string | null
  focus_areas: FocusArea[]
  coach_notes: string | null
  weather: string | null
  pitch_condition: string | null
  microcycle_id: string | null
  created_at: string
  updated_at: string
}

export interface TrainingSessionExercise {
  id: string
  session_id: string
  exercise_id: string | null
  sort_order: number
  phase: SessionPhase
  duration_min: number
  coach_notes: string | null
  player_groups: string[][] | null
  inline_name: string | null
  inline_description: string | null
  inline_diagram_data: DiagramData | null
  // Joined from training_exercises when exercise_id is set
  exercise?: TrainingExercise
}

export interface TrainingAttendance {
  id: string
  session_id: string
  player_name: string
  player_slug: string | null
  status: TrainingAttendanceStatus
  minutes_trained: number | null
  intensity_override: Intensity | null
  notes: string | null
}

export interface TrainingMicrocycle {
  id: string
  user_id: string
  week_start: string            // dd-mm-yyyy (Monday)
  week_end: string              // dd-mm-yyyy (Sunday)
  match_date: string | null
  linked_match_id: string | null
  objective: string | null
  notes: string | null
  created_at: string
}

/** Full session with all children */
export interface TrainingSessionFull extends TrainingSession {
  exercises: TrainingSessionExercise[]
  attendance: TrainingAttendance[]
}

// ─── Catalan Labels ─────────────────────────────────────

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  warmup: 'Escalfament',
  rondo: 'Rondo',
  possession: 'Possessio',
  finishing: 'Finalitzacio',
  defensive_shape: 'Defensa',
  set_pieces: 'Pilota aturada',
  conditioning: 'Condicio fisica',
  cooldown: 'Tornada a la calma',
  tactical: 'Tactic',
  technical: 'Tecnic',
  ssg: 'Jocs reduits',
  mixed: 'Mixt',
}

export const INTENSITY_LABELS: Record<Intensity, string> = {
  low: 'Baixa',
  medium: 'Mitjana',
  high: 'Alta',
  very_high: 'Molt alta',
}

export const INTENSITY_COLORS: Record<Intensity, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  very_high: '#ef4444',
}

export const INTENSITY_FACTOR: Record<Intensity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  very_high: 4,
}

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  pre_match: 'Pre-partit',
  post_match: 'Post-partit',
  recovery: 'Recuperacio',
  technical: 'Tecnic',
  tactical: 'Tactic',
  physical: 'Fisic',
  mixed: 'Mixt',
}

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  planned: 'Planificada',
  in_progress: 'En curs',
  completed: 'Completada',
  cancelled: 'Cancel·lada',
}

export const PHASE_LABELS: Record<SessionPhase, string> = {
  warmup: 'Escalfament',
  main: 'Part principal',
  cooldown: 'Tornada a la calma',
}

export const ATTENDANCE_LABELS: Record<TrainingAttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  injured: 'Lesionat',
  late: 'Tard',
  modified: 'Modificat',
}

export const ATTENDANCE_COLORS: Record<TrainingAttendanceStatus, string> = {
  present: '#22c55e',
  absent: '#ef4444',
  injured: '#f59e0b',
  late: '#eab308',
  modified: '#3b82f6',
}

export const FOCUS_AREA_LABELS: Record<FocusArea, string> = {
  technical: 'Tecnic',
  tactical: 'Tactic',
  physical: 'Fisic',
  mental: 'Mental',
}

export const EQUIPMENT_OPTIONS = [
  'Pilotes',
  'Cons',
  'Petos',
  'Piques',
  'Escales',
  'Porteries petites',
  'Tanques',
  'Cintes',
  'Mànegues',
  'Maniquís',
] as const

export const DIAGRAM_ELEMENT_COLORS = [
  '#22c55e', // green (players)
  '#ef4444', // red (opponents)
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ffffff', // white
  '#06b6d4', // cyan
] as const

// ─── Day labels (Catalan) ───────────────────────────────

export const DAY_LABELS_SHORT = ['Dl', 'Dm', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'] as const
export const DAY_LABELS_FULL = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'] as const

export const MONTH_LABELS = [
  'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
  'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre',
] as const

// ─── Helpers ────────────────────────────────────────────

/** Convert dd-mm-yyyy to Date object */
export function parseDate(dateStr: string): Date {
  const [d, m, y] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Convert Date to dd-mm-yyyy */
export function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}-${m}-${y}`
}

/** Get Monday of the week containing the given date */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = 1
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Get Sunday of the week containing the given date */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return end
}

/** Calculate session load: duration * intensity factor */
export function calculateLoad(durationMin: number, intensity: Intensity): number {
  return durationMin * INTENSITY_FACTOR[intensity]
}

/** Generate a unique ID for diagram elements */
export function generateElementId(): string {
  return Math.random().toString(36).substring(2, 9)
}
