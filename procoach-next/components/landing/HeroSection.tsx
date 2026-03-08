'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight, Star, Users, Shield } from 'lucide-react'
import Link from 'next/link'

const QUICK_LINKS = [
  { label: 'Primera Catalana', href: '/competicio/primera-catalana' },
  { label: 'Segona Catalana', href: '/competicio/segona-catalana' },
  { label: 'Preferent Catalana', href: '/competicio/preferent-catalana' },
  { label: 'Resultats d\'avui', href: '/resultats' },
]

export default function HeroSection() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/cerca?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <section className="relative overflow-hidden pt-20 pb-32">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(34,197,94,0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(34,197,94,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-medium mb-8 animate-fade-up">
          <Star size={12} fill="currentColor" />
          Temporada 2025-26 · Dades en temps real de FCF.cat
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 animate-fade-up delay-100">
          <span className="text-white">Tot el Futbol</span>
          <br />
          <span className="gradient-text">Català</span>
          <span className="text-white"> en un Sol Lloc</span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up delay-200">
          Classificacions, resultats, perfils de jugadors, àrbitres i estadístiques
          de totes les categories de la <strong className="text-slate-300">Federació Catalana de Futbol</strong>.
          Gratis per a tothom.
        </p>

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          className="relative max-w-xl mx-auto mb-6 animate-fade-up delay-300"
        >
          <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden
                          focus-within:border-green-500/50 focus-within:bg-white/8 transition-all
                          shadow-2xl shadow-black/40">
            <Search size={20} className="absolute left-5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Busca el teu equip, jugador o àrbitre..."
              className="flex-1 pl-14 pr-4 py-5 bg-transparent text-white placeholder-slate-500 text-lg
                         focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 m-2 px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600
                         hover:from-green-500 hover:to-cyan-500 text-white font-semibold rounded-xl
                         transition-all flex items-center gap-2 shadow-lg shadow-green-900/30"
            >
              Cerca
              <ArrowRight size={16} />
            </button>
          </div>
        </form>

        {/* Quick links */}
        <div className="flex flex-wrap justify-center gap-2 mb-16 animate-fade-up delay-400">
          {QUICK_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/8
                         hover:border-white/15 text-slate-400 hover:text-white text-sm
                         rounded-full transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500 animate-fade-up delay-400">
          {[
            { icon: <Shield size={14} className="text-green-400" />, text: 'Informe arbitral complet' },
            { icon: <Users size={14} className="text-cyan-400" />, text: 'Perfils de jugadors' },
            { icon: <Star size={14} className="text-yellow-400" />, text: 'Scouting per ojeadors' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
