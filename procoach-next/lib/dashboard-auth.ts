import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { slugify } from '@/lib/utils'

export type DashboardTeam = {
  slug: string
  name: string
  competition: string
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
    return { slug, name, competition }
  }

  // 2. Check Supabase user metadata
  const isAdmin = cookieStore.get('ns_admin')?.value === '1'
  if (!isAdmin) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.user_metadata?.club_name) {
      const clubName = user.user_metadata.club_name
      return {
        slug: slugify(clubName),
        name: clubName,
        competition: user.user_metadata.competition || '',
      }
    }
  }

  return null
}

/**
 * Check if the current request is from an admin (ns_admin cookie).
 */
export async function isAdminUser(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get('ns_admin')?.value === '1'
}
