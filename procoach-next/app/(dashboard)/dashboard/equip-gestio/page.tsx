import { redirect } from 'next/navigation'
import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'
import { getFullTeamReportDB, hasMinutesData } from '@/lib/supabase-data'
import { Users, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EquipGestioPage() {
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
  const players = report?.players || []
  const apercibits = players.filter(p => { const y = p.yellow_cards ?? 0; return y > 0 && y % 5 === 4 })
  const sanctioned = players.filter(p => (p.red_cards ?? 0) > 0)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">{report?.name || team.name}</h1>
          <p className="text-slate-400 text-sm">{team.competition} — {players.length} jugadors registrats</p>
        </div>

        {players.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Users size={40} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No s&apos;han trobat jugadors per a aquest equip.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Warnings */}
            {(apercibits.length > 0 || sanctioned.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {apercibits.length > 0 && (
                  <div className="glass-card rounded-2xl p-5 border-amber-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={16} className="text-amber-400" />
                      <h3 className="font-bold text-white text-sm">Apercibits ({apercibits.length})</h3>
                    </div>
                    <div className="space-y-1">
                      {apercibits.map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5">
                          <span className="text-white">{p.name}</span>
                          <span className="text-amber-400 font-bold">{p.yellow_cards} 🟡</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">Jugadors a 1 groga de sanció (cicle de 5)</p>
                  </div>
                )}
                {sanctioned.length > 0 && (
                  <div className="glass-card rounded-2xl p-5 border-red-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={16} className="text-red-400" />
                      <h3 className="font-bold text-white text-sm">Expulsats aquesta temporada ({sanctioned.length})</h3>
                    </div>
                    <div className="space-y-1">
                      {sanctioned.map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5">
                          <span className="text-white">{p.name}</span>
                          <span className="text-red-400 font-bold">{p.red_cards} 🔴</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Full squad table */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-cyan-400" />
                <h2 className="text-lg font-bold text-white">Plantilla completa</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-white/10">
                      <th className="text-left py-3 px-2">Jugador</th>
                      <th className="text-center py-3 px-2">PJ</th>
                      <th className="text-center py-3 px-2">Titular</th>
                      <th className="text-center py-3 px-2">Gols</th>
                      <th className="text-center py-3 px-2">{!hasMinutesData(report?.competition || '', report?.players || []) ? 'Tit.' : 'Min'}</th>
                      <th className="text-center py-3 px-2">🟡</th>
                      <th className="text-center py-3 px-2">🔴</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players
                      .sort((a, b) => (b.appearances ?? 0) - (a.appearances ?? 0))
                      .map((p, i) => {
                        const isApercebit = (p.yellow_cards ?? 0) > 0 && (p.yellow_cards ?? 0) % 5 === 4
                        return (
                          <tr key={i} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${isApercebit ? 'bg-amber-500/5' : ''}`}>
                            <td className="py-3 px-2 text-white font-medium">
                              {p.name}
                              {isApercebit && <span className="ml-1.5 text-amber-400 text-[10px] font-bold">APERCEBIT</span>}
                            </td>
                            <td className="py-3 px-2 text-center text-slate-300">{p.appearances ?? 0}</td>
                            <td className="py-3 px-2 text-center text-slate-400">-</td>
                            <td className="py-3 px-2 text-center text-green-400 font-bold">{p.goals ?? 0}</td>
                            <td className="py-3 px-2 text-center text-slate-400">
                              {!hasMinutesData(report?.competition || '', report?.players || [])
                                ? (p.starts > 0 ? p.starts : '-')
                                : (p.minutes_played ?? '-')}
                            </td>
                            <td className={`py-3 px-2 text-center font-bold ${(p.yellow_cards ?? 0) > 0 && (p.yellow_cards ?? 0) % 5 === 4 ? 'text-amber-400' : 'text-slate-500'}`}>
                              {p.yellow_cards ?? 0}
                            </td>
                            <td className={`py-3 px-2 text-center font-bold ${(p.red_cards ?? 0) > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                              {p.red_cards ?? 0}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Coming soon features */}
            <div className="glass-card rounded-2xl p-6 border-dashed border-slate-700">
              <div className="text-center">
                <span className="text-xs px-3 py-1 bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 rounded-full font-bold">PROPERAMENT</span>
                <h3 className="text-white font-bold mt-3 mb-1">Convocatories i disponibilitat</h3>
                <p className="text-slate-500 text-sm">Gestiona convocatories, marca lesions i controla la disponibilitat dels jugadors per cada partit.</p>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
