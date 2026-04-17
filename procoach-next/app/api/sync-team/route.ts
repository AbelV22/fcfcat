import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { slugify } from '@/lib/utils'
import { resolveLegacyTeamSlug } from '@/lib/supabase-data'

/**
 * POST /api/sync-team
 * Called after login to sync user metadata (club_name, competition)
 * into dashboard cookies so the dashboard is immediately personalized.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const clubName = user.user_metadata?.club_name
  const competition = user.user_metadata?.competition

  if (!clubName || !competition) {
    return NextResponse.json({ ok: false, reason: 'no_team' })
  }

  // user_metadata stores the plain club name — convert to the canonical
  // disambiguated team_slug used in fcf_standings.
  const legacy = slugify(clubName)
  const canonical = (await resolveLegacyTeamSlug(legacy, competition)) ?? legacy

  const cookieStore = await cookies()
  const opts = { path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: false } as const

  cookieStore.set('ns_team_slug', canonical, opts)
  cookieStore.set('ns_team_name', clubName, opts)
  cookieStore.set('ns_competition', competition, opts)

  return NextResponse.json({ ok: true, team: clubName, competition, slug: canonical })
}
