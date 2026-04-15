'use client'

import { useRef, useState, useCallback } from 'react'
import { Download, FileText } from 'lucide-react'
import type { PublicExercise } from '@/lib/training-types'
import { CATEGORY_LABELS, INTENSITY_LABELS } from '@/lib/training-types'

interface Props {
  exercise: PublicExercise
}

export default function ExerciseDownloadPanel({ exercise }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState<'png' | 'pdf' | null>(null)

  const generateCanvas = useCallback(async () => {
    if (!cardRef.current) return null
    const { default: html2canvas } = await import('html2canvas')
    return html2canvas(cardRef.current, {
      width: 800,
      height: 600,
      scale: 2,
      backgroundColor: '#0b0d10',
      useCORS: true,
      logging: false,
    })
  }, [])

  const handleDownloadPNG = useCallback(async () => {
    setDownloading('png')
    try {
      const canvas = await generateCanvas()
      if (!canvas) return
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `neoscout-${exercise.name.toLowerCase().replace(/\s+/g, '-')}.png`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PNG download error:', err)
    } finally {
      setDownloading(null)
    }
  }, [generateCanvas, exercise.name])

  const handleDownloadPDF = useCallback(async () => {
    setDownloading('pdf')
    try {
      const canvas = await generateCanvas()
      if (!canvas) return
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [800, 600] })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 800, 600)
      pdf.save(`neoscout-${exercise.name.toLowerCase().replace(/\s+/g, '-')}.pdf`)
    } catch (err) {
      console.error('PDF download error:', err)
    } finally {
      setDownloading(null)
    }
  }, [generateCanvas, exercise.name])

  const authorLine = exercise.coach?.display_name
    ? `${exercise.coach.display_name}${exercise.coach.club_name ? ` · ${exercise.coach.club_name}` : ''}`
    : null

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          onClick={handleDownloadPNG}
          disabled={!!downloading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 7, fontSize: 13, fontWeight: 510,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: downloading === 'png' ? '#62666d' : '#d0d6e0',
            cursor: downloading ? 'wait' : 'pointer',
            fontFamily: 'var(--font-inter)',
          }}
        >
          <Download size={14} />
          {downloading === 'png' ? 'Generant...' : 'Descarregar PNG'}
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={!!downloading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 7, fontSize: 13, fontWeight: 510,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: downloading === 'pdf' ? '#62666d' : '#d0d6e0',
            cursor: downloading ? 'wait' : 'pointer',
            fontFamily: 'var(--font-inter)',
          }}
        >
          <FileText size={14} />
          {downloading === 'pdf' ? 'Generant...' : 'Descarregar PDF'}
        </button>
      </div>

      {/* Hidden print card (off-screen, rendered by html2canvas) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        <div
          ref={cardRef}
          style={{
            width: 800, height: 600,
            background: '#0b0d10',
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {CATEGORY_LABELS[exercise.category]}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f9fafb', lineHeight: 1.1 }}>
                {exercise.name}
              </div>
              {authorLine && (
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>per {authorLine}</div>
              )}
            </div>
            <div style={{
              background: '#22c55e', color: '#000', fontWeight: 800,
              fontSize: 13, padding: '4px 12px', borderRadius: 6,
            }}>
              NeoScout
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Durada', value: `${exercise.duration_min} min` },
              { label: 'Intensitat', value: INTENSITY_LABELS[exercise.intensity] },
              { label: 'Jugadors', value: `${exercise.min_players}+` },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 16px',
              }}>
                <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#e5e7eb', marginTop: 2 }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          {exercise.description && (
            <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>
              {exercise.description}
            </div>
          )}

          {/* Objective */}
          {exercise.tactical_objective && (
            <div style={{
              background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)',
              borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#9ca3af',
            }}>
              <span style={{ color: '#22c55e', fontWeight: 700, marginRight: 6 }}>Objectiu:</span>
              {exercise.tactical_objective}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
