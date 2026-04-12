'use client'

import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react'
import type { PDFReportData } from './TeamReportActions'
import { LOGO_BASE64 } from '@/lib/logo-base64'

// ─── Constants ────────────────────────────────────────────────────────────
const PW = 794
const PH = 1123
const RESULT_LABEL: Record<string, string> = { W: 'V', D: 'E', L: 'D' }

type SplitStats = { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number }
type MatchEntry = { date: string; jornada: number; opponent: string; isHome: boolean; goalsFor: number | null; goalsAgainst: number | null; result: 'W' | 'D' | 'L' | null; referee: string | null }
type PlayerEntry = { name: string; appearances: number; starts?: number; goals: number; yellow_cards: number; red_cards: number; minutes_played: number; risk: boolean }
type GoalBucketEntry = { label: string; scored: number; conceded: number }

const NO_MIN = new Set(['quarta-catalana', 'juvenil-primera-divisio', 'preferent-juvenils'])

// ─── V2 Color System ────────────────────────────────────────────────────
const BG = '#08090a'
const BG_DEEP = '#08090a'
const BG_CARD = '#0f1011'
const BG_CARD_ELEVATED = '#191a1b'
const BG_CARD_RECESSED = '#0f1011'
const BG_ROW = '#191a1b'
const BG_ROW_ALT = '#1e2022'

const GREEN = '#22c55e'
const GREEN_DK = '#166534'
const GREEN_20 = '#22c55e33'
const GREEN_10 = '#22c55e1a'
const CYAN = '#22c55e'
const CYAN_20 = '#22c55e33'
const AMBER = '#f59e0b'
const AMBER_20 = '#f59e0b33'
const RED = '#ef4444'
const RED_20 = '#ef444433'
const WHITE = '#f7f8f8'
const S300 = '#d0d6e0'
const S400 = '#8a8f98'
const S500 = '#62666d'
const S600 = '#62666d'
const S700 = 'rgba(255,255,255,0.06)'
const EMERALD_DK = '#166534'

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

function formatCompetition(comp: string) {
  return comp.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Page Chrome ─────────────────────────────────────────────────────────

function PageHeader({ isFirst, date, competition }: { isFirst: boolean; date: string; competition: string }) {
  return (
    <div>
      {/* Full-bleed gradient accent line */}
      <div style={{ height: 5, background: `linear-gradient(90deg, ${GREEN}, ${CYAN} 40%, ${AMBER} 75%, ${GREEN})` }} />
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', margin: '10px 28px 0', background: BG_DEEP, borderRadius: 8, border: `1px solid ${S700}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={LOGO_BASE64} alt="" style={{ width: 32, height: 32, borderRadius: 7 }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: WHITE, fontFamily: FONT, letterSpacing: '-0.03em' }}>Neo<span style={{ color: GREEN }}>Scout</span></span>
        </div>
        {isFirst && (
          <div style={{ background: `linear-gradient(135deg, ${EMERALD_DK}, #0d4a2a)`, padding: '6px 20px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: WHITE, letterSpacing: '0.1em', textTransform: 'uppercase' as const, border: `1px solid ${GREEN}30` }}>
            Informe Pre-Partit
          </div>
        )}
        <div style={{ textAlign: 'right' as const }}>
          <div style={{ fontSize: 10, color: S300, fontFamily: FONT, lineHeight: '15px', fontWeight: 600 }}>{formatCompetition(competition)}</div>
          <div style={{ fontSize: 8, color: S500, fontFamily: FONT, lineHeight: '12px', marginTop: 2 }}>{date}</div>
        </div>
      </div>
    </div>
  )
}

function PageFooter({ pageNum, totalPages, teamSlug, competition }: { pageNum: number; totalPages: number; teamSlug: string; competition: string }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      {/* Fade transition */}
      <div style={{ height: 12, background: `linear-gradient(to bottom, ${BG_DEEP}00, ${BG_DEEP})` }} />
      <div style={{ height: 1, background: `linear-gradient(90deg, ${S700}00, ${S700}, ${S700}00)`, margin: '0 28px' }} />
      <div style={{ height: 40, background: BG_DEEP, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 8, color: S500 }}>
          <img src={LOGO_BASE64} alt="" style={{ width: 12, height: 12, borderRadius: 2 }} />
          <span>Generat amb</span>
          <span style={{ color: WHITE, fontWeight: 700 }}>Neo</span>
          <span style={{ color: GREEN, fontWeight: 700 }}>Scout</span>
        </div>
        <span style={{ fontSize: 7, color: S600, letterSpacing: '0.04em' }}>{formatCompetition(competition)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 8, color: S600, fontWeight: 600 }}>Pag. {pageNum} de {totalPages}</span>
          <span style={{ fontSize: 7, color: S600 }}>neoscout.es/equip/{teamSlug}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Page Watermark ─────────────────────────────────────────────────────

function PageWatermark({ text }: { text: string }) {
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: 90, fontWeight: 900, color: '#ffffff', opacity: 0.012, fontFamily: FONT, letterSpacing: '0.1em', whiteSpace: 'nowrap' as const, pointerEvents: 'none' as const, userSelect: 'none' as const }}>
      {text}
    </div>
  )
}

// ─── Section Headers (3 tiers) ──────────────────────────────────────────

function SectionPrimary({ title, color, rightContent }: { title: string; color: string; rightContent?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '9px 16px', background: `linear-gradient(90deg, ${color}20, ${color}00)`, borderLeft: `4px solid ${color}`, borderRadius: '0 8px 8px 0' }}>
      <span style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: '0.06em', fontFamily: FONT, textTransform: 'uppercase' as const }}>{title}</span>
      {rightContent}
    </div>
  )
}

function SectionSecondary({ title, color, rightContent }: { title: string; color: string; rightContent?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${S700}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: color }} />
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.06em', fontFamily: FONT, lineHeight: '16px' }}>{title}</span>
      </div>
      {rightContent}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: `linear-gradient(90deg, ${S700}00, ${S700}, ${S700}00)`, margin: '4px 0' }} />
}

// ─── Micro components ────────────────────────────────────────────────────

function PDFFormDot({ result, size = 26 }: { result: string | null; size?: number }) {
  const bg = result === 'W' ? GREEN : result === 'D' ? AMBER : result === 'L' ? RED : S700
  const fs = size === 26 ? 12 : size >= 22 ? 10 : 8
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

// ─── Shield SVG for team crests ─────────────────────────────────────────

function ShieldCrest({ letter, color, bgColor, size = 56 }: { letter: string; color: string; bgColor: string; size?: number }) {
  const s = size
  const cx = s / 2
  // Shield path scaled to size
  const scale = s / 60
  return (
    <svg width={s} height={s} style={{ display: 'block' }}>
      <path
        d={`M${30 * scale} ${2 * scale} L${54 * scale} ${14 * scale} L${54 * scale} ${36 * scale} Q${54 * scale} ${52 * scale} ${30 * scale} ${58 * scale} Q${6 * scale} ${52 * scale} ${6 * scale} ${36 * scale} L${6 * scale} ${14 * scale} Z`}
        fill={bgColor} stroke={`${color}50`} strokeWidth={1.5}
      />
      {/* Inner glow */}
      <circle cx={cx} cy={cx * 0.92} r={s * 0.22} fill="none" stroke={`${color}15`} strokeWidth={s * 0.12} />
      <text x={cx} y={cx * 0.95} textAnchor="middle" dominantBaseline="central"
        fontSize={s * 0.38} fontWeight="900" fill={color} fontFamily={FONT}>
        {letter}
      </text>
    </svg>
  )
}

// ─── VS Diamond Badge ───────────────────────────────────────────────────

function VSDiamond() {
  return (
    <svg width={48} height={48} style={{ display: 'block' }}>
      <rect x={6} y={6} width={36} height={36} rx={8}
        fill={BG_DEEP} stroke={S700} strokeWidth={1}
        transform="rotate(45,24,24)" />
      <text x={24} y={24} textAnchor="middle" dominantBaseline="central"
        fontSize="16" fontWeight="900" fill={S500} fontFamily={FONT}>VS</text>
    </svg>
  )
}

// ─── Stat Bar Row (broadcast style) ─────────────────────────────────────

function StatBarRow({ label, val1, val2, raw1, raw2, inverse }: {
  label: string; val1: string; val2: string; raw1: number; raw2: number; inverse?: boolean
}) {
  const max = Math.max(raw1, raw2, 1)
  const w1 = isFinite(raw1 / max) ? (raw1 / max) * 100 : 0
  const w2 = isFinite(raw2 / max) ? (raw2 / max) * 100 : 0
  const better1 = inverse ? raw1 < raw2 : raw1 > raw2
  const better2 = inverse ? raw2 < raw1 : raw2 > raw1
  const tie = raw1 === raw2
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px' }}>
      <span style={{ width: 44, fontSize: 17, fontWeight: 900, color: better1 && !tie ? GREEN : S300, textAlign: 'right' as const, fontFamily: FONT, lineHeight: '20px', letterSpacing: '-0.02em' }}>{val1}</span>
      <div style={{ flex: 1, display: 'flex', gap: 3, height: 12, alignItems: 'center' }}>
        {/* Left bar — grows right-to-left */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: `${w1}%`, height: 12, background: better1 && !tie ? `linear-gradient(90deg, ${GREEN}40, ${GREEN})` : `linear-gradient(90deg, ${S600}40, ${S600})`, borderRadius: '6px 2px 2px 6px', minWidth: raw1 > 0 ? 6 : 0 }} />
        </div>
        {/* Label center */}
        <span style={{ width: 34, fontSize: 8, fontWeight: 700, color: S500, textAlign: 'center' as const, fontFamily: FONT, letterSpacing: '0.04em', flexShrink: 0, lineHeight: '12px' }}>{label}</span>
        {/* Right bar — grows left-to-right */}
        <div style={{ flex: 1 }}>
          <div style={{ width: `${w2}%`, height: 12, background: better2 && !tie ? `linear-gradient(270deg, ${CYAN}40, ${CYAN})` : `linear-gradient(270deg, ${S600}40, ${S600})`, borderRadius: '2px 6px 6px 2px', minWidth: raw2 > 0 ? 6 : 0 }} />
        </div>
      </div>
      <span style={{ width: 44, fontSize: 17, fontWeight: 900, color: better2 && !tie ? CYAN : S300, textAlign: 'left' as const, fontFamily: FONT, lineHeight: '22px', letterSpacing: '-0.02em' }}>{val2}</span>
    </div>
  )
}

// ─── Split Box (enhanced) ───────────────────────────────────────────────

function SplitBox({ label, data }: { label: string; data: SplitStats }) {
  const wr = pct(data.wins, data.played)
  const isHome = label.includes('LOCAL')
  const accentColor = isHome ? GREEN : CYAN
  return (
    <div style={{ flex: 1, background: BG_CARD, borderRadius: 8, padding: '14px 16px', boxSizing: 'border-box' as const, borderLeft: `3px solid ${accentColor}`, border: `1px solid ${accentColor}20` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, fontFamily: FONT, letterSpacing: '0.08em', lineHeight: '16px' }}>{label}</span>
        <span style={{ fontSize: 22, fontWeight: 900, color: WHITE, fontFamily: FONT, lineHeight: '26px', letterSpacing: '-0.02em' }}>{wr}<span style={{ fontSize: 12, color: S400 }}>%</span></span>
      </div>
      <div style={{ fontSize: 11, color: S300, marginBottom: 10, fontFamily: FONT, lineHeight: '16px' }}>
        {data.played} PJ · {data.wins}V {data.draws}E {data.losses}D · {data.gf}-{data.ga}
      </div>
      <div style={{ height: 8, background: '#1e2d41', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
        {data.played > 0 && (
          <>
            <div style={{ width: `${(data.wins / data.played) * 100}%`, background: GREEN, borderRadius: 4, minWidth: data.wins > 0 ? 4 : 0 }} />
            <div style={{ width: `${(data.draws / data.played) * 100}%`, background: AMBER, minWidth: data.draws > 0 ? 4 : 0 }} />
            <div style={{ width: `${(data.losses / data.played) * 100}%`, background: RED, minWidth: data.losses > 0 ? 4 : 0 }} />
          </>
        )}
      </div>
    </div>
  )
}

// ─── Key Takeaway Callout ───────────────────────────────────────────────

function KeyTakeaway({ text }: { text: string }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, #2a2006, #1a1a06)`,
      border: `1px solid ${AMBER}25`,
      borderRadius: 8,
      padding: '9px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    }}>
      <svg width={22} height={22} style={{ flexShrink: 0 }}>
        <circle cx={11} cy={11} r={10} fill={`${AMBER}20`} stroke={`${AMBER}50`} strokeWidth={1} />
        <text x={11} y={11.5} textAnchor="middle" dominantBaseline="central"
          fontSize="12" fontWeight="900" fill={AMBER} fontFamily={FONT}>!</text>
      </svg>
      <span style={{ fontSize: 10, fontWeight: 700, color: AMBER, fontFamily: FONT, lineHeight: '15px' }}>
        {text}
      </span>
    </div>
  )
}

// ─── Insight Mini Card with arc ─────────────────────────────────────────

function InsightMiniCard({ label, value, pctValue }: { label: string; value: string; pctValue: number | null }) {
  const color = pctValue !== null
    ? pctValue >= 50 ? GREEN : pctValue >= 25 ? AMBER : RED
    : WHITE
  const barW = pctValue !== null ? Math.max(pctValue, 4) : 0
  return (
    <div style={{ background: BG_CARD, borderRadius: 8, padding: '12px 8px 10px', textAlign: 'center' as const,
      border: `1px solid ${pctValue !== null ? color + '25' : S700}`, boxSizing: 'border-box' as const, flex: 1 }}>
      {/* Large value — web-style bold */}
      <div style={{ fontSize: pctValue !== null ? 24 : 28, fontWeight: 900, color, marginBottom: 4, fontFamily: FONT, lineHeight: pctValue !== null ? '28px' : '32px', letterSpacing: '-0.03em' }}>{value}</div>
      {/* Progress bar for percentages */}
      {pctValue !== null && (
        <div style={{ height: 5, background: S700, borderRadius: 3, overflow: 'hidden', margin: '0 8px 6px' }}>
          <div style={{ width: `${barW}%`, height: 5, background: color, borderRadius: 3 }} />
        </div>
      )}
      <div style={{ fontSize: 8, color: S400, fontWeight: 600, fontFamily: FONT, lineHeight: '12px' }}>{label}</div>
    </div>
  )
}

// ─── Featured Player Card ───────────────────────────────────────────────

function FeaturedPlayerCard({ rank, name, stat1Label, stat1Val, stat2Label, stat2Val, color, isTop }: {
  rank: number; name: string; stat1Label: string; stat1Val: string; stat2Label: string; stat2Val: string; color: string; isTop?: boolean
}) {
  const displayName = name.length > 18 ? name.slice(0, 16) + '...' : name
  return (
    <div style={{
      flex: 1, background: BG_ROW, borderRadius: 8, padding: '12px 8px', textAlign: 'center' as const,
      border: `1px solid ${isTop ? color + '40' : S700}`,
      borderTop: `2px solid ${color}`,
      boxSizing: 'border-box' as const,
    }}>
      <svg width={28} height={28} style={{ display: 'block', margin: '0 auto 5px' }}>
        <circle cx={14} cy={14} r={13} fill={isTop ? `${color}20` : BG_CARD}
          stroke={color} strokeWidth={1} />
        <text x={14} y={14} textAnchor="middle" dominantBaseline="central"
          fontSize="12" fontWeight="900" fill={color} fontFamily={FONT}>
          {rank}
        </text>
      </svg>
      <div style={{ fontSize: 10, fontWeight: 700, color: WHITE, fontFamily: FONT, marginBottom: 4, lineHeight: '14px' }}>
        {displayName}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, fontSize: 8, color: S400, fontFamily: FONT }}>
        <span><span style={{ color, fontWeight: 800, fontSize: 11 }}>{stat1Val}</span> {stat1Label}</span>
        <span><span style={{ fontWeight: 700, fontSize: 10 }}>{stat2Val}</span> {stat2Label}</span>
      </div>
    </div>
  )
}

// ─── Player Row (enhanced with risk indicator) ──────────────────────────

function PlayerRow({ pos, name, col1, col2, col3, highlight, risk }: { pos: number; name: string; col1: string; col2: string; col3: string; highlight?: boolean; risk?: boolean }) {
  const truncName = name.length > 36 ? name.slice(0, 34) + '...' : name
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: pos % 2 === 1 ? BG_ROW : 'transparent', borderRadius: 5, gap: 8, fontFamily: FONT, boxSizing: 'border-box' as const }}>
      <span style={{ fontSize: 9, color: S600, fontWeight: 700, width: 18, textAlign: 'center' as const, flexShrink: 0, lineHeight: '16px' }}>{pos}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
        {risk && (
          <svg width={8} height={8} style={{ flexShrink: 0 }}>
            <circle cx={4} cy={4} r={3.5} fill={RED} />
          </svg>
        )}
        <span style={{ fontSize: 10, color: highlight ? WHITE : S300, fontWeight: highlight ? 600 : 400, whiteSpace: 'nowrap' as const, lineHeight: '16px', overflow: 'hidden' }}>{truncName}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: highlight ? GREEN : WHITE, width: 34, textAlign: 'center' as const, flexShrink: 0, lineHeight: '18px' }}>{col1}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: S400, width: 34, textAlign: 'center' as const, flexShrink: 0, lineHeight: '16px' }}>{col2}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: CYAN, width: 48, textAlign: 'right' as const, flexShrink: 0, lineHeight: '16px' }}>{col3}</span>
    </div>
  )
}

// ─── Match Row ──────────────────────────────────────────────────────────

function MatchRow({ m, showOpp }: { m: MatchEntry; showOpp: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 4, fontFamily: FONT, boxSizing: 'border-box' as const }}>
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

// ─── Yellow Card Icon ───────────────────────────────────────────────────

function YellowCardIcon() {
  return (
    <svg width={10} height={14} style={{ flexShrink: 0, display: 'block' }}>
      <rect x={1} y={1} width={8} height={12} rx={1.5} fill={AMBER} />
    </svg>
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

        await document.fonts.ready
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

    // ─── Data preparation ─────────────────────────────────────────────
    const stats: [string, string, string, number, number, boolean?][] = [
      ['PJ', String(r.played), String(rival.played), r.played, rival.played],
      ['V', String(r.wins), String(rival.wins), r.wins, rival.wins],
      ['E', String(r.draws), String(rival.draws), r.draws, rival.draws],
      ['D', String(r.losses), String(rival.losses), r.losses, rival.losses, true],
      ['GF', String(r.gf), String(rival.gf), r.gf, rival.gf],
      ['GC', String(r.ga), String(rival.ga), r.ga, rival.ga, true],
      ['%V', `${pct(r.wins, r.played)}%`, `${pct(rival.wins, rival.played)}%`, pct(r.wins, r.played), pct(rival.wins, rival.played)],
      ['G/P', r.played > 0 ? (r.gf / r.played).toFixed(1) : '0', rival.played > 0 ? (rival.gf / rival.played).toFixed(1) : '0', r.played > 0 ? Math.round((r.gf / r.played) * 10) : 0, rival.played > 0 ? Math.round((rival.gf / rival.played) * 10) : 0],
    ]

    const scorers = rival.topScorers.filter(p => p.goals > 0).slice(0, 5)
    const danger = rival.apercibits.slice(0, 5)
    const starters = rival.mostMinutes.slice(0, 7)
    // Show more match data when page 2 has fewer sections (no starters = more space)
    const hasStarters = starters.length > 0
    const maxMatches = hasStarters ? 5 : 8
    const h2hItems = data.headToHead.slice(0, maxMatches)
    const formItems = rival.form.slice(0, maxMatches)
    const buckets = rival.goalBuckets
    const maxBucket = Math.max(...(buckets?.map(b => Math.max(b.scored, b.conceded)) || [1]), 1)

    // ─── Auto-generate key takeaways ──────────────────────────────────
    const takeaways: string[] = []
    const rivalHomeWR = pct(rival.home.wins, rival.home.played)
    const rivalAwayWR = pct(rival.away.wins, rival.away.played)
    if (rivalHomeWR < 30 && rival.home.played >= 3) takeaways.push(`El rival es feble a casa — ${rivalHomeWR}% victories com a local`)
    if (rivalAwayWR < 20 && rival.away.played >= 3) takeaways.push(`El rival no guanya fora — ${rivalAwayWR}% victories com a visitant`)
    if (rival.insights?.lateGoalRate !== null && (rival.insights?.lateGoalRate ?? 0) >= 40) takeaways.push(`Perill als minuts finals — ${rival.insights!.lateGoalRate}% gols tardans (75'+)`)
    if (scorers.length > 0 && scorers[0].goals >= 5) takeaways.push(`Ull amb ${scorers[0].name.split(',')[0]} — ${scorers[0].goals} gols en ${scorers[0].appearances} partits`)
    if (rival.insights?.cleanSheetRate !== null && (rival.insights?.cleanSheetRate ?? 0) >= 50) takeaways.push(`Defensa solida — porteria a 0 en el ${rival.insights!.cleanSheetRate}% dels partits`)

    // ─── Insights data ────────────────────────────────────────────────
    const insightCards: { label: string; value: string; pctValue: number | null }[] = []
    if (rival.insights) {
      if (rival.insights.cleanSheetRate !== null) insightCards.push({ label: 'Porteria a 0', value: `${rival.insights.cleanSheetRate}%`, pctValue: rival.insights.cleanSheetRate })
      if (rival.insights.scoreFirstWinRate !== null) insightCards.push({ label: 'Marca 1r i guanya', value: `${rival.insights.scoreFirstWinRate}%`, pctValue: rival.insights.scoreFirstWinRate })
      if (rival.insights.comebackRate !== null) insightCards.push({ label: 'Remuntades', value: `${rival.insights.comebackRate}%`, pctValue: rival.insights.comebackRate })
      if (rival.insights.lateGoalRate !== null) insightCards.push({ label: 'Gols tardans 75+', value: `${rival.insights.lateGoalRate}%`, pctValue: rival.insights.lateGoalRate })
      insightCards.push({ label: 'Gols 1a part', value: String(rival.insights.firstHalfGoals), pctValue: null })
      insightCards.push({ label: 'Gols 2a part', value: String(rival.insights.secondHalfGoals), pctValue: null })
    }

    const PAD = 28
    const CONTENT_START = 14

    // ─── SVG Goal Chart dimensions ────────────────────────────────────
    const chartW = PW - PAD * 2 - 28 // inner padding
    const chartH = 80
    const chartBarArea = 65

    return (
      <div
        ref={containerRef}
        style={{ position: 'fixed', left: '-9999px', top: 0, width: PW, zIndex: -1, pointerEvents: 'none' as const }}
        aria-hidden="true"
      >
        {/* ═══════════ PAGE 1 — ANALISI ═══════════ */}
        <div data-pdf-page style={pageStyle}>
          <PageWatermark text="ANALISI" />
          <div style={{ paddingTop: CONTENT_START }}>
            <PageHeader isFirst date={dateStr} competition={r.competition} />
          </div>

          <div style={{ padding: `8px ${PAD}px 0` }}>

            {/* ── Match Banner (dramatic broadcast style) ── */}
            <div style={{ background: `linear-gradient(135deg, #0d1f2d 0%, ${BG_CARD_ELEVATED} 50%, #1a1428 100%)`, borderRadius: 8, padding: '18px 24px 14px', marginBottom: 10, position: 'relative', overflow: 'hidden', border: `1px solid ${S700}` }}>
              {/* Top gradient accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${GREEN}, ${CYAN})` }} />
              {/* Subtle diagonal lines texture */}
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.02 }}>
                {Array.from({ length: 40 }, (_, i) => (
                  <line key={i} x1={i * 24} y1={0} x2={i * 24 - 120} y2={280} stroke="white" strokeWidth={0.5} />
                ))}
              </svg>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                {/* Team */}
                <div style={{ textAlign: 'center' as const, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                    <ShieldCrest letter={r.name.charAt(0)} color={GREEN} bgColor="#1e3a2a" size={64} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: WHITE, marginBottom: 4, fontFamily: FONT, lineHeight: '20px', letterSpacing: '-0.02em' }}>{r.name.length > 20 ? r.name.slice(0, 18) + '...' : r.name}</div>
                  <div style={{ fontSize: 11, color: S400, fontFamily: FONT, lineHeight: '16px', fontWeight: 500 }}>#{r.position || '-'} · {r.points} pts</div>
                  {r.formPosition && <div style={{ fontSize: 9, color: AMBER, fontWeight: 700, fontFamily: FONT, lineHeight: '14px', marginTop: 3 }}>Racha #{r.formPosition}</div>}
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 6 }}>
                    {r.form.slice(0, 5).reverse().map((f, i) => <PDFFormDot key={i} result={f.result} size={26} />)}
                  </div>
                </div>

                {/* Center — VS Diamond */}
                <div style={{ textAlign: 'center' as const, padding: '0 14px', flexShrink: 0 }}>
                  <div style={{ background: nm.isHome ? GREEN_DK : '#164e63', padding: '5px 16px', borderRadius: 8, fontSize: 9, fontWeight: 700, color: WHITE, marginBottom: 10, display: 'inline-block', fontFamily: FONT, letterSpacing: '0.08em', lineHeight: '14px' }}>
                    {nm.isHome ? 'LOCAL' : 'VISITANT'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <VSDiamond />
                  </div>
                  <div style={{ fontSize: 10, color: S500, fontFamily: FONT, lineHeight: '14px' }}>Jornada {nm.jornada}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: WHITE, marginTop: 4, fontFamily: FONT, lineHeight: '18px' }}>{nm.date}{nm.time ? ` · ${nm.time}h` : ''}</div>
                  {nm.referee && <div style={{ fontSize: 9, color: S500, marginTop: 5, fontFamily: FONT, lineHeight: '14px' }}>Arbitre: {nm.referee}</div>}
                </div>

                {/* Rival */}
                <div style={{ textAlign: 'center' as const, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                    <ShieldCrest letter={rival.name.charAt(0)} color={RED} bgColor="#2a1e1e" size={64} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: WHITE, marginBottom: 4, fontFamily: FONT, lineHeight: '20px', letterSpacing: '-0.02em' }}>{rival.name.length > 20 ? rival.name.slice(0, 18) + '...' : rival.name}</div>
                  <div style={{ fontSize: 11, color: S400, fontFamily: FONT, lineHeight: '16px', fontWeight: 500 }}>#{rival.position || '-'} · {rival.points} pts</div>
                  {r.rivalFormPosition && <div style={{ fontSize: 9, color: AMBER, fontWeight: 700, fontFamily: FONT, lineHeight: '14px', marginTop: 3 }}>Racha #{r.rivalFormPosition}</div>}
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 6 }}>
                    {rival.form.slice(0, 5).reverse().map((f, i) => <PDFFormDot key={i} result={f.result} size={26} />)}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Key Takeaways (auto-generated) ── */}
            {takeaways.length > 0 && takeaways.slice(0, 2).map((t, i) => <KeyTakeaway key={i} text={t} />)}

            {/* ── Comparative Stats (horizontal bars) ── */}
            <div style={{ marginBottom: 8 }}>
              <SectionPrimary title="Comparativa" color={GREEN} rightContent={
                <div style={{ display: 'flex', gap: 20 }}>
                  <span style={{ fontSize: 8, color: GREEN, fontWeight: 700, fontFamily: FONT }}>{r.name.length > 18 ? r.name.slice(0, 18) + '...' : r.name}</span>
                  <span style={{ fontSize: 8, color: CYAN, fontWeight: 700, fontFamily: FONT }}>{rival.name.length > 18 ? rival.name.slice(0, 18) + '...' : rival.name}</span>
                </div>
              } />
              <div style={{ background: BG_CARD, borderRadius: 8, padding: '6px 14px', border: `1px solid ${S700}` }}>
                {stats.map(s => (
                  <StatBarRow key={s[0]} label={s[0]} val1={s[1]} val2={s[2]} raw1={s[3]} raw2={s[4]} inverse={s[5] as boolean | undefined} />
                ))}
              </div>
            </div>

            {/* ── Home / Away Split ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <SplitBox label="RIVAL COM A LOCAL" data={rival.home} />
              <SplitBox label="RIVAL COM A VISITANT" data={rival.away} />
            </div>

            {/* ── Insights as mini-card grid (full width) ── */}
            {insightCards.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <SectionPrimary title="Patrons del Rival" color={AMBER} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                  {insightCards.map((ic, i) => (
                    <InsightMiniCard key={i} label={ic.label} value={ic.value} pctValue={ic.pctValue} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Goal Buckets (full-width SVG chart) ── */}
            {buckets && buckets.length > 0 && (
              <div style={{ background: BG_CARD, borderRadius: 8, padding: '10px 14px 6px', border: `1px solid ${S700}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 3, height: 14, borderRadius: 2, background: GREEN }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: '0.06em', fontFamily: FONT }}>DISTRIBUCIO DE GOLS</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: GREEN }} />
                      <span style={{ fontSize: 8, color: S400, fontFamily: FONT }}>Marcats (GF)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: RED }} />
                      <span style={{ fontSize: 8, color: S400, fontFamily: FONT }}>Encaixats (GC)</span>
                    </div>
                  </div>
                </div>
                <svg width={chartW} height={chartH + 30} style={{ display: 'block' }}>
                  {/* Grid lines */}
                  {[0.25, 0.5, 0.75, 1].map(p => (
                    <line key={p} x1={0} y1={chartBarArea - p * chartBarArea} x2={chartW} y2={chartBarArea - p * chartBarArea}
                      stroke={S700} strokeWidth={0.5} strokeDasharray="4,4" />
                  ))}
                  {/* Bars */}
                  {buckets.map((b, i) => {
                    const bw = chartW / buckets.length
                    const sH = maxBucket > 0 ? (b.scored / maxBucket) * chartBarArea : 0
                    const cH = maxBucket > 0 ? (b.conceded / maxBucket) * chartBarArea : 0
                    return (
                      <g key={i}>
                        {/* Scored bar */}
                        <rect x={i * bw + bw * 0.15} y={chartBarArea - sH} width={bw * 0.3} height={Math.max(sH, b.scored > 0 ? 4 : 0)}
                          fill={GREEN} rx={2} />
                        {/* Conceded bar */}
                        <rect x={i * bw + bw * 0.55} y={chartBarArea - cH} width={bw * 0.3} height={Math.max(cH, b.conceded > 0 ? 4 : 0)}
                          fill={RED} rx={2} />
                        {/* Value labels on top */}
                        {b.scored > 0 && (
                          <text x={i * bw + bw * 0.3} y={chartBarArea - sH - 5} textAnchor="middle"
                            fontSize="9" fontWeight="700" fill={GREEN} fontFamily={FONT}>{b.scored}</text>
                        )}
                        {b.conceded > 0 && (
                          <text x={i * bw + bw * 0.7} y={chartBarArea - cH - 5} textAnchor="middle"
                            fontSize="9" fontWeight="700" fill={RED} fontFamily={FONT}>{b.conceded}</text>
                        )}
                        {/* Bucket label */}
                        <text x={i * bw + bw / 2} y={chartBarArea + 16} textAnchor="middle"
                          fontSize="9" fontWeight="600" fill={S400} fontFamily={FONT}>{b.label}</text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            )}
          </div>

          <PageFooter pageNum={1} totalPages={totalPages} teamSlug={teamSlug} competition={r.competition} />
        </div>

        {/* ═══════════ PAGE 2 — JUGADORS ═══════════ */}
        <div data-pdf-page style={pageStyle}>
          <PageWatermark text="JUGADORS" />
          <div style={{ paddingTop: CONTENT_START }}>
            <PageHeader isFirst={false} date={dateStr} competition={r.competition} />
          </div>

          <div style={{ padding: `12px ${PAD}px 0` }}>

            {/* ── Offensive Danger Callout ── */}
            {scorers.length > 0 && (
              <div style={{ background: `linear-gradient(135deg, #1a2006, #0d1a06)`, border: `1px solid ${GREEN}25`, borderRadius: 8, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                <svg width={44} height={44} style={{ flexShrink: 0 }}>
                  <circle cx={22} cy={22} r={21} fill={GREEN_10} stroke={`${GREEN}40`} strokeWidth={1} />
                  <text x={22} y={16} textAnchor="middle" dominantBaseline="central"
                    fontSize="20" fontWeight="900" fill={GREEN} fontFamily={FONT}>{scorers[0].goals}</text>
                  <text x={22} y={33} textAnchor="middle" dominantBaseline="central"
                    fontSize="7" fontWeight="700" fill={S400} fontFamily={FONT}>GOLS</text>
                </svg>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: GREEN, fontFamily: FONT, letterSpacing: '0.04em', marginBottom: 3, lineHeight: '16px' }}>PERILL OFENSIU</div>
                  <div style={{ fontSize: 11, color: S300, fontFamily: FONT, lineHeight: '16px' }}>
                    <span style={{ fontWeight: 700, color: WHITE }}>{scorers[0].name.split(',')[0]}</span> lidera amb {scorers[0].goals} gols en {scorers[0].appearances} partits
                    {rival.played > 0 && <span> · Ratio equip: {(rival.gf / rival.played).toFixed(1)} gols/partit</span>}
                  </div>
                </div>
              </div>
            )}

            {/* ── Titulars Habituals (Featured Cards + compact rows) ── */}
            {starters.length > 0 && (
              <div style={{ background: BG_CARD, borderRadius: 8, padding: '14px 16px', marginBottom: 14, border: `1px solid ${S700}` }}>
                <SectionSecondary title="TITULARS HABITUALS" color={CYAN} rightContent={
                  <div style={{ display: 'flex', gap: 16, fontSize: 7, color: S500, fontFamily: FONT, letterSpacing: '0.04em' }}>
                    <span>gols</span><span>PJ</span><span>{hasMin ? 'min.' : 'tit.'}</span>
                  </div>
                } />
                {/* Top 3 as featured cards */}
                {starters.length >= 3 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {starters.slice(0, 3).map((p, i) => (
                      <FeaturedPlayerCard
                        key={i}
                        rank={i + 1}
                        name={p.name}
                        stat1Label="gols"
                        stat1Val={String(p.goals)}
                        stat2Label="PJ"
                        stat2Val={String(p.appearances)}
                        color={i === 0 ? CYAN : S400}
                        isTop={i === 0}
                      />
                    ))}
                  </div>
                )}
                {/* Remaining as compact rows */}
                {starters.slice(starters.length >= 3 ? 3 : 0).map((p, i) => (
                  <PlayerRow
                    key={i}
                    pos={(starters.length >= 3 ? 3 : 0) + i + 1}
                    name={p.name}
                    col1={String(p.goals)}
                    col2={String(p.appearances)}
                    col3={hasMin ? `${p.minutes_played}'` : String(p.starts ?? p.appearances)}
                    highlight={p.goals > 0}
                    risk={p.risk}
                  />
                ))}
              </div>
            )}

            {/* ── Golejadors + Apercibits — side by side if both exist, full width if only one ── */}
            {(scorers.length > 0 || danger.length > 0) && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {scorers.length > 0 && (
                  <div style={{ flex: 1, background: BG_CARD, borderRadius: 8, padding: '14px 16px', border: `1px solid ${S700}` }}>
                    <SectionSecondary title="GOLEJADORS" color={GREEN} />
                    {scorers.map((p, i) => {
                      const sName = p.name.length > (danger.length > 0 ? 22 : 36) ? p.name.slice(0, danger.length > 0 ? 20 : 34) + '...' : p.name
                      const isTop = i === 0
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 8px', background: i % 2 === 0 ? BG_ROW : 'transparent', borderRadius: 5, borderLeft: isTop ? `2px solid ${GREEN}` : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isTop && (
                              <svg width={16} height={16} style={{ flexShrink: 0 }}>
                                <circle cx={8} cy={8} r={7} fill={`${AMBER}30`} stroke={AMBER} strokeWidth={0.8} />
                                <text x={8} y={8} textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="900" fill={AMBER} fontFamily={FONT}>1</text>
                              </svg>
                            )}
                            <span style={{ fontSize: 10, color: isTop ? WHITE : S300, fontWeight: isTop ? 600 : 400, whiteSpace: 'nowrap' as const, fontFamily: FONT, lineHeight: '16px' }}>{sName}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ fontSize: 8, color: S500, fontFamily: FONT }}>{p.appearances} PJ</span>
                            {/* Goal ratio bar for full-width mode */}
                            {danger.length === 0 && p.appearances > 0 && (
                              <div style={{ width: 40, height: 5, background: S700, borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min((p.goals / p.appearances) * 100, 100)}%`, height: 5, background: GREEN, borderRadius: 3, minWidth: p.goals > 0 ? 3 : 0 }} />
                              </div>
                            )}
                            <NumberBadge value={p.goals} color={GREEN} bgColor="#0d2818" borderColor={`${GREEN}30`} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {danger.length > 0 && (
                  <div style={{ flex: 1, background: BG_CARD, borderRadius: 8, padding: '14px 16px', border: `1px solid ${S700}` }}>
                    <SectionSecondary title="APERCEBITS" color={AMBER} />
                    {danger.map((p, i) => {
                      const dName = p.name.length > (scorers.length > 0 ? 22 : 36) ? p.name.slice(0, scorers.length > 0 ? 20 : 34) + '...' : p.name
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 8px', background: i % 2 === 0 ? BG_ROW : 'transparent', borderRadius: 5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <YellowCardIcon />
                            <span style={{ fontSize: 10, color: S300, fontFamily: FONT, whiteSpace: 'nowrap' as const, lineHeight: '16px' }}>{dName}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 8, color: S500, fontFamily: FONT }}>{p.appearances} PJ</span>
                            <NumberBadge value={p.yellow_cards} color={AMBER} bgColor="#2a2006" borderColor={`${AMBER}30`} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── H2H + Recent Form side by side ── */}
            <div style={{ display: 'flex', gap: 8 }}>
              {h2hItems.length > 0 && (
                <div style={{ flex: 1, background: BG_CARD, borderRadius: 8, padding: '14px 16px', border: `1px solid ${S700}` }}>
                  <SectionSecondary title="ENFRONTAMENTS DIRECTES" color={WHITE} />
                  {h2hItems.map((m, i) => <MatchRow key={i} m={m} showOpp={false} />)}
                </div>
              )}
              {formItems.length > 0 && (
                <div style={{ flex: 1, background: BG_CARD, borderRadius: 8, padding: '14px 16px', border: `1px solid ${S700}` }}>
                  <SectionSecondary title="ULTIMS PARTITS RIVAL" color={WHITE} />
                  {formItems.map((m, i) => <MatchRow key={i} m={m} showOpp />)}
                </div>
              )}
            </div>

            {/* Full squad on page 2 if no pitch data (no page 3) — show even with few players when no starters section */}
            {!hasPitchData && (rival.mostMinutes.length > 7 || (!hasStarters && rival.mostMinutes.length > 0)) && (
              <div style={{ background: BG_CARD_RECESSED, borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                <SectionSecondary title={`PLANTILLA (${rival.mostMinutes.length} jugadors)`} color={CYAN} />
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
                    risk={p.risk}
                  />
                ))}
              </div>
            )}
          </div>

          <PageFooter pageNum={2} totalPages={totalPages} teamSlug={teamSlug} competition={r.competition} />
        </div>

        {/* ═══════════ PAGE 3 (conditional — pitch data) ═══════════ */}
        {hasPitchData && (
          <div data-pdf-page style={pageStyle}>
            <PageWatermark text="CAMP" />
            <div style={{ paddingTop: CONTENT_START }}>
              <PageHeader isFirst={false} date={dateStr} competition={r.competition} />
            </div>

            <div style={{ padding: `12px ${PAD}px 0` }}>
              {/* Pitch comparison */}
              <div style={{ background: BG_CARD, borderRadius: 8, padding: '16px 18px', marginBottom: 14 }}>
                <SectionPrimary title="Comparativa de Camps" color={GREEN} />
                <div style={{ display: 'flex', gap: 12 }}>
                  {r.homePitch && (
                    <div style={{ flex: 1, background: '#0d2818', border: `1px solid ${GREEN}40`, borderRadius: 8, padding: 18, textAlign: 'center' as const, position: 'relative' }}>
                      <div style={{ fontSize: 9, color: GREEN, textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10, fontFamily: FONT }}>Camp Local</div>
                      {/* Proportional pitch rectangle */}
                      <svg width={100} height={70} style={{ display: 'block', margin: '0 auto 10px' }}>
                        <rect x={5} y={5} width={90} height={60} rx={3} fill="none" stroke={`${GREEN}40`} strokeWidth={1} />
                        <line x1={50} y1={5} x2={50} y2={65} stroke={`${GREEN}30`} strokeWidth={0.5} />
                        <circle cx={50} cy={35} r={10} fill="none" stroke={`${GREEN}30`} strokeWidth={0.5} />
                      </svg>
                      <div style={{ fontSize: 26, fontWeight: 900, color: WHITE, fontFamily: FONT, lineHeight: 1 }}>{r.homePitch.length_m} <span style={{ fontSize: 16, color: S500 }}>x</span> {r.homePitch.width_m} <span style={{ fontSize: 14, color: S400 }}>m</span></div>
                      <div style={{ fontSize: 12, color: S400, marginTop: 6, fontFamily: FONT, fontWeight: 600 }}>{(r.homePitch.length_m * r.homePitch.width_m).toLocaleString('ca-ES')} m²</div>
                      {r.homePitch.field_name && <div style={{ fontSize: 9, color: S500, marginTop: 6, fontFamily: FONT }}>{r.homePitch.field_name}</div>}
                    </div>
                  )}
                  {r.rivalPitch && (
                    <div style={{ flex: 1, background: '#2a1a06', border: `1px solid ${AMBER}40`, borderRadius: 8, padding: 18, textAlign: 'center' as const, position: 'relative' }}>
                      <div style={{ fontSize: 9, color: AMBER, textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontWeight: 700, marginBottom: 10, fontFamily: FONT }}>Camp Rival</div>
                      {/* Proportional pitch rectangle */}
                      <svg width={100} height={70} style={{ display: 'block', margin: '0 auto 10px' }}>
                        <rect x={5} y={5} width={90} height={60} rx={3} fill="none" stroke={`${AMBER}40`} strokeWidth={1} />
                        <line x1={50} y1={5} x2={50} y2={65} stroke={`${AMBER}30`} strokeWidth={0.5} />
                        <circle cx={50} cy={35} r={10} fill="none" stroke={`${AMBER}30`} strokeWidth={0.5} />
                      </svg>
                      <div style={{ fontSize: 26, fontWeight: 900, color: WHITE, fontFamily: FONT, lineHeight: 1 }}>{r.rivalPitch.length_m} <span style={{ fontSize: 16, color: S500 }}>x</span> {r.rivalPitch.width_m} <span style={{ fontSize: 14, color: S400 }}>m</span></div>
                      <div style={{ fontSize: 12, color: S400, marginTop: 6, fontFamily: FONT, fontWeight: 600 }}>{(r.rivalPitch.length_m * r.rivalPitch.width_m).toLocaleString('ca-ES')} m²</div>
                      {r.rivalPitch.field_name && <div style={{ fontSize: 9, color: S500, marginTop: 6, fontFamily: FONT }}>{r.rivalPitch.field_name}</div>}
                    </div>
                  )}
                </div>
                {/* Delta row */}
                {r.homePitch && r.rivalPitch && (
                  <div style={{ marginTop: 10, padding: '8px 14px', background: BG_ROW, borderRadius: 8, display: 'flex', justifyContent: 'center', gap: 20, fontSize: 10, fontFamily: FONT }}>
                    <span style={{ color: S400 }}>Diferencia:</span>
                    <span style={{ color: (r.rivalPitch.length_m - r.homePitch.length_m) >= 0 ? GREEN : RED, fontWeight: 700 }}>
                      {(r.rivalPitch.length_m - r.homePitch.length_m) >= 0 ? '+' : ''}{r.rivalPitch.length_m - r.homePitch.length_m}m llarg
                    </span>
                    <span style={{ color: (r.rivalPitch.width_m - r.homePitch.width_m) >= 0 ? GREEN : RED, fontWeight: 700 }}>
                      {(r.rivalPitch.width_m - r.homePitch.width_m) >= 0 ? '+' : ''}{r.rivalPitch.width_m - r.homePitch.width_m}m ample
                    </span>
                    {(() => {
                      const area1 = r.homePitch!.length_m * r.homePitch!.width_m
                      const area2 = r.rivalPitch!.length_m * r.rivalPitch!.width_m
                      const diff = Math.abs(area2 - area1)
                      if (diff > 200) {
                        return <span style={{ background: area2 > area1 ? `${GREEN}20` : `${RED}20`, color: area2 > area1 ? GREEN : RED, padding: '1px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700 }}>
                          {area2 > area1 ? 'Camp gran' : 'Camp petit'}
                        </span>
                      }
                      return null
                    })()}
                  </div>
                )}
              </div>

              {/* Full squad */}
              {rival.mostMinutes.length > 0 && (
                <div style={{ background: BG_CARD_RECESSED, borderRadius: 8, padding: '12px 14px' }}>
                  <SectionSecondary title={`PLANTILLA COMPLETA (${rival.mostMinutes.length} jugadors)`} color={CYAN} />
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
                      risk={p.risk}
                    />
                  ))}
                </div>
              )}
            </div>

            <PageFooter pageNum={3} totalPages={totalPages} teamSlug={teamSlug} competition={r.competition} />
          </div>
        )}
      </div>
    )
  }
)

export default RivalReportPDF
