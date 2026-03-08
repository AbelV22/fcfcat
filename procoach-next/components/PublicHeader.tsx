'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Menu, X, Trophy, LogIn, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

const competitions = [
  { name: 'Primera Catalana', slug: 'primera-catalana' },
  { name: 'Segona Catalana', slug: 'segona-catalana' },
  { name: 'Tercera Catalana', slug: 'tercera-catalana' },
  { name: 'Quarta Catalana', slug: 'quarta-catalana' },
  { name: 'Preferent Catalana', slug: 'preferent-catalana' },
  { name: 'Divisió d\'Honor', slug: 'divisio-honor' },
]

export default function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [compOpen, setCompOpen] = useState(false)
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/cerca?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-[#0a1628]/90 backdrop-blur-xl border-b border-white/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center animate-pulse-glow">
              <Trophy size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              <span className="text-white">FCF</span>
              <span className="text-green-400">Cat</span>
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
                <ChevronDown size={14} className={`transition-transform ${compOpen ? 'rotate-180' : ''}`} />
              </button>
              {compOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-[#1e293b] border border-white/10 rounded-xl shadow-xl py-1 z-50">
                  {competitions.map(c => (
                    <Link
                      key={c.slug}
                      href={`/competicio/${c.slug}`}
                      className="block px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setCompOpen(false)}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
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
              href="/login"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-green-900/30"
            >
              <LogIn size={14} />
              Per a entrenadors
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/8 bg-[#0a1628] px-4 py-4 space-y-2">
          <form onSubmit={handleSearch} className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Busca equip, jugador..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-green-500/50 w-full"
            />
          </form>
          {['Competicions', 'Resultats', 'Jugadors', 'Àrbitres'].map(item => (
            <Link
              key={item}
              href={`/${item.toLowerCase()}`}
              className="block py-2 text-slate-300 hover:text-white text-sm transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </Link>
          ))}
          <Link
            href="/login"
            className="block mt-3 text-center py-2 bg-gradient-to-r from-green-600 to-cyan-600 text-white text-sm font-medium rounded-xl"
            onClick={() => setMenuOpen(false)}
          >
            Per a entrenadors
          </Link>
        </div>
      )}
    </header>
  )
}
