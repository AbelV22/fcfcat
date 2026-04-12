'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Settings } from 'lucide-react'

const ALL_COMPETITIONS = [
  { label: 'Tercera Federació', href: '/competicio/tercera-federacio' },
  { label: 'Lliga Elit', href: '/competicio/lliga-elit' },
  { label: 'Primera Catalana', href: '/competicio/primera-catalana' },
  { label: 'Segona Catalana', href: '/competicio/segona-catalana' },
  { label: 'Tercera Catalana', href: '/competicio/tercera-catalana' },
  { label: 'Quarta Catalana', href: '/competicio/quarta-catalana' },
  { label: 'Div. Honor Juvenil', href: '/competicio/divisio-honor-juvenil' },
  { label: 'Lliga Nacional Juvenil', href: '/competicio/lliga-nacional-juvenil' },
  { label: 'Preferent Juvenil', href: '/competicio/preferent-juvenils' },
  { label: 'Juvenil 1a Divisió', href: '/competicio/juvenil-primera-divisio' },
  { label: 'Div. Honor Cadet S16', href: '/competicio/divisio-honor-cadet-s16' },
  { label: 'Preferent Cadet S16', href: '/competicio/preferent-cadet-s16' },
  { label: 'Div. Honor Infantil S14', href: '/competicio/divisio-honor-infantil-s14' },
  { label: 'Preferent Infantil S14', href: '/competicio/preferent-infantil-s14' },
]

const NAV_COLS = [
  {
    title: 'Competicions',
    links: ALL_COMPETITIONS.slice(0, 6),
  },
  {
    title: 'Plataforma',
    links: [
      { label: 'Equips', href: '/cerca?type=equip' },
      { label: 'Àrbitres', href: '/cerca?type=arbitre' },
      { label: 'Jugadors', href: '/cerca?type=jugador' },
      { label: 'Resultats', href: '/resultats' },
    ],
  },
  {
    title: 'Entrenadors',
    links: [
      { label: 'Registra equip', href: '/entrenador' },
      { label: 'Inicia sessió', href: '/login' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
]

const linkStyle = {
  fontSize: 13,
  color: '#62666d',
  textDecoration: 'none',
  transition: 'color 0.15s',
  display: 'block',
}

export default function FooterV2() {
  return (
    <footer
      style={{
        background: '#08090a',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontFamily: 'var(--font-inter)',
      }}
    >
      <div
        className="max-w-[1200px] mx-auto px-6"
        style={{ paddingTop: 48, paddingBottom: 40 }}
      >
        {/* Top: brand + cols */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8" style={{ marginBottom: 40 }}>

          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2"
              style={{ textDecoration: 'none', marginBottom: 12, display: 'inline-flex' }}
            >
              <Image
                src="/logo_neoscout.png"
                alt="NeoScout"
                width={24}
                height={24}
                className="rounded"
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#f7f8f8' }}>
                Neo<span style={{ color: '#22c55e' }}>Scout</span>
              </span>
            </Link>
            <p style={{ fontSize: 12, color: '#62666d', lineHeight: 1.6, maxWidth: 180 }}>
              Estadístiques i resultats del futbol regional català. Dades de FCF.cat.
            </p>
          </div>

          {/* Link columns */}
          {NAV_COLS.map(col => (
            <div key={col.title}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 510,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#8a8f98',
                  marginBottom: 12,
                }}
              >
                {col.title}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.links.map(item => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      style={linkStyle}
                      onMouseEnter={e => (e.currentTarget.style.color = '#d0d6e0')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#62666d')}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* All competitions */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 510,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: '#8a8f98',
              marginBottom: 12,
            }}
          >
            Totes les competicions
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
            {ALL_COMPETITIONS.map(c => (
              <Link
                key={c.href}
                href={c.href}
                style={{ ...linkStyle, fontSize: 12 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#d0d6e0')}
                onMouseLeave={e => (e.currentTarget.style.color = '#62666d')}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>

        {/* SEO text */}
        <div
          style={{
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.04)',
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 11, color: '#3a3d42', lineHeight: 1.6, maxWidth: 720 }}>
            NeoScout és la plataforma d&apos;estadístiques i resultats del futbol català. Consulta la classificació, resultats, golejadors, àrbitres i disciplina de totes les competicions de la Federació Catalana de Futbol (FCF): Segona Catalana, Tercera Catalana, Primera Catalana, Preferent Juvenil, Quarta Catalana, Lliga Elit i totes les categories de futbol base. Temporada 2025/26.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p style={{ fontSize: 12, color: '#3a3d42' }}>
            © 2025–2026 NeoScout · Dades no oficials extretes de fcf.cat
          </p>
          <Link
            href="/admin/login"
            style={{ color: '#3a3d42', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#62666d')}
            onMouseLeave={e => (e.currentTarget.style.color = '#3a3d42')}
          >
            <Settings size={13} />
          </Link>
        </div>

      </div>
    </footer>
  )
}
