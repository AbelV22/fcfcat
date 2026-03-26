'use client'

import { useState } from 'react'
import {
  Plus, X, Target, ArrowRightLeft, AlertTriangle,
  Zap, Circle, Trash2, Flag, Shield, Hand, Eye, Crosshair,
  ShieldCheck, TrendingDown, Swords, Waypoints, User,
} from 'lucide-react'
import type { MatchNoteEvent, MatchNoteLineup, EventType, GoalType, GoalOrigin, ShotZone } from '@/lib/match-notes-types'
import { EVENT_LABELS, GOAL_TYPE_LABELS, GOAL_ORIGIN_LABELS, EVENT_CATEGORIES } from '@/lib/match-notes-types'
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
  shot_on_target: Crosshair,
  shot_off_target: Crosshair,
  shot_woodwork: Crosshair,
  corner: Flag,
  foul_committed: Hand,
  foul_suffered: Hand,
  save: Shield,
  offside: Eye,
  chance_created: Zap,
  recovery: ShieldCheck,
  turnover: TrendingDown,
  duel_won: Swords,
  duel_lost: Swords,
  accurate_pass: Waypoints,
  cross: Waypoints,
}

const EVENT_COLORS: Record<EventType, string> = {
  goal: 'green',
  assist: 'cyan',
  pre_assist: 'purple',
  yellow_card: 'yellow',
  red_card: 'red',
  substitution: 'orange',
  injury: 'rose',
  shot_on_target: 'emerald',
  shot_off_target: 'slate',
  shot_woodwork: 'amber',
  corner: 'sky',
  foul_committed: 'rose',
  foul_suffered: 'indigo',
  save: 'teal',
  offside: 'violet',
  chance_created: 'lime',
  recovery: 'emerald',
  turnover: 'red',
  duel_won: 'green',
  duel_lost: 'rose',
  accurate_pass: 'cyan',
  cross: 'sky',
}

const GOAL_TYPES: GoalType[] = ['right_foot', 'left_foot', 'header', 'penalty', 'free_kick', 'own_goal']
const GOAL_ORIGINS: GoalOrigin[] = ['open_play', 'corner', 'free_kick', 'penalty', 'throw_in', 'counter_attack']
const SHOT_ZONES: ShotZone[] = ['inside_box', 'outside_box']
const SHOT_ZONE_LABELS: Record<ShotZone, string> = { inside_box: 'Dins area', outside_box: 'Fora area' }

// Which events need a player selector
const NEEDS_PLAYER: EventType[] = ['goal', 'assist', 'pre_assist', 'yellow_card', 'red_card', 'substitution', 'injury', 'shot_on_target', 'shot_off_target', 'shot_woodwork', 'foul_committed', 'foul_suffered', 'save', 'chance_created', 'recovery', 'turnover', 'duel_won', 'duel_lost', 'accurate_pass', 'cross']
// Which events are quick-counter (no player needed, just tally)
const QUICK_COUNTER: EventType[] = ['corner', 'offside']
// Individual stats — always quick-add with selected player, no modal
const INDIVIDUAL_STATS: EventType[] = ['recovery', 'turnover', 'duel_won', 'duel_lost', 'accurate_pass', 'cross']

const CATEGORY_LABELS: Record<string, string> = {
  key: 'Clau',
  discipline: 'Disciplina',
  shots: 'Tirs',
  other: 'Altres',
  individual: 'Individual',
}

export default function StepEvents({
  lineups,
  events,
  onChange,
  actaPlayers = [],
}: {
  lineups: LineupEntry[]
  events: EventEntry[]
  onChange: (events: EventEntry[]) => void
  actaPlayers?: string[]
}) {
  const [showModal, setShowModal] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('key')
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'events' | 'playerStats'>('events')
  const [statsPlayer, setStatsPlayer] = useState<string | null>(null)
  const [form, setForm] = useState<EventEntry>({
    event_type: 'goal',
    minute: 1,
    player_name: '',
    secondary_player: null,
    goal_type: null,
    goal_origin: null,
    shot_zone: null,
    note: null,
    is_opponent: false,
  })

  // Use lineup players if available, otherwise fall back to actaPlayers
  const lineupPlayers = lineups
    .filter((l) => l.player_name && l.attendance === 'present')
    .map((l) => l.player_name)
  const playerNames = lineupPlayers.length > 0 ? lineupPlayers : actaPlayers

  // Split acta players into starters and bench for display
  const starterCount = lineups.filter((l) => l.is_starter && l.player_name).length
  const actaStarters = actaPlayers.slice(0, Math.max(starterCount, 11))
  const actaBench = actaPlayers.slice(Math.max(starterCount, 11))

  function openNew(minute?: number, eventType?: EventType, playerName?: string) {
    setForm({
      event_type: eventType || 'goal',
      minute: minute ?? 1,
      player_name: playerName || selectedPlayer || '',
      secondary_player: null,
      goal_type: eventType === 'goal' ? 'right_foot' : null,
      goal_origin: eventType === 'goal' ? 'open_play' : null,
      shot_zone: null,
      note: null,
      is_opponent: false,
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
    if (NEEDS_PLAYER.includes(form.event_type) && !form.player_name) return
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

  function quickAdd(type: EventType, isOpponent: boolean = false) {
    const evt: EventEntry = {
      event_type: type,
      minute: 0,
      player_name: '',
      secondary_player: null,
      goal_type: null,
      goal_origin: null,
      shot_zone: null,
      note: null,
      is_opponent: isOpponent,
    }
    onChange([...events, evt])
  }

  function deleteEvent(index: number) {
    onChange(events.filter((_, i) => i !== index))
  }

  // Auto-calculate goals
  const goalsFor = events.filter((e) => e.event_type === 'goal' && e.goal_type !== 'own_goal' && !e.is_opponent).length
  const goalsAgainst = events.filter((e) => e.event_type === 'goal' && (e.goal_type === 'own_goal' || e.is_opponent)).length

  // Quick stats
  const shotsOnTarget = events.filter((e) => e.event_type === 'shot_on_target' && !e.is_opponent).length
  const shotsOffTarget = events.filter((e) => e.event_type === 'shot_off_target' && !e.is_opponent).length
  const cornersFor = events.filter((e) => e.event_type === 'corner' && !e.is_opponent).length
  const cornersAgainst = events.filter((e) => e.event_type === 'corner' && e.is_opponent).length
  const foulsCommitted = events.filter((e) => e.event_type === 'foul_committed').length
  const savesCount = events.filter((e) => e.event_type === 'save').length

  // Pre-filled events indicator
  const prefilledCount = events.filter((e) => e.note?.includes('Pre-carregat')).length

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Esdeveniments del partit</h2>
      <p className="text-sm text-slate-400 mb-3">
        Afegeix els esdeveniments clau i estadistiques del partit.
      </p>

      {/* View mode toggle */}
      <div className="flex gap-1 mb-4 p-1 bg-white/3 rounded-xl border border-white/5">
        <button
          onClick={() => setViewMode('events')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'events'
              ? 'bg-white/10 text-white'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Flag size={12} />
          Esdeveniments
        </button>
        <button
          onClick={() => setViewMode('playerStats')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'playerStats'
              ? 'bg-white/10 text-white'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <User size={12} />
          Stats individuals
        </button>
      </div>

      {prefilledCount > 0 && viewMode === 'events' && (
        <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
          <Zap size={13} className="text-amber-400 shrink-0" />
          <span className="text-xs text-amber-300">
            {prefilledCount} esdeveniments pre-carregats des de l&apos;acta FCF. Pots editar-los o afegir-ne mes.
          </span>
        </div>
      )}

      {/* Player quick-pick chips */}
      {playerNames.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
            Selecciona jugador i després l&apos;esdeveniment
          </p>
          {/* Starters */}
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {(lineupPlayers.length > 0 ? lineupPlayers.filter((_, i) => lineups[i]?.is_starter) : actaStarters).map((name) => {
              const isSelected = selectedPlayer === name
              const playerEventCount = events.filter((e) => e.player_name === name && !e.is_opponent).length
              return (
                <button
                  key={name}
                  onClick={() => setSelectedPlayer(isSelected ? null : name)}
                  className={`relative inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'bg-green-500/20 text-green-300 border border-green-500/40 ring-1 ring-green-500/20'
                      : 'bg-white/5 text-slate-300 border border-white/8 hover:border-white/20 hover:bg-white/8'
                  }`}
                >
                  {name.split(' ')[0]}
                  {playerEventCount > 0 && (
                    <span className={`text-[9px] font-bold px-1 rounded-full ${
                      isSelected ? 'bg-green-500/30 text-green-300' : 'bg-white/10 text-slate-500'
                    }`}>
                      {playerEventCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {/* Bench */}
          {(lineupPlayers.length > 0 ? lineupPlayers.filter((_, i) => !lineups[i]?.is_starter) : actaBench).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(lineupPlayers.length > 0
                ? lineupPlayers.filter((_, i) => !lineups[i]?.is_starter)
                : actaBench
              ).map((name) => {
                const isSelected = selectedPlayer === name
                const playerEventCount = events.filter((e) => e.player_name === name && !e.is_opponent).length
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedPlayer(isSelected ? null : name)}
                    className={`relative inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'bg-green-500/20 text-green-300 border border-green-500/40 ring-1 ring-green-500/20'
                        : 'bg-white/3 text-slate-500 border border-dashed border-white/8 hover:border-white/15 hover:text-slate-300'
                    }`}
                  >
                    {name.split(' ')[0]}
                    {playerEventCount > 0 && (
                      <span className={`text-[9px] font-bold px-1 rounded-full ${
                        isSelected ? 'bg-green-500/30 text-green-300' : 'bg-white/10 text-slate-500'
                      }`}>
                        {playerEventCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
          {selectedPlayer && (
            <div className="mt-2 px-2 py-1.5 bg-green-500/8 border border-green-500/15 rounded-lg flex items-center gap-2">
              <span className="text-[10px] text-green-400">
                Jugador actiu: <strong>{selectedPlayer}</strong> — toca un esdeveniment per registrar-lo
              </span>
              <button onClick={() => setSelectedPlayer(null)} className="text-green-400/60 hover:text-green-300 ml-auto">
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Score display */}
      <div className="flex items-center justify-center gap-4 mb-4 py-3">
        <span className="text-3xl font-black text-green-400">{goalsFor}</span>
        <span className="text-sm text-slate-600">-</span>
        <span className="text-3xl font-black text-red-400">{goalsAgainst}</span>
      </div>

      {/* Quick stats band */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <div className="text-center p-2 bg-white/3 rounded-lg">
          <p className="text-xs font-bold text-white">{shotsOnTarget + shotsOffTarget}</p>
          <p className="text-[9px] text-slate-500">Tirs</p>
        </div>
        <div className="text-center p-2 bg-white/3 rounded-lg">
          <p className="text-xs font-bold text-white">{cornersFor}</p>
          <p className="text-[9px] text-slate-500">Corners</p>
        </div>
        <div className="text-center p-2 bg-white/3 rounded-lg">
          <p className="text-xs font-bold text-white">{foulsCommitted}</p>
          <p className="text-[9px] text-slate-500">Faltes</p>
        </div>
        <div className="text-center p-2 bg-white/3 rounded-lg">
          <p className="text-xs font-bold text-white">{savesCount}</p>
          <p className="text-[9px] text-slate-500">Parades</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card rounded-xl p-3 mb-4">
        <EventTimeline events={events} onSelectMinute={(m) => openNew(m)} />
      </div>

      {viewMode === 'events' && (<>
      {/* Quick counter buttons (corners, offsides) */}
      <div className="mb-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Comptador rapid</p>
        <div className="grid grid-cols-2 gap-2">
          {/* Corners */}
          <div className="flex items-center gap-2 p-2 bg-white/3 rounded-xl border border-white/5">
            <Flag size={12} className="text-sky-400 shrink-0" />
            <span className="text-xs text-white flex-1">Corners</span>
            <div className="flex items-center gap-1">
              <button onClick={() => quickAdd('corner', false)} className="w-6 h-6 rounded bg-green-500/15 text-green-400 text-xs font-bold hover:bg-green-500/25 transition-colors">+</button>
              <span className="text-xs text-white font-bold w-8 text-center">{cornersFor}-{cornersAgainst}</span>
              <button onClick={() => quickAdd('corner', true)} className="w-6 h-6 rounded bg-red-500/15 text-red-400 text-xs font-bold hover:bg-red-500/25 transition-colors">+</button>
            </div>
          </div>
          {/* Offsides */}
          <div className="flex items-center gap-2 p-2 bg-white/3 rounded-xl border border-white/5">
            <Eye size={12} className="text-violet-400 shrink-0" />
            <span className="text-xs text-white flex-1">Fores de joc</span>
            <div className="flex items-center gap-1">
              <button onClick={() => quickAdd('offside', false)} className="w-6 h-6 rounded bg-green-500/15 text-green-400 text-xs font-bold hover:bg-green-500/25 transition-colors">+</button>
              <span className="text-xs text-white font-bold w-8 text-center">
                {events.filter((e) => e.event_type === 'offside' && !e.is_opponent).length}
                -
                {events.filter((e) => e.event_type === 'offside' && e.is_opponent).length}
              </span>
              <button onClick={() => quickAdd('offside', true)} className="w-6 h-6 rounded bg-red-500/15 text-red-400 text-xs font-bold hover:bg-red-500/25 transition-colors">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Category tabs for adding events */}
      <div className="flex gap-1 mb-3">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              activeCategory === key
                ? 'bg-white/10 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Quick-add buttons for active category */}
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        {(EVENT_CATEGORIES[activeCategory as keyof typeof EVENT_CATEGORIES] || []).map((type) => {
          const Icon = EVENT_ICONS[type]
          const color = EVENT_COLORS[type]
          return (
            <button
              key={type}
              onClick={() => {
                if (QUICK_COUNTER.includes(type)) {
                  quickAdd(type)
                } else if (selectedPlayer && NEEDS_PLAYER.includes(type) && type !== 'goal' && type !== 'substitution') {
                  // Quick-add with selected player (no modal needed for simple events)
                  const evt: EventEntry = {
                    event_type: type,
                    minute: 0,
                    player_name: selectedPlayer,
                    secondary_player: null,
                    goal_type: null,
                    goal_origin: null,
                    shot_zone: ['shot_on_target', 'shot_off_target', 'shot_woodwork'].includes(type) ? 'inside_box' : null,
                    note: null,
                    is_opponent: false,
                  }
                  const updated = [...events, evt].sort((a, b) => a.minute - b.minute)
                  onChange(updated)
                } else {
                  openNew(undefined, type, selectedPlayer || undefined)
                }
              }}
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all ${
                selectedPlayer && NEEDS_PLAYER.includes(type) && !QUICK_COUNTER.includes(type)
                  ? 'bg-green-500/5 border-green-500/15 hover:border-green-500/30 hover:bg-green-500/10'
                  : 'bg-white/3 border-white/5 hover:border-white/15 hover:bg-white/5'
              }`}
            >
              <Icon size={14} style={{ color: `var(--color-${color}-400, #4ade80)` }} />
              <span className="text-[9px] text-slate-400 font-medium text-center leading-tight">
                {EVENT_LABELS[type]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Events list */}
      <div className="space-y-2 mb-4">
        {events.filter(e => !QUICK_COUNTER.includes(e.event_type) || e.player_name).map((evt, i) => {
          const realIndex = events.indexOf(evt)
          const color = EVENT_COLORS[evt.event_type]
          const Icon = EVENT_ICONS[evt.event_type]
          return (
            <div
              key={i}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border group ${
                evt.note?.includes('Pre-carregat')
                  ? 'bg-amber-500/5 border-amber-500/10'
                  : 'bg-white/3 border-white/5'
              }`}
            >
              <span className="text-xs font-mono text-slate-500 w-7 text-right shrink-0">
                {evt.minute > 0 ? `${evt.minute}'` : ''}
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0`}
                style={{ backgroundColor: `color-mix(in srgb, var(--color-${color}-500, #22c55e) 15%, transparent)` }}
              >
                <Icon size={13} style={{ color: `var(--color-${color}-400, #4ade80)` }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {evt.player_name || EVENT_LABELS[evt.event_type]}
                  {evt.secondary_player && (
                    <span className="text-slate-500 font-normal"> → {evt.secondary_player}</span>
                  )}
                  {evt.is_opponent && (
                    <span className="text-red-400 font-normal text-[10px]"> (rival)</span>
                  )}
                </p>
                <p className="text-[10px] text-slate-500">
                  {EVENT_LABELS[evt.event_type]}
                  {evt.goal_type && ` · ${GOAL_TYPE_LABELS[evt.goal_type]}`}
                  {evt.goal_origin && ` · ${GOAL_ORIGIN_LABELS[evt.goal_origin]}`}
                  {evt.shot_zone && ` · ${SHOT_ZONE_LABELS[evt.shot_zone]}`}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(realIndex)} className="text-slate-500 hover:text-white p-1">
                  <Circle size={12} />
                </button>
                <button onClick={() => deleteEvent(realIndex)} className="text-slate-500 hover:text-red-400 p-1">
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
      </>)}

      {/* ─── Player Stats Panel ─────────────────────────────── */}
      {viewMode === 'playerStats' && (
        <div>
          {playerNames.length === 0 ? (
            <div className="text-center py-12">
              <User size={24} className="text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">
                Cap jugador disponible. Selecciona un partit amb acta.
              </p>
            </div>
          ) : (
            <>
              {/* Player list */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {playerNames.map((name) => {
                  const isActive = statsPlayer === name
                  const playerIndividualCount = events.filter(
                    (e) => e.player_name === name && INDIVIDUAL_STATS.includes(e.event_type)
                  ).length
                  return (
                    <button
                      key={name}
                      onClick={() => setStatsPlayer(isActive ? null : name)}
                      className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 ring-1 ring-cyan-500/20'
                          : 'bg-white/5 text-slate-300 border border-white/8 hover:border-white/20 hover:bg-white/8'
                      }`}
                    >
                      {name.split(' ')[0]}
                      {playerIndividualCount > 0 && (
                        <span className={`text-[9px] font-bold px-1 rounded-full ${
                          isActive ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/10 text-slate-500'
                        }`}>
                          {playerIndividualCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Selected player stats */}
              {statsPlayer ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/15 flex items-center justify-center">
                      <User size={14} className="text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{statsPlayer}</p>
                      <p className="text-[10px] text-slate-500">Toca per sumar, mantingues per restar</p>
                    </div>
                  </div>

                  {/* Stat counters grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {INDIVIDUAL_STATS.map((type) => {
                      const Icon = EVENT_ICONS[type]
                      const color = EVENT_COLORS[type]
                      const count = events.filter(
                        (e) => e.player_name === statsPlayer && e.event_type === type && !e.is_opponent
                      ).length
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            const evt: EventEntry = {
                              event_type: type,
                              minute: 0,
                              player_name: statsPlayer,
                              secondary_player: null,
                              goal_type: null,
                              goal_origin: null,
                              shot_zone: null,
                              note: null,
                              is_opponent: false,
                            }
                            onChange([...events, evt])
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            // Remove last event of this type for this player
                            const idx = [...events].reverse().findIndex(
                              (ev) => ev.player_name === statsPlayer && ev.event_type === type && !ev.is_opponent
                            )
                            if (idx >= 0) {
                              const realIdx = events.length - 1 - idx
                              onChange(events.filter((_, i) => i !== realIdx))
                            }
                          }}
                          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-white/3 border border-white/5 hover:border-white/15 hover:bg-white/8 transition-all active:scale-95"
                        >
                          <Icon size={16} style={{ color: `var(--color-${color}-400, #4ade80)` }} />
                          <span className="text-[9px] text-slate-400 font-medium text-center leading-tight">
                            {EVENT_LABELS[type]}
                          </span>
                          <span
                            className="text-lg font-black"
                            style={{ color: count > 0 ? `var(--color-${color}-400, #4ade80)` : '#334155' }}
                          >
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Also show key events for this player */}
                  {(() => {
                    const keyEvents = events.filter(
                      (e) => e.player_name === statsPlayer && !INDIVIDUAL_STATS.includes(e.event_type) && !QUICK_COUNTER.includes(e.event_type) && !e.is_opponent
                    )
                    if (keyEvents.length === 0) return null
                    return (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Esdeveniments clau</p>
                        <div className="flex flex-wrap gap-1.5">
                          {keyEvents.map((e, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/5"
                            >
                              {e.minute > 0 ? `${e.minute}' ` : ''}{EVENT_LABELS[e.event_type]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Quick add key events for this player */}
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Afegir esdeveniment</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['shot_on_target', 'shot_off_target', 'foul_committed', 'foul_suffered', 'chance_created', 'save', 'assist', 'pre_assist'] as EventType[]).map((type) => {
                        const Icon = EVENT_ICONS[type]
                        const color = EVENT_COLORS[type]
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              if (type === 'goal' || type === 'substitution') {
                                openNew(undefined, type, statsPlayer)
                              } else {
                                const evt: EventEntry = {
                                  event_type: type,
                                  minute: 0,
                                  player_name: statsPlayer,
                                  secondary_player: null,
                                  goal_type: null,
                                  goal_origin: null,
                                  shot_zone: ['shot_on_target', 'shot_off_target', 'shot_woodwork'].includes(type) ? 'inside_box' : null,
                                  note: null,
                                  is_opponent: false,
                                }
                                onChange([...events, evt])
                              }
                            }}
                            className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl bg-white/3 border border-white/5 hover:border-white/15 hover:bg-white/5 transition-all"
                          >
                            <Icon size={12} style={{ color: `var(--color-${color}-400, #4ade80)` }} />
                            <span className="text-[8px] text-slate-500 font-medium text-center leading-tight">
                              {EVENT_LABELS[type].split(' ')[0]}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500">Selecciona un jugador per veure i anotar les seves estadistiques</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

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
              {/* Event type grid - all types */}
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Tipus</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {Object.values(EVENT_CATEGORIES).flat().filter(t => !QUICK_COUNTER.includes(t)).map((type) => {
                    const Icon = EVENT_ICONS[type]
                    const color = EVENT_COLORS[type]
                    const active = form.event_type === type
                    return (
                      <button
                        key={type}
                        onClick={() => setForm({
                          ...form,
                          event_type: type,
                          goal_type: type === 'goal' ? 'right_foot' : null,
                          goal_origin: type === 'goal' ? 'open_play' : null,
                          shot_zone: ['shot_on_target', 'shot_off_target', 'shot_woodwork'].includes(type) ? 'inside_box' : null,
                        })}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[10px] font-medium transition-all ${
                          active
                            ? `border`
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
              {NEEDS_PLAYER.includes(form.event_type) && (
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
              )}

              {/* Goal type */}
              {form.event_type === 'goal' && (
                <>
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
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Origen del gol</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {GOAL_ORIGINS.map((go) => (
                        <button
                          key={go}
                          onClick={() => setForm({ ...form, goal_origin: go })}
                          className={`py-2 rounded-lg text-[10px] font-medium transition-all ${
                            form.goal_origin === go
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                              : 'bg-white/3 text-slate-500 border border-transparent hover:bg-white/5'
                          }`}
                        >
                          {GOAL_ORIGIN_LABELS[go]}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Shot zone (for shot events) */}
              {['shot_on_target', 'shot_off_target', 'shot_woodwork'].includes(form.event_type) && (
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Zona del tir</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SHOT_ZONES.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setForm({ ...form, shot_zone: sz })}
                        className={`py-2 rounded-lg text-[10px] font-medium transition-all ${
                          form.shot_zone === sz
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-white/3 text-slate-500 border border-transparent hover:bg-white/5'
                        }`}
                      >
                        {SHOT_ZONE_LABELS[sz]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Secondary player (for subs, assists) */}
              {(form.event_type === 'substitution' || form.event_type === 'assist' || form.event_type === 'pre_assist') && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    {form.event_type === 'substitution' ? 'Jugador substituit' : 'Golejador'}
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

              {/* Opponent toggle */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400">Esdeveniment del rival?</label>
                <button
                  onClick={() => setForm({ ...form, is_opponent: !form.is_opponent })}
                  className={`w-10 h-5 rounded-full transition-all ${
                    form.is_opponent ? 'bg-red-500' : 'bg-white/10'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    form.is_opponent ? 'translate-x-5.5' : 'translate-x-0.5'
                  }`} style={{ transform: form.is_opponent ? 'translateX(22px)' : 'translateX(2px)' }} />
                </button>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nota (opcional)</label>
                <input
                  type="text"
                  placeholder="Detalls de l'accio..."
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
                disabled={NEEDS_PLAYER.includes(form.event_type) && !form.player_name}
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
