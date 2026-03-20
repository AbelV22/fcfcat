import { notFound } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import { COMPETITION_NAMES, slugify } from '@/lib/data'
import { getFullTeamReportDB, type FullTeamReportDB, type RivalDataDB, type RefereeStatsDB } from '@/lib/supabase-data'
import { RivalScoutCard } from '@/components/RivalScoutCard'
import { AdminGate, AdminBadge, AdminBlurValue, AdminUpgradeLink } from '@/components/AdminGate'
import ScrapeProgressBanner from '@/components/ScrapeProgressBanner'
import {
  Users, Trophy, Shield, ChevronRight, AlertTriangle,
  Calendar, Target, Clock, Home, Plane, BarChart2,
  ArrowRight, Crosshair, Ban, Lock, Star, TrendingUp,
} from 'lucide-react'

// SSR — rendered on each request, no filesystem access
export const dynamic = 'force-dynamic'

// ─── Paywall components ────────────────────────────────────────────────────

function RegisterBlur({ children, label = "Registra't gratis per veure aquesta secció" }: {
  children: React.ReactNode
  label?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="blur-sm pointer-events-none select-none opacity-60">{children}</div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/70 to-transparent flex flex-col items-center justify-end pb-6 px-4 text-center">
        <div className="w-9 h-9 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mb-3">
          <Lock size={16} className="text-green-400" />
        </div>
        <p className="text-sm font-semibold text-white mb-1">{label}</p>
        <p className="text-xs text-slate-400 mb-3">Gratis per a entrenadors i tècnics</p>
        <Link
          href="/entrenador"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white text-xs font-bold rounded-lg transition-all"
        >
          Registra't gratis <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const report = await getFullTeamReportDB(slug)
  if (report) {
    return {
      title: `${report.name} — Informe de l'equip | NeoScout`,
      description: `Estadístiques, plantilla, propers rivals i anàlisi complet de ${report.name}. Futbol català temporada 2025/26.`,
    }
  }
  return { title: 'Equip | NeoScout' }
}

// ─── Sub-components ────────────────────────────────────────────────────────

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

function ScoreBadge({ gf, ga }: { gf: number | null; ga: number | null }) {
  if (gf === null || ga === null) return <span className="text-slate-500 text-sm">–</span>
  const win = gf > ga, lose = gf < ga
  return (
    <span className="font-bold tabular-nums text-sm">
      <span className={win ? 'text-green-400' : lose ? 'text-red-400' : 'text-slate-300'}>{gf}</span>
      <span className="text-slate-600 mx-0.5">-</span>
      <span className={lose ? 'text-green-400' : win ? 'text-red-400' : 'text-slate-300'}>{ga}</span>
    </span>
  )
}

function formatDate(d: string) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) {
    const months = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
    const day = parts[0], month = parts[1]
    return `${day} ${months[parseInt(month, 10) - 1] || month}`
  }
  return d
}

type SplitStats = { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number }

function SplitRecordCard({
  label, record, icon,
}: {
  label: string
  record: SplitStats
  icon: React.ReactNode
}) {
  const winRate = record.played > 0 ? Math.round((record.wins / record.played) * 100) : 0
  return (
    <div className="flex-1 bg-white/4 border border-white/8 rounded-2xl p-5">
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
        <span>Gols: {record.gf}–{record.ga}</span>
        <span className="text-white font-bold">{record.points} pts</span>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full" style={{ width: `${winRate}%` }} />
      </div>
      <div className="text-[10px] text-slate-500 mt-1">{winRate}% victòries</div>
    </div>
  )
}

function MiniTable({ standings, teamSlug }: { standings: FullTeamReportDB['standings']; teamSlug: string }) {
  if (standings.length === 0) return null
  const myIdx = standings.findIndex(s => s.slug === teamSlug)
  const startIdx = Math.max(0, Math.min(myIdx - 2, standings.length - 5))
  const rows = standings.slice(startIdx, startIdx + 5)
  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-yellow-400" />
        <h3 className="font-bold text-white text-sm">Classificació</h3>
      </div>
      <div className="space-y-1">
        {rows.map(s => {
          const isMyTeam = s.slug === teamSlug
          return (
            <div
              key={s.slug}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${isMyTeam ? 'bg-green-500/15 border border-green-500/25' : 'hover:bg-white/5'}`}
            >
              <span className={`w-4 text-right ${isMyTeam ? 'text-green-400 font-bold' : 'text-slate-600'}`}>{s.position}</span>
              <Link href={`/equip/${s.slug}`} className={`flex-1 truncate hover:text-white transition-colors ${isMyTeam ? 'text-white font-semibold' : 'text-slate-300'}`}>{s.name}</Link>
              <span className="text-slate-500 w-5 text-center">{s.played}</span>
              <span className={`w-6 text-center font-bold ${isMyTeam ? 'text-green-400' : 'text-slate-300'}`}>{s.points}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NextMatchInfoCard({ nextMatch, competition }: {
  nextMatch: NonNullable<FullTeamReportDB['nextMatch']>
  competition: string
}) {
  return (
    <div className="bg-gradient-to-br from-[#0d2a4a] to-[#0f172a] border border-cyan-500/20 rounded-2xl p-6 h-full">
      <div className="flex items-center gap-2 mb-5">
        <Crosshair size={18} className="text-cyan-400" />
        <h3 className="font-bold text-white">Proper Rival — J{nextMatch.jornada}</h3>
        <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-semibold ${nextMatch.isHome ? 'bg-green-500/20 text-green-400 border border-green-500/25' : 'bg-sky-500/20 text-sky-400 border border-sky-500/25'}`}>
          {nextMatch.isHome ? '🏠 Local' : '✈️ Visita'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="text-center flex-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/25 flex items-center justify-center text-xl font-black text-green-400 mx-auto mb-2">T</div>
          <div className="text-xs text-slate-400">El teu equip</div>
        </div>
        <div className="text-center px-4">
          <div className="text-2xl font-black text-slate-500 mb-0.5">VS</div>
          <div className="text-[11px] text-slate-400 font-medium">{formatDate(nextMatch.date)}</div>
          {nextMatch.time && <div className="text-[11px] text-cyan-400 font-bold">{nextMatch.time}h</div>}
        </div>
        <div className="text-center flex-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/25 flex items-center justify-center text-xl font-black text-red-400 mx-auto mb-2">
            {nextMatch.opponent.charAt(0)}
          </div>
          <div className="text-xs text-slate-200 font-semibold leading-tight">{nextMatch.opponent}</div>
        </div>
      </div>
      {nextMatch.referee && (
        <div className="px-3 py-2 bg-white/5 rounded-xl flex items-center gap-2">
          <Shield size={12} className="text-purple-400 shrink-0" />
          <span className="text-xs text-slate-400 truncate">Àrbitre: <span className="text-slate-200 font-medium">{nextMatch.referee}</span></span>
        </div>
      )}
    </div>
  )
}

function SquadTable({ players }: { players: FullTeamReportDB['players'] }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-purple-400" />
        <h3 className="font-bold text-white text-sm">Plantilla — {players.length} jugadors</h3>
      </div>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-[380px] px-4 sm:px-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-slate-500 text-[11px] uppercase tracking-wider">
                <th className="text-left pb-2.5 font-medium">Jugador</th>
                <th className="text-center pb-2.5 font-medium w-10">PJ</th>
                <th className="text-center pb-2.5 font-medium w-10">⚽</th>
                <th className="text-center pb-2.5 font-medium w-10">🟨</th>
                <th className="text-center pb-2.5 font-medium w-10">🟥</th>
                <th className="text-center pb-2.5 font-medium w-16 hidden sm:table-cell">Min</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {players.slice(0, 30).map((p, i) => (
                <tr key={i} className={`transition-colors ${p.risk ? 'bg-amber-900/8 hover:bg-amber-900/15' : 'hover:bg-white/3'}`}>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-200 text-sm">{p.name}</span>
                      {p.risk && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-full font-semibold shrink-0">⚠️ RISC</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 text-center text-slate-400 text-xs">{p.appearances > 0 ? p.appearances : <span className="text-slate-600">–</span>}</td>
                  <td className="py-2.5 text-center">{p.goals > 0 ? <span className="text-green-400 font-bold text-xs">{p.goals}</span> : <span className="text-slate-600 text-xs">–</span>}</td>
                  <td className="py-2.5 text-center">
                    {p.yellow_cards > 0
                      ? <span className={`font-bold text-xs ${[4, 9, 14].includes(p.yellow_cards) ? 'text-amber-400' : 'text-slate-400'}`}>{p.yellow_cards}</span>
                      : <span className="text-slate-600 text-xs">–</span>}
                  </td>
                  <td className="py-2.5 text-center">{p.red_cards > 0 ? <span className="text-red-400 font-bold text-xs">{p.red_cards}</span> : <span className="text-slate-600 text-xs">–</span>}</td>
                  <td className="py-2.5 text-center text-slate-500 text-xs hidden sm:table-cell">
                    {p.minutes_played > 0 ? `${p.minutes_played}'` : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {players.some(p => p.risk) && (
        <div className="mt-4 pt-3 border-t border-white/5 flex items-start gap-2">
          <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-400/80">
            <strong>⚠️ RISC</strong>: jugador amb 4, 9 o 14 grogues. La propera groga implica 1 partit de suspensió.
          </p>
        </div>
      )}
    </div>
  )
}

function RecentMatches({ form }: { form: FullTeamReportDB['form'] }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} className="text-green-400" />
        <h3 className="font-bold text-white text-sm">Partits recents</h3>
      </div>
      <div className="space-y-1">
        {form.map((m, i) => (
          <div key={i} className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 rounded-xl hover:bg-white/4 transition-colors">
            <FormDot result={m.result} />
            <div className="flex-1 grid grid-cols-[auto_auto_1fr] items-center gap-1.5 min-w-0">
              <span className="text-[10px] text-slate-500 text-right">{m.isHome ? 'LOC' : 'VIS'}</span>
              <ScoreBadge gf={m.goalsFor} ga={m.goalsAgainst} />
              <Link href={`/equip/${m.opponentSlug}`} className="text-xs text-slate-300 hover:text-white truncate transition-colors">
                {m.opponent}
              </Link>
            </div>
            <span className="text-[10px] text-slate-600 shrink-0">{formatDate(m.date)}</span>
            {m.referee && (
              <Link href={`/arbitre/${slugify(m.referee)}`} className="text-[10px] text-slate-600 hover:text-green-400 truncate shrink-0 hidden md:block max-w-[90px]">
                {m.referee.split(',')[0]}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function RefereeFullCard({ referee }: { referee: RefereeStatsDB }) {
  const strictLevel = referee.yellows_per_match >= 5 ? 'Molt estricte' : referee.yellows_per_match >= 3.5 ? 'Estricte' : referee.yellows_per_match >= 2 ? 'Moderat' : 'Permissiu'
  const strictColor = referee.yellows_per_match >= 5 ? 'text-red-400' : referee.yellows_per_match >= 3.5 ? 'text-amber-400' : referee.yellows_per_match >= 2 ? 'text-yellow-400' : 'text-green-400'

  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-cyan-400" />
        <h3 className="font-bold text-cyan-400 text-sm">Àrbitre del proper partit</h3>
        <AdminBadge />
      </div>

      {/* Referee identity */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 mb-4">
        <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <span className="text-cyan-400 font-bold text-sm">{referee.name.split(',')[0]?.charAt(0) || '?'}</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-200 text-sm truncate">{referee.name}</p>
          <p className="text-[11px] text-slate-500">{referee.matches} partits arbitrats aquesta temporada</p>
        </div>
        <Link href={`/arbitre/${referee.slug}`} className="ml-auto shrink-0 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors">
          Veure perfil →
        </Link>
      </div>

      {/* Stats grid — labels always visible, values blurred for non-admin */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: '🟨 Grogues / partit', value: referee.yellows_per_match.toFixed(1) },
          { label: '🟥 Vermelles / partit', value: referee.reds_per_match.toFixed(2) },
          { label: '% partits amb vermella', value: `${referee.matches_with_red_pct}%` },
          { label: 'Tendència', value: strictLevel },
        ].map(({ label, value }) => (
          <div key={label} className="px-3 py-2.5 rounded-xl bg-white/3 border border-white/5">
            <div className="text-[10px] text-slate-500 mb-1">{label}</div>
            <AdminGate fallback={<AdminBlurValue value={value} />}>
              <span className={`text-sm font-bold ${label.includes('Tendència') ? strictColor : 'text-white'}`}>{value}</span>
            </AdminGate>
          </div>
        ))}
      </div>

      {/* Recent matches */}
      {referee.recentMatches.length > 0 && (
        <AdminGate fallback={
          <div className="space-y-1">
            <div className="text-[11px] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Últims partits</div>
            {referee.recentMatches.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/3 blur-sm">
                <span className="text-xs text-slate-400 truncate">{m.home_team} – {m.away_team}</span>
                <span className="text-[10px] text-slate-600 shrink-0 ml-2">{m.home_score}–{m.away_score}</span>
              </div>
            ))}
            <AdminUpgradeLink />
          </div>
        }>
          <div className="space-y-1">
            <div className="text-[11px] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Últims partits arbitrats</div>
            {referee.recentMatches.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-slate-600 shrink-0">J{m.jornada}</span>
                  <span className="text-xs text-slate-300 truncate">{m.home_team} vs {m.away_team}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs font-bold text-white">{m.home_score}–{m.away_score}</span>
                  {m.yellows > 0 && <span className="text-[10px] text-amber-400">🟨{m.yellows}</span>}
                  {m.reds > 0 && <span className="text-[10px] text-red-400">🟥{m.reds}</span>}
                </div>
              </div>
            ))}
          </div>
        </AdminGate>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function EquipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const report = await getFullTeamReportDB(slug)

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white">
        <PublicHeader />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <Users size={32} className="text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Equip no trobat</h1>
          <p className="text-slate-400 mb-8">Aquest equip no apareix a les dades de la temporada actual de la FCF.</p>
          <Link href="/cerca" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all">
            Torna a la cerca
          </Link>
        </div>
        <PublicFooter />
      </div>
    )
  }

  const compName = COMPETITION_NAMES[report.competition] || report.competition
  const apercibits = report.players.filter(p => p.risk)
  const topScorers = [...report.players].sort((a, b) => b.goals - a.goals).filter(p => p.goals > 0).slice(0, 5)
  const PRIORITY = new Set(['segona-catalana', 'tercera-catalana', 'preferent-juvenils', 'juvenil-primera-divisio', 'quarta-catalana'])
  const isPriority = PRIORITY.has(report.competition)

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <PublicHeader />

      {!isPriority && (
        <div className="bg-amber-500/10 border-b border-amber-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2.5">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300/80">
              <span className="font-semibold text-amber-300">Fase beta:</span>{' '}
              NeoScout prioritza Segona i Tercera Catalana. Les dades d'altres categories poden no estar completament actualitzades.
            </p>
          </div>
        </div>
      )}

      {/* ─── Hero ─── */}
      <div className="bg-gradient-to-b from-[#0a1628] to-[#0f172a] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-5">
            <Link href="/" className="hover:text-slate-300 transition-colors">Inici</Link>
            <ChevronRight size={12} />
            {report.competition && (
              <>
                <Link href={`/competicio/${report.competition}`} className="hover:text-slate-300 transition-colors">{compName}</Link>
                <ChevronRight size={12} />
              </>
            )}
            <span className="text-slate-300">{report.name}</span>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 flex items-center justify-center text-2xl font-black text-green-400 shrink-0">
              {report.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl font-black text-white mb-1 leading-tight">{report.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {compName && (
                  <Link href={`/competicio/${report.competition}`} className="text-sm text-green-400 hover:text-green-300 transition-colors">{compName}</Link>
                )}
                {report.position && (
                  <span className="text-xs px-2.5 py-1 bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 rounded-full font-bold">#{report.position} class.</span>
                )}
              </div>
              {report.form.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 mt-2">
                  {report.form.slice(0, 5).reverse().map((f, i) => <FormDot key={i} result={f.result} />)}
                </div>
              )}
            </div>
          </div>

          {report.form.length > 0 && (
            <div className="flex sm:hidden items-center gap-1.5 mt-3">
              <span className="text-xs text-slate-500 mr-1">Forma:</span>
              {report.form.slice(0, 5).reverse().map((f, i) => <FormDot key={i} result={f.result} />)}
            </div>
          )}

          <div className="flex gap-2 sm:gap-3 mt-5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            {[
              { v: report.played, l: 'PJ', c: 'text-white' },
              { v: report.wins, l: 'Victòries', c: 'text-green-400' },
              { v: report.draws, l: 'Empats', c: 'text-amber-400' },
              { v: report.losses, l: 'Derrotes', c: 'text-red-400' },
              { v: `${report.gf}–${report.ga}`, l: 'Gols', c: 'text-cyan-400' },
              { v: report.points, l: 'Punts', c: 'text-white' },
            ].map(s => (
              <div key={s.l} className="bg-white/5 border border-white/8 rounded-xl px-3 sm:px-4 py-2.5 text-center shrink-0">
                <div className={`text-base sm:text-lg font-black ${s.c}`}>{s.v}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Row 1: Home/Away + Table */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <SplitRecordCard label="Com a Local" record={report.home} icon={<Home size={15} className="text-green-400" />} />
          <SplitRecordCard label="Com a Visitant" record={report.away} icon={<Plane size={15} className="text-sky-400" />} />
          <div className="col-span-2 lg:col-span-1">
            <MiniTable standings={report.standings} teamSlug={slug} />
          </div>
        </div>

        {/* Row 2: Next match card */}
        {report.nextMatch && (
          <NextMatchInfoCard nextMatch={report.nextMatch} competition={report.competition} />
        )}

        {/* Row 3: Rival Scout Card */}
        {report.nextMatch && report.rival && (
          <AdminGate
            fallback={
              <RegisterBlur label="Informe complet del Proper Rival — Registra't gratis">
                <RivalScoutCard
                  rival={report.rival as any}
                  nextMatch={{ ...report.nextMatch, referee: null, referees: [] }}
                  headToHead={report.headToHead as any}
                />
              </RegisterBlur>
            }
          >
            <RivalScoutCard
              rival={report.rival as any}
              nextMatch={report.nextMatch as any}
              headToHead={report.headToHead as any}
            />
          </AdminGate>
        )}

        {/* Row 4: Referee card (real stats) */}
        {report.referee && (
          <RefereeFullCard referee={report.referee} />
        )}
        {report.nextMatch?.referee && !report.referee && (
          /* Referee assigned but no stats yet (new referee) */
          <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-cyan-400" />
              <h3 className="font-bold text-cyan-400 text-sm">Àrbitre del proper partit</h3>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <span className="text-cyan-400 font-bold text-sm">{report.nextMatch.referee.split(',')[0]?.charAt(0) || '?'}</span>
              </div>
              <div>
                <p className="font-semibold text-slate-200 text-sm">{report.nextMatch.referee}</p>
                <p className="text-xs text-slate-500">Sense dades d'actes disponibles encara</p>
              </div>
            </div>
          </div>
        )}

        {/* Row 5: Sanctions + Apercibits + Scorers */}
        {(apercibits.length > 0 || topScorers.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {apercibits.length > 0 && (
              <div className="bg-amber-900/10 border border-amber-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <h3 className="font-bold text-amber-400 text-sm">Apercibits del teu equip</h3>
                  <span className="ml-auto text-xs text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full">{apercibits.length} jugadors</span>
                </div>
                <div className="space-y-2">
                  {apercibits.slice(0, 4).map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-900/15 border border-amber-500/15">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.appearances} partits · {p.minutes_played > 0 ? `${p.minutes_played}'` : '–'}</p>
                      </div>
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full ml-3 shrink-0">🟨 {p.yellow_cards}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topScorers.length > 0 && (
              <div className="bg-green-900/10 border border-green-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={16} className="text-green-400" />
                  <h3 className="font-bold text-green-400 text-sm">Golejadors de l'equip</h3>
                </div>
                <div className="space-y-2">
                  {topScorers.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-green-900/15 border border-green-500/15">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.appearances} partits · {p.minutes_played > 0 ? `${p.minutes_played}'` : '–'}</p>
                        </div>
                      </div>
                      <span className="text-lg font-black text-green-400 ml-3 shrink-0">{p.goals} ⚽</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Row 6: Full squad */}
        {report.players.length > 0 ? (
          <SquadTable players={report.players} />
        ) : isPriority ? (
          <ScrapeProgressBanner
            slug={slug}
            competition={report.competition}
            group={report.group}
            teamName={report.name}
          />
        ) : (
          <div className="bg-white/4 border border-white/8 rounded-2xl p-8 text-center">
            <Users size={28} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">Plantilla no disponible</p>
            <p className="text-slate-600 text-xs mt-1">Les dades detallades de plantilla provenen de les actes oficials de la FCF.</p>
          </div>
        )}

        {/* Row 7: Recent results */}
        {report.form.length > 0 && <RecentMatches form={report.form} />}

      </div>

      <PublicFooter />
    </div>
  )
}
