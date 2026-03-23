'use client'

import { Check, Save, Users, Target, Clock, TrendingUp, Cloud, Leaf } from 'lucide-react'
import type { WizardState, TacticalApproach } from '@/lib/match-notes-types'
import { TACTICAL_LABELS, EVENT_LABELS, PHASE_LABELS, WEATHER_OPTIONS, PITCH_CONDITION_OPTIONS } from '@/lib/match-notes-types'
import RatingSlider from './RatingSlider'

const TACTICAL_OPTIONS: { value: TacticalApproach; emoji: string }[] = [
  { value: 'possession', emoji: '🎯' },
  { value: 'counter', emoji: '⚡' },
  { value: 'high-press', emoji: '🔥' },
  { value: 'low-block', emoji: '🛡️' },
]

const PHASE_KEYS = ['phase_attack', 'phase_defense', 'phase_transition_atk', 'phase_transition_def', 'phase_set_pieces'] as const

export default function StepSummary({
  state,
  onChange,
  onSave,
  saving,
}: {
  state: WizardState
  onChange: (summary: WizardState['summary']) => void
  onSave: (status: 'draft' | 'completed') => void
  saving: boolean
}) {
  const summary = state.summary
  const update = (partial: Partial<WizardState['summary']>) => {
    onChange({ ...summary, ...partial })
  }

  const goalsFor = state.events.filter((e) => e.event_type === 'goal' && e.goal_type !== 'own_goal' && !e.is_opponent).length
  const goalsAgainst = state.events.filter((e) => e.event_type === 'goal' && (e.goal_type === 'own_goal' || e.is_opponent)).length
  const starters = state.lineups.filter((l) => l.is_starter && l.player_name).length
  const totalEvents = state.events.length
  const shotsOnTarget = state.events.filter(e => e.event_type === 'shot_on_target' && !e.is_opponent).length
  const shotsTotal = state.events.filter(e => ['shot_on_target', 'shot_off_target', 'shot_woodwork'].includes(e.event_type) && !e.is_opponent).length
  const playerNames = state.lineups.filter(l => l.player_name && l.attendance === 'present').map(l => l.player_name)

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Resum i analisi tactic</h2>
      <p className="text-sm text-slate-400 mb-6">
        Completa l&apos;analisi del partit amb estadistiques, valoracio tactica i notes.
      </p>

      {/* Match summary cards */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="glass-card rounded-xl p-3 text-center">
          <Target size={14} className="text-green-400 mx-auto mb-1" />
          <p className="text-lg font-black text-white">{goalsFor} - {goalsAgainst}</p>
          <p className="text-[10px] text-slate-500">Resultat</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <Users size={14} className="text-cyan-400 mx-auto mb-1" />
          <p className="text-lg font-black text-white">{starters}</p>
          <p className="text-[10px] text-slate-500">Titulars</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <Clock size={14} className="text-amber-400 mx-auto mb-1" />
          <p className="text-lg font-black text-white">{totalEvents}</p>
          <p className="text-[10px] text-slate-500">Events</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <TrendingUp size={14} className="text-emerald-400 mx-auto mb-1" />
          <p className="text-lg font-black text-white">{shotsTotal > 0 ? `${shotsOnTarget}/${shotsTotal}` : '-'}</p>
          <p className="text-[10px] text-slate-500">Tirs/Porta</p>
        </div>
      </div>

      {/* Formation & info */}
      <div className="glass-card rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-500">Formacio</span>
          <span className="text-sm font-bold text-white">{state.formation || '-'}</span>
          <span className="text-xs text-slate-500 ml-4">Oponent</span>
          <span className="text-sm font-bold text-white">{state.matchData?.opponent || '-'}</span>
        </div>
      </div>

      {/* Half-time score */}
      <div className="mb-5">
        <label className="text-xs text-slate-400 mb-2 block">Resultat descans</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="20"
            placeholder="0"
            value={summary.half_time_score_for ?? ''}
            onChange={(e) => update({ half_time_score_for: e.target.value ? parseInt(e.target.value) : null })}
            className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm text-center focus:outline-none focus:border-green-500/50"
          />
          <span className="text-slate-500">-</span>
          <input
            type="number"
            min="0"
            max="20"
            placeholder="0"
            value={summary.half_time_score_against ?? ''}
            onChange={(e) => update({ half_time_score_against: e.target.value ? parseInt(e.target.value) : null })}
            className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm text-center focus:outline-none focus:border-green-500/50"
          />
        </div>
      </div>

      {/* Team stats grid */}
      <div className="mb-6">
        <label className="text-xs text-slate-400 mb-3 block">Estadistiques d&apos;equip</label>
        <div className="grid grid-cols-2 gap-3">
          {/* Possession */}
          <div className="glass-card rounded-xl p-3">
            <p className="text-[10px] text-slate-500 mb-1">Possessio estimada</p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={summary.possession_estimate ?? 50}
                onChange={(e) => update({ possession_estimate: parseInt(e.target.value) })}
                className="flex-1 accent-green-500"
              />
              <span className="text-sm font-bold text-white w-10 text-right">{summary.possession_estimate ?? 50}%</span>
            </div>
          </div>

          {/* Shots */}
          <div className="glass-card rounded-xl p-3">
            <p className="text-[10px] text-slate-500 mb-1">Tirs totals</p>
            <div className="flex items-center gap-1">
              <input type="number" min="0" placeholder="Nosaltres" value={summary.shots_for ?? ''} onChange={(e) => update({ shots_for: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-green-500/50" />
              <span className="text-slate-600 text-xs">-</span>
              <input type="number" min="0" placeholder="Rival" value={summary.shots_against ?? ''} onChange={(e) => update({ shots_against: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-green-500/50" />
            </div>
          </div>

          {/* Corners */}
          <div className="glass-card rounded-xl p-3">
            <p className="text-[10px] text-slate-500 mb-1">Corners</p>
            <div className="flex items-center gap-1">
              <input type="number" min="0" placeholder="A favor" value={summary.corners_for ?? ''} onChange={(e) => update({ corners_for: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-green-500/50" />
              <span className="text-slate-600 text-xs">-</span>
              <input type="number" min="0" placeholder="Contra" value={summary.corners_against ?? ''} onChange={(e) => update({ corners_against: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-green-500/50" />
            </div>
          </div>

          {/* Fouls */}
          <div className="glass-card rounded-xl p-3">
            <p className="text-[10px] text-slate-500 mb-1">Faltes</p>
            <div className="flex items-center gap-1">
              <input type="number" min="0" placeholder="Comeses" value={summary.fouls_for ?? ''} onChange={(e) => update({ fouls_for: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-green-500/50" />
              <span className="text-slate-600 text-xs">-</span>
              <input type="number" min="0" placeholder="Rebudes" value={summary.fouls_against ?? ''} onChange={(e) => update({ fouls_against: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-green-500/50" />
            </div>
          </div>

          {/* Offsides */}
          <div className="glass-card rounded-xl p-3">
            <p className="text-[10px] text-slate-500 mb-1">Fores de joc</p>
            <div className="flex items-center gap-1">
              <input type="number" min="0" placeholder="Nosaltres" value={summary.offsides_for ?? ''} onChange={(e) => update({ offsides_for: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-green-500/50" />
              <span className="text-slate-600 text-xs">-</span>
              <input type="number" min="0" placeholder="Rival" value={summary.offsides_against ?? ''} onChange={(e) => update({ offsides_against: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-green-500/50" />
            </div>
          </div>

          {/* Saves */}
          <div className="glass-card rounded-xl p-3">
            <p className="text-[10px] text-slate-500 mb-1">Parades del porter</p>
            <input type="number" min="0" placeholder="0" value={summary.saves ?? ''} onChange={(e) => update({ saves: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center focus:outline-none focus:border-green-500/50" />
          </div>
        </div>
      </div>

      {/* Captain selector */}
      <div className="mb-5">
        <label className="text-xs text-slate-400 mb-1 block">Capita del partit</label>
        <select
          value={summary.captain || ''}
          onChange={(e) => update({ captain: e.target.value || null })}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-green-500/50"
        >
          <option value="">Selecciona...</option>
          {playerNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* Weather & Pitch */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1">
            <Cloud size={11} /> Temps
          </label>
          <div className="flex flex-wrap gap-1">
            {WEATHER_OPTIONS.map((w) => (
              <button
                key={w.value}
                onClick={() => update({ weather: summary.weather === w.value ? null : w.value })}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  summary.weather === w.value
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : 'bg-white/3 text-slate-500 border border-transparent hover:bg-white/5'
                }`}
              >
                {w.emoji} {w.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1">
            <Leaf size={11} /> Camp
          </label>
          <div className="flex gap-1">
            {PITCH_CONDITION_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => update({ pitch_condition: summary.pitch_condition === p.value ? null : p.value })}
                className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  summary.pitch_condition === p.value
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/3 text-slate-500 border border-transparent hover:bg-white/5'
                }`}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overall match rating */}
      <div className="mb-6">
        <label className="text-xs text-slate-400 mb-2 block">Valoracio global del partit</label>
        <RatingSlider
          value={summary.overall_rating || 6}
          onChange={(v) => update({ overall_rating: v })}
        />
      </div>

      {/* Phase-of-play ratings */}
      <div className="mb-6">
        <label className="text-xs text-slate-400 mb-3 block">Valoracio per fases de joc (1-5)</label>
        <div className="space-y-2">
          {PHASE_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-slate-300 w-36">{PHASE_LABELS[key]}</span>
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4, 5].map((v) => {
                  const val = (summary[key] as number | null) ?? 0
                  return (
                    <button
                      key={v}
                      onClick={() => update({ [key]: v } as any)}
                      className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                        val >= v
                          ? v <= 2 ? 'bg-red-500/20 text-red-400'
                            : v === 3 ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-green-500/20 text-green-400'
                          : 'bg-white/3 text-slate-600'
                      }`}
                    >
                      {v}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tactical approach */}
      <div className="mb-6">
        <label className="text-xs text-slate-400 mb-2 block">Enfocament tactic</label>
        <div className="grid grid-cols-2 gap-2">
          {TACTICAL_OPTIONS.map(({ value, emoji }) => (
            <button
              key={value}
              onClick={() => update({ tactical_approach: value })}
              className={`flex items-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                summary.tactical_approach === value
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : 'bg-white/3 text-slate-500 border border-white/8 hover:bg-white/5'
              }`}
            >
              <span>{emoji}</span>
              {TACTICAL_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      {/* Key moments */}
      <div className="mb-5">
        <label className="text-xs text-slate-400 mb-1.5 block">Moments clau</label>
        <textarea
          placeholder="Minut 23: gran combinacio per la banda esquerra que va acabar en gol..."
          value={summary.key_moments}
          onChange={(e) => update({ key_moments: e.target.value })}
          rows={3}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500/50 resize-none"
        />
        {state.events.length > 0 && !summary.key_moments && (
          <div className="mt-2 flex flex-wrap gap-1">
            {state.events.filter(e => ['goal', 'red_card', 'injury'].includes(e.event_type)).slice(0, 5).map((e, i) => (
              <button
                key={i}
                onClick={() =>
                  update({
                    key_moments: summary.key_moments +
                      `${summary.key_moments ? '\n' : ''}${e.minute}': ${EVENT_LABELS[e.event_type]} - ${e.player_name}`,
                  })
                }
                className="text-[10px] px-2 py-0.5 bg-white/5 text-slate-500 rounded hover:text-white transition-colors"
              >
                {e.minute}&apos; {EVENT_LABELS[e.event_type]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Opponent analysis */}
      <div className="mb-5">
        <label className="text-xs text-slate-400 mb-1.5 block">Analisi del rival</label>
        <textarea
          placeholder="El rival va sortir amb un 4-4-2 molt replegat, buscant transicions rapides..."
          value={summary.opponent_analysis}
          onChange={(e) => update({ opponent_analysis: e.target.value })}
          rows={3}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500/50 resize-none"
        />
      </div>

      {/* Areas to improve */}
      <div className="mb-5">
        <label className="text-xs text-slate-400 mb-1.5 block">Arees de millora</label>
        <textarea
          placeholder="Cal millorar la sortida de pilota des del darrere..."
          value={summary.areas_to_improve}
          onChange={(e) => update({ areas_to_improve: e.target.value })}
          rows={3}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500/50 resize-none"
        />
      </div>

      {/* Training focus */}
      <div className="mb-8">
        <label className="text-xs text-slate-400 mb-1.5 block">Focus d&apos;entrenament per la setmana vinent</label>
        <textarea
          placeholder="Treballar la sortida de pilota, pressing alt i rematades de falta..."
          value={summary.training_focus}
          onChange={(e) => update({ training_focus: e.target.value })}
          rows={2}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500/50 resize-none"
        />
      </div>

      {/* Save buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onSave('draft')}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-slate-400 text-sm rounded-xl hover:bg-white/10 transition-all disabled:opacity-30"
        >
          <Save size={14} />
          Desar esborrany
        </button>
        <button
          onClick={() => onSave('completed')}
          disabled={saving}
          className="flex-[2] flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-30"
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
      </div>
    </div>
  )
}
