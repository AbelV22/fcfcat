import { ImageResponse } from 'next/og'
import { fetchPublicExercise } from '@/lib/training-data'
import { CATEGORY_LABELS, INTENSITY_LABELS } from '@/lib/training-types'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const exercise = await fetchPublicExercise(slug)

  if (!exercise) {
    return new ImageResponse(
      <div
        style={{
          background: '#08090a',
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#22c55e', fontSize: 48, fontWeight: 800,
        }}
      >
        NeoScout
      </div>,
      { ...size }
    )
  }

  const authorLine = exercise.coach?.display_name
    ? `${exercise.coach.display_name}${exercise.coach.club_name ? ` · ${exercise.coach.club_name}` : ''}`
    : null

  const stats = [
    { label: 'Durada', value: `${exercise.duration_min} min` },
    { label: 'Intensitat', value: INTENSITY_LABELS[exercise.intensity] },
    { label: 'Jugadors', value: `${exercise.min_players}+` },
    { label: 'Categoria', value: CATEGORY_LABELS[exercise.category] },
  ]

  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #0b0d10 0%, #111827 100%)',
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        padding: '56px 64px',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* Top: logo + category */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
        <div style={{
          background: '#22c55e', borderRadius: 10,
          padding: '6px 16px', fontSize: 20, fontWeight: 800, color: '#000',
        }}>
          NeoScout
        </div>
        <div style={{ fontSize: 18, color: '#4b5563' }}>
          Exercici de {CATEGORY_LABELS[exercise.category]}
        </div>
      </div>

      {/* Exercise name */}
      <div style={{
        fontSize: exercise.name.length > 40 ? 52 : 64,
        fontWeight: 900,
        color: '#f9fafb',
        lineHeight: 1.05,
        marginBottom: 20,
        letterSpacing: '-1px',
        maxWidth: 900,
      }}>
        {exercise.name}
      </div>

      {/* Author */}
      {authorLine && (
        <div style={{ fontSize: 24, color: '#9ca3af', marginBottom: 36 }}>
          per {authorLine}
        </div>
      )}

      {/* Stats pills */}
      <div style={{ display: 'flex', gap: 16, marginTop: 'auto' }}>
        {stats.map(stat => (
          <div
            key={stat.label}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: '12px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 14, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {stat.label}
            </span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#f3f4f6' }}>
              {stat.value}
            </span>
          </div>
        ))}

        {exercise.clone_count > 0 && (
          <div style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 12,
            padding: '12px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            <span style={{ fontSize: 14, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Guardats
            </span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>
              {exercise.clone_count}
            </span>
          </div>
        )}
      </div>

      {/* Bottom right watermark */}
      <div style={{
        position: 'absolute', bottom: 48, right: 64,
        fontSize: 16, color: '#374151',
      }}>
        neoscout.es/e/{slug}
      </div>
    </div>,
    { ...size }
  )
}
