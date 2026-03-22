'use client'

import { Check, Save, Users, Target, Clock } from 'lucide-react'
import type { WizardState, TacticalApproach } from '@/lib/match-notes-types'
import { TACTICAL_LABELS, EVENT_LABELS } from '@/lib/match-notes-types'
import RatingSlider from './RatingSlider'

const TACTICAL_OPTIONS: { value: TacticalApproach; emoji: string }[] = [
  { value: 'possession', emoji: '🎯' },
  { value: 'counter', emoji: '⚡' },
  { value: 'high-press', emoji: '🔥' },
  { value: 'low-block', emoji: '🛡️' },
]

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

  const goalsFor = state.events.filter((e) => e.event_type === 'goal' && e.goal_type !== 'own_goal').length
  const goalsAgainst = state.events.filter((e) => e.event_type === 'goal' && e.goal_type === 'own_goal').length
  const starters = state.lineups.filter((l) => l.is_starter && l.player_name).length
  const totalEvents = state.events.length
  const totalRatings = state.ratings.length

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Resum i notes tàctiques</h2>
      <p className="text-sm text-slate-400 mb-6">
        Revisa les dades i afegeix l&apos;anàlisi tàctica del partit.
      </p>

      {/* Match summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-6">
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
          <p className="text-[10px] text-slate-500">Esdeveniments</p>
        </div>
      </div>

      {/* Formation & info */}
      <div className="glass-card rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Formació</span>
          <span className="text-sm font-bold text-white">{state.formation || '—'}</span>
          <span className="text-xs text-slate-500 ml-4">Oponent</span>
          <span className="text-sm font-bold text-white">{state.matchData?.opponent || '—'}</span>
        </div>
      </div>

      {/* Overall match rating */}
      <div className="mb-6">
        <label className="text-xs text-slate-400 mb-2 block">Valoració global del partit</label>
        <RatingSlider
          value={summary.overall_rating || 6}
          onChange={(v) => update({ overall_rating: v })}
        />
      </div>

      {/* Tactical approach */}
      <div className="mb-6">
        <label className="text-xs text-slate-400 mb-2 block">Enfocament tàctic</label>
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
          placeholder="Minut 23: gran combinació per la banda esquerra que va acabar en gol..."
          value={summary.key_moments}
          onChange={(e) => update({ key_moments: e.target.value })}
          rows={3}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500/50 resize-none"
        />
        {/* Suggest events as key moments */}
        {state.events.length > 0 && !summary.key_moments && (
          <div className="mt-2 flex flex-wrap gap-1">
            {state.events.slice(0, 5).map((e, i) => (
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
        <label className="text-xs text-slate-400 mb-1.5 block">Anàlisi del rival</label>
        <textarea
          placeholder="El rival va sortir amb un 4-4-2 molt replegat, buscant transicions ràpides..."
          value={summary.opponent_analysis}
          onChange={(e) => update({ opponent_analysis: e.target.value })}
          rows={3}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500/50 resize-none"
        />
      </div>

      {/* Areas to improve */}
      <div className="mb-8">
        <label className="text-xs text-slate-400 mb-1.5 block">Àrees de millora</label>
        <textarea
          placeholder="Cal millorar la sortida de pilota des del darrere, massa imprecisions en la primera fase..."
          value={summary.areas_to_improve}
          onChange={(e) => update({ areas_to_improve: e.target.value })}
          rows={3}
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
