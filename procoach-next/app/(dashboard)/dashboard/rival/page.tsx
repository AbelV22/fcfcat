import { redirect } from 'next/navigation'
import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'
import { getFullTeamReportDB } from '@/lib/supabase-data'
import { Crosshair, Home, Plane, TrendingUp, AlertTriangle, Target, Ruler } from 'lucide-react'
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

/** Horizontal progress bar */
function ProgressBar({ value, max, color, label, showPct }: { value: number; max: number; color: string; label: string; showPct?: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className={`font-bold ${color}`}>{showPct ? `${pct}%` : value}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Win rate donut (SVG) */
function WinRateDonut({ wins, draws, losses, size = 100 }: { wins: number; draws: number; losses: number; size?: number }) {
  const total = wins + draws + losses
  if (total === 0) return null
  const winPct = (wins / total) * 100
  const drawPct = (draws / total) * 100
  const r = 38
  const c = 2 * Math.PI * r
  const winLen = (winPct / 100) * c
  const drawLen = (drawPct / 100) * c
  const lossLen = c - winLen - drawLen
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#22c55e" strokeWidth="8"
          strokeDasharray={`${winLen} ${c - winLen}`} strokeDashoffset="0" strokeLinecap="round" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f59e0b" strokeWidth="8"
          strokeDasharray={`${drawLen} ${c - drawLen}`} strokeDashoffset={`${-winLen}`} strokeLinecap="round" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#ef4444" strokeWidth="8"
          strokeDasharray={`${lossLen} ${c - lossLen}`} strokeDashoffset={`${-(winLen + drawLen)}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-white">{Math.round(winPct)}%</span>
        <span className="text-[9px] text-slate-500">VICTÒRIES</span>
      </div>
    </div>
  )
}

/** Goal timing chart — vertical bars */
function GoalTimingChart({ buckets }: { buckets: { label: string; scored: number; conceded: number }[] }) {
  if (!buckets || buckets.length === 0) return null
  const maxVal = Math.max(...buckets.flatMap(b => [b.scored, b.conceded]), 1)
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target size={18} className="text-cyan-400" />
        <h2 className="text-lg font-bold text-white">Quan marca i encaixa el rival</h2>
      </div>
      <div className="flex items-center gap-3 mb-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500" /> Marca</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500" /> Encaixa</span>
      </div>
      <div className="flex items-end gap-1.5 h-32">
        {buckets.map((b, i) => {
          const scoredH = (b.scored / maxVal) * 100
          const concededH = (b.conceded / maxVal) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '100px' }}>
                <div className="w-[45%] bg-green-500/80 rounded-t-sm transition-all duration-500" style={{ height: `${scoredH}%`, minHeight: b.scored > 0 ? '4px' : 0 }} />
                <div className="w-[45%] bg-red-500/80 rounded-t-sm transition-all duration-500" style={{ height: `${concededH}%`, minHeight: b.conceded > 0 ? '4px' : 0 }} />
              </div>
              <span className="text-[9px] text-slate-500 mt-1">{b.label.replace("'", "'")}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Pitch comparison overlay */
function PitchCompareOverlay({ homePitch, rivalPitch, homeLabel, rivalLabel }: {
  homePitch: { length_m: number; width_m: number; field_name: string } | null
  rivalPitch: { length_m: number; width_m: number; field_name: string } | null
  homeLabel: string
  rivalLabel: string
}) {
  if (!homePitch && !rivalPitch) return null
  const maxL = Math.max(homePitch?.length_m || 0, rivalPitch?.length_m || 0, 105)
  const maxW = Math.max(homePitch?.width_m || 0, rivalPitch?.width_m || 0, 68)

  function PitchRect({ pitch, color, label }: { pitch: { length_m: number; width_m: number; field_name: string }; color: string; label: string }) {
    const wPct = (pitch.width_m / maxW) * 100
    const hPct = (pitch.length_m / maxL) * 100
    return (
      <div
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 border-2 rounded-md ${color} transition-all duration-500`}
        style={{ width: `${wPct}%`, height: `${hPct}%` }}
      >
        <div className={`absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap ${color.replace('border-', 'text-').replace('/40', '')}`}>
          {label} ({pitch.length_m}×{pitch.width_m}m)
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Ruler size={18} className="text-emerald-400" />
        <h2 className="text-lg font-bold text-white">Comparació de camps</h2>
      </div>
      <div className="flex items-center gap-3 mb-4 text-xs">
        {homePitch && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500/60 border border-green-500" /> {homeLabel}</span>}
        {rivalPitch && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-cyan-500/60 border border-cyan-500" /> {rivalLabel}</span>}
      </div>
      <div className="relative mx-auto bg-emerald-900/20 border border-emerald-700/30 rounded-lg" style={{ width: '100%', maxWidth: '340px', aspectRatio: `${maxW}/${maxL}` }}>
        {/* Field markings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border border-emerald-700/30" />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[18%] border-b border-l border-r border-emerald-700/30 rounded-b" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-[18%] border-t border-l border-r border-emerald-700/30 rounded-t" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-emerald-700/30" />
        {/* Overlay rectangles */}
        {homePitch && <PitchRect pitch={homePitch} color="border-green-500/40" label={homeLabel} />}
        {rivalPitch && <PitchRect pitch={rivalPitch} color="border-cyan-400/40" label={rivalLabel} />}
      </div>
      <div className="flex justify-center gap-6 mt-4 text-xs text-slate-500">
        {homePitch && <span>{homePitch.field_name}</span>}
        {rivalPitch && <span>{rivalPitch.field_name}</span>}
      </div>
    </div>
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

  // Determine local/visitant for proper left-right display
  const isHome = nextMatch?.isHome ?? true
  const localName = isHome ? team.name : rival?.name || ''
  const localInitial = localName.charAt(0)
  const visitantName = isHome ? rival?.name || '' : team.name
  const visitantInitial = visitantName.charAt(0)

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
            {/* ═══ NEXT MATCH HEADER ═══ */}
            <div className="glass-card rounded-2xl p-6 border-cyan-500/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-cyan-500 to-green-500" />
              <div className="flex items-center gap-2 mb-5">
                <Crosshair size={18} className="text-cyan-400" />
                <h1 className="text-xl font-black text-white">Proper Rival — J{nextMatch.jornada}</h1>
                <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-semibold ${nextMatch.isHome ? 'bg-green-500/20 text-green-400 border border-green-500/25' : 'bg-sky-500/20 text-sky-400 border border-sky-500/25'}`}>
                  {nextMatch.isHome ? 'Local' : 'Visitant'}
                </span>
              </div>
              {/* Always: local left, visitant right */}
              <div className="flex items-center justify-between gap-4">
                <div className="text-center flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/25 flex items-center justify-center text-xl font-black text-green-400 mx-auto mb-2">
                    {localInitial}
                  </div>
                  <div className="text-sm text-white font-semibold">{localName}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">LOCAL</div>
                </div>
                <div className="text-center px-6">
                  <div className="text-3xl font-black text-slate-500 mb-1">VS</div>
                  <div className="text-sm text-slate-400">{formatDate(nextMatch.date)}</div>
                  {nextMatch.time && <div className="text-sm text-cyan-400 font-bold">{nextMatch.time}h</div>}
                </div>
                <div className="text-center flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/25 flex items-center justify-center text-xl font-black text-red-400 mx-auto mb-2">
                    {visitantInitial}
                  </div>
                  <div className="text-sm text-white font-semibold">{visitantName}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">VISITANT</div>
                </div>
              </div>
            </div>

            {/* ═══ RIVAL STATS + WIN RATE DONUT ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
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
              <div className="glass-card rounded-2xl p-4 flex items-center justify-center">
                <WinRateDonut wins={rival.wins} draws={rival.draws} losses={rival.losses} />
              </div>
            </div>

            {/* ═══ PERFORMANCE BARS ═══ */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Rendiment del rival</h2>
              <div className="space-y-3">
                <ProgressBar value={rival.wins} max={rival.played} color="text-green-400" label="Victòries" showPct />
                <ProgressBar value={rival.draws} max={rival.played} color="text-amber-400" label="Empats" showPct />
                <ProgressBar value={rival.losses} max={rival.played} color="text-red-400" label="Derrotes" showPct />
                <ProgressBar value={rival.gf} max={Math.max(rival.gf, rival.ga)} color="text-cyan-400" label={`Gols a favor (${rival.gf})`} />
                <ProgressBar value={rival.ga} max={Math.max(rival.gf, rival.ga)} color="text-rose-400" label={`Gols en contra (${rival.ga})`} />
              </div>
            </div>

            {/* ═══ HOME / AWAY SPLIT ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Home size={16} className="text-green-400" />
                  <span className="font-bold text-white text-sm">Local</span>
                  {rival.home.played > 0 && (
                    <span className="ml-auto text-xs text-green-400 font-bold">
                      {Math.round((rival.home.wins / rival.home.played) * 100)}% vic.
                    </span>
                  )}
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
                <div className="text-xs text-slate-400 mt-3">Gols: {rival.home.gf}-{rival.home.ga}</div>
                {rival.home.played > 0 && (
                  <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                    <div className="bg-green-500 rounded-full" style={{ width: `${(rival.home.wins / rival.home.played) * 100}%` }} />
                    <div className="bg-amber-400 rounded-full" style={{ width: `${(rival.home.draws / rival.home.played) * 100}%` }} />
                    <div className="bg-red-500 rounded-full" style={{ width: `${(rival.home.losses / rival.home.played) * 100}%` }} />
                  </div>
                )}
              </div>
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Plane size={16} className="text-sky-400" />
                  <span className="font-bold text-white text-sm">Visitant</span>
                  {rival.away.played > 0 && (
                    <span className="ml-auto text-xs text-sky-400 font-bold">
                      {Math.round((rival.away.wins / rival.away.played) * 100)}% vic.
                    </span>
                  )}
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
                <div className="text-xs text-slate-400 mt-3">Gols: {rival.away.gf}-{rival.away.ga}</div>
                {rival.away.played > 0 && (
                  <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                    <div className="bg-green-500 rounded-full" style={{ width: `${(rival.away.wins / rival.away.played) * 100}%` }} />
                    <div className="bg-amber-400 rounded-full" style={{ width: `${(rival.away.draws / rival.away.played) * 100}%` }} />
                    <div className="bg-red-500 rounded-full" style={{ width: `${(rival.away.losses / rival.away.played) * 100}%` }} />
                  </div>
                )}
              </div>
            </div>

            {/* ═══ RECENT FORM ═══ */}
            {rival.form.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-3">Forma recent del rival</h2>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {rival.form.slice(-8).map((m, i) => <FormDot key={i} result={m.result} />)}
                </div>
                <div className="flex gap-3 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Victòria</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Empat</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Derrota</span>
                </div>
              </div>
            )}

            {/* ═══ GOAL TIMING CHART ═══ */}
            {rival.goalBuckets && rival.goalBuckets.length > 0 && (
              <GoalTimingChart buckets={rival.goalBuckets} />
            )}

            {/* ═══ INSIGHTS / PATRONS ═══ */}
            {rival.insights && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={18} className="text-purple-400" />
                  <h2 className="text-lg font-bold text-white">Patrons del Rival</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { v: rival.insights.cleanSheetRate, l: 'Porteria a 0', s: '%', color: 'text-cyan-400', bg: 'bg-cyan-500' },
                    { v: rival.insights.lateGoalRate, l: 'Gols tardans (75+)', s: '%', color: 'text-amber-400', bg: 'bg-amber-500' },
                    { v: rival.insights.scoreFirstWinRate, l: 'Guanya si marca 1r', s: '%', color: 'text-green-400', bg: 'bg-green-500' },
                    { v: rival.insights.concededFirstWinRate, l: 'Remunta si encaixa 1r', s: '%', color: 'text-red-400', bg: 'bg-red-500' },
                    { v: rival.insights.firstHalfGoals, l: 'Gols 1a part', s: '', color: 'text-violet-400', bg: 'bg-violet-500' },
                    { v: rival.insights.secondHalfGoals, l: 'Gols 2a part', s: '', color: 'text-violet-400', bg: 'bg-violet-500' },
                  ].map(item => (
                    <div key={item.l} className="bg-white/[0.03] rounded-xl p-4 text-center relative overflow-hidden">
                      {item.v !== null && item.s === '%' && (
                        <div className={`absolute bottom-0 left-0 right-0 ${item.bg}/10`} style={{ height: `${item.v}%` }} />
                      )}
                      <div className={`text-2xl font-black ${item.color} relative`}>{item.v !== null ? `${item.v}${item.s}` : '-'}</div>
                      <div className="text-[10px] text-slate-500 mt-1 relative">{item.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ PITCH COMPARISON ═══ */}
            <PitchCompareOverlay
              homePitch={report?.homePitch || null}
              rivalPitch={report?.rivalPitch || null}
              homeLabel={team.name.split(' ').slice(0, 2).join(' ')}
              rivalLabel={rival.name.split(' ').slice(0, 2).join(' ')}
            />

            {/* ═══ TOP SCORERS with bars ═══ */}
            {rival.topScorers.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={18} className="text-green-400" />
                  <h2 className="text-lg font-bold text-white">Golejadors del rival</h2>
                </div>
                <div className="space-y-2">
                  {rival.topScorers.slice(0, 8).map((p, i) => {
                    const maxGoals = rival.topScorers[0]?.goals || 1
                    return (
                      <div key={i} className="relative">
                        <div className="absolute inset-0 rounded-lg bg-green-500/8" style={{ width: `${(p.goals / maxGoals) * 100}%` }} />
                        <div className="relative flex items-center justify-between py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-5 font-bold">{i + 1}</span>
                            <span className="text-white text-sm font-medium">{p.name}</span>
                          </div>
                          <span className="text-green-400 font-black text-sm">{p.goals} ⚽</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ═══ APERCIBITS ═══ */}
            {rival.apercibits.length > 0 && (
              <div className="glass-card rounded-2xl p-6 border-amber-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={18} className="text-amber-400" />
                  <h2 className="text-lg font-bold text-white">Jugadors apercibits (4+ grogues)</h2>
                </div>
                <div className="space-y-2">
                  {rival.apercibits.map((p, i) => {
                    const maxCards = rival.apercibits[0]?.yellow_cards || 1
                    return (
                      <div key={i} className="relative">
                        <div className="absolute inset-0 rounded-lg bg-amber-500/8" style={{ width: `${(p.yellow_cards / maxCards) * 100}%` }} />
                        <div className="relative flex items-center justify-between py-2.5 px-3">
                          <span className="text-white text-sm">{p.name}</span>
                          <span className="text-amber-400 font-bold text-sm">{p.yellow_cards} 🟡</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ═══ HEAD TO HEAD (local always left) ═══ */}
            {h2h.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Historial directe</h2>
                <div className="space-y-1">
                  {h2h.map((m, i) => {
                    // Always show local score on left
                    const homeScore = m.isHome ? m.goalsFor : m.goalsAgainst
                    const awayScore = m.isHome ? m.goalsAgainst : m.goalsFor
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm py-2.5 border-b border-white/5 last:border-0">
                        <span className="text-slate-500 text-xs w-16">{formatDate(m.date)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${m.isHome ? 'bg-green-500/15 text-green-400' : 'bg-sky-500/15 text-sky-400'}`}>
                          {m.isHome ? 'L' : 'V'}
                        </span>
                        <span className="flex-1 text-white truncate">{team.name}</span>
                        {homeScore !== null && awayScore !== null ? (
                          <span className="font-bold tabular-nums flex items-center gap-1">
                            <span className={m.result === 'W' ? 'text-green-400' : m.result === 'L' ? 'text-red-400' : 'text-slate-300'}>{homeScore}</span>
                            <span className="text-slate-600">-</span>
                            <span className={m.result === 'L' ? 'text-green-400' : m.result === 'W' ? 'text-red-400' : 'text-slate-300'}>{awayScore}</span>
                          </span>
                        ) : <span className="text-slate-600">-</span>}
                        <span className="flex-1 text-white text-right truncate">{m.opponent}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          </ExportRivalPdf>
        )}
    </div>
  )
}
