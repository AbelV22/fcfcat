'use client'

import Link from 'next/link'
import { Crosshair, FileText, AlertTriangle } from 'lucide-react'

const FEATURES = [
  {
    icon: <Crosshair size={18} />,
    title: 'El teu proper rival, radiografiat',
    desc: 'Golejadors, minuts jugats, apercebuts i patrons de gol. Tot sobre el rival de dissabte, abans del dijous.',
    href: '/cerca',
  },
  {
    icon: <FileText size={18} />,
    title: 'Notes de partit que sumen',
    desc: 'Registra el que passa a la gespa i acumula estadístiques pròpies. Les teves dades, sense fulls de càlcul.',
    href: '/dashboard/apunts',
  },
  {
    icon: <AlertTriangle size={18} />,
    title: 'Sàpigues qui no podrà jugar',
    desc: 'Jugadors al límit de sanció, del teu equip i del rival. Sense sorpreses el dia del partit.',
    href: '/competicio/primera-catalana?tab=disciplina',
  },
]

export default function FeaturedSectionV2() {
  return (
    <section
      style={{
        background: '#08090a',
        paddingTop: 80,
        paddingBottom: 80,
        fontFamily: 'var(--font-inter)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6">

        {/* Section header */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 510,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#22c55e',
              marginBottom: 12,
            }}
          >
            Funcionalitats
          </div>
          <h2
            style={{
              fontSize: 'clamp(28px, 3vw, 40px)',
              fontWeight: 510,
              letterSpacing: '-0.02em',
              color: '#f7f8f8',
              lineHeight: 1.1,
              marginBottom: 12,
            }}
          >
            Tot el que necessites per guanyar dissabte
          </h2>
          <p
            style={{
              fontSize: 16,
              color: '#8a8f98',
              lineHeight: 1.6,
              maxWidth: 520,
            }}
          >
            Dades reals de la FCF, organitzades per a entrenadors. No per a estadístics.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {FEATURES.map(item => (
            <Link
              key={item.title}
              href={item.href}
              className="group block"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                padding: '28px 28px',
                textDecoration: 'none',
                transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.borderColor = 'rgba(255,255,255,0.12)'
                el.style.transform = 'translateY(-2px)'
                el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.borderColor = 'rgba(255,255,255,0.06)'
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = 'none'
              }}
            >
              <div style={{ color: '#8a8f98', marginBottom: 16 }}>{item.icon}</div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 510,
                  color: '#f7f8f8',
                  marginBottom: 10,
                  lineHeight: 1.3,
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: '#62666d',
                  lineHeight: 1.6,
                }}
              >
                {item.desc}
              </p>
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
