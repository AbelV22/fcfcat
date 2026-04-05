'use client'

import { useCallback, useRef } from 'react'
import { Share2, Download } from 'lucide-react'

interface PlayerShareCardProps {
  name: string
  slug: string
  position?: string
  currentTeam?: string
  appearances: number
  goals: number
  yellowCards: number
  redCards: number
  season?: string
}

const POS_COLORS: Record<string, string> = {
  porter: '#eab308',
  defensa: '#3b82f6',
  migcampista: '#22c55e',
  davanter: '#ef4444',
}

const POS_LABELS: Record<string, string> = {
  porter: 'Porter',
  defensa: 'Defensa',
  migcampista: 'Migcampista',
  davanter: 'Davanter',
}

export default function PlayerShareCard(props: PlayerShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(cardRef.current, {
      width: 1080,
      height: 1920,
      scale: 1,
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
    link.download = `neoscout-${props.slug}.png`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }, [generateImage, props.slug])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      const blob = await generateImage()
      if (blob) {
        const file = new File([blob], `${props.slug}.png`, { type: 'image/png' })
        try {
          await navigator.share({
            text: `Les meves estadistiques a NeoScout\nneoscout.es/jugador/${props.slug}`,
            files: [file],
          })
          return
        } catch { /* fall through */ }
      }
    }
    const text = `Les meves estadistiques a NeoScout!\n\nhttps://neoscout.es/jugador/${props.slug}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }, [generateImage, props.slug])

  const posColor = POS_COLORS[props.position || ''] || '#94a3b8'
  const posLabel = POS_LABELS[props.position || ''] || ''

  return (
    <>
      {/* Hidden story card (1080x1920 for Instagram Stories) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div
          ref={cardRef}
          style={{
            width: 1080,
            height: 1920,
            background: 'linear-gradient(180deg, #0a1628 0%, #0f172a 30%, #1e293b 100%)',
            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 60px',
            position: 'relative',
          }}
        >
          {/* Top badge */}
          <div style={{
            position: 'absolute', top: 80, left: 0, right: 0,
            textAlign: 'center', fontSize: 24, color: '#64748b',
            fontWeight: 600, letterSpacing: 4, textTransform: 'uppercase',
          }}>
            Temporada {props.season || '2025/26'}
          </div>

          {/* Player avatar placeholder */}
          <div style={{
            width: 200, height: 200, borderRadius: 100,
            background: `linear-gradient(135deg, ${posColor}40, ${posColor}20)`,
            border: `4px solid ${posColor}60`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 72, fontWeight: 900, marginBottom: 40,
          }}>
            {props.name.charAt(0)}
          </div>

          {/* Name */}
          <div style={{ fontSize: 56, fontWeight: 900, textAlign: 'center', marginBottom: 16, lineHeight: 1.2 }}>
            {props.name}
          </div>

          {/* Position + Team */}
          {posLabel && (
            <div style={{
              fontSize: 22, fontWeight: 700, color: posColor,
              padding: '8px 24px', borderRadius: 30,
              background: `${posColor}15`, border: `1px solid ${posColor}30`,
              marginBottom: 12,
            }}>
              {posLabel}
            </div>
          )}
          {props.currentTeam && (
            <div style={{ fontSize: 24, color: '#94a3b8', marginBottom: 60 }}>
              {props.currentTeam}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 32, marginBottom: 60 }}>
            {[
              { value: props.appearances, label: 'Partits', color: '#06b6d4' },
              { value: props.goals, label: 'Gols', color: '#22c55e' },
              { value: props.yellowCards, label: 'Grogues', color: '#eab308' },
              { value: props.redCards, label: 'Vermelles', color: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{
                width: 200, background: 'rgba(255,255,255,0.04)',
                borderRadius: 24, padding: '32px 0', textAlign: 'center',
              }}>
                <div style={{ fontSize: 56, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 18, color: '#64748b', marginTop: 8 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Goals per match */}
          {props.appearances > 0 && props.goals > 0 && (
            <div style={{
              fontSize: 24, color: '#94a3b8', marginBottom: 40,
            }}>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>
                {(props.goals / props.appearances).toFixed(2)}
              </span>{' '}
              gols per partit
            </div>
          )}

          {/* Footer */}
          <div style={{
            position: 'absolute', bottom: 80, left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, #22c55e, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 900,
              }}>
                N
              </div>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#64748b' }}>neoscout.es</span>
            </div>
            <span style={{ fontSize: 16, color: '#334155' }}>Dades oficials FCF</span>
          </div>
        </div>
      </div>

      {/* Visible buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleShare}
          className="group inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20"
        >
          <Share2 size={16} className="group-hover:scale-110 transition-transform" />
          Compartir a Instagram
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
