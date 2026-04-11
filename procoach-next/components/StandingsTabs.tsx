'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ListOrdered, Flame, Home, Plane } from 'lucide-react'
import type { FormStandingEntry, StandingEntry } from '@/lib/supabase-data'

type TabId = 'general' | 'local' | 'visitant' | 'racha'

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'local', label: 'Local' },
  { id: 'visitant', label: 'Visitant' },
  { id: 'racha', label: 'Racha (5)' },
]

function computeSplitStandings(standings: StandingEntry[], mode: 'local' | 'visitant') {
  return standings
    .map((s) => {
      const wins = mode === 'local' ? s.home_won : s.away_won
      const draws = mode === 'local' ? s.home_drawn : s.away_drawn
      const losses = mode === 'local' ? s.home_lost : s.away_lost
      const played = wins + draws + losses
      const points = wins * 3 + draws
      return { ...s, played, wins, draws, losses, points }
    })
    .sort((a, b) => b.points - a.points || (b.wins - a.wins) || a.name.localeCompare(b.name))
    .map((s, i) => ({ ...s, position: i + 1 }))
}

const thStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 510, color: '#62666d', textTransform: 'uppercase',
  letterSpacing: '0.04em', padding: '10px 6px', textAlign: 'center',
}

export default function StandingsTabs({
  standings,
  formStandings,
  teamSlug,
}: {
  standings: StandingEntry[]
  formStandings: FormStandingEntry[]
  teamSlug: string
}) {
  const [tab, setTab] = useState<TabId>('general')

  const homeStandings = useMemo(() => computeSplitStandings(standings, 'local'), [standings])
  const awayStandings = useMemo(() => computeSplitStandings(standings, 'visitant'), [standings])

  if (standings.length === 0) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 48, textAlign: 'center' }}>
        <ListOrdered size={36} style={{ color: '#62666d', margin: '0 auto 16px', opacity: 0.4 }} />
        <p style={{ color: '#8a8f98', fontSize: 14 }}>No s&apos;ha trobat la classificació.</p>
      </div>
    )
  }

  const showGfGa = tab === 'general'
  const activeStandings =
    tab === 'local' ? homeStandings :
    tab === 'visitant' ? awayStandings :
    standings

  return (
    <>
      {/* Tab bar — underline style */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 20, display: 'flex', gap: 0, overflowX: 'auto' }}>
        {TABS.map(({ id, label }) => {
          const isActive = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: '10px 14px', fontSize: 13, fontWeight: 510,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                border: 'none', borderBottom: isActive ? '2px solid #22c55e' : '2px solid transparent',
                background: 'none', marginBottom: -1,
                color: isActive ? '#f7f8f8' : '#8a8f98',
                transition: 'color 0.15s, border-color 0.15s',
                fontFamily: 'var(--font-inter)',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Main standings table */}
      {tab !== 'racha' && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '16px 20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ ...thStyle, textAlign: 'center', width: 32 }}>#</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Equip</th>
                <th style={thStyle}>PJ</th>
                <th style={thStyle}>PG</th>
                <th style={thStyle}>PE</th>
                <th style={thStyle}>PP</th>
                {showGfGa && (
                  <>
                    <th style={thStyle}>GF</th>
                    <th style={thStyle}>GC</th>
                    <th style={thStyle}>Dif</th>
                  </>
                )}
                <th style={{ ...thStyle, color: '#f7f8f8' }}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {activeStandings.map((s, i) => {
                const isMyTeam = s.slug === teamSlug
                const diff = s.gf - s.ga
                return (
                  <tr
                    key={s.slug}
                    className="hover:bg-white/[0.02]"
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      transition: 'background 0.15s',
                      background: isMyTeam ? 'rgba(34,197,94,0.06)' : undefined,
                    }}
                  >
                    <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 510, fontSize: 11, color: isMyTeam ? '#22c55e' : '#62666d', borderLeft: isMyTeam ? '2px solid #22c55e' : '2px solid transparent' }}>
                      {s.position}
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <Link
                        href={`/equip/${s.slug}`}
                        className="hover:text-[#22c55e]"
                        style={{ color: isMyTeam ? '#f7f8f8' : '#d0d6e0', fontWeight: 510, textDecoration: 'none', transition: 'color 0.15s' }}
                      >
                        <span className="hidden sm:inline">{s.name}</span>
                        <span className="sm:hidden">{s.name.length > 16 ? s.name.slice(0, 14) + '...' : s.name}</span>
                        {isMyTeam && <span style={{ marginLeft: 6, color: '#22c55e', fontSize: 11 }}>(tu)</span>}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>{s.played}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>{s.wins}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>{s.draws}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>{s.losses}</td>
                    {showGfGa && (
                      <>
                        <td style={{ padding: '10px 6px', textAlign: 'center', color: '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>{s.gf}</td>
                        <td style={{ padding: '10px 6px', textAlign: 'center', color: '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>{s.ga}</td>
                        <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 510, color: diff > 0 ? '#22c55e' : diff < 0 ? '#f87171' : '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>
                          {diff > 0 ? '+' : ''}{diff}
                        </td>
                      </>
                    )}
                    <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 510, fontSize: 15, color: isMyTeam ? '#22c55e' : '#f7f8f8', fontVariantNumeric: 'tabular-nums' }}>
                      {s.points}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form standings (Racha tab) */}
      {tab === 'racha' && formStandings.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '16px 20px', overflowX: 'auto' }}>
          <p style={{ fontSize: 13, color: '#8a8f98', marginBottom: 14 }}>Classificació basada en els punts obtinguts als últims 5 partits jugats</p>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ ...thStyle, width: 32 }}>#</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Equip</th>
                <th style={thStyle}>Últims 5</th>
                <th style={thStyle}>PJ</th>
                <th style={thStyle}>PG</th>
                <th style={thStyle}>PE</th>
                <th style={thStyle}>PP</th>
                <th style={thStyle}>GF</th>
                <th style={thStyle}>GC</th>
                <th style={{ ...thStyle, color: '#f7f8f8' }}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {formStandings.map((s, i) => {
                const isMyTeam = s.slug === teamSlug
                return (
                  <tr
                    key={s.slug}
                    className="hover:bg-white/[0.02]"
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      transition: 'background 0.15s',
                      background: isMyTeam ? 'rgba(34,197,94,0.06)' : undefined,
                    }}
                  >
                    <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 510, fontSize: 11, color: isMyTeam ? '#22c55e' : '#62666d', borderLeft: isMyTeam ? '2px solid #22c55e' : '2px solid transparent' }}>
                      {s.position}
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <Link
                        href={`/equip/${s.slug}`}
                        className="hover:text-[#22c55e]"
                        style={{ color: isMyTeam ? '#f7f8f8' : '#d0d6e0', fontWeight: 510, textDecoration: 'none', transition: 'color 0.15s' }}
                      >
                        <span className="hidden sm:inline">{s.name}</span>
                        <span className="sm:hidden">{s.name.length > 16 ? s.name.slice(0, 14) + '...' : s.name}</span>
                        {isMyTeam && <span style={{ marginLeft: 6, color: '#22c55e', fontSize: 11 }}>(tu)</span>}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                        {s.form.slice().reverse().map((r, fi) => (
                          <span
                            key={fi}
                            style={{
                              width: 18, height: 18, borderRadius: 9, fontSize: 9, fontWeight: 510,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: r === 'W' ? 'rgba(34,197,94,0.15)' : r === 'D' ? 'rgba(255,255,255,0.06)' : 'rgba(248,113,113,0.15)',
                              color: r === 'W' ? '#22c55e' : r === 'D' ? '#8a8f98' : '#f87171',
                            }}
                          >
                            {r === 'W' ? 'V' : r === 'D' ? 'E' : 'D'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>{s.played}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>{s.wins}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>{s.draws}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>{s.losses}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>{s.gf}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>{s.ga}</td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 510, fontSize: 15, color: isMyTeam ? '#22c55e' : '#f7f8f8', fontVariantNumeric: 'tabular-nums' }}>
                      {s.points}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'racha' && formStandings.length === 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 48, textAlign: 'center' }}>
          <Flame size={36} style={{ color: '#62666d', margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ color: '#8a8f98', fontSize: 14 }}>No hi ha dades de ratxa disponibles.</p>
        </div>
      )}
    </>
  )
}
