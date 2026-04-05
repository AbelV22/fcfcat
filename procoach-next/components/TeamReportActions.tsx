'use client'

import { useState, useCallback, useRef } from 'react'
import { FileDown, Share2, Loader2 } from 'lucide-react'
import RivalReportPDF from './RivalReportPDF'
import type { RivalReportPDFHandle } from './RivalReportPDF'
import ShareableRivalCard from './ShareableRivalCard'

// ─── Types ──────────────────────────────────────────────────────────────
type SplitStats = { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number }
type PlayerEntry = { name: string; appearances: number; starts?: number; goals: number; yellow_cards: number; red_cards: number; minutes_played: number; risk: boolean }
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
  name: string
  competition: string
  position: number | null
  played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number
  home: SplitStats
  away: SplitStats
  form: MatchEntry[]
  rival: {
    name: string
    played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number
    position: number | null
    home: SplitStats
    away: SplitStats
    form: MatchEntry[]
    topScorers: PlayerEntry[]
    apercibits: PlayerEntry[]
    mostMinutes: PlayerEntry[]
    goalBuckets: GoalBucketEntry[]
    insights: RivalInsights | null
  } | null
  headToHead: MatchEntry[]
  nextMatch: { opponent: string; date: string; jornada: number; isHome: boolean; time?: string; referee?: string | null } | null
  homePitch: { length_m: number; width_m: number; field_name?: string } | null
  rivalPitch: { length_m: number; width_m: number; field_name?: string } | null
}

interface TeamReportActionsProps {
  teamName: string
  teamSlug: string
  competition: string
  reportData: PDFReportData
}

export default function TeamReportActions({ teamName, teamSlug, competition, reportData }: TeamReportActionsProps) {
  const [exporting, setExporting] = useState(false)
  const pdfRef = useRef<RivalReportPDFHandle>(null)

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
      await pdfRef.current?.generatePDF()
    } catch (err) {
      console.error('PDF export failed:', err)
      alert("Error al generar el PDF. Torna-ho a intentar.")
    } finally {
      setExporting(false)
    }
  }, [reportData])

  return (
    <>
      {/* Hidden PDF renderer */}
      {reportData.rival && reportData.nextMatch && (
        <RivalReportPDF ref={pdfRef} data={reportData} teamSlug={teamSlug} />
      )}

      <div className="flex items-center gap-2 flex-wrap">
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
              <span className="hidden xs:inline">Informe PDF</span>
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
        {reportData.rival && (
          <ShareableRivalCard
            teamName={reportData.rival.name}
            teamSlug={teamSlug}
            competition={competition}
            position={reportData.rival.position}
            played={reportData.rival.played}
            wins={reportData.rival.wins}
            draws={reportData.rival.draws}
            losses={reportData.rival.losses}
            gf={reportData.rival.gf}
            ga={reportData.rival.ga}
            form={reportData.rival.form.slice(-10).map(m => m.result)}
            topScorer={
              reportData.rival.topScorers[0]
                ? { name: reportData.rival.topScorers[0].name, goals: reportData.rival.topScorers[0].goals }
                : null
            }
            goalHighlight={
              reportData.rival.goalBuckets.length > 0
                ? (() => {
                    const max = reportData.rival!.goalBuckets.reduce((a, b) => a.scored > b.scored ? a : b)
                    const total = reportData.rival!.goalBuckets.reduce((s, b) => s + b.scored, 0)
                    if (total === 0) return null
                    const pct = Math.round((max.scored / total) * 100)
                    return pct > 25 ? `${pct}% dels gols al ${max.label}` : null
                  })()
                : null
            }
          />
        )}
      </div>
    </>
  )
}
