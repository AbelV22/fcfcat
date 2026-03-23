import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function CoachCTA() {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-32 reveal">
      <div className="relative rounded-3xl overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/60 via-[#111827] to-slate-900" />
        <div className="absolute inset-0 border border-white/[0.08] rounded-3xl" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

        <div className="relative p-8 sm:p-12 lg:p-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
            Comença a preparar els teus
            <span className="gradient-text-hero"> partits avui</span>
          </h2>
          <p className="text-slate-400 mb-8 leading-relaxed text-sm sm:text-base max-w-lg mx-auto">
            Registra el teu equip i accedeix a totes les dades de la teva competició.
            Gratis per a tots els entrenadors del futbol català.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/entrenador"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900
                         font-semibold rounded-xl transition-all hover:bg-emerald-50
                         hover:shadow-[0_0_30px_rgba(52,211,153,0.15)] text-base"
            >
              Afegeix el teu equip — Gratis
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/15
                         hover:bg-white/5 text-slate-300 hover:text-white font-medium rounded-xl transition-all"
            >
              Accés entrenadors
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
