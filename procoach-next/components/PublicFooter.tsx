import Link from 'next/link'
import Image from 'next/image'

export default function PublicFooter() {
  return (
    <footer className="border-t border-white/8 bg-[#080f1e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">

        {/* Brand row — always full width on mobile */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <Image src="/logo_neoscout.png" alt="" width={28} height={28} className="w-7 h-7 rounded-lg object-cover" />
              <span className="font-bold text-white">Neo<span className="text-green-400">Scout</span></span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
              La plataforma del futbol regional català. Dades de FCF.cat.
            </p>
          </div>
          {/* Quick CTA on mobile */}
          <Link
            href="/entrenador"
            className="text-xs px-3 py-2 bg-green-600/20 text-green-400 border border-green-500/25 rounded-xl font-semibold hover:bg-green-600/30 transition-colors shrink-0 ml-4"
          >
            Entrenadors →
          </Link>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-6 mb-8">

          {/* Competicions */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Competicions</h4>
            <ul className="space-y-2">
              {[
                { label: '1a Catalana', href: '/competicio/primera-catalana' },
                { label: '2a Catalana', href: '/competicio/segona-catalana' },
                { label: '3a Catalana', href: '/competicio/tercera-catalana' },
                { label: 'Pref. Juvenil', href: '/competicio/preferent-juvenils' },
              ].map(c => (
                <li key={c.href}>
                  <Link href={c.href} className="text-xs sm:text-sm text-slate-500 hover:text-slate-300 transition-colors">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Plataforma */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Plataforma</h4>
            <ul className="space-y-2">
              {[
                { label: 'Equips', href: '/cerca?type=equip' },
                { label: 'Àrbitres', href: '/cerca?type=arbitre' },
                { label: 'Jugadors', href: '/cerca?type=jugador' },
                { label: 'Resultats', href: '/resultats' },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-xs sm:text-sm text-slate-500 hover:text-slate-300 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Per a entrenadors */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Entrenadors</h4>
            <ul className="space-y-2">
              {[
                { label: 'Registra equip', href: '/entrenador' },
                { label: 'Inicia sessió', href: '/login' },
                { label: 'Dashboard', href: '/dashboard' },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-xs sm:text-sm text-slate-500 hover:text-slate-300 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-600">
            © 2025 NeoScout · Dades no oficials extretes de fcf.cat
          </p>
          <p className="text-xs text-slate-600">
            Fet amb ❤️ per al futbol català
          </p>
        </div>
      </div>
    </footer>
  )
}
