import Link from 'next/link'
import { Trophy } from 'lucide-react'

export default function PublicFooter() {
  return (
    <footer className="border-t border-white/8 bg-[#080f1e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
                <Trophy size={14} className="text-white" />
              </div>
              <span className="font-bold text-white">Fut<span className="text-green-400">Lab</span></span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed">
              La plataforma de referència del futbol regional català. Dades extretes de FCF.cat.
            </p>
          </div>

          {/* Competicions */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Competicions</h4>
            <ul className="space-y-2">
              {['Primera Catalana', 'Segona Catalana', 'Preferent Catalana', 'Divisió d\'Honor'].map(c => (
                <li key={c}>
                  <Link
                    href={`/competicio/${c.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`}
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Plataforma */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Plataforma</h4>
            <ul className="space-y-2">
              {[
                { label: 'Cerca equipos', href: '/cerca?type=equip' },
                { label: 'Àrbitres', href: '/cerca?type=arbitre' },
                { label: 'Jugadors', href: '/cerca?type=jugador' },
                { label: 'Últims resultats', href: '/resultats' },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Per a entrenadors */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Entrenadors</h4>
            <ul className="space-y-2">
              {[
                { label: 'Inicia sessió', href: '/login' },
                { label: 'Crea compte', href: '/registre' },
                { label: 'Dashboard', href: '/dashboard' },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            © 2025 FutLab · Dades no oficials extretes de fcf.cat
          </p>
          <p className="text-xs text-slate-600">
            Fet amb ❤️ per al futbol català
          </p>
        </div>
      </div>
    </footer>
  )
}
