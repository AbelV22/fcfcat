import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'
import { getFullTeamReportDB } from '@/lib/supabase-data'
import { ListOrdered } from 'lucide-react'

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">Classificacio</h1>
          <p className="text-slate-400 text-sm">{report?.competition || team.competition} — {report?.group || ''} — Temporada 2025/26</p>
        </div>

        {standings.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <ListOrdered size={40} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No s&apos;ha trobat la classificacio.</p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-white/10">
                  <th className="text-center py-3 px-2 w-8">#</th>
                  <th className="text-left py-3 px-2">Equip</th>
                  <th className="text-center py-3 px-2">PJ</th>
                  <th className="text-center py-3 px-2">PG</th>
                  <th className="text-center py-3 px-2">PE</th>
                  <th className="text-center py-3 px-2">PP</th>
                  <th className="text-center py-3 px-2">GF</th>
                  <th className="text-center py-3 px-2">GC</th>
                  <th className="text-center py-3 px-2">Dif</th>
                  <th className="text-center py-3 px-2 font-bold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => {
                  const isMyTeam = s.slug === team.slug
                  const diff = s.gf - s.ga
                  return (
                    <tr
                      key={s.slug}
                      className={`border-b border-white/5 transition-colors ${isMyTeam ? 'bg-green-500/10' : 'hover:bg-white/3'}`}
                    >
                      <td className={`py-3 px-2 text-center font-bold ${isMyTeam ? 'text-green-400' : i < 3 ? 'text-cyan-400' : 'text-slate-500'}`}>
                        {s.position}
                      </td>
                      <td className="py-3 px-2">
                        <Link
                          href={`/equip/${s.slug}`}
                          className={`hover:text-green-400 transition-colors ${isMyTeam ? 'text-white font-bold' : 'text-slate-200'}`}
                        >
                          {s.name}
                          {isMyTeam && <span className="ml-2 text-green-400 text-xs">(tu)</span>}
                        </Link>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-300">{s.played}</td>
                      <td className="py-3 px-2 text-center text-green-400">{s.wins}</td>
                      <td className="py-3 px-2 text-center text-amber-400">{s.draws}</td>
                      <td className="py-3 px-2 text-center text-red-400">{s.losses}</td>
                      <td className="py-3 px-2 text-center text-slate-300">{s.gf}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{s.ga}</td>
                      <td className={`py-3 px-2 text-center font-bold ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </td>
                      <td className={`py-3 px-2 text-center font-black text-lg ${isMyTeam ? 'text-green-400' : 'text-white'}`}>
                        {s.points}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
