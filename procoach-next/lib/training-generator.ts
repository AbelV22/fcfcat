/**
 * Training Session Generator
 * Generates a complete session plan from 3 inputs: duration, match-day delta, focus areas.
 * Uses exercises from the user's library (or seed exercises as fallback).
 */

import type {
  TrainingExercise, ExerciseCategory, Intensity, SessionType,
  SessionPhase, FocusArea,
} from './training-types'

// ─── Input / Output Types ───────────────────────────────

export interface GeneratorInput {
  durationMin: number              // Total session duration (60-120)
  matchDayDelta: number | null     // -4,-3,-2,-1,+1, null = no match
  focusAreas: FocusArea[]          // technical, tactical, physical, mental
  subFocus: string[]               // possession, finishing, defensive, pressing, transitions, set_pieces, build_up
  exercises: TrainingExercise[]    // Available exercise pool
}

export interface GeneratedExercise {
  tempId: string
  exerciseId: string | null
  name: string
  phase: SessionPhase
  durationMin: number
  coachNotes: string
  intensity: Intensity
  exercise?: TrainingExercise
}

export interface GeneratedSession {
  exercises: GeneratedExercise[]
  plannedIntensity: Intensity
  sessionType: SessionType
  title: string
  focusAreas: FocusArea[]
}

// ─── MD Delta → Intensity + Session Type ────────────────

interface MDProfile {
  intensity: Intensity
  sessionType: SessionType
  title: string
  preferredCategories: ExerciseCategory[]
  avoidCategories: ExerciseCategory[]
}

const MD_PROFILES: Record<number, MDProfile> = {
  [-4]: {
    intensity: 'high',
    sessionType: 'physical',
    title: 'Sessio de carrega (MD-4)',
    preferredCategories: ['conditioning', 'possession', 'tactical', 'ssg'],
    avoidCategories: ['cooldown'],
  },
  [-3]: {
    intensity: 'very_high',
    sessionType: 'tactical',
    title: 'Sessio d\'alta intensitat (MD-3)',
    preferredCategories: ['ssg', 'finishing', 'conditioning', 'possession'],
    avoidCategories: ['cooldown'],
  },
  [-2]: {
    intensity: 'medium',
    sessionType: 'tactical',
    title: 'Sessio tactica (MD-2)',
    preferredCategories: ['tactical', 'set_pieces', 'possession', 'rondo', 'technical'],
    avoidCategories: ['conditioning'],
  },
  [-1]: {
    intensity: 'low',
    sessionType: 'pre_match',
    title: 'Activacio pre-partit (MD-1)',
    preferredCategories: ['rondo', 'technical', 'finishing', 'set_pieces'],
    avoidCategories: ['conditioning', 'ssg', 'defensive_shape'],
  },
  [1]: {
    intensity: 'low',
    sessionType: 'recovery',
    title: 'Recuperacio (MD+1)',
    preferredCategories: ['cooldown', 'rondo', 'technical'],
    avoidCategories: ['conditioning', 'ssg', 'finishing', 'defensive_shape'],
  },
}

const DEFAULT_PROFILE: MDProfile = {
  intensity: 'medium',
  sessionType: 'mixed',
  title: 'Sessio d\'entrenament',
  preferredCategories: ['rondo', 'possession', 'ssg', 'technical', 'tactical', 'finishing'],
  avoidCategories: [],
}

// ─── Focus → Category mapping ───────────────────────────

const FOCUS_CATEGORIES: Record<string, ExerciseCategory[]> = {
  // Main focus areas
  technical: ['technical', 'rondo'],
  tactical: ['tactical', 'possession', 'defensive_shape'],
  physical: ['conditioning', 'ssg'],
  mental: ['rondo', 'ssg', 'possession'],
  // Sub-focus options
  possession: ['possession', 'rondo'],
  finishing: ['finishing'],
  defensive: ['defensive_shape'],
  pressing: ['defensive_shape', 'ssg'],
  transitions: ['ssg', 'finishing', 'defensive_shape'],
  set_pieces: ['set_pieces'],
  build_up: ['tactical', 'possession'],
}

// ─── Phase time distribution ────────────────────────────

function getPhaseMinutes(totalMin: number): { warmup: number; main: number; cooldown: number } {
  const warmup = Math.max(10, Math.round(totalMin * 0.15))
  const cooldown = Math.max(5, Math.round(totalMin * 0.12))
  const main = totalMin - warmup - cooldown
  return { warmup, main, cooldown }
}

// ─── Core Generator ─────────────────────────────────────

export function generateSession(input: GeneratorInput): GeneratedSession {
  const { durationMin, matchDayDelta, focusAreas, subFocus, exercises } = input

  // 1. Get MD profile
  const profile = matchDayDelta !== null ? (MD_PROFILES[matchDayDelta] || DEFAULT_PROFILE) : DEFAULT_PROFILE

  // 2. Build category priority list from focus + MD profile
  const focusCats = new Set<ExerciseCategory>()
  for (const f of [...focusAreas, ...subFocus]) {
    const cats = FOCUS_CATEGORIES[f]
    if (cats) cats.forEach(c => focusCats.add(c))
  }
  // Merge with MD preferred categories
  for (const c of profile.preferredCategories) {
    focusCats.add(c)
  }

  // 3. Calculate phase durations
  const phases = getPhaseMinutes(durationMin)

  // 4. Select exercises per phase
  const pool = [...exercises]
  const used = new Set<string>()

  const warmupExercises = selectForPhase(
    pool, 'warmup', phases.warmup,
    ['warmup', 'rondo'], profile.avoidCategories, used, profile.intensity
  )
  const mainExercises = selectForPhase(
    pool, 'main', phases.main,
    Array.from(focusCats), profile.avoidCategories, used, profile.intensity
  )
  const cooldownExercises = selectForPhase(
    pool, 'cooldown', phases.cooldown,
    ['cooldown', 'technical'], profile.avoidCategories, used, profile.intensity
  )

  const allExercises = [...warmupExercises, ...mainExercises, ...cooldownExercises]

  // 5. Build title
  const focusLabel = focusAreas.length > 0
    ? focusAreas.map(f => {
        const labels: Record<string, string> = { technical: 'Tecnic', tactical: 'Tactic', physical: 'Fisic', mental: 'Mental' }
        return labels[f] || f
      }).join(' + ')
    : null

  const title = matchDayDelta !== null
    ? profile.title
    : focusLabel
      ? `Sessio ${focusLabel.toLowerCase()}`
      : 'Sessio d\'entrenament'

  return {
    exercises: allExercises,
    plannedIntensity: profile.intensity,
    sessionType: profile.sessionType,
    title,
    focusAreas,
  }
}

// ─── Phase exercise selector ────────────────────────────

function selectForPhase(
  pool: TrainingExercise[],
  phase: SessionPhase,
  targetMinutes: number,
  preferredCategories: ExerciseCategory[],
  avoidCategories: ExerciseCategory[],
  used: Set<string>,
  targetIntensity: Intensity,
): GeneratedExercise[] {
  const result: GeneratedExercise[] = []
  let remaining = targetMinutes

  // Score exercises by relevance
  const scored = pool
    .filter(ex => !used.has(ex.id) && !avoidCategories.includes(ex.category))
    .map(ex => {
      let score = 0
      // Category match
      const catIdx = preferredCategories.indexOf(ex.category)
      if (catIdx >= 0) score += (preferredCategories.length - catIdx) * 10
      // Intensity match
      const iOrder: Record<Intensity, number> = { low: 1, medium: 2, high: 3, very_high: 4 }
      score -= Math.abs(iOrder[ex.intensity] - iOrder[targetIntensity]) * 3
      // Phase-specific bonuses
      if (phase === 'warmup' && ex.category === 'warmup') score += 20
      if (phase === 'cooldown' && ex.category === 'cooldown') score += 20
      // Slight randomization for variety
      score += Math.random() * 5
      return { ex, score }
    })
    .sort((a, b) => b.score - a.score)

  // Greedily pick exercises until we fill the time
  for (const { ex } of scored) {
    if (remaining <= 0) break
    const dur = Math.min(ex.duration_min, remaining)
    if (dur < 5) continue // Skip if too little time left

    result.push({
      tempId: Math.random().toString(36).substring(2, 9),
      exerciseId: ex.id,
      name: ex.name,
      phase,
      durationMin: dur,
      coachNotes: '',
      intensity: ex.intensity,
      exercise: ex,
    })
    used.add(ex.id)
    remaining -= dur
  }

  // If we still have time and no exercises, add a generic block
  if (result.length === 0 && targetMinutes > 0) {
    const defaultNames: Record<SessionPhase, string> = {
      warmup: 'Escalfament general',
      main: 'Part principal',
      cooldown: 'Estiraments',
    }
    result.push({
      tempId: Math.random().toString(36).substring(2, 9),
      exerciseId: null,
      name: defaultNames[phase],
      phase,
      durationMin: targetMinutes,
      coachNotes: '',
      intensity: targetIntensity,
    })
  }

  return result
}

// ─── Sub-focus options ──────────────────────────────────

export const SUB_FOCUS_OPTIONS: { key: string; label: string; parentFocus: FocusArea[] }[] = [
  { key: 'possession', label: 'Possessio', parentFocus: ['tactical', 'technical'] },
  { key: 'finishing', label: 'Finalitzacio', parentFocus: ['tactical', 'technical'] },
  { key: 'defensive', label: 'Defensa', parentFocus: ['tactical'] },
  { key: 'pressing', label: 'Pressio alta', parentFocus: ['tactical', 'physical'] },
  { key: 'transitions', label: 'Transicions', parentFocus: ['tactical'] },
  { key: 'set_pieces', label: 'Pilota aturada', parentFocus: ['tactical'] },
  { key: 'build_up', label: 'Sortida de pilota', parentFocus: ['tactical'] },
]
