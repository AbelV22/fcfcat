import Link from 'next/link'
import Image from 'next/image'
import { Heart, Settings } from 'lucide-react'

export default function PublicFooter() {
  return (
    <footer className="relative bg-[#080f1e]">
      {/* Glow divider instead of plain border */}
      <div className="absolute top-0 left-0 right-0 glow-divider" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">

        {/* Brand row — always full width on mobile */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <Image src="/logo_neoscout.png" alt="NeoScout logo" width={28} height={28} className="w-7 h-7 rounded-lg object-cover" />
              <span className="font-display font-bold text-white">Neo<span className="text-emerald-400">Scout</span></span>
            </Link>
            <p className="text-xs text-[#8a8f98] leading-relaxed max-w-[220px]">
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
            <h4 className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-wider mb-3">Competicions</h4>
            <ul className="space-y-2">
              {[
                { label: 'Primera Catalana', href: '/competicio/primera-catalana' },
                { label: 'Segona Catalana', href: '/competicio/segona-catalana' },
                { label: 'Tercera Catalana', href: '/competicio/tercera-catalana' },
                { label: 'Quarta Catalana', href: '/competicio/quarta-catalana' },
                { label: 'Preferent Juvenil', href: '/competicio/preferent-juvenils' },
                { label: 'Juvenil 1a Divisió', href: '/competicio/juvenil-primera-divisio' },
              ].map(c => (
                <li key={c.href}>
                  <Link href={c.href} className="text-xs sm:text-sm text-[#8a8f98] hover:text-[#d0d6e0] transition-colors">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Plataforma */}
          <div>
            <h4 className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-wider mb-3">Plataforma</h4>
            <ul className="space-y-2">
              {[
                { label: 'Equips', href: '/cerca?type=equip' },
                { label: 'Àrbitres', href: '/cerca?type=arbitre' },
                { label: 'Jugadors', href: '/cerca?type=jugador' },
                { label: 'Resultats', href: '/resultats' },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-xs sm:text-sm text-[#8a8f98] hover:text-[#d0d6e0] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Per a entrenadors */}
          <div>
            <h4 className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-wider mb-3">Entrenadors</h4>
            <ul className="space-y-2">
              {[
                { label: 'Registra equip', href: '/entrenador' },
                { label: 'Inicia sessió', href: '/login' },
                { label: 'Dashboard', href: '/dashboard' },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-xs sm:text-sm text-[#8a8f98] hover:text-[#d0d6e0] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* SEO text — visible, small, keyword-rich */}
        <div className="pt-6 border-t border-white/8 mb-6">
          <p className="text-[11px] text-[#62666d] leading-relaxed max-w-3xl">
            NeoScout és la plataforma d&apos;estadístiques i resultats del futbol català. Consulta la classificació, resultats, golejadors, àrbitres i disciplina de totes les competicions de la Federació Catalana de Futbol (FCF): Segona Catalana, Tercera Catalana, Primera Catalana, Preferent Juvenil, Juvenil Primera Divisió, Quarta Catalana, Lliga Elit i totes les categories de futbol base. Dades actualitzades setmanalment amb informació de les actes oficials de la temporada 2025/26.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-[#62666d]">
            © 2025-2026 NeoScout · Dades no oficials extretes de fcf.cat
          </p>
          <p className="text-xs text-[#62666d] flex items-center gap-1">
            Fet amb <Heart size={12} className="text-red-500" /> per al futbol catala
          </p>
          <Link href="/admin/login" className="text-[#62666d] hover:text-[#8a8f98] transition-colors"><Settings size={14} /></Link>
        </div>
      </div>
    </footer>
  )
}
