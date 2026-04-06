import { redirect } from 'next/navigation'
import { getDashboardTeam, isAdminUser, isProUser } from '@/lib/dashboard-auth'
import { getFullTeamReportDB } from '@/lib/supabase-data'
import { Shield, AlertTriangle, BarChart2, Target, Clock, TrendingUp } from 'lucide-react'
import { ProBlurValue, ProBlurSection, ProUnlockBanner } from '@/components/ProGate'

export const dynamic = 'force-dynamic'

const COMPETITION_NAMES: Record<string, string> = {
  'tercera-federacio': 'Tercera Federació',
  'lliga-elit': 'Lliga Elit',
  'primera-catalana': 'Primera Catalana',
  'segona-catalana': 'Segona Catalana',
  'tercera-catalana': 'Tercera Catalana',
  'quarta-catalana': 'Quarta Catalana',
  'divisio-honor-juvenil': "Divisió d'Honor Juvenil",
  'lliga-nacional-juvenil': 'Lliga Nacional Juvenil',
  'preferent-juvenils': 'Preferent Juvenil',
}

function formatDate(d: string) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) {
    const months = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
    return `${parts[0]} ${months[parseInt(parts[1], 10) - 1] || parts[1]}`
  }
  return d
}

/* ── SVG Severity Gauge (speedometer) ──────────────────────────────────────── */
function SeverityGauge({ score, blurred }: { score: number; blurred: boolean }) {
  const clampedScore = Math.max(0, Math.min(100, score))
  // Arc from 135° to 405° (270° sweep)
  const startAngle = 135
  const endAngle = 405
  const sweepAngle = endAngle - startAngle
  const radius = 70
  const cx = 90
  const cy = 90

  function polarToCartesian(angle: number) {
    const rad = (angle * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  // Background arc
  const bgStart = polarToCartesian(startAngle)
  const bgEnd = polarToCartesian(endAngle)
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 1 1 ${bgEnd.x} ${bgEnd.y}`

  // Active arc
  const activeAngle = startAngle + (sweepAngle * clampedScore) / 100
  const activeEnd = polarToCartesian(activeAngle)
  const largeArc = activeAngle - startAngle > 180 ? 1 : 0
  const activePath = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 ${largeArc} 1 ${activeEnd.x} ${activeEnd.y}`

  const color = clampedScore >= 75 ? '#ef4444' : clampedScore >= 50 ? '#f59e0b' : clampedScore >= 25 ? '#3b82f6' : '#22c55e'
  const label = clampedScore >= 75 ? 'Molt estricte' : clampedScore >= 50 ? 'Estricte' : clampedScore >= 25 ? 'Moderat' : 'Permissiu'

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 130" className="w-48 h-auto">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="33%" stopColor="#3b82f6" />
            <stop offset="66%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />
        <path d={activePath} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color}40)` }} />
        {/* Needle */}
        <circle cx={activeEnd.x} cy={activeEnd.y} r="6" fill={color} stroke="#0f172a" strokeWidth="2" />
        <text x={cx} y={cy - 5} textAnchor="middle" className={`text-3xl font-black ${blurred ? 'blur-sm' : ''}`} fill="white" fontSize="28">{clampedScore}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize="10">/100</text>
      </svg>
      <span className={`text-sm font-bold mt-1 ${blurred ? 'blur-sm select-none' : ''}`} style={{ color }}>{label}</span>
    </div>
  )
}

/* ── Radial progress ring ──────────────────────────────────────────────────── */
function RadialPercentile({ value, label, sublabel, size = 90, blurred }: { value: number; label: string; sublabel?: string; size?: number; blurred: boolean }) {
  const r = (size - 10) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (circumference * Math.min(100, value)) / 100
  const color = value >= 75 ? '#ef4444' : value >= 50 ? '#f59e0b' : '#22c55e'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease', filter: `drop-shadow(0 0 4px ${color}30)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className={`text-lg font-black text-white ${blurred ? 'blur-sm select-none' : ''}`}>{value}%</span>
      </div>
      <span className="text-[11px] text-slate-400 text-center leading-tight mt-0.5">{label}</span>
      {sublabel && <span className="text-[9px] text-slate-500 text-center">{sublabel}</span>}
    </div>
  )
}

/* ── Visual bar split ──────────────────────────────────────────────────────── */
function SplitBar({ left, right, leftLabel, rightLabel, leftColor, rightColor, blurred }: {
  left: number; right: number; leftLabel: string; rightLabel: string; leftColor: string; rightColor: string; blurred: boolean
}) {
  const total = left + right || 1
  const leftPct = (left / total) * 100

  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-400">{leftLabel} <span className={`font-bold ${blurred ? 'blur-sm select-none' : ''}`} style={{ color: leftColor }}>{left}</span></span>
        <span className="text-slate-400"><span className={`font-bold ${blurred ? 'blur-sm select-none' : ''}`} style={{ color: rightColor }}>{right}</span> {rightLabel}</span>
      </div>
      <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-l-full transition-all" style={{ width: `${leftPct}%`, background: leftColor, opacity: 0.8 }} />
        <div className="h-full rounded-r-full transition-all" style={{ width: `${100 - leftPct}%`, background: rightColor, opacity: 0.8 }} />
      </div>
    </div>
  )
}

/* ── Trend sparkline (last N matches) ──────────────────────────────────────── */
function CardSparkline({ matches }: { matches: Array<{ yellows: number; reds: number }> }) {
  if (matches.length < 2) return null
  const data = [...matches].reverse()
  const max = Math.max(...data.map(m => m.yellows + m.reds), 1)
  const w = 220
  const h = 50
  const step = w / (data.length - 1)

  const points = data.map((m, i) => `${i * step},${h - ((m.yellows + m.reds) / max) * (h - 8)}`).join(' ')
  const avgLine = data.reduce((s, m) => s + m.yellows + m.reds, 0) / data.length
  const avgY = h - (avgLine / max) * (h - 8)

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${w} ${h + 4}`} className="w-full h-14" preserveAspectRatio="none">
        {/* Average line */}
        <line x1="0" y1={avgY} x2={w} y2={avgY} stroke="rgba(168,85,247,0.3)" strokeWidth="1" strokeDasharray="4 3" />
        {/* Line */}
        <polyline points={points} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots */}
        {data.map((m, i) => (
          <circle key={i} cx={i * step} cy={h - ((m.yellows + m.reds) / max) * (h - 8)} r="3"
            fill={m.reds > 0 ? '#ef4444' : '#f59e0b'} stroke="#0f172a" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex justify-between text-[9px] text-slate-600 px-0.5 -mt-1">
        <span>Antic</span>
        <span className="text-purple-400/50">avg {avgLine.toFixed(1)}</span>
        <span>Recent</span>
      </div>
    </div>
  )
}

export default async function ArbitreProPage() {
  const isAdmin = await isAdminUser()
  const isPro = await isProUser()
  const team = await getDashboardTeam()
  if (!team) redirect('/dashboard/setup')
  if (!isAdmin) {
    const { createClient } = await import('@/lib/supabase-server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
  }

  const blurred = !isPro
  const report = await getFullTeamReportDB(team.slug, team.competition || undefined)
  const ref = report?.referee
  const nextMatch = report?.nextMatch
  const teamCompetition = report?.competition || ''

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        {/* PRO unlock banner */}
        {blurred && <ProUnlockBanner />}

        {!ref ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Shield size={40} className="text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Sense informacio arbitral</h2>
            <p className="text-slate-400 text-sm">
              {nextMatch ? 'Encara no hi ha dades sobre l\'arbitre assignat.' : 'No hi ha proxim partit programat.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── Header + Severity Gauge ──────────────────────────────────────── */}
            <div className="glass-card rounded-2xl p-6 border-purple-500/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/25 flex items-center justify-center shrink-0">
                    <Shield size={24} className="text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-black text-white truncate">{ref.name}</h1>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span><ProBlurValue value={`${ref.matches} partits (senior)`} blurred={blurred} /></span>
                      {ref.predicted && <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-full">Prediccio</span>}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-0.5">Nomes categories senior i preferent juvenil</p>
                  </div>
                </div>
                <SeverityGauge score={ref.severity_score} blurred={blurred} />
              </div>
            </div>

            {/* ── Key Stats Grid ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { v: ref.yellows_per_match.toFixed(1), l: 'Grogues/partit', c: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                { v: ref.reds_per_match.toFixed(2), l: 'Vermelles/partit', c: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                { v: `${ref.matches_with_red_pct}%`, l: 'Partits amb expulsio', c: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                { v: ref.penalties_per_match.toFixed(2), l: 'Penals/partit', c: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
                { v: ref.avg_goals_per_match.toFixed(1), l: 'Gols/partit', c: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
              ].map(s => (
                <div key={s.l} className={`rounded-xl p-4 text-center border ${s.bg}`}>
                  <div className={`text-2xl font-black ${s.c}`}>
                    <ProBlurValue value={s.v} blurred={blurred} />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">{s.l}</div>
                </div>
              ))}
            </div>

            {/* ── Penalty Detail ───────────────────────────────────────────────── */}
            {ref.penalties_total > 0 && (
              <div className="glass-card rounded-2xl p-5 border-cyan-500/15">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} className="text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Penals</h3>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-slate-400">Total penals pitats: </span>
                    <span className="font-bold text-cyan-400"><ProBlurValue value={ref.penalties_total} blurred={blurred} /></span>
                  </div>
                  <div>
                    <span className="text-slate-400">Partits amb penal: </span>
                    <span className="font-bold text-cyan-400"><ProBlurValue value={`${ref.matches_with_penalty_pct}%`} blurred={blurred} /></span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Card Trend Sparkline ─────────────────────────────────────────── */}
            {ref.recentMatches.length >= 3 && (
              <ProBlurSection
                blurred={blurred}
                ctaHref="/dashboard"
                ctaText="Convida 3 entrenadors per veure la tendencia completa"
                ctaLabel="Desbloquejar"
              >
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Tendencia de targetes</h3>
                  </div>
                  <CardSparkline matches={ref.recentMatches} />
                </div>
              </ProBlurSection>
            )}

            {/* ── Division Percentile (coach's competition) ────────────────────── */}
            {ref.division_referee_count > 1 && (
              <ProBlurSection
                blurred={blurred}
                ctaHref="/dashboard"
                ctaText="Comparteix NeoScout per desbloquejar els percentils"
                ctaLabel="Desbloquejar"
              >
                <div className="glass-card rounded-2xl p-6 border-blue-500/15">
                  <div className="flex items-center gap-2 mb-1">
                    <Target size={18} className="text-blue-400" />
                    <h2 className="text-lg font-bold text-white">Percentil a la teva divisio</h2>
                  </div>
                  <p className="text-xs text-slate-500 mb-5">
                    Comparat amb {ref.division_referee_count} arbitres que han dirigit a {ref.division_name}
                  </p>
                  <div className="flex items-center justify-center gap-8 sm:gap-12">
                    <div className="relative">
                      <RadialPercentile value={ref.division_yellows_percentile} label="Grogues" sublabel={`a ${ref.division_name}`} size={100} blurred={blurred} />
                    </div>
                    <div className="relative">
                      <RadialPercentile value={ref.division_reds_percentile} label="Vermelles" sublabel={`a ${ref.division_name}`} size={100} blurred={blurred} />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-600 text-center mt-4">
                    Percentil 80+ = mes estricte que el 80% dels arbitres que han dirigit a la teva competicio.
                  </p>
                </div>
              </ProBlurSection>
            )}

            {/* ── Global Percentiles ───────────────────────────────────────────── */}
            <ProBlurSection
              blurred={blurred}
              ctaHref="/dashboard"
              ctaText="Convida 3 entrenadors per veure els percentils globals"
              ctaLabel="Desbloquejar"
            >
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart2 size={18} className="text-purple-400" />
                  <h2 className="text-lg font-bold text-white">Percentils globals</h2>
                </div>
                <p className="text-xs text-slate-500 mb-4">Totes les categories senior + preferent juvenil</p>
                <div className="flex items-center justify-center gap-8 sm:gap-12">
                  <div className="relative">
                    <RadialPercentile value={ref.yellows_percentile} label="Grogues" size={100} blurred={blurred} />
                  </div>
                  <div className="relative">
                    <RadialPercentile value={ref.reds_percentile} label="Vermelles" size={100} blurred={blurred} />
                  </div>
                </div>
              </div>
            </ProBlurSection>

            {/* ── Visual Distributions ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Home/Away */}
              <div className="glass-card rounded-2xl p-5">
                <h3 className="font-bold text-white text-sm mb-4">Local vs Visitant</h3>
                <div className="space-y-3">
                  <SplitBar
                    left={ref.home_yellows} right={ref.away_yellows}
                    leftLabel="Local" rightLabel="Visitant"
                    leftColor="#f59e0b" rightColor="#fbbf24"
                    blurred={blurred}
                  />
                  <SplitBar
                    left={ref.home_reds} right={ref.away_reds}
                    leftLabel="Vermelles L" rightLabel="Vermelles V"
                    leftColor="#ef4444" rightColor="#f87171"
                    blurred={blurred}
                  />
                  {ref.home_bias !== null && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-white/8">
                      <span className="text-slate-400">Biaix local</span>
                      <span className={`font-bold ${blurred ? 'blur-sm select-none' : ''} ${ref.home_bias > 60 ? 'text-red-400' : ref.home_bias < 40 ? 'text-green-400' : 'text-slate-300'}`}>
                        {ref.home_bias.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Half-time split */}
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={14} className="text-blue-400" />
                  <h3 className="font-bold text-white text-sm">Targetes per temps</h3>
                </div>
                <div className="space-y-3">
                  <SplitBar
                    left={ref.first_half_yellows} right={ref.second_half_yellows}
                    leftLabel="1a part" rightLabel="2a part"
                    leftColor="#f59e0b" rightColor="#fbbf24"
                    blurred={blurred}
                  />
                  <SplitBar
                    left={ref.first_half_reds} right={ref.second_half_reds}
                    leftLabel="Vermelles 1a" rightLabel="Vermelles 2a"
                    leftColor="#ef4444" rightColor="#f87171"
                    blurred={blurred}
                  />
                  <div className={`flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-white/8 ${blurred ? 'blur-sm select-none' : ''}`}>
                    <span>Total 1a: {ref.first_half_cards}</span>
                    <span>Total 2a: {ref.second_half_cards}</span>
                    <span className={ref.second_half_cards > ref.first_half_cards * 1.5 ? 'text-amber-400 font-bold' : ''}>
                      {ref.second_half_cards > ref.first_half_cards * 1.5 ? '⚡ Mes actiu a la 2a' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Competition Breakdown ────────────────────────────────────────── */}
            {ref.competitionBreakdown.length > 0 && (
              <ProBlurSection
                blurred={blurred}
                ctaHref="/dashboard"
                ctaText="Comparteix per veure el desglos per competicio"
                ctaLabel="Desbloquejar"
              >
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
                          <th className="text-center py-2 px-2">G/P</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ref.competitionBreakdown.map((c, i) => {
                          const isCoachDiv = c.competition === teamCompetition
                          return (
                            <tr key={i} className={`border-b border-white/5 ${isCoachDiv ? 'bg-blue-500/5' : ''}`}>
                              <td className="py-2 px-2 text-white">
                                {COMPETITION_NAMES[c.competition] || c.competition}
                                {isCoachDiv && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">La teva</span>}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-300">{c.matches}</td>
                              <td className="py-2 px-2 text-center text-amber-400">{c.yellows}</td>
                              <td className="py-2 px-2 text-center text-red-400">{c.reds}</td>
                              <td className="py-2 px-2 text-center text-slate-400">{c.matches > 0 ? (c.yellows / c.matches).toFixed(1) : '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </ProBlurSection>
            )}

            {/* ── Recent Matches ───────────────────────────────────────────────── */}
            {ref.recentMatches.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Ultims partits arbitrats</h2>
                <div className="space-y-1">
                  {ref.recentMatches.slice(0, 10).map((m, i) => {
                    const isCoachDiv = m.competition === teamCompetition
                    return (
                      <div key={i} className={`flex items-center gap-3 text-sm py-2 border-b border-white/5 last:border-0 ${isCoachDiv ? 'bg-blue-500/5 rounded-lg px-2 -mx-2' : ''}`}>
                        <span className="text-slate-500 text-xs w-14 shrink-0">{formatDate(m.date)}</span>
                        <span className="text-white flex-1 truncate">{m.home_team} vs {m.away_team}</span>
                        <span className={`font-bold tabular-nums text-slate-300 shrink-0 ${blurred ? 'blur-sm select-none' : ''}`}>
                          {m.home_score !== null ? `${m.home_score}-${m.away_score}` : '-'}
                        </span>
                        <span className={`text-amber-400 text-xs shrink-0 ${blurred ? 'blur-sm select-none' : ''}`}>{m.yellows}🟡</span>
                        {m.reds > 0 && <span className={`text-red-400 text-xs shrink-0 ${blurred ? 'blur-sm select-none' : ''}`}>{m.reds}🔴</span>}
                        {(m as any).penalties > 0 && <span className={`text-cyan-400 text-xs shrink-0 ${blurred ? 'blur-sm select-none' : ''}`}>{(m as any).penalties}P</span>}
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
