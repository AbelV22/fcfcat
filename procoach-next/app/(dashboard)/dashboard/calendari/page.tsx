import { redirect } from 'next/navigation'
import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'
import { getFullTeamReportDB } from '@/lib/supabase-data'
import { Calendar, Crosshair } from 'lucide-react'

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

function parseDate(d: string): Date | null {
  const m = (d || '').match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (!m) return null
  return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
}

export default async function CalendariPage() {
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
  const form = report?.form || []
  const nextMatch = report?.nextMatch

  const now = new Date()
  const pastMatches = form.filter(m => {
    const d = parseDate(m.date)
    return d && d < now && m.goalsFor !== null
  }).reverse()
  const futureMatches = form.filter(m => {
    const d = parseDate(m.date)
    return d && d >= now || (m.goalsFor === null && m.goalsAgainst === null)
  })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">{report?.name || team.name}</h1>
          <p className="text-slate-400 text-sm">{team.competition} — Temporada 2025/26</p>
        </div>

        {form.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Calendar size={40} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No s&apos;han trobat partits.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Next match highlight */}
            {nextMatch && (
              <div className="glass-card rounded-2xl p-6 border-cyan-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Crosshair size={18} className="text-cyan-400" />
                  <h2 className="font-bold text-white">Proper partit — J{nextMatch.jornada}</h2>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${nextMatch.isHome ? 'bg-green-500/20 text-green-400 border border-green-500/25' : 'bg-sky-500/20 text-sky-400 border border-sky-500/25'}`}>
                    {nextMatch.isHome ? 'Local' : 'Visitant'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 text-sm">{formatDate(nextMatch.date)}</span>
                  {nextMatch.time && <span className="text-cyan-400 font-bold text-sm">{nextMatch.time}h</span>}
                  <span className="text-white font-semibold">{nextMatch.opponent}</span>
                  {nextMatch.venue && <span className="text-slate-500 text-xs ml-auto">{nextMatch.venue}</span>}
                </div>
              </div>
            )}

            {/* Future matches */}
            {futureMatches.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Propers partits ({futureMatches.length})</h2>
                <div className="space-y-1">
                  {futureMatches.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm py-2.5 border-b border-white/5 last:border-0">
                      <span className="text-slate-500 text-xs w-14">{formatDate(m.date)}</span>
                      <span className="text-slate-400 text-xs w-8">J{m.jornada}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${m.isHome ? 'bg-green-500/15 text-green-400' : 'bg-sky-500/15 text-sky-400'}`}>
                        {m.isHome ? 'L' : 'V'}
                      </span>
                      <span className="text-white flex-1 truncate">{m.opponent}</span>
                      <span className="text-slate-600 text-sm">-</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past results */}
            {pastMatches.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Resultats ({pastMatches.length})</h2>
                <div className="space-y-1">
                  {pastMatches.map((m, i) => {
                    const res = m.result
                    return (
                      <div key={i} className={`flex items-center gap-3 text-sm py-2.5 border-b border-white/5 last:border-0 ${res === 'W' ? 'bg-green-500/5' : res === 'L' ? 'bg-red-500/5' : ''} rounded-lg px-2 -mx-2`}>
                        <span className="text-slate-500 text-xs w-14">{formatDate(m.date)}</span>
                        <span className="text-slate-400 text-xs w-8">J{m.jornada}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${m.isHome ? 'bg-green-500/15 text-green-400' : 'bg-sky-500/15 text-sky-400'}`}>
                          {m.isHome ? 'L' : 'V'}
                        </span>
                        <span className="text-white flex-1 truncate">{m.opponent}</span>
                        <span className="font-bold tabular-nums">
                          <span className={res === 'W' ? 'text-green-400' : res === 'L' ? 'text-red-400' : 'text-slate-300'}>{m.goalsFor}</span>
                          <span className="text-slate-600 mx-0.5">-</span>
                          <span className={res === 'L' ? 'text-green-400' : res === 'W' ? 'text-red-400' : 'text-slate-300'}>{m.goalsAgainst}</span>
                        </span>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${res === 'W' ? 'bg-green-500 text-white' : res === 'D' ? 'bg-amber-400 text-white' : res === 'L' ? 'bg-red-500 text-white' : 'bg-white/10 text-slate-500'}`}>
                          {res || '?'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  )
}
