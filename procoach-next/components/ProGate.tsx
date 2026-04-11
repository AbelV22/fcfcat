import Link from 'next/link'
import { Lock, Share2 } from 'lucide-react'

/** Inline blur for individual stat values */
export function ProBlurValue({
  value,
  blurred,
  className = '',
}: {
  value: string | number
  blurred: boolean
  className?: string
}) {
  return (
    <span className={`${className} ${blurred ? 'blur-sm select-none' : ''}`}>
      {value}
    </span>
  )
}

/** Wraps a section with blur overlay + CTA when blurred */
export function ProBlurSection({
  children,
  blurred,
  ctaHref,
  ctaText,
  ctaLabel,
}: {
  children: React.ReactNode
  blurred: boolean
  ctaHref: string
  ctaText: string
  ctaLabel: string
}) {
  if (!blurred) return <>{children}</>

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
      <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(to top, #08090a, rgba(8,9,10,0.6), transparent)',
        borderRadius: 8,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '0 24px', textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 8,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock size={18} style={{ color: '#22c55e' }} />
          </div>
          <p style={{ fontSize: 13, color: '#d0d6e0', maxWidth: 280 }}>{ctaText}</p>
          <Link
            href={ctaHref}
            className="hover:bg-[#34d399]"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRadius: 6,
              background: '#22c55e', color: '#fff', fontSize: 13, fontWeight: 510,
              textDecoration: 'none', transition: 'background 0.15s',
              fontFamily: 'var(--font-inter)',
            }}
          >
            <Share2 size={13} />
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}

/** Sticky PRO unlock banner for dashboard */
export function ProUnlockBanner() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(34,197,94,0.12)',
      borderRadius: 8, padding: 20, marginBottom: 20,
    }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center" style={{ gap: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8, flexShrink: 0,
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={16} style={{ color: '#22c55e' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontWeight: 510, color: '#f7f8f8', fontSize: 14 }}>Informe bloquejat</h3>
          <p style={{ fontSize: 12, color: '#8a8f98', marginTop: 2 }}>
            Convida 2 entrenadors per desbloquejar l&apos;Informe PRO d&apos;Àrbitre complet.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="hover:bg-[#34d399]"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
            padding: '8px 16px', borderRadius: 6,
            background: '#22c55e', color: '#fff', fontSize: 12, fontWeight: 510,
            textDecoration: 'none', transition: 'background 0.15s',
            fontFamily: 'var(--font-inter)',
          }}
        >
          <Share2 size={12} />
          Compartir i desbloquejar
        </Link>
      </div>
    </div>
  )
}
