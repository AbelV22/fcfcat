'use client'

import { useMemo } from 'react'
import { CircleDot } from 'lucide-react'
import type { TrainingSession } from '@/lib/training-types'
import {
  INTENSITY_COLORS, DAY_LABELS_SHORT,
  formatDate, parseDate,
} from '@/lib/training-types'

interface CalendarMatch {
  id: string
  home_team: string
  away_team: string
  match_date: string
  jornada: number | null
}

interface Props {
  weekStart: Date
  sessions: TrainingSession[]
  calendarMatches: CalendarMatch[]
  clubName: string | null
}

const SUGGESTED_INTENSITY: Record<number, string> = {
  [-3]: 'high',
  [-2]: 'medium',
  [-1]: 'low',
  [0]: 'match',
  [1]: 'low',
  [2]: 'medium',
}

export default function MicrocycleStrip({ weekStart, sessions, calendarMatches, clubName }: Props) {
  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  // Find match day in this week
  const matchDay = useMemo(() => {
    for (let i = 0; i < 7; i++) {
      const dateStr = formatDate(days[i])
      const hasMatch = calendarMatches.some(m => {
        if (!m.match_date) return false
        const mDate = m.match_date.length === 10 && m.match_date[4] === '-'
          ? `${m.match_date.substring(8, 10)}-${m.match_date.substring(5, 7)}-${m.match_date.substring(0, 4)}`
          : m.match_date
        return mDate === dateStr
      })
      if (hasMatch) return i
    }
    return null
  }, [days, calendarMatches])

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 2,
      marginBottom: 12,
      padding: '4px 0',
      overflow: 'hidden', width: '100%',
    }}
    className="microcycle-strip"
    >
      {days.map((day, idx) => {
        const dateStr = formatDate(day)
        const daySessions = sessions.filter(s => s.session_date === dateStr)
        const isMatch = matchDay === idx

        // Calculate match-day delta
        let delta: number | null = null
        let deltaLabel = ''
        if (matchDay !== null) {
          delta = idx - matchDay
          if (delta === 0) deltaLabel = 'MD'
          else if (delta < 0) deltaLabel = `MD${delta}`
          else deltaLabel = `MD+${delta}`
        }

        // Suggested intensity based on MD proximity
        const suggestedIntensity = delta !== null ? SUGGESTED_INTENSITY[delta] : null

        // Actual session intensity (highest if multiple)
        const actualIntensity = daySessions.length > 0
          ? daySessions.reduce((max, s) => {
              const order = { low: 1, medium: 2, high: 3, very_high: 4 }
              const curr = order[s.planned_intensity] || 0
              const maxVal = order[max] || 0
              return curr > maxVal ? s.planned_intensity : max
            }, daySessions[0].planned_intensity)
          : null

        const displayIntensity = actualIntensity || suggestedIntensity
        const intensityColor = displayIntensity && displayIntensity !== 'match'
          ? INTENSITY_COLORS[displayIntensity as keyof typeof INTENSITY_COLORS] || '#8a8f98'
          : '#8a8f98'

        return (
          <div
            key={idx}
            style={{
              textAlign: 'center', padding: '6px 4px',
              borderRadius: 6,
              background: isMatch ? 'rgba(34,197,94,0.06)' : 'transparent',
              border: isMatch ? '1px solid rgba(34,197,94,0.15)' : '1px solid transparent',
            }}
          >
            {/* Day label */}
            <div style={{ fontSize: 9, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
              {DAY_LABELS_SHORT[idx]}
            </div>

            {/* MD delta badge */}
            {deltaLabel && (
              <div style={{
                fontSize: 9, fontWeight: 600, marginBottom: 3,
                color: isMatch ? '#22c55e' : '#8a8f98',
                fontFamily: 'var(--font-inter)',
              }}>
                {deltaLabel}
              </div>
            )}

            {/* Intensity indicator */}
            {isMatch ? (
              <CircleDot size={14} style={{ color: '#22c55e', margin: '0 auto' }} />
            ) : displayIntensity ? (
              <div style={{
                width: 10, height: 10, borderRadius: 5,
                background: intensityColor,
                margin: '0 auto',
                opacity: actualIntensity ? 1 : 0.3,
                border: !actualIntensity ? `1px dashed ${intensityColor}` : 'none',
              }} />
            ) : (
              <div style={{ width: 10, height: 10, margin: '0 auto' }} />
            )}

            {/* Session count */}
            {daySessions.length > 0 && (
              <div style={{ fontSize: 9, color: '#8a8f98', marginTop: 2 }}>
                {daySessions.length}
              </div>
            )}
          </div>
        )
      })}

      <style>{`
        @media (max-width: 768px) {
          .microcycle-strip {
            grid-template-columns: repeat(7, 1fr) !important;
          }
        }
      `}</style>
    </div>
  )
}
