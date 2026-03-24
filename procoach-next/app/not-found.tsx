import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <PublicHeader />
      <main className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="text-8xl font-black gradient-text mb-4">404</div>
        <h1 className="text-2xl font-black text-white mb-3">Pàgina no trobada</h1>
        <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
          La pàgina que busques no existeix o ha estat moguda. Prova a cercar el que necessites.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/cerca"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all"
          >
            Cerca equips i jugadors
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl transition-all"
          >
            Torna a l&apos;inici
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
