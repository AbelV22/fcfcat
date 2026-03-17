import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function logoutAdmin() {
  'use server'
  const cookieStore = await cookies()
  cookieStore.delete('ns_admin')
  redirect('/admin/login')
}

export default async function AdminPage() {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get('ns_admin')?.value === '1'
  if (!isAdmin) redirect('/admin/login')

  const now = new Date()
  const dateStr = now.toLocaleDateString('ca-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Top nav */}
      <nav className="border-b border-white/8 bg-[#0a1120]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <span className="font-black text-green-400 text-sm">NeoScout Admin</span>
          <span className="text-white/10">|</span>
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Tornar al lloc
          </Link>
          <div className="ml-auto">
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all"
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
          <p className="text-sm text-slate-500 capitalize">{dateStr}</p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Gestió de Camps */}
          <Link
            href="/admin/camps"
            className="group bg-white/4 hover:bg-white/7 border border-white/8 hover:border-green-500/30 rounded-2xl p-6 transition-all"
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
            <p className="text-xs text-slate-500 leading-relaxed">
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
