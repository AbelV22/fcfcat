import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { slugify } from '@/lib/utils'
import { isAdminUser as isAdminVerified } from '@/lib/admin-auth'
import { parseTeamSlug } from '@/lib/team-slug'
import { resolveLegacyTeamSlug } from '@/lib/supabase-data'

export type DashboardTeam = {
  slug: string
  name: string
  competition: string
}

/**
 * Upgrade a possibly-legacy baseSlug to its canonical disambiguated form.
 * Returns the input unchanged when it's already canonical or when no match
 * can be found in `fcf_standings`.
 */
async function canonicaliseSlug(slug: string, competitionHint?: string): Promise<string> {
  if (!slug) return slug
  if (parseTeamSlug(slug).competition) return slug // already canonical
  const resolved = await resolveLegacyTeamSlug(slug, competitionHint)
  return resolved ?? slug
}

/**
 * Resolve the dashboard team for the current user.
 * Priority: cookies (ns_team_*) > Supabase user metadata.
 * Returns null if no team is configured.
 */
export async function getDashboardTeam(): Promise<DashboardTeam | null> {
  const cookieStore = await cookies()

  // 1. Check cookies (set via Setup page — works for admin + regular users)
  const slug = cookieStore.get('ns_team_slug')?.value
  const name = cookieStore.get('ns_team_name')?.value
  const competition = cookieStore.get('ns_competition')?.value
  if (slug && name && competition) {
    // Self-heal: legacy base slugs from pre-disambiguation cookies are
    // rewritten transparently to the canonical form.
    const canonical = await canonicaliseSlug(slug, competition)
    return { slug: canonical, name, competition }
  }

  // 2. Check Supabase user metadata
  const isAdmin = await isAdminVerified()
  if (!isAdmin) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.user_metadata?.club_name) {
      const clubName = user.user_metadata.club_name
      const metaCompetition = user.user_metadata.competition || ''
      const canonical = await canonicaliseSlug(slugify(clubName), metaCompetition)
      return {
        slug: canonical,
        name: clubName,
        competition: metaCompetition,
      }
    }
  }

  return null
}

/**
 * Check if the current request is from a verified admin.
 * Only returns true for pure admin-cookie sessions (no Supabase user logged in).
 */
export async function isAdminUser(): Promise<boolean> {
  const adminCookie = await isAdminVerified()
  if (!adminCookie) return false
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !user
}

/**
 * Check if the current user has PRO status.
 * Currently: any logged-in user gets full access (PRO unlocked by default).
 */
export async function isProUser(): Promise<boolean> {
  if (await isAdminVerified()) return true

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user
}
