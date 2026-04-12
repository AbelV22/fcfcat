'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight, AlertTriangle, Zap, Target, TrendingUp, Swords, ClipboardList, ShieldCheck, UserPlus } from 'lucide-react'
import Link from 'next/link'

const DEMO_RIVAL_SCORERS = [
  { name: 'LOPEZ, ADRIÀ', goals: 11 },
  { name: 'SÁNCHEZ, NOEL', goals: 7 },
  { name: 'RUIZ, SERGI', goals: 5 },
]

const DEMO_SQUAD = [
  { name: 'GARCIA, MARC', goals: 8, yellows: 2, risk: false },
  { name: 'MARTINEZ, POL', goals: 3, yellows: 4, risk: true },
  { name: 'PÉREZ, JAN', goals: 0, yellows: 5, risk: true },
  { name: 'FERNANDEZ, TON', goals: 6, yellows: 1, risk: false },
]

const DEMO_BUCKETS = [3, 5, 4, 7, 6, 9]

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
    <section className="relative overflow-hidden pt-10 sm:pt-16 lg:pt-20 pb-14 sm:pb-20 lg:pb-28">
      {/* ── Apple-style animated lines ── */}
      <div className="absolute inset-0 pointer-events-none">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1280 800"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Elegant flowing curves */}
          <path
            d="M-100,400 C200,200 400,600 700,350 S1100,100 1400,300"
            stroke="url(#line-grad-1)"
            strokeWidth="1"
            className="hero-line"
          />
          <path
            d="M-50,500 C300,300 500,700 800,400 S1200,200 1500,450"
            stroke="url(#line-grad-2)"
            strokeWidth="0.8"
            className="hero-line-reverse"
          />
          <path
            d="M-100,250 C150,450 450,150 750,300 S1050,500 1400,200"
            stroke="url(#line-grad-1)"
            strokeWidth="0.6"
            className="hero-line-slow"
          />
          <defs>
            <linearGradient id="line-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
              <stop offset="30%" stopColor="#34d399" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#67e8f9" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="line-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0" />
              <stop offset="40%" stopColor="#6ee7b7" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Subtle radial glows */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% -10%, rgba(52,211,153,0.08), transparent 70%),
              radial-gradient(ellipse 60% 40% at 85% 110%, rgba(103,232,249,0.05), transparent)
            `,
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ─── Left: Copy + Search ─── */}
          <div>
            {/* Elegant accent line */}
            <div
              className="mb-6 sm:mb-8 animate-fade-up w-40 sm:w-64"
              aria-hidden="true"
              style={{
                height: 1,
                background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.55) 25%, rgba(255,255,255,0.35) 65%, transparent)',
              }}
            />

            {/* Headline */}
            <h1 className="font-headline text-[2rem] xs:text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight mb-5 sm:mb-6 leading-[1.08] animate-fade-up delay-100">
              <span className="text-white">Resultats i estadístiques</span>
              <br />
              <span className="gradient-text-hero">
                del futbol català
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-base lg:text-lg text-[#8a8f98] mb-3 leading-relaxed max-w-[90vw] sm:max-w-lg animate-fade-up delay-200">
              Classificació, resultats, estadístiques de jugadors i àrbitres de totes les categories FCF:
              Segona Catalana, Tercera Catalana, Preferent Juvenil i més.
            </p>

            <p className="text-xs sm:text-sm text-[#8a8f98] mb-8 sm:mb-10 animate-fade-up delay-200">
              Dades oficials de la Federació Catalana de Futbol, actualitzades setmanalment.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="mb-8 animate-fade-up delay-300">
              <div className="relative flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg overflow-hidden
                              focus-within:border-emerald-500/40 focus-within:bg-white/[0.06]
                              focus-within:shadow-[0_0_40px_rgba(52,211,153,0.08)] transition-all duration-500
                              shadow-xl shadow-black/30">
                <Search size={16} className="absolute left-3.5 sm:left-5 text-[#8a8f98] shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Busca el teu equip..."
                  className="flex-1 min-w-0 pl-10 sm:pl-14 pr-2 py-4 sm:py-5 bg-transparent text-white placeholder-[#62666d] text-sm sm:text-base focus:outline-none"
                />
                <button
                  type="submit"
                  className="group shrink-0 m-1.5 sm:m-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-[#f7f8f8] font-semibold rounded-xl
                             transition-all flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base
                             hover:bg-emerald-50 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                >
                  Cerca
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </form>

            {/* Big register CTA */}
            <div className="animate-fade-up delay-350 mb-8">
              <Link
                href="/entrenador"
                className="group relative inline-flex items-center justify-center gap-3 w-full sm:w-auto
                           px-10 py-5 sm:py-6
                           bg-gradient-to-r from-emerald-500 to-emerald-600 text-white
                           font-bold text-lg sm:text-xl rounded-lg
                           transition-all duration-300
                           hover:from-emerald-400 hover:to-emerald-500
                           hover:shadow-[0_0_60px_rgba(52,211,153,0.3)]
                           hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserPlus size={24} className="shrink-0" />
                Crea el teu compte gratis
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="text-xs text-[#8a8f98] mt-3">
                Rivals, plantilla, apercibits i molt mes. Tot en un clic.
              </p>
            </div>

            {/* Subtle feature tags */}
            <div className="flex flex-wrap gap-3 sm:gap-5 text-[11px] sm:text-xs text-[#8a8f98] animate-fade-up delay-400">
              <span className="flex items-center gap-1.5"><Swords size={12} className="text-[#8a8f98]" /> Analisi de rivals</span>
              <span className="flex items-center gap-1.5"><ClipboardList size={12} className="text-[#8a8f98]" /> Notes de partits</span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-[#8a8f98]" /> Control plantilla</span>
            </div>
          </div>

          {/* ─── Right: Demo preview card ─── */}
          <div className="relative hidden lg:block animate-fade-up delay-300">
            <div className="relative bg-[#0c1a2e]/80 border border-white/[0.07] rounded-lg p-5 shadow-2xl shadow-black/30 backdrop-blur-sm overflow-hidden">
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

              {/* Card header label */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#8a8f98]">Informe de Preparació</span>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-400 tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>

              {/* Team header */}
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.06]">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center font-bold text-emerald-400 font-display">
                  M
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">Marianao Poblet UD A</div>
                  <div className="text-xs text-emerald-400/70">Segona Catalana · #11</div>
                </div>
                <div className="flex gap-1">
                  {['W','D','W','L','W'].map((r, i) => (
                    <span
                      key={i}
                      className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center
                        ${r==='W'?'bg-emerald-500/80':r==='D'?'bg-amber-400/80':'bg-red-400/80'} text-white`}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Two-column: rival + timing */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Rival */}
                <div>
                  <div className="text-[10px] text-[#8a8f98] uppercase tracking-wider font-medium mb-2">Proper Rival · J22</div>
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                    <div className="font-semibold text-white text-xs mb-2">Fund. Ac. L&apos;Hospitalet A</div>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {DEMO_RIVAL_SCORERS.map((s, i) => (
                        <div key={i} className="text-center bg-black/20 rounded-lg py-1.5 px-1">
                          <div className="text-sm font-bold text-emerald-400">{s.goals}</div>
                          <div className="text-[8px] text-[#8a8f98] truncate">{s.name.split(',')[0]}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={10} className="text-amber-400" />
                      <span className="text-[10px] text-amber-400/80">2 apercibits</span>
                    </div>
                  </div>
                </div>

                {/* Goal timing */}
                <div>
                  <div className="text-[10px] text-[#8a8f98] uppercase tracking-wider font-medium mb-2">Timing de gols</div>
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                    <div className="flex items-end gap-1.5 h-16 mb-1.5">
                      {DEMO_BUCKETS.map((v, i) => {
                        const labels = ["1-15","16-30","31-45","46-60","61-75","76-90"]
                        const h = Math.round((v / maxBucket) * 56)
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <div
                              className="w-full bg-gradient-to-t from-emerald-500/60 to-emerald-400/30 rounded-t-sm"
                              style={{ height: `${h}px` }}
                            />
                            <span className="text-[7px] text-[#62666d]">{labels[i]}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="text-[10px] text-[#8a8f98]">
                      <span className="text-emerald-400">76-90</span> · Més gols
                    </div>
                  </div>
                </div>
              </div>

              {/* Squad */}
              <div>
                <div className="text-[10px] text-[#8a8f98] uppercase tracking-wider font-medium mb-2">Plantilla — Apercibits</div>
                <div className="space-y-1">
                  {DEMO_SQUAD.map((p, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                        p.risk ? 'bg-amber-900/15 border border-amber-500/10' : 'bg-white/[0.02]'
                      }`}
                    >
                      <span className="text-[#d0d6e0] font-medium text-[11px]">{p.name}</span>
                      <div className="flex items-center gap-2">
                        {p.goals > 0 && <span className="text-emerald-400/80 text-[11px]">{p.goals} gols</span>}
                        <span className={`flex items-center gap-1 text-[11px] ${p.risk ? 'text-amber-400' : 'text-[#62666d]'}`}>
                          <span className="inline-block w-2.5 h-3 rounded-[1px] bg-amber-400/80" /> {p.yellows}
                        </span>
                        {p.risk && <span className="text-[9px] text-amber-400/80 bg-amber-500/15 px-1.5 py-0.5 rounded">RISC</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-center">
                <Link href="/cerca" className="text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors">
                  Busca el teu equip per veure l&apos;informe →
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* ─── Mobile demo strip ─── */}
        <div className="lg:hidden mt-10 -mx-4 px-4 flex gap-3 overflow-x-auto scrollbar-hide pb-2 animate-fade-up delay-400">
          <div className="shrink-0 flex items-center gap-2 px-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-xl">
            <Zap size={14} className="text-emerald-400" />
            <div>
              <div className="text-xs font-semibold text-white">Proper rival</div>
              <div className="text-[10px] text-[#8a8f98]">Fund. Ac. L&apos;Hospitalet A</div>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 px-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-xl">
            <Target size={14} className="text-emerald-400" />
            <div>
              <div className="text-xs font-semibold text-white">8 gols</div>
              <div className="text-[10px] text-[#8a8f98]">Garcia, Marc</div>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 px-4 py-3 bg-amber-500/[0.06] border border-amber-500/10 rounded-xl">
            <AlertTriangle size={14} className="text-amber-400" />
            <div>
              <div className="text-xs font-semibold text-amber-400">5 grogues</div>
              <div className="text-[10px] text-[#8a8f98]">Pérez, Jan — RISC</div>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 px-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-xl">
            <TrendingUp size={14} className="text-[#22c55e]" />
            <div>
              <div className="text-xs font-semibold text-white">76-90&apos;</div>
              <div className="text-[10px] text-[#8a8f98]">Més gols marcats</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom glow divider */}
      <div className="absolute bottom-0 left-0 right-0 glow-divider" />
    </section>
  )
}
