'use client'

import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react'
import type { PDFReportData } from './TeamReportActions'
import { LOGO_BASE64 } from '@/lib/logo-base64'

// ─── Constants ────────────────────────────────────────────────────────────
// A4 at 96 DPI = 794 x 1123 px. We render at this size, then capture at 2x.
const PW = 794
const PH = 1123
const RESULT_LABEL: Record<string, string> = { W: 'V', D: 'E', L: 'D' }

type SplitStats = { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number }
type MatchEntry = { date: string; jornada: number; opponent: string; isHome: boolean; goalsFor: number | null; goalsAgainst: number | null; result: 'W' | 'D' | 'L' | null; referee: string | null }
type PlayerEntry = { name: string; appearances: number; starts?: number; goals: number; yellow_cards: number; red_cards: number; minutes_played: number; risk: boolean }
type GoalBucketEntry = { label: string; scored: number; conceded: number }

const NO_MIN = new Set(['quarta-catalana', 'juvenil-primera-divisio', 'preferent-juvenils'])

// ─── Colors (solid backgrounds for html2canvas) ───────────────────────────

const BG = '#0f172a'
const BG_CARD = '#162033'
const BG_ROW = '#1a2744'
const GREEN = '#22c55e'
const CYAN = '#06b6d4'
const AMBER = '#f59e0b'
const RED = '#ef4444'
const WHITE = '#f1f5f9'
const S300 = '#cbd5e1'
const S400 = '#94a3b8'
const S500 = '#64748b'
const S600 = '#475569'
const S700 = '#334155'
const EMERALD_DK = '#166534'

// Use widely available system fonts — html2canvas cannot render custom webfonts reliably
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

const pageStyle: React.CSSProperties = {
  width: PW,
  minHeight: PH,
  height: PH,
  background: BG,
  position: 'relative',
  overflow: 'hidden',
  fontFamily: FONT,
  color: WHITE,
  boxSizing: 'border-box',
}

function pct(n: number, total: number) { return total > 0 ? Math.round((n / total) * 100) : 0 }

function formatDate(d: string) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) {
    const months = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
    return `${parts[2]} ${months[parseInt(parts[1], 10) - 1] || parts[1]}`
  }
  return d
}

// ─── Shared page chrome ──────────────────────────────────────────────────

function PageHeader({ isFirst, date }: { isFirst: boolean; date: string }) {
  return (
    <div>
      {/* Full-bleed gradient accent line */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${GREEN}, ${CYAN} 50%, ${GREEN})` }} />
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', margin: '10px 28px 0', background: '#0a1020', borderRadius: 10, border: `1px solid ${S700}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={LOGO_BASE64} alt="" style={{ width: 24, height: 24, borderRadius: 5 }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: WHITE, fontFamily: FONT, letterSpacing: '-0.02em' }}>Neo<span style={{ color: GREEN }}>Scout</span></span>
        </div>
        {isFirst && (
          <div style={{ background: `linear-gradient(135deg, ${EMERALD_DK}, #0d4a2a)`, padding: '4px 14px', borderRadius: 12, fontSize: 9, fontWeight: 700, color: WHITE, letterSpacing: '0.1em', textTransform: 'uppercase' as const, border: `1px solid ${GREEN}30` }}>
            Informe Pre-Partit
          </div>
        )}
        <span style={{ fontSize: 9, color: S500, fontFamily: FONT }}>{date}</span>
      </div>
    </div>
  )
}

function PageFooter({ pageNum, totalPages, teamSlug }: { pageNum: number; totalPages: number; teamSlug: string }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${S700}, transparent)`, margin: '0 28px' }} />
      <div style={{ height: 36, background: '#080f1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 8, color: S500 }}>
          <img src={LOGO_BASE64} alt="" style={{ width: 12, height: 12, borderRadius: 2 }} />
          <span>Generat amb</span>
          <span style={{ color: WHITE, fontWeight: 700 }}>Neo</span>
          <span style={{ color: GREEN, fontWeight: 700 }}>Scout</span>
        </div>
        <span style={{ fontSize: 8, color: S600, fontWeight: 600 }}>{pageNum} / {totalPages}</span>
        <span style={{ fontSize: 8, color: S600 }}>neoscout.es/equip/{teamSlug}</span>
      </div>
    </div>
  )
}

// ─── Micro components ────────────────────────────────────────────────────

// SVG approach — html2canvas cannot reliably center text with CSS (flex, table-cell,
// lineHeight, padding all fail). SVG <text> with textAnchor + dominantBaseline is
// pixel-perfect because it uses vector coordinates, not CSS layout.
// Proven pattern: see components/apunts/DonutChart.tsx:74

function PDFFormDot({ result, size = 26 }: { result: string | null; size?: number }) {
  const bg = result === 'W' ? GREEN : result === 'D' ? AMBER : result === 'L' ? RED : S700
  const fs = size === 26 ? 12 : 10
  const r = size / 2
  return (
    <svg width={size} height={size} style={{ flexShrink: 0, display: 'block' }}>
      <circle cx={r} cy={r} r={r} fill={bg} />
      <text x={r} y={r} textAnchor="middle" dominantBaseline="central"
        fontSize={fs} fontWeight="800" fill={WHITE} fontFamily={FONT}>
        {result ? RESULT_LABEL[result] : '?'}
      </text>
    </svg>
  )
}

function NumberBadge({ value, color, bgColor, borderColor }: { value: number | string; color: string; bgColor: string; borderColor: string }) {
  return (
    <svg width={30} height={26} style={{ flexShrink: 0, display: 'block' }}>
      <rect x={0.5} y={0.5} width={29} height={25} rx={6} fill={bgColor} stroke={borderColor} strokeWidth={1} />
      <text x={15} y={13} textAnchor="middle" dominantBaseline="central"
        fontSize="13" fontWeight="900" fill={color} fontFamily={FONT}>
        {value}
      </text>
    </svg>
  )
}

function StatCell({ label, val1, val2 }: { label: string; val1: string; val2: string }) {
  return (
    <div style={{ background: BG_ROW, borderRadius: 8, padding: '10px 6px', textAlign: 'center' as const, boxSizing: 'border-box' as const, border: `1px solid ${S700}` }}>
      <div style={{ fontSize: 8, color: S500, marginBottom: 5, fontWeight: 700, fontFamily: FONT, letterSpacing: '0.06em', textTransform: 'uppercase' as const, lineHeight: '14px' }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: GREEN, fontFamily: FONT, lineHeight: '24px' }}>{val1}</span>
        <span style={{ fontSize: 10, color: S600, fontWeight: 600, lineHeight: '14px' }}>vs</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: S300, fontFamily: FONT, lineHeight: '24px' }}>{val2}</span>
      </div>
    </div>
  )
}

function SplitBox({ label, data }: { label: string; data: SplitStats }) {
  const wr = pct(data.wins, data.played)
  const isHome = label.includes('LOCAL')
  return (
    <div style={{ flex: 1, background: BG_CARD, borderRadius: 10, padding: '12px 14px', boxSizing: 'border-box' as const, borderLeft: `3px solid ${isHome ? GREEN : CYAN}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: isHome ? GREEN : CYAN, fontFamily: FONT, letterSpacing: '0.06em', lineHeight: '16px' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 900, color: WHITE, fontFamily: FONT, lineHeight: '18px' }}>{wr}<span style={{ fontSize: 10, color: S400 }}>%</span></span>
      </div>
      <div style={{ fontSize: 10, color: S300, marginBottom: 8, fontFamily: FONT, lineHeight: '16px' }}>
        {data.played} PJ · {data.wins}V {data.draws}E {data.losses}D · {data.gf}-{data.ga}
      </div>
      <div style={{ height: 6, background: '#1e2d41', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
        {data.played > 0 && (
          <>
            <div style={{ width: `${(data.wins / data.played) * 100}%`, background: GREEN, borderRadius: 3, minWidth: data.wins > 0 ? 3 : 0 }} />
            <div style={{ width: `${(data.draws / data.played) * 100}%`, background: AMBER, minWidth: data.draws > 0 ? 3 : 0 }} />
            <div style={{ width: `${(data.losses / data.played) * 100}%`, background: RED, minWidth: data.losses > 0 ? 3 : 0 }} />
          </>
        )}
      </div>
    </div>
  )
}

function InsightRow({ label, value }: { label: string; value: string }) {
  const isPercent = value.endsWith('%')
  const numVal = isPercent ? parseInt(value) : null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${S700}` }}>
      <span style={{ fontSize: 10, color: S300, fontFamily: FONT, lineHeight: '16px' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: numVal !== null && numVal >= 50 ? GREEN : numVal !== null && numVal < 25 ? RED : WHITE, fontFamily: FONT, lineHeight: '18px' }}>{value}</span>
    </div>
  )
}

function PlayerRow({ pos, name, col1, col2, col3, highlight }: { pos: number; name: string; col1: string; col2: string; col3: string; highlight?: boolean }) {
  const truncName = name.length > 36 ? name.slice(0, 34) + '...' : name
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', background: pos % 2 === 1 ? BG_ROW : 'transparent', borderRadius: 5, gap: 8, fontFamily: FONT, boxSizing: 'border-box' as const }}>
      <span style={{ fontSize: 9, color: S600, fontWeight: 700, width: 18, textAlign: 'center' as const, flexShrink: 0, lineHeight: '16px' }}>{pos}</span>
      <span style={{ fontSize: 10, color: highlight ? WHITE : S300, fontWeight: highlight ? 600 : 400, flex: 1, whiteSpace: 'nowrap' as const, lineHeight: '18px' }}>{truncName}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: highlight ? GREEN : WHITE, width: 34, textAlign: 'center' as const, flexShrink: 0, lineHeight: '18px' }}>{col1}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: S400, width: 34, textAlign: 'center' as const, flexShrink: 0, lineHeight: '16px' }}>{col2}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: CYAN, width: 48, textAlign: 'right' as const, flexShrink: 0, lineHeight: '16px' }}>{col3}</span>
    </div>
  )
}

function MatchRow({ m, showOpp }: { m: MatchEntry; showOpp: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px', borderRadius: 4, fontFamily: FONT, boxSizing: 'border-box' as const }}>
      <PDFFormDot result={m.result} size={22} />
      {m.goalsFor !== null && m.goalsAgainst !== null && (
        <span style={{ fontSize: 13, fontWeight: 800, color: WHITE, width: 32, textAlign: 'center' as const, flexShrink: 0, lineHeight: '18px' }}>{m.goalsFor}-{m.goalsAgainst}</span>
      )}
      <span style={{ fontSize: 9, color: S500, width: 14, flexShrink: 0, lineHeight: '16px' }}>{m.isHome ? 'L' : 'V'}</span>
      {showOpp && <span style={{ fontSize: 9, color: S300, flex: 1, whiteSpace: 'nowrap' as const, lineHeight: '16px' }}>{m.opponent.length > 30 ? m.opponent.slice(0, 28) + '...' : m.opponent}</span>}
      <span style={{ fontSize: 8, color: S600, flexShrink: 0, lineHeight: '14px' }}>{formatDate(m.date)}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export interface RivalReportPDFHandle {
  generatePDF: () => Promise<void>
}

const RivalReportPDF = forwardRef<RivalReportPDFHandle, { data: PDFReportData; teamSlug: string }>(
  function RivalReportPDF({ data, teamSlug }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)

    const r = data
    const rival = r.rival!
    const nm = r.nextMatch!
    const hasMin = !NO_MIN.has(r.competition)
    const [dateStr, setDateStr] = useState('')
    useEffect(() => {
      const today = new Date()
      setDateStr(`${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`)
    }, [])

    // Determine total pages
    const hasPitchData = !!r.homePitch || !!r.rivalPitch
    const totalPages = hasPitchData ? 3 : 2

    useImperativeHandle(ref, () => ({
      generatePDF: async () => {
        const container = containerRef.current
        if (!container) return

        // Wait for fonts and images
        await document.fonts.ready
        // Small delay to let images decode
        await new Promise(resolve => setTimeout(resolve, 200))

        const html2canvas = (await import('html2canvas')).default
        const { jsPDF } = await import('jspdf')

        const pdf = new jsPDF('p', 'mm', 'a4')
        const pages = container.querySelectorAll<HTMLDivElement>('[data-pdf-page]')

        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.addPage()
          const canvas = await html2canvas(pages[i], {
            scale: 2,
            backgroundColor: BG,
            useCORS: true,
            logging: false,
            width: PW,
            height: PH,
            windowWidth: PW,
            windowHeight: PH,
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0,
          })
          const imgData = canvas.toDataURL('image/jpeg', 0.92)
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)
        }

        const filename = `NeoScout_Rival_${rival.name.replace(/[^a-zA-Z0-9 ]/gi, '').replace(/\s+/g, '_')}.pdf`
        pdf.save(filename)
      },
    }))

    // Stats comparison
    const stats = [
      ['PJ', String(r.played), String(rival.played)],
      ['V', String(r.wins), String(rival.wins)],
      ['E', String(r.draws), String(rival.draws)],
      ['D', String(r.losses), String(rival.losses)],
      ['GF', String(r.gf), String(rival.gf)],
      ['GC', String(r.ga), String(rival.ga)],
      ['%V', `${pct(r.wins, r.played)}%`, `${pct(rival.wins, rival.played)}%`],
      ['G/P', r.played > 0 ? (r.gf / r.played).toFixed(1) : '0', rival.played > 0 ? (rival.gf / rival.played).toFixed(1) : '0'],
    ]

    const scorers = rival.topScorers.filter(p => p.goals > 0).slice(0, 5)
    const danger = rival.apercibits.slice(0, 5)
    const starters = rival.mostMinutes.slice(0, 7)
    const h2hItems = data.headToHead.slice(0, 5)
    const formItems = rival.form.slice(0, 5)
    const buckets = rival.goalBuckets
    const maxBucket = Math.max(...(buckets?.map(b => Math.max(b.scored, b.conceded)) || [1]), 1)

    // Content area = PH - header(~60) - footer(32) - padding = ~1000px usable per page
    const PAD = 28
    const CONTENT_START = 14

    return (
      <div
        ref={containerRef}
        style={{ position: 'fixed', left: '-9999px', top: 0, width: PW, zIndex: -1, pointerEvents: 'none' as const }}
        aria-hidden="true"
      >
        {/* ═══════════ PAGE 1 ═══════════ */}
        <div data-pdf-page style={pageStyle}>
          <div style={{ paddingTop: CONTENT_START }}>
            <PageHeader isFirst date={dateStr} />
          </div>

          <div style={{ padding: `12px ${PAD}px 0` }}>
            {/* Match Banner */}
            <div style={{ background: `linear-gradient(135deg, #0d1f2d 0%, ${BG_CARD} 50%, #1a1428 100%)`, borderRadius: 12, padding: '18px 20px 16px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${GREEN}, ${CYAN})` }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Team */}
                <div style={{ textAlign: 'center' as const, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <svg width={48} height={48}>
                      <circle cx={24} cy={24} r={22} fill="#1e3a2a" stroke={`${GREEN}40`} strokeWidth={2} />
                      <text x={24} y={24} textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="900" fill={GREEN} fontFamily={FONT}>{r.name.charAt(0)}</text>
                    </svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: WHITE, marginBottom: 3, fontFamily: FONT, lineHeight: '18px' }}>{r.name.length > 22 ? r.name.slice(0, 20) + '...' : r.name}</div>
                  <div style={{ fontSize: 10, color: S400, fontFamily: FONT, lineHeight: '16px' }}>#{r.position || '-'} · {r.points} pts</div>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
                    {r.form.slice(0, 5).reverse().map((f, i) => <PDFFormDot key={i} result={f.result} />)}
                  </div>
                </div>
                {/* Center */}
                <div style={{ textAlign: 'center' as const, padding: '0 16px', flexShrink: 0 }}>
                  <div style={{ background: nm.isHome ? '#166534' : '#164e63', padding: '4px 14px', borderRadius: 10, fontSize: 8, fontWeight: 700, color: WHITE, marginBottom: 6, display: 'inline-block', fontFamily: FONT, letterSpacing: '0.08em', lineHeight: '14px' }}>
                    {nm.isHome ? 'LOCAL' : 'VISITANT'}
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: S600, marginBottom: 4, fontFamily: FONT, lineHeight: '34px', letterSpacing: '-0.02em' }}>VS</div>
                  <div style={{ fontSize: 9, color: S500, fontFamily: FONT, lineHeight: '14px' }}>Jornada {nm.jornada}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: WHITE, marginTop: 3, fontFamily: FONT, lineHeight: '16px' }}>{nm.date}{nm.time ? ` · ${nm.time}h` : ''}</div>
                  {nm.referee && <div style={{ fontSize: 8, color: S500, marginTop: 4, fontFamily: FONT, lineHeight: '14px' }}>Arbitre: {nm.referee}</div>}
                </div>
                {/* Rival */}
                <div style={{ textAlign: 'center' as const, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <svg width={48} height={48}>
                      <circle cx={24} cy={24} r={22} fill="#2a1e1e" stroke={`${RED}40`} strokeWidth={2} />
                      <text x={24} y={24} textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="900" fill={RED} fontFamily={FONT}>{rival.name.charAt(0)}</text>
                    </svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: WHITE, marginBottom: 3, fontFamily: FONT, lineHeight: '18px' }}>{rival.name.length > 22 ? rival.name.slice(0, 20) + '...' : rival.name}</div>
                  <div style={{ fontSize: 10, color: S400, fontFamily: FONT, lineHeight: '16px' }}>#{rival.position || '-'} · {rival.points} pts</div>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
                    {rival.form.slice(0, 5).reverse().map((f, i) => <PDFFormDot key={i} result={f.result} />)}
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Comparativa */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: GREEN }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: WHITE, letterSpacing: '0.06em', fontFamily: FONT, lineHeight: '16px' }}>COMPARATIVA</span>
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <span style={{ fontSize: 8, color: GREEN, fontWeight: 700, fontFamily: FONT, lineHeight: '14px' }}>{r.name.length > 18 ? r.name.slice(0, 18) + '...' : r.name}</span>
                  <span style={{ fontSize: 8, color: S400, fontWeight: 700, fontFamily: FONT, lineHeight: '14px' }}>{rival.name.length > 18 ? rival.name.slice(0, 18) + '...' : rival.name}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                {stats.map(s => <div key={s[0]} style={{ width: 'calc(25% - 4px)', boxSizing: 'border-box' as const }}><StatCell label={s[0]} val1={s[1]} val2={s[2]} /></div>)}
              </div>
            </div>

            {/* Home / Away Split */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <SplitBox label="RIVAL COM A LOCAL" data={rival.home} />
              <SplitBox label="RIVAL COM A VISITANT" data={rival.away} />
            </div>

            {/* Insights + Goal Buckets side by side */}
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Insights */}
              {rival.insights && (
                <div style={{ flex: 1, background: BG_CARD, borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${AMBER}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: AMBER }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: AMBER, letterSpacing: '0.06em', fontFamily: FONT, lineHeight: '16px' }}>PATRONS DEL RIVAL</span>
                  </div>
                  {[
                    rival.insights.cleanSheetRate !== null ? ['Porteria a 0', `${rival.insights.cleanSheetRate}%`] : null,
                    rival.insights.scoreFirstWinRate !== null ? ['Marca 1r i guanya', `${rival.insights.scoreFirstWinRate}%`] : null,
                    rival.insights.comebackRate !== null ? ['Remuntades', `${rival.insights.comebackRate}%`] : null,
                    rival.insights.lateGoalRate !== null ? ['Gols tardans 75+', `${rival.insights.lateGoalRate}%`] : null,
                    ['Gols 1a part', String(rival.insights.firstHalfGoals)],
                    ['Gols 2a part', String(rival.insights.secondHalfGoals)],
                  ].filter(Boolean).map((row, i) => <InsightRow key={i} label={row![0]} value={row![1]} />)}
                </div>
              )}
              {/* Goal Buckets */}
              {buckets && buckets.length > 0 && (
                <div style={{ flex: 1, background: BG_CARD, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: '0.06em', fontFamily: FONT, lineHeight: '16px' }}>MINUTS DE GOL</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: GREEN }} />
                        <span style={{ fontSize: 8, color: S400, fontFamily: FONT }}>GF</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: RED }} />
                        <span style={{ fontSize: 8, color: S400, fontFamily: FONT }}>GC</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
                    {buckets.map((b, i) => {
                      const sH = maxBucket > 0 ? (b.scored / maxBucket) * 70 : 0
                      const cH = maxBucket > 0 ? (b.conceded / maxBucket) * 70 : 0
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 70, width: '100%', justifyContent: 'center' }}>
                            <div style={{ width: '35%', height: Math.max(sH, b.scored > 0 ? 4 : 0), background: GREEN, borderRadius: '2px 2px 0 0' }} />
                            <div style={{ width: '35%', height: Math.max(cH, b.conceded > 0 ? 4 : 0), background: RED, borderRadius: '2px 2px 0 0' }} />
                          </div>
                          <span style={{ fontSize: 7, color: S500, marginTop: 3, fontFamily: FONT }}>{b.label}</span>
                          <div style={{ display: 'flex', gap: 3, marginTop: 1 }}>
                            <span style={{ fontSize: 7, color: GREEN, fontWeight: 700, fontFamily: FONT }}>{b.scored}</span>
                            <span style={{ fontSize: 7, color: RED, fontWeight: 700, fontFamily: FONT }}>{b.conceded}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <PageFooter pageNum={1} totalPages={totalPages} teamSlug={teamSlug} />
        </div>

        {/* ═══════════ PAGE 2 ═══════════ */}
        <div data-pdf-page style={pageStyle}>
          <div style={{ paddingTop: CONTENT_START }}>
            <PageHeader isFirst={false} date={dateStr} />
          </div>

          <div style={{ padding: `12px ${PAD}px 0` }}>
            {/* Titulars Habituals */}
            {starters.length > 0 && (
              <div style={{ background: BG_CARD, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${S700}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: CYAN }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: CYAN, letterSpacing: '0.06em', fontFamily: FONT, lineHeight: '16px' }}>TITULARS HABITUALS</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 8, color: S500, fontFamily: FONT, letterSpacing: '0.04em', lineHeight: '14px' }}>
                    <span>gols</span><span>PJ</span><span>{hasMin ? 'min.' : 'tit.'}</span>
                  </div>
                </div>
                {starters.map((p, i) => (
                  <PlayerRow
                    key={i}
                    pos={i + 1}
                    name={p.name}
                    col1={String(p.goals)}
                    col2={String(p.appearances)}
                    col3={hasMin ? `${p.minutes_played}'` : String(p.starts ?? p.appearances)}
                    highlight={p.goals > 0}
                  />
                ))}
              </div>
            )}

            {/* Golejadors + Apercibits side by side */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {scorers.length > 0 && (
                <div style={{ flex: 1, background: BG_CARD, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${S700}` }}>
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: GREEN }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: '0.06em', fontFamily: FONT, lineHeight: '16px' }}>GOLEJADORS</span>
                  </div>
                  {scorers.map((p, i) => {
                    const sName = p.name.length > 22 ? p.name.slice(0, 20) + '...' : p.name
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 8px', background: i % 2 === 0 ? BG_ROW : 'transparent', borderRadius: 5 }}>
                        <span style={{ fontSize: 10, color: S300, whiteSpace: 'nowrap' as const, fontFamily: FONT, lineHeight: '18px' }}>{sName}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 8, color: S500, fontFamily: FONT, lineHeight: '14px' }}>{p.appearances} PJ</span>
                          <NumberBadge value={p.goals} color={GREEN} bgColor="#0d2818" borderColor={`${GREEN}30`} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {danger.length > 0 && (
                <div style={{ flex: 1, background: BG_CARD, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${S700}` }}>
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: AMBER }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: AMBER, letterSpacing: '0.06em', fontFamily: FONT, lineHeight: '16px' }}>APERCEBITS</span>
                  </div>
                  {danger.map((p, i) => {
                    const dName = p.name.length > 22 ? p.name.slice(0, 20) + '...' : p.name
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 8px', background: i % 2 === 0 ? BG_ROW : 'transparent', borderRadius: 5 }}>
                        <span style={{ fontSize: 10, color: S300, fontFamily: FONT, whiteSpace: 'nowrap' as const, lineHeight: '18px' }}>{dName}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 8, color: S500, fontFamily: FONT, lineHeight: '14px' }}>{p.appearances} PJ</span>
                          <NumberBadge value={p.yellow_cards} color={AMBER} bgColor="#2a2006" borderColor={`${AMBER}30`} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* H2H + Recent Form side by side */}
            <div style={{ display: 'flex', gap: 8 }}>
              {h2hItems.length > 0 && (
                <div style={{ flex: 1, background: BG_CARD, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${S700}` }}>
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: WHITE }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: WHITE, letterSpacing: '0.06em', fontFamily: FONT, lineHeight: '16px' }}>ENFRONTAMENTS DIRECTES</span>
                  </div>
                  {h2hItems.map((m, i) => <MatchRow key={i} m={m} showOpp={false} />)}
                </div>
              )}
              {formItems.length > 0 && (
                <div style={{ flex: 1, background: BG_CARD, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${S700}` }}>
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: WHITE }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: WHITE, letterSpacing: '0.06em', fontFamily: FONT, lineHeight: '16px' }}>ÚLTIMS PARTITS RIVAL</span>
                  </div>
                  {formItems.map((m, i) => <MatchRow key={i} m={m} showOpp />)}
                </div>
              )}
            </div>

            {/* Full squad on page 2 if no pitch data (no page 3) */}
            {!hasPitchData && rival.mostMinutes.length > 7 && (
              <div style={{ background: BG_CARD, borderRadius: 10, padding: '12px 14px', marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${S700}` }}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: CYAN }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: CYAN, letterSpacing: '0.06em', fontFamily: FONT, lineHeight: '16px' }}>PLANTILLA ({rival.mostMinutes.length} jugadors)</span>
                </div>
                <div style={{ display: 'flex', padding: '3px 8px', fontSize: 7, color: S500, fontFamily: FONT, gap: 6, lineHeight: '14px' }}>
                  <span style={{ width: 18 }}>#</span><span style={{ flex: 1 }}>Nom</span><span style={{ width: 32, textAlign: 'center' as const }}>Gols</span><span style={{ width: 32, textAlign: 'center' as const }}>PJ</span><span style={{ width: 44, textAlign: 'right' as const }}>{hasMin ? 'Min.' : 'Tit.'}</span>
                </div>
                {rival.mostMinutes.slice(0, 18).map((p, i) => (
                  <PlayerRow
                    key={i}
                    pos={i + 1}
                    name={p.name}
                    col1={String(p.goals)}
                    col2={String(p.appearances)}
                    col3={hasMin ? `${p.minutes_played}'` : String(p.starts ?? p.appearances)}
                    highlight={p.goals > 0}
                  />
                ))}
              </div>
            )}
          </div>

          <PageFooter pageNum={2} totalPages={totalPages} teamSlug={teamSlug} />
        </div>

        {/* ═══════════ PAGE 3 (conditional — pitch data) ═══════════ */}
        {hasPitchData && (
          <div data-pdf-page style={pageStyle}>
            <div style={{ paddingTop: CONTENT_START }}>
              <PageHeader isFirst={false} date={dateStr} />
            </div>

            <div style={{ padding: `12px ${PAD}px 0` }}>
              {/* Pitch comparison */}
              <div style={{ background: BG_CARD, borderRadius: 10, padding: '16px 18px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${S700}` }}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: GREEN }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: '0.06em', fontFamily: FONT, lineHeight: '16px' }}>COMPARATIVA DE CAMPS</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {r.homePitch && (
                    <div style={{ flex: 1, background: '#0d2818', border: `1px solid ${GREEN}40`, borderRadius: 10, padding: 18, textAlign: 'center' as const }}>
                      <div style={{ fontSize: 9, color: GREEN, textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10, fontFamily: FONT }}>Camp Local</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: WHITE, fontFamily: FONT, lineHeight: 1 }}>{r.homePitch.length_m} <span style={{ fontSize: 16, color: S500 }}>x</span> {r.homePitch.width_m} <span style={{ fontSize: 14, color: S400 }}>m</span></div>
                      <div style={{ fontSize: 12, color: S400, marginTop: 6, fontFamily: FONT, fontWeight: 600 }}>{(r.homePitch.length_m * r.homePitch.width_m).toLocaleString('ca-ES')} m²</div>
                      {r.homePitch.field_name && <div style={{ fontSize: 9, color: S500, marginTop: 6, fontFamily: FONT }}>{r.homePitch.field_name}</div>}
                    </div>
                  )}
                  {r.rivalPitch && (
                    <div style={{ flex: 1, background: '#2a1a06', border: `1px solid ${AMBER}40`, borderRadius: 10, padding: 18, textAlign: 'center' as const }}>
                      <div style={{ fontSize: 9, color: AMBER, textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10, fontFamily: FONT }}>Camp Rival</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: WHITE, fontFamily: FONT, lineHeight: 1 }}>{r.rivalPitch.length_m} <span style={{ fontSize: 16, color: S500 }}>x</span> {r.rivalPitch.width_m} <span style={{ fontSize: 14, color: S400 }}>m</span></div>
                      <div style={{ fontSize: 12, color: S400, marginTop: 6, fontFamily: FONT, fontWeight: 600 }}>{(r.rivalPitch.length_m * r.rivalPitch.width_m).toLocaleString('ca-ES')} m²</div>
                      {r.rivalPitch.field_name && <div style={{ fontSize: 9, color: S500, marginTop: 6, fontFamily: FONT }}>{r.rivalPitch.field_name}</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Full squad */}
              {rival.mostMinutes.length > 7 && (
                <div style={{ background: BG_CARD, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${S700}` }}>
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: CYAN }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: CYAN, letterSpacing: '0.06em', fontFamily: FONT, lineHeight: '16px' }}>PLANTILLA COMPLETA ({rival.mostMinutes.length} jugadors)</span>
                  </div>
                  <div style={{ display: 'flex', padding: '3px 8px', fontSize: 7, color: S500, fontFamily: FONT, gap: 6, lineHeight: '14px' }}>
                    <span style={{ width: 18 }}>#</span><span style={{ flex: 1 }}>Nom</span><span style={{ width: 32, textAlign: 'center' as const }}>Gols</span><span style={{ width: 32, textAlign: 'center' as const }}>PJ</span><span style={{ width: 44, textAlign: 'right' as const }}>{hasMin ? 'Min.' : 'Tit.'}</span>
                  </div>
                  {rival.mostMinutes.slice(0, 26).map((p, i) => (
                    <PlayerRow
                      key={i}
                      pos={i + 1}
                      name={p.name}
                      col1={String(p.goals)}
                      col2={String(p.appearances)}
                      col3={hasMin ? `${p.minutes_played}'` : String(p.starts ?? p.appearances)}
                      highlight={p.goals > 0}
                    />
                  ))}
                </div>
              )}
            </div>

            <PageFooter pageNum={3} totalPages={totalPages} teamSlug={teamSlug} />
          </div>
        )}
      </div>
    )
  }
)

export default RivalReportPDF
