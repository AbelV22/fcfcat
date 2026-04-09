import { redirect } from 'next/navigation'
import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'
import { getFullTeamReportDB } from '@/lib/supabase-data'
import StandingsTabs from '@/components/StandingsTabs'

export const dynamic = 'force-dynamic'

export default async function ClassificacioPage() {
  const isAdmin = await isAdminUser()
  const team = await getDashboardTeam()
  if (!team) redirect('/dashboard/setup')
  if (!isAdmin) {
    const { createClient } = await import('@/lib/supabase-server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
  }

  const report = await getFullTeamReportDB(team.slug, team.competition || undefined)
  const standings = report?.standings || []
  const formStandings = report?.formStandings || []

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">Classificacio</h1>
          <p className="text-slate-400 text-sm">{report?.competition || team.competition} — {report?.group || ''} — Temporada 2025/26</p>
        </div>

        <StandingsTabs
          standings={standings}
          formStandings={formStandings}
          teamSlug={team.slug}
        />
    </div>
  )
}
