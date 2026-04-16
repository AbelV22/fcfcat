import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fetchPublicExercise } from '@/lib/training-data-server'
import { createClient } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/supabase-config'
import { CATEGORY_LABELS, INTENSITY_LABELS } from '@/lib/training-types'
import DrillPitchSVG from '@/components/entrenaments/DrillPitchSVG'
import ExercisePublicActions from '@/components/entrenaments/ExercisePublicActions'
import ExerciseDownloadPanel from '@/components/entrenaments/ExerciseDownloadPanel'
import type { DiagramElement } from '@/lib/training-types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const exercise = await fetchPublicExercise(slug)
  if (!exercise) return { title: 'Exercici no trobat — NeoScout' }
  const author = exercise.coach?.display_name
    ? `${exercise.coach.display_name}${exercise.coach.club_name ? ` · ${exercise.coach.club_name}` : ''}`
    : 'NeoScout'
  return {
    title: `${exercise.name} — NeoScout`,
    description: exercise.description || `Exercici de ${CATEGORY_LABELS[exercise.category]} creat per ${author}`,
    openGraph: {
      title: exercise.name,
      description: exercise.description || `${CATEGORY_LABELS[exercise.category]} · ${exercise.duration_min} min`,
      url: `${SITE_URL}/e/${slug}`,
      siteName: 'NeoScout',
      images: [{ url: `${SITE_URL}/e/${slug}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: exercise.name,
      description: exercise.description || `${CATEGORY_LABELS[exercise.category]} · ${exercise.duration_min} min`,
      images: [`${SITE_URL}/e/${slug}/opengraph-image`],
    },
  }
}

export default async function PublicExercisePage({ params }: Props) {
  const { slug } = await params
  const exercise = await fetchPublicExercise(slug)
  if (!exercise) notFound()

  // Check if viewer is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fire-and-forget view count (non-blocking)
  supabase.rpc('increment_exercise_share_count', { exercise_slug: slug }).then(() => {})

  const author = exercise.coach
  const authorLabel = author?.display_name
    ? `${author.display_name}${author.club_name ? ` · ${author.club_name}` : ''}`
    : null

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 64px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: '#62666d', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Exercici de {CATEGORY_LABELS[exercise.category]}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-headline)', fontSize: 28, fontWeight: 800,
          color: '#f7f8f8', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 8,
        }}>
          {exercise.name}
        </h1>
        {authorLabel && (
          <p style={{ fontSize: 14, color: '#8a8f98' }}>
            per <span style={{ color: '#d0d6e0', fontWeight: 510 }}>{authorLabel}</span>
          </p>
        )}
      </div>

      {/* Diagram */}
      <div style={{ marginBottom: 20, borderRadius: 10, overflow: 'hidden' }}>
        <DrillPitchSVG mode="full" style={{ borderRadius: 10 }}>
          {exercise.diagram_data?.elements?.map((el: DiagramElement, i: number) => (
            <DiagramElementRenderer key={i} el={el} />
          ))}
        </DrillPitchSVG>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20,
      }}>
        {[
          { label: 'Durada', value: `${exercise.duration_min} min` },
          { label: 'Intensitat', value: INTENSITY_LABELS[exercise.intensity] },
          { label: 'Jugadors', value: `${exercise.min_players}+` },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '8px 14px',
          }}>
            <div style={{ fontSize: 10, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#d0d6e0', marginTop: 2 }}>
              {stat.value}
            </div>
          </div>
        ))}
        {exercise.clone_count > 0 && (
          <div style={{
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: 8, padding: '8px 14px',
          }}>
            <div style={{ fontSize: 10, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Guardats</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#22c55e', marginTop: 2 }}>
              {exercise.clone_count}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {exercise.description && (
        <p style={{ fontSize: 14, color: '#8a8f98', lineHeight: 1.6, marginBottom: 16 }}>
          {exercise.description}
        </p>
      )}

      {/* Tactical objective */}
      {exercise.tactical_objective && (
        <div style={{
          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          fontSize: 13, color: '#9ca3af',
        }}>
          <span style={{ color: '#22c55e', fontWeight: 600, marginRight: 6 }}>Objectiu tàctic</span>
          {exercise.tactical_objective}
        </div>
      )}

      {/* Equipment */}
      {exercise.equipment?.length > 0 && (
        <div style={{ fontSize: 13, color: '#62666d', marginBottom: 20 }}>
          Material: {exercise.equipment.join(', ')}
        </div>
      )}

      {/* Actions: Save + WhatsApp */}
      <ExercisePublicActions
        exerciseId={exercise.id}
        exerciseName={exercise.name}
        slug={slug}
        isAuthenticated={!!user}
      />

      {/* Download */}
      <ExerciseDownloadPanel exercise={exercise} />

      {/* CTA footer */}
      <div style={{
        marginTop: 32, padding: '20px 20px', borderRadius: 10,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, color: '#8a8f98', marginBottom: 12 }}>
          Crea i comparteix els teus propis exercicis amb NeoScout
        </p>
        <a
          href="/registre"
          style={{
            display: 'inline-block', padding: '10px 24px', borderRadius: 8,
            background: '#22c55e', color: '#000', fontWeight: 700, fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Crea el teu compte gratis
        </a>
      </div>
    </div>
  )
}

// Inline read-only renderer (subset of ExerciseDiagramEditor's renderElement)
function DiagramElementRenderer({ el }: { el: DiagramElement }) {
  switch (el.type) {
    case 'player': {
      const isA = el.team !== 'b'
      const baseColor = el.color || (isA ? '#3b82f6' : '#ef4444')
      const ox = el.x - 14, oy = el.y - 14
      return (
        <g>
          <g transform={`translate(${ox} ${oy})`}>
            <path
              d="M7 2 L3.5 4.5 L1.5 9 L4.5 11 L6 9.5 L6 21 Q6 22 7 22 L21 22 Q22 22 22 21 L22 9.5 L23.5 11 L26.5 9 L24.5 4.5 L21 2 L18 3.5 Q14 5.5 10 3.5 Z"
              fill={baseColor} stroke="rgba(0,0,0,0.5)" strokeWidth="1" strokeLinejoin="round"
            />
            <text x="14" y="16" textAnchor="middle" dominantBaseline="middle"
              fill="#fff" fontSize={10} fontWeight={700} style={{ pointerEvents: 'none' }}>
              {el.label || '1'}
            </text>
          </g>
        </g>
      )
    }
    case 'opponent':
      return (
        <g>
          <circle cx={el.x} cy={el.y} r={14} fill={el.color || '#0ea5e9'} stroke="rgba(0,0,0,0.4)" strokeWidth={1.5} />
          <line x1={el.x - 5} y1={el.y - 5} x2={el.x + 5} y2={el.y + 5} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
          <line x1={el.x + 5} y1={el.y - 5} x2={el.x - 5} y2={el.y + 5} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        </g>
      )
    case 'ball':
      return (
        <g transform={`translate(${el.x} ${el.y})`}>
          <circle r={9} fill="#f0f0f0" stroke="#1a1a1a" strokeWidth={0.8} />
          <polygon points="0,-4 3.8,-1.2 2.3,3.2 -2.3,3.2 -3.8,-1.2" fill="#1a1a1a" />
          <line x1="0" y1="-4" x2="0" y2="-8.5" stroke="#1a1a1a" strokeWidth="0.7" />
          <line x1="3.8" y1="-1.2" x2="8" y2="-2.8" stroke="#1a1a1a" strokeWidth="0.7" />
          <line x1="2.3" y1="3.2" x2="5" y2="7.2" stroke="#1a1a1a" strokeWidth="0.7" />
          <line x1="-2.3" y1="3.2" x2="-5" y2="7.2" stroke="#1a1a1a" strokeWidth="0.7" />
          <line x1="-3.8" y1="-1.2" x2="-8" y2="-2.8" stroke="#1a1a1a" strokeWidth="0.7" />
        </g>
      )
    case 'cone':
      return (
        <polygon
          points={`${el.x},${el.y - 9} ${el.x - 7},${el.y + 5} ${el.x + 7},${el.y + 5}`}
          fill={el.color || '#f97316'} opacity={0.9}
        />
      )
    case 'arrow': {
      const angle = Math.atan2((el.y2 || el.y) - el.y, (el.x2 || el.x) - el.x)
      const tipX = el.x2 || el.x, tipY = el.y2 || el.y, aLen = 10
      return (
        <g>
          <line x1={el.x} y1={el.y} x2={tipX} y2={tipY} stroke={el.color || '#fff'} strokeWidth={2} />
          <polygon
            points={`${tipX},${tipY} ${tipX - aLen * Math.cos(angle - 0.4)},${tipY - aLen * Math.sin(angle - 0.4)} ${tipX - aLen * Math.cos(angle + 0.4)},${tipY - aLen * Math.sin(angle + 0.4)}`}
            fill={el.color || '#fff'}
          />
        </g>
      )
    }
    case 'curved_arrow': {
      const cx = el.cx ?? (el.x + (el.x2 || el.x)) / 2
      const cy = el.cy ?? (el.y + (el.y2 || el.y)) / 2
      const tipX = el.x2 || el.x, tipY = el.y2 || el.y
      const angle = Math.atan2(tipY - cy, tipX - cx), aLen = 10
      return (
        <g>
          <path d={`M ${el.x} ${el.y} Q ${cx} ${cy} ${tipX} ${tipY}`} fill="none" stroke={el.color || '#fff'} strokeWidth={2} />
          <polygon
            points={`${tipX},${tipY} ${tipX - aLen * Math.cos(angle - 0.4)},${tipY - aLen * Math.sin(angle - 0.4)} ${tipX - aLen * Math.cos(angle + 0.4)},${tipY - aLen * Math.sin(angle + 0.4)}`}
            fill={el.color || '#fff'}
          />
        </g>
      )
    }
    case 'zone':
      return (
        <rect
          x={el.x} y={el.y} width={el.width || 60} height={el.height || 40}
          fill={el.color || '#3b82f6'} opacity={el.opacity || 0.15}
          stroke={el.color || '#3b82f6'} strokeWidth={1} rx={3}
        />
      )
    case 'text':
      return (
        <text x={el.x} y={el.y} fill={el.color || '#fff'} fontSize={14} fontWeight={600} textAnchor="middle" dominantBaseline="middle">
          {el.label || ''}
        </text>
      )
    case 'goal': {
      const isLarge = el.size !== 'small'
      const halfW = isLarge ? 30 : 15
      const h = isLarge ? 11 : 7
      const netCount = isLarge ? 5 : 3
      const c = el.color || '#fff'
      return (
        <g>
          <rect x={el.x - halfW} y={el.y - h} width={halfW * 2} height={h * 2}
            fill="rgba(255,255,255,0.04)" stroke={c} strokeWidth={2} rx={2} />
          {Array.from({ length: netCount }).map((_, i) => {
            const gx = el.x - halfW + (halfW * 2) * (i + 1) / (netCount + 1)
            return <line key={i} x1={gx} y1={el.y - h} x2={gx + (isLarge ? 3 : 2)} y2={el.y + h}
              stroke={c} strokeWidth={0.5} opacity={0.45} />
          })}
        </g>
      )
    }
    default:
      return null
  }
}
