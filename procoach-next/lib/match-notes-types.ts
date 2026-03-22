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

export type GoalType =
  | 'right_foot'
  | 'left_foot'
  | 'header'
  | 'penalty'
  | 'free_kick'
  | 'own_goal'

export type PlayerRole =
  | 'GK' | 'CB' | 'LB' | 'RB'
  | 'CDM' | 'CM' | 'CAM'
  | 'LW' | 'RW' | 'ST'

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
}

export interface MatchNoteEvent {
  id: string
  match_note_id: string
  event_type: EventType
  minute: number
  player_name: string
  secondary_player: string | null
  goal_type: GoalType | null
  note: string | null
}

export interface MatchNoteRating {
  id: string
  match_note_id: string
  player_name: string
  player_slug: string | null
  rating: number
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
  }
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
  { key: 'solid_defense', label: 'Defensiu sòlid', color: 'blue' },
  { key: 'excessive_losses', label: 'Pèrdues excessives', color: 'red' },
  { key: 'scorer', label: 'Golejador', color: 'green' },
  { key: 'key_assists', label: 'Assistències clau', color: 'cyan' },
  { key: 'leadership', label: 'Lideratge', color: 'purple' },
  { key: 'technical_improvement', label: 'Millora tècnica', color: 'orange' },
  { key: 'great_attitude', label: 'Gran actitud', color: 'emerald' },
  { key: 'lack_intensity', label: 'Falta d\'intensitat', color: 'slate' },
  { key: 'serious_error', label: 'Error greu', color: 'rose' },
] as const

export const EVENT_LABELS: Record<EventType, string> = {
  goal: 'Gol',
  assist: 'Assistència',
  pre_assist: 'Pre-assistència',
  yellow_card: 'Targeta groga',
  red_card: 'Targeta vermella',
  substitution: 'Substitució',
  injury: 'Lesió',
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  right_foot: 'Peu dret',
  left_foot: 'Peu esquerre',
  header: 'Cap',
  penalty: 'Penal',
  free_kick: 'Falta directa',
  own_goal: 'Pròpia porta',
}

export const TACTICAL_LABELS: Record<TacticalApproach, string> = {
  possession: 'Possessió',
  counter: 'Contraatac',
  'high-press': 'Pressing alt',
  'low-block': 'Bloc baix',
}
