/**
 * Server-only training data functions.
 * This file uses next/headers via supabase-server — DO NOT import in client components.
 */
import { createClient } from '@/lib/supabase-server'
import type { TrainingExercise, CoachProfile, PublicExercise } from './training-types'

/** Fetch a public exercise by slug — works without authentication (anon RLS) */
export async function fetchPublicExercise(slug: string): Promise<PublicExercise | null> {
  const supabase = await createClient()

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
