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
      const M = 10 // margin
      const CW = W - 2 * M

      // ─── Helpers ────────────────────────────────────────────────
      const fill = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2])
      const txt = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2])
      const rr = (x: number, y: number, w: number, h: number, rad: number, c: RGB) => { fill(c); pdf.roundedRect(x, y, w, h, rad, rad, 'F') }
      const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0

      const compBar = (x: number, y: number, w: number, h: number, leftVal: number, rightVal: number, leftColor: RGB, rightColor: RGB) => {
        const total = leftVal + rightVal
        const leftPct = total > 0 ? leftVal / total : 0.5
        rr(x, y, w, h, h / 2, C.bgBar)
        if (leftPct > 0) rr(x, y, Math.max(w * leftPct, h), h, h / 2, leftColor)
      }

      const RESULT_LABEL: Record<string, string> = { W: 'V', D: 'E', L: 'D' }

      // ═══════════════════════════════════════════════════════════════
      // FULL PAGE BACKGROUND
      // ═══════════════════════════════════════════════════════════════
      fill(C.bg); pdf.rect(0, 0, W, H, 'F')

      // ─── Top green accent line ────────────────────────────────
      fill(C.green); pdf.rect(0, 0, W, 1.2, 'F')

      // ─── Header: NeoScout branding ────────────────────────────
      pdf.setFontSize(8); txt(C.s400)
      pdf.text('NEOSCOUT', M, 7)
      pdf.setFontSize(5.5); txt(C.s600)
      pdf.text('neoscout.es', M + 22, 7)

      const today = new Date()
      const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`
      pdf.setFontSize(5.5); txt(C.s500)
      pdf.text(dateStr, W - M, 7, { align: 'right' })

      // ─── Title: "INFORME PRE-PARTIT" ──────────────────────────
      let y = 14
      pdf.setFontSize(6); txt(C.green)
      pdf.text('INFORME PRE-PARTIT', W / 2, y, { align: 'center' })
      y += 4

      // ─── Match banner: TEAM vs RIVAL ──────────────────────────
      rr(M, y, CW, 28, 3, C.bgCard)

      // Team side (left)
      const halfW = CW / 2 - 12
      pdf.setFontSize(9); txt(C.white)
      const teamDisplay = r.name.length > 24 ? r.name.slice(0, 24) + '...' : r.name
      pdf.text(teamDisplay, M + 5, y + 10)
      pdf.setFontSize(6); txt(C.s400)
      pdf.text(`#${r.position || '–'} · ${r.points} pts`, M + 5, y + 16)

      // Form dots (our team)
      const ourForm = r.form.slice(0, 5).reverse()
      ourForm.forEach((f, i) => {
        const cx = M + 5 + i * 7
        const dotColor = f.result === 'W' ? C.green : f.result === 'D' ? C.amber : f.result === 'L' ? C.red : C.s600
        rr(cx, y + 19, 5.5, 5.5, 2.75, dotColor)
        pdf.setFontSize(4.5); txt(C.white)
        pdf.text(f.result ? RESULT_LABEL[f.result] : '?', cx + 2.75, y + 23, { align: 'center' })
      })

      // VS badge (center)
      const vsX = W / 2
      rr(vsX - 6, y + 5, 12, 12, 6, C.greenDk)
      pdf.setFontSize(8); txt(C.white)
      pdf.text('VS', vsX, y + 13, { align: 'center' })

      // Jornada + date under VS
      pdf.setFontSize(5); txt(C.s400)
      pdf.text(`J${nm.jornada}`, vsX, y + 21, { align: 'center' })
      const matchDate = nm.date || ''
      const timeStr = nm.time ? ` · ${nm.time}h` : ''
      pdf.setFontSize(4.5); txt(C.s500)
      pdf.text(`${matchDate}${timeStr}`, vsX, y + 25, { align: 'center' })

      // Rival side (right)
      pdf.setFontSize(9); txt(C.white)
      const rivalDisplay = rival.name.length > 24 ? rival.name.slice(0, 24) + '...' : rival.name
      pdf.text(rivalDisplay, W - M - 5, y + 10, { align: 'right' })
      pdf.setFontSize(6); txt(C.s400)
      pdf.text(`#${rival.position || '–'} · ${rival.points} pts`, W - M - 5, y + 16, { align: 'right' })

      // Form dots (rival)
      const rivalForm = rival.form.slice(0, 5).reverse()
      rivalForm.forEach((f, i) => {
        const cx = W - M - 5 - (4 - i) * 7
        const dotColor = f.result === 'W' ? C.green : f.result === 'D' ? C.amber : f.result === 'L' ? C.red : C.s600
        rr(cx, y + 19, 5.5, 5.5, 2.75, dotColor)
        pdf.setFontSize(4.5); txt(C.white)
        pdf.text(f.result ? RESULT_LABEL[f.result] : '?', cx + 2.75, y + 23, { align: 'center' })
      })

      // Venue badge
      const venue = nm.isHome ? 'LOCAL' : 'VISITANT'
      rr(vsX - 10, y + 1, 20, 4, 1.5, nm.isHome ? [22, 80, 45] as RGB : [20, 50, 80] as RGB)
      pdf.setFontSize(4); txt(nm.isHome ? C.green : C.cyan)
      pdf.text(venue, vsX, y + 3.8, { align: 'center' })

      y += 33

      // ═══════════════════════════════════════════════════════════════
      // COMPARISON BARS (Veo-style)
      // ═══════════════════════════════════════════════════════════════
      rr(M, y, CW, 6, 0, C.bgCard)
      pdf.setFontSize(6); txt(C.green)
      pdf.text('COMPARATIVA DE TEMPORADA', M + 4, y + 4.5)
      y += 9

      const drawCompRow = (label: string, leftVal: number | string, rightVal: number | string, leftNum: number, rightNum: number, yy: number) => {
        pdf.setFontSize(5); txt(C.s400)
        pdf.text(label, W / 2, yy, { align: 'center' })

        const barW = (CW / 2) - 20
        // Left bar (our team) — right aligned
        const lbX = M + 2
        const rbX = W / 2 + 16

        // Values
        pdf.setFontSize(7); txt(C.white)
        pdf.text(String(leftVal), M + 2 + barW + 3, yy + 7, { align: 'right' })
        pdf.text(String(rightVal), rbX + barW + 3, yy + 7, { align: 'right' })

        // Bars
        const lTotal = leftNum + rightNum || 1
        compBar(lbX, yy + 3.5, barW, 3, leftNum, rightNum, C.green, C.bgBar)
        compBar(rbX, yy + 3.5, barW, 3, rightNum, leftNum, C.s400, C.bgBar)

        return yy + 12
      }

      y = drawCompRow('PARTITS JUGATS', r.played, rival.played, r.played, rival.played, y)
      y = drawCompRow('VICTÒRIES', r.wins, rival.wins, r.wins, rival.wins, y)
      y = drawCompRow('GOLS A FAVOR', r.gf, rival.gf, r.gf, rival.gf, y)
      y = drawCompRow('GOLS EN CONTRA', r.ga, rival.ga, r.ga, rival.ga, y)

      const rWinRate = pct(rival.wins, rival.played)
      const tWinRate = pct(r.wins, r.played)
      y = drawCompRow('% VICTÒRIES', `${tWinRate}%`, `${rWinRate}%`, tWinRate, rWinRate, y)

      const tAvgGF = r.played > 0 ? (r.gf / r.played).toFixed(1) : '0'
      const rAvgGF = rival.played > 0 ? (rival.gf / rival.played).toFixed(1) : '0'
      y = drawCompRow('GOLS/PARTIT', tAvgGF, rAvgGF, parseFloat(tAvgGF) * 10, parseFloat(rAvgGF) * 10, y)

      // Labels under bars
      pdf.setFontSize(4.5); txt(C.green)
      pdf.text(r.name.length > 20 ? r.name.slice(0, 20) + '…' : r.name, M + 2, y - 1)
      txt(C.s400)
      pdf.text(rival.name.length > 20 ? rival.name.slice(0, 20) + '…' : rival.name, W - M - 2, y - 1, { align: 'right' })
      y += 3

      // ═══════════════════════════════════════════════════════════════
      // RIVAL HOME/AWAY + INSIGHTS (two columns)
      // ═══════════════════════════════════════════════════════════════
      const col1X = M
      const col2X = M + CW / 2 + 2
      const colW = CW / 2 - 2

      // Left column: Rival rendiment local/visitant
      rr(col1X, y, colW, 6, 0, C.bgCard)
      pdf.setFontSize(5.5); txt(C.cyan)
      pdf.text('RIVAL COM A LOCAL', col1X + 3, y + 4.5)
      let yL = y + 9

      const rHome = rival.home
      const homeWR = pct(rHome.wins, rHome.played)
      const miniRow = (label: string, val: string, yy: number, x: number) => {
        pdf.setFontSize(5); txt(C.s400); pdf.text(label, x + 3, yy)
        pdf.setFontSize(5.5); txt(C.white); pdf.text(val, x + colW - 3, yy, { align: 'right' })
        return yy + 5
      }
      yL = miniRow('Partits', String(rHome.played), yL, col1X)
      yL = miniRow('V / E / D', `${rHome.wins} / ${rHome.draws} / ${rHome.losses}`, yL, col1X)
      yL = miniRow('Gols', `${rHome.gf} – ${rHome.ga}`, yL, col1X)
      yL = miniRow('% Victòries', `${homeWR}%`, yL, col1X)
      compBar(col1X + 3, yL, colW - 6, 2.5, homeWR, 100 - homeWR, C.green, C.bgBar)
      yL += 5

      rr(col1X, yL, colW, 6, 0, C.bgCard)
      pdf.setFontSize(5.5); txt(C.cyan)
      pdf.text('RIVAL COM A VISITANT', col1X + 3, yL + 4.5)
      yL += 9

      const rAway = rival.away
      const awayWR = pct(rAway.wins, rAway.played)
      yL = miniRow('Partits', String(rAway.played), yL, col1X)
      yL = miniRow('V / E / D', `${rAway.wins} / ${rAway.draws} / ${rAway.losses}`, yL, col1X)
      yL = miniRow('Gols', `${rAway.gf} – ${rAway.ga}`, yL, col1X)
      yL = miniRow('% Victòries', `${awayWR}%`, yL, col1X)
      compBar(col1X + 3, yL, colW - 6, 2.5, awayWR, 100 - awayWR, C.cyan, C.bgBar)

      // Right column: Insights
      rr(col2X, y, colW, 6, 0, C.bgCard)
      pdf.setFontSize(5.5); txt(C.amber)
      pdf.text('PATRONS DEL RIVAL', col2X + 3, y + 4.5)
      let yR = y + 9

      if (rival.insights) {
        const ins = rival.insights
        const insightRow = (label: string, val: string | null, yy: number) => {
          if (val === null) return yy
          pdf.setFontSize(5); txt(C.s400); pdf.text(label, col2X + 3, yy)
          pdf.setFontSize(6); txt(C.white); pdf.text(val, col2X + colW - 3, yy, { align: 'right' })
          return yy + 5.5
        }
        yR = insightRow('Porteria a zero', ins.cleanSheetRate !== null ? `${ins.cleanSheetRate}%` : null, yR)
        yR = insightRow('Marca primer i guanya', ins.scoreFirstWinRate !== null ? `${ins.scoreFirstWinRate}%` : null, yR)
        yR = insightRow('Remuntades', ins.comebackRate !== null ? `${ins.comebackRate}%` : null, yR)
        yR = insightRow('Gols tardans (75+)', ins.lateGoalRate !== null ? `${ins.lateGoalRate}%` : null, yR)
        yR = insightRow('Gols 1a part', String(ins.firstHalfGoals), yR)
        yR = insightRow('Gols 2a part', String(ins.secondHalfGoals), yR)

        // Visual: 1st half vs 2nd half bar
        if (ins.firstHalfGoals + ins.secondHalfGoals > 0) {
          yR += 1
          compBar(col2X + 3, yR, colW - 6, 2.5, ins.firstHalfGoals, ins.secondHalfGoals, C.amber, C.s600)
          yR += 4
          pdf.setFontSize(3.5); txt(C.s500)
          pdf.text('1a part', col2X + 3, yR)
          pdf.text('2a part', col2X + colW - 3, yR, { align: 'right' })
        }
      } else {
        pdf.setFontSize(5); txt(C.s600)
        pdf.text('Sense dades avançades', col2X + 3, yR)
      }

      // Goal buckets (below insights if space)
      if (rival.goalBuckets.length > 0) {
        yR += 5
        rr(col2X, yR, colW, 6, 0, C.bgCard)
        pdf.setFontSize(5.5); txt(C.green)
        pdf.text('MINUTS DE GOL', col2X + 3, yR + 4.5)
        yR += 9

        const maxBucket = Math.max(...rival.goalBuckets.map(b => Math.max(b.scored, b.conceded)), 1)
        rival.goalBuckets.forEach(b => {
          const bw = colW - 6
          const scoredW = (b.scored / maxBucket) * (bw / 2 - 2)
          const concededW = (b.conceded / maxBucket) * (bw / 2 - 2)

          pdf.setFontSize(4); txt(C.s500)
          pdf.text(b.label, col2X + 3, yR + 2.5)

          // Scored bar (green)
          if (b.scored > 0) rr(col2X + 16, yR, scoredW, 3, 1, C.green)
          // Conceded bar (red)
          if (b.conceded > 0) rr(col2X + 16 + bw / 2, yR, concededW, 3, 1, C.red)

          pdf.setFontSize(3.5); txt(C.s400)
          if (b.scored > 0) pdf.text(String(b.scored), col2X + 17 + scoredW, yR + 2.5)
          if (b.conceded > 0) pdf.text(String(b.conceded), col2X + 17 + bw / 2 + concededW, yR + 2.5)

          yR += 5
        })
        pdf.setFontSize(3.5)
        rr(col2X + 3, yR - 1.5, 3, 2, 1, C.green)
        pdf.setFontSize(3.5); txt(C.s400); pdf.text('A favor', col2X + 7.5, yR)
        rr(col2X + 20, yR - 1.5, 3, 2, 1, C.red)
        pdf.text('En contra', col2X + 24.5, yR)
      }

      y = Math.max(yL, yR) + 7

      // ═══════════════════════════════════════════════════════════════
      // RIVAL TOP SCORERS + DANGER PLAYERS (two columns)
      // ═══════════════════════════════════════════════════════════════
      const scorers = rival.topScorers.filter(p => p.goals > 0).slice(0, 6)
      const danger = rival.apercibits.slice(0, 5)

      if (scorers.length > 0) {
        rr(col1X, y, colW, 6, 0, C.bgCard)
        pdf.setFontSize(5.5); txt(C.green)
        pdf.text('GOLEJADORS RIVAL', col1X + 3, y + 4.5)
        let ys = y + 9

        scorers.forEach((p, i) => {
          if (i % 2 === 0) rr(col1X + 1, ys - 1, colW - 2, 5, 0.5, [18, 28, 48])
          pdf.setFontSize(5); txt(C.s300)
          const pName = p.name.length > 22 ? p.name.slice(0, 22) + '…' : p.name
          pdf.text(pName, col1X + 3, ys + 2)
          pdf.setFontSize(6); txt(C.green)
          pdf.text(String(p.goals), col1X + colW - 5, ys + 2, { align: 'right' })
          pdf.setFontSize(4); txt(C.s600)
          pdf.text(`${p.appearances} PJ`, col1X + colW - 12, ys + 2, { align: 'right' })
          ys += 5
        })
      }

      if (danger.length > 0) {
        rr(col2X, y, colW, 6, 0, [45, 35, 15])
        pdf.setFontSize(5.5); txt(C.amber)
        pdf.text('APERCEBITS', col2X + 3, y + 4.5)
        let yd = y + 9

        danger.forEach((p, i) => {
          if (i % 2 === 0) rr(col2X + 1, yd - 1, colW - 2, 5, 0.5, [35, 30, 18])
          pdf.setFontSize(5); txt(C.s300)
          const pName = p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name
          pdf.text(pName, col2X + 3, yd + 2)
          pdf.setFontSize(5); txt(C.amber)
          pdf.text(`${p.yellow_cards} grg.`, col2X + colW - 5, yd + 2, { align: 'right' })
          yd += 5
        })
      }

      const yScorerEnd = y + 9 + scorers.length * 5
      const yDangerEnd = y + 9 + danger.length * 5
      y = Math.max(yScorerEnd, yDangerEnd) + 4

      // ═══════════════════════════════════════════════════════════════
      // HEAD TO HEAD
      // ═══════════════════════════════════════════════════════════════
      if (r.headToHead.length > 0) {
        rr(M, y, CW, 6, 0, C.bgCard)
        pdf.setFontSize(5.5); txt(C.white)
        pdf.text('ENFRONTAMENTS DIRECTES', M + 4, y + 4.5)
        y += 9

        r.headToHead.slice(0, 5).forEach(m => {
          const dotColor = m.result === 'W' ? C.green : m.result === 'D' ? C.amber : m.result === 'L' ? C.red : C.s600
          rr(M + 2, y, 4, 4, 2, dotColor)
          pdf.setFontSize(4); txt(C.white)
          pdf.text(m.result ? RESULT_LABEL[m.result] : '?', M + 4, y + 3, { align: 'center' })

          if (m.goalsFor !== null && m.goalsAgainst !== null) {
            pdf.setFontSize(6); txt(C.white)
            pdf.text(`${m.goalsFor} – ${m.goalsAgainst}`, M + 14, y + 3, { align: 'center' })
          }

          pdf.setFontSize(4.5); txt(C.s500)
          pdf.text(m.isHome ? 'LOCAL' : 'VISITANT', M + 24, y + 3)

          pdf.setFontSize(4.5); txt(C.s600)
          pdf.text(m.date, W - M - 2, y + 3, { align: 'right' })

          y += 5.5
        })
        y += 2
      }

      // ═══════════════════════════════════════════════════════════════
      // RIVAL RECENT FORM
      // ═══════════════════════════════════════════════════════════════
      if (rival.form.length > 0) {
        rr(M, y, CW, 6, 0, C.bgCard)
        pdf.setFontSize(5.5); txt(C.white)
        pdf.text('ULTIMS PARTITS DEL RIVAL', M + 4, y + 4.5)
        y += 9

        rival.form.slice(0, 6).forEach(m => {
          const dotColor = m.result === 'W' ? C.green : m.result === 'D' ? C.amber : m.result === 'L' ? C.red : C.s600
          rr(M + 2, y, 4, 4, 2, dotColor)
          pdf.setFontSize(4); txt(C.white)
          pdf.text(m.result ? RESULT_LABEL[m.result] : '?', M + 4, y + 3, { align: 'center' })

          pdf.setFontSize(4); txt(C.s500)
          pdf.text(m.isHome ? 'LOC' : 'VIS', M + 9, y + 3)

          if (m.goalsFor !== null && m.goalsAgainst !== null) {
            pdf.setFontSize(5.5); txt(C.white)
            pdf.text(`${m.goalsFor}–${m.goalsAgainst}`, M + 19, y + 3)
          }

          pdf.setFontSize(4.5); txt(C.s300)
          const opp = m.opponent.length > 30 ? m.opponent.slice(0, 30) + '…' : m.opponent
          pdf.text(opp, M + 28, y + 3)

          pdf.setFontSize(4); txt(C.s600)
          pdf.text(m.date, W - M - 2, y + 3, { align: 'right' })

          y += 5.5
        })
      }

      // ═══════════════════════════════════════════════════════════════
      // REFEREE (if available)
      // ═══════════════════════════════════════════════════════════════
      if (nm.referee) {
        y += 3
        rr(M, y, CW, 8, 2, C.bgCard)
        pdf.setFontSize(5); txt(C.s400)
        pdf.text('ÀRBITRE DESIGNAT', M + 4, y + 5.5)
        pdf.setFontSize(6); txt(C.white)
        pdf.text(nm.referee, W - M - 4, y + 5.5, { align: 'right' })
      }

      // ═══════════════════════════════════════════════════════════════
      // WATERMARKS + CHROME
      // ═══════════════════════════════════════════════════════════════
      // Subtle corner watermark
      pdf.saveGraphicsState()
      // @ts-ignore
      pdf.setGState(new (pdf as any).GState({ opacity: 0.06 }))
      pdf.setFontSize(7); txt(C.white)
      pdf.text('neoscout.es', W - M - 1, 7, { align: 'right' })
      pdf.restoreGraphicsState()

      // Bottom footer
      fill([10, 16, 30]); pdf.rect(0, H - 8, W, 8, 'F')
      fill(C.green); pdf.rect(0, H - 8, W, 0.4, 'F')
      pdf.setFontSize(5.5); txt(C.s500)
      pdf.text('Generat amb NeoScout — neoscout.es', M, H - 3.5)
      txt(C.s600)
      pdf.text(`neoscout.es/equip/${teamSlug}`, W - M, H - 3.5, { align: 'right' })

      // Logo watermark (center, very subtle)
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
        pdf.saveGraphicsState()
        // @ts-ignore
        pdf.setGState(new (pdf as any).GState({ opacity: 0.035 }))
        const logoW = 55, logoH = (logoImg.height / logoImg.width) * logoW
        pdf.addImage(logoData, 'PNG', (W - logoW) / 2, (H - logoH) / 2 + 15, logoW, logoH)
        pdf.restoreGraphicsState()
      } catch { /* logo load failed */ }

      const filename = `NeoScout_Rival_${rival.name.replace(/[^a-zA-Z0-9àáèéíòóúïüçñ ]/gi, '').replace(/\s+/g, '_')}.pdf`
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
