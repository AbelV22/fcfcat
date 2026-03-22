'use client'

import { useState } from 'react'
import {
  Plus, X, Target, ArrowRightLeft, AlertTriangle,
  Zap, Circle, Trash2,
} from 'lucide-react'
import type { MatchNoteEvent, MatchNoteLineup, EventType, GoalType } from '@/lib/match-notes-types'
import { EVENT_LABELS, GOAL_TYPE_LABELS } from '@/lib/match-notes-types'
import EventTimeline from './EventTimeline'

type EventEntry = Omit<MatchNoteEvent, 'id' | 'match_note_id'>
type LineupEntry = Omit<MatchNoteLineup, 'id' | 'match_note_id'>

const EVENT_ICONS: Record<EventType, typeof Target> = {
  goal: Target,
  assist: Zap,
  pre_assist: Circle,
  yellow_card: AlertTriangle,
  red_card: AlertTriangle,
  substitution: ArrowRightLeft,
  injury: AlertTriangle,
}

const EVENT_COLORS: Record<EventType, string> = {
  goal: 'green',
  assist: 'cyan',
  pre_assist: 'purple',
  yellow_card: 'yellow',
  red_card: 'red',
  substitution: 'orange',
  injury: 'rose',
}

const GOAL_TYPES: GoalType[] = ['right_foot', 'left_foot', 'header', 'penalty', 'free_kick', 'own_goal']
const EVENT_TYPES: EventType[] = ['goal', 'assist', 'pre_assist', 'yellow_card', 'red_card', 'substitution', 'injury']

export default function StepEvents({
  lineups,
  events,
  onChange,
}: {
  lineups: LineupEntry[]
  events: EventEntry[]
  onChange: (events: EventEntry[]) => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState<EventEntry>({
    event_type: 'goal',
    minute: 1,
    player_name: '',
    secondary_player: null,
    goal_type: null,
    note: null,
  })

  const playerNames = lineups
    .filter((l) => l.player_name && l.attendance === 'present')
    .map((l) => l.player_name)

  function openNew(minute?: number) {
    setForm({
      event_type: 'goal',
      minute: minute ?? 1,
      player_name: playerNames[0] || '',
      secondary_player: null,
      goal_type: null,
      note: null,
    })
    setEditIndex(null)
    setShowModal(true)
  }

  function openEdit(index: number) {
    setForm({ ...events[index] })
    setEditIndex(index)
    setShowModal(true)
  }

  function saveEvent() {
    if (!form.player_name) return
    const updated = [...events]
    if (editIndex !== null) {
      updated[editIndex] = form
    } else {
      updated.push(form)
    }
    updated.sort((a, b) => a.minute - b.minute)
    onChange(updated)
    setShowModal(false)
  }

  function deleteEvent(index: number) {
    onChange(events.filter((_, i) => i !== index))
  }

  // Auto-calculate goals
  const goalsFor = events.filter((e) => e.event_type === 'goal' && e.goal_type !== 'own_goal').length
  const goalsAgainst = events.filter((e) => e.event_type === 'goal' && e.goal_type === 'own_goal').length

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Esdeveniments del partit</h2>
      <p className="text-sm text-slate-400 mb-2">
        Toca la línia de temps o el botó + per afegir esdeveniments.
      </p>

      {/* Score display */}
      <div className="flex items-center justify-center gap-4 mb-5 py-3">
        <span className="text-3xl font-black text-green-400">{goalsFor}</span>
        <span className="text-sm text-slate-600">—</span>
        <span className="text-3xl font-black text-red-400">{goalsAgainst}</span>
      </div>

      {/* Timeline */}
      <div className="glass-card rounded-xl p-3 mb-4">
        <EventTimeline events={events} onSelectMinute={(m) => openNew(m)} />
      </div>

      {/* Events list */}
      <div className="space-y-2 mb-4">
        {events.map((evt, i) => {
          const color = EVENT_COLORS[evt.event_type]
          const Icon = EVENT_ICONS[evt.event_type]
          return (
            <div
              key={i}
              className="flex items-center gap-3 py-2.5 px-3 bg-white/3 rounded-xl border border-white/5 group"
            >
              <span className="text-xs font-mono text-slate-500 w-7 text-right shrink-0">
                {evt.minute}&apos;
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-${color}-500/15`}
                style={{ backgroundColor: `color-mix(in srgb, var(--color-${color}-500, #22c55e) 15%, transparent)` }}
              >
                <Icon size={13} style={{ color: `var(--color-${color}-400, #4ade80)` }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {evt.player_name}
                  {evt.secondary_player && (
                    <span className="text-slate-500 font-normal"> → {evt.secondary_player}</span>
                  )}
                </p>
                <p className="text-[10px] text-slate-500">
                  {EVENT_LABELS[evt.event_type]}
                  {evt.goal_type && ` · ${GOAL_TYPE_LABELS[evt.goal_type]}`}
                  {evt.note && ` · ${evt.note}`}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(i)} className="text-slate-500 hover:text-white p-1">
                  <Circle size={12} />
                </button>
                <button onClick={() => deleteEvent(i)} className="text-slate-500 hover:text-red-400 p-1">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add button */}
      <button
        onClick={() => openNew()}
        className="w-full py-3 border border-dashed border-white/15 rounded-xl text-sm text-slate-400 hover:text-white hover:border-green-500/30 transition-all flex items-center justify-center gap-2"
      >
        <Plus size={14} />
        Afegir esdeveniment
      </button>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/8">
              <h3 className="font-bold text-white text-sm">
                {editIndex !== null ? 'Editar' : 'Nou'} esdeveniment
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Event type grid */}
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Tipus</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {EVENT_TYPES.map((type) => {
                    const Icon = EVENT_ICONS[type]
                    const color = EVENT_COLORS[type]
                    const active = form.event_type === type
                    return (
                      <button
                        key={type}
                        onClick={() => setForm({ ...form, event_type: type, goal_type: type === 'goal' ? 'right_foot' : null })}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] font-medium transition-all ${
                          active
                            ? `bg-${color}-500/15 border border-${color}-500/30`
                            : 'bg-white/3 border border-transparent hover:bg-white/5'
                        }`}
                        style={active ? {
                          backgroundColor: `color-mix(in srgb, var(--color-${color}-500, #22c55e) 15%, transparent)`,
                          borderColor: `color-mix(in srgb, var(--color-${color}-500, #22c55e) 30%, transparent)`,
                        } : undefined}
                      >
                        <Icon size={14} style={{ color: active ? `var(--color-${color}-400, #4ade80)` : '#64748b' }} />
                        <span className={active ? 'text-white' : 'text-slate-500'}>
                          {EVENT_LABELS[type].split(' ')[0]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Minute */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Minut</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="95"
                    value={form.minute}
                    onChange={(e) => setForm({ ...form, minute: parseInt(e.target.value) })}
                    className="flex-1 accent-green-500"
                  />
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={form.minute}
                    onChange={(e) => setForm({ ...form, minute: parseInt(e.target.value) || 0 })}
                    className="w-16 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm text-center focus:outline-none focus:border-green-500/50"
                  />
                </div>
              </div>

              {/* Player */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Jugador</label>
                <select
                  value={form.player_name}
                  onChange={(e) => setForm({ ...form, player_name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-green-500/50"
                >
                  <option value="">Selecciona...</option>
                  {playerNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Goal type (if goal) */}
              {form.event_type === 'goal' && (
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Tipus de gol</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {GOAL_TYPES.map((gt) => (
                      <button
                        key={gt}
                        onClick={() => setForm({ ...form, goal_type: gt })}
                        className={`py-2 rounded-lg text-[10px] font-medium transition-all ${
                          form.goal_type === gt
                            ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                            : 'bg-white/3 text-slate-500 border border-transparent hover:bg-white/5'
                        }`}
                      >
                        {GOAL_TYPE_LABELS[gt]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Secondary player (for subs, assists) */}
              {(form.event_type === 'substitution' || form.event_type === 'assist' || form.event_type === 'pre_assist') && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    {form.event_type === 'substitution' ? 'Jugador substituït' : 'Golejador'}
                  </label>
                  <select
                    value={form.secondary_player || ''}
                    onChange={(e) => setForm({ ...form, secondary_player: e.target.value || null })}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-green-500/50"
                  >
                    <option value="">Selecciona...</option>
                    {playerNames.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nota (opcional)</label>
                <input
                  type="text"
                  placeholder="Detalls de l'acció..."
                  value={form.note || ''}
                  onChange={(e) => setForm({ ...form, note: e.target.value || null })}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500/50"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/8 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-400 text-sm rounded-xl hover:bg-white/10 transition-all"
              >
                Cancel·lar
              </button>
              <button
                onClick={saveEvent}
                disabled={!form.player_name}
                className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 disabled:opacity-30 text-white text-sm font-semibold rounded-xl transition-all"
              >
                {editIndex !== null ? 'Actualitzar' : 'Afegir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
