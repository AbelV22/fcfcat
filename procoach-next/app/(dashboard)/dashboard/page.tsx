import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { BarChart3, Shield, Users, ListOrdered, ArrowRight, Settings, ClipboardList, RefreshCw, Dumbbell } from 'lucide-react'
import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const isAdmin = await isAdminUser()

  const team = await getDashboardTeam()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!isAdmin && !user) redirect('/login')

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || (isAdmin ? 'Admin' : 'Entrenador')

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6" style={{ paddingTop: 32, paddingBottom: 48, fontFamily: 'var(--font-inter)' }}>

        {/* Welcome */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', marginBottom: 8 }}>
            Bon dia, <span style={{ color: '#22c55e' }}>{userName}</span>
          </h1>
          {team ? (
            <p style={{ fontSize: 14, color: '#8a8f98' }}>
              Panell de scouting de <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{team.name}</span>.
            </p>
          ) : (
            <p style={{ fontSize: 14, color: '#8a8f98' }}>Configura el teu equip per activar totes les funcionalitats.</p>
          )}
        </div>

        {/* Setup CTA / Change team */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: '24px 28px', marginBottom: 24,
        }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center" style={{ gap: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 8, flexShrink: 0,
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {team ? <RefreshCw size={20} style={{ color: '#22c55e' }} /> : <Settings size={20} style={{ color: '#22c55e' }} />}
            </div>
            <div style={{ flex: 1 }}>
              {team ? (
                <>
                  <h2 style={{ fontSize: 16, fontWeight: 510, color: '#f7f8f8', marginBottom: 4 }}>
                    Equip configurat: <span style={{ color: '#22c55e' }}>{team.name}</span>
                  </h2>
                  <p style={{ fontSize: 13, color: '#8a8f98' }}>{team.competition}</p>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: 16, fontWeight: 510, color: '#f7f8f8', marginBottom: 4 }}>Configura el teu equip</h2>
                  <p style={{ fontSize: 13, color: '#8a8f98' }}>
                    Cerca el teu equip a la FCF i activa l&apos;anàlisi complet: actes, intel·ligència de rivals, informes arbitrals i molt més.
                  </p>
                </>
              )}
            </div>
            <Link
              href="/dashboard/setup"
              className="hover:bg-[#34d399]"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0,
                padding: '10px 20px', borderRadius: 6,
                background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 510,
                textDecoration: 'none', transition: 'background 0.15s',
              }}
            >
              {team ? 'Canviar equip' : 'Configurar ara'}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 12 }}>
          {[
            { icon: BarChart3, title: "Intel·ligència de l'equip", desc: 'Estadístiques detallades de tots els teus jugadors per temporada.', href: '/dashboard/intel', badge: null },
            { icon: Users, title: 'Anàlisi del rival', desc: "XI probable, goleadors, patrons de joc i targetes de l'equip rival.", href: '/dashboard/rival', badge: null },
            { icon: Shield, title: 'Informe arbitral complet', desc: "Percentils, patrons per període i historial del pròxim àrbitre.", href: '/dashboard/arbitre-pro', badge: null },
            { icon: Shield, title: 'Equips', desc: 'Cerca i explora tots els equips de les competicions FCF.', href: '/entrenador', badge: null },
            { icon: ListOrdered, title: 'Classificació', desc: 'La taula de classificació del teu grup en temps real.', href: '/dashboard/classificacio', badge: null },
            { icon: ClipboardList, title: 'Apunts de Partit', desc: 'Registra lineups, esdeveniments, valoracions i notes tàctiques de cada partit.', href: '/dashboard/apunts', badge: null },
            { icon: Dumbbell, title: 'Entrenaments', desc: 'Genera sessions automatiques, biblioteca de 74+ exercicis amb diagrames i calendari setmanal.', href: '/dashboard/entrenaments', badge: 'NOU' },
            { icon: Settings, title: 'Gestió de la plantilla', desc: "Disponibilitat, sancions i convocatòries del teu equip.", href: '/dashboard/equip-gestio', badge: null },
          ].map(card => {
            const Icon = card.icon
            return (
              <Link
                key={card.href + card.title}
                href={card.href}
                className="hover:border-[rgba(255,255,255,0.12)]"
                style={{
                  display: 'block', textDecoration: 'none',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8, padding: '20px',
                  transition: 'border-color 0.15s, transform 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={18} style={{ color: '#8a8f98' }} />
                  </div>
                  {card.badge && (
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 9999, fontWeight: 510,
                      background: card.badge === 'NOU' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)',
                      color: card.badge === 'NOU' ? '#22c55e' : '#8a8f98',
                      border: card.badge === 'NOU' ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                      {card.badge}
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 510, color: '#f7f8f8', marginBottom: 4 }}>{card.title}</h3>
                <p style={{ fontSize: 12, color: '#62666d', lineHeight: 1.5 }}>{card.desc}</p>
              </Link>
            )
          })}
        </div>
      </div>
  )
}
