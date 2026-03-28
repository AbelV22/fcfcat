// Types for the Match Notes (Apunts de Partit) feature

export type AttendanceStatus = 'present' | 'absent' | 'injured' | 'sanctioned'
export type MatchNoteStatus = 'draft' | 'completed'
export type TacticalApproach = 'possession' | 'counter' | 'high-press' | 'low-block'

export type EventType =
  | 'goal'
  | 'assist'
  | 'pre_assist'
  | 'yellow_card'
  | 'red_card'
  | 'substitution'
  | 'injury'
  // Tier 2 events
  | 'shot_on_target'
  | 'shot_off_target'
  | 'shot_woodwork'
  | 'corner'
  | 'foul_committed'
  | 'foul_suffered'
  | 'save'
  | 'offside'
  | 'chance_created'
  // Individual stats
  | 'recovery'
  | 'turnover'
  | 'duel_won'
  | 'duel_lost'
  | 'accurate_pass'
  | 'cross'
  // Custom coach stats
  | `custom_${string}`

export type GoalType =
  | 'right_foot'
  | 'left_foot'
  | 'header'
  | 'penalty'
  | 'free_kick'
  | 'own_goal'

export type GoalOrigin =
  | 'open_play'
  | 'corner'
  | 'free_kick'
  | 'penalty'
  | 'throw_in'
  | 'counter_attack'

export type ShotZone = 'inside_box' | 'outside_box'

export type PlayerRole =
  | 'GK' | 'CB' | 'LB' | 'RB'
  | 'CDM' | 'CM' | 'CAM'
  | 'LW' | 'RW' | 'ST'

export type SubReason = 'tactical' | 'injury' | 'fatigue' | 'disciplinary'

export interface MatchNote {
  id: string
  user_id: string
  opponent: string
  match_date: string
  is_home: boolean
  goals_for: number | null
  goals_against: number | null
  formation: string | null
  overall_rating: number | null
  tactical_approach: TacticalApproach | null
  key_moments: string | null
  opponent_analysis: string | null
  areas_to_improve: string | null
  status: MatchNoteStatus
  // Match stats (manual input)
  possession_estimate: number | null // 0-100 (kept for backward compat)
  corners_for: number | null
  corners_against: number | null
  fouls_for: number | null
  fouls_against: number | null
  offsides_for: number | null
  offsides_against: number | null
  shots_for: number | null
  shots_against: number | null
  saves: number | null
  half_time_score_for: number | null
  half_time_score_against: number | null
  // Attack
  shots_blocked_for: number | null
  shots_blocked_against: number | null
  dribbles_attempted: number | null
  dribbles_completed: number | null
  // Distribution
  total_passes_for: number | null
  total_passes_against: number | null
  pass_accuracy: number | null // 0-100
  // Defense
  tackles_for: number | null
  tackles_against: number | null
  clearances: number | null
  aerial_duels_won: number | null
  aerial_duels_lost: number | null
  // Set pieces
  throw_ins_for: number | null
  throw_ins_against: number | null
  goal_kicks_for: number | null
  goal_kicks_against: number | null
  penalties_for: number | null
  penalties_against: number | null
  penalties_scored: number | null
  penalties_saved: number | null
  // Goalkeeping
  high_claims: number | null
  // Phase ratings
  phase_attack: number | null   // 1-5
  phase_defense: number | null  // 1-5
  phase_transition_atk: number | null // 1-5
  phase_transition_def: number | null // 1-5
  phase_set_pieces: number | null // 1-5
  // Tactical / notes
  training_focus: string | null
  pitch_condition: string | null
  weather: string | null
  captain: string | null
  created_at: string
  updated_at: string
}

export interface MatchNoteLineup {
  id: string
  match_note_id: string
  player_name: string
  player_slug: string | null
  position_x: number | null
  position_y: number | null
  role: PlayerRole | null
  is_starter: boolean
  attendance: AttendanceStatus
  sub_minute: number | null
  sub_out_minute: number | null
  sub_reason: SubReason | null
  effort_rating: number | null // 1-5
  is_captain: boolean
}

export interface MatchNoteEvent {
  id: string
  match_note_id: string
  event_type: EventType
  minute: number
  player_name: string
  secondary_player: string | null
  goal_type: GoalType | null
  goal_origin: GoalOrigin | null
  shot_zone: ShotZone | null
  note: string | null
  is_opponent: boolean // true = event by opponent (e.g. corner against us)
}

export interface MatchNoteRating {
  id: string
  match_note_id: string
  player_name: string
  player_slug: string | null
  rating: number
  effort_rating: number | null // 1-5 (effort/attitude)
  tags: string[]
  note: string | null
}

// Full match note with all related data
export interface MatchNoteFull extends MatchNote {
  lineups: MatchNoteLineup[]
  events: MatchNoteEvent[]
  ratings: MatchNoteRating[]
}

// Wizard state (stored in localStorage)
export interface WizardState {
  step: number
  matchNoteId: string | null
  matchData: {
    opponent: string
    match_date: string
    is_home: boolean
    goals_for: number | null
    goals_against: number | null
    jornada: number | null
    competition: string | null
    group_name: string | null
  } | null
  formation: string | null
  lineups: Omit<MatchNoteLineup, 'id' | 'match_note_id'>[]
  events: Omit<MatchNoteEvent, 'id' | 'match_note_id'>[]
  ratings: Omit<MatchNoteRating, 'id' | 'match_note_id'>[]
  summary: {
    overall_rating: number | null
    tactical_approach: TacticalApproach | null
    key_moments: string
    opponent_analysis: string
    areas_to_improve: string
    training_focus: string
    possession_estimate: number | null
    corners_for: number | null
    corners_against: number | null
    fouls_for: number | null
    fouls_against: number | null
    offsides_for: number | null
    offsides_against: number | null
    shots_for: number | null
    shots_against: number | null
    saves: number | null
    half_time_score_for: number | null
    half_time_score_against: number | null
    // Attack
    shots_blocked_for: number | null
    shots_blocked_against: number | null
    dribbles_attempted: number | null
    dribbles_completed: number | null
    // Distribution
    total_passes_for: number | null
    total_passes_against: number | null
    pass_accuracy: number | null
    // Defense
    tackles_for: number | null
    tackles_against: number | null
    clearances: number | null
    aerial_duels_won: number | null
    aerial_duels_lost: number | null
    // Set pieces
    throw_ins_for: number | null
    throw_ins_against: number | null
    goal_kicks_for: number | null
    goal_kicks_against: number | null
    penalties_for: number | null
    penalties_against: number | null
    penalties_scored: number | null
    penalties_saved: number | null
    // Goalkeeping
    high_claims: number | null
    // Phase ratings
    phase_attack: number | null
    phase_defense: number | null
    phase_transition_atk: number | null
    phase_transition_def: number | null
    phase_set_pieces: number | null
    pitch_condition: string | null
    weather: string | null
    captain: string | null
  }
  // Pre-filled acta data (from Supabase)
  actaPrefilled: boolean
  // Players from acta (available for events/ratings without needing lineup step)
  actaPlayers: string[]
  // Custom stats created by the coach
  customStats: { key: string; label: string }[]
}

// Acta data from fcf_referee_matches for pre-filling
export interface ActaData {
  goals: { player: string; minute: string; team: 'home' | 'away' }[]
  yellow_cards: { player: string; minute: string; team: 'home' | 'away'; is_double_yellow_dismissal?: boolean }[]
  red_cards: { player: string; minute: string; team: 'home' | 'away' }[]
  substitutions: { player_out: string; player_in: string; minute: string; team: 'home' | 'away' }[]
  home_lineup: { name: string; number: number; is_starter: boolean }[]
  away_lineup: { name: string; number: number; is_starter: boolean }[]
  home_bench: { name: string; number: number; is_starter: boolean }[]
  away_bench: { name: string; number: number; is_starter: boolean }[]
}

// Formation presets
export interface FormationPosition {
  role: PlayerRole
  x: number // 0-1 (left to right)
  y: number // 0-1 (own goal to opponent goal)
  label: string
}

export const FORMATIONS: Record<string, FormationPosition[]> = {
  '4-3-3': [
    { role: 'GK', x: 0.5, y: 0.06, label: 'POR' },
    { role: 'LB', x: 0.15, y: 0.25, label: 'LE' },
    { role: 'CB', x: 0.37, y: 0.2, label: 'DC' },
    { role: 'CB', x: 0.63, y: 0.2, label: 'DC' },
    { role: 'RB', x: 0.85, y: 0.25, label: 'LD' },
    { role: 'CM', x: 0.25, y: 0.45, label: 'MC' },
    { role: 'CDM', x: 0.5, y: 0.4, label: 'MCD' },
    { role: 'CM', x: 0.75, y: 0.45, label: 'MC' },
    { role: 'LW', x: 0.18, y: 0.72, label: 'EE' },
    { role: 'ST', x: 0.5, y: 0.78, label: 'DC' },
    { role: 'RW', x: 0.82, y: 0.72, label: 'ED' },
  ],
  '4-4-2': [
    { role: 'GK', x: 0.5, y: 0.06, label: 'POR' },
    { role: 'LB', x: 0.15, y: 0.25, label: 'LE' },
    { role: 'CB', x: 0.37, y: 0.2, label: 'DC' },
    { role: 'CB', x: 0.63, y: 0.2, label: 'DC' },
    { role: 'RB', x: 0.85, y: 0.25, label: 'LD' },
    { role: 'LW', x: 0.15, y: 0.5, label: 'ME' },
    { role: 'CM', x: 0.37, y: 0.45, label: 'MC' },
    { role: 'CM', x: 0.63, y: 0.45, label: 'MC' },
    { role: 'RW', x: 0.85, y: 0.5, label: 'MD' },
    { role: 'ST', x: 0.35, y: 0.75, label: 'DC' },
    { role: 'ST', x: 0.65, y: 0.75, label: 'DC' },
  ],
  '3-5-2': [
    { role: 'GK', x: 0.5, y: 0.06, label: 'POR' },
    { role: 'CB', x: 0.25, y: 0.2, label: 'DC' },
    { role: 'CB', x: 0.5, y: 0.18, label: 'DC' },
    { role: 'CB', x: 0.75, y: 0.2, label: 'DC' },
    { role: 'LW', x: 0.1, y: 0.45, label: 'CE' },
    { role: 'CM', x: 0.32, y: 0.42, label: 'MC' },
    { role: 'CDM', x: 0.5, y: 0.38, label: 'MCD' },
    { role: 'CM', x: 0.68, y: 0.42, label: 'MC' },
    { role: 'RW', x: 0.9, y: 0.45, label: 'CD' },
    { role: 'ST', x: 0.35, y: 0.75, label: 'DC' },
    { role: 'ST', x: 0.65, y: 0.75, label: 'DC' },
  ],
  '4-2-3-1': [
    { role: 'GK', x: 0.5, y: 0.06, label: 'POR' },
    { role: 'LB', x: 0.15, y: 0.25, label: 'LE' },
    { role: 'CB', x: 0.37, y: 0.2, label: 'DC' },
    { role: 'CB', x: 0.63, y: 0.2, label: 'DC' },
    { role: 'RB', x: 0.85, y: 0.25, label: 'LD' },
    { role: 'CDM', x: 0.35, y: 0.4, label: 'MCD' },
    { role: 'CDM', x: 0.65, y: 0.4, label: 'MCD' },
    { role: 'LW', x: 0.18, y: 0.6, label: 'EE' },
    { role: 'CAM', x: 0.5, y: 0.58, label: 'MO' },
    { role: 'RW', x: 0.82, y: 0.6, label: 'ED' },
    { role: 'ST', x: 0.5, y: 0.78, label: 'DC' },
  ],
  '3-4-3': [
    { role: 'GK', x: 0.5, y: 0.06, label: 'POR' },
    { role: 'CB', x: 0.25, y: 0.2, label: 'DC' },
    { role: 'CB', x: 0.5, y: 0.18, label: 'DC' },
    { role: 'CB', x: 0.75, y: 0.2, label: 'DC' },
    { role: 'LW', x: 0.1, y: 0.45, label: 'CE' },
    { role: 'CM', x: 0.37, y: 0.42, label: 'MC' },
    { role: 'CM', x: 0.63, y: 0.42, label: 'MC' },
    { role: 'RW', x: 0.9, y: 0.45, label: 'CD' },
    { role: 'LW', x: 0.2, y: 0.72, label: 'EE' },
    { role: 'ST', x: 0.5, y: 0.78, label: 'DC' },
    { role: 'RW', x: 0.8, y: 0.72, label: 'ED' },
  ],
  '5-3-2': [
    { role: 'GK', x: 0.5, y: 0.06, label: 'POR' },
    { role: 'LB', x: 0.08, y: 0.28, label: 'CE' },
    { role: 'CB', x: 0.28, y: 0.2, label: 'DC' },
    { role: 'CB', x: 0.5, y: 0.18, label: 'DC' },
    { role: 'CB', x: 0.72, y: 0.2, label: 'DC' },
    { role: 'RB', x: 0.92, y: 0.28, label: 'CD' },
    { role: 'CM', x: 0.28, y: 0.45, label: 'MC' },
    { role: 'CDM', x: 0.5, y: 0.42, label: 'MCD' },
    { role: 'CM', x: 0.72, y: 0.45, label: 'MC' },
    { role: 'ST', x: 0.35, y: 0.75, label: 'DC' },
    { role: 'ST', x: 0.65, y: 0.75, label: 'DC' },
  ],
  '4-1-4-1': [
    { role: 'GK', x: 0.5, y: 0.06, label: 'POR' },
    { role: 'LB', x: 0.15, y: 0.25, label: 'LE' },
    { role: 'CB', x: 0.37, y: 0.2, label: 'DC' },
    { role: 'CB', x: 0.63, y: 0.2, label: 'DC' },
    { role: 'RB', x: 0.85, y: 0.25, label: 'LD' },
    { role: 'CDM', x: 0.5, y: 0.35, label: 'MCD' },
    { role: 'LW', x: 0.15, y: 0.55, label: 'ME' },
    { role: 'CM', x: 0.37, y: 0.52, label: 'MC' },
    { role: 'CM', x: 0.63, y: 0.52, label: 'MC' },
    { role: 'RW', x: 0.85, y: 0.55, label: 'MD' },
    { role: 'ST', x: 0.5, y: 0.78, label: 'DC' },
  ],
}

// Player tags for quick assessment
export const PLAYER_TAGS = [
  { key: 'mvp', label: 'MVP', color: 'amber' },
  { key: 'solid_defense', label: 'Defensiu solid', color: 'blue' },
  { key: 'excessive_losses', label: 'Perdues excessives', color: 'red' },
  { key: 'scorer', label: 'Golejador', color: 'green' },
  { key: 'key_assists', label: 'Assistencies clau', color: 'cyan' },
  { key: 'leadership', label: 'Lideratge', color: 'purple' },
  { key: 'technical_improvement', label: 'Millora tecnica', color: 'orange' },
  { key: 'great_attitude', label: 'Gran actitud', color: 'emerald' },
  { key: 'lack_intensity', label: 'Falta d\'intensitat', color: 'slate' },
  { key: 'serious_error', label: 'Error greu', color: 'rose' },
  { key: 'good_in_duels', label: 'Bo en duels', color: 'indigo' },
  { key: 'creative', label: 'Creatiu', color: 'violet' },
  { key: 'fast', label: 'Rapid', color: 'lime' },
  { key: 'aerial_dominant', label: 'Dominant aeri', color: 'sky' },
] as const

export const EVENT_LABELS: Record<EventType, string> = {
  goal: 'Gol',
  assist: 'Assistencia',
  pre_assist: 'Pre-assistencia',
  yellow_card: 'Targeta groga',
  red_card: 'Targeta vermella',
  substitution: 'Substitucio',
  injury: 'Lesio',
  shot_on_target: 'Tir a porta',
  shot_off_target: 'Tir fora',
  shot_woodwork: 'Tir al pal',
  corner: 'Corner',
  foul_committed: 'Falta comesa',
  foul_suffered: 'Falta rebuda',
  save: 'Parada',
  offside: 'Fora de joc',
  chance_created: 'Ocasio creada',
  recovery: 'Recuperacio',
  turnover: 'Perdua',
  duel_won: 'Duel guanyat',
  duel_lost: 'Duel perdut',
  accurate_pass: 'Passada clau',
  cross: 'Centrada',
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  right_foot: 'Peu dret',
  left_foot: 'Peu esquerre',
  header: 'Cap',
  penalty: 'Penal',
  free_kick: 'Falta directa',
  own_goal: 'Propia porta',
}

export const GOAL_ORIGIN_LABELS: Record<GoalOrigin, string> = {
  open_play: 'Joc obert',
  corner: 'Corner',
  free_kick: 'Falta',
  penalty: 'Penal',
  throw_in: 'Banda',
  counter_attack: 'Contraatac',
}

export const TACTICAL_LABELS: Record<TacticalApproach, string> = {
  possession: 'Possessio',
  counter: 'Contraatac',
  'high-press': 'Pressing alt',
  'low-block': 'Bloc baix',
}

export const PHASE_LABELS: Record<string, string> = {
  phase_attack: 'Atac',
  phase_defense: 'Defensa',
  phase_transition_atk: 'Transicio ofensiva',
  phase_transition_def: 'Transicio defensiva',
  phase_set_pieces: 'Pilota aturada',
}

export const WEATHER_OPTIONS = [
  { value: 'sunny', label: 'Sol', emoji: '☀️' },
  { value: 'cloudy', label: 'Nuvol', emoji: '☁️' },
  { value: 'rain', label: 'Pluja', emoji: '🌧️' },
  { value: 'wind', label: 'Vent', emoji: '💨' },
  { value: 'cold', label: 'Fred', emoji: '🥶' },
] as const

export const PITCH_CONDITION_OPTIONS = [
  { value: 'good', label: 'Bo', emoji: '✅' },
  { value: 'average', label: 'Regular', emoji: '⚠️' },
  { value: 'poor', label: 'Dolent', emoji: '❌' },
] as const

// Event categories for quick-add buttons (grouped)
export const EVENT_CATEGORIES = {
  key: ['goal', 'assist', 'pre_assist'] as EventType[],
  discipline: ['yellow_card', 'red_card', 'foul_committed', 'foul_suffered'] as EventType[],
  shots: ['shot_on_target', 'shot_off_target', 'shot_woodwork'] as EventType[],
  other: ['corner', 'save', 'offside', 'chance_created', 'substitution', 'injury'] as EventType[],
  individual: ['recovery', 'turnover', 'duel_won', 'duel_lost', 'accurate_pass', 'cross'] as EventType[],
}
