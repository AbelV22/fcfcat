import { Layers, TrendingUp, Shield, Users } from 'lucide-react'

interface Props {
  refereeCount: number
  matchCount: number
  teamCount: number
}

export default function StatsBar({ refereeCount, matchCount, teamCount }: Props) {
  const stats = [
    {
      icon: <Layers size={14} />,
      iconColor: 'text-amber-400',
      value: '14',
      label: 'Categories FCF',
    },
    {
      icon: <TrendingUp size={14} />,
      iconColor: 'text-emerald-400',
      value: matchCount.toLocaleString('ca'),
      label: 'Partits analitzats',
      live: true,
    },
    {
      icon: <Shield size={14} />,
      iconColor: 'text-cyan-400',
      value: refereeCount.toLocaleString('ca'),
      label: 'Àrbitres perfilats',
    },
    {
      icon: <Users size={14} />,
      iconColor: 'text-violet-400',
      value: `+${Math.round((matchCount * 22) / 1000)}K`,
      label: 'Aparicions de jugadors',
    },
  ]

  return (
    <section className="relative -mt-6 z-10 max-w-5xl mx-auto px-4 sm:px-6 mb-20">
      {/* Mobile: 2×2 grid inside the band */}
      <div className="stats-band hidden sm:flex">
        {stats.map((stat, i) => (
          <div key={i} className="contents">
            <div className="stats-band-item">
              <div className={`flex items-center justify-center gap-1.5 mb-2 ${stat.iconColor}`}>
                {stat.icon}
                {stat.live && (
                  <span className="flex items-center gap-1 text-[9px] font-semibold tracking-widest text-emerald-400 uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    Live
                  </span>
                )}
              </div>
              <div className="font-score text-4xl lg:text-5xl text-white leading-none mb-1.5 tabular-nums">
                {stat.value}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                {stat.label}
              </div>
            </div>
            {i < stats.length - 1 && <div className="stats-band-divider" />}
          </div>
        ))}
      </div>

      {/* Mobile fallback: 2×2 grid */}
      <div className="sm:hidden grid grid-cols-2 gap-2.5">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="relative bg-[#0a1220]/90 border border-white/[0.07] rounded-xl p-4 text-center overflow-hidden"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
            <div className={`flex items-center justify-center gap-1 mb-1.5 ${stat.iconColor}`}>
              {stat.icon}
              {stat.live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </div>
            <div className="font-score text-3xl text-white leading-none mb-1 tabular-nums">
              {stat.value}
            </div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-medium leading-tight">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
