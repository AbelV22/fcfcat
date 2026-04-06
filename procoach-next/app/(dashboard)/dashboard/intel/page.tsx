import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'
import { getFullTeamReportDB, hasMinutesData } from '@/lib/supabase-data'
import { Users, Target, Home, Plane, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

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

type SplitStats = { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number }

function StatBlock({ label, record, icon }: { label: string; record: SplitStats; icon: React.ReactNode }) {
  const winRate = record.played > 0 ? Math.round((record.wins / record.played) * 100) : 0
  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <span className="font-bold text-white text-sm">{label}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { v: record.played, l: 'PJ', c: 'text-white' },
          { v: record.wins, l: 'G', c: 'text-green-400' },
          { v: record.draws, l: 'E', c: 'text-amber-400' },
          { v: record.losses, l: 'P', c: 'text-red-400' },
        ].map(s => (
          <div key={s.l} className="text-center">
            <div className={`text-lg font-black ${s.c}`}>{s.v}</div>
            <div className="text-[10px] text-slate-500 uppercase">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
        <span>Gols: {record.gf}-{record.ga}</span>
        <span className="text-white font-bold">{record.points} pts</span>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full" style={{ width: `${winRate}%` }} />
      </div>
      <div className="text-[10px] text-slate-500 mt-1">{winRate}% victories</div>
    </div>
  )
}

export default async function IntelPage() {
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">{report?.name || team.name}</h1>
          <p className="text-slate-400 text-sm">{team.competition} — Temporada 2025/26</p>
        </div>

        {!report ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-slate-400">No s&apos;han trobat dades per a aquest equip. Comprova la configuracio.</p>
            <Link href="/dashboard/setup" className="text-green-400 hover:text-green-300 text-sm mt-2 inline-block">Canviar equip</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall record */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-green-400" />
                <h2 className="text-lg font-bold text-white">Registre General</h2>
                {report.position && (
                  <span className="ml-auto text-sm px-3 py-1 bg-green-500/15 border border-green-500/25 rounded-full text-green-400 font-bold">
                    #{report.position}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
                {[
                  { v: report.played, l: 'Partits', c: 'text-white' },
                  { v: report.wins, l: 'Victories', c: 'text-green-400' },
                  { v: report.draws, l: 'Empats', c: 'text-amber-400' },
                  { v: report.losses, l: 'Derrotes', c: 'text-red-400' },
                  { v: report.points, l: 'Punts', c: 'text-cyan-400' },
                ].map(s => (
                  <div key={s.l} className="bg-white/4 rounded-xl p-4 text-center">
                    <div className={`text-2xl font-black ${s.c}`}>{s.v}</div>
                    <div className="text-xs text-slate-500 mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="text-sm text-slate-400">Gols: <span className="text-green-400 font-bold">{report.gf}</span> - <span className="text-red-400 font-bold">{report.ga}</span> (dif: {report.gf - report.ga > 0 ? '+' : ''}{report.gf - report.ga})</div>
            </div>

            {/* Home / Away splits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatBlock label="Local" record={report.home} icon={<Home size={16} className="text-green-400" />} />
              <StatBlock label="Visitant" record={report.away} icon={<Plane size={16} className="text-sky-400" />} />
            </div>

            {/* Form */}
            {report.form.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Ultims resultats</h2>
                <div className="flex gap-1.5 flex-wrap mb-4">
                  {report.form.slice(-10).map((m, i) => (
                    <FormDot key={i} result={m.result} />
                  ))}
                </div>
                <div className="space-y-1">
                  {report.form.slice(-10).reverse().map((m, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-slate-500 text-xs w-16">{m.date ? m.date.split('-').slice(0, 2).join('/') : ''}</span>
                      <span className="text-slate-400 text-xs">J{m.jornada}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${m.isHome ? 'bg-green-500/15 text-green-400' : 'bg-sky-500/15 text-sky-400'}`}>
                        {m.isHome ? 'L' : 'V'}
                      </span>
                      <span className="text-white flex-1 truncate">{m.opponent}</span>
                      <span className="font-bold tabular-nums">
                        {m.goalsFor !== null && m.goalsAgainst !== null ? (
                          <>
                            <span className={m.result === 'W' ? 'text-green-400' : m.result === 'L' ? 'text-red-400' : 'text-slate-300'}>{m.goalsFor}</span>
                            <span className="text-slate-600 mx-0.5">-</span>
                            <span className={m.result === 'L' ? 'text-green-400' : m.result === 'W' ? 'text-red-400' : 'text-slate-300'}>{m.goalsAgainst}</span>
                          </>
                        ) : <span className="text-slate-500">-</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goal timing */}
            {report.goalBuckets.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={18} className="text-amber-400" />
                  <h2 className="text-lg font-bold text-white">Distribucio de Gols per Minut</h2>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {report.goalBuckets.map(b => (
                    <div key={b.label} className="text-center">
                      <div className="text-xs text-slate-500 mb-2">{b.label}</div>
                      <div className="relative h-24 flex flex-col justify-end items-center gap-0.5">
                        <div className="w-6 bg-green-500/60 rounded-t" style={{ height: `${Math.max(4, b.scored * 12)}px` }} />
                        <div className="w-6 bg-red-500/60 rounded-b" style={{ height: `${Math.max(4, b.conceded * 12)}px` }} />
                      </div>
                      <div className="flex justify-center gap-2 mt-1">
                        <span className="text-green-400 text-xs font-bold">{b.scored}</span>
                        <span className="text-red-400 text-xs font-bold">{b.conceded}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Marcats</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Encaixats</span>
                </div>
              </div>
            )}

            {/* Penalty stats */}
            {report.penaltyStats && (report.penaltyStats.penalties_scored > 0 || report.penaltyStats.penalties_conceded > 0) && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={18} className="text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">Penals</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white/4 rounded-xl p-4 text-center">
                    <div className="text-2xl font-black text-green-400">{report.penaltyStats.penalties_scored}</div>
                    <div className="text-xs text-slate-500 mt-1">A favor</div>
                  </div>
                  <div className="bg-white/4 rounded-xl p-4 text-center">
                    <div className="text-2xl font-black text-red-400">{report.penaltyStats.penalties_conceded}</div>
                    <div className="text-xs text-slate-500 mt-1">En contra</div>
                  </div>
                  <div className="bg-white/4 rounded-xl p-4 text-center">
                    <div className="text-2xl font-black text-cyan-400">{report.penaltyStats.penalties_per_match}</div>
                    <div className="text-xs text-slate-500 mt-1">Penals/partit</div>
                  </div>
                  <div className="bg-white/4 rounded-xl p-4 text-center">
                    <div className="text-2xl font-black text-slate-300">{report.penaltyStats.matches_with_penalty_pct}%</div>
                    <div className="text-xs text-slate-500 mt-1">Partits amb penal</div>
                  </div>
                </div>
              </div>
            )}

            {/* Squad */}
            {report.players.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={18} className="text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">Plantilla ({report.players.length} jugadors)</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 border-b border-white/8">
                        <th className="text-left py-2 px-2">Jugador</th>
                        <th className="text-center py-2 px-2">PJ</th>
                        <th className="text-center py-2 px-2">Gols</th>
                        <th className="text-center py-2 px-2">Tar.</th>
                        <th className="text-center py-2 px-2">{!hasMinutesData(report.competition, report.players) ? 'Tit.' : 'Min'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.players
                        .sort((a, b) => (b.appearances ?? 0) - (a.appearances ?? 0))
                        .map((p, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                          <td className="py-2 px-2 text-white font-medium truncate max-w-[200px]">
                            {p.name}
                            {(p.yellow_cards ?? 0) >= 4 && <span className="ml-1 text-amber-400 text-xs" title="Apercebit">!</span>}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-300">{p.appearances ?? 0}</td>
                          <td className="py-2 px-2 text-center text-green-400 font-bold">{p.goals ?? 0}</td>
                          <td className="py-2 px-2 text-center">
                            {(p.yellow_cards ?? 0) > 0 && <span className="text-amber-400 text-xs mr-1">{p.yellow_cards}🟡</span>}
                            {(p.red_cards ?? 0) > 0 && <span className="text-red-400 text-xs">{p.red_cards}🔴</span>}
                            {(p.yellow_cards ?? 0) === 0 && (p.red_cards ?? 0) === 0 && <span className="text-slate-600">-</span>}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-400">
                            {!hasMinutesData(report.competition, report.players)
                              ? (p.starts > 0 ? p.starts : '-')
                              : (p.minutes_played ?? '-')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  )
}
