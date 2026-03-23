import { redirect } from 'next/navigation'
import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'
import { getFullTeamReportDB } from '@/lib/supabase-data'
import { Shield, AlertTriangle, BarChart2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatDate(d: string) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) {
    const months = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
    return `${parts[0]} ${months[parseInt(parts[1], 10) - 1] || parts[1]}`
  }
  return d
}

function PercentileBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-sm font-bold ${color}`}>{value}%</span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${value > 75 ? 'bg-red-500' : value > 50 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default async function ArbitreProPage() {
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
  const ref = report?.referee
  const nextMatch = report?.nextMatch

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        {!ref ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Shield size={40} className="text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Sense informacio arbitral</h2>
            <p className="text-slate-400 text-sm">
              {nextMatch ? 'Encara no hi ha dades sobre l\'arbitre assignat.' : 'No hi ha proxim partit programat.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Referee header */}
            <div className="glass-card rounded-2xl p-6 border-purple-500/20">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/25 flex items-center justify-center">
                  <Shield size={24} className="text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white">{ref.name}</h1>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>{ref.matches} partits</span>
                    {ref.predicted && <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-full">Prediccio</span>}
                  </div>
                </div>
                {ref.yellows_per_match > 4 && (
                  <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 border border-red-500/25 rounded-xl">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-red-400 text-xs font-bold">Molt estricte</span>
                  </div>
                )}
              </div>
            </div>

            {/* Key stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { v: ref.yellows_per_match.toFixed(1), l: 'Grogues/partit', c: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                { v: ref.reds_per_match.toFixed(2), l: 'Vermelles/partit', c: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                { v: `${ref.matches_with_red_pct.toFixed(0)}%`, l: 'Partits amb expulsio', c: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                { v: ref.avg_goals_per_match.toFixed(1), l: 'Gols/partit', c: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
              ].map(s => (
                <div key={s.l} className={`rounded-xl p-4 text-center border ${s.bg}`}>
                  <div className={`text-2xl font-black ${s.c}`}>{s.v}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Percentiles */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={18} className="text-purple-400" />
                <h2 className="text-lg font-bold text-white">Percentils vs altres arbitres</h2>
              </div>
              <div className="space-y-4">
                <PercentileBar value={ref.yellows_percentile} label="Grogues per partit" color="text-amber-400" />
                <PercentileBar value={ref.reds_percentile} label="Vermelles per partit" color="text-red-400" />
              </div>
              <p className="text-xs text-slate-500 mt-3">Percentil 80+ = mes estricte que el 80% dels arbitres de la temporada.</p>
            </div>

            {/* Home/Away bias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-5">
                <h3 className="font-bold text-white text-sm mb-3">Distribucio de targetes Local/Visitant</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Grogues locals</span>
                    <span className="text-amber-400 font-bold">{ref.home_yellows}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Grogues visitants</span>
                    <span className="text-amber-400 font-bold">{ref.away_yellows}</span>
                  </div>
                  {ref.home_bias !== null && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-white/8">
                      <span className="text-slate-400">Biaix local</span>
                      <span className={`font-bold ${ref.home_bias > 60 ? 'text-red-400' : ref.home_bias < 40 ? 'text-green-400' : 'text-slate-300'}`}>
                        {ref.home_bias.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <h3 className="font-bold text-white text-sm mb-3">Targetes per temps</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">1a part</span>
                    <span className="text-white font-bold">{ref.first_half_cards}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">2a part</span>
                    <span className="text-white font-bold">{ref.second_half_cards}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Competition breakdown */}
            {ref.competitionBreakdown.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Desglos per competicio</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 border-b border-white/8">
                        <th className="text-left py-2 px-2">Competicio</th>
                        <th className="text-center py-2 px-2">Partits</th>
                        <th className="text-center py-2 px-2">Grogues</th>
                        <th className="text-center py-2 px-2">Vermelles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ref.competitionBreakdown.map((c, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="py-2 px-2 text-white">{c.competition}</td>
                          <td className="py-2 px-2 text-center text-slate-300">{c.matches}</td>
                          <td className="py-2 px-2 text-center text-amber-400">{c.yellows}</td>
                          <td className="py-2 px-2 text-center text-red-400">{c.reds}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent matches */}
            {ref.recentMatches.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Ultims partits arbitrats</h2>
                <div className="space-y-1">
                  {ref.recentMatches.slice(0, 10).map((m, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-white/5 last:border-0">
                      <span className="text-slate-500 text-xs w-14">{formatDate(m.date)}</span>
                      <span className="text-white flex-1 truncate">{m.home_team} vs {m.away_team}</span>
                      <span className="font-bold tabular-nums text-slate-300">
                        {m.home_score !== null ? `${m.home_score}-${m.away_score}` : '-'}
                      </span>
                      <span className="text-amber-400 text-xs">{m.yellows}🟡</span>
                      {m.reds > 0 && <span className="text-red-400 text-xs">{m.reds}🔴</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  )
}
