'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Clock, CheckCircle2, Trash2, Copy,
  Users, Zap, Calendar, ChevronDown, ChevronUp, Tag, Wrench,
} from 'lucide-react'
import { fetchTrainingSession, deleteSession, updateSessionStatus } from '@/lib/training-data'
import type { TrainingSessionFull, Intensity } from '@/lib/training-types'
import {
  SESSION_TYPE_LABELS, SESSION_STATUS_LABELS, INTENSITY_LABELS,
  INTENSITY_COLORS, PHASE_LABELS, CATEGORY_LABELS,
  ATTENDANCE_LABELS, ATTENDANCE_COLORS, FOCUS_AREA_LABELS,
} from '@/lib/training-types'
import DrillPitchSVG from '@/components/entrenaments/DrillPitchSVG'
import DiagramElementView from '@/components/entrenaments/DiagramElementView'

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<TrainingSessionFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedEx, setExpandedEx] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchTrainingSession(id)
        setSession(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDelete = async () => {
    if (!confirm('Eliminar aquesta sessio?')) return
    await deleteSession(id)
    router.push('/dashboard/entrenaments')
  }

  const handleComplete = async () => {
    if (!session) return
    await updateSessionStatus(id, 'completed')
    setSession({ ...session, status: 'completed' })
  }

  const handleDuplicate = () => {
    if (!session) return
    // Save session data to localStorage for nova-sessio to read
    const dupData = {
      exercises: session.exercises.map(e => ({
        tempId: Math.random().toString(36).substring(2, 9),
        exerciseId: e.exercise_id,
        name: e.exercise?.name || e.inline_name || 'Exercici',
        phase: e.phase,
        durationMin: e.duration_min,
        coachNotes: e.coach_notes || '',
        intensity: e.exercise?.intensity || 'medium',
        exercise: e.exercise,
      })),
      plannedIntensity: session.planned_intensity,
      sessionType: session.session_type,
      title: session.title ? `${session.title} (copia)` : 'Sessio duplicada',
      focusAreas: session.focus_areas || [],
      date: '',
    }
    localStorage.setItem('neoscout_generated_session', JSON.stringify(dupData))
    router.push('/dashboard/entrenaments/nova-sessio?generated=true')
  }

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#62666d' }}>Carregant...</div>
  if (!session) return <div style={{ padding: 32, textAlign: 'center', color: '#62666d' }}>Sessio no trobada</div>

  const intensityColor = INTENSITY_COLORS[session.planned_intensity]
  const phases = ['warmup', 'main', 'cooldown'] as const

  return (
    <div style={{ padding: '16px 16px 32px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/dashboard/entrenaments" style={{ color: '#8a8f98' }}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: 'var(--font-headline)', fontSize: 20, fontWeight: 800,
            color: '#f7f8f8', letterSpacing: '-0.5px',
          }}>
            {session.title || SESSION_TYPE_LABELS[session.session_type]}
          </h1>
          <div style={{ fontSize: 12, color: '#8a8f98', marginTop: 2 }}>
            {session.session_date}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {session.status !== 'completed' && (
            <button
              onClick={handleComplete}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 510,
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                color: '#22c55e', cursor: 'pointer', fontFamily: 'var(--font-inter)',
              }}
            >
              <CheckCircle2 size={14} />
              Completar
            </button>
          )}
          <button
            onClick={handleDuplicate}
            title="Duplicar sessio"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 6,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              color: '#8a8f98', cursor: 'pointer',
            }}
          >
            <Copy size={14} />
          </button>
          <button
            onClick={handleDelete}
            title="Eliminar sessio"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 6,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              color: '#62666d', cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Meta badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        <Badge icon={Calendar} label={SESSION_STATUS_LABELS[session.status]}
          color={session.status === 'completed' ? '#22c55e' : '#8a8f98'} />
        <Badge icon={Zap} label={INTENSITY_LABELS[session.planned_intensity]} color={intensityColor} />
        <Badge icon={Clock} label={`${session.duration_min} min`} color="#8a8f98" />
        {session.focus_areas?.map(f => (
          <Badge key={f} label={FOCUS_AREA_LABELS[f]} color="#3b82f6" />
        ))}
      </div>

      {/* Exercise timeline */}
      {session.exercises.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {phases.map(phase => {
            const phaseExs = session.exercises.filter(e => e.phase === phase)
            if (phaseExs.length === 0) return null
            return (
              <div key={phase}>
                <h3 style={{
                  fontSize: 11, color: '#62666d', textTransform: 'uppercase',
                  letterSpacing: '0.04em', fontWeight: 510, marginBottom: 6,
                }}>
                  {PHASE_LABELS[phase]} ({phaseExs.reduce((s, e) => s + e.duration_min, 0)} min)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {phaseExs.map(ex => {
                    const exercise = ex.exercise
                    const exIntensity = exercise?.intensity || 'medium'
                    const isExpanded = expandedEx === ex.id
                    const hasDetails = exercise && (exercise.diagram_data?.elements?.length > 0 || exercise.description || exercise.tactical_objective || exercise.equipment?.length > 0)

                    return (
                      <div
                        key={ex.id}
                        style={{
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.03)',
                          borderLeft: `3px solid ${INTENSITY_COLORS[exIntensity] || '#8a8f98'}`,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Clickable header */}
                        <button
                          onClick={() => setExpandedEx(isExpanded ? null : ex.id)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 510, color: '#d0d6e0', fontFamily: 'var(--font-inter)' }}>
                              {exercise?.name || ex.inline_name || 'Exercici'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              {exercise?.category && (
                                <span style={{ fontSize: 10, color: '#8a8f98' }}>
                                  {CATEGORY_LABELS[exercise.category]}
                                </span>
                              )}
                              <span style={{ fontSize: 10, color: '#62666d' }}>
                                {ex.duration_min} min
                              </span>
                              <span style={{ width: 5, height: 5, borderRadius: 3, background: INTENSITY_COLORS[exIntensity], opacity: 0.7 }} />
                            </div>
                          </div>
                          {hasDetails && (
                            <ChevronDown size={14} style={{
                              color: '#62666d', flexShrink: 0, transition: 'transform 0.2s',
                              transform: isExpanded ? 'rotate(180deg)' : 'none',
                            }} />
                          )}
                        </button>

                        {/* Expanded details */}
                        {isExpanded && exercise && (
                          <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>

                            {/* Full diagram */}
                            {exercise.diagram_data?.elements?.length > 0 && (
                              <div style={{ marginTop: 10, marginBottom: 10 }}>
                                <DrillPitchSVG mode="full" style={{ borderRadius: 6, maxWidth: 340 }}>
                                  <DiagramElementView elements={exercise.diagram_data.elements} />
                                </DrillPitchSVG>
                              </div>
                            )}

                            {/* Description */}
                            {exercise.description && (
                              <p style={{ fontSize: 12, color: '#d0d6e0', lineHeight: 1.5, marginBottom: 8 }}>
                                {exercise.description}
                              </p>
                            )}

                            {/* Tactical objective */}
                            {exercise.tactical_objective && (
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                                <Tag size={12} style={{ color: '#22c55e', marginTop: 2, flexShrink: 0 }} />
                                <span style={{ fontSize: 11, color: '#8a8f98' }}>{exercise.tactical_objective}</span>
                              </div>
                            )}

                            {/* Equipment + Players */}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#62666d' }}>
                              {exercise.equipment?.length > 0 && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Wrench size={10} />
                                  {exercise.equipment.join(', ')}
                                </span>
                              )}
                              {exercise.min_players > 0 && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Users size={10} />
                                  {exercise.min_players}+ jugadors
                                </span>
                              )}
                            </div>

                            {/* Edit link */}
                            <Link
                              href={`/dashboard/entrenaments/biblioteca/nou?edit=${exercise.id}`}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '5px 10px', borderRadius: 4, fontSize: 11, fontWeight: 510,
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                                color: '#8a8f98', textDecoration: 'none', marginTop: 8,
                              }}
                            >
                              Editar exercici
                            </Link>
                          </div>
                        )}

                        {ex.coach_notes && !isExpanded && (
                          <div style={{ padding: '0 12px 8px' }}>
                            <p style={{ fontSize: 11, color: '#62666d' }}>{ex.coach_notes}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Attendance */}
      {session.attendance.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: 14, marginBottom: 16,
        }}>
          <h3 style={{
            fontSize: 11, color: '#62666d', textTransform: 'uppercase',
            letterSpacing: '0.04em', fontWeight: 510, marginBottom: 8,
          }}>
            <Users size={12} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
            Assistencia ({session.attendance.filter(a => a.status === 'present').length}/{session.attendance.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 4 }}>
            {session.attendance.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 4,
                  background: ATTENDANCE_COLORS[a.status] || '#8a8f98',
                }} />
                <span style={{ fontSize: 12, color: '#d0d6e0', fontFamily: 'var(--font-inter)', fontWeight: 510 }}>
                  {a.player_name}
                </span>
                <span style={{ fontSize: 10, color: '#62666d', marginLeft: 'auto' }}>
                  {ATTENDANCE_LABELS[a.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coach notes */}
      {session.coach_notes && (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: 14,
        }}>
          <h3 style={{ fontSize: 11, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 510, marginBottom: 6 }}>
            Notes
          </h3>
          <p style={{ fontSize: 13, color: '#d0d6e0', lineHeight: 1.5 }}>{session.coach_notes}</p>
        </div>
      )}
    </div>
  )
}

function Badge({ icon: Icon, label, color }: { icon?: typeof Calendar; label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: 6,
      background: `${color}10`, border: `1px solid ${color}25`,
      fontSize: 12, color, fontWeight: 510,
    }}>
      {Icon && <Icon size={12} />}
      {label}
    </span>
  )
}
