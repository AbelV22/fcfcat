/**
 * Training Session Generator v2
 * Generates a complete session plan from 3 inputs: duration, match-day delta, focus areas.
 * Improved: better category coverage, guaranteed variety, smarter scoring.
 */

import type {
  TrainingExercise, ExerciseCategory, Intensity, SessionType,
  SessionPhase, FocusArea,
} from './training-types'

// ─── Input / Output Types ───────────────────────────────

export interface GeneratorInput {
  durationMin: number
  matchDayDelta: number | null
  focusAreas: FocusArea[]
  subFocus: string[]
  exercises: TrainingExercise[]
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
  mainCategories: ExerciseCategory[]  // Primary categories for main phase
  warmupStyle: 'active' | 'light'     // Active = with ball, Light = mobility/stretch
}

const MD_PROFILES: Record<number, MDProfile> = {
  [-4]: {
    intensity: 'high',
    sessionType: 'physical',
    title: 'Sessio de carrega (MD-4)',
    mainCategories: ['conditioning', 'ssg', 'possession', 'tactical'],
    warmupStyle: 'active',
  },
  [-3]: {
    intensity: 'very_high',
    sessionType: 'tactical',
    title: 'Sessio d\'alta intensitat (MD-3)',
    mainCategories: ['ssg', 'finishing', 'possession', 'conditioning', 'defensive_shape'],
    warmupStyle: 'active',
  },
  [-2]: {
    intensity: 'medium',
    sessionType: 'tactical',
    title: 'Sessio tactica (MD-2)',
    mainCategories: ['tactical', 'possession', 'set_pieces', 'rondo', 'technical'],
    warmupStyle: 'active',
  },
  [-1]: {
    intensity: 'low',
    sessionType: 'pre_match',
    title: 'Activacio pre-partit (MD-1)',
    mainCategories: ['rondo', 'technical', 'finishing', 'set_pieces'],
    warmupStyle: 'light',
  },
  [1]: {
    intensity: 'low',
    sessionType: 'recovery',
    title: 'Recuperacio (MD+1)',
    mainCategories: ['rondo', 'technical', 'possession'],
    warmupStyle: 'light',
  },
}

const DEFAULT_PROFILE: MDProfile = {
  intensity: 'medium',
  sessionType: 'mixed',
  title: 'Sessio d\'entrenament',
  mainCategories: ['possession', 'rondo', 'ssg', 'technical', 'tactical', 'finishing'],
  warmupStyle: 'active',
}

// ─── Focus → Category mapping (expanded) ────────────────

const FOCUS_TO_CATEGORIES: Record<string, ExerciseCategory[]> = {
  technical: ['technical', 'rondo', 'possession'],
  tactical: ['tactical', 'possession', 'defensive_shape', 'ssg'],
  physical: ['conditioning', 'ssg', 'finishing'],
  mental: ['rondo', 'ssg', 'possession'],
  // Sub-focus (more specific)
  possession: ['possession', 'rondo', 'tactical'],
  finishing: ['finishing', 'ssg'],
  defensive: ['defensive_shape', 'tactical'],
  pressing: ['defensive_shape', 'ssg', 'conditioning'],
  transitions: ['ssg', 'finishing', 'defensive_shape'],
  set_pieces: ['set_pieces'],
  build_up: ['tactical', 'possession', 'rondo'],
}

// ─── Phase time distribution ────────────────────────────

function getPhaseMinutes(totalMin: number): { warmup: number; main: number; cooldown: number } {
  const warmup = Math.max(10, Math.round(totalMin * 0.15))
  const cooldown = Math.max(5, Math.round(totalMin * 0.10))
  const main = totalMin - warmup - cooldown
  return { warmup, main, cooldown }
}

const INTENSITY_ORDER: Record<Intensity, number> = { low: 1, medium: 2, high: 3, very_high: 4 }

function uid() { return Math.random().toString(36).substring(2, 9) }

// ─── Core Generator ─────────────────────────────────────

export function generateSession(input: GeneratorInput): GeneratedSession {
  const { durationMin, matchDayDelta, focusAreas, subFocus, exercises } = input
  const profile = matchDayDelta !== null ? (MD_PROFILES[matchDayDelta] || DEFAULT_PROFILE) : DEFAULT_PROFILE

  // Build priority categories from focus selections
  const focusCats: ExerciseCategory[] = []
  for (const f of [...focusAreas, ...subFocus]) {
    const cats = FOCUS_TO_CATEGORIES[f]
    if (cats) for (const c of cats) if (!focusCats.includes(c)) focusCats.push(c)
  }
  // Merge MD profile categories (lower priority)
  for (const c of profile.mainCategories) {
    if (!focusCats.includes(c)) focusCats.push(c)
  }

  const phases = getPhaseMinutes(durationMin)
  const used = new Set<string>()

  // ── WARMUP ─────────────────────
  const warmupExs = pickExercises(exercises, phases.warmup, ['warmup'], used, 'low')

  // If warmup is "active" and we have a rondo, add one
  if (profile.warmupStyle === 'active' && phases.warmup >= 18) {
    const rondo = pickExercises(exercises, 10, ['rondo'], used, 'medium')
    warmupExs.push(...rondo)
  }

  // ── MAIN PART ──────────────────
  // Guarantee variety: pick from different categories
  const mainExs: GeneratedExercise[] = []
  let mainRemaining = phases.main

  // First pass: pick 1 exercise from each top focus category
  const topCats = focusCats.slice(0, 4) // Top 4 priority categories
  for (const cat of topCats) {
    if (mainRemaining <= 5) break
    const picked = pickExercises(exercises, Math.min(15, mainRemaining), [cat], used, profile.intensity)
    if (picked.length > 0) {
      mainExs.push(...picked)
      mainRemaining -= picked.reduce((s, e) => s + e.durationMin, 0)
    }
  }

  // Second pass: fill remaining time from all focus categories
  if (mainRemaining > 5) {
    const filler = pickExercises(exercises, mainRemaining, focusCats, used, profile.intensity)
    mainExs.push(...filler)
    mainRemaining -= filler.reduce((s, e) => s + e.durationMin, 0)
  }

  // Third pass: if still time left, use any non-avoided category
  if (mainRemaining > 5) {
    const allCats: ExerciseCategory[] = ['possession', 'rondo', 'ssg', 'technical', 'tactical', 'finishing', 'defensive_shape']
    const filler = pickExercises(exercises, mainRemaining, allCats, used, profile.intensity)
    mainExs.push(...filler)
  }

  // ── COOLDOWN ───────────────────
  const cooldownExs = pickExercises(exercises, phases.cooldown, ['cooldown'], used, 'low')
  if (cooldownExs.length === 0) {
    cooldownExs.push({
      tempId: uid(), exerciseId: null, name: 'Estiraments i tornada a la calma',
      phase: 'cooldown', durationMin: phases.cooldown, coachNotes: '', intensity: 'low',
    })
  }

  // Tag phases
  warmupExs.forEach(e => e.phase = 'warmup')
  mainExs.forEach(e => e.phase = 'main')
  cooldownExs.forEach(e => e.phase = 'cooldown')

  const allExercises = [...warmupExs, ...mainExs, ...cooldownExs]

  // Build title
  const focusLabel = focusAreas.length > 0
    ? focusAreas.map(f => ({ technical: 'Tecnic', tactical: 'Tactic', physical: 'Fisic', mental: 'Mental' }[f] || f)).join(' + ')
    : null

  const title = matchDayDelta !== null
    ? profile.title
    : focusLabel ? `Sessio ${focusLabel.toLowerCase()}` : 'Sessio d\'entrenament'

  return { exercises: allExercises, plannedIntensity: profile.intensity, sessionType: profile.sessionType, title, focusAreas }
}

// ─── Exercise picker ────────────────────────────────────

function pickExercises(
  pool: TrainingExercise[],
  targetMinutes: number,
  preferredCategories: ExerciseCategory[],
  used: Set<string>,
  targetIntensity: Intensity,
): GeneratedExercise[] {
  const result: GeneratedExercise[] = []
  let remaining = targetMinutes

  // Score and sort candidates
  const candidates = pool
    .filter(ex => !used.has(ex.id))
    .map(ex => {
      let score = 0

      // Strong bonus for matching category
      if (preferredCategories.includes(ex.category)) {
        const idx = preferredCategories.indexOf(ex.category)
        score += 30 - idx * 5  // First category = 30pts, second = 25, etc.
      } else {
        score -= 10 // Penalty for non-matching
      }

      // Intensity proximity bonus
      const diff = Math.abs(INTENSITY_ORDER[ex.intensity] - INTENSITY_ORDER[targetIntensity])
      score -= diff * 5

      // Duration fit bonus — prefer exercises that fit well in remaining time
      if (ex.duration_min <= remaining && ex.duration_min >= 8) score += 5

      // Randomization for variety
      score += Math.random() * 12

      return { ex, score }
    })
    .filter(c => c.score > -5) // Don't use very poorly matched exercises
    .sort((a, b) => b.score - a.score)

  // Pick exercises greedily
  for (const { ex } of candidates) {
    if (remaining <= 3) break
    const dur = Math.min(ex.duration_min, remaining)
    if (dur < 5) continue

    result.push({
      tempId: uid(),
      exerciseId: ex.id,
      name: ex.name,
      phase: 'main', // Will be overridden by caller
      durationMin: dur,
      coachNotes: '',
      intensity: ex.intensity,
      exercise: ex,
    })
    used.add(ex.id)
    remaining -= dur
  }

  return result
}

// ─── Sub-focus options ──────────────────────────────────

export const SUB_FOCUS_OPTIONS: { key: string; label: string; parentFocus: FocusArea[] }[] = [
  { key: 'possession', label: 'Possessio', parentFocus: ['tactical', 'technical'] },
  { key: 'finishing', label: 'Finalitzacio', parentFocus: ['tactical', 'technical', 'physical'] },
  { key: 'defensive', label: 'Defensa', parentFocus: ['tactical'] },
  { key: 'pressing', label: 'Pressio alta', parentFocus: ['tactical', 'physical'] },
  { key: 'transitions', label: 'Transicions', parentFocus: ['tactical'] },
  { key: 'set_pieces', label: 'Pilota aturada', parentFocus: ['tactical'] },
  { key: 'build_up', label: 'Sortida de pilota', parentFocus: ['tactical', 'technical'] },
]
