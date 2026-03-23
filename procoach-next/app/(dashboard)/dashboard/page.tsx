import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { BarChart3, Shield, Users, Trophy, ArrowRight, Settings, ClipboardList, RefreshCw } from 'lucide-react'
import { getDashboardTeam } from '@/lib/dashboard-auth'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get('ns_admin')?.value === '1'

  let userName = 'Entrenador'
  const team = await getDashboardTeam()

  if (!isAdmin) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Entrenador'
  } else {
    userName = 'Admin'
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12">

        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white mb-2">
            Bon dia, <span className="gradient-text">{userName}</span>
          </h1>
          {team ? (
            <p className="text-slate-400">
              Panell de scouting de <span className="text-white font-medium">{team.name}</span>.
            </p>
          ) : (
            <p className="text-slate-400">Configura el teu equip per activar totes les funcionalitats.</p>
          )}
        </div>

        {/* Setup CTA / Change team */}
        <div className="glass-card rounded-2xl p-8 mb-8 border-green-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-green-500/15 flex items-center justify-center shrink-0">
              {team ? <RefreshCw size={24} className="text-green-400" /> : <Settings size={24} className="text-green-400" />}
            </div>
            <div className="flex-1">
              {team ? (
                <>
                  <h2 className="text-xl font-bold text-white mb-1">Equip configurat: <span className="text-green-400">{team.name}</span></h2>
                  <p className="text-slate-400 text-sm">{team.competition}</p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-white mb-1">Configura el teu equip</h2>
                  <p className="text-slate-400 text-sm">
                    Cerca el teu equip a la FCF i activa l&apos;anàlisi complet: actes, intel·ligència de rivals, informes arbitrals i molt més.
                  </p>
                </>
              )}
            </div>
            <Link
              href="/dashboard/setup"
              className="shrink-0 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600
                         hover:from-green-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all"
            >
              {team ? 'Canviar equip' : 'Configurar ara'}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: <BarChart3 size={22} className="text-green-400" />,
              title: "Intel·ligència de l'equip",
              desc: 'Estadístiques detallades de tots els teus jugadors per temporada.',
              href: '/dashboard/intel',
              badge: null,
            },
            {
              icon: <Users size={22} className="text-cyan-400" />,
              title: 'Anàlisi del rival',
              desc: "XI probable, goleadors, patrons de joc i targetes de l'equip rival.",
              href: '/dashboard/rival',
              badge: null,
            },
            {
              icon: <Shield size={22} className="text-purple-400" />,
              title: 'Informe arbitral complet',
              desc: "Percentils, patrons per període i historial del pròxim àrbitre.",
              href: '/dashboard/arbitre-pro',
              badge: 'PRO',
            },
            {
              icon: <Shield size={22} className="text-amber-400" />,
              title: 'Equips',
              desc: 'Cerca i explora tots els equips de les competicions FCF.',
              href: '/entrenador',
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
              icon: <ClipboardList size={22} className="text-emerald-400" />,
              title: 'Apunts de Partit',
              desc: 'Registra lineups, esdeveniments, valoracions i notes tàctiques de cada partit.',
              href: '/dashboard/apunts',
              badge: 'NOU',
            },
            {
              icon: <Settings size={22} className="text-slate-400" />,
              title: 'Gestió de la plantilla',
              desc: "Disponibilitat, sancions i convocatòries del teu equip.",
              href: '/dashboard/equip-gestio',
              badge: null,
            },
          ].map(card => (
            <Link
              key={card.href + card.title}
              href={card.href}
              className="glass-card rounded-2xl p-6 hover:border-green-500/30 transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  {card.icon}
                </div>
                {card.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    card.badge === 'NOU'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/25'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/25'
                  }`}>
                    {card.badge}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-white mb-1 group-hover:text-green-400 transition-colors">{card.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
            </Link>
          ))}
        </div>
      </div>
  )
}
