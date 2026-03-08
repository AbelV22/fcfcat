import Link from 'next/link'
import { ArrowRight, Shield, Users, TrendingUp, Video, Search, BarChart3 } from 'lucide-react'
import { getRecentResults, getAllReferees } from '@/lib/data'

function CompetitionCard({
  name,
  slug,
  tier,
  groups,
}: {
  name: string
  slug: string
  tier: number
  groups: number
}) {
  const tierColors: Record<number, string> = {
    1: 'from-yellow-500 to-amber-500',
    2: 'from-slate-400 to-slate-300',
    3: 'from-amber-700 to-amber-600',
    4: 'from-green-600 to-green-500',
    5: 'from-green-700 to-emerald-600',
    6: 'from-teal-700 to-teal-600',
  }
  const color = tierColors[Math.min(tier, 6)] || 'from-slate-600 to-slate-500'

  return (
    <Link
      href={`/competicio/${slug}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group"
    >
      <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-200 group-hover:text-white truncate">{name}</div>
        <div className="text-xs text-slate-500">{groups} grups</div>
      </div>
      <ArrowRight size={14} className="text-slate-600 group-hover:text-green-400 transition-colors shrink-0" />
    </Link>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  badge,
  href,
}: {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  href: string
}) {
  return (
    <Link href={href} className="group block glass-card p-6 rounded-2xl hover:border-green-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-green-900/20">
      <div className="mb-4">{icon}</div>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-white group-hover:text-green-400 transition-colors">{title}</h3>
        {badge && (
          <span className="text-xs px-2 py-0.5 bg-green-500/15 text-green-400 border border-green-500/20 rounded-full shrink-0 ml-2">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </Link>
  )
}

export default async function FeaturedSection() {
  const recentResults = getRecentResults(6)
  const topReferees = getAllReferees().slice(0, 5)

  const competitions = [
    { name: "Divisió d'Honor", slug: 'divisio-honor', tier: 1, groups: 1 },
    { name: 'Primera Catalana', slug: 'primera-catalana', tier: 5, groups: 8 },
    { name: 'Segona Catalana', slug: 'segona-catalana', tier: 6, groups: 8 },
    { name: 'Preferent Catalana', slug: 'preferent-catalana', tier: 4, groups: 3 },
    { name: 'Tercera Catalana', slug: 'tercera-catalana', tier: 6, groups: 10 },
    { name: 'Quarta Catalana', slug: 'quarta-catalana', tier: 6, groups: 10 },
  ]

  const formatDate = (date: string) => {
    if (!date) return ''
    const [day, month] = date.split('-')
    const months = ['', 'gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
    return `${day} ${months[parseInt(month)] || month}`
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-20 mb-24">

      {/* Platform features */}
      <div>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-white mb-3">
            Tot el que necessites, <span className="gradient-text">gratuït</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Accedeix a tota la informació del futbol català sense registre. Per a entrenadors, jugadors i aficionats.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={<TrendingUp size={24} className="text-green-400" />}
            title="Classificacions en temps real"
            description="Totes les classificacions de totes les categories i grups de la FCF, actualitzades cada setmana."
            href="/competicio/primera-catalana"
          />
          <FeatureCard
            icon={<BarChart3 size={24} className="text-cyan-400" />}
            title="Resultats i estadístiques"
            description="Resultats de totes les jornades, gols, targetes i substitucions extrets de les actes oficials."
            href="/resultats"
          />
          <FeatureCard
            icon={<Shield size={24} className="text-purple-400" />}
            title="Perfil d'àrbitres"
            description="Estadístiques bàsiques de tots els àrbitres: partits, targetes per partit i historial recent."
            badge="Gratis"
            href="/cerca?type=arbitre"
          />
          <FeatureCard
            icon={<Users size={24} className="text-blue-400" />}
            title="Perfils de jugadors"
            description="Estadístiques de tots els jugadors: partits, gols, targetes i minuts jugats per temporada."
            href="/cerca?type=jugador"
          />
          <FeatureCard
            icon={<Video size={24} className="text-rose-400" />}
            title="Reclama el teu perfil"
            description="Ets jugador? Reclama el teu perfil, afegeix la teva bio, posició i puja els teus millors clips."
            badge="Pròximament"
            href="/registre"
          />
          <FeatureCard
            icon={<Search size={24} className="text-amber-400" />}
            title="Scouting per ojeadors"
            description="Busca jugadors per posició, categoria, estadístiques i descobreix talent del futbol regional."
            badge="Pròximament"
            href="/registre"
          />
        </div>
      </div>

      {/* Two column: competitions + recent results */}
      <div className="grid lg:grid-cols-2 gap-8">

        {/* Competitions list */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Competicions</h2>
            <Link
              href="/competicio"
              className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
            >
              Totes <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-1">
            {competitions.map(c => (
              <CompetitionCard key={c.slug} {...c} />
            ))}
          </div>
        </div>

        {/* Recent results */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Últims Resultats</h2>
            <Link
              href="/resultats"
              className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
            >
              Tots <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentResults.length > 0 ? recentResults.map((match, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                <span className="text-xs text-slate-500 w-12 shrink-0">{formatDate(match.date)}</span>
                <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
                  <span className="text-sm text-slate-300 text-right truncate">{match.home_team}</span>
                  <span className="text-sm font-bold text-white bg-white/8 px-2 py-0.5 rounded-lg shrink-0">
                    {match.home_score ?? '–'} – {match.away_score ?? '–'}
                  </span>
                  <span className="text-sm text-slate-300 truncate">{match.away_team}</span>
                </div>
              </div>
            )) : (
              <p className="text-slate-500 text-sm text-center py-8">No hi ha resultats recents</p>
            )}
          </div>
        </div>
      </div>

      {/* Top referees preview */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Àrbitres destacats</h2>
            <p className="text-sm text-slate-500 mt-0.5">Per partits arbitrats aquesta temporada</p>
          </div>
          <Link
            href="/cerca?type=arbitre"
            className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
          >
            Tots els àrbitres <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-white/8">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Àrbitre</th>
                <th className="pb-3 font-medium text-center">Partits</th>
                <th className="pb-3 font-medium text-center">🟨/partit</th>
                <th className="pb-3 font-medium text-center">🟥/partit</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {topReferees.map((ref, i) => (
                <tr key={ref.slug} className="hover:bg-white/3 transition-colors">
                  <td className="py-3 text-slate-500 w-8">{i + 1}</td>
                  <td className="py-3">
                    <span className="font-medium text-slate-200">{ref.name}</span>
                  </td>
                  <td className="py-3 text-center text-slate-300">{ref.matches}</td>
                  <td className="py-3 text-center">
                    <span className="text-yellow-400 font-mono">{ref.yellows_per_match}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-red-400 font-mono">{ref.reds_per_match}</span>
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/arbitre/${ref.slug}`}
                      className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 justify-end"
                    >
                      Veure <ArrowRight size={10} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
