'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight, AlertTriangle, Target, Clock, Home } from 'lucide-react'
import Link from 'next/link'

const DEMO_SQUAD = [
  { name: 'GARCIA, MARC', apps: 20, goals: 8, yellows: 2, risk: false },
  { name: 'MARTINEZ, POL', apps: 18, goals: 3, yellows: 4, risk: true },
  { name: 'PÉREZ, JAN', apps: 17, goals: 0, yellows: 5, risk: true },
  { name: 'FERNANDEZ, TON', apps: 19, goals: 6, yellows: 1, risk: false },
]

const DEMO_RIVAL_SCORERS = [
  { name: 'LOPEZ, ADRIÀ', goals: 11 },
  { name: 'SÁNCHEZ, NOEL', goals: 7 },
  { name: 'RUIZ, SERGI', goals: 5 },
]

const DEMO_BUCKETS = [3, 5, 4, 7, 6, 9] // goals scored per period

export default function HeroSection() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/cerca?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const maxBucket = Math.max(...DEMO_BUCKETS)

  return (
    <section className="relative overflow-hidden pt-16 pb-24">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/8 rounded-full blur-3xl" />
        <div className="absolute top-10 right-1/4 w-80 h-80 bg-cyan-500/6 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-green-500/25 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(34,197,94,0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(34,197,94,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* ─── Left: Copy + Search ─── */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Temporada 2025-26 · Dades oficials FCF.cat
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight">
              <span className="text-white">Prepara cada</span>
              <br />
              <span className="bg-gradient-to-r from-green-400 via-cyan-400 to-green-300 bg-clip-text text-transparent">
                partit amb dades
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-slate-400 mb-4 leading-relaxed">
              Busca el teu equip i obtén l'informe complet de la teva plantilla i
              l'anàlisi del teu <strong className="text-slate-300">proper rival</strong> — goleadors,
              apercibits, timing de gols i classificació local/visitant.
            </p>

            <p className="text-sm text-slate-500 mb-10">
              Dades extretes de les actes oficials de la FCF. Gratis per a tots els entrenadors.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="mb-8">
              <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden
                              focus-within:border-green-500/50 focus-within:bg-white/7 transition-all
                              shadow-2xl shadow-black/40">
                <Search size={20} className="absolute left-5 text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Busca el teu equip..."
                  className="flex-1 pl-14 pr-4 py-5 bg-transparent text-white placeholder-slate-500 text-base
                             focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 m-2 px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600
                             hover:from-green-500 hover:to-cyan-500 text-white font-bold rounded-xl
                             transition-all flex items-center gap-2 shadow-lg shadow-green-900/30"
                >
                  Cerca
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>

            {/* Feature chips */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: <AlertTriangle size={12} className="text-amber-400" />, text: 'Apercibits i sancions' },
                { icon: <Target size={12} className="text-green-400" />, text: 'Goleadors i minutes' },
                { icon: <Clock size={12} className="text-cyan-400" />, text: 'Timing de gols' },
                { icon: <Home size={12} className="text-purple-400" />, text: 'Local vs Visitant' },
              ].map(item => (
                <div
                  key={item.text}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/8 rounded-full text-xs text-slate-400"
                >
                  {item.icon}
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          {/* ─── Right: Live demo preview card ─── */}
          <div className="relative hidden lg:block">
            {/* Glow */}
            <div className="absolute -inset-4 bg-gradient-to-br from-green-500/5 to-cyan-500/5 rounded-3xl blur-xl" />

            <div className="relative bg-[#0d1f38] border border-white/10 rounded-2xl p-5 shadow-2xl">
              {/* Team header */}
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/25 flex items-center justify-center font-black text-green-400 text-lg">
                  M
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm">Marianao Poblet UD A</div>
                  <div className="text-xs text-green-400">Segona Catalana · #11 classificació</div>
                </div>
                <div className="flex gap-1">
                  {['W','D','W','L','W'].map((r, i) => (
                    <span
                      key={i}
                      className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center
                        ${r==='W'?'bg-green-500':r==='D'?'bg-amber-400':'bg-red-500'} text-white`}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Proper rival section */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Proper Rival · J22</span>
                  <span className="text-[10px] px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded-full border border-sky-500/20">✈️ VISITA</span>
                </div>
                <div className="bg-gradient-to-r from-[#0d2a4a]/80 to-[#0f172a] rounded-xl p-3 border border-cyan-500/15">
                  <div className="font-bold text-white text-sm mb-2">Fundació Academia L'Hospitalet A</div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {DEMO_RIVAL_SCORERS.map((s, i) => (
                      <div key={i} className="text-center bg-black/20 rounded-lg p-1.5">
                        <div className="text-base font-black text-green-400">{s.goals}</div>
                        <div className="text-[9px] text-slate-500 truncate">⚽ {s.name.split(',')[0]}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={11} className="text-amber-400 shrink-0" />
                    <span className="text-[11px] text-amber-400">2 jugadors apercibits</span>
                  </div>
                </div>
              </div>

              {/* Goal timing mini bar */}
              <div className="mb-5">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Timing de gols marcats</div>
                <div className="flex items-end gap-1.5 h-12">
                  {DEMO_BUCKETS.map((v, i) => {
                    const labels = ["1-15'","16-30'","31-45'","46-60'","61-75'","76-90'"]
                    const h = Math.round((v / maxBucket) * 44)
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className="w-full bg-gradient-to-t from-green-500/80 to-green-400/50 rounded-t-sm"
                          style={{ height: `${h}px` }}
                        />
                        <span className="text-[8px] text-slate-600 leading-none">{labels[i].replace("'","")}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Squad apercibits */}
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Plantilla — Apercibits</div>
                <div className="space-y-1.5">
                  {DEMO_SQUAD.map((p, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                        p.risk ? 'bg-amber-900/20 border border-amber-500/15' : 'bg-white/3'
                      }`}
                    >
                      <span className="text-slate-200 font-medium">{p.name}</span>
                      <div className="flex items-center gap-2">
                        {p.goals > 0 && <span className="text-green-400">{p.goals} ⚽</span>}
                        <span className={p.risk ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                          🟨 {p.yellows}
                        </span>
                        {p.risk && <span className="text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-full border border-amber-500/20">RISC</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blurred CTA overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0d1f38] to-transparent rounded-b-2xl flex items-end justify-center pb-3 pointer-events-none">
                <div className="text-xs text-slate-500 font-medium pointer-events-auto">
                  <Link href="/cerca" className="text-green-400 hover:text-green-300 transition-colors">
                    Busca el teu equip →
                  </Link>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-3 -right-3 bg-gradient-to-br from-green-600 to-cyan-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-green-900/40">
              Demo en temps real
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
