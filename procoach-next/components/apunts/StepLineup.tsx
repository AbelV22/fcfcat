'use client'

import { useState, useEffect } from 'react'
import { Users, UserPlus, UserX, AlertTriangle, ShieldBan, ChevronDown } from 'lucide-react'
import type { MatchNoteLineup, AttendanceStatus } from '@/lib/match-notes-types'
import { FORMATIONS } from '@/lib/match-notes-types'
import { fetchTeamRoster } from '@/lib/match-notes-data'
import PitchFormation from './PitchFormation'

type LineupEntry = Omit<MatchNoteLineup, 'id' | 'match_note_id'>

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string; icon: typeof Users; color: string }[] = [
  { value: 'present', label: 'Present', icon: Users, color: 'green' },
  { value: 'absent', label: 'Absent', icon: UserX, color: 'red' },
  { value: 'injured', label: 'Lesionat', icon: AlertTriangle, color: 'amber' },
  { value: 'sanctioned', label: 'Sancionat', icon: ShieldBan, color: 'rose' },
]

export default function StepLineup({
  teamSlug,
  formation,
  lineups,
  onFormationChange,
  onLineupsChange,
}: {
  teamSlug: string
  formation: string
  lineups: LineupEntry[]
  onFormationChange: (f: string) => void
  onLineupsChange: (l: LineupEntry[]) => void
}) {
  const [roster, setRoster] = useState<string[]>([])
  const [newPlayer, setNewPlayer] = useState('')
  const [showBench, setShowBench] = useState(false)

  useEffect(() => {
    if (!teamSlug) return
    fetchTeamRoster(teamSlug)
      .then((data) => {
        const names = data.map((p) => p.player_name).filter(Boolean)
        setRoster(names)
        // Initialize lineups if empty
        if (lineups.length === 0) {
          const positions = FORMATIONS[formation] || FORMATIONS['4-3-3']
          const initial: LineupEntry[] = positions.map((pos) => ({
            player_name: '',
            player_slug: null,
            position_x: pos.x,
            position_y: pos.y,
            role: pos.role,
            is_starter: true,
            attendance: 'present' as AttendanceStatus,
            sub_minute: null,
            sub_out_minute: null,
            sub_reason: null,
            effort_rating: null,
            is_captain: false,
          }))
          onLineupsChange(initial)
        }
      })
      .catch(() => setRoster([]))
  }, [teamSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormationChange = (newFormation: string) => {
    onFormationChange(newFormation)
    const positions = FORMATIONS[newFormation] || FORMATIONS['4-3-3']
    // Re-create starters with new positions but keep assigned players
    const starters = lineups.filter((l) => l.is_starter)
    const newStarters: LineupEntry[] = positions.map((pos, i) => ({
      player_name: starters[i]?.player_name || '',
      player_slug: starters[i]?.player_slug || null,
      position_x: pos.x,
      position_y: pos.y,
      role: pos.role,
      is_starter: true,
      attendance: starters[i]?.attendance || 'present',
      sub_minute: null,
      sub_out_minute: null,
      sub_reason: null,
      effort_rating: null,
      is_captain: starters[i]?.is_captain || false,
    }))
    const bench = lineups.filter((l) => !l.is_starter)
    onLineupsChange([...newStarters, ...bench])
  }

  const handleAssign = (posIndex: number, playerName: string) => {
    const updated = [...lineups]
    const starters = updated.filter((l) => l.is_starter)
    if (posIndex < starters.length) {
      const realIndex = updated.indexOf(starters[posIndex])
      if (realIndex >= 0) {
        updated[realIndex] = { ...updated[realIndex], player_name: playerName }
        onLineupsChange(updated)
      }
    }
  }

  const handlePositionChange = (posIndex: number, x: number, y: number) => {
    const updated = [...lineups]
    const starters = updated.filter((l) => l.is_starter)
    if (posIndex < starters.length) {
      const realIndex = updated.indexOf(starters[posIndex])
      if (realIndex >= 0) {
        updated[realIndex] = { ...updated[realIndex], position_x: x, position_y: y }
        onLineupsChange(updated)
      }
    }
  }

  // Attendance management (all roster players)
  const getAttendance = (name: string): AttendanceStatus => {
    const entry = lineups.find((l) => l.player_name === name)
    return entry?.attendance || 'present'
  }

  const setAttendance = (name: string, status: AttendanceStatus) => {
    const updated = [...lineups]
    const idx = updated.findIndex((l) => l.player_name === name)
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], attendance: status }
      onLineupsChange(updated)
    }
  }

  const addToBench = (name: string) => {
    if (lineups.some((l) => l.player_name === name)) return
    onLineupsChange([
      ...lineups,
      {
        player_name: name,
        player_slug: null,
        position_x: null,
        position_y: null,
        role: null,
        is_starter: false,
        attendance: 'present',
        sub_minute: null,
        sub_out_minute: null,
        sub_reason: null,
        effort_rating: null,
        is_captain: false,
      },
    ])
  }

  const addCustomPlayer = () => {
    if (!newPlayer.trim()) return
    if (!roster.includes(newPlayer.trim())) {
      setRoster([...roster, newPlayer.trim()])
    }
    addToBench(newPlayer.trim())
    setNewPlayer('')
  }

  const assignedNames = new Set(lineups.map((l) => l.player_name).filter(Boolean))
  const unassignedRoster = roster.filter((n) => !assignedNames.has(n))
  const benchPlayers = lineups.filter((l) => !l.is_starter && l.player_name)

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Alineació i formació</h2>
      <p className="text-sm text-[#8a8f98] mb-6">
        Toca una posició al camp per assignar un jugador. Arrossega per moure&apos;ls.
      </p>

      {/* Formation selector */}
      <div className="mb-5">
        <label className="text-xs text-[#8a8f98] mb-2 block">Formació</label>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(FORMATIONS).map((f) => (
            <button
              key={f}
              onClick={() => handleFormationChange(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                f === formation
                  ? 'bg-gradient-to-r from-green-500 to-[#22c55e] text-white'
                  : 'bg-white/5 text-[#8a8f98] border border-white/10 hover:border-white/25'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Pitch */}
      <PitchFormation
        formation={formation}
        lineups={lineups}
        roster={roster}
        onAssign={handleAssign}
        onPositionChange={handlePositionChange}
      />

      {/* Bench section */}
      <div className="mt-6">
        <button
          onClick={() => setShowBench(!showBench)}
          className="flex items-center gap-2 text-sm font-semibold text-[#d0d6e0] hover:text-white transition-colors mb-3"
        >
          <ChevronDown size={14} className={`transition-transform ${showBench ? 'rotate-180' : ''}`} />
          Banqueta ({benchPlayers.length})
        </button>

        {showBench && (
          <div className="space-y-3">
            {/* Current bench */}
            {benchPlayers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {benchPlayers.map((l) => (
                  <span
                    key={l.player_name}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white"
                  >
                    {l.player_name}
                    <button
                      onClick={() => onLineupsChange(lineups.filter((x) => x !== l))}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Unassigned roster */}
            {unassignedRoster.length > 0 && (
              <div>
                <p className="text-[10px] text-[#62666d] uppercase tracking-wider mb-2">Afegir al banquet</p>
                <div className="flex flex-wrap gap-1.5">
                  {unassignedRoster.map((name) => (
                    <button
                      key={name}
                      onClick={() => addToBench(name)}
                      className="px-2.5 py-1 bg-white/3 border border-dashed border-white/10 rounded-lg text-[11px] text-[#8a8f98] hover:text-white hover:border-white/20 transition-all"
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add custom player */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Afegir jugador..."
                value={newPlayer}
                onChange={(e) => setNewPlayer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomPlayer()}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-[#62666d] focus:outline-none focus:border-green-500/50"
              />
              <button
                onClick={addCustomPlayer}
                disabled={!newPlayer.trim()}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-[#8a8f98] hover:text-white disabled:opacity-30 transition-all"
              >
                <UserPlus size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendance management */}
      {assignedNames.size > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider mb-3">Assistència</h3>
          <div className="space-y-1.5">
            {lineups
              .filter((l) => l.player_name)
              .map((l) => (
                <div
                  key={l.player_name}
                  className="flex items-center justify-between py-2 px-3 bg-white/3 rounded-lg"
                >
                  <span className="text-xs text-white font-medium">
                    {l.is_starter && <span className="text-green-400 mr-1">●</span>}
                    {l.player_name}
                  </span>
                  <div className="flex gap-1">
                    {ATTENDANCE_OPTIONS.map((opt) => {
                      const Icon = opt.icon
                      const isActive = l.attendance === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setAttendance(l.player_name, opt.value)}
                          title={opt.label}
                          className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                            isActive
                              ? `bg-${opt.color}-500/20 text-${opt.color}-400`
                              : 'bg-transparent text-[#62666d] hover:text-[#8a8f98]'
                          }`}
                          style={
                            isActive
                              ? {
                                  backgroundColor: `var(--color-${opt.color}-500, #22c55e)20`,
                                  color: `var(--color-${opt.color}-400, #4ade80)`,
                                }
                              : undefined
                          }
                        >
                          <Icon size={12} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
