'use client'

import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#08090a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-inter)' }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 8,
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 510, color: '#f7f8f8', marginBottom: 8 }}>Error de càrrega</h1>
        <p style={{ color: '#8a8f98', fontSize: 14, marginBottom: 24 }}>
          No hem pogut carregar aquesta pàgina. Comprova la connexió i torna-ho a intentar.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 24px', borderRadius: 6, cursor: 'pointer',
              background: '#22c55e', color: '#fff', fontWeight: 510, fontSize: 14,
              border: 'none', transition: 'background 0.15s',
            }}
          >
            Torna-ho a intentar
          </button>
          <Link
            href="/"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 24px', borderRadius: 6,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#d0d6e0', fontWeight: 510, fontSize: 14,
              textDecoration: 'none', transition: 'all 0.15s',
            }}
          >
            Torna a l&apos;inici
          </Link>
        </div>
      </div>
    </div>
  )
}
