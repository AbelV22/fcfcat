'use client'

import { useState, useCallback } from 'react'
import { FileDown, Share2, Loader2 } from 'lucide-react'

// ─── Types matching FullTeamReportDB (serializable subset) ──────────────
type SplitStats = { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number }
type PlayerEntry = { name: string; appearances: number; goals: number; yellow_cards: number; red_cards: number; minutes_played: number; risk: boolean }
type MatchEntry = { date: string; jornada: number; opponent: string; isHome: boolean; goalsFor: number | null; goalsAgainst: number | null; result: 'W' | 'D' | 'L' | null; referee: string | null }
type StandingEntry = { position: number; name: string; slug: string; played: number; points: number }

export interface PDFReportData {
  name: string
  competition: string
  position: number | null
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  points: number
  home: SplitStats
  away: SplitStats
  players: PlayerEntry[]
  form: MatchEntry[]
  standings: StandingEntry[]
  nextMatch: { opponent: string; date: string; jornada: number; isHome: boolean; time?: string; referee?: string | null } | null
}

interface TeamReportActionsProps {
  teamName: string
  teamSlug: string
  competition: string
  reportData: PDFReportData
}

// ─── Colors ─────────────────────────────────────────────────────────────
const C = {
  bg: [15, 23, 42] as [number, number, number],           // #0f172a
  bgLight: [30, 41, 59] as [number, number, number],      // #1e293b
  bgCard: [25, 35, 55] as [number, number, number],       // card bg
  green: [34, 197, 94] as [number, number, number],       // #22c55e
  cyan: [6, 182, 212] as [number, number, number],        // #06b6d4
  amber: [245, 158, 11] as [number, number, number],      // #f59e0b
  red: [239, 68, 68] as [number, number, number],         // #ef4444
  white: [255, 255, 255] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],  // #e2e8f0
  slate300: [203, 213, 225] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate600: [71, 85, 105] as [number, number, number],
}

const RESULT_LABEL: Record<string, string> = { W: 'V', D: 'E', L: 'D' }

function formatDateCat(d: string) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) {
    const months = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
    return `${parts[0]} ${months[parseInt(parts[1], 10) - 1] || parts[1]}`
  }
  return d
}

export default function TeamReportActions({ teamName, teamSlug, competition, reportData }: TeamReportActionsProps) {
  const [exporting, setExporting] = useState(false)

  const shareUrl = `https://neoscout.es/equip/${teamSlug}`
  const shareText = `${teamName} — Informe d'equip | ${competition}\n\n`

  const handleWhatsApp = useCallback(() => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + shareUrl)}`
    window.open(url, '_blank')
  }, [shareText, shareUrl])

  const handleExportPDF = useCallback(async () => {
    setExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const r = reportData

      const pdf = new jsPDF('p', 'mm', 'a4')
      const W = 210, H = 297
      const M = 12 // margin
      const CW = W - 2 * M // content width

      // ─── Helper functions ───────────────────────────────────────
      const setColor = (c: [number, number, number]) => pdf.setTextColor(c[0], c[1], c[2])
      const setFill = (c: [number, number, number]) => pdf.setFillColor(c[0], c[1], c[2])

      const roundRect = (x: number, y: number, w: number, h: number, radius: number, color: [number, number, number]) => {
        setFill(color)
        pdf.roundedRect(x, y, w, h, radius, radius, 'F')
      }

      const drawBar = (x: number, y: number, w: number, h: number, pct: number, color: [number, number, number], bgColor: [number, number, number] = C.bgLight) => {
        roundRect(x, y, w, h, h / 2, bgColor)
        if (pct > 0) {
          roundRect(x, y, Math.max(w * (pct / 100), h), h, h / 2, color)
        }
      }

      let page = 1
      const totalPages = { value: 1 }

      const addWatermarkAndChrome = (pageNum: number) => {
        // Diagonal watermarks
        pdf.saveGraphicsState()
        // @ts-ignore
        pdf.setGState(new (pdf as any).GState({ opacity: 0.03 }))
        pdf.setFontSize(60)
        setColor(C.white)
        for (let y = 30; y < H + 40; y += 70) {
          for (let x = -40; x < W + 40; x += 120) {
            pdf.text('NEOSCOUT', x, y, { angle: 30 })
          }
        }
        pdf.restoreGraphicsState()

        // Top accent line
        setFill(C.green)
        pdf.rect(0, 0, W, 1.5, 'F')

        // Bottom footer
        setFill([10, 18, 34])
        pdf.rect(0, H - 9, W, 9, 'F')
        setFill(C.green)
        pdf.rect(0, H - 9, W, 0.4, 'F')
        pdf.setFontSize(6)
        setColor(C.slate500)
        pdf.text('neoscout.es — Informe generat automàticament', M, H - 4)
        setColor(C.slate600)
        pdf.text(`Pàg. ${pageNum}`, W - M, H - 4, { align: 'right' })
      }

      const checkNewPage = (y: number, needed: number): number => {
        if (y + needed > H - 14) {
          addWatermarkAndChrome(page)
          pdf.addPage()
          page++
          totalPages.value = page
          // BG
          setFill(C.bg)
          pdf.rect(0, 0, W, H, 'F')
          return 8
        }
        return y
      }

      // ═══════════════════════════════════════════════════════════════
      // PAGE 1 — Background
      // ═══════════════════════════════════════════════════════════════
      setFill(C.bg)
      pdf.rect(0, 0, W, H, 'F')

      let y = 0

      // ─── Header band ──────────────────────────────────────────
      // Dark gradient header
      setFill([8, 15, 30])
      pdf.rect(0, 0, W, 52, 'F')

      // Green accent top
      setFill(C.green)
      pdf.rect(0, 0, W, 1.5, 'F')

      // NeoScout brand
      pdf.setFontSize(9)
      setColor(C.slate400)
      pdf.text('NEOSCOUT', M, 10)
      pdf.setFontSize(6)
      setColor(C.slate600)
      pdf.text('neoscout.es', M + 25, 10)

      // Date
      const today = new Date()
      const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`
      pdf.setFontSize(7)
      setColor(C.slate500)
      pdf.text(dateStr, W - M, 10, { align: 'right' })

      // Team initial badge
      const badgeX = M, badgeY = 18, badgeS = 18
      roundRect(badgeX, badgeY, badgeS, badgeS, 3, [20, 60, 40])
      // Green border effect
      pdf.setDrawColor(C.green[0], C.green[1], C.green[2])
      pdf.setLineWidth(0.6)
      pdf.roundedRect(badgeX, badgeY, badgeS, badgeS, 3, 3, 'S')

      pdf.setFontSize(16)
      setColor(C.green)
      pdf.text(r.name.charAt(0), badgeX + badgeS / 2, badgeY + badgeS / 2 + 2.5, { align: 'center' })

      // Team name
      pdf.setFontSize(18)
      setColor(C.white)
      const nameX = badgeX + badgeS + 5
      // Truncate if too long
      const displayName = r.name.length > 35 ? r.name.slice(0, 35) + '...' : r.name
      pdf.text(displayName, nameX, 27)

      // Competition + position
      pdf.setFontSize(9)
      setColor(C.green)
      pdf.text(competition, nameX, 34)

      if (r.position) {
        const compTextW = pdf.getTextWidth(competition)
        roundRect(nameX + compTextW + 3, 30, 18, 6, 2, [60, 50, 10])
        pdf.setFontSize(7)
        setColor(C.amber)
        pdf.text(`#${r.position} class.`, nameX + compTextW + 12, 34.5, { align: 'center' })
      }

      // URL
      pdf.setFontSize(6.5)
      setColor(C.slate500)
      pdf.text(`neoscout.es/equip/${teamSlug}`, nameX, 40)

      // Form dots
      if (r.form.length > 0) {
        const formX = nameX
        const dots = r.form.slice(0, 5).reverse()
        dots.forEach((f, i) => {
          const cx = formX + i * 9
          const cy = 44
          const color = f.result === 'W' ? C.green : f.result === 'D' ? C.amber : f.result === 'L' ? C.red : C.slate600
          roundRect(cx, cy, 7, 7, 3.5, color)
          pdf.setFontSize(6)
          setColor(C.white)
          pdf.text(f.result ? RESULT_LABEL[f.result] ?? f.result : '?', cx + 3.5, cy + 5, { align: 'center' })
        })
      }

      y = 58

      // ─── Stats Row ─────────────────────────────────────────────
      const stats = [
        { v: String(r.played), l: 'PJ', c: C.white },
        { v: String(r.wins), l: 'V', c: C.green },
        { v: String(r.draws), l: 'E', c: C.amber },
        { v: String(r.losses), l: 'D', c: C.red },
        { v: `${r.gf}–${r.ga}`, l: 'GOLS', c: C.cyan },
        { v: String(r.points), l: 'PTS', c: C.white },
      ]
      const statW = (CW - 5 * 2) / 6
      stats.forEach((s, i) => {
        const sx = M + i * (statW + 2)
        roundRect(sx, y, statW, 16, 2, C.bgCard)
        pdf.setFontSize(13)
        setColor(s.c)
        pdf.text(s.v, sx + statW / 2, y + 8.5, { align: 'center' })
        pdf.setFontSize(5.5)
        setColor(C.slate500)
        pdf.text(s.l, sx + statW / 2, y + 13.5, { align: 'center' })
      })

      y += 22

      // ─── Home / Away split ─────────────────────────────────────
      const halfW = (CW - 4) / 2

      const drawSplitCard = (x: number, yy: number, label: string, emoji: string, split: SplitStats, color: [number, number, number]) => {
        roundRect(x, yy, halfW, 30, 2.5, C.bgCard)
        pdf.setFontSize(7)
        setColor(color)
        pdf.text(`${emoji} ${label}`, x + 4, yy + 6)

        const winRate = split.played > 0 ? Math.round((split.wins / split.played) * 100) : 0

        // Stats row
        const miniStats = [
          { v: split.played, l: 'PJ', c: C.white },
          { v: split.wins, l: 'V', c: C.green },
          { v: split.draws, l: 'E', c: C.amber },
          { v: split.losses, l: 'D', c: C.red },
        ]
        const mw = (halfW - 8) / 4
        miniStats.forEach((ms, j) => {
          const mx = x + 4 + j * mw
          pdf.setFontSize(11)
          setColor(ms.c)
          pdf.text(String(ms.v), mx + mw / 2, yy + 15, { align: 'center' })
          pdf.setFontSize(5)
          setColor(C.slate500)
          pdf.text(ms.l, mx + mw / 2, yy + 19, { align: 'center' })
        })

        // Win rate bar
        drawBar(x + 4, yy + 23, halfW - 8, 2.5, winRate, C.green)
        pdf.setFontSize(5)
        setColor(C.slate400)
        pdf.text(`${split.gf}–${split.ga} gols · ${winRate}% victòries`, x + 4, yy + 28.5)
      }

      drawSplitCard(M, y, 'COM A LOCAL', '🏠', r.home, C.green)
      drawSplitCard(M + halfW + 4, y, 'COM A VISITANT', '✈️', r.away, C.cyan)

      y += 36

      // ─── Next match ────────────────────────────────────────────
      if (r.nextMatch) {
        y = checkNewPage(y, 28)
        const nm = r.nextMatch
        // Card with cyan accent
        roundRect(M, y, CW, 24, 2.5, [13, 42, 74])
        // Left accent
        setFill(C.cyan)
        pdf.rect(M, y, 1.5, 24, 'F')

        pdf.setFontSize(7)
        setColor(C.cyan)
        pdf.text(`⚽ PROPER RIVAL — J${nm.jornada}`, M + 6, y + 6)

        const venue = nm.isHome ? '🏠 Local' : '✈️ Visitant'
        roundRect(M + CW - 22, y + 2, 18, 5, 2, nm.isHome ? [20, 60, 30] : [20, 40, 70])
        pdf.setFontSize(5.5)
        setColor(nm.isHome ? C.green : C.cyan)
        pdf.text(venue, M + CW - 13, y + 5.5, { align: 'center' })

        pdf.setFontSize(12)
        setColor(C.white)
        pdf.text(nm.opponent, M + 6, y + 14)

        pdf.setFontSize(7)
        setColor(C.slate400)
        const matchInfo = [formatDateCat(nm.date), nm.time ? `${nm.time}h` : ''].filter(Boolean).join(' · ')
        pdf.text(matchInfo, M + 6, y + 20)

        if (nm.referee) {
          setColor(C.slate500)
          pdf.text(`Àrbitre: ${nm.referee}`, M + CW - 4, y + 20, { align: 'right' })
        }
        y += 30
      }

      // ─── Classification ────────────────────────────────────────
      if (r.standings.length > 0) {
        y = checkNewPage(y, 40)
        roundRect(M, y, CW, 6, 0, C.bgCard)
        pdf.setFontSize(7)
        setColor(C.amber)
        pdf.text('🏆 CLASSIFICACIÓ', M + 4, y + 4.5)
        y += 8

        // Table header
        pdf.setFontSize(5.5)
        setColor(C.slate500)
        pdf.text('#', M + 3, y + 3)
        pdf.text('EQUIP', M + 10, y + 3)
        pdf.text('PJ', M + CW - 22, y + 3, { align: 'center' })
        pdf.text('PTS', M + CW - 8, y + 3, { align: 'center' })
        y += 5

        // Highlight rows
        const myIdx = r.standings.findIndex(s => s.slug === teamSlug)
        const startIdx = Math.max(0, Math.min(myIdx - 3, r.standings.length - 7))
        const rows = r.standings.slice(startIdx, startIdx + 7)

        rows.forEach((s) => {
          const isMe = s.slug === teamSlug
          if (isMe) {
            roundRect(M + 1, y - 0.5, CW - 2, 5.5, 1.5, [20, 60, 40])
            pdf.setDrawColor(C.green[0], C.green[1], C.green[2])
            pdf.setLineWidth(0.3)
            pdf.roundedRect(M + 1, y - 0.5, CW - 2, 5.5, 1.5, 1.5, 'S')
          }

          pdf.setFontSize(6)
          setColor(isMe ? C.green : C.slate500)
          pdf.text(String(s.position), M + 4, y + 3.5, { align: 'center' })

          pdf.setFontSize(6)
          setColor(isMe ? C.white : C.slate300)
          const teamNameTrunc = s.name.length > 40 ? s.name.slice(0, 40) + '...' : s.name
          pdf.text(teamNameTrunc, M + 10, y + 3.5)

          setColor(C.slate400)
          pdf.text(String(s.played), M + CW - 22, y + 3.5, { align: 'center' })

          setColor(isMe ? C.green : C.white)
          pdf.setFontSize(6.5)
          pdf.text(String(s.points), M + CW - 8, y + 3.5, { align: 'center' })

          y += 6
        })
        y += 4
      }

      // ─── Top scorers ───────────────────────────────────────────
      const topScorers = [...r.players].sort((a, b) => b.goals - a.goals).filter(p => p.goals > 0).slice(0, 5)
      if (topScorers.length > 0) {
        y = checkNewPage(y, 10 + topScorers.length * 6)
        roundRect(M, y, halfW, 6, 0, C.bgCard)
        pdf.setFontSize(7)
        setColor(C.green)
        pdf.text('⚽ GOLEJADORS', M + 4, y + 4.5)
        y += 8

        topScorers.forEach((p, i) => {
          pdf.setFontSize(6)
          setColor(C.slate400)
          pdf.text(`${i + 1}.`, M + 4, y + 3)
          setColor(C.slate200)
          pdf.text(p.name, M + 10, y + 3)
          pdf.setFontSize(7)
          setColor(C.green)
          pdf.text(String(p.goals), M + halfW - 6, y + 3, { align: 'right' })
          y += 5.5
        })
        y += 2
      }

      // ─── Risk players ─────────────────────────────────────────
      const riskPlayers = r.players.filter(p => p.risk)
      if (riskPlayers.length > 0) {
        const riskY = y - (topScorers.length > 0 ? topScorers.length * 5.5 + 10 : 0)
        const riskStartY = topScorers.length > 0 ? riskY : y
        const ry = topScorers.length > 0 ? riskStartY : y

        // If we have scorers, put risk players next to them
        const riskX = topScorers.length > 0 ? M + halfW + 4 : M
        let ryy = topScorers.length > 0 ? ry : y

        ryy = checkNewPage(ryy, 10 + riskPlayers.length * 6)
        roundRect(riskX, ryy, topScorers.length > 0 ? halfW : CW, 6, 0, [40, 30, 15])
        pdf.setFontSize(7)
        setColor(C.amber)
        pdf.text('⚠️ JUGADORS EN RISC', riskX + 4, ryy + 4.5)
        ryy += 8

        riskPlayers.slice(0, 5).forEach((p) => {
          pdf.setFontSize(6)
          setColor(C.slate200)
          pdf.text(p.name, riskX + 4, ryy + 3)
          pdf.setFontSize(6)
          setColor(C.amber)
          const rw = topScorers.length > 0 ? halfW : CW
          pdf.text(`🟨 ${p.yellow_cards}`, riskX + rw - 6, ryy + 3, { align: 'right' })
          ryy += 5.5
        })

        if (!topScorers.length) y = ryy + 2
        else y = Math.max(y, ryy + 2)
      }

      // ─── Squad Table ───────────────────────────────────────────
      if (r.players.length > 0) {
        y = checkNewPage(y, 20)
        roundRect(M, y, CW, 6, 0, C.bgCard)
        pdf.setFontSize(7)
        setColor([168, 85, 247]) // purple-400
        pdf.text(`👥 PLANTILLA — ${r.players.length} jugadors`, M + 4, y + 4.5)
        y += 8

        // Table header
        pdf.setFontSize(5)
        setColor(C.slate500)
        pdf.text('JUGADOR', M + 4, y + 2.5)
        pdf.text('PJ', M + CW - 48, y + 2.5, { align: 'center' })
        pdf.text('GOLS', M + CW - 36, y + 2.5, { align: 'center' })
        pdf.text('🟨', M + CW - 24, y + 2.5, { align: 'center' })
        pdf.text('🟥', M + CW - 14, y + 2.5, { align: 'center' })
        pdf.text('MIN', M + CW - 4, y + 2.5, { align: 'center' })

        // Separator line
        setFill(C.slate600)
        pdf.rect(M + 2, y + 4, CW - 4, 0.2, 'F')
        y += 6

        r.players.slice(0, 25).forEach((p, i) => {
          y = checkNewPage(y, 5)
          // Alternating row bg
          if (i % 2 === 0) {
            roundRect(M + 1, y - 0.5, CW - 2, 5, 0.5, [20, 30, 50])
          }
          if (p.risk) {
            roundRect(M + 1, y - 0.5, CW - 2, 5, 0.5, [45, 35, 15])
          }

          pdf.setFontSize(5.5)
          setColor(p.risk ? C.amber : C.slate200)
          const playerName = p.name.length > 32 ? p.name.slice(0, 32) + '...' : p.name
          pdf.text(playerName, M + 4, y + 3)

          setColor(C.slate400)
          pdf.text(p.appearances > 0 ? String(p.appearances) : '–', M + CW - 48, y + 3, { align: 'center' })

          setColor(p.goals > 0 ? C.green : C.slate600)
          pdf.text(p.goals > 0 ? String(p.goals) : '–', M + CW - 36, y + 3, { align: 'center' })

          setColor(p.yellow_cards > 0 ? ([4, 9, 14].includes(p.yellow_cards) ? C.amber : C.slate400) : C.slate600)
          pdf.text(p.yellow_cards > 0 ? String(p.yellow_cards) : '–', M + CW - 24, y + 3, { align: 'center' })

          setColor(p.red_cards > 0 ? C.red : C.slate600)
          pdf.text(p.red_cards > 0 ? String(p.red_cards) : '–', M + CW - 14, y + 3, { align: 'center' })

          setColor(C.slate500)
          pdf.text(p.minutes_played > 0 ? `${p.minutes_played}'` : '–', M + CW - 4, y + 3, { align: 'center' })

          y += 5
        })
        y += 4
      }

      // ─── Recent Matches ────────────────────────────────────────
      if (r.form.length > 0) {
        y = checkNewPage(y, 15)
        roundRect(M, y, CW, 6, 0, C.bgCard)
        pdf.setFontSize(7)
        setColor(C.green)
        pdf.text('📅 PARTITS RECENTS', M + 4, y + 4.5)
        y += 8

        r.form.slice(0, 10).forEach((m) => {
          y = checkNewPage(y, 5.5)
          // Result indicator
          const dotColor = m.result === 'W' ? C.green : m.result === 'D' ? C.amber : m.result === 'L' ? C.red : C.slate600
          roundRect(M + 3, y, 4.5, 4.5, 2.2, dotColor)
          pdf.setFontSize(5)
          setColor(C.white)
          pdf.text(m.result ? RESULT_LABEL[m.result] ?? m.result : '?', M + 5.25, y + 3.3, { align: 'center' })

          // Venue
          pdf.setFontSize(4.5)
          setColor(C.slate500)
          pdf.text(m.isHome ? 'LOC' : 'VIS', M + 10, y + 3.2)

          // Score
          pdf.setFontSize(6)
          if (m.goalsFor !== null && m.goalsAgainst !== null) {
            const win = m.goalsFor > m.goalsAgainst
            const lose = m.goalsFor < m.goalsAgainst
            setColor(win ? C.green : lose ? C.red : C.slate300)
            pdf.text(`${m.goalsFor}`, M + 20, y + 3.2, { align: 'center' })
            setColor(C.slate600)
            pdf.text('-', M + 23.5, y + 3.2, { align: 'center' })
            setColor(lose ? C.green : win ? C.red : C.slate300)
            pdf.text(`${m.goalsAgainst}`, M + 27, y + 3.2, { align: 'center' })
          }

          // Opponent
          pdf.setFontSize(5.5)
          setColor(C.slate300)
          const oppName = m.opponent.length > 35 ? m.opponent.slice(0, 35) + '...' : m.opponent
          pdf.text(oppName, M + 32, y + 3.2)

          // Date
          setColor(C.slate600)
          pdf.setFontSize(5)
          pdf.text(formatDateCat(m.date), M + CW - 4, y + 3.2, { align: 'right' })

          y += 5.5
        })
      }

      // ─── Add watermark and chrome to all pages ─────────────────
      for (let p = 1; p <= page; p++) {
        pdf.setPage(p)
        addWatermarkAndChrome(p)
      }

      // ─── Try to add logo watermark on page 1 ──────────────────
      try {
        const logoImg = new Image()
        logoImg.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve()
          logoImg.onerror = () => reject()
          logoImg.src = '/logo_neoscout.png'
        })
        const logoCanvas = document.createElement('canvas')
        logoCanvas.width = logoImg.width
        logoCanvas.height = logoImg.height
        const lctx = logoCanvas.getContext('2d')!
        lctx.drawImage(logoImg, 0, 0)
        const logoData = logoCanvas.toDataURL('image/png')

        pdf.setPage(1)
        pdf.saveGraphicsState()
        // @ts-ignore
        pdf.setGState(new (pdf as any).GState({ opacity: 0.04 }))
        const logoW = 70
        const logoH = (logoImg.height / logoImg.width) * logoW
        pdf.addImage(logoData, 'PNG', (W - logoW) / 2, (H - logoH) / 2 + 20, logoW, logoH)
        pdf.restoreGraphicsState()
      } catch {
        // Logo load failed, text watermarks are enough
      }

      const filename = `NeoScout_${teamName.replace(/[^a-zA-Z0-9àáèéíòóúïüçñ ]/gi, '').replace(/\s+/g, '_')}.pdf`
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
        disabled={exporting}
        className="group inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600/90 to-cyan-600/90 hover:from-green-500 hover:to-cyan-500 disabled:from-slate-700 disabled:to-slate-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/30 disabled:shadow-none"
      >
        {exporting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Generant PDF...</span>
          </>
        ) : (
          <>
            <FileDown size={16} className="group-hover:scale-110 transition-transform" />
            <span>Exportar PDF</span>
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
