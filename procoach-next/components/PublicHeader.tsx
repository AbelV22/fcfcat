'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Menu, X, LogIn, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

const competitions = [
  { name: 'Lliga Elit', slug: 'lliga-elit' },
  { name: 'Primera Catalana', slug: 'primera-catalana' },
  { name: 'Segona Catalana', slug: 'segona-catalana' },
  { name: 'Tercera Catalana', slug: 'tercera-catalana' },
  { name: 'Quarta Catalana', slug: 'quarta-catalana' },
  { name: 'Tercera Federació', slug: 'tercera-federacio' },
  { name: "Div. Honor Juvenil", slug: 'divisio-honor-juvenil' },
  { name: 'Preferent Juvenil', slug: 'preferent-juvenils' },
  { name: "Div. Honor Cadet S16", slug: 'divisio-honor-cadet-s16' },
  { name: 'Preferent Cadet S16', slug: 'preferent-cadet-s16' },
  { name: "Div. Honor Infantil S14", slug: 'divisio-honor-infantil-s14' },
  { name: 'Preferent Infantil S14', slug: 'preferent-infantil-s14' },
]

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
    <header className="sticky top-0 z-50 bg-[#0a1628]/95 backdrop-blur-xl border-b border-white/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0" onClick={closeMenu}>
            <Image src="/logo_neoscout.png" alt="" width={32} height={32} className="w-8 h-8 rounded-lg object-cover" priority />
            <span className="font-bold text-lg tracking-tight">
              <span className="text-white">Neo</span>
              <span className="text-green-400">Scout</span>
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
                className="flex items-center gap-1 px-3 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                Competicions
                <ChevronDown size={14} className={`transition-transform duration-200 ${compOpen ? 'rotate-180' : ''}`} />
              </button>
              {compOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setCompOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-52 bg-[#1a2744] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50">
                    {competitions.map(c => (
                      <Link
                        key={c.slug}
                        href={`/competicio/${c.slug}`}
                        className="block px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                        onClick={() => setCompOpen(false)}
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Link href="/resultats" className="px-3 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              Resultats
            </Link>
            <Link href="/cerca?type=jugador" className="px-3 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              Jugadors
            </Link>
            <Link href="/cerca?type=arbitre" className="px-3 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              Àrbitres
            </Link>
          </nav>

          {/* Search + CTA */}
          <div className="hidden md:flex items-center gap-3">
            <form onSubmit={handleSearch} className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Busca equip, jugador..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 w-52 transition-all"
              />
            </form>
            <Link
              href="/entrenador"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-green-900/30"
            >
              <LogIn size={14} />
              Per a entrenadors
            </Link>
          </div>

          {/* Mobile: search icon shortcut + menu toggle */}
          <div className="md:hidden flex items-center gap-1">
            <Link
              href="/cerca"
              className="p-2.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              aria-label="Cerca"
            >
              <Search size={19} />
            </Link>
            <button
              className="p-2.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
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
        <div className="border-t border-white/8 bg-[#0a1628] overflow-y-auto max-h-[85vh]">

          {/* Search */}
          <div className="px-4 pt-4 pb-3">
            <form onSubmit={handleSearch} className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Busca equip, jugador..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 bg-white/6 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-green-500/50 w-full"
              />
            </form>
          </div>

          {/* Main nav links */}
          <div className="px-2 pb-2 space-y-0.5">
            <Link
              href="/resultats"
              className="flex items-center px-4 py-3.5 text-sm font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              onClick={closeMenu}
            >
              Resultats
            </Link>
            <Link
              href="/cerca?type=jugador"
              className="flex items-center px-4 py-3.5 text-sm font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              onClick={closeMenu}
            >
              Jugadors
            </Link>
            <Link
              href="/cerca?type=arbitre"
              className="flex items-center px-4 py-3.5 text-sm font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              onClick={closeMenu}
            >
              Àrbitres
            </Link>

            {/* Competitions accordion */}
            <button
              className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-slate-200 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              onClick={() => setMobileCompOpen(v => !v)}
            >
              <span>Competicions</span>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform duration-200 ${mobileCompOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Competitions list — collapsible */}
            <div className={`overflow-hidden transition-all duration-300 ${mobileCompOpen ? 'max-h-96' : 'max-h-0'}`}>
              <div className="ml-4 pl-3 border-l border-white/8 space-y-0.5 pb-1">
                {competitions.map(c => (
                  <Link
                    key={c.slug}
                    href={`/competicio/${c.slug}`}
                    className="block px-3 py-2.5 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    onClick={closeMenu}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="px-4 pb-5 pt-2">
            <Link
              href="/entrenador"
              className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-green-900/30"
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
