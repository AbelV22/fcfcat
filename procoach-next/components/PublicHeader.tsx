'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Menu, X, LogIn, ChevronDown, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { COMPETITION_NAMES, COMPETITION_CATEGORY } from '@/lib/competitions'

// Build the nav dropdown straight from the central competitions table
// so new categories (e.g. Preferent Cadet S15) appear without manual edits.
const CATEGORY_ORDER = ['adult', 'juvenil', 'cadet', 'infantil'] as const
const CATEGORY_HEADING: Record<string, string> = {
  adult: 'Amateur',
  juvenil: 'Juvenil',
  cadet: 'Cadet',
  infantil: 'Infantil',
}

type CompetitionGroup = { key: string; heading: string; items: { slug: string; name: string }[] }

const competitionGroups: CompetitionGroup[] = (() => {
  const buckets: Record<string, { slug: string; name: string }[]> = {}
  for (const [slug, name] of Object.entries(COMPETITION_NAMES)) {
    const cat = COMPETITION_CATEGORY[slug] || 'adult'
    ;(buckets[cat] ??= []).push({ slug, name })
  }
  for (const cat of Object.keys(buckets)) {
    buckets[cat].sort((a, b) => a.name.localeCompare(b.name))
  }
  return CATEGORY_ORDER
    .filter(cat => buckets[cat]?.length)
    .map(cat => ({ key: cat, heading: CATEGORY_HEADING[cat] || cat, items: buckets[cat] }))
})()

export default function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [compOpen, setCompOpen] = useState(false)
  const [mobileCompOpen, setMobileCompOpen] = useState(false)
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/cerca?q=${encodeURIComponent(searchQuery.trim())}`)
      setMenuOpen(false)
    }
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-50 bg-[#0f1011]/95 backdrop-blur-xl border-b border-white/8 shadow-lg shadow-black/20">
      {/* Premium top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0" onClick={closeMenu}>
            <Image src="/logo_neoscout.png" alt="NeoScout — Estadístiques Futbol Català" width={32} height={32} className="w-8 h-8 rounded-lg object-cover" priority />
            <span className="font-display font-bold text-lg tracking-tight">
              <span className="text-white">Neo</span>
              <span className="text-emerald-400">Scout</span>
            </span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md leading-none hidden xs:inline">
              beta
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setCompOpen(!compOpen)}
                className="flex items-center gap-1 px-3 py-2 text-sm text-[#d0d6e0] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                Competicions
                <ChevronDown size={14} className={`transition-transform duration-200 ${compOpen ? 'rotate-180' : ''}`} />
              </button>
              {compOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setCompOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-64 max-h-[70vh] overflow-y-auto bg-[#1a2744] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50">
                    <Link
                      href="/competicions"
                      className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-emerald-400 hover:text-white hover:bg-white/5 transition-colors border-b border-white/8 mb-1"
                      onClick={() => setCompOpen(false)}
                    >
                      <span>Busca el teu equip →</span>
                    </Link>
                    {competitionGroups.map(group => (
                      <div key={group.key} className="pt-1">
                        <div className="px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                          {group.heading}
                        </div>
                        {group.items.map(c => (
                          <Link
                            key={c.slug}
                            href={`/competicio/${c.slug}`}
                            className="block px-4 py-2 text-sm text-[#d0d6e0] hover:text-white hover:bg-white/5 transition-colors"
                            onClick={() => setCompOpen(false)}
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Link href="/resultats" className="px-3 py-2 text-sm text-[#d0d6e0] hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              Resultats
            </Link>
            <Link href="/cerca?type=jugador" className="px-3 py-2 text-sm text-[#d0d6e0] hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              Jugadors
            </Link>
            <Link href="/cerca?type=arbitre" className="px-3 py-2 text-sm text-[#d0d6e0] hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              Àrbitres
            </Link>
          </nav>

          {/* Search + CTA */}
          <div className="hidden md:flex items-center gap-3">
            <form onSubmit={handleSearch} className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8f98]" />
              <input
                type="text"
                placeholder="Busca equip, jugador..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-[#d0d6e0] placeholder-[#62666d] focus:outline-none focus:border-green-500/50 focus:bg-white/8 w-52 transition-all"
              />
            </form>
            <Link
              href="/login"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#d0d6e0] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <User size={14} />
              Iniciar sessió
            </Link>
            <Link
              href="/entrenador"
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#f7f8f8] text-sm font-semibold rounded-xl transition-all hover:bg-emerald-50 hover:shadow-[0_0_20px_rgba(52,211,153,0.1)]"
            >
              <LogIn size={14} />
              Per a entrenadors
            </Link>
          </div>

          {/* Mobile: search icon shortcut + menu toggle */}
          <div className="md:hidden flex items-center gap-1">
            <Link
              href="/cerca"
              className="p-2.5 text-[#8a8f98] hover:text-white transition-colors rounded-lg hover:bg-white/5"
              aria-label="Cerca"
            >
              <Search size={19} />
            </Link>
            <button
              className="p-2.5 text-[#8a8f98] hover:text-white transition-colors rounded-lg hover:bg-white/5"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Tancar menú' : 'Obrir menú'}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu — slide down with transition */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? 'max-h-[90vh] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-white/8 bg-[#0f1011] overflow-y-auto max-h-[85vh]">

          {/* Search */}
          <div className="px-4 pt-4 pb-3">
            <form onSubmit={handleSearch} className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8f98]" />
              <input
                type="text"
                placeholder="Busca equip, jugador..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 bg-white/6 border border-white/10 rounded-xl text-sm text-[#d0d6e0] placeholder-[#62666d] focus:outline-none focus:border-green-500/50 w-full"
              />
            </form>
          </div>

          {/* Main nav links */}
          <div className="px-2 pb-2 space-y-0.5">
            <Link
              href="/resultats"
              className="flex items-center px-4 py-3.5 text-sm font-medium text-[#d0d6e0] hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              onClick={closeMenu}
            >
              Resultats
            </Link>
            <Link
              href="/cerca?type=jugador"
              className="flex items-center px-4 py-3.5 text-sm font-medium text-[#d0d6e0] hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              onClick={closeMenu}
            >
              Jugadors
            </Link>
            <Link
              href="/cerca?type=arbitre"
              className="flex items-center px-4 py-3.5 text-sm font-medium text-[#d0d6e0] hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              onClick={closeMenu}
            >
              Àrbitres
            </Link>

            {/* Competitions accordion */}
            <button
              className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-[#d0d6e0] hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              onClick={() => setMobileCompOpen(v => !v)}
            >
              <span>Competicions</span>
              <ChevronDown
                size={16}
                className={`text-[#8a8f98] transition-transform duration-200 ${mobileCompOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Competitions list — collapsible */}
            <div className={`overflow-hidden transition-all duration-300 ${mobileCompOpen ? 'max-h-[560px] overflow-y-auto' : 'max-h-0'}`}>
              <div className="ml-4 pl-3 border-l border-white/8 space-y-0.5 pb-1">
                <Link
                  href="/competicions"
                  className="block px-3 py-2.5 text-sm font-semibold text-emerald-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                  onClick={closeMenu}
                >
                  Busca el teu equip →
                </Link>
                {competitionGroups.map(group => (
                  <div key={group.key} className="pt-1">
                    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#62666d]">
                      {group.heading}
                    </div>
                    {group.items.map(c => (
                      <Link
                        key={c.slug}
                        href={`/competicio/${c.slug}`}
                        className="block px-3 py-2 text-sm text-[#8a8f98] hover:text-white transition-colors rounded-lg hover:bg-white/5"
                        onClick={closeMenu}
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Login + CTA */}
          <div className="px-4 pb-5 pt-2 space-y-2">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-white/5 border border-white/10 text-[#d0d6e0] text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors"
              onClick={closeMenu}
            >
              <User size={15} />
              Iniciar sessió
            </Link>
            <Link
              href="/entrenador"
              className="flex items-center justify-center gap-2 w-full py-4 bg-white text-[#f7f8f8] text-sm font-bold rounded-xl"
              onClick={closeMenu}
            >
              <LogIn size={15} />
              Per a entrenadors — Gratis
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
