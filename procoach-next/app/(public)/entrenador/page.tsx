'use client'

import { useState } from 'react'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import { ListOrdered, Shield, TrendingUp, Users, CheckCircle, Star, Zap } from 'lucide-react'

const COMPETITIONS = [
  'Primera Catalana', 'Segona Catalana', 'Tercera Catalana', 'Quarta Catalana',
  'Lliga Elit', 'Tercera Federació',
  'Divisió Honor Juvenil', 'Lliga Nacional Juvenil', 'Preferent Juvenil', 'Juvenil Primera Divisió',
  'Divisió Honor Cadet S16', 'Preferent Cadet S16', 'Divisió Honor Cadet S15', 'Preferent Cadet S15',
  'Divisió Honor Infantil S14', 'Preferent Infantil S14', 'Divisió Honor Infantil S13', 'Preferent Infantil S13',
]

const FREE_FEATURES = [
  { icon: Shield, text: 'Informes bàsics dels àrbitres que us arbitren' },
  { icon: TrendingUp, text: 'Estadístiques de la temporada del teu equip' },
  { icon: Users, text: 'Perfil públic dels teus jugadors' },
  { icon: ListOrdered, text: 'Resultats i classificació en temps real' },
]

const PRO_FEATURES = [
  { icon: Shield, text: 'Informe arbitral complet amb historial i tendències' },
  { icon: TrendingUp, text: 'Anàlisi tàctica del rival (formació, gols, targetes)' },
  { icon: Zap, text: 'Alertes automàtiques quan es confirmi l\'àrbitre del proper partit' },
  { icon: Star, text: 'Comparativa àrbitre vs la resta de la categoria' },
]

export default function EntrenadorPage() {
  const [form, setForm] = useState({ team: '', competition: '', email: '', name: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.team || !form.competition || !form.email) return
    // Redirect to full signup page with pre-filled data
    const params = new URLSearchParams({
      team: form.team,
      competition: form.competition,
      email: form.email,
      ...(form.name ? { name: form.name } : {}),
    })
    window.location.href = `/registre?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <PublicHeader />

      {/* Hero — Gancho arbitro */}
      <div className="bg-gradient-to-b from-[#0a1628] to-[#0f172a] border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-semibold mb-5">
            <Shield size={12} />
            INFORME ARBITRAL · GRATIS
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 leading-tight">
            Saps qui t&apos;arbitrar&agrave;{' '}
            <span className="bg-gradient-to-r from-amber-400 to-red-400 bg-clip-text text-transparent">
              aquest cap de setmana?
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-4">
            Descobreix si el teu &agrave;rbitre &eacute;s estricte o permissiu abans del partit.
            Informe complet amb hist&ograve;ric, tend&egrave;ncies i percentils.
          </p>
          <p className="text-sm text-slate-500 max-w-lg mx-auto mb-8">
            + An&agrave;lisi del rival, XI probable, goleadors, patrons de gol i molt m&eacute;s. Tot gratis.
          </p>
          <div className="flex flex-col xs:flex-row items-center justify-center gap-3">
            <Link
              href="/registre"
              className="w-full xs:w-auto px-6 sm:px-8 py-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/30 text-base sm:text-lg text-center"
            >
              Descobreix el teu &agrave;rbitre — Gratis
            </Link>
            <Link
              href="/cerca"
              className="w-full xs:w-auto px-5 sm:px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium rounded-xl transition-all text-center text-sm sm:text-base"
            >
              Explorar la plataforma
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-14 sm:space-y-20">

        {/* Free vs Pro */}
        <div>
          <h2 className="text-2xl font-bold text-center mb-3">Tot el que obtens gratis</h2>
          <p className="text-slate-400 text-center mb-10">Sense necessitat de compte. Registra el teu equip i accedeix immediatament.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {FREE_FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3 bg-white/4 border border-green-500/10 rounded-xl p-4">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                  <f.icon size={16} className="text-green-400" />
                </div>
                <p className="text-sm text-slate-300">{f.text}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star size={18} className="text-amber-400" />
              <span className="font-semibold text-amber-400">Aviat disponible — Versió Pro</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRO_FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-400">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Social proof */}
        <div className="text-center">
          <div className="grid grid-cols-2 sm:flex sm:justify-center gap-6 sm:gap-10">
            {[
              { value: '1.400+', label: 'Partits analitzats' },
              { value: '200+', label: 'Àrbitres al sistema' },
              { value: '6', label: 'Categories FCF' },
              { value: '100%', label: 'Gratis per entrenadors' },
            ].map(s => (
              <div key={s.label} className="text-center py-4 bg-white/3 sm:bg-transparent border sm:border-0 border-white/6 rounded-2xl sm:rounded-none px-4 sm:px-0">
                <div className="text-2xl sm:text-3xl font-bold text-green-400">{s.value}</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Registration form */}
        <div id="registre" className="bg-white/4 border border-white/10 rounded-2xl p-5 sm:p-8">
          <>
            <h2 className="text-2xl font-bold mb-2 text-center">Descobreix el teu &agrave;rbitre</h2>
            <p className="text-slate-400 text-center text-sm mb-8">Registra&apos;t gratis i accedeix a informes arbitrals, an&agrave;lisi de rivals i molt m&eacute;s.</p>
              <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Nom de l&apos;equip *</label>
                  <input
                    type="text"
                    value={form.team}
                    onChange={e => setForm(f => ({ ...f, team: e.target.value }))}
                    placeholder="Ex: CE Mollet A"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Competició *</label>
                  <select
                    value={form.competition}
                    onChange={e => setForm(f => ({ ...f, competition: e.target.value }))}
                    required
                    className="w-full px-4 py-3 bg-[#1e293b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50 transition-all"
                  >
                    <option value="">Selecciona la competició...</option>
                    {COMPETITIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">El teu nom *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nom i cognoms"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="entrenador@exemple.com"
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/30 text-lg mt-2"
                >
                  Continuar i crear compte →
                </button>
                <p className="text-xs text-slate-600 text-center">
                  Sense spam. Les teves dades no es compartiran amb tercers.
                </p>
              </form>
          </>
        </div>

      </div>

      <footer className="border-t border-white/5 mt-8 py-8 text-center text-sm text-slate-600">
        <p>NeoScout · Estadístiques del futbol català · Temporada 2025/26</p>
      </footer>
    </div>
  )
}
