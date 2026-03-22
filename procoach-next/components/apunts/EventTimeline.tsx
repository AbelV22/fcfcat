'use client'

import type { MatchNoteEvent, EventType } from '@/lib/match-notes-types'

type EventEntry = Omit<MatchNoteEvent, 'id' | 'match_note_id'>

const EVENT_COLORS: Record<EventType, string> = {
  goal: '#22c55e',
  assist: '#06b6d4',
  pre_assist: '#8b5cf6',
  yellow_card: '#eab308',
  red_card: '#ef4444',
  substitution: '#f97316',
  injury: '#a855f7',
}

export default function EventTimeline({
  events,
  onSelectMinute,
}: {
  events: EventEntry[]
  onSelectMinute: (minute: number) => void
}) {
  const W = 600
  const H = 70
  const PAD = 30
  const TRACK_Y = 35

  const minuteToX = (m: number) => PAD + (m / 95) * (W - PAD * 2)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 60 }}>
      {/* Track background */}
      <rect x={PAD} y={TRACK_Y - 2} width={W - PAD * 2} height="4" rx="2" fill="rgba(255,255,255,0.06)" />

      {/* Half markers */}
      {[0, 15, 30, 45, 60, 75, 90].map((m) => (
        <g key={m}>
          <line x1={minuteToX(m)} y1={TRACK_Y - 8} x2={minuteToX(m)} y2={TRACK_Y + 8} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <text x={minuteToX(m)} y={TRACK_Y + 20} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)" fontWeight="500">
            {m}&apos;
          </text>
        </g>
      ))}

      {/* Half-time indicator */}
      <line x1={minuteToX(45)} y1={TRACK_Y - 12} x2={minuteToX(45)} y2={TRACK_Y + 12} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

      {/* Event dots */}
      {events.map((evt, i) => {
        const x = minuteToX(evt.minute)
        const color = EVENT_COLORS[evt.event_type] || '#94a3b8'
        // Stack events at same minute
        const sameMinute = events.filter((e, j) => j < i && Math.abs(e.minute - evt.minute) < 2)
        const yOffset = sameMinute.length * -12

        return (
          <g key={i}>
            <circle cx={x} cy={TRACK_Y + yOffset} r="5" fill={color} opacity="0.9" />
            <circle cx={x} cy={TRACK_Y + yOffset} r="8" fill={color} opacity="0.15" />
            {/* Tiny label */}
            <text
              x={x}
              y={TRACK_Y + yOffset - 9}
              textAnchor="middle"
              fontSize="6"
              fill={color}
              fontWeight="bold"
            >
              {evt.event_type === 'goal' ? '⚽' : evt.event_type === 'yellow_card' ? '🟨' : evt.event_type === 'red_card' ? '🟥' : ''}
            </text>
          </g>
        )
      })}

      {/* Clickable area */}
      <rect
        x={PAD}
        y="0"
        width={W - PAD * 2}
        height={H}
        fill="transparent"
        style={{ cursor: 'crosshair' }}
        onClick={(e) => {
          const svg = e.currentTarget.ownerSVGElement
          if (!svg) return
          const pt = svg.createSVGPoint()
          pt.x = e.clientX
          pt.y = e.clientY
          const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse())
          const minute = Math.round(((svgPt.x - PAD) / (W - PAD * 2)) * 95)
          onSelectMinute(Math.max(0, Math.min(90, minute)))
        }}
      />
    </svg>
  )
}
