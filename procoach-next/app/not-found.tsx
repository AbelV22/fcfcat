import Link from 'next/link'
import HeaderV2 from '@/components/landing-v2/HeaderV2'
import FooterV2 from '@/components/landing-v2/FooterV2'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#08090a', fontFamily: 'var(--font-inter)' }}>
      <HeaderV2 />
      <main className="max-w-2xl mx-auto px-4" style={{ paddingTop: 96, paddingBottom: 96, textAlign: 'center' }}>
        <div style={{ fontSize: 80, fontWeight: 510, color: '#22c55e', letterSpacing: '-0.04em', marginBottom: 12 }}>404</div>
        <h1 style={{ fontSize: 22, fontWeight: 510, color: '#f7f8f8', marginBottom: 12 }}>Pàgina no trobada</h1>
        <p style={{ color: '#8a8f98', fontSize: 14, marginBottom: 32, maxWidth: 320, margin: '0 auto 32px' }}>
          La pàgina que busques no existeix o ha estat moguda. Prova a cercar el que necessites.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/cerca"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 24px', borderRadius: 6,
              background: '#22c55e', color: '#fff', fontWeight: 510, fontSize: 14,
              textDecoration: 'none', transition: 'background 0.15s',
            }}
          >
            Cerca equips i jugadors
          </Link>
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
      </main>
      <FooterV2 />
    </div>
  )
}
