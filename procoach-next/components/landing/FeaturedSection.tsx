import Link from 'next/link'
import {
  ArrowRight, Trophy, Crosshair, AlertTriangle, Clock, Home,
  Target, FileText, Calendar,
} from 'lucide-react'

const COMPETITIONS = [
  { name: 'Lliga Elit', slug: 'lliga-elit', tier: 0 },
  { name: 'Primera Catalana', slug: 'primera-catalana', tier: 1 },
  { name: 'Segona Catalana', slug: 'segona-catalana', tier: 2 },
  { name: 'Tercera Catalana', slug: 'tercera-catalana', tier: 3 },
  { name: 'Quarta Catalana', slug: 'quarta-catalana', tier: 4 },
  { name: 'Div. Honor Juvenil', slug: 'divisio-honor-juvenil', tier: 5 },
  { name: 'Preferent Juvenil', slug: 'preferent-juvenils', tier: 6 },
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

const FEATURES = [
  {
    icon: <Crosshair size={22} className="text-cyan-400" />,
    title: 'Anàlisi del proper rival',
    desc: 'Goleadors, jugadors amb més minuts, apercibits i timing de gols del rival de la setmana que ve.',
    href: '/cerca',
    accent: 'cyan',
  },
  {
    icon: <FileText size={22} className="text-green-400" />,
    title: 'Notes de partits',
    desc: 'Pren apunts durant els partits i obtén estadístiques personalitzades de la teva temporada.',
    href: '/dashboard/apunts',
    accent: 'green',
  },
  {
    icon: <AlertTriangle size={22} className="text-amber-400" />,
    title: 'Apercibits i sancions',
    desc: 'Jugadors propers a sanció del teu equip i del rival. Sàpigues qui no podrà jugar.',
    href: '/competicio/primera-catalana?tab=disciplina',
    accent: 'amber',
  },
  {
    icon: <Clock size={22} className="text-purple-400" />,
    title: 'Timing de gols',
    desc: 'En quins minuts marca i encaixa el teu equip. Detecta patrons tàctics.',
    href: '/cerca',
    accent: 'purple',
  },
  {
    icon: <Home size={22} className="text-sky-400" />,
    title: 'Local vs Visitant',
    desc: 'Rendiment separat com a local i visitant. Coneix els teus punts forts.',
    href: '/cerca',
    accent: 'sky',
  },
  {
    icon: <Target size={22} className="text-yellow-400" />,
    title: 'Golejadors i plantilla',
    desc: 'Rànquing de golejadors amb partits, minuts i targetes del teu equip.',
    href: '/cerca',
    accent: 'yellow',
  },
]

const ACCENT_BORDERS: Record<string, string> = {
  cyan: 'hover:border-cyan-500/30',
  green: 'hover:border-green-500/30',
  amber: 'hover:border-amber-500/30',
  purple: 'hover:border-purple-500/30',
  sky: 'hover:border-sky-500/30',
  yellow: 'hover:border-yellow-500/30',
}

export default function FeaturedSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-20 mb-24">

      {/* ─── Features grid ─── */}
      <div>
        <div className="text-center mb-12 section-accent-center reveal">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Tot el que necessites per <span className="gradient-text-hero">preparar el partit</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Dades extretes de les actes oficials de la FCF. Gratis per a tots els entrenadors.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(item => (
            <Link
              key={item.title}
              href={item.href}
              className={`group card-elevated rounded-2xl p-6 ${ACCENT_BORDERS[item.accent] || 'hover:border-green-500/30'} transition-all duration-300 reveal`}
            >
              <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                {item.icon}
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-green-400 transition-colors mb-2">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Competitions ─── */}
      <div className="reveal">
        <div className="flex items-center justify-between mb-6 section-accent">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy size={20} className="text-green-400" />
            Competicions cobertes
          </h2>
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {COMPETITIONS.map((c, i) => (
            <Link
              key={c.slug}
              href={`/competicio/${c.slug}`}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/6 hover:border-green-500/25 transition-all group"
            >
              <div className={`w-1.5 h-8 rounded-full bg-gradient-to-b ${TIER_COLORS[i] || 'from-slate-500 to-slate-600'} shrink-0`} />
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors truncate">{c.name}</span>
            </Link>
          ))}
        </div>
      </div>

    </section>
  )
}
