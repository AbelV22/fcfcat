import { redirect } from 'next/navigation'
import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'
import { getFullTeamReportDB } from '@/lib/supabase-data'
import { Target, Crosshair, Home, Plane, TrendingUp, AlertTriangle } from 'lucide-react'
import ExportRivalPdf from '@/components/ExportRivalPdf'

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

function FormDot({ result }: { result: 'W' | 'D' | 'L' | null }) {
  const cls =
    result === 'W' ? 'bg-green-500 text-white' :
    result === 'D' ? 'bg-amber-400 text-white' :
    result === 'L' ? 'bg-red-500 text-white' : 'bg-white/10 text-slate-500'
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${cls}`}>
      {result ?? '?'}
    </span>
  )
}

export default async function RivalPage() {
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
  const rival = report?.rival
  const nextMatch = report?.nextMatch
  const h2h = report?.headToHead || []

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        {!nextMatch || !rival ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Crosshair size={40} className="text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No hi ha proxim rival programat</h2>
            <p className="text-slate-400 text-sm">Quan es publiqui el proper partit, apareixera aqui l&apos;analisi completa del rival.</p>
          </div>
        ) : (
          <ExportRivalPdf
            rivalName={rival.name}
            teamName={team.name}
            jornada={nextMatch.jornada}
            matchDate={nextMatch.date}
          >
          <div className="space-y-6">
            {/* Next match header */}
            <div className="glass-card rounded-2xl p-6 border-cyan-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Crosshair size={18} className="text-cyan-400" />
                <h1 className="text-xl font-black text-white">Proper Rival — J{nextMatch.jornada}</h1>
                <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-semibold ${nextMatch.isHome ? 'bg-green-500/20 text-green-400 border border-green-500/25' : 'bg-sky-500/20 text-sky-400 border border-sky-500/25'}`}>
                  {nextMatch.isHome ? 'Local' : 'Visitant'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-center flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/25 flex items-center justify-center text-xl font-black text-green-400 mx-auto mb-2">
                    {team.name.charAt(0)}
                  </div>
                  <div className="text-sm text-white font-semibold">{team.name}</div>
                </div>
                <div className="text-center px-6">
                  <div className="text-3xl font-black text-slate-500 mb-1">VS</div>
                  <div className="text-sm text-slate-400">{formatDate(nextMatch.date)}</div>
                  {nextMatch.time && <div className="text-sm text-cyan-400 font-bold">{nextMatch.time}h</div>}
                </div>
                <div className="text-center flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/25 flex items-center justify-center text-xl font-black text-red-400 mx-auto mb-2">
                    {rival.name.charAt(0)}
                  </div>
                  <div className="text-sm text-white font-semibold">{rival.name}</div>
                </div>
              </div>
            </div>

            {/* Rival stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { v: rival.played, l: 'PJ', c: 'text-white' },
                { v: rival.wins, l: 'G', c: 'text-green-400' },
                { v: rival.draws, l: 'E', c: 'text-amber-400' },
                { v: rival.losses, l: 'P', c: 'text-red-400' },
                { v: rival.points, l: 'Pts', c: 'text-cyan-400' },
              ].map(s => (
                <div key={s.l} className="glass-card rounded-xl p-4 text-center">
                  <div className={`text-2xl font-black ${s.c}`}>{s.v}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Rival position + goals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Home size={16} className="text-green-400" />
                  <span className="font-bold text-white text-sm">Local</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { v: rival.home.played, l: 'PJ', c: 'text-white' },
                    { v: rival.home.wins, l: 'G', c: 'text-green-400' },
                    { v: rival.home.draws, l: 'E', c: 'text-amber-400' },
                    { v: rival.home.losses, l: 'P', c: 'text-red-400' },
                  ].map(s => (
                    <div key={s.l}>
                      <div className={`text-lg font-black ${s.c}`}>{s.v}</div>
                      <div className="text-[10px] text-slate-500">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-400 mt-2">Gols: {rival.home.gf}-{rival.home.ga}</div>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Plane size={16} className="text-sky-400" />
                  <span className="font-bold text-white text-sm">Visitant</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { v: rival.away.played, l: 'PJ', c: 'text-white' },
                    { v: rival.away.wins, l: 'G', c: 'text-green-400' },
                    { v: rival.away.draws, l: 'E', c: 'text-amber-400' },
                    { v: rival.away.losses, l: 'P', c: 'text-red-400' },
                  ].map(s => (
                    <div key={s.l}>
                      <div className={`text-lg font-black ${s.c}`}>{s.v}</div>
                      <div className="text-[10px] text-slate-500">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-400 mt-2">Gols: {rival.away.gf}-{rival.away.ga}</div>
              </div>
            </div>

            {/* Rival form */}
            {rival.form.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-3">Forma recent del rival</h2>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {rival.form.slice(-8).map((m, i) => <FormDot key={i} result={m.result} />)}
                </div>
              </div>
            )}

            {/* Insights */}
            {rival.insights && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={18} className="text-purple-400" />
                  <h2 className="text-lg font-bold text-white">Patrons del Rival</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { v: rival.insights.cleanSheetRate, l: 'Porteria a 0', s: '%' },
                    { v: rival.insights.lateGoalRate, l: 'Gols tardans (75+)', s: '%' },
                    { v: rival.insights.scoreFirstWinRate, l: 'Guanya si marca 1r', s: '%' },
                    { v: rival.insights.concededFirstWinRate, l: 'Remunta si encaixa 1r', s: '%' },
                    { v: rival.insights.firstHalfGoals, l: 'Gols 1a part', s: '' },
                    { v: rival.insights.secondHalfGoals, l: 'Gols 2a part', s: '' },
                  ].map(item => (
                    <div key={item.l} className="bg-white/4 rounded-xl p-3 text-center">
                      <div className="text-xl font-black text-white">{item.v !== null ? `${item.v}${item.s}` : '-'}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{item.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rival top scorers */}
            {rival.topScorers.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={18} className="text-green-400" />
                  <h2 className="text-lg font-bold text-white">Golejadors del rival</h2>
                </div>
                <div className="space-y-1">
                  {rival.topScorers.slice(0, 8).map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-white text-sm">{p.name}</span>
                      <span className="text-green-400 font-bold text-sm">{p.goals} gols</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Apercibits */}
            {rival.apercibits.length > 0 && (
              <div className="glass-card rounded-2xl p-6 border-amber-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={18} className="text-amber-400" />
                  <h2 className="text-lg font-bold text-white">Jugadors apercibits (4+ grogues)</h2>
                </div>
                <div className="space-y-1">
                  {rival.apercibits.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-white text-sm">{p.name}</span>
                      <span className="text-amber-400 font-bold text-sm">{p.yellow_cards} 🟡</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Head to head */}
            {h2h.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Historial directe</h2>
                <div className="space-y-1">
                  {h2h.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-white/5 last:border-0">
                      <span className="text-slate-500 text-xs w-16">{formatDate(m.date)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${m.isHome ? 'bg-green-500/15 text-green-400' : 'bg-sky-500/15 text-sky-400'}`}>
                        {m.isHome ? 'L' : 'V'}
                      </span>
                      <span className="flex-1 text-white">{m.opponent}</span>
                      <span className="font-bold tabular-nums">
                        {m.goalsFor !== null && m.goalsAgainst !== null ? (
                          <>
                            <span className={m.result === 'W' ? 'text-green-400' : m.result === 'L' ? 'text-red-400' : 'text-slate-300'}>{m.goalsFor}</span>
                            <span className="text-slate-600 mx-0.5">-</span>
                            <span className={m.result === 'L' ? 'text-green-400' : m.result === 'W' ? 'text-red-400' : 'text-slate-300'}>{m.goalsAgainst}</span>
                          </>
                        ) : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          </ExportRivalPdf>
        )}
    </div>
  )
}
