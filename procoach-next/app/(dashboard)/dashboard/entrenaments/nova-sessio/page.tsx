'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical,
  Clock, ChevronDown, ChevronUp, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchUserExercises, saveFullSession } from '@/lib/training-data'
import { fetchTeamPlayerNames } from '@/lib/match-notes-data'
import type {
  TrainingExercise, TrainingSessionExercise, TrainingAttendance,
  SessionType, Intensity, SessionPhase, FocusArea,
} from '@/lib/training-types'
import {
  SESSION_TYPE_LABELS, INTENSITY_LABELS, INTENSITY_COLORS,
  PHASE_LABELS, FOCUS_AREA_LABELS, CATEGORY_LABELS,
  ATTENDANCE_LABELS, ATTENDANCE_COLORS,
  formatDate,
} from '@/lib/training-types'
import ExerciseLibrary from '@/components/entrenaments/ExerciseLibrary'

const STORAGE_KEY = 'neoscout_training_session_draft'

interface ExerciseBlock {
  tempId: string
  exerciseId: string | null
  name: string
  phase: SessionPhase
  durationMin: number
  coachNotes: string
  intensity: Intensity
  exercise?: TrainingExercise
}

export default function NovaSessioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillDate = searchParams.get('date')
  const isGenerated = searchParams.get('generated') === 'true'

  const [title, setTitle] = useState('')
  const [sessionDate, setSessionDate] = useState(prefillDate || formatDate(new Date()))
  const [sessionType, setSessionType] = useState<SessionType>('mixed')
  const [plannedIntensity, setPlannedIntensity] = useState<Intensity>('medium')
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([])
  const [coachNotes, setCoachNotes] = useState('')
  const [exercises, setExercises] = useState<ExerciseBlock[]>([])
  const [generatedLoaded, setGeneratedLoaded] = useState(false)
  const [userExercises, setUserExercises] = useState<TrainingExercise[]>([])
  const [attendance, setAttendance] = useState<{ name: string; slug: string | null; status: string }[]>([])
  const [playerNames, setPlayerNames] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [addingToPhase, setAddingToPhase] = useState<SessionPhase>('main')
  const [expandedPhases, setExpandedPhases] = useState<Record<SessionPhase, boolean>>({ warmup: true, main: true, cooldown: true })

  // Load data
  useEffect(() => {
    async function load() {
      try {
        const [exs] = await Promise.allSettled([
          fetchUserExercises(),
        ])
        if (exs.status === 'fulfilled') setUserExercises(exs.value)

        // Get team slug for player names
        const club = document.cookie.split(';').find(c => c.trim().startsWith('ns_team_slug='))?.split('=')[1]?.trim()
        const comp = document.cookie.split(';').find(c => c.trim().startsWith('ns_competition='))?.split('=')[1]?.trim()
        if (club) {
          const players = await fetchTeamPlayerNames(decodeURIComponent(club), comp ? decodeURIComponent(comp) : null)
          setPlayerNames(players)
          setAttendance(players.map(p => ({ name: p, slug: null, status: 'present' })))
        }
      } catch (err) {
        console.error(err)
      }
    }
    load()
  }, [])

  // Load generated session from localStorage
  useEffect(() => {
    if (isGenerated && !generatedLoaded) {
      try {
        const raw = localStorage.getItem('neoscout_generated_session')
        if (raw) {
          const gen = JSON.parse(raw)
          if (gen.exercises) setExercises(gen.exercises)
          if (gen.plannedIntensity) setPlannedIntensity(gen.plannedIntensity)
          if (gen.sessionType) setSessionType(gen.sessionType)
          if (gen.title) setTitle(gen.title)
          if (gen.focusAreas) setFocusAreas(gen.focusAreas)
          if (gen.date) setSessionDate(gen.date)
          localStorage.removeItem('neoscout_generated_session')
        }
      } catch (err) {
        console.error('Error loading generated session:', err)
      }
      setGeneratedLoaded(true)
    }
  }, [isGenerated, generatedLoaded])

  // Auto-save draft
  useEffect(() => {
    const draft = { title, sessionDate, sessionType, plannedIntensity, focusAreas, coachNotes, exercises, attendance }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [title, sessionDate, sessionType, plannedIntensity, focusAreas, coachNotes, exercises, attendance])

  // Calculate totals
  const totalDuration = useMemo(() =>
    exercises.reduce((sum, e) => sum + e.durationMin, 0)
  , [exercises])

  const phaseExercises = useMemo(() => ({
    warmup: exercises.filter(e => e.phase === 'warmup'),
    main: exercises.filter(e => e.phase === 'main'),
    cooldown: exercises.filter(e => e.phase === 'cooldown'),
  }), [exercises])

  const handleAddExercise = useCallback((exercise: TrainingExercise) => {
    const block: ExerciseBlock = {
      tempId: Math.random().toString(36).substring(2, 9),
      exerciseId: exercise.id,
      name: exercise.name,
      phase: addingToPhase,
      durationMin: exercise.duration_min,
      coachNotes: '',
      intensity: exercise.intensity,
      exercise,
    }
    setExercises(prev => [...prev, block])
    setShowLibrary(false)
  }, [addingToPhase])

  const handleAddInline = useCallback((phase: SessionPhase) => {
    const block: ExerciseBlock = {
      tempId: Math.random().toString(36).substring(2, 9),
      exerciseId: null,
      name: '',
      phase,
      durationMin: 15,
      coachNotes: '',
      intensity: 'medium',
    }
    setExercises(prev => [...prev, block])
  }, [])

  const handleRemoveExercise = useCallback((tempId: string) => {
    setExercises(prev => prev.filter(e => e.tempId !== tempId))
  }, [])

  const handleUpdateExercise = useCallback((tempId: string, updates: Partial<ExerciseBlock>) => {
    setExercises(prev => prev.map(e => e.tempId === tempId ? { ...e, ...updates } : e))
  }, [])

  const toggleFocusArea = (area: FocusArea) => {
    setFocusAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])
  }

  const handleSave = async (status: 'planned' | 'completed' = 'planned') => {
    try {
      setSaving(true)
      let sortOrder = 0

      await saveFullSession({
        sessionId: null,
        session: {
          title: title.trim() || null,
          session_date: sessionDate,
          session_type: sessionType,
          duration_min: totalDuration || 90,
          planned_intensity: plannedIntensity,
          status,
          focus_areas: focusAreas,
          coach_notes: coachNotes.trim() || null,
        },
        exercises: exercises.map(e => ({
          exercise_id: e.exerciseId,
          sort_order: sortOrder++,
          phase: e.phase,
          duration_min: e.durationMin,
          coach_notes: e.coachNotes || null,
          player_groups: null,
          inline_name: e.exerciseId ? null : (e.name || null),
          inline_description: null,
          inline_diagram_data: null,
        })),
        attendance: attendance.map(a => ({
          player_name: a.name,
          player_slug: a.slug,
          status: a.status as 'present' | 'absent' | 'injured' | 'late' | 'modified',
          minutes_trained: null,
          intensity_override: null,
          notes: null,
        })),
      }, status)

      localStorage.removeItem(STORAGE_KEY)
      router.push('/dashboard/entrenaments')
    } catch (err) {
      console.error('Error saving session:', err)
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '16px 16px 32px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/dashboard/entrenaments" style={{ color: '#8a8f98' }}>
          <ArrowLeft size={18} />
        </Link>
        <h1 style={{
          fontFamily: 'var(--font-headline)', fontSize: 20, fontWeight: 800,
          color: '#f7f8f8', letterSpacing: '-0.5px', flex: 1,
        }}>
          Nova sessio
        </h1>
        <div style={{ fontSize: 13, color: '#8a8f98', fontFamily: 'var(--font-inter)' }}>
          <Clock size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
          {totalDuration} min
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }} className="session-builder-layout">
        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Session meta */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: 14,
          }}>
            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 8, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Data</label>
                <input type="text" value={sessionDate} onChange={e => setSessionDate(e.target.value)} style={inputStyle} placeholder="dd-mm-yyyy" />
              </div>
              <div>
                <label style={labelStyle}>Tipus</label>
                <select value={sessionType} onChange={e => setSessionType(e.target.value as SessionType)} style={inputStyle}>
                  {Object.entries(SESSION_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Intensitat</label>
                <select value={plannedIntensity} onChange={e => setPlannedIntensity(e.target.value as Intensity)} style={inputStyle}>
                  {Object.entries(INTENSITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Titol (opcional)</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="Ex: Sessio pre-partit J12" />
            </div>

            {/* Focus areas */}
            <div>
              <label style={labelStyle}>Focus</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {(Object.entries(FOCUS_AREA_LABELS) as [FocusArea, string][]).map(([k, v]) => {
                  const active = focusAreas.includes(k)
                  return (
                    <button
                      key={k}
                      onClick={() => toggleFocusArea(k)}
                      style={{
                        padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 510,
                        background: active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                        border: active ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        color: active ? '#22c55e' : '#8a8f98',
                        cursor: 'pointer', fontFamily: 'var(--font-inter)',
                      }}
                    >
                      {v}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Session timeline: 3 phases */}
          {(['warmup', 'main', 'cooldown'] as SessionPhase[]).map(phase => {
            const phaseExs = phaseExercises[phase]
            const phaseDuration = phaseExs.reduce((s, e) => s + e.durationMin, 0)
            const isExpanded = expandedPhases[phase]

            return (
              <div key={phase} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8, overflow: 'hidden',
              }}>
                {/* Phase header */}
                <button
                  onClick={() => setExpandedPhases(prev => ({ ...prev, [phase]: !prev[phase] }))}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                    cursor: 'pointer', color: '#d0d6e0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 510, fontFamily: 'var(--font-inter)' }}>
                      {PHASE_LABELS[phase]}
                    </span>
                    <span style={{ fontSize: 11, color: '#62666d' }}>
                      {phaseExs.length} ex. · {phaseDuration} min
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {isExpanded && (
                  <div style={{ padding: '0 14px 14px' }}>
                    {/* Exercise blocks */}
                    {phaseExs.map((block) => (
                      <div
                        key={block.tempId}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px', marginBottom: 4, borderRadius: 6,
                          background: 'rgba(255,255,255,0.02)',
                          borderLeft: `3px solid ${INTENSITY_COLORS[block.intensity] || '#8a8f98'}`,
                        }}
                      >
                        <GripVertical size={14} style={{ color: '#62666d', flexShrink: 0, cursor: 'grab' }} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {block.exerciseId ? (
                            <div style={{ fontSize: 12, fontWeight: 510, color: '#d0d6e0', fontFamily: 'var(--font-inter)' }}>
                              {block.name}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={block.name}
                              onChange={e => handleUpdateExercise(block.tempId, { name: e.target.value })}
                              placeholder="Nom de l'exercici..."
                              style={{ ...inputStyle, padding: '4px 6px', fontSize: 12, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                            />
                          )}
                          {block.exercise && (
                            <div style={{ fontSize: 10, color: '#62666d', marginTop: 1 }}>
                              {CATEGORY_LABELS[block.exercise.category]}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <input
                            type="number"
                            value={block.durationMin}
                            onChange={e => handleUpdateExercise(block.tempId, { durationMin: Number(e.target.value) })}
                            min={1} max={60}
                            style={{ ...inputStyle, width: 48, padding: '3px 4px', fontSize: 11, textAlign: 'center' }}
                          />
                          <span style={{ fontSize: 10, color: '#62666d' }}>min</span>
                          <button
                            onClick={() => handleRemoveExercise(block.tempId)}
                            style={{ background: 'none', border: 'none', color: '#62666d', cursor: 'pointer', padding: 2 }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add buttons */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button
                        onClick={() => { setAddingToPhase(phase); setShowLibrary(true) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 510,
                          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                          color: '#22c55e', cursor: 'pointer', fontFamily: 'var(--font-inter)',
                        }}
                      >
                        <Plus size={12} />
                        De biblioteca
                      </button>
                      <button
                        onClick={() => handleAddInline(phase)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 510,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                          color: '#8a8f98', cursor: 'pointer', fontFamily: 'var(--font-inter)',
                        }}
                      >
                        <Plus size={12} />
                        Manual
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Attendance */}
          {attendance.length > 0 && (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, padding: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h3 style={{ fontSize: 13, fontWeight: 510, color: '#d0d6e0', fontFamily: 'var(--font-inter)' }}>
                  Assistencia ({attendance.filter(a => a.status === 'present').length}/{attendance.length})
                </h3>
                <button
                  onClick={() => setAttendance(prev => prev.map(a => ({ ...a, status: 'present' })))}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11,
                    background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                    color: '#22c55e', cursor: 'pointer', fontWeight: 510,
                  }}
                >
                  Tots presents
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {attendance.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <span style={{ fontSize: 12, color: '#d0d6e0', flex: 1, fontFamily: 'var(--font-inter)', fontWeight: 510 }}>
                      {a.name}
                    </span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {(['present', 'absent', 'injured', 'late'] as const).map(status => {
                        const isActive = a.status === status
                        const color = ATTENDANCE_COLORS[status]
                        return (
                          <button
                            key={status}
                            onClick={() => setAttendance(prev => prev.map((p, j) => j === i ? { ...p, status } : p))}
                            style={{
                              padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 510,
                              background: isActive ? `${color}15` : 'transparent',
                              border: isActive ? `1px solid ${color}30` : '1px solid transparent',
                              color: isActive ? color : '#62666d',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            {ATTENDANCE_LABELS[status].substring(0, 3)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coach notes */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: 14,
          }}>
            <label style={labelStyle}>Notes de l'entrenador</label>
            <textarea
              value={coachNotes}
              onChange={e => setCoachNotes(e.target.value)}
              placeholder="Notes, observacions, variacions..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Save buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleSave('planned')}
              disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', background: '#22c55e', color: '#08090a',
                borderRadius: 6, fontWeight: 510, fontSize: 14, border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1, fontFamily: 'var(--font-inter)',
              }}
            >
              <Save size={16} />
              {saving ? 'Guardant...' : 'Guardar sessio'}
            </button>
            <button
              onClick={() => handleSave('completed')}
              disabled={saving}
              style={{
                padding: '10px 16px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6, color: '#8a8f98', fontSize: 13,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-inter)',
              }}
            >
              Guardar com completada
            </button>
          </div>
        </div>

        {/* Desktop sidebar: exercise library (hidden on mobile) */}
        <div className="hidden lg:block" style={{ width: 280, flexShrink: 0 }}>
          <div style={{
            position: 'sticky', top: 16,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: 12, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
          }}>
            <div style={{ fontSize: 12, fontWeight: 510, color: '#8a8f98', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Biblioteca
            </div>
            <ExerciseLibrary
              exercises={userExercises}
              onExercisesChange={setUserExercises}
              onSelectExercise={handleAddExercise}
              selectionMode
            />
          </div>
        </div>
      </div>

      {/* Mobile library bottom sheet */}
      {showLibrary && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} className="lg:hidden">
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowLibrary(false)} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: '#0f1011', borderTop: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px 12px 0 0', padding: 16,
            maxHeight: '70vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 510, color: '#f7f8f8' }}>
                Afegir a {PHASE_LABELS[addingToPhase]}
              </span>
              <button onClick={() => setShowLibrary(false)} style={{ background: 'none', border: 'none', color: '#8a8f98', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <ExerciseLibrary
              exercises={userExercises}
              onExercisesChange={setUserExercises}
              onSelectExercise={handleAddExercise}
              selectionMode
            />
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .session-builder-layout {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#62666d',
  textTransform: 'uppercase', letterSpacing: '0.04em',
  marginBottom: 4, fontWeight: 510,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 6, color: '#f7f8f8', fontSize: 13,
  fontFamily: 'var(--font-inter)', outline: 'none',
}
