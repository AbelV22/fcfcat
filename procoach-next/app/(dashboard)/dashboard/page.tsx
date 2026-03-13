import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { BarChart3, Shield, Users, Calendar, Trophy, ArrowRight, Settings } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const clubName = user.user_metadata?.club_name || user.email?.split('@')[0] || 'El teu equip'

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Dashboard header */}
      <header className="border-b border-white/8 bg-[#0a1628]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
              <Trophy size={16} className="text-white" />
            </div>
            <span className="font-bold text-white">FutLab <span className="text-slate-400 font-normal text-sm">· Pro Dashboard</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 hidden sm:block">{user.email}</span>
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Tornar a l&apos;inici →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">

        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white mb-2">
            Bon dia, <span className="gradient-text">{clubName}</span> 👋
          </h1>
          <p className="text-slate-400">Aquí tens el teu panell de scouting intel·ligent.</p>
        </div>

        {/* Setup CTA if no team configured */}
        <div className="glass-card rounded-2xl p-8 mb-8 border-green-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-green-500/15 flex items-center justify-center shrink-0">
              <Settings size={24} className="text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">Configura el teu equip</h2>
              <p className="text-slate-400 text-sm">
                Cerca el teu equip a la FCF i activa l&apos;anàlisi complet: actes, intel·ligència de rivals, informes arbitrals i molt més.
              </p>
            </div>
            <Link
              href="/dashboard/setup"
              className="shrink-0 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600
                         hover:from-green-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all"
            >
              Configurar ara
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: <BarChart3 size={22} className="text-green-400" />,
              title: 'Intel·ligència de l\'equip',
              desc: 'Estadístiques detallades de tots els teus jugadors per temporada.',
              href: '/dashboard/intel',
              badge: null,
            },
            {
              icon: <Users size={22} className="text-cyan-400" />,
              title: 'Anàlisi del rival',
              desc: 'XI probable, goleadors, patrons de joc i targetes de l\'equip rival.',
              href: '/dashboard/rival',
              badge: null,
            },
            {
              icon: <Shield size={22} className="text-purple-400" />,
              title: 'Informe arbitral complet',
              desc: 'Percentils, patrons per període i historial del pròxim àrbitre.',
              href: '/dashboard/arbitre-pro',
              badge: 'PRO',
            },
            {
              icon: <Calendar size={22} className="text-amber-400" />,
              title: 'Calendari i resultats',
              desc: 'Tots els partits de la teva categoria amb resultats actualitzats.',
              href: '/dashboard/calendari',
              badge: null,
            },
            {
              icon: <Trophy size={22} className="text-yellow-400" />,
              title: 'Classificació',
              desc: 'La taula de classificació del teu grup en temps real.',
              href: '/dashboard/classificacio',
              badge: null,
            },
            {
              icon: <Settings size={22} className="text-slate-400" />,
              title: 'Gestió de la plantilla',
              desc: 'Disponibilitat, sancions i convocatòries del teu equip.',
              href: '/dashboard/equip-gestio',
              badge: null,
            },
          ].map(card => (
            <Link
              key={card.href}
              href={card.href}
              className="glass-card rounded-2xl p-6 hover:border-green-500/30 transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  {card.icon}
                </div>
                {card.badge && (
                  <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/25 rounded-full font-bold">
                    {card.badge}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-white mb-1 group-hover:text-green-400 transition-colors">{card.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
