'use client'

import { useCallback, useRef } from 'react'
import { Share2, Download } from 'lucide-react'

interface ShareableRivalCardProps {
  teamName: string
  teamSlug: string
  competition: string
  position: number | null
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  form: ('W' | 'D' | 'L' | null)[]
  topScorer?: { name: string; goals: number } | null
  goalHighlight?: string | null // e.g. "40% dels gols entre 60'-75'"
}

export default function ShareableRivalCard(props: ShareableRivalCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(cardRef.current, {
      width: 800,
      height: 800,
      scale: 2,
      backgroundColor: '#0f172a',
      useCORS: true,
    })
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  }, [])

  const handleDownload = useCallback(async () => {
    const blob = await generateImage()
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `neoscout-rival-${props.teamSlug}.png`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }, [generateImage, props.teamSlug])

  const handleShare = useCallback(async () => {
    // Try Web Share API first (mobile)
    if (navigator.share) {
      const blob = await generateImage()
      if (blob) {
        const file = new File([blob], `rival-${props.teamSlug}.png`, { type: 'image/png' })
        try {
          await navigator.share({
            text: `${props.teamName} — Informe del rival | ${props.competition}\nneoscout.es/equip/${props.teamSlug}`,
            files: [file],
          })
          return
        } catch {
          // Fall through to WhatsApp
        }
      }
    }
    // Fallback: WhatsApp text share
    const text = `${props.teamName} — Informe del rival | ${props.competition}\n\nhttps://neoscout.es/equip/${props.teamSlug}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }, [generateImage, props.teamName, props.teamSlug, props.competition])

  const formColors = { W: '#22c55e', D: '#eab308', L: '#ef4444' }

  return (
    <>
      {/* Hidden card for image generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div
          ref={cardRef}
          style={{
            width: 800,
            height: 800,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            padding: 48,
            position: 'relative',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
                Informe del rival
              </div>
              <div style={{ fontSize: 36, fontWeight: 900 }}>{props.teamName}</div>
              <div style={{ fontSize: 16, color: '#64748b', marginTop: 4 }}>{props.competition}</div>
            </div>
            {props.position && (
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'rgba(34, 197, 94, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 900, color: '#22c55e',
              }}>
                {props.position}a
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'PJ', value: props.played, color: '#94a3b8' },
              { label: 'V', value: props.wins, color: '#22c55e' },
              { label: 'E', value: props.draws, color: '#eab308' },
              { label: 'D', value: props.losses, color: '#ef4444' },
              { label: 'GF', value: props.gf, color: '#06b6d4' },
              { label: 'GC', value: props.ga, color: '#f97316' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                borderRadius: 12, padding: '16px 0', textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, fontWeight: 600 }}>FORMA RECENT</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {props.form.slice(-10).map((r, i) => (
                <div key={i} style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: r ? formColors[r] : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                }}>
                  {r === 'W' ? 'V' : r === 'D' ? 'E' : r === 'L' ? 'D' : '-'}
                </div>
              ))}
            </div>
          </div>

          {/* Highlight */}
          {(props.topScorer || props.goalHighlight) && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.2)',
              borderRadius: 16, padding: 20, marginBottom: 24,
            }}>
              {props.topScorer && (
                <div style={{ fontSize: 16, marginBottom: props.goalHighlight ? 8 : 0 }}>
                  <span style={{ color: '#eab308', fontWeight: 700 }}>Maxim golejador:</span>{' '}
                  <span style={{ fontWeight: 600 }}>{props.topScorer.name} ({props.topScorer.goals} gols)</span>
                </div>
              )}
              {props.goalHighlight && (
                <div style={{ fontSize: 16, color: '#fbbf24', fontWeight: 600 }}>
                  {props.goalHighlight}
                </div>
              )}
            </div>
          )}

          {/* Footer watermark */}
          <div style={{
            marginTop: 'auto',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #22c55e, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 900,
              }}>
                N
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8' }}>neoscout.es</span>
            </div>
            <span style={{ fontSize: 12, color: '#475569' }}>Dades oficials FCF · Temporada 2025/26</span>
          </div>
        </div>
      </div>

      {/* Visible buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleShare}
          className="group inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600/90 hover:bg-cyan-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
        >
          <Share2 size={16} className="group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Compartir card</span>
        </button>
        <button
          onClick={handleDownload}
          className="group inline-flex items-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm rounded-xl transition-all"
          title="Descarregar imatge"
        >
          <Download size={16} />
        </button>
      </div>
    </>
  )
}
