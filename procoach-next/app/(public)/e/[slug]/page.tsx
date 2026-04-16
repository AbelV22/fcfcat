import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fetchPublicExercise } from '@/lib/training-data-server'
import { createClient } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/supabase-config'
import { CATEGORY_LABELS, INTENSITY_LABELS } from '@/lib/training-types'
import DrillPitchSVG from '@/components/entrenaments/DrillPitchSVG'
import ExercisePublicActions from '@/components/entrenaments/ExercisePublicActions'
import ExerciseDownloadPanel from '@/components/entrenaments/ExerciseDownloadPanel'
import DiagramElementView from '@/components/entrenaments/DiagramElementView'

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
          <DiagramElementView elements={exercise.diagram_data?.elements ?? []} />
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

