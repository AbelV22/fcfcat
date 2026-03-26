'use client'

import { useState, useCallback } from 'react'
import { FileDown, Share2, Loader2 } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────
type SplitStats = { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number }
type PlayerEntry = { name: string; appearances: number; goals: number; yellow_cards: number; red_cards: number; minutes_played: number; risk: boolean }
type MatchEntry = { date: string; jornada: number; opponent: string; isHome: boolean; goalsFor: number | null; goalsAgainst: number | null; result: 'W' | 'D' | 'L' | null; referee: string | null }
type GoalBucketEntry = { label: string; scored: number; conceded: number }
type RivalInsights = {
  comebackRate: number | null
  scoreFirstWinRate: number | null
  concededFirstWinRate: number | null
  cleanSheetRate: number | null
  lateGoalRate: number | null
  firstHalfGoals: number
  secondHalfGoals: number
  matchesAnalyzed: number
}

export interface PDFReportData {
  // Our team
  name: string
  competition: string
  position: number | null
  played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number
  home: SplitStats
  away: SplitStats
  form: MatchEntry[]
  // Rival
  rival: {
    name: string
    played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number
    position: number | null
    home: SplitStats
    away: SplitStats
    form: MatchEntry[]
    topScorers: PlayerEntry[]
    apercibits: PlayerEntry[]
    goalBuckets: GoalBucketEntry[]
    insights: RivalInsights | null
  } | null
  headToHead: MatchEntry[]
  nextMatch: { opponent: string; date: string; jornada: number; isHome: boolean; time?: string; referee?: string | null } | null
  // Pitch dimensions
  homePitch: { length_m: number; width_m: number; field_name?: string } | null
  rivalPitch: { length_m: number; width_m: number; field_name?: string } | null
}

interface TeamReportActionsProps {
  teamName: string
  teamSlug: string
  competition: string
  reportData: PDFReportData
}

// ─── Color palette ──────────────────────────────────────────────────────
const C = {
  bg:       [15, 23, 42] as const,
  bgCard:   [22, 33, 52] as const,
  bgBar:    [30, 45, 65] as const,
  green:    [34, 197, 94] as const,
  greenDk:  [22, 101, 52] as const,
  cyan:     [6, 182, 212] as const,
  amber:    [245, 158, 11] as const,
  red:      [239, 68, 68] as const,
  white:    [255, 255, 255] as const,
  s100:     [241, 245, 249] as const,
  s200:     [226, 232, 240] as const,
  s300:     [203, 213, 225] as const,
  s400:     [148, 163, 184] as const,
  s500:     [100, 116, 139] as const,
  s600:     [71, 85, 105] as const,
  s700:     [51, 65, 85] as const,
}
type RGB = readonly [number, number, number]

export default function TeamReportActions({ teamName, teamSlug, competition, reportData }: TeamReportActionsProps) {
  const [exporting, setExporting] = useState(false)

  const shareUrl = `https://neoscout.es/equip/${teamSlug}`
  const shareText = `${teamName} — Informe del rival | ${competition}\n\n`

  const handleWhatsApp = useCallback(() => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + shareUrl)}`
    window.open(url, '_blank')
  }, [shareText, shareUrl])

  const handleExportPDF = useCallback(async () => {
    if (!reportData.rival || !reportData.nextMatch) {
      alert("No hi ha rival assignat per al proper partit.")
      return
    }
    setExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const r = reportData
      const rival = r.rival!
      const nm = r.nextMatch!

      const pdf = new jsPDF('p', 'mm', 'a4')
      const W = 210, H = 297
      const M = 10 // margin (tighter)
      const CW = W - 2 * M
      const HEADER_H = 9
      const FOOTER_H = 8
      const CONTENT_TOP = HEADER_H + 1
      const CONTENT_BOTTOM = H - FOOTER_H - 1
      let pageNum = 1

      // ─── Helpers ────────────────────────────────────────────────
      const fill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2])
      const txt = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2])
      const rr = (x: number, y: number, w: number, h: number, rad: number, c: RGB) => { fill(c); pdf.roundedRect(x, y, w, h, rad, rad, 'F') }
      const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0
      const fitText = (text: string, maxWidth: number): string => {
        if (pdf.getTextWidth(text) <= maxWidth) return text
        let t = text
        while (t.length > 1 && pdf.getTextWidth(t + '…') > maxWidth) t = t.slice(0, -1)
        return t + '…'
      }
      const RESULT_LABEL: Record<string, string> = { W: 'V', D: 'E', L: 'D' }

      const today = new Date()
      const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`

      // ─── Load logo once ────────────────────────────────────────
      let logoData: string | null = null
      let logoAspect = 1
      try {
        const logoImg = new Image()
        logoImg.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve()
          logoImg.onerror = () => reject()
          logoImg.src = '/logo_neoscout.png'
        })
        const c = document.createElement('canvas')
        c.width = logoImg.width; c.height = logoImg.height
        c.getContext('2d')!.drawImage(logoImg, 0, 0)
        logoData = c.toDataURL('image/png')
        logoAspect = logoImg.height / logoImg.width
      } catch { /* skip logo */ }

      // ─── Page chrome ───────────────────────────────────────────
      const drawPageChrome = (isFirstPage: boolean) => {
        fill(C.bg); pdf.rect(0, 0, W, H, 'F')
        fill(C.green); pdf.rect(0, 0, W, 1.2, 'F')

        // Header with logo
        if (logoData) {
          const lh = 5, lw = lh / logoAspect
          pdf.addImage(logoData, 'PNG', M, 2.5, lw, lh)
          pdf.setFontSize(9); txt(C.white)
          pdf.text('NeoScout', M + lw + 2, 6.5)
        } else {
          pdf.setFontSize(9); txt(C.white)
          pdf.text('NeoScout', M, 6.5)
        }

        pdf.setFontSize(5.5); txt(C.s500)
        pdf.text(dateStr, W - M, 6.5, { align: 'right' })

        if (isFirstPage) {
          pdf.setFontSize(6); txt(C.green)
          pdf.text('INFORME PRE-PARTIT', W / 2, 6.5, { align: 'center' })
        }

        // Footer
        fill([10, 16, 30]); pdf.rect(0, H - FOOTER_H, W, FOOTER_H, 'F')
        fill(C.green); pdf.rect(0, H - FOOTER_H, W, 0.3, 'F')
        pdf.setFontSize(5); txt(C.s500)
        pdf.text('Generat amb NeoScout', M, H - 3)
        txt(C.s600)
        pdf.text(`neoscout.es/equip/${teamSlug}`, W - M, H - 3, { align: 'right' })
      }

      const ensureSpace = (neededH: number, curY: number): number => {
        if (curY + neededH <= CONTENT_BOTTOM) return curY
        pageNum++; pdf.addPage(); drawPageChrome(false)
        return CONTENT_TOP
      }

      // ═══════════════════════════════════════════════════════════════
      // PAGE 1
      // ═══════════════════════════════════════════════════════════════
      drawPageChrome(true)
      let y = CONTENT_TOP + 1

      // ─── Match banner: TEAM vs RIVAL (compact) ─────────────────
      const BANNER_H = 22
      rr(M, y, CW, BANNER_H, 3, C.bgCard)
      rr(M, y, 2.5, BANNER_H, 1.2, C.greenDk)
      rr(W - M - 2.5, y, 2.5, BANNER_H, 1.2, [30, 40, 60])

      // Team (left)
      pdf.setFontSize(9); txt(C.white)
      pdf.text(fitText(r.name, CW / 2 - 24), M + 7, y + 8)
      pdf.setFontSize(6); txt(C.s400)
      pdf.text(`#${r.position || '-'}  ${r.points} pts`, M + 7, y + 13)

      // Form dots (team)
      r.form.slice(0, 5).reverse().forEach((f, i) => {
        const cx = M + 7 + i * 6.5
        const dc = f.result === 'W' ? C.green : f.result === 'D' ? C.amber : f.result === 'L' ? C.red : C.s600
        rr(cx, y + 15.5, 5, 5, 2.5, dc)
        pdf.setFontSize(5); txt(C.white)
        pdf.text(f.result ? RESULT_LABEL[f.result] : '?', cx + 2.5, y + 19, { align: 'center' })
      })

      // VS (center)
      const vsX = W / 2
      rr(vsX - 6, y + 3, 12, 12, 6, C.greenDk)
      pdf.setFontSize(8); txt(C.white)
      pdf.text('VS', vsX, y + 11, { align: 'center' })
      pdf.setFontSize(5); txt(C.s400)
      pdf.text(`J${nm.jornada}`, vsX, y + 18, { align: 'center' })
      const matchDateStr = nm.date ? `${nm.date}${nm.time ? ' ' + nm.time + 'h' : ''}` : ''
      pdf.setFontSize(4.5); txt(C.s500)
      pdf.text(matchDateStr, vsX, y + 21, { align: 'center' })

      // Venue badge
      const venue = nm.isHome ? 'LOCAL' : 'VISITANT'
      rr(vsX - 9, y + 0.5, 18, 3.5, 1.5, nm.isHome ? [22, 80, 45] as RGB : [20, 50, 80] as RGB)
      pdf.setFontSize(4.5); txt(nm.isHome ? C.green : C.cyan)
      pdf.text(venue, vsX, y + 3, { align: 'center' })

      // Rival (right)
      pdf.setFontSize(9); txt(C.white)
      pdf.text(fitText(rival.name, CW / 2 - 24), W - M - 7, y + 8, { align: 'right' })
      pdf.setFontSize(6); txt(C.s400)
      pdf.text(`#${rival.position || '-'}  ${rival.points} pts`, W - M - 7, y + 13, { align: 'right' })

      // Form dots (rival)
      rival.form.slice(0, 5).reverse().forEach((f, i) => {
        const cx = W - M - 7 - (4 - i) * 6.5
        const dc = f.result === 'W' ? C.green : f.result === 'D' ? C.amber : f.result === 'L' ? C.red : C.s600
        rr(cx, y + 15.5, 5, 5, 2.5, dc)
        pdf.setFontSize(5); txt(C.white)
        pdf.text(f.result ? RESULT_LABEL[f.result] : '?', cx + 2.5, y + 19, { align: 'center' })
      })

      y += BANNER_H + 3

      // ─── Referee (inline, if available) ────────────────────────
      if (nm.referee) {
        rr(M, y, CW, 7, 2, C.bgCard)
        pdf.setFontSize(5.5); txt(C.s400)
        pdf.text('ARBITRE:', M + 4, y + 4.5)
        pdf.setFontSize(6); txt(C.white)
        pdf.text(nm.referee, M + 20, y + 4.5)
        y += 9
      }

      // ═══════════════════════════════════════════════════════════════
      // COMPARISON TABLE — redesigned as a proper table
      // ═══════════════════════════════════════════════════════════════
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
      const TABLE_H = 24
      y = ensureSpace(TABLE_H, y)

      // Header row
      rr(M, y, CW, 7, 2, C.bgCard)
      pdf.setFontSize(6); txt(C.green)
      pdf.text('COMPARATIVA', M + 4, y + 5)
      pdf.setFontSize(5); txt(C.s400)
      pdf.text(fitText(r.name, CW * 0.3), M + CW * 0.45, y + 5, { align: 'right' })
      pdf.text(fitText(rival.name, CW * 0.3), M + CW * 0.55, y + 5)
      y += 8

      // Stat cells in a compact grid (4 columns x 2 rows)
      const cellW = CW / 4
      const cellH = 7
      stats.forEach((s, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        const cx = M + col * cellW
        const cy = y + row * (cellH + 1)

        // Cell background
        rr(cx + 0.5, cy, cellW - 1, cellH, 1.5, [18, 28, 48])

        // Label
        pdf.setFontSize(5); txt(C.s500)
        pdf.text(s[0], cx + cellW / 2, cy + 2.5, { align: 'center' })

        // Values side by side
        const leftX = cx + cellW * 0.3
        const rightX = cx + cellW * 0.7
        pdf.setFontSize(7); txt(C.green)
        pdf.text(s[1], leftX, cy + 6, { align: 'center' })
        pdf.setFontSize(7); txt(C.s300)
        pdf.text(s[2], rightX, cy + 6, { align: 'center' })

        // Separator dot
        pdf.setFontSize(5); txt(C.s600)
        pdf.text('·', cx + cellW / 2, cy + 5.5, { align: 'center' })
      })
      y += 2 * (cellH + 1) + 3

      // ═══════════════════════════════════════════════════════════════
      // HOME/AWAY SPLIT — compact side-by-side
      // ═══════════════════════════════════════════════════════════════
      const col1X = M
      const col2X = M + CW / 2 + 1.5
      const colW = CW / 2 - 1.5
      const HOME_AWAY_H = 32
      y = ensureSpace(HOME_AWAY_H, y)

      const drawSplitCol = (label: string, data: SplitStats, x: number, headerColor: RGB, barColor: RGB) => {
        rr(x, y, colW, 6, 2, C.bgCard)
        pdf.setFontSize(6); txt(headerColor)
        pdf.text(label, x + 4, y + 4.5)
        const wr = pct(data.wins, data.played)
        pdf.setFontSize(5.5); txt(C.white)
        pdf.text(`${wr}%`, x + colW - 4, y + 4.5, { align: 'right' })
        let sy = y + 8

        // Compact stat line
        pdf.setFontSize(5.5); txt(C.s300)
        pdf.text(`${data.played} PJ`, x + 4, sy)
        pdf.text(`${data.wins}V ${data.draws}E ${data.losses}D`, x + 20, sy)
        pdf.text(`${data.gf}-${data.ga}`, x + colW - 4, sy, { align: 'right' })
        sy += 5

        // Win rate bar
        const barW = colW - 8
        rr(x + 4, sy, barW, 3, 1.5, C.bgBar)
        if (data.played > 0) {
          const wPct = data.wins / data.played
          const dPct = data.draws / data.played
          if (wPct > 0) rr(x + 4, sy, Math.max(barW * wPct, 3), 3, 1.5, barColor)
          if (dPct > 0) rr(x + 4 + barW * wPct, sy, Math.max(barW * dPct, 2), 3, 1, C.amber)
        }
      }

      drawSplitCol('RIVAL LOCAL', rival.home, col1X, C.cyan, C.green)
      drawSplitCol('RIVAL VISITANT', rival.away, col2X, C.cyan, C.cyan)
      y += 19

      // ═══════════════════════════════════════════════════════════════
      // INSIGHTS + GOAL BUCKETS — side by side
      // ═══════════════════════════════════════════════════════════════
      const hasInsights = !!rival.insights
      const hasBuckets = rival.goalBuckets.length > 0

      if (hasInsights || hasBuckets) {
        const COMBO_H = 50
        y = ensureSpace(COMBO_H, y)

        // ── Left: Insights ──
        if (hasInsights) {
          const ins = rival.insights!
          const iW = hasBuckets ? colW : CW
          rr(col1X, y, iW, 6, 2, C.bgCard)
          pdf.setFontSize(6); txt(C.amber)
          pdf.text('PATRONS DEL RIVAL', col1X + 4, y + 4.5)
          let iy = y + 8

          const rows = [
            ins.cleanSheetRate !== null ? ['Porteria a 0', `${ins.cleanSheetRate}%`] : null,
            ins.scoreFirstWinRate !== null ? ['Marca 1r i guanya', `${ins.scoreFirstWinRate}%`] : null,
            ins.comebackRate !== null ? ['Remuntades', `${ins.comebackRate}%`] : null,
            ins.lateGoalRate !== null ? ['Gols tardans 75+', `${ins.lateGoalRate}%`] : null,
            ['Gols 1a part', String(ins.firstHalfGoals)],
            ['Gols 2a part', String(ins.secondHalfGoals)],
          ].filter(Boolean) as string[][]

          rows.forEach((row, i) => {
            if (i % 2 === 0) rr(col1X + 1, iy - 1.5, iW - 2, 5.5, 1, [18, 28, 48])
            pdf.setFontSize(5.5); txt(C.s300); pdf.text(row[0], col1X + 4, iy + 1)
            pdf.setFontSize(6.5); txt(C.white); pdf.text(row[1], col1X + iW - 4, iy + 1, { align: 'right' })
            iy += 5.5
          })

          // 1st/2nd half bar
          if (ins.firstHalfGoals + ins.secondHalfGoals > 0) {
            const bw = iW - 8
            rr(col1X + 4, iy, bw, 3, 1.5, C.bgBar)
            const p1 = ins.firstHalfGoals / (ins.firstHalfGoals + ins.secondHalfGoals)
            rr(col1X + 4, iy, Math.max(bw * p1, 3), 3, 1.5, C.amber)
            iy += 4
            pdf.setFontSize(4.5); txt(C.s500)
            pdf.text('1a part', col1X + 4, iy + 1)
            pdf.text('2a part', col1X + iW - 4, iy + 1, { align: 'right' })
          }
        }

        // ── Right: Goal buckets (vertical bars) ──
        if (hasBuckets) {
          const bX = hasInsights ? col2X : col1X
          const bW = hasInsights ? colW : CW
          rr(bX, y, bW, 6, 2, C.bgCard)
          pdf.setFontSize(6); txt(C.green)
          pdf.text('MINUTS DE GOL', bX + 4, y + 4.5)

          // Legend
          rr(bX + bW - 24, y + 1.5, 3, 3, 1, C.green)
          pdf.setFontSize(4); txt(C.s400); pdf.text('GF', bX + bW - 20, y + 3.5)
          rr(bX + bW - 14, y + 1.5, 3, 3, 1, C.red)
          pdf.text('GC', bX + bW - 10, y + 3.5)

          const buckets = rival.goalBuckets
          const maxB = Math.max(...buckets.map(b => Math.max(b.scored, b.conceded)), 1)
          const chartTop = y + 8
          const chartH = 30
          const barAreaW = bW - 8
          const slotW = barAreaW / buckets.length
          const barW = Math.min(slotW * 0.35, 6)

          buckets.forEach((b, i) => {
            const cx = bX + 4 + slotW * i + slotW / 2

            // Scored bar (green, left)
            const sH = maxB > 0 ? (b.scored / maxB) * chartH : 0
            if (sH > 0) rr(cx - barW - 0.5, chartTop + chartH - sH, barW, sH, 1, C.green)

            // Conceded bar (red, right)
            const cH = maxB > 0 ? (b.conceded / maxB) * chartH : 0
            if (cH > 0) rr(cx + 0.5, chartTop + chartH - cH, barW, cH, 1, C.red)

            // Label
            pdf.setFontSize(4.5); txt(C.s500)
            pdf.text(b.label, cx, chartTop + chartH + 3.5, { align: 'center' })

            // Values on top
            if (b.scored > 0) {
              pdf.setFontSize(4); txt(C.green)
              pdf.text(String(b.scored), cx - barW / 2 - 0.5, chartTop + chartH - sH - 1, { align: 'center' })
            }
            if (b.conceded > 0) {
              pdf.setFontSize(4); txt(C.red)
              pdf.text(String(b.conceded), cx + barW / 2 + 0.5, chartTop + chartH - cH - 1, { align: 'center' })
            }
          })
        }

        y += 48
      }

      // ═══════════════════════════════════════════════════════════════
      // TOP SCORERS + APERCEBITS — side by side
      // ═══════════════════════════════════════════════════════════════
      const scorers = rival.topScorers.filter(p => p.goals > 0).slice(0, 6)
      const danger = rival.apercibits.slice(0, 5)

      if (scorers.length > 0 || danger.length > 0) {
        const maxRows = Math.max(scorers.length, danger.length)
        const PLAYERS_H = 8 + maxRows * 5.5
        y = ensureSpace(PLAYERS_H, y)

        if (scorers.length > 0) {
          rr(col1X, y, colW, 6, 2, C.bgCard)
          pdf.setFontSize(6); txt(C.green)
          pdf.text('GOLEJADORS', col1X + 4, y + 4.5)
          let ys = y + 8

          scorers.forEach((p, i) => {
            if (i % 2 === 0) rr(col1X + 1, ys - 1.5, colW - 2, 5, 1, [18, 28, 48])
            pdf.setFontSize(5.5); txt(C.s300)
            pdf.text(fitText(p.name, colW - 28), col1X + 4, ys + 1)
            pdf.setFontSize(6.5); txt(C.green)
            pdf.text(String(p.goals), col1X + colW - 5, ys + 1, { align: 'right' })
            pdf.setFontSize(4.5); txt(C.s600)
            pdf.text(`${p.appearances}PJ`, col1X + colW - 13, ys + 1, { align: 'right' })
            ys += 5.5
          })
        }

        if (danger.length > 0) {
          rr(col2X, y, colW, 6, 2, [45, 35, 15])
          pdf.setFontSize(6); txt(C.amber)
          pdf.text('APERCEBITS', col2X + 4, y + 4.5)
          let yd = y + 8

          danger.forEach((p, i) => {
            if (i % 2 === 0) rr(col2X + 1, yd - 1.5, colW - 2, 5, 1, [35, 30, 18])
            pdf.setFontSize(5.5); txt(C.s300)
            pdf.text(fitText(p.name, colW - 22), col2X + 4, yd + 1)
            pdf.setFontSize(5.5); txt(C.amber)
            pdf.text(`${p.yellow_cards} grg.`, col2X + colW - 5, yd + 1, { align: 'right' })
            yd += 5.5
          })
        }
        y += 8 + maxRows * 5.5
      }

      // ═══════════════════════════════════════════════════════════════
      // H2H + RECENT FORM — side by side
      // ═══════════════════════════════════════════════════════════════
      const hasH2H = r.headToHead.length > 0
      const hasForm = rival.form.length > 0

      if (hasH2H || hasForm) {
        const h2hItems = r.headToHead.slice(0, 5)
        const formItems = rival.form.slice(0, 6)
        const maxItems = Math.max(hasH2H ? h2hItems.length : 0, hasForm ? formItems.length : 0)
        const SECTION_H = 8 + maxItems * 5.5
        y = ensureSpace(SECTION_H, y)

        const drawMatchRow = (m: MatchEntry, x: number, w: number, yy: number, showOpp: boolean) => {
          const dc = m.result === 'W' ? C.green : m.result === 'D' ? C.amber : m.result === 'L' ? C.red : C.s600
          rr(x + 2, yy - 0.5, 4, 4, 2, dc)
          pdf.setFontSize(4.5); txt(C.white)
          pdf.text(m.result ? RESULT_LABEL[m.result] : '?', x + 4, yy + 2, { align: 'center' })

          if (m.goalsFor !== null && m.goalsAgainst !== null) {
            pdf.setFontSize(6); txt(C.white)
            pdf.text(`${m.goalsFor}-${m.goalsAgainst}`, x + 12, yy + 2, { align: 'center' })
          }

          pdf.setFontSize(4.5); txt(C.s500)
          pdf.text(m.isHome ? 'L' : 'V', x + 18, yy + 2)

          if (showOpp) {
            pdf.setFontSize(5); txt(C.s300)
            pdf.text(fitText(m.opponent, w - 42), x + 23, yy + 2)
          }

          pdf.setFontSize(4.5); txt(C.s600)
          pdf.text(m.date, x + w - 3, yy + 2, { align: 'right' })
        }

        // H2H (left or full)
        if (hasH2H) {
          const hW = hasForm ? colW : CW
          const hX = col1X
          rr(hX, y, hW, 6, 2, C.bgCard)
          pdf.setFontSize(6); txt(C.white)
          pdf.text('DIRECTES', hX + 4, y + 4.5)
          let hy = y + 8
          h2hItems.forEach((m, i) => {
            if (i % 2 === 0) rr(hX + 1, hy - 1.5, hW - 2, 5, 1, [18, 28, 48])
            drawMatchRow(m, hX, hW, hy, false)
            hy += 5.5
          })
        }

        // Recent form (right or full)
        if (hasForm) {
          const fW = hasH2H ? colW : CW
          const fX = hasH2H ? col2X : col1X
          rr(fX, y, fW, 6, 2, C.bgCard)
          pdf.setFontSize(6); txt(C.white)
          pdf.text('ULTIMS PARTITS RIVAL', fX + 4, y + 4.5)
          let fy = y + 8
          formItems.forEach((m, i) => {
            if (i % 2 === 0) rr(fX + 1, fy - 1.5, fW - 2, 5, 1, [18, 28, 48])
            drawMatchRow(m, fX, fW, fy, true)
            fy += 5.5
          })
        }

        y += 8 + maxItems * 5.5
      }

      // ═══════════════════════════════════════════════════════════════
      // WATERMARK + PAGE NUMBERS
      // ═══════════════════════════════════════════════════════════════
      if (logoData) {
        for (let p = 1; p <= pageNum; p++) {
          pdf.setPage(p)
          pdf.saveGraphicsState()
          // @ts-ignore
          pdf.setGState(new (pdf as any).GState({ opacity: 0.03 }))
          const ww = 45, hh = ww * logoAspect
          pdf.addImage(logoData, 'PNG', (W - ww) / 2, (H - hh) / 2, ww, hh)
          pdf.restoreGraphicsState()
        }
      }

      for (let p = 1; p <= pageNum; p++) {
        pdf.setPage(p)
        pdf.setFontSize(5); txt(C.s600)
        pdf.text(`${p}/${pageNum}`, W / 2, H - 3, { align: 'center' })
      }

      const filename = `NeoScout_Rival_${rival.name.replace(/[^a-zA-Z0-9 ]/gi, '').replace(/\s+/g, '_')}.pdf`
      pdf.save(filename)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert("Error al generar el PDF. Torna-ho a intentar.")
    } finally {
      setExporting(false)
    }
  }, [teamName, teamSlug, competition, reportData])

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportPDF}
        disabled={exporting || !reportData.rival}
        title={!reportData.rival ? 'Cal tenir un rival assignat per generar el PDF' : undefined}
        className="group inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600/90 to-cyan-600/90 hover:from-green-500 hover:to-cyan-500 disabled:from-slate-700 disabled:to-slate-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/30 disabled:shadow-none disabled:cursor-not-allowed"
      >
        {exporting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Generant PDF...</span>
          </>
        ) : (
          <>
            <FileDown size={16} className="group-hover:scale-110 transition-transform" />
            <span>Informe Rival PDF</span>
          </>
        )}
      </button>
      <button
        onClick={handleWhatsApp}
        className="group inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366]/90 hover:bg-[#25D366] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#25D366]/20 hover:shadow-[#25D366]/30"
      >
        <Share2 size={16} className="group-hover:scale-110 transition-transform" />
        <span className="hidden sm:inline">WhatsApp</span>
      </button>
    </div>
  )
}
