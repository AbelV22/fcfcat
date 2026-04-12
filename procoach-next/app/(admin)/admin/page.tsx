import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isAdminUser, clearAdminCookie } from '@/lib/admin-auth'

async function logoutAdmin() {
  'use server'
  await clearAdminCookie()
  redirect('/admin/login')
}

export default async function AdminPage() {
  const isAdmin = await isAdminUser()
  if (!isAdmin) redirect('/admin/login')

  const now = new Date()
  const dateStr = now.toLocaleDateString('ca-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#0f1011] text-white">
      {/* Top nav */}
      <nav className="border-b border-white/8 bg-[#0a1120]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <span className="font-black text-green-400 text-sm">NeoScout Admin</span>
          <span className="text-white/10">|</span>
          <Link href="/" className="text-xs text-[#8a8f98] hover:text-[#d0d6e0] transition-colors">
            ← Tornar al lloc
          </Link>
          <div className="ml-auto">
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#8a8f98] hover:text-white transition-all"
              >
                Tancar sessió
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">Admin NeoScout</h1>
          <p className="text-sm text-[#8a8f98] capitalize">{dateStr}</p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Dashboard Pro */}
          <Link
            href="/dashboard"
            className="group bg-white/4 hover:bg-white/7 border border-white/8 hover:border-[#22c55e]/30 rounded-lg p-6 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#22c55e]/15 border border-[#22c55e]/20 flex items-center justify-center mb-4 group-hover:bg-[#34d399]/25 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-[#22c55e]" aria-hidden="true">
                <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
            </div>
            <h2 className="font-bold text-white text-sm mb-1">Dashboard Pro</h2>
            <p className="text-xs text-[#8a8f98] leading-relaxed">
              Accés complet al panell d&apos;usuari sense compte. Intel·ligència, rivals, àrbitres i calendari.
            </p>
            <div className="mt-4 text-xs text-[#22c55e] font-semibold group-hover:text-[#22c55e] transition-colors">
              Accedir →
            </div>
          </Link>

          {/* Cerca */}
          <Link
            href="/cerca"
            className="group bg-white/4 hover:bg-white/7 border border-white/8 hover:border-purple-500/30 rounded-lg p-6 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/25 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-purple-400" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h2 className="font-bold text-white text-sm mb-1">Cerca global</h2>
            <p className="text-xs text-[#8a8f98] leading-relaxed">
              Cerca equips, àrbitres i jugadors. Accés a tots els informes complets.
            </p>
            <div className="mt-4 text-xs text-purple-400 font-semibold group-hover:text-purple-300 transition-colors">
              Cercar →
            </div>
          </Link>

          {/* Gestió de Referits */}
          <Link
            href="/admin/referrals"
            className="group bg-white/4 hover:bg-white/7 border border-white/8 hover:border-amber-500/30 rounded-lg p-6 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:bg-amber-500/25 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-amber-400" aria-hidden="true">
                <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
            </div>
            <h2 className="font-bold text-white text-sm mb-1">Gestió de Referits</h2>
            <p className="text-xs text-[#8a8f98] leading-relaxed">
              Veure referits, ajustar comptadors, donar PRO manual. Control total del sistema de referits.
            </p>
            <div className="mt-4 text-xs text-amber-400 font-semibold group-hover:text-amber-300 transition-colors">
              Gestionar →
            </div>
          </Link>

          {/* Gestió de Camps */}
          <Link
            href="/admin/camps"
            className="group bg-white/4 hover:bg-white/7 border border-white/8 hover:border-green-500/30 rounded-lg p-6 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center mb-4 group-hover:bg-green-500/25 transition-colors">
              {/* Map/field icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-400"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
            </div>
            <h2 className="font-bold text-white text-sm mb-1">Gestió de Camps</h2>
            <p className="text-xs text-[#8a8f98] leading-relaxed">
              Afegir i editar dimensions de camps de futbol. Dades per a la comparativa de camps de l'informe d'equip.
            </p>
            <div className="mt-4 text-xs text-green-400 font-semibold group-hover:text-green-300 transition-colors">
              Gestionar →
            </div>
          </Link>
        </div>

        {/* Info box */}
        <div className="mt-8 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
          <p className="text-xs text-amber-400/80">
            <span className="font-semibold text-amber-400">Nota:</span>{' '}
            Les modificacions de dades locals (camps, etc.) requereixen un commit i push per publicar-se al servidor.
          </p>
        </div>
      </main>
    </div>
  )
}
