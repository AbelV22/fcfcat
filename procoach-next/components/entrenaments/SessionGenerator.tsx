'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles, X, Clock, Calendar, Target,
  ChevronRight, RefreshCw, Check, Zap,
} from 'lucide-react'
import type { TrainingExercise, FocusArea, Intensity, SessionPhase } from '@/lib/training-types'
import {
  INTENSITY_COLORS, INTENSITY_LABELS, PHASE_LABELS,
  FOCUS_AREA_LABELS, SESSION_TYPE_LABELS, formatDate,
} from '@/lib/training-types'
import {
  generateSession, SUB_FOCUS_OPTIONS,
  type GeneratedSession, type GeneratorInput,
} from '@/lib/training-generator'

interface Props {
  exercises: TrainingExercise[]
  onClose: () => void
  prefillDate?: string
}

type Step = 'duration' | 'matchday' | 'focus' | 'result'

const DURATION_OPTIONS = [60, 75, 90, 105, 120]
const MD_OPTIONS = [
  { value: -4, label: 'MD-4', desc: 'Carrega maxima' },
  { value: -3, label: 'MD-3', desc: 'Alta intensitat' },
  { value: -2, label: 'MD-2', desc: 'Tactic + pilota aturada' },
  { value: -1, label: 'MD-1', desc: 'Activacio' },
  { value: 1, label: 'MD+1', desc: 'Recuperacio' },
  { value: null, label: 'Sense partit', desc: 'Lliure' },
]

export default function SessionGenerator({ exercises, onClose, prefillDate }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('duration')
  const [durationMin, setDurationMin] = useState(90)
  const [matchDayDelta, setMatchDayDelta] = useState<number | null>(null)
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([])
  const [subFocus, setSubFocus] = useState<string[]>([])
  const [generated, setGenerated] = useState<GeneratedSession | null>(null)

  const availableSubFocus = useMemo(() =>
    SUB_FOCUS_OPTIONS.filter(sf => sf.parentFocus.some(pf => focusAreas.includes(pf)))
  , [focusAreas])

  const handleGenerate = useCallback(() => {
    const result = generateSession({
      durationMin,
      matchDayDelta,
      focusAreas,
      subFocus,
      exercises,
    })
    setGenerated(result)
    setStep('result')
  }, [durationMin, matchDayDelta, focusAreas, subFocus, exercises])

  const handleRegenerate = useCallback(() => {
    const result = generateSession({
      durationMin,
      matchDayDelta,
      focusAreas,
      subFocus,
      exercises,
    })
    setGenerated(result)
  }, [durationMin, matchDayDelta, focusAreas, subFocus, exercises])

  const handleAccept = useCallback(() => {
    if (!generated) return
    // Save to localStorage for nova-sessio to read
    localStorage.setItem('neoscout_generated_session', JSON.stringify({
      exercises: generated.exercises,
      plannedIntensity: generated.plannedIntensity,
      sessionType: generated.sessionType,
      title: generated.title,
      focusAreas: generated.focusAreas,
      date: prefillDate || formatDate(new Date()),
    }))
    router.push(`/dashboard/entrenaments/nova-sessio?generated=true&date=${prefillDate || formatDate(new Date())}`)
  }, [generated, router, prefillDate])

  const toggleFocus = (f: FocusArea) => {
    setFocusAreas(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }
  const toggleSubFocus = (s: string) => {
    setSubFocus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const canProceed = step === 'focus' ? focusAreas.length > 0 : true

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      {/* Modal */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 520,
        background: '#0f1011', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} style={{ color: '#22c55e' }} />
            <span style={{ fontSize: 15, fontWeight: 510, color: '#f7f8f8', fontFamily: 'var(--font-inter)' }}>
              Genera sessio
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#62666d', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0' }}>
          {(['duration', 'matchday', 'focus'] as Step[]).map((s, i) => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: (['duration', 'matchday', 'focus', 'result'].indexOf(step) >= i)
                ? '#22c55e' : 'rgba(255,255,255,0.06)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 16px 16px', minHeight: 280 }}>

          {/* Step 1: Duration */}
          {step === 'duration' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Clock size={18} style={{ color: '#8a8f98' }} />
                <h3 style={{ fontSize: 16, fontWeight: 510, color: '#f7f8f8' }}>Quant temps tens?</h3>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DURATION_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDurationMin(d)}
                    style={{
                      flex: '1 1 80px', padding: '16px 12px', borderRadius: 8,
                      background: durationMin === d ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                      border: durationMin === d ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      color: durationMin === d ? '#22c55e' : '#d0d6e0',
                      cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 24, fontWeight: 510, fontFamily: 'var(--font-inter)' }}>{d}</div>
                    <div style={{ fontSize: 11, color: '#8a8f98', marginTop: 2 }}>minuts</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Match Day */}
          {step === 'matchday' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Calendar size={18} style={{ color: '#8a8f98' }} />
                <h3 style={{ fontSize: 16, fontWeight: 510, color: '#f7f8f8' }}>Quan es el partit?</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {MD_OPTIONS.map(opt => {
                  const selected = matchDayDelta === opt.value
                  return (
                    <button
                      key={opt.label}
                      onClick={() => setMatchDayDelta(opt.value)}
                      style={{
                        padding: '14px 10px', borderRadius: 8, textAlign: 'center',
                        background: selected ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                        border: selected ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 510, color: selected ? '#22c55e' : '#d0d6e0' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: 10, color: '#62666d', marginTop: 3 }}>{opt.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: Focus */}
          {step === 'focus' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Target size={18} style={{ color: '#8a8f98' }} />
                <h3 style={{ fontSize: 16, fontWeight: 510, color: '#f7f8f8' }}>Quin focus?</h3>
              </div>

              {/* Main focus */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {(Object.entries(FOCUS_AREA_LABELS) as [FocusArea, string][]).map(([k, v]) => {
                  const active = focusAreas.includes(k)
                  return (
                    <button
                      key={k}
                      onClick={() => toggleFocus(k)}
                      style={{
                        padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 510,
                        background: active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
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

              {/* Sub-focus (contextual) */}
              {availableSubFocus.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 510, marginBottom: 8 }}>
                    Detalla el focus
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {availableSubFocus.map(sf => {
                      const active = subFocus.includes(sf.key)
                      return (
                        <button
                          key={sf.key}
                          onClick={() => toggleSubFocus(sf.key)}
                          style={{
                            padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 510,
                            background: active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                            border: active ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.04)',
                            color: active ? '#d0d6e0' : '#62666d',
                            cursor: 'pointer',
                          }}
                        >
                          {sf.label}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Result */}
          {step === 'result' && generated && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 510, color: '#f7f8f8', marginBottom: 2 }}>
                    {generated.title}
                  </h3>
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#8a8f98' }}>
                    <span>{durationMin} min</span>
                    <span>·</span>
                    <span style={{ color: INTENSITY_COLORS[generated.plannedIntensity] }}>
                      {INTENSITY_LABELS[generated.plannedIntensity]}
                    </span>
                    <span>·</span>
                    <span>{generated.exercises.length} exercicis</span>
                  </div>
                </div>
                <button
                  onClick={handleRegenerate}
                  title="Regenerar"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 510,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#8a8f98', cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={13} />
                  Altra opcio
                </button>
              </div>

              {/* Exercise list by phase */}
              <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(['warmup', 'main', 'cooldown'] as SessionPhase[]).map(phase => {
                  const phaseExs = generated.exercises.filter(e => e.phase === phase)
                  if (phaseExs.length === 0) return null
                  return (
                    <div key={phase}>
                      <div style={{ fontSize: 10, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 510, marginBottom: 4 }}>
                        {PHASE_LABELS[phase]} ({phaseExs.reduce((s, e) => s + e.durationMin, 0)} min)
                      </div>
                      {phaseExs.map(ex => (
                        <div key={ex.tempId} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '6px 8px', borderRadius: 4,
                          borderLeft: `3px solid ${INTENSITY_COLORS[ex.intensity]}`,
                          background: 'rgba(255,255,255,0.02)', marginBottom: 2,
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 510, color: '#d0d6e0', flex: 1 }}>{ex.name}</span>
                          <span style={{ fontSize: 11, color: '#62666d' }}>{ex.durationMin}min</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {step === 'duration' ? (
            <div />
          ) : step === 'result' ? (
            <button
              onClick={() => setStep('focus')}
              style={{
                padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 510,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                color: '#8a8f98', cursor: 'pointer',
              }}
            >
              Enrere
            </button>
          ) : (
            <button
              onClick={() => {
                if (step === 'matchday') setStep('duration')
                else if (step === 'focus') setStep('matchday')
              }}
              style={{
                padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 510,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                color: '#8a8f98', cursor: 'pointer',
              }}
            >
              Enrere
            </button>
          )}

          {step === 'result' ? (
            <button
              onClick={handleAccept}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 510,
                background: '#22c55e', color: '#08090a', border: 'none', cursor: 'pointer',
              }}
            >
              <Check size={15} />
              Acceptar i editar
            </button>
          ) : (
            <button
              onClick={() => {
                if (step === 'duration') setStep('matchday')
                else if (step === 'matchday') setStep('focus')
                else if (step === 'focus' && canProceed) handleGenerate()
              }}
              disabled={step === 'focus' && !canProceed}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 6, fontSize: 13, fontWeight: 510,
                background: (step === 'focus' && !canProceed) ? 'rgba(255,255,255,0.04)' : '#22c55e',
                color: (step === 'focus' && !canProceed) ? '#62666d' : '#08090a',
                border: 'none', cursor: (step === 'focus' && !canProceed) ? 'not-allowed' : 'pointer',
              }}
            >
              {step === 'focus' ? (
                <>
                  <Sparkles size={15} />
                  Generar
                </>
              ) : (
                <>
                  Seguent
                  <ChevronRight size={15} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
