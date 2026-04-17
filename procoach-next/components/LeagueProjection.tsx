'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Info, Trophy, AlertTriangle } from 'lucide-react'
import type { LeagueProjection as ProjectionData } from '@/lib/supabase-data'

const thStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 510, color: '#62666d', textTransform: 'uppercase',
  letterSpacing: '0.04em', padding: '10px 6px', textAlign: 'center',
}

function pctColor(p: number, kind: 'good' | 'bad') {
  if (p >= 80) return kind === 'good' ? '#22c55e' : '#f87171'
  if (p >= 30) return kind === 'good' ? '#86efac' : '#fca5a5'
  if (p >= 5)  return '#d0d6e0'
  return '#62666d'
}

/**
 * Largest-remainder (Hamilton) rounding so that the displayed integers
 * sum to exactly the target (default 100). Avoids "porcentajes que suman 101".
 * Returns integers ≥ 0 with the same length as input, summing to round(target).
 */
function roundPreservingSum(values: number[], target = 100): number[] {
  const floored = values.map(v => Math.floor(v))
  const remainders = values.map((v, i) => ({ i, frac: v - Math.floor(v) }))
  const sum = floored.reduce((a, b) => a + b, 0)
  const targetInt = Math.round(target)
  let diff = targetInt - sum
  const result = [...floored]
  // Need to add |diff| units, distributed to entries with largest fractional part
  // (or smallest, when subtracting).
  if (diff > 0) {
    remainders.sort((a, b) => b.frac - a.frac)
    for (let k = 0; k < diff; k++) result[remainders[k % remainders.length].i] += 1
  } else if (diff < 0) {
    remainders.sort((a, b) => a.frac - b.frac)
    for (let k = 0; k < -diff; k++) {
      const idx = remainders[k % remainders.length].i
      if (result[idx] > 0) result[idx] -= 1
    }
  }
  return result
}

function HeatCell({ value, displayInt }: { value: number; displayInt: number }) {
  // value: raw % (for color intensity). displayInt: integer to render (sums to 100).
  if (displayInt === 0) return <span style={{ color: '#3a3e44', fontSize: 10 }}>·</span>
  const opacity = Math.min(0.85, 0.05 + value / 130)
  const txtColor = displayInt > 30 ? '#0b0f15' : '#d0d6e0'
  return (
    <span style={{
      display: 'inline-block', minWidth: 26, padding: '2px 4px', borderRadius: 4,
      background: `rgba(34,197,94,${opacity})`,
      color: txtColor, fontSize: 10, fontWeight: 510, fontVariantNumeric: 'tabular-nums',
    }}>
      {displayInt}
    </span>
  )
}

export default function LeagueProjection({
  projection,
  teamSlug,
}: {
  projection: ProjectionData
  teamSlug?: string
}) {
  const [view, setView] = useState<'summary' | 'matrix'>('summary')

  if (!projection.entries.length) return null

  const n = projection.entries.length
  const VIEWS = [
    { id: 'summary' as const, label: 'Resum' },
    { id: 'matrix' as const, label: 'Matriu posicions' },
  ]

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 8, padding: '20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <TrendingUp size={14} style={{ color: '#22c55e' }} />
        <h3 style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8' }}>
          Projecció final de lliga
        </h3>
        <span style={{
          fontSize: 10, color: '#22c55e', background: 'rgba(34,197,94,0.08)',
          padding: '2px 8px', borderRadius: 9999, fontWeight: 510,
        }}>
          Monte Carlo · 20.000 sims
        </span>
        {projection.updatedAt && (
          <span style={{ fontSize: 11, color: '#62666d', marginLeft: 'auto' }}>
            Actualitzat: {new Date(projection.updatedAt).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        )}
      </div>

      <p style={{ fontSize: 11, color: '#62666d', marginBottom: 14, lineHeight: 1.5 }}>
        Predicció basada en model Dixon-Coles (Poisson amb correcció de baixa puntuació)
        calibrat sobre tots els resultats jugats fins ara, amb factor casa, ajustament H2H
        i factor de motivació segons posició a la classificació.
      </p>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 14, display: 'flex', gap: 0, overflowX: 'auto' }}>
        {VIEWS.map(({ id, label }) => {
          const isActive = view === id
          return (
            <button key={id} onClick={() => setView(id)}
              style={{
                padding: '8px 14px', fontSize: 12, fontWeight: 510,
                cursor: 'pointer', whiteSpace: 'nowrap',
                border: 'none', borderBottom: isActive ? '2px solid #22c55e' : '2px solid transparent',
                background: 'none', marginBottom: -1,
                color: isActive ? '#f7f8f8' : '#8a8f98',
                fontFamily: 'var(--font-inter)',
              }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* Summary view */}
      {view === 'summary' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>Pos.<br/>mitja</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Equip</th>
                <th style={thStyle}>Pts ara</th>
                <th style={thStyle}>Pts proj.</th>
                <th style={thStyle}>DG proj.</th>
                <th style={thStyle}>
                  <span title="Probabilitat de quedar campió"><Trophy size={11} style={{ display: 'inline', verticalAlign: -1 }} /> Camp.</span>
                </th>
                <th style={thStyle}>Top-3</th>
                <th style={thStyle}>
                  <span title="Probabilitat de descens (3 últims)"><AlertTriangle size={11} style={{ display: 'inline', verticalAlign: -1 }} /> Desc.</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projection.entries.map(e => {
                const isMy = e.team_slug === teamSlug
                const dg = e.proj_gd
                return (
                  <tr key={e.team_slug}
                    className="hover:bg-white/[0.02]"
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      background: isMy ? 'rgba(34,197,94,0.06)' : undefined,
                    }}>
                    <td style={{
                      padding: '10px 6px', textAlign: 'center', fontWeight: 510,
                      color: isMy ? '#22c55e' : '#d0d6e0', fontSize: 13, fontVariantNumeric: 'tabular-nums',
                      borderLeft: isMy ? '2px solid #22c55e' : '2px solid transparent',
                    }}>
                      {e.avg_pos.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <Link href={`/equip/${e.team_slug}`}
                        className="hover:text-[#22c55e]"
                        style={{ color: isMy ? '#f7f8f8' : '#d0d6e0', fontWeight: 510, textDecoration: 'none' }}>
                        <span className="hidden sm:inline">{e.team_name}</span>
                        <span className="sm:hidden">{e.team_name.length > 16 ? e.team_name.slice(0, 14) + '...' : e.team_name}</span>
                        {isMy && <span style={{ marginLeft: 6, color: '#22c55e', fontSize: 11 }}>(tu)</span>}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>
                      {e.current_pts}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: '#f7f8f8', fontWeight: 510, fontVariantNumeric: 'tabular-nums' }}>
                      {e.proj_pts.toFixed(1)}
                    </td>
                    <td style={{
                      padding: '10px 6px', textAlign: 'center',
                      color: dg > 0 ? '#22c55e' : dg < 0 ? '#f87171' : '#8a8f98',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {dg > 0 ? '+' : ''}{dg.toFixed(1)}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: pctColor(e.pct_champ, 'good'), fontWeight: 510, fontVariantNumeric: 'tabular-nums' }}>
                      {e.pct_champ < 0.05 ? '—' : `${e.pct_champ.toFixed(1)}%`}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: pctColor(e.pct_top3, 'good'), fontWeight: 510, fontVariantNumeric: 'tabular-nums' }}>
                      {e.pct_top3 < 0.05 ? '—' : `${e.pct_top3.toFixed(1)}%`}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', color: pctColor(e.pct_bottom3, 'bad'), fontWeight: 510, fontVariantNumeric: 'tabular-nums' }}>
                      {e.pct_bottom3 < 0.05 ? '—' : `${e.pct_bottom3.toFixed(1)}%`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Heatmap matrix view */}
      {view === 'matrix' && (
        <div style={{ overflowX: 'auto' }}>
          <p style={{ fontSize: 11, color: '#62666d', marginBottom: 10 }}>
            Probabilitat (%) de quedar a cada posició final. Cada fila suma 100%.
          </p>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ ...thStyle, textAlign: 'left' }}>Equip</th>
                {Array.from({ length: n }, (_, i) => (
                  <th key={i} style={{ ...thStyle, padding: '8px 4px' }}>{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projection.entries.map(e => {
                const isMy = e.team_slug === teamSlug
                return (
                  <tr key={e.team_slug}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      background: isMy ? 'rgba(34,197,94,0.06)' : undefined,
                    }}>
                    <td style={{
                      padding: '8px 6px',
                      borderLeft: isMy ? '2px solid #22c55e' : '2px solid transparent',
                    }}>
                      <Link href={`/equip/${e.team_slug}`}
                        className="hover:text-[#22c55e]"
                        style={{ color: isMy ? '#f7f8f8' : '#d0d6e0', fontWeight: 510, fontSize: 12, textDecoration: 'none' }}>
                        {e.team_name.length > 22 ? e.team_name.slice(0, 20) + '…' : e.team_name}
                      </Link>
                    </td>
                    {(() => {
                      const rounded = roundPreservingSum(e.pos_pct, 100)
                      return e.pos_pct.map((p, i) => (
                        <td key={i} style={{ padding: '4px 2px', textAlign: 'center' }}>
                          <HeatCell value={p} displayInt={rounded[i]} />
                        </td>
                      ))
                    })()}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer with model info */}
      <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Info size={12} style={{ color: '#62666d', flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 11, color: '#62666d', lineHeight: 1.5 }}>
          Model Dixon-Coles ajustat per màxima versemblança sobre els partits jugats.
          {projection.meta?.home_mult && ` Avantatge de camp: ${projection.meta.home_mult.toFixed(2)}×.`}
          {projection.meta?.rho !== undefined && ` Correlació de baixa puntuació ρ=${projection.meta.rho.toFixed(3)}.`}
          {' '}S&apos;han simulat 20.000 desenllaços de la lliga.
        </p>
      </div>
    </div>
  )
}
