'use client'

import { useState } from 'react'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import { Trophy, Shield, TrendingUp, Users, CheckCircle, ChevronRight, Star, Zap } from 'lucide-react'

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
  { icon: Trophy, text: 'Resultats i classificació en temps real' },
]

const PRO_FEATURES = [
  { icon: Shield, text: 'Informe arbitral complet amb historial i tendències' },
  { icon: TrendingUp, text: 'Anàlisi tàctica del rival (formació, gols, targetes)' },
  { icon: Zap, text: 'Alertes automàtiques quan es confirmi l\'àrbitre del proper partit' },
  { icon: Star, text: 'Comparativa àrbitre vs la resta de la categoria' },
]

export default function EntrenadorPage() {
  const [form, setForm] = useState({ team: '', competition: '', email: '', name: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.team || !form.competition || !form.email) return
    setLoading(true)
    // Simple mailto fallback — replace with Supabase insert when DB is live
    await new Promise(r => setTimeout(r, 800))
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <PublicHeader />

      {/* Hero */}
      <div className="bg-gradient-to-b from-[#0a1628] to-[#0f172a] border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-semibold mb-6">
            <Zap size={12} />
            100% GRATIS · Sense targeta de crèdit
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            La plataforma per als<br />
            <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              entrenadors de futbol català
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            Afegeix el teu equip gratis. Accedeix a informes arbitrals, estadístiques de jugadors i anàlisi de rivals de tota la FCF.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="#registre" className="px-8 py-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/30 text-lg">
              Afegeix el teu equip — Gratis
            </a>
            <Link href="/cerca" className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium rounded-xl transition-all">
              Explorar la plataforma
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-20">

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
          <div className="flex justify-center gap-8 flex-wrap">
            {[
              { value: '1.400+', label: 'Partits analitzats' },
              { value: '200+', label: 'Àrbitres al sistema' },
              { value: '6', label: 'Categories FCF' },
              { value: '100%', label: 'Gratis per entrenadors' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-green-400">{s.value}</div>
                <div className="text-sm text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Registration form */}
        <div id="registre" className="bg-white/4 border border-white/10 rounded-2xl p-8">
          {sent ? (
            <div className="text-center py-8">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
              <h3 className="text-2xl font-bold mb-2">Rebut!</h3>
              <p className="text-slate-400">
                T'avisarem en 24h quan el teu equip estigui activat.<br />
                Mentrestant, explora la plataforma.
              </p>
              <Link href="/" className="inline-flex items-center gap-2 mt-6 text-green-400 hover:text-green-300 transition-colors">
                Explorar FutLab <ChevronRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2 text-center">Registra el teu equip</h2>
              <p className="text-slate-400 text-center text-sm mb-8">Gratuït. Sense compromisos. L'equip s'activa en menys de 24h.</p>
              <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Nom de l'equip *</label>
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 transition-all"
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/30 text-lg mt-2"
                >
                  {loading ? 'Enviant...' : 'Afegeix el teu equip — Gratis'}
                </button>
                <p className="text-xs text-slate-600 text-center">
                  Sense spam. Les teves dades no es compartiran amb tercers.
                </p>
              </form>
            </>
          )}
        </div>

      </div>

      <footer className="border-t border-white/5 mt-8 py-8 text-center text-sm text-slate-600">
        <p>FutLab · Estadístiques del futbol català · Temporada 2025/26</p>
      </footer>
    </div>
  )
}
