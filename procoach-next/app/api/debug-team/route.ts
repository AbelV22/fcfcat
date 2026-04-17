import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDashboardTeam } from '@/lib/dashboard-auth'
import { isAdminUser as isAdminVerified } from '@/lib/admin-auth'
import { resolveLegacyTeamSlug, getFullTeamReportDB } from '@/lib/supabase-data'
import { parseTeamSlug } from '@/lib/team-slug'

export const dynamic = 'force-dynamic'

/**
 * GET /api/__debug-team
 * TEMPORARY diagnostic endpoint — admin-only. Remove after rival bug is closed.
 * Returns what getDashboardTeam resolves to, what the canonical slug looks
 * like, and whether getFullTeamReportDB finds the team / a next match.
 */
export async function GET() {
  const isAdmin = await isAdminVerified()
  if (!isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const cookieStore = await cookies()
  const rawCookieSlug = cookieStore.get('ns_team_slug')?.value ?? null
  const rawCookieName = cookieStore.get('ns_team_name')?.value ?? null
  const rawCookieCompetition = cookieStore.get('ns_competition')?.value ?? null

  const team = await getDashboardTeam()

  const parsed = rawCookieSlug ? parseTeamSlug(rawCookieSlug) : null
  const resolved = rawCookieSlug
    ? await resolveLegacyTeamSlug(rawCookieSlug, rawCookieCompetition ?? undefined)
    : null

  const report = team
    ? await getFullTeamReportDB(team.slug, team.competition || undefined)
    : null

  return NextResponse.json({
    cookies: {
      ns_team_slug: rawCookieSlug,
      ns_team_name: rawCookieName,
      ns_competition: rawCookieCompetition,
    },
    parsed_cookie_slug: parsed,
    resolved_from_cookie: resolved,
    dashboard_team: team,
    report_found: !!report,
    report_summary: report
      ? {
          name: report.name,
          competition: report.competition,
          group: report.group,
          standing_position: report.position,
          has_next_match: !!report.nextMatch,
          next_match: report.nextMatch
            ? {
                jornada: report.nextMatch.jornada,
                date: report.nextMatch.date,
                opponent: report.nextMatch.opponent,
                isHome: report.nextMatch.isHome,
              }
            : null,
          has_rival: !!report.rival,
          rival_name: report.rival?.name ?? null,
        }
      : null,
  })
}
