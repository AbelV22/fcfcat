'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Plus, CircleDot } from 'lucide-react'
import type { TrainingSession } from '@/lib/training-types'
import {
  INTENSITY_COLORS, SESSION_TYPE_LABELS,
  MONTH_LABELS, DAY_LABELS_SHORT,
  formatDate,
} from '@/lib/training-types'

interface CalendarMatch {
  id: string
  home_team: string
  away_team: string
  match_date: string
  home_score: number | null
  away_score: number | null
  jornada: number | null
  status: string | null
}

interface Props {
  currentMonth: Date  // any date in the month to display
  sessions: TrainingSession[]
  calendarMatches: CalendarMatch[]
  clubName: string | null
  onDeleteSession?: (id: string) => void
}

function normalizeMatchDate(d: string): string {
  if (!d) return ''
  if (d.length === 10 && d[4] === '-') {
    return `${d.substring(8, 10)}-${d.substring(5, 7)}-${d.substring(0, 4)}`
  }
  return d
}

export default function MonthlyCalendar({ currentMonth, sessions, calendarMatches, clubName }: Props) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // Build grid: 6 rows x 7 cols starting from Monday
  const grid = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Find the Monday before or on the 1st
    let startDay = new Date(firstDay)
    const dow = startDay.getDay()
    const offset = dow === 0 ? -6 : 1 - dow
    startDay.setDate(startDay.getDate() + offset)

    const cells: Date[] = []
    const d = new Date(startDay)
    // Always generate 42 cells (6 weeks)
    for (let i = 0; i < 42; i++) {
      cells.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return cells
  }, [year, month])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build lookup maps for performance
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, TrainingSession[]>()
    sessions.forEach(s => {
      const existing = map.get(s.session_date) || []
      existing.push(s)
      map.set(s.session_date, existing)
    })
    return map
  }, [sessions])

  const matchesByDate = useMemo(() => {
    const map = new Map<string, CalendarMatch[]>()
    calendarMatches.forEach(m => {
      const key = normalizeMatchDate(m.match_date)
      if (!key) return
      const existing = map.get(key) || []
      existing.push(m)
      map.set(key, existing)
    })
    return map
  }, [calendarMatches])

  return (
    <div>
      {/* Day headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 1, marginBottom: 2, overflow: 'hidden', width: '100%',
      }}>
        {DAY_LABELS_SHORT.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 10, color: '#62666d',
            fontWeight: 510, textTransform: 'uppercase', letterSpacing: '0.04em',
            padding: '6px 0',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 1, overflow: 'hidden', width: '100%',
      }}>
        {grid.map((day, idx) => {
          const dateStr = formatDate(day)
          const isCurrentMonth = day.getMonth() === month
          const isToday = day.getTime() === today.getTime()
          const daySessions = sessionsByDate.get(dateStr) || []
          const dayMatches = matchesByDate.get(dateStr) || []
          const hasMatch = dayMatches.length > 0
          const hasSession = daySessions.length > 0

          // Highest intensity for color
          const intensityOrder = { low: 1, medium: 2, high: 3, very_high: 4 }
          const maxIntensity = daySessions.reduce((max, s) => {
            const v = intensityOrder[s.planned_intensity] || 0
            return v > (intensityOrder[max] || 0) ? s.planned_intensity : max
          }, daySessions[0]?.planned_intensity || 'low')

          const bgColor = hasSession
            ? `${INTENSITY_COLORS[maxIntensity]}10`
            : 'transparent'

          return (
            <Link
              key={idx}
              href={hasSession
                ? `/dashboard/entrenaments/${daySessions[0].id}`
                : `/dashboard/entrenaments/nova-sessio?date=${dateStr}`
              }
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'flex-start',
                padding: '4px 1px', minHeight: 56, borderRadius: 4,
                background: isToday
                  ? 'rgba(34,197,94,0.06)'
                  : bgColor,
                border: isToday
                  ? '1px solid rgba(34,197,94,0.25)'
                  : hasMatch
                    ? '1px solid rgba(34,197,94,0.12)'
                    : '1px solid rgba(255,255,255,0.03)',
                opacity: isCurrentMonth ? 1 : 0.3,
                textDecoration: 'none',
                transition: 'all 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (isCurrentMonth) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
              }}
              onMouseLeave={e => {
                if (isCurrentMonth) e.currentTarget.style.borderColor = isToday
                  ? 'rgba(34,197,94,0.25)'
                  : hasMatch ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)'
              }}
            >
              {/* Date number */}
              <span style={{
                fontSize: 12, fontWeight: 510,
                color: isToday ? '#22c55e' : isCurrentMonth ? '#d0d6e0' : '#62666d',
                fontFamily: 'var(--font-inter)',
                marginBottom: 3,
              }}>
                {day.getDate()}
              </span>

              {/* Match indicator */}
              {hasMatch && (
                <CircleDot size={10} style={{ color: '#22c55e', marginBottom: 2 }} />
              )}

              {/* Session intensity dots */}
              {hasSession && (
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {daySessions.map(s => (
                    <span
                      key={s.id}
                      style={{
                        width: 6, height: 6, borderRadius: 3,
                        background: INTENSITY_COLORS[s.planned_intensity],
                        opacity: s.status === 'completed' ? 0.5 : 1,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Session count if multiple */}
              {daySessions.length > 1 && (
                <span style={{ fontSize: 9, color: '#8a8f98', marginTop: 1 }}>
                  {daySessions.length}
                </span>
              )}

              {/* Match jornada label */}
              {hasMatch && dayMatches[0].jornada && (
                <span style={{
                  fontSize: 8, color: '#22c55e', fontWeight: 600,
                  marginTop: 1,
                }}>
                  J{dayMatches[0].jornada}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 12, marginTop: 12, justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        <LegendItem color="#22c55e" label="Baixa" />
        <LegendItem color="#f59e0b" label="Mitjana" />
        <LegendItem color="#f97316" label="Alta" />
        <LegendItem color="#ef4444" label="Molt alta" />
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#62666d' }}>
          <CircleDot size={10} style={{ color: '#22c55e' }} />
          Partit
        </span>
      </div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#62666d' }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
      {label}
    </span>
  )
}
