import { notFound } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import { COMPETITION_NAMES, slugify } from '@/lib/data'
import { buildTeamReport, type TeamReport, type RivalReport, type PlayerStat, type GoalBucket, type MatchResult, type StandingRow, type Sanction } from '@/lib/team-report'
import { RivalScoutCard } from '@/components/RivalScoutCard'
import {
  Users, Trophy, Shield, ChevronRight, AlertTriangle,
  Calendar, Target, Clock, Home, Plane, BarChart2,
  ArrowRight, Crosshair, Ban,
} from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const report = buildTeamReport(slug)
  if (!report) return { title: 'Equip | FutLab' }
  return {
    title: `${report.name} — Informe de l'equip | FutLab`,
    description: `Estadístiques, plantilla, propers rivals i anàlisi complet de ${report.name}. Futbol català temporada 2025/26.`,
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FormDot({ result }: { result: 'W' | 'D' | 'L' | null }) {
  const cls =
    result === 'W' ? 'bg-green-500 text-white' :
    result === 'D' ? 'bg-amber-400 text-white' :
    result === 'L' ? 'bg-red-500 text-white' : 'bg-white/10 text-slate-500'
  const label = result ?? '?'
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${cls}`}>
      {label}
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

function SplitRecord({
  label, record, icon,
}: {
  label: string
  record: { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number }
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
        <div
          className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full transition-all"
          style={{ width: `${winRate}%` }}
        />
      </div>
      <div className="text-[10px] text-slate-500 mt-1">{winRate}% victòries</div>
    </div>
  )
}

// ─── FIXED Goal Timing Bar ─────────────────────────────────────────────────
// Fix: bars use flex items-end with percentage heights so they correctly
// grow from the bottom of the container.
function GoalTimingBar({ buckets }: { buckets: GoalBucket[] }) {
  const maxVal = Math.max(...buckets.flatMap(b => [b.scored, b.conceded]), 1)
  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-6">
        <Clock size={16} className="text-green-400" />
        <h3 className="font-bold text-white text-sm">Timing de gols</h3>
      </div>

      {/* Bar chart — items-end + percentage heights = bottom-anchored */}
      <div className="flex items-end gap-1.5" style={{ height: '100px' }}>
        {buckets.map(b => (
          <div key={b.label} className="flex-1 flex items-end gap-px" style={{ height: '100%' }}>
            {/* Scored bar */}
            <div
              className="flex-1 rounded-t bg-gradient-to-t from-green-700 to-green-400 opacity-80 hover:opacity-100 transition-opacity"
              style={{
                height: `${Math.max((b.scored / maxVal) * 100, b.scored > 0 ? 4 : 1)}%`,
                minHeight: '1px',
              }}
              title={`Gols marcats: ${b.scored}`}
            />
            {/* Conceded bar */}
            <div
              className="flex-1 rounded-t bg-gradient-to-t from-red-800 to-red-500 opacity-70 hover:opacity-100 transition-opacity"
              style={{
                height: `${Math.max((b.conceded / maxVal) * 100, b.conceded > 0 ? 4 : 1)}%`,
                minHeight: '1px',
              }}
              title={`Gols encaixats: ${b.conceded}`}
            />
          </div>
        ))}
      </div>

      {/* Period labels */}
      <div className="flex gap-1.5 mt-2">
        {buckets.map(b => (
          <div key={b.label} className="flex-1 text-center text-[9px] text-slate-500 leading-tight">
            {b.label}
          </div>
        ))}
      </div>

      {/* Number values */}
      <div className="flex gap-1.5 mt-2">
        {buckets.map(b => (
          <div key={b.label} className="flex-1 text-center">
            <div className="text-[10px] font-bold text-green-400">{b.scored}</div>
            <div className="text-[10px] text-red-400">{b.conceded}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-5 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
          <span className="text-slate-400">Marcats</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
          <span className="text-slate-400">Encaixats</span>
        </div>
      </div>
    </div>
  )
}

function MiniTable({
  standings, teamSlug,
}: {
  standings: StandingRow[]
  teamSlug: string
}) {
  if (standings.length === 0) return null
  const myIdx = standings.findIndex(s => s.slug === teamSlug || slugify(s.name) === teamSlug)
  const startIdx = Math.max(0, Math.min(myIdx - 2, standings.length - 5))
  const rows = standings.slice(startIdx, startIdx + 5)
  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-yellow-400" />
        <h3 className="font-bold text-white text-sm">Classificació</h3>
        <Link href="#" className="ml-auto text-xs text-green-400 hover:text-green-300">
          Veure tot <ArrowRight size={10} className="inline" />
        </Link>
      </div>
      <div className="space-y-1">
        {rows.map(s => {
          const isMyTeam = s.slug === teamSlug || slugify(s.name) === teamSlug
          return (
            <div
              key={s.slug}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                isMyTeam ? 'bg-green-500/15 border border-green-500/25' : 'hover:bg-white/5'
              }`}
            >
              <span className={`w-4 text-right ${isMyTeam ? 'text-green-400 font-bold' : 'text-slate-600'}`}>
                {s.position}
              </span>
              <span className={`flex-1 truncate ${isMyTeam ? 'text-white font-semibold' : 'text-slate-300'}`}>
                {s.name}
              </span>
              <span className="text-slate-500 w-5 text-center">{s.played}</span>
              <span className={`w-6 text-center font-bold ${isMyTeam ? 'text-green-400' : 'text-slate-300'}`}>
                {s.points}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Slim match info card — no rival intel (moved to RivalScoutCard)
function NextMatchInfoCard({ nextMatch, competition }: {
  nextMatch: NonNullable<TeamReport['nextMatch']>
  competition: string
}) {
  return (
    <div className="bg-gradient-to-br from-[#0d2a4a] to-[#0f172a] border border-cyan-500/20 rounded-2xl p-6 h-full">
      <div className="flex items-center gap-2 mb-5">
        <Crosshair size={18} className="text-cyan-400" />
        <h3 className="font-bold text-white">Proper Rival — J{nextMatch.jornada}</h3>
        <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-semibold ${
          nextMatch.isHome
            ? 'bg-green-500/20 text-green-400 border border-green-500/25'
            : 'bg-sky-500/20 text-sky-400 border border-sky-500/25'
        }`}>
          {nextMatch.isHome ? '🏠 Local' : '✈️ Visita'}
        </span>
      </div>

      {/* VS visual */}
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

      {/* Venue */}
      {nextMatch.venue && (
        <div className="mb-3 px-3 py-2 bg-white/5 rounded-xl flex items-center gap-2">
          <span className="text-xs">📍</span>
          <span className="text-xs text-slate-400 truncate">{nextMatch.venue.split('  ')[0]}</span>
        </div>
      )}

      {/* Referee */}
      {nextMatch.referee && (
        <div className="px-3 py-2 bg-white/5 rounded-xl flex items-center gap-2">
          <Shield size={12} className="text-purple-400 shrink-0" />
          <div className="text-xs text-slate-400 min-w-0">
            <span className="text-slate-500">Àrbitre: </span>
            <Link
              href={`/arbitre/${slugify(nextMatch.referee)}`}
              className="text-purple-300 hover:text-purple-200 font-medium"
            >
              {nextMatch.referee.split(',')[0]}
            </Link>
            {nextMatch.referees && nextMatch.referees.length > 1 && (
              <span className="text-slate-600 ml-1">+{nextMatch.referees.length - 1} assistents</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SanctionsCard({ sanctions }: { sanctions: Sanction[] }) {
  const active = sanctions.filter(s => s.matches_suspended > 0)
  const past = sanctions.filter(s => s.matches_suspended === 0)
  if (sanctions.length === 0) return null
  return (
    <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Ban size={16} className="text-red-400" />
        <h3 className="font-bold text-red-400 text-sm">Sancions FCF</h3>
        {active.length > 0 && (
          <span className="ml-auto text-xs text-red-500/80 bg-red-500/10 px-2 py-0.5 rounded-full">
            {active.length} activa{active.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {active.map((s, i) => (
          <div key={i} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl bg-red-900/20 border border-red-500/20">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{s.player}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">{s.reason}</p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <span className="text-xs font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full whitespace-nowrap">
                🚫 {s.matches_suspended} part{s.matches_suspended !== 1 ? 's' : ''}
              </span>
              {s.article && <span className="text-[10px] text-slate-600">Art. {s.article}</span>}
            </div>
          </div>
        ))}
        {past.length > 0 && (
          <>
            {active.length > 0 && <div className="border-t border-white/5 my-1" />}
            {past.map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-3 px-3 py-2 rounded-xl bg-white/3 opacity-60">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400 truncate">{s.player}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5 leading-snug line-clamp-1">{s.reason}</p>
                </div>
                <span className="text-[10px] text-slate-600 shrink-0">Complida</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function SquadTable({ players }: { players: PlayerStat[] }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-purple-400" />
        <h3 className="font-bold text-white text-sm">Plantilla — {players.length} jugadors</h3>
      </div>
      <div className="overflow-x-auto">
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
            {players.slice(0, 25).map((p, i) => (
              <tr
                key={i}
                className={`transition-colors ${p.risk ? 'bg-amber-900/8 hover:bg-amber-900/15' : 'hover:bg-white/3'}`}
              >
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200 text-sm">{p.name}</span>
                    {p.risk && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-full font-semibold shrink-0">
                        APERCIBUT
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 text-center text-slate-400 text-xs">
                  {p.appearances > 0 ? p.appearances : <span className="text-slate-600">–</span>}
                </td>
                <td className="py-2.5 text-center">
                  {p.goals > 0 ? <span className="text-green-400 font-bold text-xs">{p.goals}</span> : <span className="text-slate-600 text-xs">–</span>}
                </td>
                <td className="py-2.5 text-center">
                  {p.yellow_cards > 0 ? (
                    <span className={`font-bold text-xs ${p.yellow_cards >= 4 && p.yellow_cards % 4 === 0 ? 'text-amber-400' : 'text-slate-400'}`}>{p.yellow_cards}</span>
                  ) : <span className="text-slate-600 text-xs">–</span>}
                </td>
                <td className="py-2.5 text-center">
                  {p.red_cards > 0 ? <span className="text-red-400 font-bold text-xs">{p.red_cards}</span> : <span className="text-slate-600 text-xs">–</span>}
                </td>
                <td className="py-2.5 text-center text-slate-500 text-xs hidden sm:table-cell">
                  {p.minutes_played > 0 ? `${p.minutes_played}'` : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {players.some(p => p.risk) && (
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
          <AlertTriangle size={12} className="text-amber-400" />
          <p className="text-xs text-amber-400/80">
            <strong>APERCIBUT</strong>: jugador amb exactament 4, 8 o 12 grogues. La propera groga implica 1 partit de suspensió.
          </p>
        </div>
      )}
    </div>
  )
}

function RecentMatches({ form }: { form: MatchResult[] }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} className="text-green-400" />
        <h3 className="font-bold text-white text-sm">Partits recents</h3>
      </div>
      <div className="space-y-1.5">
        {form.map((m, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/4 transition-colors">
            <FormDot result={m.result} />
            <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
              <span className="text-xs text-slate-400 text-right truncate">{m.isHome ? 'LOCAL' : 'VISIT'}</span>
              <div className="flex flex-col items-center">
                <ScoreBadge gf={m.goalsFor} ga={m.goalsAgainst} />
              </div>
              <Link
                href={`/equip/${m.opponentSlug}`}
                className="text-xs text-slate-300 hover:text-white truncate transition-colors"
              >
                vs {m.opponent}
              </Link>
            </div>
            <span className="text-[10px] text-slate-600 shrink-0 hidden sm:block">{formatDate(m.date)}</span>
            {m.referee && (
              <Link
                href={`/arbitre/${slugify(m.referee)}`}
                className="text-[10px] text-slate-600 hover:text-green-400 truncate shrink-0 hidden md:block max-w-[90px]"
              >
                {m.referee.split(',')[0]}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function EquipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const report = buildTeamReport(slug)

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white">
        <PublicHeader />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <Users size={32} className="text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Equip no trobat</h1>
          <p className="text-slate-400 mb-8">
            Aquest equip no apareix a les actes de la temporada actual de la FCF.
          </p>
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
  const activeSanctions = report.sanctions.filter(s => s.matches_suspended > 0)

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <PublicHeader />

      {/* ─── Hero header ─── */}
      <div className="bg-gradient-to-b from-[#0a1628] to-[#0f172a] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          {/* Breadcrumb */}
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

          {/* Team identity */}
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 flex items-center justify-center text-2xl font-black text-green-400 shrink-0">
              {report.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">{report.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {compName && (
                  <Link href={`/competicio/${report.competition}`} className="text-sm text-green-400 hover:text-green-300 transition-colors">
                    {compName}
                  </Link>
                )}
                {report.position && (
                  <span className="text-xs px-2.5 py-1 bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 rounded-full font-bold">
                    #{report.position} classificació
                  </span>
                )}
                {report.nextMatch && (
                  <span className="text-xs text-slate-500">
                    J{report.nextMatch.jornada} · {formatDate(report.nextMatch.date)}
                  </span>
                )}
              </div>
            </div>

            {/* Form dots */}
            {report.form.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                {report.form.slice(0, 5).reverse().map((f, i) => <FormDot key={i} result={f.result} />)}
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-3 mt-6">
            {[
              { v: report.played, l: 'Partits', c: 'text-white' },
              { v: report.wins, l: 'Victòries', c: 'text-green-400' },
              { v: report.draws, l: 'Empats', c: 'text-amber-400' },
              { v: report.losses, l: 'Derrotes', c: 'text-red-400' },
              { v: `${report.gf}–${report.ga}`, l: 'Gols', c: 'text-cyan-400' },
              { v: report.points, l: 'Punts', c: 'text-white' },
            ].map(s => (
              <div key={s.l} className="bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-center">
                <div className={`text-lg font-black ${s.c}`}>{s.v}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ─── Row 1: Home/Away + Classification ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SplitRecord
            label="Com a Local"
            record={report.home}
            icon={<Home size={15} className="text-green-400" />}
          />
          <SplitRecord
            label="Com a Visitant"
            record={report.away}
            icon={<Plane size={15} className="text-sky-400" />}
          />
          <MiniTable standings={report.standings} teamSlug={slug} />
        </div>

        {/* ─── Row 2: Match info card + Goal timing ─── */}
        {report.nextMatch ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <NextMatchInfoCard nextMatch={report.nextMatch} competition={report.competition} />
            </div>
            <div className="lg:col-span-3 flex flex-col gap-4">
              <GoalTimingBar buckets={report.goalBuckets} />
            </div>
          </div>
        ) : (
          <GoalTimingBar buckets={report.goalBuckets} />
        )}

        {/* ─── Row 3: Rival Scout Card (full-width, expandable) ─── */}
        {report.nextMatch && report.rival && (
          <RivalScoutCard
            rival={report.rival}
            nextMatch={{
              jornada: report.nextMatch.jornada,
              date: report.nextMatch.date,
              time: report.nextMatch.time,
              opponent: report.nextMatch.opponent,
              opponentSlug: report.nextMatch.opponentSlug,
              isHome: report.nextMatch.isHome,
              venue: report.nextMatch.venue,
              referee: report.nextMatch.referee,
              referees: report.nextMatch.referees,
            }}
            headToHead={report.headToHead}
          />
        )}

        {/* ─── Row 4: Sanctions + Apercibits + Top scorers ─── */}
        {(activeSanctions.length > 0 || apercibits.length > 0 || topScorers.length > 0 || report.sanctions.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {report.sanctions.length > 0 && (
              <SanctionsCard sanctions={report.sanctions} />
            )}

            {apercibits.length > 0 && (
              <div className="bg-amber-900/10 border border-amber-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <h3 className="font-bold text-amber-400 text-sm">Apercibits del teu equip</h3>
                  <span className="ml-auto text-xs text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    {apercibits.length} jugador{apercibits.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {apercibits.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-900/15 border border-amber-500/15">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{p.name}</p>
                        {p.appearances > 0 && (
                          <p className="text-xs text-slate-500">{p.appearances} partits · {p.minutes_played}′</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 ml-3 shrink-0">
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">🟨 {p.yellow_cards}</span>
                        {p.red_cards > 0 && <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">🟥 {p.red_cards}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-amber-500/60 mt-3">
                  Una nova targeta groga implica 1 partit de suspensió.
                </p>
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
                        <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.appearances} partits</p>
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

        {/* ─── Row 5: Full squad ─── */}
        {report.players.length > 0 ? (
          <SquadTable players={report.players} />
        ) : (
          <div className="bg-white/4 border border-white/8 rounded-2xl p-8 text-center">
            <Users size={28} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">Plantilla no disponible</p>
            <p className="text-slate-600 text-xs mt-1">
              Les dades detallades de plantilla provenen de les actes oficials de la FCF.<br/>
              Aquest equip encara no ha estat analitzat en detall.
            </p>
          </div>
        )}

        {/* ─── Row 6: Recent results ─── */}
        {report.form.length > 0 && (
          <RecentMatches form={report.form} />
        )}

      </div>

      <PublicFooter />
    </div>
  )
}
