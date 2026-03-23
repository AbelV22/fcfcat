import { Trophy, Users, Shield, TrendingUp } from 'lucide-react'

interface Props {
  refereeCount: number
  matchCount: number
  teamCount: number
}

export default function StatsBar({ refereeCount, matchCount, teamCount }: Props) {
  const stats = [
    {
      icon: <Trophy size={18} className="text-yellow-400" />,
      value: '14',
      label: 'Categories FCF',
      sublabel: 'Divisió Honor → Quarta Regional',
    },
    {
      icon: <TrendingUp size={18} className="text-green-400" />,
      value: matchCount.toLocaleString('ca'),
      label: 'Partits analitzats',
      sublabel: 'Temporada 2025-26',
      highlight: true,
    },
    {
      icon: <Shield size={18} className="text-cyan-400" />,
      value: refereeCount.toLocaleString('ca'),
      label: 'Àrbitres perfilats',
      sublabel: 'Amb estadístiques de targetes',
    },
    {
      icon: <Users size={18} className="text-purple-400" />,
      value: `+${(matchCount * 22).toLocaleString('ca')}`,
      label: 'Aparicions de jugadors',
      sublabel: 'Extrets de les actes oficials',
    },
  ]

  return (
    <section className="relative -mt-8 z-10 max-w-6xl mx-auto px-4 sm:px-6 mb-24">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`stat-card p-3 xs:p-4 sm:p-6 text-center hover:border-green-500/40 transition-all duration-300 hover:-translate-y-1 animate-fade-up ${
              'highlight' in stat && stat.highlight ? 'border-green-500/30' : ''
            }`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/5 mb-2 sm:mb-3">
              {stat.icon}
            </div>
            <div className="text-xl xs:text-2xl lg:text-3xl font-black text-white mb-0.5 sm:mb-1 tabular-nums">
              {stat.value}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-300 mb-0.5">
              {stat.label}
            </div>
            <div className="text-[10px] xs:text-xs text-slate-500 hidden xs:block">
              {stat.sublabel}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
