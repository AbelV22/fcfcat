'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Clock, CheckCircle2, Trash2, Edit3,
  Users, Zap, Calendar, ChevronDown, ChevronUp,
} from 'lucide-react'
import { fetchTrainingSession, deleteSession, updateSessionStatus } from '@/lib/training-data'
import type { TrainingSessionFull, Intensity } from '@/lib/training-types'
import {
  SESSION_TYPE_LABELS, SESSION_STATUS_LABELS, INTENSITY_LABELS,
  INTENSITY_COLORS, PHASE_LABELS, CATEGORY_LABELS,
  ATTENDANCE_LABELS, ATTENDANCE_COLORS, FOCUS_AREA_LABELS,
} from '@/lib/training-types'
import DrillPitchSVG from '@/components/entrenaments/DrillPitchSVG'

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<TrainingSessionFull | null>(null)
  const [loading, setLoading] = useState(true)

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
            onClick={handleDelete}
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
                    return (
                      <div
                        key={ex.id}
                        style={{
                          padding: '10px 12px', borderRadius: 6,
                          background: 'rgba(255,255,255,0.03)',
                          borderLeft: `3px solid ${INTENSITY_COLORS[exIntensity] || '#8a8f98'}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 13, fontWeight: 510, color: '#d0d6e0', fontFamily: 'var(--font-inter)' }}>
                            {exercise?.name || ex.inline_name || 'Exercici'}
                          </div>
                          <span style={{ fontSize: 11, color: '#62666d' }}>
                            {ex.duration_min} min
                          </span>
                        </div>
                        {exercise?.category && (
                          <span style={{
                            fontSize: 10, color: '#8a8f98', marginTop: 2, display: 'inline-block',
                          }}>
                            {CATEGORY_LABELS[exercise.category]}
                          </span>
                        )}
                        {ex.coach_notes && (
                          <p style={{ fontSize: 11, color: '#62666d', marginTop: 4 }}>{ex.coach_notes}</p>
                        )}

                        {/* Mini diagram preview */}
                        {exercise?.diagram_data?.elements && exercise.diagram_data.elements.length > 0 && (
                          <div style={{ marginTop: 8, maxWidth: 200 }}>
                            <DrillPitchSVG mode="half" style={{ borderRadius: 4, opacity: 0.7 }}>
                              {exercise!.diagram_data.elements.slice(0, 15).map((el, i) => {
                                if (el.type === 'player') return <circle key={i} cx={el.x} cy={el.y} r={6} fill="#22c55e" opacity={0.8} />
                                if (el.type === 'opponent') return <circle key={i} cx={el.x} cy={el.y} r={6} fill="#ef4444" opacity={0.8} />
                                if (el.type === 'ball') return <circle key={i} cx={el.x} cy={el.y} r={4} fill="#f59e0b" />
                                return null
                              })}
                            </DrillPitchSVG>
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
