'use client'

import { useState, useRef, useCallback } from 'react'
import type { MatchNoteLineup } from '@/lib/match-notes-types'
import { FORMATIONS } from '@/lib/match-notes-types'

type LineupEntry = Omit<MatchNoteLineup, 'id' | 'match_note_id'>

interface Props {
  formation: string
  lineups: LineupEntry[]
  roster: string[]
  onAssign: (positionIndex: number, playerName: string) => void
  onPositionChange: (positionIndex: number, x: number, y: number) => void
}

export default function PitchFormation({ formation, lineups, roster, onAssign, onPositionChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [rosterFilter, setRosterFilter] = useState('')

  const positions = FORMATIONS[formation] || FORMATIONS['4-3-3']

  // Get assigned players
  const starters = lineups.filter((l) => l.is_starter)
  const assignedNames = new Set(starters.map((l) => l.player_name))
  const availableRoster = roster.filter(
    (name) =>
      !assignedNames.has(name) &&
      name.toLowerCase().includes(rosterFilter.toLowerCase())
  )

  const getPlayerAt = (index: number): string | null => {
    if (index < starters.length && starters[index].player_name) {
      return starters[index].player_name
    }
    return null
  }

  const getPosition = (index: number) => {
    if (index < starters.length && starters[index].position_x != null) {
      return { x: starters[index].position_x!, y: starters[index].position_y! }
    }
    return positions[index] ? { x: positions[index].x, y: positions[index].y } : { x: 0.5, y: 0.5 }
  }

  const svgToRelative = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return { x: 0.5, y: 0.5 }
      const rect = svgRef.current.getBoundingClientRect()
      const x = Math.max(0.05, Math.min(0.95, (clientX - rect.left) / rect.width))
      const y = Math.max(0.03, Math.min(0.92, (clientY - rect.top) / rect.height))
      return { x, y }
    },
    []
  )

  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    e.preventDefault()
    setDragging(index)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragging === null) return
    const { x, y } = svgToRelative(e.clientX, e.clientY)
    onPositionChange(dragging, x, y)
  }

  const handlePointerUp = () => {
    setDragging(null)
  }

  // Pitch dimensions (viewBox)
  const W = 340
  const H = 520

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-md mx-auto rounded-2xl overflow-hidden"
        style={{ touchAction: 'none' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Pitch background */}
        <rect x="0" y="0" width={W} height={H} fill="#1a472a" />

        {/* Pitch lines */}
        <rect x="10" y="10" width={W - 20} height={H - 20} fill="none" stroke="#2d6b3f" strokeWidth="1.5" rx="2" />
        {/* Center line */}
        <line x1="10" y1={H / 2} x2={W - 10} y2={H / 2} stroke="#2d6b3f" strokeWidth="1.5" />
        {/* Center circle */}
        <circle cx={W / 2} cy={H / 2} r="45" fill="none" stroke="#2d6b3f" strokeWidth="1.5" />
        <circle cx={W / 2} cy={H / 2} r="3" fill="#2d6b3f" />

        {/* Bottom penalty area (own goal) */}
        <rect x={(W - 160) / 2} y={H - 10 - 65} width="160" height="65" fill="none" stroke="#2d6b3f" strokeWidth="1.5" />
        <rect x={(W - 70) / 2} y={H - 10 - 25} width="70" height="25" fill="none" stroke="#2d6b3f" strokeWidth="1.5" />
        {/* Penalty arc */}
        <path d={`M ${W / 2 - 35} ${H - 75} A 35 35 0 0 1 ${W / 2 + 35} ${H - 75}`} fill="none" stroke="#2d6b3f" strokeWidth="1.5" />

        {/* Top penalty area (opponent goal) */}
        <rect x={(W - 160) / 2} y="10" width="160" height="65" fill="none" stroke="#2d6b3f" strokeWidth="1.5" />
        <rect x={(W - 70) / 2} y="10" width="70" height="25" fill="none" stroke="#2d6b3f" strokeWidth="1.5" />
        {/* Penalty arc */}
        <path d={`M ${W / 2 - 35} 75 A 35 35 0 0 0 ${W / 2 + 35} 75`} fill="none" stroke="#2d6b3f" strokeWidth="1.5" />

        {/* Grass stripes */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect
            key={i}
            x="10"
            y={10 + i * ((H - 20) / 8)}
            width={W - 20}
            height={(H - 20) / 8}
            fill={i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'}
          />
        ))}

        {/* Player positions — inverted Y so own goal is at bottom */}
        {positions.map((pos, i) => {
          const { x, y } = getPosition(i)
          const px = 10 + x * (W - 20)
          // Invert Y: pos.y=0 (own goal) -> bottom, pos.y=1 (opponent goal) -> top
          const py = H - 10 - y * (H - 20)
          const player = getPlayerAt(i)
          const isDragging = dragging === i
          const isActive = activeSlot === i
          const label = positions[i]?.label || ''

          return (
            <g
              key={i}
              onPointerDown={(e) => handlePointerDown(i, e)}
              onClick={() => setActiveSlot(activeSlot === i ? null : i)}
              style={{ cursor: 'pointer' }}
            >
              {/* Glow ring */}
              {(isDragging || isActive) && (
                <circle cx={px} cy={py} r="22" fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.5" />
              )}
              {/* Circle */}
              <circle
                cx={px}
                cy={py}
                r="17"
                fill={player ? 'url(#playerGrad)' : 'rgba(255,255,255,0.08)'}
                stroke={player ? '#22c55e' : 'rgba(255,255,255,0.2)'}
                strokeWidth={player ? '2' : '1.5'}
                strokeDasharray={player ? '' : '3,3'}
              />
              {/* Label or initial */}
              <text
                x={px}
                y={py + (player ? -1 : 1)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={player ? '7' : '8'}
                fontWeight="bold"
                fill="white"
              >
                {player
                  ? player.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase()
                  : label}
              </text>
              {/* Name below */}
              {player && (
                <text
                  x={px}
                  y={py + 26}
                  textAnchor="middle"
                  fontSize="7"
                  fill="rgba(255,255,255,0.7)"
                  fontWeight="500"
                >
                  {player.length > 12 ? player.split(' ').pop() : player}
                </text>
              )}
            </g>
          )
        })}

        {/* Gradient definitions */}
        <defs>
          <linearGradient id="playerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
          </linearGradient>
        </defs>
      </svg>

      {/* Player assignment dropdown */}
      {activeSlot !== null && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-[calc(100%+8px)] w-72 max-h-60 bg-[#1e293b] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="p-2 border-b border-white/10">
            <input
              type="text"
              placeholder="Cercar jugador..."
              value={rosterFilter}
              onChange={(e) => setRosterFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-green-500/50"
              autoFocus
            />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {/* Unassign option */}
            {getPlayerAt(activeSlot) && (
              <button
                onClick={() => {
                  onAssign(activeSlot, '')
                  setActiveSlot(null)
                  setRosterFilter('')
                }}
                className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Treure jugador
              </button>
            )}
            {availableRoster.map((name) => (
              <button
                key={name}
                onClick={() => {
                  onAssign(activeSlot, name)
                  setActiveSlot(null)
                  setRosterFilter('')
                }}
                className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/8 transition-colors"
              >
                {name}
              </button>
            ))}
            {availableRoster.length === 0 && !getPlayerAt(activeSlot) && (
              <p className="px-3 py-3 text-xs text-slate-500">Cap jugador disponible</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
