import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Calendar, TrendingUp, Lock, UserPlus } from 'lucide-react'
import { COMPETITION_NAMES } from '@/lib/data'
import { getRefereeBySlugDB } from '@/lib/supabase-data'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const ref = await getRefereeBySlugDB(slug)
  if (!ref) return { title: 'Àrbitre no trobat — NeoScout' }
  const title = `${ref.name} — Àrbitre FCF | Estadístiques i Historial`
  const description = `Perfil de l'àrbitre ${ref.name}: ${ref.matches} partits arbitrats, ${ref.yellows_per_match} targetes grogues i ${ref.reds_per_match} vermelles per partit. Historial complet de partits al futbol català.`
  return {
    title,
    description,
    keywords: [ref.name, 'àrbitre', 'FCF', 'targetes', 'futbol català', 'estadístiques àrbitre'],
    alternates: { canonical: `https://neoscout.es/arbitre/${slug}` },
    openGraph: { title, description, url: `https://neoscout.es/arbitre/${slug}`, type: 'profile' },
  }
}

export const dynamic = 'force-dynamic'

function StatCard({ value, label, blurred }: { value: string | number; label: string; blurred?: boolean }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 8, padding: '18px 16px', textAlign: 'center',
    }}>
      <div style={{
        fontSize: 26, fontWeight: 510, color: '#f7f8f8', fontVariantNumeric: 'tabular-nums',
        ...(blurred ? { filter: 'blur(6px)', userSelect: 'none' } : {}),
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#62666d', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default async function ArbitrePage({ params }: Props) {
  const { slug } = await params
  const ref = await getRefereeBySlugDB(slug)

  if (!ref) notFound()

  const formatDate = (date: string) => {
    if (!date) return '–'
    const [day, month, year] = date.split('-')
    const months = ['', 'gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
    return `${day} ${months[parseInt(month)] || month} ${year}`
  }

  const expulsionPct = ref.matches > 0
    ? ((ref.reds / ref.matches) * 100).toFixed(0)
    : '0'

  return (
    <div style={{ fontFamily: 'var(--font-inter)' }}>
      <main className="max-w-4xl mx-auto px-4 sm:px-6" style={{ paddingTop: 40, paddingBottom: 80 }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#62666d', marginBottom: 28 }}>
          <Link href="/" style={{ color: '#62666d', textDecoration: 'none' }} className="hover:text-[#d0d6e0]">Inici</Link>
          <span>/</span>
          <Link href="/cerca?type=arbitre" style={{ color: '#62666d', textDecoration: 'none' }} className="hover:text-[#d0d6e0]">Àrbitres</Link>
          <span>/</span>
          <span style={{ color: '#8a8f98' }}>{ref.name}</span>
        </div>

        {/* Header card */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: '24px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 8, flexShrink: 0,
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 510, color: '#22c55e',
            }}>
              {ref.name.split(' ')[0]?.[0] || 'A'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2 }}>
                {ref.name}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#8a8f98' }}>Àrbitre FCF</span>
                {ref.competitions.slice(0, 2).map(c => (
                  <span
                    key={c}
                    style={{
                      fontSize: 11, fontWeight: 510, color: '#62666d',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 9999, padding: '2px 8px',
                    }}
                  >
                    {(COMPETITION_NAMES as Record<string, string>)[c] || c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Register CTA */}
        <div style={{
          background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)',
          borderRadius: 8, padding: '16px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <Lock size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', marginBottom: 2 }}>Estadístiques protegides</div>
            <p style={{ fontSize: 12, color: '#8a8f98', margin: 0 }}>
              Registra&apos;t gratis per veure totes les estadístiques i l&apos;informe complet d&apos;aquest àrbitre.
            </p>
          </div>
          <Link
            href="/registre"
            className="hover:bg-[#34d399]"
            style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 6,
              background: '#22c55e', color: '#fff', fontSize: 13, fontWeight: 510, textDecoration: 'none',
              transition: 'background 0.15s',
            }}
          >
            <UserPlus size={13} />
            Registra&apos;t gratis
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5" style={{ gap: 8, marginBottom: 24 }}>
          <StatCard value={ref.matches} label="Partits" blurred />
          <StatCard value={ref.yellows_per_match} label="🟨 per part." blurred />
          <StatCard value={ref.reds_per_match} label="🟥 per part." blurred />
          <StatCard value={ref.penalties_per_match} label="Penals/part." blurred />
          <StatCard value={`${expulsionPct}%`} label="Amb expulsió" blurred />
        </div>

        {/* Two column layout */}
        <div className="grid lg:grid-cols-3" style={{ gap: 16 }}>

          {/* Match history */}
          <div style={{
            gridColumn: 'span 2', background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px 20px',
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 510, color: '#f7f8f8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={14} style={{ color: '#22c55e' }} />
              Últims {ref.recentMatches.length} partits arbitrats
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ref.recentMatches.map((match, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 12px', borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#62666d', flexShrink: 0, width: 60 }}>{formatDate(match.date)}</span>
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ fontSize: 12, color: '#d0d6e0', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.home_team}</span>
                    <span style={{ fontSize: 12, fontWeight: 510, color: '#f7f8f8', background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: 4, flexShrink: 0, filter: 'blur(6px)', userSelect: 'none', fontVariantNumeric: 'tabular-nums' }}>
                      {match.home_score ?? '–'}–{match.away_score ?? '–'}
                    </span>
                    <span style={{ fontSize: 12, color: '#d0d6e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.away_team}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, filter: 'blur(6px)', userSelect: 'none' }}>
                    {match.yellows > 0 && <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 510 }}>🟨{match.yellows}</span>}
                    {match.reds > 0 && <span style={{ fontSize: 11, color: '#f87171', fontWeight: 510 }}>🟥{match.reds}</span>}
                    {match.yellows === 0 && match.reds === 0 && <span style={{ fontSize: 10, color: '#62666d' }}>–</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Trend */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={13} style={{ color: '#22c55e' }} />
                Tendència
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: '🟨 Grogues/partit', value: ref.yellows_per_match, max: 6 },
                  { label: '🟥 Vermelles/partit', value: ref.reds_per_match, max: 0.5 },
                  { label: 'Partits amb expulsió', value: parseFloat(expulsionPct) / 100, max: 1 },
                ].map(row => (
                  <div key={row.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8a8f98', marginBottom: 4 }}>
                      <span>{row.label}</span>
                      <span style={{ color: '#f7f8f8', filter: 'blur(6px)', userSelect: 'none' }}>{row.value}</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min((row.value / row.max) * 100, 100)}%`, height: '100%', background: '#22c55e', borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium lock */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px' }}>
              <Lock size={16} style={{ color: '#8a8f98', marginBottom: 12 }} />
              <h3 style={{ fontSize: 14, fontWeight: 510, color: '#f7f8f8', marginBottom: 8 }}>Informe complet</h3>
              <p style={{ fontSize: 12, color: '#8a8f98', marginBottom: 16, lineHeight: 1.5 }}>
                Percentil de severitat, biaix local/visitant, patrons per període i historial amb el teu equip.
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, listStyle: 'none', padding: 0 }}>
                {[
                  'Percentil vs altres àrbitres',
                  'Targetes 1a vs 2a meitat',
                  'Historial vs el teu equip',
                  'Predicció de conducta',
                ].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8a8f98' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(34,197,94,0.4)', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/registre"
                className="hover:bg-[#34d399]"
                style={{
                  display: 'block', textAlign: 'center', padding: '9px 16px',
                  borderRadius: 6, background: '#22c55e', color: '#fff',
                  fontSize: 13, fontWeight: 510, textDecoration: 'none', transition: 'background 0.15s',
                }}
              >
                Desbloqueja l&apos;informe
              </Link>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
