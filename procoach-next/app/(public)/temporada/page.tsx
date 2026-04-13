import type { Metadata } from 'next'
import Link from 'next/link'
import { getTemporadaDataDB } from '@/lib/supabase-data'
import { slugify } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Temporada 2025-26 — Estadístiques Futbol Català FCF',
  description: 'Les dades de la temporada 2025-26 del futbol català: màxims golejadors, millors atacs, millors defenses i estadístiques globals de totes les categories FCF.',
  keywords: ['temporada 2025-26 futbol català', 'golejadors FCF', 'millor atac', 'millor defensa', 'estadístiques FCF'],
  alternates: { canonical: 'https://neoscout.es/temporada' },
}

function SectionHeader({ label, aside }: { label: string; aside?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 510, color: '#62666d', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
      {aside && <span style={{ fontSize: 11, color: '#62666d', whiteSpace: 'nowrap' }}>{aside}</span>}
    </div>
  )
}

export default async function TemporadaPage() {
  const data = await getTemporadaDataDB()

  const heroStats = [
    { value: data?.totalMatches?.toLocaleString('ca') ?? '–', label: 'Partits analitzats' },
    { value: data?.totalGoals?.toLocaleString('ca') ?? '–', label: 'Gols registrats' },
    { value: data?.totalYellows?.toLocaleString('ca') ?? '–', label: 'Targetes grogues' },
    { value: data?.totalReds?.toLocaleString('ca') ?? '–', label: 'Targetes vermelles' },
  ]

  return (
    <div style={{ fontFamily: 'var(--font-inter)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6" style={{ paddingTop: 48, paddingBottom: 80 }}>

        {/* Section header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)',
            borderRadius: 9999, padding: '4px 12px', marginBottom: 16,
            fontSize: 11, fontWeight: 510, color: '#22c55e', letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
            Temporada 2025-26
          </div>
          <h1 style={{
            fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 510,
            letterSpacing: '-0.02em', color: '#f7f8f8', lineHeight: 1.1, marginBottom: 8,
          }}>
            La temporada en dades
          </h1>
          <p style={{ fontSize: 14, color: '#8a8f98', margin: 0 }}>
            Estadístiques acumulades de totes les categories de la FCF
          </p>
        </div>

        {/* Hero stats grid — 2×2 with divider lines */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1, marginBottom: 48,
          background: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden',
        }}>
          {heroStats.map((s, i) => (
            <div key={i} style={{ background: '#08090a', padding: '20px 24px' }}>
              <div style={{ fontSize: 28, fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: '#62666d', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* Top scorers */}
          <div>
            <SectionHeader label="Màxims golejadors" />
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, overflow: 'hidden',
            }}>
              {(data?.topScorers ?? []).map((scorer, i) => {
                const maxGoals = data?.topScorers?.[0]?.goals ?? 1
                const barPct = Math.round((scorer.goals / maxGoals) * 100)
                return (
                  <Link
                    key={i}
                    href={`/jugador/${scorer.slug}`}
                    className="hover:bg-white/[0.03]"
                    style={{
                      display: 'grid', gridTemplateColumns: '28px 1fr auto',
                      alignItems: 'center', gap: 12, padding: '11px 16px',
                      borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                      textDecoration: 'none', transition: 'background 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 510, color: i < 3 ? '#22c55e' : '#62666d', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                      {i + 1}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {scorer.name}
                        </span>
                        <span style={{ fontSize: 11, color: '#62666d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
                          {scorer.team}
                        </span>
                      </div>
                      <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${barPct}%`, height: '100%', background: i < 3 ? '#22c55e' : 'rgba(255,255,255,0.15)', borderRadius: 2 }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 510, color: '#f7f8f8', fontVariantNumeric: 'tabular-nums' }}>{scorer.goals}</span>
                      <span style={{ fontSize: 10, color: '#62666d', marginLeft: 3 }}>gols</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Attack & Defense — side by side on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 24 }}>

            {/* Best attack */}
            <div>
              <SectionHeader label="Millor atac" aside="més gols marcats" />
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                {(data?.bestAttack ?? []).map((team, i) => (
                  <Link
                    key={i}
                    href={`/equip/${team.slug}`}
                    className="hover:bg-white/[0.03]"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                      textDecoration: 'none', transition: 'background 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 510, color: i < 3 ? '#22c55e' : '#62666d', width: 16, flexShrink: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 510, color: '#d0d6e0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {team.name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {team.goals_for}
                    </span>
                    <span style={{ fontSize: 10, color: '#62666d', flexShrink: 0 }}>⚽</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Best defense */}
            <div>
              <SectionHeader label="Millor defensa" aside="menys gols encaixats" />
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                {(data?.bestDefense ?? []).map((team, i) => (
                  <Link
                    key={i}
                    href={`/equip/${team.slug}`}
                    className="hover:bg-white/[0.03]"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                      textDecoration: 'none', transition: 'background 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 510, color: i < 3 ? '#22c55e' : '#62666d', width: 16, flexShrink: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 510, color: '#d0d6e0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {team.name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {team.goals_against}
                    </span>
                    <span style={{ fontSize: 10, color: '#62666d', flexShrink: 0 }}>enc.</span>
                  </Link>
                ))}
              </div>
            </div>

          </div>

          {/* CTA */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 510, color: '#f7f8f8', marginBottom: 6 }}>
                Prepara els teus partits amb dades reals
              </div>
              <p style={{ fontSize: 13, color: '#8a8f98', margin: 0, lineHeight: 1.5 }}>
                Registra el teu equip i accedeix a informes de rivals, àrbitres i classificació en temps real.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/entrenador" className="v2-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                Registra&apos;t gratis
              </Link>
              <Link href="/cerca" className="v2-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                Explorar la plataforma
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
