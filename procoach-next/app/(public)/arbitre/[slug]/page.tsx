import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, ArrowLeft, Calendar, AlertTriangle, Lock, TrendingUp } from 'lucide-react'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import { getRefereeBySlug, getAllReferees, COMPETITION_NAMES } from '@/lib/data'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const ref = getRefereeBySlug(slug)
  if (!ref) return { title: 'Àrbitre no trobat' }
  return {
    title: `${ref.name} — Àrbitre FCF`,
    description: `Estadístiques de ${ref.name}: ${ref.matches} partits arbitrats, ${ref.yellows_per_match} targetes grogues de mitjana i ${ref.reds_per_match} vermelles per partit.`,
  }
}

export async function generateStaticParams() {
  const refs = getAllReferees().slice(0, 200)
  return refs.map(r => ({ slug: r.slug }))
}

function StatBadge({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="stat-card p-5 text-center">
      <div className={`text-3xl font-black mb-1 ${color}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

export default async function ArbitrePage({ params }: Props) {
  const { slug } = await params
  const ref = getRefereeBySlug(slug)

  if (!ref) notFound()

  const formatDate = (date: string) => {
    if (!date) return '–'
    const [day, month, year] = date.split('-')
    const months = ['', 'gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
    return `${day} ${months[parseInt(month)] || month} ${year}`
  }

  const expulsionPct = ref.matches > 0
    ? ((ref.reds / ref.matches) * 100).toFixed(0)
    : '0'

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <PublicHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-300 transition-colors">Inici</Link>
          <span>/</span>
          <Link href="/cerca?type=arbitre" className="hover:text-slate-300 transition-colors">Àrbitres</Link>
          <span>/</span>
          <span className="text-slate-300">{ref.name}</span>
        </div>

        {/* Header */}
        <div className="glass-card rounded-2xl p-5 sm:p-8 mb-6">
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-2xl sm:text-3xl font-black text-white shrink-0">
              {ref.name.split(' ')[0]?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl font-black text-white mb-1 leading-tight">{ref.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-sm text-slate-400 flex items-center gap-1.5">
                  <Shield size={13} className="text-purple-400" />
                  Àrbitre FCF
                </span>
                {ref.competitions.slice(0, 2).map(c => (
                  <span key={c} className="text-xs px-2 py-0.5 bg-white/6 border border-white/10 rounded-full text-slate-400">
                    {COMPETITION_NAMES[c] || c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatBadge value={ref.matches} label="Partits" color="text-white" />
          <StatBadge value={ref.yellows_per_match} label="🟨 per part." color="text-yellow-400" />
          <StatBadge value={ref.reds_per_match} label="🟥 per part." color="text-red-400" />
          <StatBadge value={`${expulsionPct}%`} label="Amb expulsió" color="text-orange-400" />
        </div>

        {/* Two column: history + premium CTA */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">

          {/* Match history */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-green-400" />
              Últims {ref.recentMatches.length} partits arbitrats
            </h2>
            <div className="space-y-2">
              {ref.recentMatches.map((match, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl hover:bg-white/5 active:bg-white/8 transition-colors border border-white/5">
                  <span className="text-[10px] sm:text-xs text-slate-500 shrink-0 w-16 sm:w-20">{formatDate(match.date)}</span>
                  <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="text-xs sm:text-sm text-slate-300 text-right truncate">{match.home_team}</span>
                    <span className="text-xs sm:text-sm font-bold text-white bg-white/8 px-2 sm:px-2.5 py-1 rounded-lg shrink-0 font-mono">
                      {match.home_score ?? '–'}–{match.away_score ?? '–'}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-300 truncate">{match.away_team}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {match.yellows > 0 && (
                      <span className="text-xs text-yellow-400 font-semibold">🟨{match.yellows}</span>
                    )}
                    {match.reds > 0 && (
                      <span className="text-xs text-red-400 font-semibold">🟥{match.reds}</span>
                    )}
                    {match.yellows === 0 && match.reds === 0 && (
                      <span className="text-[10px] text-slate-700">–</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Premium CTA */}
          <div className="space-y-4">

            {/* Trend chart placeholder */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-cyan-400" />
                Tendència de targetes
              </h3>
              <div className="space-y-2">
                {['🟨 Grogues/partit', '🟥 Vermelles/partit', 'Partits amb expulsió'].map((label, i) => {
                  const values = [ref.yellows_per_match, ref.reds_per_match, parseFloat(expulsionPct) / 100]
                  const max = [6, 0.5, 1]
                  const pct = Math.min((values[i] / max[i]) * 100, 100)
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{label}</span>
                        <span className="text-white">{values[i]}</span>
                      </div>
                      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-green-500 to-cyan-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Premium lock card */}
            <div className="relative rounded-2xl p-6 bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/25 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
                  <Lock size={18} className="text-indigo-400" />
                </div>
                <h3 className="font-bold text-white mb-2">Informe complet</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Percentil de severitat, biaix local/visitant, patrons per període i historial amb el teu equip.
                </p>
                <ul className="space-y-1.5 mb-5">
                  {[
                    'Percentil vs altres àrbitres',
                    'Targetes 1a vs 2a meitat',
                    'Historial vs el teu equip',
                    'Predicció de conducta',
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-3 h-3 rounded-full bg-indigo-500/30 flex items-center justify-center shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/registre"
                  className="block text-center py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Desbloqueja l'informe
                </Link>
              </div>
            </div>

            {/* Warning: severity */}
            {ref.yellows_per_match > 4 && (
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-amber-400 mb-0.5">Àrbitre exigent</div>
                  <div className="text-xs text-slate-400">
                    Mostra més de {ref.yellows_per_match} targetes de mitjana per partit.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
