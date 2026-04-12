import Link from 'next/link'
import {
  ArrowRight, ListOrdered, Crosshair, AlertTriangle, Clock, Home,
  Target, FileText, Calendar,
} from 'lucide-react'

const COMPETITIONS = [
  // Adult
  { name: 'Tercera Federació', slug: 'tercera-federacio', tier: 0 },
  { name: 'Lliga Elit', slug: 'lliga-elit', tier: 0 },
  { name: 'Primera Catalana', slug: 'primera-catalana', tier: 1 },
  { name: 'Segona Catalana', slug: 'segona-catalana', tier: 2 },
  { name: 'Tercera Catalana', slug: 'tercera-catalana', tier: 3 },
  { name: 'Quarta Catalana', slug: 'quarta-catalana', tier: 4 },
  // Juvenil
  { name: 'Div. Honor Juvenil', slug: 'divisio-honor-juvenil', tier: 5 },
  { name: 'Lliga Nacional Juvenil', slug: 'lliga-nacional-juvenil', tier: 5 },
  { name: 'Preferent Juvenil', slug: 'preferent-juvenils', tier: 6 },
  { name: 'Juvenil 1a Divisió', slug: 'juvenil-primera-divisio', tier: 6 },
  // Cadet
  { name: 'Div. Honor Cadet S16', slug: 'divisio-honor-cadet-s16', tier: 7 },
  { name: 'Preferent Cadet S16', slug: 'preferent-cadet-s16', tier: 7 },
  // Infantil
  { name: 'Div. Honor Infantil S14', slug: 'divisio-honor-infantil-s14', tier: 7 },
  { name: 'Preferent Infantil S14', slug: 'preferent-infantil-s14', tier: 7 },
]

const TIER_COLORS = [
  'from-yellow-500 to-amber-400',
  'from-[#d0d6e0] to-[#8a8f98]',
  'from-amber-600 to-amber-700',
  'from-green-500 to-green-600',
  'from-teal-500 to-teal-600',
  'from-[#22c55e] to-[#22c55e]',
  'from-blue-500 to-blue-600',
  'from-indigo-500 to-indigo-600',
]

const FEATURES = [
  {
    icon: <Crosshair size={22} className="text-[#22c55e]" />,
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
  cyan: 'hover:border-[#22c55e]/30',
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
          <h2 className="font-headline text-3xl sm:text-4xl font-black text-white mb-3">
            Estadístiques del <span className="gradient-text-hero">futbol català</span>
          </h2>
          <p className="text-[#8a8f98] max-w-xl mx-auto text-sm sm:text-base">
            Classificació, resultats, golejadors, àrbitres i disciplina de totes les categories de la Federació Catalana de Futbol.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(item => (
            <Link
              key={item.title}
              href={item.href}
              className={`group card-elevated rounded-lg p-6 ${ACCENT_BORDERS[item.accent] || 'hover:border-green-500/30'} transition-all duration-300 reveal`}
            >
              <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                {item.icon}
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-green-400 transition-colors mb-2">{item.title}</h3>
              <p className="text-sm text-[#8a8f98] leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Competitions ─── */}
      <div className="reveal">
        <div className="flex items-center gap-2 mb-4 section-accent">
          <ListOrdered size={16} className="text-emerald-400" />
          <h2 className="font-headline text-lg font-bold text-white">Competicions del futbol català — Temporada 2025/26</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {COMPETITIONS.map((c, i) => (
            <Link
              key={c.slug}
              href={`/competicio/${c.slug}`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-emerald-500/25 transition-all group"
            >
              <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${TIER_COLORS[i] || 'from-[#8a8f98] to-[#62666d]'} shrink-0`} />
              <span className="text-xs sm:text-sm font-medium text-[#8a8f98] group-hover:text-white transition-colors truncate">{c.name}</span>
            </Link>
          ))}
        </div>
      </div>

    </section>
  )
}
