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

/** Horizontal progress bar */
function ProgressBar({ value, max, textColor, barColor, label, showPct }: { value: number; max: number; textColor: string; barColor: string; label: string; showPct?: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-sm text-slate-300 font-medium">{label}</span>
        <span className={`text-sm font-black ${textColor}`}>{showPct ? `${pct}%` : value}</span>
      </div>
      <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
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

/** Pitch comparison overlay — visual filled SVG with grass stripes */
function PitchCompareOverlay({ homePitch, rivalPitch, homeLabel, rivalLabel }: {
  homePitch: { length_m: number; width_m: number; field_name: string } | null
  rivalPitch: { length_m: number; width_m: number; field_name: string } | null
  homeLabel: string
  rivalLabel: string
}) {
  const bothMissing = !homePitch && !rivalPitch

  // Horizontal layout: length → X axis, width → Y axis
  const maxL = Math.max(homePitch?.length_m ?? 1, rivalPitch?.length_m ?? 1)
  const maxW = Math.max(homePitch?.width_m ?? 1, rivalPitch?.width_m ?? 1)
  // Use a wide canvas that fills the card; aspect ratio driven by pitch proportions
  const CANVAS_W = 560
  const PAD = 8
  const scale = (CANVAS_W - PAD * 2) / maxL
  const canvasW = CANVAS_W
  const canvasH = Math.ceil(maxW * scale) + PAD * 2

  const homeArea = homePitch ? homePitch.length_m * homePitch.width_m : null
  const rivalArea = rivalPitch ? rivalPitch.length_m * rivalPitch.width_m : null

  let diffPct = 0
  let diffMsg = ''
  let diffEmoji = ''
  if (homeArea && rivalArea) {
    diffPct = Math.round(Math.abs(rivalArea - homeArea) / homeArea * 100)
    if (diffPct === 0) {
      diffMsg = 'Els dos camps tenen la mateixa mida'
      diffEmoji = '='
    } else if (rivalArea < homeArea) {
      diffMsg = `Camp rival ${diffPct}% més petit`
      diffEmoji = '↓'
    } else {
      diffMsg = `Camp rival ${diffPct}% més gran`
      diffEmoji = '↑'
    }
  }

  function fieldCategory(area: number) {
    if (area < 5500) return { label: 'Petit', color: 'text-red-400', bg: 'bg-red-500/20 border border-red-500/30' }
    if (area < 6300) return { label: 'Mitjà', color: 'text-amber-400', bg: 'bg-amber-500/20 border border-amber-500/30' }
    return { label: 'Gran', color: 'text-green-400', bg: 'bg-green-500/20 border border-green-500/30' }
  }

  const homeIsBigger = (homeArea ?? 0) >= (rivalArea ?? 0)

  // Horizontal pitch: length on X, width on Y
  function pitchSVG(lengthM: number, widthM: number, color: string, fillColor: string, fillOpacity: number, strokeW: number) {
    const pW = lengthM * scale   // pitch length → horizontal
    const pH = widthM * scale    // pitch width → vertical
    const ox = (canvasW - pW) / 2
    const oy = (canvasH - pH) / 2
    const cx = canvasW / 2
    const cy = canvasH / 2
    // Penalty areas on left/right sides
    const penD = Math.min(16.5 * scale, pW * 0.18)
    const penW = Math.min(40.32 * scale, pH * 0.95)
    const goalD = Math.min(5.5 * scale, pW * 0.06)
    const goalW = Math.min(18.32 * scale, pH * 0.6)
    const cr = Math.min(9.15 * scale, pH * 0.15)

    return (
      <g>
        <rect x={ox} y={oy} width={pW} height={pH} fill={fillColor} fillOpacity={fillOpacity} rx={3} />
        <rect x={ox} y={oy} width={pW} height={pH} fill="none" stroke={color} strokeWidth={strokeW} rx={3} />
        {/* Center line (vertical) */}
        <line x1={cx} y1={oy} x2={cx} y2={oy + pH} stroke={color} strokeWidth={strokeW * 0.6} strokeOpacity={0.6} />
        <circle cx={cx} cy={cy} r={cr} fill="none" stroke={color} strokeWidth={strokeW * 0.6} strokeOpacity={0.6} />
        <circle cx={cx} cy={cy} r={strokeW * 1.5} fill={color} fillOpacity={0.6} />
        {/* Left penalty + goal area */}
        <rect x={ox} y={cy - penW / 2} width={penD} height={penW} fill="none" stroke={color} strokeWidth={strokeW * 0.5} strokeOpacity={0.5} />
        <rect x={ox} y={cy - goalW / 2} width={goalD} height={goalW} fill="none" stroke={color} strokeWidth={strokeW * 0.4} strokeOpacity={0.4} />
        {/* Right penalty + goal area */}
        <rect x={ox + pW - penD} y={cy - penW / 2} width={penD} height={penW} fill="none" stroke={color} strokeWidth={strokeW * 0.5} strokeOpacity={0.5} />
        <rect x={ox + pW - goalD} y={cy - goalW / 2} width={goalD} height={goalW} fill="none" stroke={color} strokeWidth={strokeW * 0.4} strokeOpacity={0.4} />
      </g>
    )
  }

  // Vertical grass stripes for horizontal pitch
  const stripeW = 28
  const stripeCount = Math.ceil(canvasW / stripeW)

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Ruler size={18} className="text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Comparacio de camps</h2>
        </div>
        {diffMsg && (
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
            diffPct === 0 ? 'bg-slate-500/20 text-slate-300' :
            rivalArea! < homeArea! ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
            'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20'
          }`}>
            {diffEmoji} {diffMsg}
          </span>
        )}
      </div>

      {bothMissing ? (
        <div className="text-center py-8">
          <Ruler size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1">Dimensions dels camps no disponibles</p>
          <p className="text-xs text-slate-600">
            No disposem de les mides del camp de <span className="text-slate-400">{homeLabel}</span> ni de <span className="text-slate-400">{rivalLabel}</span>.
          </p>
          <p className="text-xs text-slate-600 mt-1">Quan estiguin disponibles, es mostrara la superposicio visual.</p>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex items-center gap-5 mb-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-md bg-green-500/40 border-2 border-green-500" />
              <span className={`font-medium ${homePitch ? 'text-slate-200' : 'text-slate-500 line-through'}`}>{homeLabel}</span>
              {!homePitch && <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">sense dades</span>}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-md bg-orange-500/40 border-2 border-orange-400" />
              <span className={`font-medium ${rivalPitch ? 'text-slate-200' : 'text-slate-500 line-through'}`}>{rivalLabel}</span>
              {!rivalPitch && <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">sense dades</span>}
            </span>
          </div>

          {/* Horizontal overlay SVG — fills full width */}
          <div className="w-full mb-5">
            <svg
              viewBox={`0 0 ${canvasW} ${canvasH}`}
              className="w-full h-auto"
              aria-label="Comparativa visual de camps superposats"
            >
              <rect width={canvasW} height={canvasH} fill="#0a1628" rx={8} />
              {/* Vertical grass stripes */}
              {Array.from({ length: stripeCount }).map((_, i) => (
                <rect key={i} x={i * stripeW * 2} y={0} width={stripeW} height={canvasH} fill="#0d2010" />
              ))}
              {/* Draw bigger pitch behind, smaller on top */}
              {homeIsBigger ? (
                <>
                  {homePitch && pitchSVG(homePitch.length_m, homePitch.width_m, '#4ade80', '#15803d', 0.7, 2)}
                  {rivalPitch && pitchSVG(rivalPitch.length_m, rivalPitch.width_m, '#fb923c', '#431407', 0.55, 2.5)}
                </>
              ) : (
                <>
                  {rivalPitch && pitchSVG(rivalPitch.length_m, rivalPitch.width_m, '#fb923c', '#431407', 0.7, 2)}
                  {homePitch && pitchSVG(homePitch.length_m, homePitch.width_m, '#4ade80', '#14532d', 0.6, 2.5)}
                </>
              )}
            </svg>
          </div>

          {/* Stats comparison cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Home pitch */}
            <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-4 text-center">
              <p className="text-[10px] text-slate-500 mb-2 font-medium uppercase tracking-wider">{homeLabel}</p>
              {homePitch ? (
                <>
                  <p className="text-lg font-black text-white tabular-nums mb-0.5">
                    {homePitch.length_m} x {homePitch.width_m} m
                  </p>
                  <p className="text-sm text-slate-400 tabular-nums">
                    {(homePitch.length_m * homePitch.width_m).toLocaleString('ca-ES')} m2
                  </p>
                  {homeArea && (
                    <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${fieldCategory(homeArea).bg} ${fieldCategory(homeArea).color}`}>
                      {fieldCategory(homeArea).label}
                    </span>
                  )}
                  {homePitch.field_name && (
                    <p className="text-[10px] text-slate-500 mt-1.5 truncate">{homePitch.field_name}</p>
                  )}
                </>
              ) : (
                <div className="py-3">
                  <p className="text-sm text-amber-400/70 font-medium mb-1">Dades no disponibles</p>
                  <p className="text-[10px] text-slate-600">Les mides del camp es mostraran quan estiguin registrades</p>
                </div>
              )}
            </div>

            {/* Rival pitch */}
            <div className="bg-orange-500/5 border border-orange-500/15 rounded-xl p-4 text-center">
              <p className="text-[10px] text-slate-500 mb-2 font-medium uppercase tracking-wider">{rivalLabel}</p>
              {rivalPitch ? (
                <>
                  <p className="text-lg font-black text-white tabular-nums mb-0.5">
                    {rivalPitch.length_m} x {rivalPitch.width_m} m
                  </p>
                  <p className="text-sm text-slate-400 tabular-nums">
                    {(rivalPitch.length_m * rivalPitch.width_m).toLocaleString('ca-ES')} m2
                  </p>
                  {rivalArea && (
                    <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${fieldCategory(rivalArea).bg} ${fieldCategory(rivalArea).color}`}>
                      {fieldCategory(rivalArea).label}
                    </span>
                  )}
                  {rivalPitch.field_name && (
                    <p className="text-[10px] text-slate-500 mt-1.5 truncate">{rivalPitch.field_name}</p>
                  )}
                </>
              ) : (
                <div className="py-3">
                  <p className="text-sm text-amber-400/70 font-medium mb-1">Dades no disponibles</p>
                  <p className="text-[10px] text-slate-600">Les mides del camp es mostraran quan estiguin registrades</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
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
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { v: rival.played, l: 'PJ', c: 'text-white' },
                { v: rival.wins, l: 'V', c: 'text-green-400' },
                { v: rival.draws, l: 'E', c: 'text-amber-400' },
                { v: rival.losses, l: 'D', c: 'text-red-400' },
                { v: rival.points, l: 'Pts', c: 'text-cyan-400' },
              ].map(s => (
                <div key={s.l} className="glass-card rounded-xl p-4 text-center flex flex-col items-center justify-center min-h-[72px]">
                  <div className={`text-2xl font-black ${s.c}`}>{s.v}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.l}</div>
                </div>
              ))}
              <div className="glass-card rounded-xl p-3 flex items-center justify-center min-h-[72px]">
                <WinRateDonut wins={rival.wins} draws={rival.draws} losses={rival.losses} size={72} />
              </div>
            </div>

            {/* ═══ PERFORMANCE BARS ═══ */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Rendiment del rival</h2>
              <div className="space-y-3">
                <ProgressBar value={rival.wins} max={rival.played} textColor="text-green-400" barColor="bg-green-500" label="Victòries" showPct />
                <ProgressBar value={rival.draws} max={rival.played} textColor="text-amber-400" barColor="bg-amber-400" label="Empats" showPct />
                <ProgressBar value={rival.losses} max={rival.played} textColor="text-red-400" barColor="bg-red-500" label="Derrotes" showPct />
                <ProgressBar value={rival.gf} max={Math.max(rival.gf, rival.ga)} textColor="text-cyan-400" barColor="bg-cyan-400" label={`Gols a favor (${rival.gf})`} />
                <ProgressBar value={rival.ga} max={Math.max(rival.gf, rival.ga)} textColor="text-rose-400" barColor="bg-rose-400" label={`Gols en contra (${rival.ga})`} />
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
                    { v: rival.home.wins, l: 'V', c: 'text-green-400' },
                    { v: rival.home.draws, l: 'E', c: 'text-amber-400' },
                    { v: rival.home.losses, l: 'D', c: 'text-red-400' },
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
                    { v: rival.away.wins, l: 'V', c: 'text-green-400' },
                    { v: rival.away.draws, l: 'E', c: 'text-amber-400' },
                    { v: rival.away.losses, l: 'D', c: 'text-red-400' },
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
                      <div className="text-[10px] text-slate-100 mt-1 relative font-medium">{item.l}</div>
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
