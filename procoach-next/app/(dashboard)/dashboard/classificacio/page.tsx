import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'
import { getFullTeamReportDB } from '@/lib/supabase-data'
import { ListOrdered, Flame } from 'lucide-react'

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

        {/* ── Form Standings — Últims 5 partits ─────────────────────── */}
        {formStandings.length > 0 && (
          <>
            <div className="mt-10 mb-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Flame size={20} className="text-orange-400" />
                Racha — Últims 5 partits
              </h2>
              <p className="text-slate-400 text-sm mt-1">Classificació basada en els punts obtinguts als últims 5 partits jugats</p>
            </div>

            <div className="glass-card rounded-2xl p-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-white/10">
                    <th className="text-center py-3 px-2 w-8">#</th>
                    <th className="text-left py-3 px-2">Equip</th>
                    <th className="text-center py-3 px-2">Últims 5</th>
                    <th className="text-center py-3 px-2">PJ</th>
                    <th className="text-center py-3 px-2">PG</th>
                    <th className="text-center py-3 px-2">PE</th>
                    <th className="text-center py-3 px-2">PP</th>
                    <th className="text-center py-3 px-2">GF</th>
                    <th className="text-center py-3 px-2">GC</th>
                    <th className="text-center py-3 px-2 font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {formStandings.map((s, i) => {
                    const isMyTeam = s.slug === team.slug
                    const diff = s.gf - s.ga
                    return (
                      <tr
                        key={s.slug}
                        className={`border-b border-white/5 transition-colors ${isMyTeam ? 'bg-green-500/10' : 'hover:bg-white/3'}`}
                      >
                        <td className={`py-3 px-2 text-center font-bold ${isMyTeam ? 'text-orange-400' : i < 3 ? 'text-orange-400/70' : 'text-slate-500'}`}>
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
                        <td className="py-3 px-2">
                          <div className="flex gap-1 justify-center">
                            {s.form.slice().reverse().map((r, fi) => (
                              <span
                                key={fi}
                                className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${
                                  r === 'W' ? 'bg-green-500/20 text-green-400' :
                                  r === 'D' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {r === 'W' ? 'V' : r === 'D' ? 'E' : 'D'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-slate-300">{s.played}</td>
                        <td className="py-3 px-2 text-center text-green-400">{s.wins}</td>
                        <td className="py-3 px-2 text-center text-amber-400">{s.draws}</td>
                        <td className="py-3 px-2 text-center text-red-400">{s.losses}</td>
                        <td className="py-3 px-2 text-center text-slate-300">{s.gf}</td>
                        <td className="py-3 px-2 text-center text-slate-400">{s.ga}</td>
                        <td className={`py-3 px-2 text-center font-black text-lg ${isMyTeam ? 'text-orange-400' : 'text-white'}`}>
                          {s.points}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
    </div>
  )
}
