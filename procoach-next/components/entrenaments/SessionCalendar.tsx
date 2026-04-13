'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Plus, Clock, Trash2, Eye, CircleDot } from 'lucide-react'
import type { TrainingSession } from '@/lib/training-types'
import {
  SESSION_TYPE_LABELS, INTENSITY_COLORS, SESSION_STATUS_LABELS,
  DAY_LABELS_SHORT, DAY_LABELS_FULL,
  parseDate, formatDate,
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
  weekStart: Date
  sessions: TrainingSession[]
  calendarMatches: CalendarMatch[]
  clubName: string | null
  onDeleteSession: (id: string) => void
}

export default function SessionCalendar({ weekStart, sessions, calendarMatches, clubName, onDeleteSession }: Props) {
  // Build 7 days starting from weekStart
  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div
      className="calendar-week-grid"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, overflow: 'hidden', width: '100%' }}
    >
      {days.map((day, idx) => {
        const dateStr = formatDate(day)
        const isToday = day.getTime() === today.getTime()

        // Find sessions for this day
        const daySessions = sessions.filter(s => s.session_date === dateStr)

        // Find matches for this day (convert fcf_matches date format)
        const dayMatches = calendarMatches.filter(m => {
          if (!m.match_date) return false
          // fcf_matches stores dates as YYYY-MM-DD or DD-MM-YYYY
          const mDate = m.match_date.includes('/') ? m.match_date :
            m.match_date.length === 10 && m.match_date[4] === '-'
              ? `${m.match_date.substring(8, 10)}-${m.match_date.substring(5, 7)}-${m.match_date.substring(0, 4)}`
              : m.match_date
          return mDate === dateStr
        })

        const hasMatch = dayMatches.length > 0

        return (
          <div
            key={idx}
            style={{
              background: hasMatch
                ? 'rgba(34,197,94,0.04)'
                : isToday
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(255,255,255,0.02)',
              border: isToday
                ? '1px solid rgba(34,197,94,0.3)'
                : hasMatch
                  ? '1px solid rgba(34,197,94,0.12)'
                  : '1px solid rgba(255,255,255,0.04)',
              borderRadius: 6,
              padding: 6,
              minHeight: 100,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Day header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <span style={{
                  fontSize: 10, color: '#62666d', fontWeight: 510,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {DAY_LABELS_SHORT[idx]}
                </span>
                <span style={{
                  marginLeft: 4,
                  fontSize: 13, fontWeight: 510,
                  color: isToday ? '#22c55e' : '#d0d6e0',
                  fontFamily: 'var(--font-inter)',
                }}>
                  {day.getDate()}
                </span>
              </div>
              <Link
                href={`/dashboard/entrenaments/nova-sessio?date=${dateStr}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 22, height: 22, borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)',
                  color: '#62666d', textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                title="Afegir sessio"
              >
                <Plus size={13} />
              </Link>
            </div>

            {/* Match indicator */}
            {hasMatch && dayMatches.map((m, mi) => {
              const isHome = clubName && m.home_team?.toLowerCase().includes(clubName.toLowerCase())
              const opponent = isHome ? m.away_team : m.home_team
              return (
                <div key={mi} style={{
                  padding: '4px 6px', borderRadius: 4, marginBottom: 4,
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.15)',
                  fontSize: 10, color: '#22c55e', fontWeight: 510,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <CircleDot size={10} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.jornada ? `J${m.jornada} ` : ''}
                    {isHome ? 'vs' : '@'} {opponent?.split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
              )
            })}

            {/* Sessions */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {daySessions.map(session => {
                const intensityColor = INTENSITY_COLORS[session.planned_intensity] || '#8a8f98'
                const isCompleted = session.status === 'completed'
                return (
                  <Link
                    key={session.id}
                    href={`/dashboard/entrenaments/${session.id}`}
                    style={{
                      display: 'block', padding: '5px 6px', borderRadius: 4,
                      background: 'rgba(255,255,255,0.03)',
                      borderLeft: `3px solid ${intensityColor}`,
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                      opacity: isCompleted ? 0.7 : 1,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  >
                    <div style={{ fontSize: 11, fontWeight: 510, color: '#d0d6e0', marginBottom: 2, fontFamily: 'var(--font-inter)' }}>
                      {session.title || SESSION_TYPE_LABELS[session.session_type]}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#62666d' }}>
                      <Clock size={9} />
                      {session.duration_min}min
                      {isCompleted && (
                        <span style={{ color: '#22c55e', marginLeft: 'auto' }}>✓</span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}

      <style>{`
        @media (max-width: 640px) {
          .calendar-week-grid {
            gap: 1px !important;
          }
          .calendar-week-grid > * {
            padding: 4px !important;
            min-height: 80px !important;
          }
        }
      `}</style>
    </div>
  )
}
