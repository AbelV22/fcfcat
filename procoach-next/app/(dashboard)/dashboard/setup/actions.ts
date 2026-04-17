'use server'

import { cookies } from 'next/headers'
import { slugify } from '@/lib/utils'
import { createClient } from '@/lib/supabase-server'
import { composeTeamSlug } from '@/lib/team-slug'

export async function saveTeamSelection(formData: FormData) {
  const team = formData.get('team') as string
  const competition = formData.get('competition') as string
  const providedSlug = (formData.get('team_slug') as string | null) || ''
  const providedGroup = (formData.get('group_name') as string | null) || ''

  if (!team || !competition) {
    return { error: 'Cal seleccionar equip i competició.' }
  }

  // Resolve the canonical disambiguated slug. Prefer the one provided by the
  // client (it came from /api/teams), otherwise look it up, otherwise compose
  // it from (team, competition, group) as a last resort.
  let canonicalSlug = providedSlug
  if (!canonicalSlug) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('fcf_standings')
      .select('team_slug, group_name')
      .eq('competition', competition)
      .eq('team_name', team)
      .limit(1)
    canonicalSlug = data?.[0]?.team_slug || composeTeamSlug(team, competition, data?.[0]?.group_name || providedGroup || '')
  }
  if (!canonicalSlug) {
    canonicalSlug = slugify(team) // final fallback — legacy behaviour
  }

  const cookieStore = await cookies()
  const opts = { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: false } as const

  cookieStore.set('ns_team_slug', canonicalSlug, opts)
  cookieStore.set('ns_team_name', team, opts)
  cookieStore.set('ns_competition', competition, opts)

  return { success: true }
}
