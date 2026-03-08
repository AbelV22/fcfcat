import Link from 'next/link'
import { ArrowRight, Lock, BarChart3, Users, Shield, CheckCircle2 } from 'lucide-react'

const FREE_FEATURES = [
  'Classificacions de totes les categories',
  'Resultats i estadístiques de partits',
  'Perfils bàsics de jugadors',
  'Perfils bàsics d\'àrbitres',
  'Top goleadors per grup',
  'Perfil de jugador (reclama el teu)',
]

const PRO_FEATURES = [
  'Informe arbitral complet amb percentils',
  'Anàlisi rival: XI probable, patrons de gol',
  'Alertes de sancions i apercibits',
  'Scouting platform per a ojeadors',
  'Exportació de reports en PDF',
  'Actualitzacions setmanals automàtiques',
]

export default function CoachCTA() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-32">
      <div className="relative rounded-3xl overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-950/80 via-slate-900 to-cyan-950/60 border border-green-500/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />

        <div className="relative p-8 sm:p-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/15 border border-green-500/25 rounded-full text-green-400 text-xs font-medium mb-6">
                <Lock size={10} />
                Per a entrenadors i ojeadors
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
                Porta el teu anàlisi al
                <span className="gradient-text"> següent nivell</span>
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Accedeix a informes arbitrals complets, anàlisi de rivals, alertes de
                sancions i molt més. Tot el que necessites per preparar cada partit.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/registre"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600
                             hover:from-green-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all
                             shadow-lg shadow-green-900/30"
                >
                  Crea el teu compte gratuït
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-white/15
                             hover:bg-white/5 text-slate-300 hover:text-white font-medium rounded-xl transition-all"
                >
                  Inicia sessió
                </Link>
              </div>
            </div>

            {/* Right: feature comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Free */}
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center">
                    <span className="text-xs text-white font-bold">G</span>
                  </div>
                  <span className="font-bold text-slate-200">Gratuït</span>
                  <span className="ml-auto text-xs text-slate-500">per a tothom</span>
                </div>
                <ul className="space-y-2">
                  {FREE_FEATURES.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                      <CheckCircle2 size={12} className="text-slate-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro */}
              <div className="relative rounded-2xl p-5 bg-gradient-to-br from-green-950/60 to-slate-900 border border-green-500/30">
                <div className="absolute top-3 right-3">
                  <span className="text-xs px-2 py-0.5 bg-green-500 text-white rounded-full font-bold">PRO</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-xs text-white font-bold">P</span>
                  </div>
                  <span className="font-bold text-white">Premium</span>
                </div>
                <ul className="space-y-2">
                  {PRO_FEATURES.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 size={12} className="text-green-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom: icon row */}
          <div className="mt-12 pt-8 border-t border-white/8 flex flex-wrap justify-center gap-8">
            {[
              { icon: <BarChart3 size={20} className="text-green-400" />, label: 'Estadístiques avançades' },
              { icon: <Shield size={20} className="text-cyan-400" />, label: 'Informes arbitrals complets' },
              { icon: <Users size={20} className="text-purple-400" />, label: 'Scouting de jugadors' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 text-sm text-slate-400">
                {item.icon}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
