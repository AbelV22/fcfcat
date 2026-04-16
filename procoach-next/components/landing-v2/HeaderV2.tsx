'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Menu, X, ChevronDown, LogIn, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { COMPETITION_NAMES, COMPETITION_CATEGORY } from '@/lib/competitions'

// Pull every competition from the central table and group by category
// so new ones (e.g. Preferent Cadet S15) show up without manual edits.
const CATEGORY_ORDER = ['adult', 'juvenil', 'cadet', 'infantil'] as const
const CATEGORY_HEADING: Record<string, string> = {
  adult: 'Amateur', juvenil: 'Juvenil', cadet: 'Cadet', infantil: 'Infantil',
}
type CompetitionGroup = { key: string; heading: string; items: { slug: string; name: string }[] }
const competitionGroups: CompetitionGroup[] = (() => {
  const buckets: Record<string, { slug: string; name: string }[]> = {}
  for (const [slug, name] of Object.entries(COMPETITION_NAMES)) {
    const cat = COMPETITION_CATEGORY[slug] || 'adult'
    ;(buckets[cat] ??= []).push({ slug, name })
  }
  for (const cat of Object.keys(buckets)) buckets[cat].sort((a, b) => a.name.localeCompare(b.name))
  return CATEGORY_ORDER
    .filter(cat => buckets[cat]?.length)
    .map(cat => ({ key: cat, heading: CATEGORY_HEADING[cat] || cat, items: buckets[cat] }))
})()

export default function HeaderV2() {
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

  const close = () => { setMenuOpen(false); setCompOpen(false) }

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl"
      style={{
        background: 'rgba(8,9,10,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center justify-between h-[52px]">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2 shrink-0" onClick={close}>
            <Image
              src="/logo_neoscout.png"
              alt="NeoScout"
              width={28}
              height={28}
              className="rounded-md"
              priority
            />
            <span
              className="text-[15px] tracking-tight"
              style={{ fontFamily: 'var(--font-inter)', fontWeight: 600 }}
            >
              <span style={{ color: '#f7f8f8' }}>Neo</span>
              <span style={{ color: '#22c55e' }}>Scout</span>
            </span>
            <span
              className="hidden xs:inline text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#62666d',
                fontFamily: 'var(--font-inter)',
                fontWeight: 510,
                letterSpacing: '0.06em',
              }}
            >
              beta
            </span>
          </Link>

          {/* ── Desktop nav (center) ── */}
          <nav className="hidden md:flex items-center gap-1">

            {/* Competicions dropdown */}
            <div className="relative">
              <button
                onClick={() => setCompOpen(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded transition-colors"
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 13,
                  fontWeight: 510,
                  color: compOpen ? '#f7f8f8' : '#8a8f98',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f7f8f8')}
                onMouseLeave={e => !compOpen && (e.currentTarget.style.color = '#8a8f98')}
              >
                Competicions
                <ChevronDown
                  size={13}
                  style={{
                    transition: 'transform 0.2s',
                    transform: compOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {compOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCompOpen(false)} />
                  <div
                    className="absolute top-full left-0 mt-1 w-64 max-h-[70vh] overflow-y-auto py-1.5 z-50"
                    style={{
                      background: '#0f1011',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 8,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    <Link
                      href="/competicions"
                      className="block px-4 py-2.5 transition-colors"
                      style={{
                        fontFamily: 'var(--font-inter)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#22c55e',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        marginBottom: 4,
                      }}
                      onClick={() => setCompOpen(false)}
                    >
                      Busca el teu equip →
                    </Link>
                    {competitionGroups.map(group => (
                      <div key={group.key} className="pt-1">
                        <div
                          className="px-4 pt-1 pb-1"
                          style={{
                            fontFamily: 'var(--font-inter)',
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: '#62666d',
                          }}
                        >
                          {group.heading}
                        </div>
                        {group.items.map(c => (
                          <Link
                            key={c.slug}
                            href={`/competicio/${c.slug}`}
                            className="block px-4 py-1.5 transition-colors"
                            style={{
                              fontFamily: 'var(--font-inter)',
                              fontSize: 13,
                              fontWeight: 400,
                              color: '#8a8f98',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.color = '#f7f8f8'
                              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = '#8a8f98'
                              e.currentTarget.style.background = 'transparent'
                            }}
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

            {[
              { label: 'Temporada', href: '/temporada' },
              { label: 'Jugadors', href: '/cerca?type=jugador' },
              { label: 'Àrbitres', href: '/cerca?type=arbitre' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded transition-colors"
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 13,
                  fontWeight: 510,
                  color: '#8a8f98',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f7f8f8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8a8f98')}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* ── Desktop right: login + CTA ── */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors"
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 13,
                fontWeight: 510,
                color: '#8a8f98',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f7f8f8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#8a8f98')}
            >
              <User size={13} />
              Iniciar sessió
            </Link>

            <Link
              href="/entrenador"
              className="flex items-center gap-1.5 transition-colors"
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 13,
                fontWeight: 510,
                color: '#ffffff',
                background: '#22c55e',
                padding: '7px 14px',
                borderRadius: 6,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#34d399')}
              onMouseLeave={e => (e.currentTarget.style.background = '#22c55e')}
            >
              <LogIn size={13} />
              Per a entrenadors
            </Link>
          </div>

          {/* ── Mobile: search + hamburger ── */}
          <div className="md:hidden flex items-center gap-1">
            <Link
              href="/cerca"
              className="p-2 rounded transition-colors"
              style={{ color: '#8a8f98' }}
              aria-label="Cerca"
            >
              <Search size={18} />
            </Link>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-2 rounded transition-colors"
              style={{ color: '#8a8f98' }}
              aria-label={menuOpen ? 'Tancar menú' : 'Obrir menú'}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: menuOpen ? '90vh' : 0, opacity: menuOpen ? 1 : 0 }}
      >
        <div
          className="overflow-y-auto max-h-[85vh]"
          style={{
            background: '#0f1011',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Search */}
          <div className="px-4 pt-4 pb-3">
            <form onSubmit={handleSearch} className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#62666d' }} />
              <input
                type="text"
                placeholder="Busca equip, jugador..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded outline-none"
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 13,
                  color: '#f7f8f8',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 6,
                }}
              />
            </form>
          </div>

          {/* Nav links */}
          <div className="px-2 pb-2 space-y-0.5">
            {[
              { label: 'Temporada', href: '/temporada' },
              { label: 'Jugadors', href: '/cerca?type=jugador' },
              { label: 'Àrbitres', href: '/cerca?type=arbitre' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2.5 rounded"
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 14,
                  fontWeight: 510,
                  color: '#d0d6e0',
                }}
                onClick={close}
              >
                {item.label}
              </Link>
            ))}

            {/* Competicions accordion */}
            <button
              className="w-full flex items-center justify-between px-3 py-2.5 rounded"
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 14,
                fontWeight: 510,
                color: '#d0d6e0',
              }}
              onClick={() => setMobileCompOpen(v => !v)}
            >
              <span>Competicions</span>
              <ChevronDown
                size={15}
                style={{
                  color: '#62666d',
                  transition: 'transform 0.2s',
                  transform: mobileCompOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            <div
              className="overflow-hidden transition-all duration-300"
              style={{ maxHeight: mobileCompOpen ? '560px' : 0, overflowY: mobileCompOpen ? 'auto' : 'hidden' }}
            >
              <div
                className="ml-4 pl-3 pb-1 space-y-0.5"
                style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}
              >
                <Link
                  href="/competicions"
                  className="block px-2 py-2 rounded"
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#22c55e',
                  }}
                  onClick={close}
                >
                  Busca el teu equip →
                </Link>
                {competitionGroups.map(group => (
                  <div key={group.key}>
                    <div
                      className="px-2 pt-2 pb-0.5"
                      style={{
                        fontFamily: 'var(--font-inter)',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: '#62666d',
                      }}
                    >
                      {group.heading}
                    </div>
                    {group.items.map(c => (
                      <Link
                        key={c.slug}
                        href={`/competicio/${c.slug}`}
                        className="block px-2 py-1.5 rounded"
                        style={{
                          fontFamily: 'var(--font-inter)',
                          fontSize: 13,
                          color: '#8a8f98',
                        }}
                        onClick={close}
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
              className="flex items-center justify-center gap-2 w-full py-3 rounded"
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 14,
                fontWeight: 510,
                color: '#d0d6e0',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
              }}
              onClick={close}
            >
              <User size={14} />
              Iniciar sessió
            </Link>
            <Link
              href="/entrenador"
              className="flex items-center justify-center gap-2 w-full py-3 rounded"
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 14,
                fontWeight: 510,
                color: '#ffffff',
                background: '#22c55e',
                borderRadius: 6,
              }}
              onClick={close}
            >
              <LogIn size={14} />
              Per a entrenadors — Gratis
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
