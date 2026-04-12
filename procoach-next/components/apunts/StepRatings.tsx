'use client'

import { useState } from 'react'
import { ChevronDown, Target, AlertTriangle, Flame, Users, BarChart3, SkipForward } from 'lucide-react'
import type { MatchNoteRating, MatchNoteEvent, MatchNoteLineup } from '@/lib/match-notes-types'
import { EVENT_LABELS } from '@/lib/match-notes-types'
import RatingSlider from './RatingSlider'
import PlayerTagPicker from './PlayerTagPicker'

type RatingEntry = Omit<MatchNoteRating, 'id' | 'match_note_id'>
type EventEntry = Omit<MatchNoteEvent, 'id' | 'match_note_id'>
type LineupEntry = Omit<MatchNoteLineup, 'id' | 'match_note_id'>

const EFFORT_LEVELS = [
  { value: 1, label: 'Molt baix', emoji: '😴', color: '#f87171' },
  { value: 2, label: 'Baix', emoji: '😐', color: '#fb923c' },
  { value: 3, label: 'Normal', emoji: '👍', color: '#fbbf24' },
  { value: 4, label: 'Alt', emoji: '💪', color: '#4ade80' },
  { value: 5, label: 'Maxim', emoji: '🔥', color: '#22d3ee' },
]

const GLOBAL_ASPECTS = [
  { key: 'intensity', label: 'Intensitat general' },
  { key: 'tactical_discipline', label: 'Disciplina tactica' },
  { key: 'communication', label: 'Comunicacio' },
  { key: 'attitude', label: 'Actitud i mentalitat' },
  { key: 'pressing', label: 'Pressing col·lectiu' },
  { key: 'ball_circulation', label: 'Circulacio de pilota' },
] as const

export default function StepRatings({
  lineups,
  events,
  ratings,
  onChange,
  actaPlayers = [],
}: {
  lineups: LineupEntry[]
  events: EventEntry[]
  ratings: RatingEntry[]
  onChange: (ratings: RatingEntry[]) => void
  actaPlayers?: string[]
}) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
  const [mode, setMode] = useState<'player' | 'global'>('player')
  const [globalNote, setGlobalNote] = useState('')
  const [globalRatings, setGlobalRatings] = useState<Record<string, number>>(
    Object.fromEntries(GLOBAL_ASPECTS.map((a) => [a.key, 6]))
  )

  // Use lineup players if available, otherwise fall back to actaPlayers
  const lineupAttending = lineups
    .filter((l) => l.player_name && l.attendance === 'present')
    .map((l) => l.player_name)
  const attendingPlayers = lineupAttending.length > 0 ? lineupAttending : actaPlayers

  const getRating = (name: string): RatingEntry => {
    const existing = ratings.find((r) => r.player_name === name)
    if (existing) return existing
    return { player_name: name, player_slug: null, rating: 6, effort_rating: 3, tags: [], note: null }
  }

  const updateRating = (name: string, update: Partial<RatingEntry>) => {
    const current = getRating(name)
    const updated = { ...current, ...update }
    const newRatings = ratings.filter((r) => r.player_name !== name)
    newRatings.push(updated)
    onChange(newRatings)
  }

  const getPlayerEvents = (name: string) =>
    events.filter((e) => e.player_name === name && !e.is_opponent)

  const getRatingColor = (r: number) => {
    if (r <= 3) return '#f87171'
    if (r <= 5) return '#fbbf24'
    if (r <= 8) return '#4ade80'
    return '#22d3ee'
  }

  // Count stats per player for quick overview
  const getPlayerQuickStats = (name: string) => {
    const evts = getPlayerEvents(name)
    return {
      goals: evts.filter(e => e.event_type === 'goal').length,
      assists: evts.filter(e => e.event_type === 'assist').length,
      shots: evts.filter(e => ['shot_on_target', 'shot_off_target', 'shot_woodwork'].includes(e.event_type)).length,
      yellows: evts.filter(e => e.event_type === 'yellow_card').length,
      reds: evts.filter(e => e.event_type === 'red_card').length,
    }
  }

  // Save global ratings as a special "_GLOBAL" player rating entry
  const saveGlobalMode = () => {
    const globalEntry: RatingEntry = {
      player_name: '_GLOBAL',
      player_slug: null,
      rating: Math.round(Object.values(globalRatings).reduce((a, b) => a + b, 0) / Object.values(globalRatings).length),
      effort_rating: null,
      tags: Object.entries(globalRatings)
        .filter(([, v]) => v >= 7)
        .map(([k]) => `global_${k}`),
      note: [
        ...GLOBAL_ASPECTS.map((a) => `${a.label}: ${globalRatings[a.key]}/10`),
        globalNote ? `\nNotes: ${globalNote}` : '',
      ].filter(Boolean).join(' | '),
    }
    const newRatings = ratings.filter((r) => r.player_name !== '_GLOBAL')
    newRatings.push(globalEntry)
    onChange(newRatings)
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Valoracions</h2>
      <p className="text-sm text-[#8a8f98] mb-4">
        Valora el rendiment de l&apos;equip globalment o jugador a jugador.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-5 p-1 bg-white/3 rounded-xl border border-white/5">
        <button
          onClick={() => setMode('player')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            mode === 'player'
              ? 'bg-white/10 text-white'
              : 'text-[#8a8f98] hover:text-[#d0d6e0]'
          }`}
        >
          <Users size={12} />
          Jugador a jugador
        </button>
        <button
          onClick={() => setMode('global')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            mode === 'global'
              ? 'bg-white/10 text-white'
              : 'text-[#8a8f98] hover:text-[#d0d6e0]'
          }`}
        >
          <BarChart3 size={12} />
          Valoracio global
        </button>
      </div>

      {/* ─── Global mode ─── */}
      {mode === 'global' && (
        <div className="space-y-4">
          <p className="text-xs text-[#8a8f98]">
            Valora els aspectes col·lectius de l&apos;equip (1-10). Pots saltar les valoracions individuals.
          </p>

          <div className="space-y-3">
            {GLOBAL_ASPECTS.map((aspect) => (
              <div key={aspect.key} className="bg-white/3 border border-white/5 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">{aspect.label}</span>
                  <span
                    className="text-xs font-black w-6 text-center"
                    style={{ color: getRatingColor(globalRatings[aspect.key]) }}
                  >
                    {globalRatings[aspect.key]}
                  </span>
                </div>
                <RatingSlider
                  value={globalRatings[aspect.key]}
                  onChange={(v) => {
                    setGlobalRatings((prev) => ({ ...prev, [aspect.key]: v }))
                    // Auto-save on change
                    setTimeout(saveGlobalMode, 0)
                  }}
                />
              </div>
            ))}
          </div>

          {/* Global notes */}
          <div>
            <label className="text-[10px] text-[#8a8f98] uppercase tracking-wider mb-1.5 block">
              Notes generals de l&apos;equip
            </label>
            <textarea
              placeholder="Observacions sobre el rendiment col·lectiu..."
              value={globalNote}
              onChange={(e) => {
                setGlobalNote(e.target.value)
                setTimeout(saveGlobalMode, 0)
              }}
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder-[#62666d] focus:outline-none focus:border-green-500/50 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/8 border border-green-500/15 rounded-xl">
            <SkipForward size={12} className="text-green-400" />
            <span className="text-[10px] text-green-300">
              Les valoracions globals es desen automaticament. Pots continuar al seguent pas.
            </span>
          </div>
        </div>
      )}

      {/* ─── Per-player mode ─── */}
      {mode === 'player' && (
      <>
      <div className="space-y-2">
        {attendingPlayers.map((name) => {
          const rating = getRating(name)
          const playerEvents = getPlayerEvents(name)
          const isExpanded = expandedPlayer === name
          const starter = lineups.find((l) => l.player_name === name)
          const stats = getPlayerQuickStats(name)

          return (
            <div
              key={name}
              className="bg-white/3 border border-white/5 rounded-xl overflow-hidden"
            >
              {/* Player header */}
              <div className="flex items-center gap-3 p-3">
                {/* Rating badge */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                  style={{
                    backgroundColor: getRatingColor(rating.rating) + '20',
                    color: getRatingColor(rating.rating),
                  }}
                >
                  {rating.rating}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{name}</p>
                    {starter?.is_starter && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-green-500/15 text-green-400 rounded font-bold shrink-0">TIT</span>
                    )}
                    {starter?.is_captain && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded font-bold shrink-0">C</span>
                    )}
                  </div>

                  {/* Quick stats pills */}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {stats.goals > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-semibold">⚽ {stats.goals}</span>}
                    {stats.assists > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e] font-semibold">🅰️ {stats.assists}</span>}
                    {stats.shots > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-[#8a8f98]">🎯 {stats.shots}</span>}
                    {stats.yellows > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400">🟨 {stats.yellows}</span>}
                    {stats.reds > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">🟥 {stats.reds}</span>}
                    {playerEvents.length === 0 && (
                      <span className="text-[9px] text-[#62666d]">Cap esdeveniment</span>
                    )}
                  </div>
                </div>

                {/* Effort mini indicator */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <Flame size={12} className="text-orange-400" />
                  <span className="text-[10px] font-bold text-white">{rating.effort_rating ?? 3}</span>
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedPlayer(isExpanded ? null : name)}
                  className="text-[#8a8f98] hover:text-white transition-colors p-1"
                >
                  <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Rating slider (always visible) */}
              <div className="px-3 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-[#8a8f98] w-16">Rendiment</span>
                  <div className="flex-1">
                    <RatingSlider
                      value={rating.rating}
                      onChange={(v) => updateRating(name, { rating: v })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8a8f98] w-16 flex items-center gap-1">
                    <Flame size={9} /> Esforc
                  </span>
                  <div className="flex-1 flex gap-1">
                    {EFFORT_LEVELS.map((e) => (
                      <button
                        key={e.value}
                        onClick={() => updateRating(name, { effort_rating: e.value })}
                        title={e.label}
                        className={`flex-1 py-1 rounded text-center text-[10px] transition-all ${
                          (rating.effort_rating ?? 3) === e.value
                            ? 'font-bold'
                            : 'opacity-40 hover:opacity-70'
                        }`}
                        style={
                          (rating.effort_rating ?? 3) === e.value
                            ? { backgroundColor: e.color + '25', color: e.color }
                            : undefined
                        }
                      >
                        {e.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expanded section */}
              {isExpanded && (
                <div className="px-3 pb-4 space-y-3 border-t border-white/5 pt-3">
                  {/* Tags */}
                  <div>
                    <label className="text-[10px] text-[#8a8f98] uppercase tracking-wider mb-1.5 block">Etiquetes</label>
                    <PlayerTagPicker
                      selected={rating.tags}
                      onChange={(tags) => updateRating(name, { tags })}
                    />
                  </div>

                  {/* Event summary */}
                  {playerEvents.length > 0 && (
                    <div>
                      <label className="text-[10px] text-[#8a8f98] uppercase tracking-wider mb-1.5 block">Esdeveniments</label>
                      <div className="flex flex-wrap gap-1">
                        {playerEvents.map((e, i) => (
                          <span
                            key={i}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[#8a8f98]"
                          >
                            {e.minute > 0 ? `${e.minute}' ` : ''}{EVENT_LABELS[e.event_type]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Note */}
                  <div>
                    <label className="text-[10px] text-[#8a8f98] uppercase tracking-wider mb-1.5 block">Nota</label>
                    <textarea
                      placeholder="Observacions sobre el rendiment del jugador..."
                      value={rating.note || ''}
                      onChange={(e) => updateRating(name, { note: e.target.value || null })}
                      rows={2}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder-[#62666d] focus:outline-none focus:border-green-500/50 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {attendingPlayers.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle size={24} className="text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-[#8a8f98] mb-3">
            Cap jugador disponible. Selecciona un partit amb acta o afegeix l&apos;alineacio al final.
          </p>
          <button
            onClick={() => setMode('global')}
            className="text-xs text-green-400 hover:text-green-300 underline underline-offset-2"
          >
            O fes una valoracio global de l&apos;equip
          </button>
        </div>
      )}
      </>
      )}
    </div>
  )
}
