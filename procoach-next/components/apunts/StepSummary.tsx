'use client'

import { useState } from 'react'
import {
  Check, Save, Users, Target, Clock, TrendingUp, Cloud, Leaf,
  ChevronDown, Crosshair, Waypoints, Shield, Flag, Hand as GloveIcon, Minus, Plus, Zap,
} from 'lucide-react'
import type { WizardState, TacticalApproach } from '@/lib/match-notes-types'
import { TACTICAL_LABELS, EVENT_LABELS, PHASE_LABELS, WEATHER_OPTIONS, PITCH_CONDITION_OPTIONS } from '@/lib/match-notes-types'
import { computeAutoStats } from '@/lib/match-stats-utils'
import RatingSlider from './RatingSlider'

const TACTICAL_OPTIONS: { value: TacticalApproach; emoji: string }[] = [
  { value: 'possession', emoji: '🎯' },
  { value: 'counter', emoji: '⚡' },
  { value: 'high-press', emoji: '🔥' },
  { value: 'low-block', emoji: '🛡️' },
]

const PHASE_KEYS = ['phase_attack', 'phase_defense', 'phase_transition_atk', 'phase_transition_def', 'phase_set_pieces'] as const

// ─── Stepper Component ───────────────────────────────────
function StatStepper({ value, onChange, label }: { value: number | null; onChange: (v: number | null) => void; label?: string }) {
  const v = value ?? 0
  return (
    <div className="flex items-center gap-1">
      {label && <span className="text-[9px] text-slate-500 w-16 shrink-0">{label}</span>}
      <button
        onClick={() => onChange(Math.max(0, v - 1))}
        className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"
      >
        <Minus size={12} />
      </button>
      <span className="w-8 text-center text-sm font-bold text-white">{v}</span>
      <button
        onClick={() => onChange(v + 1)}
        className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}

function ForAgainstStepper({
  forValue, againstValue, onForChange, onAgainstChange, label,
}: {
  forValue: number | null; againstValue: number | null
  onForChange: (v: number | null) => void; onAgainstChange: (v: number | null) => void
  label: string
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-slate-300 flex-1">{label}</span>
      <div className="flex items-center gap-3">
        <StatStepper value={forValue} onChange={onForChange} />
        <span className="text-[10px] text-slate-600">vs</span>
        <StatStepper value={againstValue} onChange={onAgainstChange} />
      </div>
    </div>
  )
}

function AutoStatRow({ label, forVal, againstVal }: { label: string; forVal: number; againstVal?: number }) {
  const max = Math.max(forVal, againstVal ?? 0, 1)
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-300 flex-1">{label}</span>
      <div className="flex items-center gap-2">
        {againstVal !== undefined ? (
          <>
            <div className="w-16 flex justify-end">
              <div className="h-4 rounded-l bg-green-500/30 flex items-center justify-end px-1" style={{ width: `${(forVal / max) * 100}%`, minWidth: forVal > 0 ? '16px' : '0' }}>
                <span className="text-[10px] font-bold text-green-300">{forVal}</span>
              </div>
            </div>
            <div className="w-16 flex justify-start">
              <div className="h-4 rounded-r bg-red-500/20 flex items-center px-1" style={{ width: `${((againstVal) / max) * 100}%`, minWidth: againstVal > 0 ? '16px' : '0' }}>
                <span className="text-[10px] font-bold text-red-300">{againstVal}</span>
              </div>
            </div>
          </>
        ) : (
          <span className="text-sm font-bold text-white">{forVal}</span>
        )}
        <span className="text-[8px] text-cyan-500/50 w-7 text-right">auto</span>
      </div>
    </div>
  )
}

// ─── Collapsible Section ─────────────────────────────────
function StatSection({
  title, icon: Icon, iconColor, children, defaultOpen = false,
}: {
  title: string; icon: typeof Target; iconColor: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-white/3 hover:bg-white/5 transition-colors"
      >
        <Icon size={14} style={{ color: iconColor }} />
        <span className="text-xs font-semibold text-white flex-1 text-left">{title}</span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 py-3 space-y-1 border-t border-white/5">{children}</div>}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────
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

  const auto = computeAutoStats(state.events)
  const starters = state.lineups.filter((l) => l.is_starter && l.player_name).length
  const totalEvents = state.events.length
  const playerNames = state.lineups.filter(l => l.player_name && l.attendance === 'present').map(l => l.player_name)
  const actaPlayerNames = state.actaPlayers || []
  const allPlayers = playerNames.length > 0 ? playerNames : actaPlayerNames

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Resum i estadistiques</h2>
      <p className="text-sm text-slate-400 mb-5">
        Les estadistiques dels esdeveniments es calculen automaticament. Afegeix les que falten.
      </p>

      {/* ─── Match summary cards ─── */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <div className="glass-card rounded-xl p-3 text-center">
          <Target size={14} className="text-green-400 mx-auto mb-1" />
          <p className="text-lg font-black text-white">{auto.goals_total_for} - {auto.goals_total_against}</p>
          <p className="text-[10px] text-slate-500">Resultat</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <Clock size={14} className="text-amber-400 mx-auto mb-1" />
          <p className="text-sm font-black text-white">
            {auto.goals_1h_for}-{auto.goals_1h_against}
            <span className="text-[9px] text-slate-500 font-normal"> / </span>
            {auto.goals_2h_for}-{auto.goals_2h_against}
          </p>
          <p className="text-[10px] text-slate-500">1a / 2a part</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <Crosshair size={14} className="text-emerald-400 mx-auto mb-1" />
          <p className="text-lg font-black text-white">{auto.shots_on_target_for + auto.shots_off_target_for + auto.shots_woodwork_for}</p>
          <p className="text-[10px] text-slate-500">Tirs totals</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <TrendingUp size={14} className="text-cyan-400 mx-auto mb-1" />
          <p className="text-lg font-black text-white">{totalEvents}</p>
          <p className="text-[10px] text-slate-500">Events</p>
        </div>
      </div>

      {/* ─── Half-time score ─── */}
      <div className="mb-5">
        <label className="text-xs text-slate-400 mb-2 block">Resultat descans</label>
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" max="20" placeholder="0"
            value={summary.half_time_score_for ?? ''}
            onChange={(e) => update({ half_time_score_for: e.target.value ? parseInt(e.target.value) : null })}
            className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm text-center focus:outline-none focus:border-green-500/50"
          />
          <span className="text-slate-500">-</span>
          <input
            type="number" min="0" max="20" placeholder="0"
            value={summary.half_time_score_against ?? ''}
            onChange={(e) => update({ half_time_score_against: e.target.value ? parseInt(e.target.value) : null })}
            className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm text-center focus:outline-none focus:border-green-500/50"
          />
        </div>
      </div>

      {/* ─── Stat Sections ─── */}

      {/* ATAC */}
      <StatSection title="Atac" icon={Crosshair} iconColor="#4ade80" defaultOpen>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] text-slate-600 uppercase tracking-wider">Nosaltres</span>
          <span className="text-[9px] text-slate-600 uppercase tracking-wider">Rival</span>
        </div>
        <AutoStatRow label="Gols 1a part" forVal={auto.goals_1h_for} againstVal={auto.goals_1h_against} />
        <AutoStatRow label="Gols 2a part" forVal={auto.goals_2h_for} againstVal={auto.goals_2h_against} />
        <AutoStatRow label="Tirs a porta" forVal={auto.shots_on_target_for} againstVal={auto.shots_on_target_against} />
        <AutoStatRow label="Tirs fora" forVal={auto.shots_off_target_for} againstVal={auto.shots_off_target_against} />
        <AutoStatRow label="Tirs al pal" forVal={auto.shots_woodwork_for} againstVal={auto.shots_woodwork_against} />
        <div className="border-t border-white/5 pt-2 mt-2">
          <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Manual</p>
          <ForAgainstStepper label="Tirs totals" forValue={summary.shots_for} againstValue={summary.shots_against} onForChange={(v) => update({ shots_for: v })} onAgainstChange={(v) => update({ shots_against: v })} />
          <ForAgainstStepper label="Tirs bloquejats" forValue={summary.shots_blocked_for} againstValue={summary.shots_blocked_against} onForChange={(v) => update({ shots_blocked_for: v })} onAgainstChange={(v) => update({ shots_blocked_against: v })} />
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-300 flex-1">Regates</span>
            <div className="flex items-center gap-2">
              <StatStepper value={summary.dribbles_completed} onChange={(v) => update({ dribbles_completed: v })} label="Ok" />
              <span className="text-[10px] text-slate-600">/</span>
              <StatStepper value={summary.dribbles_attempted} onChange={(v) => update({ dribbles_attempted: v })} label="Tot" />
            </div>
          </div>
        </div>
      </StatSection>

      {/* DISTRIBUCIO */}
      <StatSection title="Distribucio" icon={Waypoints} iconColor="#06b6d4">
        <AutoStatRow label="Centrades" forVal={auto.crosses_for} againstVal={auto.crosses_against} />
        <AutoStatRow label="Ocasions creades" forVal={auto.chances_created} />
        <AutoStatRow label="Assistencies" forVal={auto.assists} />
        <AutoStatRow label="Pre-assistencies" forVal={auto.pre_assists} />
        <AutoStatRow label="Passades clau" forVal={auto.accurate_passes} />
        <div className="border-t border-white/5 pt-2 mt-2">
          <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Manual</p>
          <ForAgainstStepper label="Passades totals" forValue={summary.total_passes_for} againstValue={summary.total_passes_against} onForChange={(v) => update({ total_passes_for: v })} onAgainstChange={(v) => update({ total_passes_against: v })} />
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-300 flex-1">Precisio passada</span>
            <div className="flex items-center gap-2">
              <input
                type="range" min="0" max="100"
                value={summary.pass_accuracy ?? 70}
                onChange={(e) => update({ pass_accuracy: parseInt(e.target.value) })}
                className="w-24 accent-cyan-500"
              />
              <span className="text-xs font-bold text-white w-10 text-right">{summary.pass_accuracy ?? 70}%</span>
            </div>
          </div>
        </div>
      </StatSection>

      {/* DEFENSA */}
      <StatSection title="Defensa" icon={Shield} iconColor="#f59e0b">
        <AutoStatRow label="Recuperacions" forVal={auto.recoveries} />
        <AutoStatRow label="Perdues" forVal={auto.turnovers} />
        <AutoStatRow label="Duels guanyats" forVal={auto.duels_won} againstVal={auto.duels_lost} />
        <div className="border-t border-white/5 pt-2 mt-2">
          <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Manual</p>
          <ForAgainstStepper label="Entrades" forValue={summary.tackles_for} againstValue={summary.tackles_against} onForChange={(v) => update({ tackles_for: v })} onAgainstChange={(v) => update({ tackles_against: v })} />
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-300 flex-1">Despejos</span>
            <StatStepper value={summary.clearances} onChange={(v) => update({ clearances: v })} />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-300 flex-1">Duels aeris</span>
            <div className="flex items-center gap-2">
              <StatStepper value={summary.aerial_duels_won} onChange={(v) => update({ aerial_duels_won: v })} label="W" />
              <span className="text-[10px] text-slate-600">/</span>
              <StatStepper value={summary.aerial_duels_lost} onChange={(v) => update({ aerial_duels_lost: v })} label="L" />
            </div>
          </div>
        </div>
      </StatSection>

      {/* PILOTA ATURADA & DISCIPLINA */}
      <StatSection title="Pilota aturada i disciplina" icon={Flag} iconColor="#0ea5e9">
        <AutoStatRow label="Corners" forVal={auto.corners_for} againstVal={auto.corners_against} />
        <AutoStatRow label="Fores de joc" forVal={auto.offsides_for} againstVal={auto.offsides_against} />
        <AutoStatRow label="Faltes comeses" forVal={auto.fouls_committed} />
        <AutoStatRow label="Faltes rebudes" forVal={auto.fouls_suffered} />
        <AutoStatRow label="Targetes grogues" forVal={auto.yellow_cards_for} againstVal={auto.yellow_cards_against} />
        <AutoStatRow label="Targetes vermelles" forVal={auto.red_cards_for} againstVal={auto.red_cards_against} />
        <div className="border-t border-white/5 pt-2 mt-2">
          <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Manual</p>
          <ForAgainstStepper label="Corners (override)" forValue={summary.corners_for} againstValue={summary.corners_against} onForChange={(v) => update({ corners_for: v })} onAgainstChange={(v) => update({ corners_against: v })} />
          <ForAgainstStepper label="Faltes (override)" forValue={summary.fouls_for} againstValue={summary.fouls_against} onForChange={(v) => update({ fouls_for: v })} onAgainstChange={(v) => update({ fouls_against: v })} />
          <ForAgainstStepper label="Saques de banda" forValue={summary.throw_ins_for} againstValue={summary.throw_ins_against} onForChange={(v) => update({ throw_ins_for: v })} onAgainstChange={(v) => update({ throw_ins_against: v })} />
          <ForAgainstStepper label="Saques de porta" forValue={summary.goal_kicks_for} againstValue={summary.goal_kicks_against} onForChange={(v) => update({ goal_kicks_for: v })} onAgainstChange={(v) => update({ goal_kicks_against: v })} />
          <ForAgainstStepper label="Penals" forValue={summary.penalties_for} againstValue={summary.penalties_against} onForChange={(v) => update({ penalties_for: v })} onAgainstChange={(v) => update({ penalties_against: v })} />
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-300 flex-1">Penals marcats / aturats</span>
            <div className="flex items-center gap-2">
              <StatStepper value={summary.penalties_scored} onChange={(v) => update({ penalties_scored: v })} label="Gol" />
              <StatStepper value={summary.penalties_saved} onChange={(v) => update({ penalties_saved: v })} label="Aturat" />
            </div>
          </div>
        </div>
      </StatSection>

      {/* PORTERIA */}
      <StatSection title="Porteria" icon={GloveIcon} iconColor="#14b8a6">
        <AutoStatRow label="Gols encaixats" forVal={auto.goals_total_against} />
        <AutoStatRow label="Parades (events)" forVal={auto.saves_from_events} />
        <div className="border-t border-white/5 pt-2 mt-2">
          <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Manual</p>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-300 flex-1">Parades totals</span>
            <StatStepper value={summary.saves} onChange={(v) => update({ saves: v })} />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-slate-300 flex-1">Sortides per alt</span>
            <StatStepper value={summary.high_claims} onChange={(v) => update({ high_claims: v })} />
          </div>
        </div>
      </StatSection>

      {/* ─── Captain, Weather, Pitch ─── */}
      <div className="mb-5">
        <label className="text-xs text-slate-400 mb-1 block">Capita del partit</label>
        <select
          value={summary.captain || ''}
          onChange={(e) => update({ captain: e.target.value || null })}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-green-500/50"
        >
          <option value="">Selecciona...</option>
          {allPlayers.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

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

      {/* ─── Overall rating ─── */}
      <div className="mb-6">
        <label className="text-xs text-slate-400 mb-2 block">Valoracio global del partit</label>
        <RatingSlider
          value={summary.overall_rating || 6}
          onChange={(v) => update({ overall_rating: v })}
        />
      </div>

      {/* ─── Phase ratings ─── */}
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

      {/* ─── Tactical approach ─── */}
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

      {/* ─── Text notes ─── */}
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

      {/* ─── Save buttons ─── */}
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
