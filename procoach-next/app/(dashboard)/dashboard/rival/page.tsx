import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'
import { getFullTeamReportDB, hasMinutesData } from '@/lib/supabase-data'
import {
  Crosshair, Home, Plane, TrendingUp, AlertTriangle, Target,
  Ruler, Clock, Shield, Users,
} from 'lucide-react'
import TeamReportActions from '@/components/TeamReportActions'
import type { PDFReportData } from '@/components/TeamReportActions'
import FullSquadSection from '@/components/FullSquadSection'

export const dynamic = 'force-dynamic'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) {
    const months = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
    return `${parts[0]} ${months[parseInt(parts[1], 10) - 1] || parts[1]}`
  }
  return d
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n').replace(/[ç]/g, 'c').replace(/[·.]/g, '-')
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

const RESULT_LABEL: Record<string, string> = { W: 'V', D: 'E', L: 'D' }

// ─── Section Heading ──────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-accent mt-4">
      <h2 className="font-headline text-lg font-extrabold tracking-tight text-white/90 uppercase">
        {children}
      </h2>
    </div>
  )
}

// ─── Form Dots ────────────────────────────────────────────────────────────

function FormDot({ result, size = 'md' }: { result: 'W' | 'D' | 'L' | null; size?: 'sm' | 'md' }) {
  const cls =
    result === 'W' ? 'bg-green-500 text-white' :
    result === 'D' ? 'bg-amber-400 text-white' :
    result === 'L' ? 'bg-red-500 text-white' : 'bg-white/10 text-slate-500'
  const sz = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-xs'
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-black ${cls} ${sz}`}>
      {result ? RESULT_LABEL[result] : '?'}
    </span>
  )
}

// ─── Win Rate Donut ───────────────────────────────────────────────────────

function WinRateDonut({ wins, draws, losses, size = 100 }: { wins: number; draws: number; losses: number; size?: number }) {
  const total = wins + draws + losses
  if (total === 0) return null
  const winPct = (wins / total) * 100
  const drawPct = (draws / total) * 100
  const r = 38, c = 2 * Math.PI * r
  const winLen = (winPct / 100) * c
  const drawLen = (drawPct / 100) * c
  const lossLen = c - winLen - drawLen
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="7" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#22c55e" strokeWidth="7"
          strokeDasharray={`${winLen} ${c - winLen}`} strokeDashoffset="0" strokeLinecap="round" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f59e0b" strokeWidth="7"
          strokeDasharray={`${drawLen} ${c - drawLen}`} strokeDashoffset={`${-winLen}`} strokeLinecap="round" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#ef4444" strokeWidth="7"
          strokeDasharray={`${lossLen} ${c - lossLen}`} strokeDashoffset={`${-(winLen + drawLen)}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-score text-3xl text-white">{Math.round(winPct)}%</span>
        <span className="text-[8px] text-slate-500 font-semibold tracking-widest uppercase">Vic.</span>
      </div>
    </div>
  )
}

// ─── Goal Timing Chart ────────────────────────────────────────────────────

function GoalTimingChart({ buckets }: { buckets: { label: string; scored: number; conceded: number }[] }) {
  if (!buckets || buckets.length === 0) return null
  const maxVal = Math.max(...buckets.flatMap(b => [b.scored, b.conceded]), 1)
  return (
    <div className="card-spotlight rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Clock size={16} className="text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Gols per minut</h3>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-semibold">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> Marca</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Encaixa</span>
        </div>
      </div>
      <div className="flex items-end gap-2 h-32">
        {buckets.map((b, i) => {
          const scoredH = (b.scored / maxVal) * 100
          const concededH = (b.conceded / maxVal) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1 items-end justify-center" style={{ height: '100px' }}>
                <div className="w-[40%] bg-green-500/80 rounded-t transition-all duration-500" style={{ height: `${scoredH}%`, minHeight: b.scored > 0 ? '4px' : 0 }} />
                <div className="w-[40%] bg-red-500/80 rounded-t transition-all duration-500" style={{ height: `${concededH}%`, minHeight: b.conceded > 0 ? '4px' : 0 }} />
              </div>
              <span className="text-[9px] text-slate-500 font-medium">{b.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Crossed Goal Probability ─────────────────────────────────────────────

function GoalProbabilityChart({
  teamBuckets, rivalBuckets, teamName, rivalName,
}: {
  teamBuckets: { label: string; scored: number; conceded: number }[]
  rivalBuckets: { label: string; scored: number; conceded: number }[]
  teamName: string; rivalName: string
}) {
  if (!teamBuckets?.length || !rivalBuckets?.length) return null
  const teamTotalScored = teamBuckets.reduce((s, b) => s + b.scored, 0)
  const teamTotalConceded = teamBuckets.reduce((s, b) => s + b.conceded, 0)
  const rivalTotalScored = rivalBuckets.reduce((s, b) => s + b.scored, 0)
  const rivalTotalConceded = rivalBuckets.reduce((s, b) => s + b.conceded, 0)
  if (teamTotalScored === 0 && rivalTotalScored === 0) return null

  const crossed = teamBuckets.map((tb, i) => {
    const rb = rivalBuckets[i] || { scored: 0, conceded: 0 }
    const pWeScore = teamTotalScored > 0 ? tb.scored / teamTotalScored : 0
    const pTheyConcede = rivalTotalConceded > 0 ? rb.conceded / rivalTotalConceded : 0
    const pTheyScore = rivalTotalScored > 0 ? rb.scored / rivalTotalScored : 0
    const pWeConcede = teamTotalConceded > 0 ? tb.conceded / teamTotalConceded : 0
    return { label: tb.label, scoreRaw: pWeScore * pTheyConcede, concedeRaw: pTheyScore * pWeConcede }
  })

  const totalScore = crossed.reduce((s, c) => s + c.scoreRaw, 0)
  const totalConcede = crossed.reduce((s, c) => s + c.concedeRaw, 0)
  const segments = crossed.map(c => ({
    label: c.label,
    scorePct: totalScore > 0 ? Math.round((c.scoreRaw / totalScore) * 100) : 0,
    concedePct: totalConcede > 0 ? Math.round((c.concedeRaw / totalConcede) * 100) : 0,
  }))
  const maxPct = Math.max(...segments.flatMap(s => [s.scorePct, s.concedePct]), 1)
  const peakScore = segments.reduce((best, s) => s.scorePct > best.scorePct ? s : best, segments[0])
  const peakConcede = segments.reduce((best, s) => s.concedePct > best.concedePct ? s : best, segments[0])

  return (
    <div className="card-spotlight rounded-2xl p-6">
      <div className="flex items-center gap-2.5 mb-2">
        <Target size={16} className="text-cyan-400" />
        <h3 className="text-sm font-bold text-white">Probabilitat creuada de gol</h3>
      </div>
      <p className="text-[11px] text-slate-500 mb-5 leading-relaxed">
        Creua quan el teu equip marca/encaixa amb quan el rival marca/encaixa
      </p>
      <div className="flex items-center gap-4 mb-4 text-[10px] font-semibold">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Oportunitat de marcar</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Risc d&apos;encaixar</span>
      </div>
      <div className="flex items-end gap-2 h-36">
        {segments.map((s, i) => {
          const scoreH = (s.scorePct / maxPct) * 100
          const concedeH = (s.concedePct / maxPct) * 100
          const isTopScore = s === peakScore && s.scorePct > 0
          const isTopConcede = s === peakConcede && s.concedePct > 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1 items-end justify-center" style={{ height: '120px' }}>
                <div
                  className={`w-[40%] rounded-t transition-all duration-500 ${isTopScore ? 'bg-emerald-400 ring-1 ring-emerald-400/40' : 'bg-emerald-500/70'}`}
                  style={{ height: `${scoreH}%`, minHeight: s.scorePct > 0 ? '4px' : 0 }}
                />
                <div
                  className={`w-[40%] rounded-t transition-all duration-500 ${isTopConcede ? 'bg-rose-400 ring-1 ring-rose-400/40' : 'bg-rose-500/70'}`}
                  style={{ height: `${concedeH}%`, minHeight: s.concedePct > 0 ? '4px' : 0 }}
                />
              </div>
              <span className="text-[9px] text-slate-500 font-medium">{s.label}</span>
              <div className="flex gap-1.5 text-[10px] tabular-nums">
                <span className="text-emerald-400 font-bold">{s.scorePct}%</span>
                <span className="text-rose-400 font-bold">{s.concedePct}%</span>
              </div>
            </div>
          )
        })}
      </div>
      {/* Insights */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {peakScore.scorePct > 0 && (
          <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-4">
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Millor moment per marcar</div>
            <div className="text-white text-lg font-headline font-extrabold">{peakScore.label}</div>
            <div className="text-[10px] text-slate-400 mt-1">{peakScore.scorePct}% de probabilitat creuada</div>
          </div>
        )}
        {peakConcede.concedePct > 0 && (
          <div className="bg-rose-500/8 border border-rose-500/15 rounded-xl p-4">
            <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider mb-1">Minut de major perill</div>
            <div className="text-white text-lg font-headline font-extrabold">{peakConcede.label}</div>
            <div className="text-[10px] text-slate-400 mt-1">{peakConcede.concedePct}% de probabilitat creuada</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Pitch Compare Overlay ────────────────────────────────────────────────

function PitchCompareOverlay({ homePitch, rivalPitch, homeLabel, rivalLabel }: {
  homePitch: { length_m: number; width_m: number; field_name: string } | null
  rivalPitch: { length_m: number; width_m: number; field_name: string } | null
  homeLabel: string; rivalLabel: string
}) {
  const bothMissing = !homePitch && !rivalPitch
  const maxL = Math.max(homePitch?.length_m ?? 1, rivalPitch?.length_m ?? 1)
  const maxW = Math.max(homePitch?.width_m ?? 1, rivalPitch?.width_m ?? 1)
  const CANVAS_W = 560, PAD = 8
  const scale = (CANVAS_W - PAD * 2) / maxL
  const canvasW = CANVAS_W
  const canvasH = Math.ceil(maxW * scale) + PAD * 2
  const homeArea = homePitch ? homePitch.length_m * homePitch.width_m : null
  const rivalArea = rivalPitch ? rivalPitch.length_m * rivalPitch.width_m : null
  const homeIsBigger = (homeArea ?? 0) >= (rivalArea ?? 0)

  let diffMsg = ''
  if (homeArea && rivalArea) {
    const diffPct = Math.round(Math.abs(rivalArea - homeArea) / homeArea * 100)
    if (diffPct === 0) diffMsg = 'Mateixa mida'
    else if (rivalArea < homeArea) diffMsg = `Camp rival ${diffPct}% mes petit`
    else diffMsg = `Camp rival ${diffPct}% mes gran`
  }

  function fieldCategory(area: number) {
    if (area < 5500) return { label: 'Petit', color: 'text-red-400', bg: 'bg-red-500/15 border border-red-500/20' }
    if (area < 6300) return { label: 'Mitja', color: 'text-amber-400', bg: 'bg-amber-500/15 border border-amber-500/20' }
    return { label: 'Gran', color: 'text-green-400', bg: 'bg-green-500/15 border border-green-500/20' }
  }

  function pitchSVG(lengthM: number, widthM: number, color: string, fillColor: string, fillOpacity: number, strokeW: number) {
    const pW = lengthM * scale, pH = widthM * scale
    const ox = (canvasW - pW) / 2, oy = (canvasH - pH) / 2
    const cx = canvasW / 2, cy = canvasH / 2
    const penD = Math.min(16.5 * scale, pW * 0.18), penW = Math.min(40.32 * scale, pH * 0.95)
    const goalD = Math.min(5.5 * scale, pW * 0.06), goalW = Math.min(18.32 * scale, pH * 0.6)
    const cr = Math.min(9.15 * scale, pH * 0.15)
    return (
      <g>
        <rect x={ox} y={oy} width={pW} height={pH} fill={fillColor} fillOpacity={fillOpacity} rx={3} />
        <rect x={ox} y={oy} width={pW} height={pH} fill="none" stroke={color} strokeWidth={strokeW} rx={3} />
        <line x1={cx} y1={oy} x2={cx} y2={oy + pH} stroke={color} strokeWidth={strokeW * 0.6} strokeOpacity={0.6} />
        <circle cx={cx} cy={cy} r={cr} fill="none" stroke={color} strokeWidth={strokeW * 0.6} strokeOpacity={0.6} />
        <circle cx={cx} cy={cy} r={strokeW * 1.5} fill={color} fillOpacity={0.6} />
        <rect x={ox} y={cy - penW / 2} width={penD} height={penW} fill="none" stroke={color} strokeWidth={strokeW * 0.5} strokeOpacity={0.5} />
        <rect x={ox} y={cy - goalW / 2} width={goalD} height={goalW} fill="none" stroke={color} strokeWidth={strokeW * 0.4} strokeOpacity={0.4} />
        <rect x={ox + pW - penD} y={cy - penW / 2} width={penD} height={penW} fill="none" stroke={color} strokeWidth={strokeW * 0.5} strokeOpacity={0.5} />
        <rect x={ox + pW - goalD} y={cy - goalW / 2} width={goalD} height={goalW} fill="none" stroke={color} strokeWidth={strokeW * 0.4} strokeOpacity={0.4} />
      </g>
    )
  }

  const stripeW = 28, stripeCount = Math.ceil(canvasW / stripeW)

  return (
    <div className="card-spotlight rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <Ruler size={16} className="text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Comparativa de camps</h3>
        </div>
        {diffMsg && (
          <span className="text-[11px] font-semibold text-slate-400 bg-white/5 px-3 py-1 rounded-full">{diffMsg}</span>
        )}
      </div>
      {bothMissing ? (
        <div className="text-center py-8">
          <Ruler size={28} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Dimensions no disponibles</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-5 mb-4 text-[11px] font-medium">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-green-500/40 border-2 border-green-500" />
              <span className="text-slate-300">{homeLabel}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-orange-500/40 border-2 border-orange-400" />
              <span className="text-slate-300">{rivalLabel}</span>
            </span>
          </div>
          <div className="w-full mb-5">
            <svg viewBox={`0 0 ${canvasW} ${canvasH}`} className="w-full h-auto">
              <rect width={canvasW} height={canvasH} fill="#0a1628" rx={8} />
              {Array.from({ length: stripeCount }).map((_, i) => (
                <rect key={i} x={i * stripeW * 2} y={0} width={stripeW} height={canvasH} fill="#0d2010" />
              ))}
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
          <div className="grid grid-cols-2 gap-4">
            {[
              { pitch: homePitch, area: homeArea, label: homeLabel, border: 'border-green-500/15', bg: 'bg-green-500/5' },
              { pitch: rivalPitch, area: rivalArea, label: rivalLabel, border: 'border-orange-500/15', bg: 'bg-orange-500/5' },
            ].map(({ pitch, area, label, border, bg }) => (
              <div key={label} className={`${bg} ${border} border rounded-xl p-4 text-center`}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">{label}</p>
                {pitch ? (
                  <>
                    <p className="text-lg font-black text-white tabular-nums">{pitch.length_m} x {pitch.width_m} m</p>
                    <p className="text-sm text-slate-400 tabular-nums">{(pitch.length_m * pitch.width_m).toLocaleString('ca-ES')} m2</p>
                    {area && (
                      <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${fieldCategory(area).bg} ${fieldCategory(area).color}`}>
                        {fieldCategory(area).label}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-amber-400/60 py-3">No disponible</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

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
  const hasMinutes = hasMinutesData(report?.competition ?? '', rival?.players || [])

  const formStandings = report?.formStandings || []
  const isHome = nextMatch?.isHome ?? true
  const localName = isHome ? team.name : rival?.name || ''
  const localInitial = localName.charAt(0)
  const visitantName = isHome ? rival?.name || '' : team.name
  const visitantInitial = visitantName.charAt(0)

  // Form (racha) positions
  const myFormPos = formStandings.find(f => f.slug === team.slug)?.position ?? null
  const rivalFormPos = rival ? (formStandings.find(f => f.slug === rival.slug)?.position ?? null) : null

  // Build PDFReportData
  const pdfReportData: PDFReportData | null = (report && rival && nextMatch) ? {
    name: report.name, competition: report.competition,
    position: report.position,
    played: report.played, wins: report.wins, draws: report.draws, losses: report.losses, gf: report.gf, ga: report.ga, points: report.points,
    home: report.home, away: report.away,
    form: report.form.map(f => ({ date: f.date, jornada: f.jornada, opponent: f.opponent, isHome: f.isHome, goalsFor: f.goalsFor, goalsAgainst: f.goalsAgainst, result: f.result, referee: f.referee })),
    rival: {
      name: rival.name,
      played: rival.played, wins: rival.wins, draws: rival.draws, losses: rival.losses, gf: rival.gf, ga: rival.ga, points: rival.points,
      position: rival.position, home: rival.home, away: rival.away,
      form: rival.form.map(f => ({ date: f.date, jornada: f.jornada, opponent: f.opponent, isHome: f.isHome, goalsFor: f.goalsFor, goalsAgainst: f.goalsAgainst, result: f.result, referee: f.referee })),
      topScorers: rival.topScorers, apercibits: rival.apercibits,
      mostMinutes: rival.mostMinutes, goalBuckets: rival.goalBuckets,
      insights: rival.insights,
    },
    headToHead: h2h.map(h => ({ date: h.date, jornada: h.jornada, opponent: h.opponent, isHome: h.isHome, goalsFor: h.goalsFor, goalsAgainst: h.goalsAgainst, result: h.result, referee: h.referee })),
    nextMatch: { opponent: nextMatch.opponent, date: nextMatch.date, jornada: nextMatch.jornada, isHome: nextMatch.isHome, time: nextMatch.time, referee: nextMatch.referee },
    homePitch: report.homePitch ? { length_m: report.homePitch.length_m, width_m: report.homePitch.width_m, field_name: report.homePitch.field_name } : null,
    rivalPitch: report.rivalPitch ? { length_m: report.rivalPitch.length_m, width_m: report.rivalPitch.width_m, field_name: report.rivalPitch.field_name } : null,
    formPosition: myFormPos,
    rivalFormPosition: rivalFormPos,
  } : null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
      {!nextMatch || !rival ? (
        <div className="card-spotlight rounded-3xl p-16 text-center">
          <Crosshair size={36} className="text-slate-600 mx-auto mb-5" />
          <h2 className="font-headline text-2xl font-extrabold text-white mb-3">No hi ha proper rival programat</h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">Quan es publiqui el proper partit, apareixera aqui l&apos;analisi completa del rival.</p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* ═══════════════════════════════════════════════════════════
              BLOQUE A — EL PARTIDO (Hero Banner)
          ═══════════════════════════════════════════════════════════ */}
          <div className="stat-card rounded-3xl overflow-hidden relative">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0f172a] to-[#0d1f2d]" />
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(34,197,94,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(6,182,212,0.2) 0%, transparent 50%)' }} />

            <div className="relative p-6 sm:p-8">
              {/* Top row: badge + export buttons */}
              <div className="flex items-center justify-between gap-2 mb-5 sm:mb-8">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Crosshair size={14} className="text-cyan-400 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hidden xs:inline">Informe Pre-Partit</span>
                  <span className="text-[10px] font-bold text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded-full shrink-0">J{nextMatch.jornada}</span>
                </div>
                {pdfReportData && (
                  <TeamReportActions
                    teamName={team.name}
                    teamSlug={team.slug}
                    competition={report!.competition}
                    reportData={pdfReportData}
                  />
                )}
              </div>

              {/* Match: Local vs Visitant */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-8">
                {/* Local */}
                <div className="text-center">
                  <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-green-500/15 to-emerald-500/5 border border-green-500/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <span className="font-headline text-xl xs:text-2xl sm:text-3xl font-extrabold text-green-400">{localInitial}</span>
                  </div>
                  <p className="text-xs xs:text-sm sm:text-base font-bold text-white mb-1 leading-tight">{localName}</p>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="font-score text-2xl text-slate-300">#{isHome ? (report?.position || '-') : (rival.position || '-')}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{isHome ? report?.points : rival.points} pts</span>
                  </div>
                  {(isHome ? myFormPos : rivalFormPos) && (
                    <div className="text-[10px] text-orange-400/80 font-semibold mt-0.5">
                      Racha #{isHome ? myFormPos : rivalFormPos}
                    </div>
                  )}
                  <div className="flex gap-1 justify-center mt-2">
                    {(isHome ? report?.form : rival.form)?.slice(0, 5).reverse().map((f, i) => (
                      <FormDot key={i} result={f.result} size="sm" />
                    ))}
                  </div>
                  <div className="text-[9px] text-green-400/60 font-semibold uppercase tracking-wider mt-1 sm:mt-2">Local</div>
                </div>

                {/* Center — VS + match info */}
                <div className="text-center px-1 sm:px-6">
                  <div className={`inline-block px-2 xs:px-3 py-0.5 xs:py-1 rounded-full text-[9px] xs:text-[10px] font-bold mb-2 sm:mb-4 ${isHome ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'}`}>
                    {nextMatch.isHome ? 'A casa' : 'Fora'}
                  </div>
                  <div className="font-headline text-3xl xs:text-4xl sm:text-5xl font-extrabold text-slate-500/60 mb-1 sm:mb-2">VS</div>
                  <div className="space-y-1">
                    <p className="text-sm text-white font-semibold">{formatDate(nextMatch.date)}</p>
                    {nextMatch.time && <p className="font-score text-xl text-cyan-400">{nextMatch.time}h</p>}
                    {nextMatch.referee && (
                      <p className="hidden xs:block text-[10px] text-slate-500 mt-2">
                        <Shield size={10} className="inline mr-1 -mt-0.5 text-slate-600" />
                        {nextMatch.referee}
                      </p>
                    )}
                  </div>
                </div>

                {/* Visitant */}
                <div className="text-center">
                  <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-red-500/15 to-orange-500/5 border border-red-500/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <span className="font-headline text-xl xs:text-2xl sm:text-3xl font-extrabold text-red-400">{visitantInitial}</span>
                  </div>
                  <p className="text-xs xs:text-sm sm:text-base font-bold text-white mb-1 leading-tight">{visitantName}</p>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="font-score text-2xl text-slate-300">#{isHome ? (rival.position || '-') : (report?.position || '-')}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{isHome ? rival.points : report?.points} pts</span>
                  </div>
                  {(isHome ? rivalFormPos : myFormPos) && (
                    <div className="text-[10px] text-orange-400/80 font-semibold mt-0.5">
                      Racha #{isHome ? rivalFormPos : myFormPos}
                    </div>
                  )}
                  <div className="flex gap-1 justify-center mt-2">
                    {(isHome ? rival.form : report?.form)?.slice(0, 5).reverse().map((f, i) => (
                      <FormDot key={i} result={f.result} size="sm" />
                    ))}
                  </div>
                  <div className="text-[9px] text-red-400/60 font-semibold uppercase tracking-wider mt-1 sm:mt-2">Visitant</div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              BLOQUE B — RADIOGRAFIA DEL RIVAL
          ═══════════════════════════════════════════════════════════ */}
          <SectionHeading>Radiografia del Rival</SectionHeading>

          {/* Radiografia group — tighter spacing within */}
          <div className="space-y-4">
            {/* Stats band */}
            <div className="overflow-x-auto scrollbar-hide py-1 -my-1">
              <div className="stats-band flex min-w-[480px]">
                {[
                  { v: rival.played, l: 'PJ', c: 'text-white' },
                  { v: rival.wins, l: 'V', c: 'text-green-400' },
                  { v: rival.draws, l: 'E', c: 'text-amber-400' },
                  { v: rival.losses, l: 'D', c: 'text-red-400' },
                  { v: `${rival.gf}-${rival.ga}`, l: 'GF-GC', c: 'text-slate-200' },
                  { v: rival.points, l: 'Pts', c: 'text-cyan-400' },
                ].flatMap((s, i, arr) => [
                  <div key={s.l} className="stats-band-item">
                    <div className={`font-score text-2xl sm:text-3xl whitespace-nowrap ${s.c}`}>{s.v}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mt-1">{s.l}</div>
                  </div>,
                  ...(i < arr.length - 1 ? [<div key={`d-${i}`} className="stats-band-divider" />] : []),
                ])}
                <div className="stats-band-divider" />
                <div className="stats-band-item flex items-center justify-center overflow-visible">
                  <WinRateDonut wins={rival.wins} draws={rival.draws} losses={rival.losses} size={80} />
                </div>
              </div>
            </div>

            {/* Home / Away split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Local', data: rival.home, icon: <Home size={14} className="text-green-400" />, accentColor: 'text-green-400', bgAccent: 'from-green-500/8 to-transparent' },
                { label: 'Visitant', data: rival.away, icon: <Plane size={14} className="text-sky-400" />, accentColor: 'text-sky-400', bgAccent: 'from-sky-500/8 to-transparent' },
              ].map(({ label, data, icon, accentColor, bgAccent }) => (
                <div key={label} className={`card-elevated rounded-2xl p-5 bg-gradient-to-br ${bgAccent}`}>
                  <div className="flex items-center gap-2 mb-4">
                    {icon}
                    <span className="font-bold text-white text-sm">{label}</span>
                    {data.played > 0 && (
                      <span className={`ml-auto text-xs ${accentColor} font-bold`}>
                        {Math.round((data.wins / data.played) * 100)}% vic.
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center mb-4">
                    {[
                      { v: data.played, l: 'PJ', c: 'text-white' },
                      { v: data.wins, l: 'V', c: 'text-green-400' },
                      { v: data.draws, l: 'E', c: 'text-amber-400' },
                      { v: data.losses, l: 'D', c: 'text-red-400' },
                    ].map(s => (
                      <div key={s.l}>
                        <div className={`font-score text-xl ${s.c}`}>{s.v}</div>
                        <div className="text-[9px] text-slate-500 font-medium">{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Gols: {data.gf}-{data.ga}</span>
                    <span className="text-slate-500">{data.points} pts</span>
                  </div>
                  {data.played > 0 && (
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                      <div className="bg-green-500 rounded-full" style={{ width: `${(data.wins / data.played) * 100}%` }} />
                      <div className="bg-amber-400 rounded-full" style={{ width: `${(data.draws / data.played) * 100}%` }} />
                      <div className="bg-red-500 rounded-full" style={{ width: `${(data.losses / data.played) * 100}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Recent form */}
            {rival.form.length > 0 && (
              <div className="card-elevated rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-3">Forma recent</h3>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {rival.form.slice(-8).map((m, i) => <FormDot key={i} result={m.result} />)}
                </div>
                <div className="flex gap-3 text-[10px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Victòria</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Empat</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Derrota</span>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              BLOQUE C — COM JUGA
          ═══════════════════════════════════════════════════════════ */}
          <SectionHeading>Com Juga</SectionHeading>

          {/* Insights / Patrons */}
          {rival.insights && (
            <div className="card-spotlight rounded-2xl p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <TrendingUp size={16} className="text-purple-400" />
                <h3 className="text-sm font-bold text-white">Patrons del Rival</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { v: rival.insights.cleanSheetRate, l: 'Porteria a 0', s: '%', color: 'text-cyan-400', barBg: 'bg-cyan-500' },
                  { v: rival.insights.lateGoalRate, l: 'Gols tardans (75+)', s: '%', color: 'text-amber-400', barBg: 'bg-amber-500' },
                  { v: rival.insights.scoreFirstWinRate, l: 'Guanya si marca 1r', s: '%', color: 'text-green-400', barBg: 'bg-green-500' },
                  { v: rival.insights.concededFirstWinRate, l: 'Remunta si encaixa 1r', s: '%', color: 'text-red-400', barBg: 'bg-red-500' },
                  { v: rival.insights.firstHalfGoals, l: 'Gols 1a part', s: '', color: 'text-violet-400', barBg: 'bg-violet-500' },
                  { v: rival.insights.secondHalfGoals, l: 'Gols 2a part', s: '', color: 'text-violet-400', barBg: 'bg-violet-500' },
                ].map(item => (
                  <div key={item.l} className="bg-white/[0.03] rounded-xl p-4 text-center relative overflow-hidden">
                    {item.v !== null && item.s === '%' && (
                      <div className={`absolute bottom-0 left-0 right-0 ${item.barBg}/8`} style={{ height: `${item.v}%` }} />
                    )}
                    <div className={`font-score text-3xl ${item.color} relative`}>{item.v !== null ? `${item.v}${item.s}` : '-'}</div>
                    <div className="text-[10px] text-slate-300 mt-1 relative font-medium leading-tight">{item.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goal timing + Crossed probability */}
          {rival.goalBuckets && rival.goalBuckets.length > 0 && (
            <GoalTimingChart buckets={rival.goalBuckets} />
          )}

          <GoalProbabilityChart
            teamBuckets={report!.goalBuckets}
            rivalBuckets={rival.goalBuckets}
            teamName={team.name}
            rivalName={rival.name}
          />

          {/* Penalty comparison */}
          {(report!.penaltyStats || rival.penaltyStats) && (
            <div className="card-spotlight rounded-2xl p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <Target size={16} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Penals</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: team.name, stats: report!.penaltyStats },
                  { label: rival.name, stats: rival.penaltyStats },
                ].map(({ label, stats }) => (
                  <div key={label} className="bg-white/[0.03] rounded-xl p-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-3 truncate">{label}</p>
                    {stats ? (
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <div className="font-score text-2xl text-green-400">{stats.penalties_scored}</div>
                          <div className="text-[9px] text-slate-500">A favor</div>
                        </div>
                        <div>
                          <div className="font-score text-2xl text-red-400">{stats.penalties_conceded}</div>
                          <div className="text-[9px] text-slate-500">En contra</div>
                        </div>
                        <div>
                          <div className="font-score text-xl text-cyan-400">{stats.penalties_per_match}</div>
                          <div className="text-[9px] text-slate-500">Per partit</div>
                        </div>
                        <div>
                          <div className="font-score text-xl text-slate-300">{stats.matches_with_penalty_pct}%</div>
                          <div className="text-[9px] text-slate-500">Partits amb penal</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 text-center py-4">Sense dades</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              BLOQUE D — QUI JUGA
          ═══════════════════════════════════════════════════════════ */}
          <SectionHeading>Qui Juga</SectionHeading>

          {/* Titulars Habituals — top 11 */}
          {rival.mostMinutes.length > 0 && (
            <div className="card-spotlight rounded-2xl overflow-hidden">
              <div className="p-6 pb-0">
                <div className="flex items-center gap-2.5 mb-5">
                  <Users size={16} className="text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Titulars Habituals</h3>
                  <span className="text-[10px] text-slate-500 ml-auto font-medium">Top {Math.min(rival.mostMinutes.length, 11)}</span>
                </div>
              </div>
              <div className="px-6 pb-6">
                {/* Header */}
                <div className="grid grid-cols-[20px_1fr_40px_40px_44px] sm:grid-cols-[24px_1fr_48px_48px_48px_56px] gap-2 text-[9px] text-slate-500 uppercase tracking-wider font-semibold pb-2 border-b border-white/5">
                  <span></span>
                  <span>Nom</span>
                  <span className="text-center">PJ</span>
                  <span className="hidden sm:block text-center">Tit.</span>
                  <span className="text-center">Gols</span>
                  <span className="text-right">{hasMinutes ? 'Min.' : 'Tit.'}</span>
                </div>
                {rival.mostMinutes.slice(0, 11).map((p, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[20px_1fr_40px_40px_44px] sm:grid-cols-[24px_1fr_48px_48px_48px_56px] gap-2 items-center py-2.5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                  >
                    <span className="text-[10px] text-slate-600 font-bold text-center">{i + 1}</span>
                    <Link href={`/jugador/${slugify(p.name)}`} className="text-sm text-slate-200 hover:text-white truncate transition-colors font-medium">
                      {p.name}
                    </Link>
                    <span className="text-center font-score text-lg text-white">{p.appearances}</span>
                    <span className="hidden sm:block text-center font-score text-lg text-slate-400">{p.starts ?? p.appearances}</span>
                    <span className={`text-center font-score text-lg ${p.goals > 0 ? 'text-green-400' : 'text-slate-600'}`}>{p.goals}</span>
                    <span className="text-right font-score text-lg text-cyan-400/80">
                      {hasMinutes ? `${p.minutes_played}'` : (p.starts ?? p.appearances)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top scorers */}
          {rival.topScorers.length > 0 && (
            <div className="card-elevated rounded-2xl p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <Target size={16} className="text-green-400" />
                <h3 className="text-sm font-bold text-white">Golejadors del rival</h3>
              </div>
              <div className="space-y-1.5">
                {rival.topScorers.slice(0, 8).map((p, i) => {
                  const maxGoals = rival.topScorers[0]?.goals || 1
                  return (
                    <div key={i} className="relative group">
                      <div className="absolute inset-0 rounded-lg bg-green-500/6 transition-all" style={{ width: `${(p.goals / maxGoals) * 100}%` }} />
                      <div className="relative flex items-center justify-between py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-500 w-4 font-bold tabular-nums">{i + 1}</span>
                          <Link href={`/jugador/${slugify(p.name)}`} className="text-white text-sm font-medium hover:text-green-400 transition-colors">{p.name}</Link>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-500">{p.appearances} PJ</span>
                          <span className="font-score text-xl text-green-400">{p.goals}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Apercibits */}
          {rival.apercibits.length > 0 && (
            <div className="card-elevated rounded-2xl p-6 border-amber-500/15">
              <div className="flex items-center gap-2.5 mb-5">
                <AlertTriangle size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white">Jugadors apercibits</h3>
                <span className="text-[10px] text-amber-400/60 ml-auto font-medium">4+ grogues</span>
              </div>
              <div className="space-y-1.5">
                {rival.apercibits.map((p, i) => {
                  const maxCards = rival.apercibits[0]?.yellow_cards || 1
                  return (
                    <div key={i} className="relative">
                      <div className="absolute inset-0 rounded-lg bg-amber-500/6" style={{ width: `${(p.yellow_cards / maxCards) * 100}%` }} />
                      <div className="relative flex items-center justify-between py-3 px-4">
                        <span className="text-white text-sm font-medium">{p.name}</span>
                        <span className="font-score text-xl text-amber-400">{p.yellow_cards}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full squad (collapsible) */}
          <FullSquadSection players={rival.mostMinutes} hasMinutes={hasMinutes} />

          {/* ═══════════════════════════════════════════════════════════
              BLOQUE E — EL TERRENY
          ═══════════════════════════════════════════════════════════ */}
          <SectionHeading>El Terreny</SectionHeading>

          <PitchCompareOverlay
            homePitch={report?.homePitch || null}
            rivalPitch={report?.rivalPitch || null}
            homeLabel={team.name.split(' ').slice(0, 2).join(' ')}
            rivalLabel={rival.name.split(' ').slice(0, 2).join(' ')}
          />

          {/* Field size record */}
          {(() => {
            const matchPitch = nextMatch.isHome ? report?.homePitch : report?.rivalPitch
            if (!matchPitch) return null
            const area = matchPitch.length_m * matchPitch.width_m
            const cat = area < 5500 ? 'petit' : area < 6300 ? 'mitja' : 'gran'
            const sizeLabel = area < 5500 ? 'petit' : area < 6300 ? 'mitja' : 'gran'
            const sizeColor = area < 5500 ? 'text-red-400' : area < 6300 ? 'text-amber-400' : 'text-green-400'
            const sizeBg = area < 5500 ? 'bg-red-500/8 border-red-500/15' : area < 6300 ? 'bg-amber-500/8 border-amber-500/15' : 'bg-green-500/8 border-green-500/15'
            const record = report?.fieldSizeRecord?.[cat]
            return (
              <div className={`border rounded-2xl p-6 ${sizeBg}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Ruler size={14} className={sizeColor} />
                  <span className="text-sm font-bold text-white">
                    Jugues en camp <span className={sizeColor}>{sizeLabel}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 ml-auto">
                    {matchPitch.length_m}x{matchPitch.width_m}m
                  </span>
                </div>
                {record && record.played > 0 ? (
                  <div>
                    <p className="text-xs text-slate-400 mb-4">
                      El teu equip ha jugat <span className="text-white font-semibold">{record.played} partits</span> en camps d&apos;aquesta mida:
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center mb-4">
                      {[
                        { v: record.played, l: 'PJ', c: 'text-white' },
                        { v: record.wins, l: 'V', c: 'text-green-400' },
                        { v: record.draws, l: 'E', c: 'text-amber-400' },
                        { v: record.losses, l: 'D', c: 'text-red-400' },
                        { v: record.gf, l: 'GF', c: 'text-cyan-400' },
                        { v: record.ga, l: 'GC', c: 'text-rose-400' },
                      ].map(s => (
                        <div key={s.l} className="bg-white/5 rounded-lg py-2.5">
                          <div className={`font-score text-xl ${s.c}`}>{s.v}</div>
                          <div className="text-[9px] text-slate-500 font-medium">{s.l}</div>
                        </div>
                      ))}
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                      <div className="bg-green-500 rounded-full" style={{ width: `${(record.wins / record.played) * 100}%` }} />
                      <div className="bg-amber-400 rounded-full" style={{ width: `${(record.draws / record.played) * 100}%` }} />
                      <div className="bg-red-500 rounded-full" style={{ width: `${(record.losses / record.played) * 100}%` }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Sense prou partits en camps d&apos;aquesta mida.</p>
                )}
              </div>
            )
          })()}

          {/* ═══════════════════════════════════════════════════════════
              BLOQUE F — HISTORIAL
          ═══════════════════════════════════════════════════════════ */}
          {h2h.length > 0 && (
            <>
              <SectionHeading>Historial Directe</SectionHeading>
              <div className="card-elevated rounded-2xl p-6">
                <div className="space-y-0">
                  {h2h.map((m, i) => {
                    const localTeam = m.isHome ? team.name : m.opponent
                    const visitantTeam = m.isHome ? m.opponent : team.name
                    const homeScore = m.isHome ? m.goalsFor : m.goalsAgainst
                    const awayScore = m.isHome ? m.goalsAgainst : m.goalsFor
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm py-3 border-b border-white/5 last:border-0">
                        <span className="text-slate-500 text-xs w-14 shrink-0 font-medium">{formatDate(m.date)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${m.isHome ? 'bg-green-500/15 text-green-400' : 'bg-sky-500/15 text-sky-400'}`}>
                          {m.isHome ? 'L' : 'V'}
                        </span>
                        <span className="flex-1 text-white truncate font-medium">{localTeam}</span>
                        {homeScore !== null && awayScore !== null ? (
                          <span className="font-score text-xl tabular-nums flex items-center gap-1 shrink-0">
                            <span className={m.result === 'W' ? 'text-green-400' : m.result === 'L' ? 'text-red-400' : 'text-slate-300'}>{homeScore}</span>
                            <span className="text-slate-600 text-sm">-</span>
                            <span className={m.result === 'L' ? 'text-green-400' : m.result === 'W' ? 'text-red-400' : 'text-slate-300'}>{awayScore}</span>
                          </span>
                        ) : <span className="text-slate-600">-</span>}
                        <span className="flex-1 text-white text-right truncate font-medium">{visitantTeam}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  )
}
