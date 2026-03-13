import Link from 'next/link'
import {
  ArrowRight, Shield, AlertTriangle, Trophy, Calendar,
  TrendingUp, Target, Clock, Home, Plane, Users, Crosshair,
} from 'lucide-react'
import {
  getRecentResults, getAllReferees, getCompetitionDiscipline, slugify,
} from '@/lib/data'

const COMPETITIONS = [
  { name: 'Lliga Elit', slug: 'lliga-elit', tier: 0 },
  { name: 'Primera Catalana', slug: 'primera-catalana', tier: 1 },
  { name: 'Segona Catalana', slug: 'segona-catalana', tier: 2 },
  { name: 'Tercera Catalana', slug: 'tercera-catalana', tier: 3 },
  { name: 'Quarta Catalana', slug: 'quarta-catalana', tier: 4 },
  { name: 'Div. Honor Juvenil', slug: 'divisio-honor-juvenil', tier: 5 },
  { name: 'Preferent Juvenil', slug: 'preferent-juvenil', tier: 6 },
  { name: 'Div. Honor Cadet S16', slug: 'divisio-honor-cadet-s16', tier: 7 },
]

const TIER_COLORS = [
  'from-yellow-500 to-amber-400',
  'from-slate-300 to-slate-400',
  'from-amber-600 to-amber-700',
  'from-green-500 to-green-600',
  'from-teal-500 to-teal-600',
  'from-cyan-500 to-cyan-600',
  'from-blue-500 to-blue-600',
  'from-indigo-500 to-indigo-600',
]

function formatDate(date: string) {
  if (!date) return ''
  const [day, month] = date.split('-')
  const months = ['', 'gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
  return `${day} ${months[parseInt(month)] || month}`
}

export default async function FeaturedSection() {
  const recentResults = getRecentResults(8)
  const topReferees = getAllReferees().slice(0, 6)
  const riskPlayers = [
    ...getCompetitionDiscipline('primera-catalana').riskPlayers,
    ...getCompetitionDiscipline('segona-catalana').riskPlayers,
  ]
    .sort((a, b) => b.yellows - a.yellows)
    .slice(0, 6)

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-16 mb-24">

      {/* ─── What coaches get ─── */}
      <div>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">
            L'informe que <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">tot entrenador vol</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Dades extretes de les actes oficials de la FCF. Tot gratis. Tot ara.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: <Crosshair size={22} className="text-cyan-400" />,
              title: 'Anàlisi del proper rival',
              desc: 'Goleadors, jugadors amb més minuts, apercibits i timing de gols del teu rival de la setmana que ve. Tot automàtic.',
              href: '/cerca',
              badge: 'Clau',
              badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
            },
            {
              icon: <AlertTriangle size={22} className="text-amber-400" />,
              title: 'Apercibits i sancions',
              desc: 'Jugadors propers a sanció per acumulació de targetes. Sàpigues qui no podrà jugar el proper partit — propi i rival.',
              href: '/competicio/primera-catalana?tab=disciplina',
              badge: 'Exclusiu',
              badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            },
            {
              icon: <Clock size={22} className="text-green-400" />,
              title: 'Timing de gols',
              desc: 'En quins minuts marca i encaixa el teu equip. Detecta patrons: dèbil al final, fort als primers minuts...',
              href: '/cerca',
              badge: null,
              badgeColor: '',
            },
            {
              icon: <Home size={22} className="text-purple-400" />,
              title: 'Classificació Local vs Visitant',
              desc: 'El teu rendiment com a local i com a visitant per separat. Sàpigues on ets fort i on cal millorar.',
              href: '/cerca',
              badge: null,
              badgeColor: '',
            },
            {
              icon: <Target size={22} className="text-yellow-400" />,
              title: 'Golejadors de la plantilla',
              desc: 'Rànquing de golejadors del teu equip amb partits, minuts i targetes. Perfecte per gestionar la rotació.',
              href: '/cerca',
              badge: null,
              badgeColor: '',
            },
            {
              icon: <Shield size={22} className="text-cyan-400" />,
              title: 'Informe arbitral complet',
              desc: 'Grogues i vermelles per partit de cada àrbitre. Historial complet. Sàpigues com arbitrarà el teu proper partit.',
              href: '/competicio/primera-catalana?tab=arbitres',
              badge: 'Gratis',
              badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30',
            },
          ].map(item => (
            <Link
              key={item.title}
              href={item.href}
              className="group glass-card rounded-2xl p-5 hover:border-green-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-900/10"
            >
              <div className="flex items-start justify-between mb-3">
                {item.icon}
                {item.badge && (
                  <span className={`text-xs px-2 py-0.5 border rounded-full font-semibold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-white group-hover:text-green-400 transition-colors mb-1.5">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Live data: Risk players + Recent results ─── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Risc de sanció */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              <h2 className="text-lg font-bold text-white">Apercibits actuals</h2>
            </div>
            <Link href="/competicio/primera-catalana?tab=disciplina" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              1a Cat <ArrowRight size={10} />
            </Link>
          </div>
          {riskPlayers.length > 0 ? (
            <div className="space-y-2">
              {riskPlayers.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-900/10 border border-amber-500/15">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 truncate">{p.team}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">🟨 {p.yellows}</span>
                    {p.reds > 0 && <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">🟥 {p.reds}</span>}
                  </div>
                </div>
              ))}
              <Link
                href="/competicio/segona-catalana?tab=disciplina"
                className="flex items-center justify-center gap-1 pt-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                Veure tots els jugadors en risc <ArrowRight size={10} />
              </Link>
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">No hi ha dades disponibles</p>
          )}
        </div>

        {/* Recent results */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-green-400" />
              <h2 className="text-lg font-bold text-white">Últims Resultats</h2>
            </div>
            <Link href="/resultats" className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1">
              Tots <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-1.5">
            {recentResults.length > 0 ? recentResults.map((match, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
                <span className="text-[10px] text-slate-600 w-12 shrink-0 text-right">{formatDate(match.date)}</span>
                <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
                  <Link href={`/equip/${slugify(match.home_team)}`} className="text-xs text-slate-300 hover:text-white text-right truncate">{match.home_team}</Link>
                  <span className="text-xs font-bold text-white bg-white/8 px-2 py-0.5 rounded-lg shrink-0 tabular-nums">
                    {match.home_score ?? '–'} – {match.away_score ?? '–'}
                  </span>
                  <Link href={`/equip/${slugify(match.away_team)}`} className="text-xs text-slate-300 hover:text-white truncate">{match.away_team}</Link>
                </div>
              </div>
            )) : (
              <p className="text-slate-500 text-sm text-center py-8">No hi ha resultats recents</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Competitions ─── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy size={20} className="text-green-400" />
            Competicions cobertes
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {COMPETITIONS.map((c, i) => (
            <Link
              key={c.slug}
              href={`/competicio/${c.slug}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/4 hover:bg-white/7 border border-white/6 hover:border-green-500/30 transition-all group"
            >
              <div className={`w-1.5 h-8 rounded-full bg-gradient-to-b ${TIER_COLORS[i] || 'from-slate-500 to-slate-600'} shrink-0`} />
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors truncate">{c.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Top referees ─── */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Àrbitres més actius</h2>
          </div>
          <Link href="/cerca?type=arbitre" className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1">
            Tots els àrbitres <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-white/8 text-xs uppercase tracking-wider">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Àrbitre</th>
                <th className="pb-3 text-center font-medium">Partits</th>
                <th className="pb-3 text-center font-medium text-amber-400">🟨/part.</th>
                <th className="pb-3 text-center font-medium text-red-400">🟥/part.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {topReferees.map((ref, i) => (
                <tr key={ref.slug} className="hover:bg-white/3 transition-colors group">
                  <td className="py-3 text-slate-600 text-xs">{i + 1}</td>
                  <td className="py-3">
                    <Link href={`/arbitre/${ref.slug}`} className="font-medium text-slate-200 group-hover:text-green-400 transition-colors">
                      {ref.name}
                    </Link>
                  </td>
                  <td className="py-3 text-center text-slate-400">{ref.matches}</td>
                  <td className="py-3 text-center">
                    <span className={`font-bold ${ref.yellows_per_match >= 4 ? 'text-red-400' : ref.yellows_per_match >= 3 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {ref.yellows_per_match}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <span className={`font-bold ${ref.reds_per_match >= 0.5 ? 'text-red-400' : 'text-slate-400'}`}>
                      {ref.reds_per_match}
                    </span>
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
