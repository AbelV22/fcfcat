'use client'

import Link from 'next/link'
import { ArrowRight, UserPlus } from 'lucide-react'

interface Props {
  matchCount?: number
}

export default function CoachCTAV2({ matchCount }: Props) {
  return (
    <section
      style={{
        background: '#0f1011',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        fontFamily: 'var(--font-inter)',
      }}
    >
      <div
        className="max-w-[1200px] mx-auto px-6"
        style={{ paddingTop: 96, paddingBottom: 96, textAlign: 'center' }}
      >
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2"
          style={{
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.18)',
            borderRadius: 9999,
            padding: '4px 14px',
            fontSize: 11,
            fontWeight: 510,
            color: '#22c55e',
            letterSpacing: '0.04em',
            marginBottom: 28,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#22c55e',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          Gratuït per a entrenadors
        </div>

        {/* Headline */}
        <h2
          style={{
            fontSize: 'clamp(32px, 4vw, 52px)',
            fontWeight: 510,
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            color: '#f7f8f8',
            marginBottom: 16,
          }}
        >
          El teu proper partit<br />
          <span style={{ color: '#22c55e' }}>comença ara</span>
        </h2>

        {/* Body with integrated social proof */}
        <p
          style={{
            fontSize: 16,
            color: '#8a8f98',
            lineHeight: 1.6,
            marginBottom: 40,
            maxWidth: 480,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Uneix-te als entrenadors que ja preparen partits amb les dades de 14 competicions
          {matchCount ? ` i ${matchCount.toLocaleString('ca')}+ partits analitzats` : ''}.
          Configura el teu equip en menys d&apos;un minut.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/entrenador"
            className="inline-flex items-center justify-center gap-2"
            style={{
              padding: '14px 32px',
              background: '#22c55e',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 510,
              borderRadius: 6,
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#34d399')}
            onMouseLeave={e => (e.currentTarget.style.background = '#22c55e')}
          >
            <UserPlus size={16} />
            Comença gratis
            <ArrowRight size={15} />
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2"
            style={{
              padding: '14px 28px',
              background: 'rgba(255,255,255,0.03)',
              color: '#8a8f98',
              fontSize: 15,
              fontWeight: 510,
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.08)',
              textDecoration: 'none',
              transition: 'border-color 0.15s, color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.borderColor = 'rgba(255,255,255,0.14)'
              el.style.color = '#f7f8f8'
              el.style.background = 'rgba(255,255,255,0.05)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.borderColor = 'rgba(255,255,255,0.08)'
              el.style.color = '#8a8f98'
              el.style.background = 'rgba(255,255,255,0.03)'
            }}
          >
            Ja tinc compte
          </Link>
        </div>
      </div>
    </section>
  )
}
