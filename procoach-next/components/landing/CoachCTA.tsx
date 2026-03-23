import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function CoachCTA() {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-32 reveal">
      <div className="relative rounded-3xl overflow-hidden pitch-texture">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/70 via-[#0f1f35] to-slate-900" />
        <div className="absolute inset-0 border border-white/[0.09] rounded-3xl" />
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/6 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/4 rounded-full blur-3xl" />
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

        <div className="relative z-10 p-8 sm:p-12 lg:p-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-semibold uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Gratis per a tots els entrenadors
          </div>

          <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
            Comença a preparar els teus
            <span className="gradient-text-hero"> partits avui</span>
          </h2>
          <p className="text-slate-400 mb-10 leading-relaxed text-sm sm:text-base max-w-lg mx-auto">
            Registra el teu equip i accedeix a totes les dades de la teva competició.
            Actes oficials FCF, rivals, plantilla i notes de partits.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/entrenador"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900
                         font-semibold rounded-xl transition-all hover:bg-emerald-50
                         hover:shadow-[0_0_40px_rgba(52,211,153,0.2)] text-base"
            >
              Afegeix el teu equip — Gratis
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/[0.12]
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
