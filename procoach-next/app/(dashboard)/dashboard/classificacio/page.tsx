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
    <div className="max-w-4xl mx-auto px-4 sm:px-6" style={{ paddingTop: 24, paddingBottom: 48, fontFamily: 'var(--font-inter)' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', marginBottom: 4 }}>Classificació</h1>
          <p style={{ fontSize: 13, color: '#8a8f98' }}>{report?.competition || team.competition} — {report?.group || ''} — Temporada 2025/26</p>
        </div>

        <StandingsTabs
          standings={standings}
          formStandings={formStandings}
          teamSlug={team.slug}
        />
    </div>
  )
}
