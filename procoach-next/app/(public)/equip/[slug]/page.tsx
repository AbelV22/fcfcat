import { notFound } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import { COMPETITION_NAMES, slugify, loadTeamData } from '@/lib/data'
import { getFullTeamReportDB, COMPETITIONS_WITHOUT_MINUTES, type FullTeamReportDB, type RivalDataDB, type RefereeStatsDB, type FieldDimsDB } from '@/lib/supabase-data'
import { PitchCompare } from '@/components/PitchCompare'
import { RivalScoutCard } from '@/components/RivalScoutCard'
import { AdminGate, AdminBadge, AdminBlurValue, AdminUpgradeLink } from '@/components/AdminGate'
import ScrapeProgressBanner from '@/components/ScrapeProgressBanner'
import TeamReportActions, { type PDFReportData } from '@/components/TeamReportActions'
import {
  Users, ListOrdered, Shield, ChevronRight, AlertTriangle,
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
  const jsonData = loadTeamData(slug)
  const competitionHint: string | undefined = jsonData?.meta?.competition || undefined
  const report = await getFullTeamReportDB(slug, competitionHint)
  if (report) {
    const compName = COMPETITION_NAMES[report.competition] || report.competition || ''
    const title = `${report.name} — Resultats, Plantilla i Estadístiques${compName ? ` | ${compName}` : ''}`
    const description = `Tot sobre ${report.name}: resultats, classificació, plantilla, propers rivals, estadístiques de gols i targetes. ${compName} temporada 2025/26. Dades oficials FCF.`
    return {
      title,
      description,
      keywords: [report.name, compName, 'resultats', 'classificació', 'plantilla', 'estadístiques', 'futbol català', 'FCF'].filter(Boolean),
      alternates: { canonical: `https://neoscout.es/equip/${slug}` },
      openGraph: {
        title: `${report.name} — Estadístiques i Resultats`,
        description,
        url: `https://neoscout.es/equip/${slug}`,
        type: 'website',
      },
    }
  }
  return { title: 'Equip no trobat | NeoScout' }
}

// ─── Sub-components ────────────────────────────────────────────────────────

const RESULT_LABEL: Record<string, string> = { W: 'V', D: 'E', L: 'D' }

function FormDot({ result }: { result: 'W' | 'D' | 'L' | null }) {
  const cls =
    result === 'W' ? 'bg-green-500 text-white' :
    result === 'D' ? 'bg-amber-400 text-white' :
    result === 'L' ? 'bg-red-500 text-white' : 'bg-white/10 text-slate-500'
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${cls}`}>
      {result ? RESULT_LABEL[result] : '?'}
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
          { v: record.wins, l: 'V', c: 'text-green-400' },
          { v: record.draws, l: 'E', c: 'text-amber-400' },
          { v: record.losses, l: 'D', c: 'text-red-400' },
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
        <ListOrdered size={16} className="text-yellow-400" />
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

function SquadTable({ players, teamSlug, hasMinutes }: { players: FullTeamReportDB['players']; teamSlug: string; hasMinutes: boolean }) {
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
                <th className="text-center pb-2.5 font-medium w-16 hidden sm:table-cell">{hasMinutes ? 'Min' : 'Tit.'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {players.slice(0, 30).map((p, i) => (
                <tr key={i} className={`transition-colors ${p.risk ? 'bg-amber-900/8 hover:bg-amber-900/15' : 'hover:bg-white/3'}`}>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/jugador/${slugify(p.name)}--${teamSlug}`} className="font-medium text-slate-200 text-sm hover:text-green-400 transition-colors">{p.name}</Link>
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
                    {hasMinutes
                      ? (p.minutes_played > 0 ? `${p.minutes_played}'` : '–')
                      : (p.starts > 0 ? p.starts : '–')}
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

// ─── Field Analysis Component ──────────────────────────────────────────────

function StatBar({
  teamVal, rivalVal, label, teamLabel, rivalLabel, colorTeam = 'bg-cyan-500', colorRival = 'bg-red-500',
}: {
  teamVal: number | null
  rivalVal: number | null
  label: string
  teamLabel: string
  rivalLabel: string
  colorTeam?: string
  colorRival?: string
}) {
  if (teamVal === null && rivalVal === null) {
    return (
      <div className="space-y-1">
        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
        <div className="text-xs text-slate-600 italic">Sense dades</div>
      </div>
    )
  }
  const tv = teamVal ?? 0
  const rv = rivalVal ?? 0
  const total = tv + rv || 1
  const teamPct = Math.round((tv / total) * 100)
  const rivalPct = 100 - teamPct

  return (
    <div className="space-y-1.5">
      <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-cyan-300 font-bold w-8 text-right tabular-nums">{tv}</span>
        <div className="flex-1 flex rounded-full overflow-hidden h-2 bg-white/10">
          <div className={`${colorTeam} transition-all`} style={{ width: `${teamPct}%` }} />
          <div className={`${colorRival} transition-all`} style={{ width: `${rivalPct}%` }} />
        </div>
        <span className="text-red-400 font-bold w-8 tabular-nums">{rv}</span>
      </div>
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{teamLabel}</span>
        <span>{rivalLabel}</span>
      </div>
    </div>
  )
}

function WinRateBar({
  home, label, teamLabel, rivalLabel,
}: {
  home: { team: SplitStats | null; rival: SplitStats | null }
  label: string
  teamLabel: string
  rivalLabel: string
}) {
  const t = home.team
  const r = home.rival
  const tRate = t && t.played > 0 ? Math.round((t.wins / t.played) * 100) : null
  const rRate = r && r.played > 0 ? Math.round((r.wins / r.played) * 100) : null

  if (tRate === null && rRate === null) {
    return (
      <div className="space-y-1">
        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
        <div className="text-xs text-slate-600 italic">Sense dades</div>
      </div>
    )
  }

  const tv = tRate ?? 0
  const rv = rRate ?? 0
  const tRecord = t ? `${t.wins}V-${t.draws}E-${t.losses}D` : '–'
  const rRecord = r ? `${r.wins}V-${r.draws}E-${r.losses}D` : '–'

  return (
    <div className="space-y-1.5">
      <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-cyan-300 font-bold w-8 text-right tabular-nums">{tv}%</span>
        <div className="flex-1 flex rounded-full overflow-hidden h-2 bg-white/10">
          <div className="bg-cyan-500 transition-all" style={{ width: `${tv}%` }} />
        </div>
        <span className="text-red-400 font-bold w-8 tabular-nums">{rv}%</span>
      </div>
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{tRecord}</span>
        <span>{rRecord}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="w-8" />
        <div className="flex-1 flex rounded-full overflow-hidden h-2 bg-white/10">
          <div className="bg-red-500 transition-all" style={{ width: `${rv}%` }} />
        </div>
        <span className="w-8" />
      </div>
    </div>
  )
}

function FieldAnalysisSection({
  report, rival,
}: {
  report: FullTeamReportDB
  rival: FullTeamReportDB['rival'] & {}
}) {
  const teamApercibits = report.players.filter(p => p.risk)
  const rivalApercibits = rival.apercibits || []
  const rivalAvgYellow = rival.players.length > 0
    ? (rival.players.reduce((s, p) => s + p.yellow_cards, 0) / rival.players.length).toFixed(1)
    : null

  return (
    <div className="bg-gradient-to-br from-[#0a1628] to-[#0d1f3a] border border-cyan-500/15 rounded-2xl p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <BarChart2 size={18} className="text-cyan-400 shrink-0" />
        <h3 className="font-bold text-white text-sm sm:text-base">
          Anàlisi de Camp —{' '}
          <span className="text-cyan-400">{report.name}</span>
          <span className="text-slate-500"> vs </span>
          <span className="text-red-400">{rival.name}</span>
        </h3>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 text-[11px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-cyan-500" />
          <span className="text-cyan-300 font-medium">{report.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span className="text-red-400 font-medium">{rival.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        {/* Attack */}
        <div className="space-y-4">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-white/5 pb-1.5">ATAC</div>
          <StatBar
            label="Gols marcats"
            teamVal={report.gf ?? null}
            rivalVal={rival.gf ?? null}
            teamLabel={report.name}
            rivalLabel={rival.name}
          />
          <StatBar
            label="Gols encaixats"
            teamVal={report.ga ?? null}
            rivalVal={rival.ga ?? null}
            teamLabel={report.name}
            rivalLabel={rival.name}
            colorTeam="bg-amber-500"
            colorRival="bg-slate-400"
          />
        </div>

        {/* Defence */}
        <div className="space-y-4">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-white/5 pb-1.5">RENDIMENT</div>
          <WinRateBar
            home={{ team: report.home, rival: rival.home }}
            label="Rendiment local"
            teamLabel={report.name}
            rivalLabel={rival.name}
          />
          <WinRateBar
            home={{ team: report.away, rival: rival.away }}
            label="Rendiment visitant"
            teamLabel={report.name}
            rivalLabel={rival.name}
          />
        </div>

        {/* Risk players */}
        <div className="space-y-3">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-white/5 pb-1.5">JUGADORS EN RISC</div>
          {teamApercibits.length === 0 && rivalApercibits.length === 0 ? (
            <div className="text-xs text-slate-600 italic">Cap jugador en risc</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] text-cyan-400/70 mb-1.5 font-semibold">{report.name}</div>
                {teamApercibits.length === 0 ? (
                  <div className="text-xs text-slate-600">–</div>
                ) : (
                  <div className="space-y-1">
                    {teamApercibits.slice(0, 3).map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <span className="text-amber-400">🟨</span>
                        <span className="text-slate-300 truncate">{p.name}</span>
                        <span className="text-amber-400 font-bold ml-auto shrink-0">{p.yellow_cards}</span>
                      </div>
                    ))}
                    {teamApercibits.length > 3 && (
                      <div className="text-[10px] text-slate-600">+{teamApercibits.length - 3} més</div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[10px] text-red-400/70 mb-1.5 font-semibold">{rival.name}</div>
                {rivalApercibits.length === 0 ? (
                  <div className="text-xs text-slate-600">–</div>
                ) : (
                  <div className="space-y-1">
                    {rivalApercibits.slice(0, 3).map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <span className="text-amber-400">🟨</span>
                        <span className="text-slate-300 truncate">{p.name}</span>
                        <span className="text-amber-400 font-bold ml-auto shrink-0">{p.yellow_cards}</span>
                      </div>
                    ))}
                    {rivalApercibits.length > 3 && (
                      <div className="text-[10px] text-slate-600">+{rivalApercibits.length - 3} més</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cards summary */}
        <div className="space-y-3">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-white/5 pb-1.5">TARGETES</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-cyan-400/70 mb-1.5 font-semibold">{report.name}</div>
              <div className="space-y-1 text-xs text-slate-400">
                <div>🟨 Total: <span className="text-white font-bold">{report.players.reduce((s, p) => s + p.yellow_cards, 0)}</span></div>
                <div>🟥 Total: <span className="text-white font-bold">{report.players.reduce((s, p) => s + p.red_cards, 0)}</span></div>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-red-400/70 mb-1.5 font-semibold">{rival.name}</div>
              {rivalAvgYellow !== null ? (
                <div className="space-y-1 text-xs text-slate-400">
                  <div>🟨 Total: <span className="text-white font-bold">{rival.players.reduce((s, p) => s + p.yellow_cards, 0)}</span></div>
                  <div>🟥 Total: <span className="text-white font-bold">{rival.players.reduce((s, p) => s + p.red_cards, 0)}</span></div>
                </div>
              ) : (
                <div className="text-xs text-slate-600 italic">Sense dades</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PercentileBar({ value, label }: { value: number; label: string }) {
  const color =
    value >= 70 ? 'from-red-500 to-red-400' :
    value >= 40 ? 'from-amber-500 to-amber-400' :
    'from-green-500 to-green-400'
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-slate-400">{label}</span>
        <span className={`text-[11px] font-bold ${value >= 70 ? 'text-red-400' : value >= 40 ? 'text-amber-400' : 'text-green-400'}`}>{value}%ile</span>
      </div>
      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

const COMPETITION_LABELS: Record<string, string> = {
  'primera-catalana': 'Primera Cat.',
  'segona-catalana': 'Segona Cat.',
  'tercera-catalana': 'Tercera Cat.',
  'quarta-catalana': 'Quarta Cat.',
  'preferent-juvenils': 'Pref. Juvenils',
  'juvenil-primera-divisio': 'Juv. 1a Div.',
}

/** Inner content of the deep report — extracted so AdminGate can reuse without duplication */
function RefereeDeepContent({ referee, firstHalfPct, secondHalfPct, totalHalfCards, awayBias }: {
  referee: RefereeStatsDB
  firstHalfPct: number
  secondHalfPct: number
  totalHalfCards: number
  awayBias: number | null
}) {
  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp size={15} className="text-cyan-400" />
        <h4 className="font-bold text-cyan-400 text-sm uppercase tracking-wider">Anàlisi complet</h4>
      </div>
      <div>
        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Percentils vs àrbitres FCF</p>
        <PercentileBar value={referee.yellows_percentile} label="Duresa (grogues/part)" />
        <PercentileBar value={referee.reds_percentile} label="Expulsions (vermelles/part)" />
      </div>
      {referee.home_bias !== null && (
        <div>
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Biaix local / visitant</p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1.5">
            <span>Local</span><span className="ml-auto">Visitant</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden flex">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 h-full transition-all" style={{ width: `${referee.home_bias}%` }} />
            <div className="bg-gradient-to-r from-orange-500 to-orange-400 h-full flex-1" />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] font-bold text-blue-400">{referee.home_yellows} ({referee.home_bias}%)</span>
            <span className="text-[11px] font-bold text-orange-400">{referee.away_yellows} ({awayBias}%)</span>
          </div>
        </div>
      )}
      {totalHalfCards > 0 && (
        <div>
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Timing de targetes</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="px-3 py-2.5 rounded-xl bg-white/3 border border-white/5 text-center">
              <div className="text-[10px] text-slate-500 mb-1">1a meitat</div>
              <div className="text-base font-black text-slate-200">{referee.first_half_cards}</div>
              <div className="text-[10px] text-slate-500">{firstHalfPct}%</div>
            </div>
            <div className="px-3 py-2.5 rounded-xl bg-white/3 border border-white/5 text-center">
              <div className="text-[10px] text-slate-500 mb-1">2a meitat</div>
              <div className="text-base font-black text-slate-200">{referee.second_half_cards}</div>
              <div className="text-[10px] text-slate-500">{secondHalfPct}%</div>
            </div>
          </div>
        </div>
      )}
      {referee.competitionBreakdown.length > 0 && (
        <div>
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Per competició</p>
          <div className="space-y-1.5">
            {referee.competitionBreakdown.slice(0, 4).map(c => (
              <div key={c.competition} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3">
                <span className="text-xs text-slate-300">{COMPETITION_LABELS[c.competition] || c.competition}</span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-500">{c.matches} partits</span>
                  <span className="text-amber-400 font-semibold">🟨 {c.matches > 0 ? (c.yellows / c.matches).toFixed(1) : '0'}/part</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {referee.recentMatches.length > 0 && (
        <div>
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Últims {Math.min(referee.recentMatches.length, 10)} partits</p>
          <div className="space-y-1">
            {referee.recentMatches.slice(0, 10).map((m, i) => (
              <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-slate-600 shrink-0 w-7">J{m.jornada}</span>
                  <span className="text-xs text-slate-300 truncate">{m.home_team} vs {m.away_team}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs font-bold text-white tabular-nums">{m.home_score ?? '?'}–{m.away_score ?? '?'}</span>
                  {m.yellows > 0 && <span className="text-[10px] text-amber-400">🟨{m.yellows}</span>}
                  {m.reds > 0 && <span className="text-[10px] text-red-400">🟥{m.reds}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RefereeDeepReport({ referee }: { referee: RefereeStatsDB }) {
  const strictLevel =
    referee.yellows_per_match >= 5 ? 'Molt estricte' :
    referee.yellows_per_match >= 3.5 ? 'Estricte' :
    referee.yellows_per_match >= 2 ? 'Moderat' : 'Permissiu'
  const strictColor =
    referee.yellows_per_match >= 5 ? 'text-red-400' :
    referee.yellows_per_match >= 3.5 ? 'text-amber-400' :
    referee.yellows_per_match >= 2 ? 'text-yellow-400' : 'text-green-400'

  const totalHalfCards = referee.first_half_cards + referee.second_half_cards
  const firstHalfPct = totalHalfCards > 0 ? Math.round((referee.first_half_cards / totalHalfCards) * 100) : 0
  const secondHalfPct = totalHalfCards > 0 ? Math.round((referee.second_half_cards / totalHalfCards) * 100) : 0
  const awayBias = referee.home_bias !== null ? 100 - referee.home_bias : null

  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
      {/* Section A — always visible: basic identity + key stats */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-cyan-400" />
          <h3 className="font-bold text-cyan-400 text-sm">Àrbitre del proper partit</h3>
          <AdminBadge />
        </div>

        {/* Identity row */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 mb-4">
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <span className="text-cyan-400 font-bold text-sm">{referee.name.split(',')[0]?.charAt(0) || '?'}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-200 text-sm truncate">{referee.name}</p>
              {referee.predicted && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0">
                  Probable
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">{referee.matches} partits arbitrats · {referee.avg_goals_per_match.toFixed(1)} gols/part</p>
          </div>
          <Link href={`/arbitre/${referee.slug}`} className="ml-auto shrink-0 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors">
            Veure perfil →
          </Link>
        </div>

        {/* Key stats grid — always visible */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Grogues/part', value: referee.yellows_per_match.toFixed(1), icon: '🟨' },
            { label: 'Vermelles/part', value: referee.reds_per_match.toFixed(2), icon: '🟥' },
            { label: 'Amb expulsió', value: `${referee.matches_with_red_pct}%`, icon: '📋' },
            { label: 'Tendència', value: strictLevel, color: strictColor },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="px-3 py-2.5 rounded-xl bg-white/3 border border-white/5 text-center">
              <div className="text-[10px] text-slate-500 mb-1">{icon ? `${icon} ${label}` : label}</div>
              <span className={`text-sm font-bold ${color || 'text-white'}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/6" />

      {/* Section B — deep analysis, free for registered users / admins */}
      <AdminGate fallback={
        <RegisterBlur label="Anàlisi complet de l'àrbitre — Registra't gratis">
          <RefereeDeepContent referee={referee} firstHalfPct={firstHalfPct} secondHalfPct={secondHalfPct} totalHalfCards={totalHalfCards} awayBias={awayBias} />
        </RegisterBlur>
      }>
        <RefereeDeepContent referee={referee} firstHalfPct={firstHalfPct} secondHalfPct={secondHalfPct} totalHalfCards={totalHalfCards} awayBias={awayBias} />
      </AdminGate>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function EquipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const jsonData = loadTeamData(slug)
  const competitionHint: string | undefined = jsonData?.meta?.competition || undefined
  const report = await getFullTeamReportDB(slug, competitionHint)

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
  const PRIORITY = new Set(['segona-catalana', 'tercera-catalana', 'preferent-juvenils', 'juvenil-primera-divisio', 'quarta-catalana', 'divisio-honor-juvenil', 'lliga-nacional-juvenil', 'divisio-honor-cadet-s16', 'divisio-honor-cadet-s15'])
  const isPriority = PRIORITY.has(report.competition)

  const teamJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: report.name,
    sport: "Football",
    url: `https://neoscout.es/equip/${slug}`,
    memberOf: { "@type": "SportsOrganization", name: compName },
    member: report.players.slice(0, 25).map((p: any) => ({
      "@type": "Person",
      name: p.name,
      ...(p.goals > 0 ? { description: `${p.goals} gols` } : {}),
    })),
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "NeoScout", item: "https://neoscout.es" },
      { "@type": "ListItem", position: 2, name: compName, item: `https://neoscout.es/competicio/${report.competition}` },
      { "@type": "ListItem", position: 3, name: report.name, item: `https://neoscout.es/equip/${slug}` },
    ],
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
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

          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <TeamReportActions
              teamName={report.name}
              teamSlug={slug}
              competition={compName}
              reportData={{
                name: report.name,
                competition: report.competition,
                position: report.position,
                played: report.played, wins: report.wins, draws: report.draws, losses: report.losses, gf: report.gf, ga: report.ga, points: report.points,
                home: report.home,
                away: report.away,
                form: report.form.map(f => ({ date: f.date, jornada: f.jornada, opponent: f.opponent, isHome: f.isHome, goalsFor: f.goalsFor, goalsAgainst: f.goalsAgainst, result: f.result, referee: f.referee })),
                rival: report.rival ? {
                  name: report.rival.name,
                  played: report.rival.played, wins: report.rival.wins, draws: report.rival.draws, losses: report.rival.losses, gf: report.rival.gf, ga: report.rival.ga, points: report.rival.points,
                  position: report.rival.position,
                  home: report.rival.home,
                  away: report.rival.away,
                  form: report.rival.form.map(f => ({ date: f.date, jornada: f.jornada, opponent: f.opponent, isHome: f.isHome, goalsFor: f.goalsFor, goalsAgainst: f.goalsAgainst, result: f.result, referee: f.referee })),
                  topScorers: report.rival.topScorers,
                  apercibits: report.rival.apercibits,
                  mostMinutes: report.rival.mostMinutes,
                  goalBuckets: report.rival.goalBuckets,
                  insights: report.rival.insights,
                } : null,
                headToHead: report.headToHead.map(h => ({ date: h.date, jornada: h.jornada, opponent: h.opponent, isHome: h.isHome, goalsFor: h.goalsFor, goalsAgainst: h.goalsAgainst, result: h.result, referee: h.referee })),
                nextMatch: report.nextMatch ? { opponent: report.nextMatch.opponent, date: report.nextMatch.date, jornada: report.nextMatch.jornada, isHome: report.nextMatch.isHome, time: report.nextMatch.time, referee: report.nextMatch.referee } : null,
                homePitch: report.homePitch ? { length_m: report.homePitch.length_m, width_m: report.homePitch.width_m, field_name: report.homePitch.field_name } : null,
                rivalPitch: report.rivalPitch ? { length_m: report.rivalPitch.length_m, width_m: report.rivalPitch.width_m, field_name: report.rivalPitch.field_name } : null,
              } satisfies PDFReportData}
            />
          </div>

          <div className="flex gap-2 sm:gap-3 mt-4 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
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
                  hasMinutes={!COMPETITIONS_WITHOUT_MINUTES.has(report.competition)}
                />
              </RegisterBlur>
            }
          >
            <RivalScoutCard
              rival={report.rival as any}
              nextMatch={report.nextMatch as any}
              headToHead={report.headToHead as any}
              hasMinutes={!COMPETITIONS_WITHOUT_MINUTES.has(report.competition)}
            />
          </AdminGate>
        )}

        {/* Row 3b: Pitch Compare */}
        {(report.homePitch || report.rivalPitch) && report.rival && (
          <PitchCompare
            homePitch={report.homePitch}
            rivalPitch={report.rivalPitch}
            homeTeamName={report.name}
            rivalTeamName={report.rival.name}
          />
        )}

        {/* Row 3c: Field Analysis */}
        {report.rival && (
          <FieldAnalysisSection report={report} rival={report.rival} />
        )}

        {/* Row 4: Referee card (real stats) */}
        {report.referee && (
          <RefereeDeepReport referee={report.referee} />
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
                        <Link href={`/jugador/${slugify(p.name)}--${slug}`} className="text-sm font-medium text-slate-200 truncate hover:text-green-400 transition-colors block">{p.name}</Link>
                        <p className="text-xs text-slate-500">{p.appearances} partits{!COMPETITIONS_WITHOUT_MINUTES.has(report.competition) && p.minutes_played > 0 ? ` · ${p.minutes_played}'` : ''}</p>
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
                          <Link href={`/jugador/${slugify(p.name)}--${slug}`} className="text-sm font-medium text-slate-200 truncate hover:text-green-400 transition-colors block">{p.name}</Link>
                          <p className="text-xs text-slate-500">{p.appearances} partits{!COMPETITIONS_WITHOUT_MINUTES.has(report.competition) && p.minutes_played > 0 ? ` · ${p.minutes_played}'` : ''}</p>
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
          <SquadTable players={report.players} teamSlug={slug} hasMinutes={!COMPETITIONS_WITHOUT_MINUTES.has(report.competition)} />
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
