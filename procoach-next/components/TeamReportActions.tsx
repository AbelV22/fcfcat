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

// ─── Color palette (Veo-inspired dark green/slate) ──────────────────────
const C = {
  bg:       [15, 23, 42] as const,    // #0f172a  deep navy
  bgCard:   [22, 33, 52] as const,    // card surfaces
  bgBar:    [30, 45, 65] as const,    // bar backgrounds
  green:    [34, 197, 94] as const,   // #22c55e  NeoScout green
  greenDk:  [22, 101, 52] as const,   // dark green accent
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
      const M = 12 // margin
      const CW = W - 2 * M
      const HEADER_H = 10 // header zone
      const FOOTER_H = 10 // footer zone
      const CONTENT_TOP = HEADER_H + 2
      const CONTENT_BOTTOM = H - FOOTER_H - 2 // usable area bottom
      let pageNum = 1

      // ─── Helpers ────────────────────────────────────────────────
      const fill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2])
      const txt = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2])
      const rr = (x: number, y: number, w: number, h: number, rad: number, c: RGB) => { fill(c); pdf.roundedRect(x, y, w, h, rad, rad, 'F') }
      const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0

      /** Truncate text to fit within maxWidth (mm), using actual measured text width */
      const fitText = (text: string, maxWidth: number): string => {
        if (pdf.getTextWidth(text) <= maxWidth) return text
        let t = text
        while (t.length > 1 && pdf.getTextWidth(t + '…') > maxWidth) t = t.slice(0, -1)
        return t + '…'
      }

      const compBar = (x: number, yy: number, w: number, h: number, leftVal: number, rightVal: number, leftColor: RGB, _rightColor: RGB) => {
        const total = leftVal + rightVal
        const leftPct = total > 0 ? leftVal / total : 0.5
        rr(x, yy, w, h, h / 2, C.bgBar)
        if (leftPct > 0) rr(x, yy, Math.max(w * leftPct, h), h, h / 2, leftColor)
      }

      const RESULT_LABEL: Record<string, string> = { W: 'V', D: 'E', L: 'D' }

      const today = new Date()
      const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`

      // ─── Page chrome (background, header, footer) ─────────────
      const drawPageChrome = (isFirstPage: boolean) => {
        // Full page background
        fill(C.bg); pdf.rect(0, 0, W, H, 'F')

        // Top accent line
        fill(C.green); pdf.rect(0, 0, W, 1.5, 'F')

        // Header
        pdf.setFontSize(8); txt(C.s400)
        pdf.text('NEOSCOUT', M, 7)
        pdf.setFontSize(6); txt(C.s600)
        pdf.text('neoscout.es', M + 22, 7)
        pdf.setFontSize(6); txt(C.s500)
        pdf.text(dateStr, W - M, 7, { align: 'right' })

        if (isFirstPage) {
          pdf.setFontSize(6.5); txt(C.green)
          pdf.text('INFORME PRE-PARTIT', W / 2, 7, { align: 'center' })
        }

        // Footer bar
        fill([10, 16, 30]); pdf.rect(0, H - FOOTER_H, W, FOOTER_H, 'F')
        fill(C.green); pdf.rect(0, H - FOOTER_H, W, 0.4, 'F')
        pdf.setFontSize(6); txt(C.s500)
        pdf.text('Generat amb NeoScout', M, H - 4)
        txt(C.s600)
        pdf.text(`neoscout.es/equip/${teamSlug}`, W - M, H - 4, { align: 'right' })
      }

      // ─── Page break system ─────────────────────────────────────
      // Check if a block of `neededH` mm fits. If not, finalize
      // current page and start a new one.
      const ensureSpace = (neededH: number, curY: number): number => {
        if (curY + neededH <= CONTENT_BOTTOM) return curY
        // Start new page
        pageNum++
        pdf.addPage()
        drawPageChrome(false)
        return CONTENT_TOP
      }

      // ═══════════════════════════════════════════════════════════════
      // PAGE 1 — Chrome + Match Banner
      // ═══════════════════════════════════════════════════════════════
      drawPageChrome(true)

      let y = CONTENT_TOP + 2

      // ─── Match banner: TEAM vs RIVAL ──────────────────────────
      const BANNER_H = 28
      rr(M, y, CW, BANNER_H, 3, C.bgCard)
      // Subtle left/right gradient accents
      rr(M, y, 3, BANNER_H, 1.5, C.greenDk)
      rr(W - M - 3, y, 3, BANNER_H, 1.5, [30, 40, 60])

      // Team side (left)
      pdf.setFontSize(10); txt(C.white)
      const teamDisplay = fitText(r.name, CW / 2 - 30)
      pdf.text(teamDisplay, M + 8, y + 10)
      pdf.setFontSize(7); txt(C.s400)
      pdf.text(`#${r.position || '-'} | ${r.points} pts`, M + 8, y + 16)

      // Form dots (our team)
      const ourForm = r.form.slice(0, 5).reverse()
      ourForm.forEach((f, i) => {
        const cx = M + 8 + i * 7
        const dotColor = f.result === 'W' ? C.green : f.result === 'D' ? C.amber : f.result === 'L' ? C.red : C.s600
        rr(cx, y + 19, 5.5, 5.5, 2.75, dotColor)
        pdf.setFontSize(5.5); txt(C.white)
        pdf.text(f.result ? RESULT_LABEL[f.result] : '?', cx + 2.75, y + 23, { align: 'center' })
      })

      // VS badge (center)
      const vsX = W / 2
      rr(vsX - 7, y + 4, 14, 14, 7, C.greenDk)
      pdf.setFontSize(9); txt(C.white)
      pdf.text('VS', vsX, y + 13, { align: 'center' })

      // Venue badge above VS
      const venue = nm.isHome ? 'LOCAL' : 'VISITANT'
      rr(vsX - 10, y + 1, 20, 4, 1.5, nm.isHome ? [22, 80, 45] as RGB : [20, 50, 80] as RGB)
      pdf.setFontSize(5); txt(nm.isHome ? C.green : C.cyan)
      pdf.text(venue, vsX, y + 4, { align: 'center' })

      // Jornada + date under VS
      pdf.setFontSize(6); txt(C.s400)
      pdf.text(`J${nm.jornada}`, vsX, y + 21, { align: 'center' })
      const matchDate = nm.date || ''
      const timeStr = nm.time ? ` | ${nm.time}h` : ''
      pdf.setFontSize(5.5); txt(C.s500)
      pdf.text(`${matchDate}${timeStr}`, vsX, y + 25, { align: 'center' })

      // Rival side (right)
      pdf.setFontSize(10); txt(C.white)
      const rivalDisplay = fitText(rival.name, CW / 2 - 30)
      pdf.text(rivalDisplay, W - M - 8, y + 10, { align: 'right' })
      pdf.setFontSize(7); txt(C.s400)
      pdf.text(`#${rival.position || '-'} | ${rival.points} pts`, W - M - 8, y + 16, { align: 'right' })

      // Form dots (rival)
      const rivalForm = rival.form.slice(0, 5).reverse()
      rivalForm.forEach((f, i) => {
        const cx = W - M - 8 - (4 - i) * 7
        const dotColor = f.result === 'W' ? C.green : f.result === 'D' ? C.amber : f.result === 'L' ? C.red : C.s600
        rr(cx, y + 19, 5.5, 5.5, 2.75, dotColor)
        pdf.setFontSize(5.5); txt(C.white)
        pdf.text(f.result ? RESULT_LABEL[f.result] : '?', cx + 2.75, y + 23, { align: 'center' })
      })

      y += BANNER_H + 5

      // ═══════════════════════════════════════════════════════════════
      // COMPARISON BARS — atomic block (~85mm)
      // ═══════════════════════════════════════════════════════════════
      const COMP_ROWS = 6
      const COMP_BLOCK_H = 9 + COMP_ROWS * 12 + 6
      y = ensureSpace(COMP_BLOCK_H, y)

      rr(M, y, CW, 7, 2, C.bgCard)
      pdf.setFontSize(7); txt(C.green)
      pdf.text('COMPARATIVA DE TEMPORADA', M + 5, y + 5)
      // Team name labels in header
      pdf.setFontSize(5); txt(C.s400)
      pdf.text(fitText(r.name, CW * 0.22), M + CW * 0.25, y + 5, { align: 'center' })
      pdf.text(fitText(rival.name, CW * 0.22), M + CW * 0.75, y + 5, { align: 'center' })
      y += 10

      const drawCompRow = (label: string, leftVal: number | string, rightVal: number | string, leftNum: number, rightNum: number, yy: number) => {
        // Alternating row background
        pdf.setFontSize(6); txt(C.s400)
        pdf.text(label, W / 2, yy, { align: 'center' })

        const barW = (CW / 2) - 22
        const lbX = M + 4
        const rbX = W / 2 + 18

        // Values
        pdf.setFontSize(8); txt(C.white)
        pdf.text(String(leftVal), lbX + barW + 4, yy + 7, { align: 'right' })
        pdf.text(String(rightVal), rbX + barW + 4, yy + 7, { align: 'right' })

        // Bars
        compBar(lbX, yy + 3.5, barW, 3.5, leftNum, rightNum, C.green, C.bgBar)
        compBar(rbX, yy + 3.5, barW, 3.5, rightNum, leftNum, C.s400, C.bgBar)

        return yy + 12
      }

      y = drawCompRow('PARTITS JUGATS', r.played, rival.played, r.played, rival.played, y)
      y = drawCompRow('VICTORIES', r.wins, rival.wins, r.wins, rival.wins, y)
      y = drawCompRow('GOLS A FAVOR', r.gf, rival.gf, r.gf, rival.gf, y)
      y = drawCompRow('GOLS EN CONTRA', r.ga, rival.ga, r.ga, rival.ga, y)

      const rWinRate = pct(rival.wins, rival.played)
      const tWinRate = pct(r.wins, r.played)
      y = drawCompRow('% VICTORIES', `${tWinRate}%`, `${rWinRate}%`, tWinRate, rWinRate, y)

      const tAvgGF = r.played > 0 ? (r.gf / r.played).toFixed(1) : '0'
      const rAvgGF = rival.played > 0 ? (rival.gf / rival.played).toFixed(1) : '0'
      y = drawCompRow('GOLS/PARTIT', tAvgGF, rAvgGF, parseFloat(tAvgGF) * 10, parseFloat(rAvgGF) * 10, y)

      y += 4

      // ═══════════════════════════════════════════════════════════════
      // RIVAL HOME/AWAY — atomic block (~50mm)
      // ═══════════════════════════════════════════════════════════════
      const HOME_AWAY_H = 55
      y = ensureSpace(HOME_AWAY_H, y)

      const col1X = M
      const col2X = M + CW / 2 + 2
      const colW = CW / 2 - 2

      const miniRow = (label: string, val: string, yy: number, x: number) => {
        pdf.setFontSize(6); txt(C.s400); pdf.text(label, x + 4, yy)
        pdf.setFontSize(6.5); txt(C.white); pdf.text(val, x + colW - 4, yy, { align: 'right' })
        return yy + 6
      }

      // Left column: Home
      rr(col1X, y, colW, 7, 2, C.bgCard)
      pdf.setFontSize(6.5); txt(C.cyan)
      pdf.text('RIVAL COM A LOCAL', col1X + 4, y + 5)
      let yL = y + 10

      const rHome = rival.home
      const homeWR = pct(rHome.wins, rHome.played)
      yL = miniRow('Partits', String(rHome.played), yL, col1X)
      yL = miniRow('V / E / D', `${rHome.wins} / ${rHome.draws} / ${rHome.losses}`, yL, col1X)
      yL = miniRow('Gols', `${rHome.gf} - ${rHome.ga}`, yL, col1X)
      yL = miniRow('% Victories', `${homeWR}%`, yL, col1X)
      compBar(col1X + 4, yL, colW - 8, 3, homeWR, 100 - homeWR, C.green, C.bgBar)

      // Right column: Away
      rr(col2X, y, colW, 7, 2, C.bgCard)
      pdf.setFontSize(6.5); txt(C.cyan)
      pdf.text('RIVAL COM A VISITANT', col2X + 4, y + 5)
      let yR = y + 10

      const rAway = rival.away
      const awayWR = pct(rAway.wins, rAway.played)
      yR = miniRow('Partits', String(rAway.played), yR, col2X)
      yR = miniRow('V / E / D', `${rAway.wins} / ${rAway.draws} / ${rAway.losses}`, yR, col2X)
      yR = miniRow('Gols', `${rAway.gf} - ${rAway.ga}`, yR, col2X)
      yR = miniRow('% Victories', `${awayWR}%`, yR, col2X)
      compBar(col2X + 4, yR, colW - 8, 3, awayWR, 100 - awayWR, C.cyan, C.bgBar)

      y = Math.max(yL, yR) + 8

      // ═══════════════════════════════════════════════════════════════
      // INSIGHTS — atomic block
      // ═══════════════════════════════════════════════════════════════
      if (rival.insights) {
        const ins = rival.insights
        const insightLines = [
          ins.cleanSheetRate !== null ? ['Porteria a zero', `${ins.cleanSheetRate}%`] : null,
          ins.scoreFirstWinRate !== null ? ['Marca primer i guanya', `${ins.scoreFirstWinRate}%`] : null,
          ins.comebackRate !== null ? ['Remuntades', `${ins.comebackRate}%`] : null,
          ins.lateGoalRate !== null ? ['Gols tardans (75+)', `${ins.lateGoalRate}%`] : null,
          ['Gols 1a part', String(ins.firstHalfGoals)],
          ['Gols 2a part', String(ins.secondHalfGoals)],
        ].filter(Boolean) as string[][]

        const INSIGHTS_H = 10 + insightLines.length * 6 + 8
        y = ensureSpace(INSIGHTS_H, y)

        rr(M, y, CW, 7, 2, C.bgCard)
        pdf.setFontSize(7); txt(C.amber)
        pdf.text('PATRONS DEL RIVAL', M + 5, y + 5)
        y += 10

        insightLines.forEach((row, i) => {
          // Alternating subtle row bg
          if (i % 2 === 0) rr(M + 1, y - 2, CW - 2, 6, 1, [18, 28, 48])
          pdf.setFontSize(6); txt(C.s300); pdf.text(row[0], M + 5, y + 1)
          pdf.setFontSize(7); txt(C.white); pdf.text(row[1], W - M - 5, y + 1, { align: 'right' })
          y += 6.5
        })

        // 1st half vs 2nd half visual bar
        if (ins.firstHalfGoals + ins.secondHalfGoals > 0) {
          compBar(M + 5, y, CW - 10, 3.5, ins.firstHalfGoals, ins.secondHalfGoals, C.amber, C.s600)
          y += 5.5
          pdf.setFontSize(5); txt(C.s500)
          pdf.text('1a part', M + 5, y)
          pdf.text('2a part', W - M - 5, y, { align: 'right' })
        }
        y += 5
      }

      // ═══════════════════════════════════════════════════════════════
      // GOAL BUCKETS — atomic block
      // ═══════════════════════════════════════════════════════════════
      if (rival.goalBuckets.length > 0) {
        const BUCKETS_H = 10 + rival.goalBuckets.length * 5.5 + 6
        y = ensureSpace(BUCKETS_H, y)

        rr(M, y, CW, 7, 2, C.bgCard)
        pdf.setFontSize(7); txt(C.green)
        pdf.text('MINUTS DE GOL DEL RIVAL', M + 5, y + 5)
        y += 10

        const maxBucket = Math.max(...rival.goalBuckets.map(b => Math.max(b.scored, b.conceded)), 1)
        const bucketBarW = CW - 30

        rival.goalBuckets.forEach(b => {
          const scoredW = (b.scored / maxBucket) * (bucketBarW / 2 - 4)
          const concededW = (b.conceded / maxBucket) * (bucketBarW / 2 - 4)

          pdf.setFontSize(5.5); txt(C.s400)
          pdf.text(b.label, M + 5, y + 2.5)

          const barStartX = M + 22
          if (b.scored > 0) rr(barStartX, y, scoredW, 4, 1.5, C.green)
          if (b.conceded > 0) rr(barStartX + bucketBarW / 2 + 2, y, concededW, 4, 1.5, C.red)

          pdf.setFontSize(5); txt(C.s300)
          if (b.scored > 0) pdf.text(String(b.scored), barStartX + scoredW + 2, y + 2.5)
          if (b.conceded > 0) pdf.text(String(b.conceded), barStartX + bucketBarW / 2 + 2 + concededW + 2, y + 2.5)

          y += 6
        })
        // Legend
        rr(M + 5, y, 3, 3, 1, C.green)
        pdf.setFontSize(5); txt(C.s400); pdf.text('A favor', M + 10, y + 2)
        rr(M + 28, y, 3, 3, 1, C.red)
        pdf.text('En contra', M + 33, y + 2)
        y += 6
      }

      // ═══════════════════════════════════════════════════════════════
      // TOP SCORERS + APERCEBITS — atomic block
      // ═══════════════════════════════════════════════════════════════
      const scorers = rival.topScorers.filter(p => p.goals > 0).slice(0, 6)
      const danger = rival.apercibits.slice(0, 5)

      if (scorers.length > 0 || danger.length > 0) {
        const maxRows = Math.max(scorers.length, danger.length)
        const PLAYERS_H = 10 + maxRows * 5.5 + 2
        y = ensureSpace(PLAYERS_H, y)

        if (scorers.length > 0) {
          rr(col1X, y, colW, 7, 2, C.bgCard)
          pdf.setFontSize(6.5); txt(C.green)
          pdf.text('GOLEJADORS RIVAL', col1X + 4, y + 5)
          let ys = y + 10

          scorers.forEach((p, i) => {
            if (i % 2 === 0) rr(col1X + 1, ys - 2, colW - 2, 5.5, 1, [18, 28, 48])
            pdf.setFontSize(6); txt(C.s300)
            const pName = fitText(p.name, colW - 32)
            pdf.text(pName, col1X + 4, ys + 1)
            pdf.setFontSize(7); txt(C.green)
            pdf.text(String(p.goals), col1X + colW - 6, ys + 1, { align: 'right' })
            pdf.setFontSize(5); txt(C.s600)
            pdf.text(`${p.appearances} PJ`, col1X + colW - 14, ys + 1, { align: 'right' })
            ys += 6
          })
        }

        if (danger.length > 0) {
          rr(col2X, y, colW, 7, 2, [45, 35, 15])
          pdf.setFontSize(6.5); txt(C.amber)
          pdf.text('APERCEBITS', col2X + 4, y + 5)
          let yd = y + 10

          danger.forEach((p, i) => {
            if (i % 2 === 0) rr(col2X + 1, yd - 2, colW - 2, 5.5, 1, [35, 30, 18])
            pdf.setFontSize(6); txt(C.s300)
            const pName = fitText(p.name, colW - 26)
            pdf.text(pName, col2X + 4, yd + 1)
            pdf.setFontSize(6); txt(C.amber)
            pdf.text(`${p.yellow_cards} grg.`, col2X + colW - 6, yd + 1, { align: 'right' })
            yd += 6
          })
        }

        y += 10 + maxRows * 5.5 + 2
      }

      // ═══════════════════════════════════════════════════════════════
      // HEAD TO HEAD — atomic block
      // ═══════════════════════════════════════════════════════════════
      if (r.headToHead.length > 0) {
        const h2hCount = Math.min(r.headToHead.length, 5)
        const H2H_H = 10 + h2hCount * 6 + 2
        y = ensureSpace(H2H_H, y)

        rr(M, y, CW, 7, 2, C.bgCard)
        pdf.setFontSize(7); txt(C.white)
        pdf.text('ENFRONTAMENTS DIRECTES', M + 5, y + 5)
        y += 10

        r.headToHead.slice(0, 5).forEach((m, i) => {
          if (i % 2 === 0) rr(M + 1, y - 2, CW - 2, 6, 1, [18, 28, 48])

          const dotColor = m.result === 'W' ? C.green : m.result === 'D' ? C.amber : m.result === 'L' ? C.red : C.s600
          rr(M + 4, y - 0.5, 4.5, 4.5, 2.25, dotColor)
          pdf.setFontSize(5); txt(C.white)
          pdf.text(m.result ? RESULT_LABEL[m.result] : '?', M + 6.25, y + 2, { align: 'center' })

          if (m.goalsFor !== null && m.goalsAgainst !== null) {
            pdf.setFontSize(7); txt(C.white)
            pdf.text(`${m.goalsFor} - ${m.goalsAgainst}`, M + 16, y + 2, { align: 'center' })
          }

          pdf.setFontSize(5.5); txt(C.s400)
          pdf.text(m.isHome ? 'LOCAL' : 'VISITANT', M + 26, y + 2)

          pdf.setFontSize(5.5); txt(C.s600)
          pdf.text(m.date, W - M - 4, y + 2, { align: 'right' })

          y += 6.5
        })
        y += 2
      }

      // ═══════════════════════════════════════════════════════════════
      // RIVAL RECENT FORM — atomic block
      // ═══════════════════════════════════════════════════════════════
      if (rival.form.length > 0) {
        const formCount = Math.min(rival.form.length, 6)
        const FORM_H = 10 + formCount * 6 + 2
        y = ensureSpace(FORM_H, y)

        rr(M, y, CW, 7, 2, C.bgCard)
        pdf.setFontSize(7); txt(C.white)
        pdf.text('ULTIMS PARTITS DEL RIVAL', M + 5, y + 5)
        y += 10

        rival.form.slice(0, 6).forEach((m, i) => {
          if (i % 2 === 0) rr(M + 1, y - 2, CW - 2, 6, 1, [18, 28, 48])

          const dotColor = m.result === 'W' ? C.green : m.result === 'D' ? C.amber : m.result === 'L' ? C.red : C.s600
          rr(M + 4, y - 0.5, 4.5, 4.5, 2.25, dotColor)
          pdf.setFontSize(5); txt(C.white)
          pdf.text(m.result ? RESULT_LABEL[m.result] : '?', M + 6.25, y + 2, { align: 'center' })

          pdf.setFontSize(5); txt(C.s500)
          pdf.text(m.isHome ? 'LOC' : 'VIS', M + 12, y + 2)

          if (m.goalsFor !== null && m.goalsAgainst !== null) {
            pdf.setFontSize(6.5); txt(C.white)
            pdf.text(`${m.goalsFor}-${m.goalsAgainst}`, M + 22, y + 2)
          }

          pdf.setFontSize(5.5); txt(C.s300)
          const opp = fitText(m.opponent, CW - 50)
          pdf.text(opp, M + 30, y + 2)

          pdf.setFontSize(5); txt(C.s600)
          pdf.text(m.date, W - M - 4, y + 2, { align: 'right' })

          y += 6.5
        })
        y += 2
      }

      // ═══════════════════════════════════════════════════════════════
      // PITCH DIMENSIONS — atomic block (if available)
      // ═══════════════════════════════════════════════════════════════
      if (r.homePitch && r.rivalPitch) {
        const PITCH_H = 55
        y = ensureSpace(PITCH_H, y)

        rr(M, y, CW, 7, 2, C.bgCard)
        pdf.setFontSize(7); txt(C.cyan)
        pdf.text('DIMENSIONS DEL CAMP', M + 5, y + 5)
        y += 10

        const pitchAreaW = CW - 10
        const pitchAreaH = 35
        const pitchCenterX = M + 5 + pitchAreaW / 2
        const pitchCenterY = y + pitchAreaH / 2

        // Draw home pitch (larger, green outline)
        const maxLen = Math.max(r.homePitch.length_m, r.rivalPitch.length_m)
        const scaleW = pitchAreaW / maxLen
        const scaleH = pitchAreaH / maxLen

        const hpW = r.homePitch.length_m * scaleW
        const hpH = r.homePitch.width_m * scaleH
        fill(C.greenDk); pdf.setDrawColor(C.green[0], C.green[1], C.green[2]); pdf.setLineWidth(0.4)
        pdf.roundedRect(pitchCenterX - hpW / 2, pitchCenterY - hpH / 2, hpW, hpH, 1, 1, 'S')

        // Draw rival pitch (red outline, overlaid)
        const rpW = r.rivalPitch.length_m * scaleW
        const rpH = r.rivalPitch.width_m * scaleH
        pdf.setDrawColor(C.red[0], C.red[1], C.red[2]); pdf.setLineWidth(0.3)
        pdf.roundedRect(pitchCenterX - rpW / 2, pitchCenterY - rpH / 2, rpW, rpH, 1, 1, 'S')

        // Labels
        pdf.setFontSize(5); txt(C.green)
        pdf.text(`${r.homePitch.length_m}x${r.homePitch.width_m}m`, pitchCenterX - hpW / 2 + 2, pitchCenterY - hpH / 2 + 3)
        if (r.homePitch.field_name) {
          pdf.setFontSize(5); txt(C.s400)
          pdf.text(fitText(r.homePitch.field_name, hpW - 4), pitchCenterX - hpW / 2 + 2, pitchCenterY - hpH / 2 + 7)
        }

        pdf.setFontSize(5); txt(C.red)
        pdf.text(`${r.rivalPitch.length_m}x${r.rivalPitch.width_m}m`, pitchCenterX + rpW / 2 - 2, pitchCenterY + rpH / 2 - 2, { align: 'right' })
        if (r.rivalPitch.field_name) {
          pdf.setFontSize(5); txt(C.s400)
          pdf.text(fitText(r.rivalPitch.field_name, rpW - 4), pitchCenterX + rpW / 2 - 2, pitchCenterY + rpH / 2 + 2, { align: 'right' })
        }

        // Legend
        y += pitchAreaH + 3
        rr(M + 5, y, 3, 3, 1, C.green)
        pdf.setFontSize(5); txt(C.s400); pdf.text('El nostre camp', M + 10, y + 2)
        rr(M + 38, y, 3, 3, 1, C.red)
        pdf.text('Camp rival', M + 43, y + 2)
        y += 5
      }

      // ═══════════════════════════════════════════════════════════════
      // REFEREE — atomic block
      // ═══════════════════════════════════════════════════════════════
      if (nm.referee) {
        y = ensureSpace(12, y)
        rr(M, y, CW, 10, 2, C.bgCard)
        pdf.setFontSize(6); txt(C.s400)
        pdf.text('ARBITRE DESIGNAT', M + 5, y + 6.5)
        pdf.setFontSize(7); txt(C.white)
        pdf.text(nm.referee, W - M - 5, y + 6.5, { align: 'right' })
        y += 12
      }

      // ═══════════════════════════════════════════════════════════════
      // LOGO WATERMARK (on every page, very subtle)
      // ═══════════════════════════════════════════════════════════════
      try {
        const logoImg = new Image()
        logoImg.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve()
          logoImg.onerror = () => reject()
          logoImg.src = '/logo_neoscout.png'
        })
        const logoCanvas = document.createElement('canvas')
        logoCanvas.width = logoImg.width; logoCanvas.height = logoImg.height
        const lctx = logoCanvas.getContext('2d')!
        lctx.drawImage(logoImg, 0, 0)
        const logoData = logoCanvas.toDataURL('image/png')
        const logoW = 40, logoH = (logoImg.height / logoImg.width) * logoW

        // Apply watermark to all pages
        for (let p = 1; p <= pageNum; p++) {
          pdf.setPage(p)
          pdf.saveGraphicsState()
          // @ts-ignore
          pdf.setGState(new (pdf as any).GState({ opacity: 0.03 }))
          pdf.addImage(logoData, 'PNG', (W - logoW) / 2, (H - logoH) / 2, logoW, logoH)
          pdf.restoreGraphicsState()
        }
      } catch { /* logo load failed, skip */ }

      // ═══════════════════════════════════════════════════════════════
      // ADD PAGE NUMBERS to all pages
      // ═══════════════════════════════════════════════════════════════
      for (let p = 1; p <= pageNum; p++) {
        pdf.setPage(p)
        pdf.setFontSize(5); txt(C.s600)
        pdf.text(`${p}/${pageNum}`, W / 2, H - 4, { align: 'center' })
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
