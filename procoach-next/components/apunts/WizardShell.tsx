'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, ClipboardList, Save, Check, Zap } from 'lucide-react'
import type { WizardState } from '@/lib/match-notes-types'
import { saveFullMatchNote, fetchActaDataForMatch, actaToWizardEvents, actaToWizardLineups } from '@/lib/match-notes-data'
import StepSelectMatch from './StepSelectMatch'
import StepLineup from './StepLineup'
import StepEvents from './StepEvents'
import StepRatings from './StepRatings'
import StepSummary from './StepSummary'

const STORAGE_KEY = 'neoscout_match_note_draft'

const STEPS = [
  { label: 'Partit', short: 'Partit' },
  { label: 'Alineacio', short: 'Lineup' },
  { label: 'Esdeveniments', short: 'Events' },
  { label: 'Valoracions', short: 'Ratings' },
  { label: 'Resum', short: 'Resum' },
]

function getInitialState(): WizardState {
  return {
    step: 0,
    matchNoteId: null,
    matchData: null,
    formation: '4-3-3',
    lineups: [],
    events: [],
    ratings: [],
    summary: {
      overall_rating: null,
      tactical_approach: null,
      key_moments: '',
      opponent_analysis: '',
      areas_to_improve: '',
      training_focus: '',
      possession_estimate: null,
      corners_for: null,
      corners_against: null,
      fouls_for: null,
      fouls_against: null,
      offsides_for: null,
      offsides_against: null,
      shots_for: null,
      shots_against: null,
      saves: null,
      half_time_score_for: null,
      half_time_score_against: null,
      phase_attack: null,
      phase_defense: null,
      phase_transition_atk: null,
      phase_transition_def: null,
      phase_set_pieces: null,
      pitch_condition: null,
      weather: null,
      captain: null,
    },
    actaPrefilled: false,
  }
}

export default function WizardShell({
  clubName,
  teamSlug,
  editNoteId,
  prefill,
}: {
  clubName: string
  teamSlug: string
  editNoteId?: string
  prefill?: Partial<WizardState>
}) {
  const router = useRouter()
  const [state, setState] = useState<WizardState>(getInitialState)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingActa, setLoadingActa] = useState(false)

  // Load prefill or draft from localStorage on mount
  const prefillOpponent = prefill?.matchData?.opponent || null
  useEffect(() => {
    if (editNoteId) return

    if (prefill?.matchData) {
      setState((prev) => ({ ...prev, ...prefill }))
      return
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as WizardState
        setState(parsed)
      }
    } catch {
      // Ignore invalid draft
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editNoteId, prefillOpponent])

  // Auto-save to localStorage on every change
  useEffect(() => {
    if (editNoteId) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore storage errors
    }
  }, [state, editNoteId])

  const updateState = useCallback((partial: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...partial }))
  }, [])

  // Auto-load acta data when match is selected
  const tryLoadActa = useCallback(async (matchData: WizardState['matchData']) => {
    if (!matchData || !matchData.goals_for === undefined) return

    setLoadingActa(true)
    try {
      const isHome = matchData.is_home
      const homeTeam = isHome ? clubName : matchData.opponent
      const awayTeam = isHome ? matchData.opponent : clubName

      const acta = await fetchActaDataForMatch(
        homeTeam,
        awayTeam,
        matchData.jornada,
        matchData.match_date,
      )

      if (acta) {
        const events = actaToWizardEvents(acta, isHome)
        const hasLineups = (isHome ? acta.home_lineup : acta.away_lineup).length > 0

        setState((prev) => ({
          ...prev,
          events: events.length > 0 ? events : prev.events,
          lineups: hasLineups ? actaToWizardLineups(acta, isHome, prev.formation || '4-3-3') : prev.lineups,
          actaPrefilled: events.length > 0 || hasLineups,
        }))
      }
    } catch (err) {
      console.warn('Could not load acta data:', err)
    } finally {
      setLoadingActa(false)
    }
  }, [clubName])

  const canAdvance = () => {
    if (state.step === 0) return !!state.matchData
    return true
  }

  const goNext = () => {
    if (state.step < STEPS.length - 1 && canAdvance()) {
      // When advancing from step 0 (match selection), try to load acta
      if (state.step === 0 && state.matchData && !state.actaPrefilled) {
        tryLoadActa(state.matchData)
      }
      updateState({ step: state.step + 1 })
    }
  }

  const goBack = () => {
    if (state.step > 0) {
      updateState({ step: state.step - 1 })
    }
  }

  const handleSave = async (status: 'draft' | 'completed') => {
    if (!state.matchData) return
    setSaving(true)
    try {
      // Auto-calculate goals from events
      const goalsFor = state.events.filter((e) => e.event_type === 'goal' && e.goal_type !== 'own_goal' && !e.is_opponent).length
      const goalsAgainst = state.events.filter((e) => e.event_type === 'goal' && (e.goal_type === 'own_goal' || e.is_opponent)).length
      const matchData = {
        ...state.matchData,
        goals_for: state.matchData.goals_for ?? goalsFor,
        goals_against: state.matchData.goals_against ?? goalsAgainst,
      }

      await saveFullMatchNote(
        {
          matchNoteId: state.matchNoteId,
          matchData,
          formation: state.formation,
          lineups: state.lineups,
          events: state.events,
          ratings: state.ratings,
          summary: state.summary,
        },
        status
      )

      // Clear draft
      localStorage.removeItem(STORAGE_KEY)
      setSaved(true)
      setTimeout(() => router.push('/dashboard/apunts'), 1000)
    } catch (err) {
      console.error('Error saving match note:', err)
      alert('Error desant els apunts. Torna-ho a intentar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <header className="border-b border-white/8 bg-[#0a1628]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard/apunts')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} />
            Apunts
          </button>
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-green-400" />
            <span className="text-sm font-semibold text-white">Nous apunts</span>
            {loadingActa && (
              <div className="flex items-center gap-1 text-amber-400">
                <Zap size={12} className="animate-pulse" />
                <span className="text-[10px]">Carregant acta...</span>
              </div>
            )}
          </div>
          <button
            onClick={() => handleSave('draft')}
            disabled={saving || !state.matchData}
            className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors flex items-center gap-1"
          >
            <Save size={12} />
            Esborrany
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex-1 flex items-center gap-1">
              <button
                onClick={() => i <= state.step && updateState({ step: i })}
                className={`flex items-center gap-1.5 text-xs font-medium transition-all ${
                  i === state.step
                    ? 'text-white'
                    : i < state.step
                    ? 'text-green-400 cursor-pointer'
                    : 'text-slate-600 cursor-default'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                    i === state.step
                      ? 'bg-gradient-to-r from-green-500 to-cyan-500 text-white'
                      : i < state.step
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-white/5 text-slate-600 border border-white/10'
                  }`}
                >
                  {i < state.step ? <Check size={12} /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px ${i < state.step ? 'bg-green-500/40' : 'bg-white/8'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {saved ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check size={32} className="text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Apunts desats!</h2>
            <p className="text-slate-400 text-sm">Redirigint al panell d&apos;apunts...</p>
          </div>
        ) : (
          <>
            {state.step === 0 && (
              <StepSelectMatch
                clubName={clubName}
                value={state.matchData}
                onChange={(matchData) => updateState({ matchData })}
              />
            )}
            {state.step === 1 && (
              <StepLineup
                teamSlug={teamSlug}
                formation={state.formation || '4-3-3'}
                lineups={state.lineups}
                onFormationChange={(formation) => updateState({ formation })}
                onLineupsChange={(lineups) => updateState({ lineups })}
              />
            )}
            {state.step === 2 && (
              <StepEvents
                lineups={state.lineups}
                events={state.events}
                onChange={(events) => updateState({ events })}
              />
            )}
            {state.step === 3 && (
              <StepRatings
                lineups={state.lineups}
                events={state.events}
                ratings={state.ratings}
                onChange={(ratings) => updateState({ ratings })}
              />
            )}
            {state.step === 4 && (
              <StepSummary
                state={state}
                onChange={(summary) => updateState({ summary })}
                onSave={handleSave}
                saving={saving}
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/8">
              <button
                onClick={goBack}
                disabled={state.step === 0}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors rounded-xl hover:bg-white/5"
              >
                <ArrowLeft size={16} />
                Anterior
              </button>

              {state.step < STEPS.length - 1 ? (
                <button
                  onClick={goNext}
                  disabled={!canAdvance()}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 disabled:opacity-30 rounded-xl transition-all"
                >
                  Seguent
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={() => handleSave('completed')}
                  disabled={saving || !state.matchData}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 disabled:opacity-30 rounded-xl transition-all"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Desant...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Desar apunts
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
