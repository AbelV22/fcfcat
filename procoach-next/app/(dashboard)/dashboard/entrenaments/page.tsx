'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Calendar, BookOpen, BarChart3, Layers,
  ChevronLeft, ChevronRight, CalendarDays, CalendarRange,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchUserSessions, fetchUserExercises, deleteSession } from '@/lib/training-data'
import { fetchTeamMatches } from '@/lib/match-notes-data'
import type { TrainingSession, TrainingExercise } from '@/lib/training-types'
import {
  SESSION_TYPE_LABELS, SESSION_STATUS_LABELS, INTENSITY_COLORS,
  DAY_LABELS_SHORT, MONTH_LABELS,
  parseDate, formatDate, getWeekStart, getWeekEnd,
} from '@/lib/training-types'
import SessionCalendar from '@/components/entrenaments/SessionCalendar'
import ExerciseLibrary from '@/components/entrenaments/ExerciseLibrary'
import TrainingAnalyticsDash from '@/components/entrenaments/TrainingAnalyticsDash'
import MicrocycleStrip from '@/components/entrenaments/MicrocycleStrip'
import MonthlyCalendar from '@/components/entrenaments/MonthlyCalendar'

type Tab = 'calendari' | 'biblioteca' | 'perioditzacio' | 'analitiques'

const TABS: { key: Tab; label: string; icon: typeof Calendar }[] = [
  { key: 'calendari', label: 'Calendari', icon: Calendar },
  { key: 'biblioteca', label: 'Biblioteca', icon: BookOpen },
  { key: 'perioditzacio', label: 'Perioditzacio', icon: Layers },
  { key: 'analitiques', label: 'Analitiques', icon: BarChart3 },
]

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

export default function EntrenamentsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('calendari')
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [exercises, setExercises] = useState<TrainingExercise[]>([])
  const [calendarMatches, setCalendarMatches] = useState<CalendarMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [clubName, setClubName] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()))
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  // Load data
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get club name from cookies or metadata
        const club = document.cookie.split(';').find(c => c.trim().startsWith('ns_team_name='))?.split('=')[1]?.trim()
        const decodedClub = club ? decodeURIComponent(club) : user.user_metadata?.club_name || null
        setClubName(decodedClub)

        const results = await Promise.allSettled([
          fetchUserSessions(),
          fetchUserExercises(),
          decodedClub ? fetchTeamMatches(decodedClub) : Promise.resolve([]),
        ])

        if (results[0].status === 'fulfilled') setSessions(results[0].value)
        if (results[1].status === 'fulfilled') setExercises(results[1].value)
        if (results[2].status === 'fulfilled') setCalendarMatches(results[2].value as CalendarMatch[])
      } catch (err) {
        console.error('Error loading training data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleDeleteSession = useCallback(async (id: string) => {
    if (!confirm('Eliminar aquesta sessio?')) return
    await deleteSession(id)
    setSessions(prev => prev.filter(s => s.id !== id))
  }, [])

  const handlePrevWeek = () => {
    setCurrentWeekStart(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const handleToday = () => {
    setCurrentWeekStart(getWeekStart(new Date()))
    setCurrentMonth(new Date())
  }

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() - 1)
      return d
    })
  }

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + 1)
      return d
    })
  }

  const weekEnd = getWeekEnd(currentWeekStart)
  const weekLabel = `${currentWeekStart.getDate()} ${MONTH_LABELS[currentWeekStart.getMonth()]} - ${weekEnd.getDate()} ${MONTH_LABELS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`

  return (
    <div style={{ padding: '16px 16px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: 24, fontWeight: 800, color: '#f7f8f8', letterSpacing: '-0.5px' }}>
          Entrenaments
        </h1>
        <Link
          href="/dashboard/entrenaments/nova-sessio"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: '#22c55e', color: '#08090a',
            borderRadius: 6, fontWeight: 510, fontSize: 13,
            textDecoration: 'none', transition: 'background 0.15s',
            fontFamily: 'var(--font-inter)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#34d399')}
          onMouseLeave={e => (e.currentTarget.style.background = '#22c55e')}
        >
          <Plus size={16} />
          Nova sessio
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 6,
                background: isActive ? 'rgba(34,197,94,0.08)' : 'transparent',
                border: isActive ? '1px solid rgba(34,197,94,0.2)' : '1px solid transparent',
                color: isActive ? '#22c55e' : '#8a8f98',
                fontSize: 13, fontWeight: 510, cursor: 'pointer',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-inter)',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#62666d', fontSize: 13 }}>
          Carregant...
        </div>
      ) : (
        <>
          {activeTab === 'calendari' && (
            <>
              {/* Navigation bar with view toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                {/* Left: prev/label/next */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={viewMode === 'week' ? handlePrevWeek : handlePrevMonth}
                    style={{ background: 'none', border: 'none', color: '#8a8f98', cursor: 'pointer', padding: 4, borderRadius: 4 }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 510, color: '#d0d6e0', fontFamily: 'var(--font-inter)', minWidth: 220, textAlign: 'center' }}>
                    {viewMode === 'week'
                      ? weekLabel
                      : `${MONTH_LABELS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`
                    }
                  </span>
                  <button
                    onClick={viewMode === 'week' ? handleNextWeek : handleNextMonth}
                    style={{ background: 'none', border: 'none', color: '#8a8f98', cursor: 'pointer', padding: 4, borderRadius: 4 }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Right: today + view toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={handleToday}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 510,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                      color: '#8a8f98', cursor: 'pointer', fontFamily: 'var(--font-inter)',
                    }}
                  >
                    Avui
                  </button>
                  <div style={{
                    display: 'flex', borderRadius: 6, overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <button
                      onClick={() => setViewMode('week')}
                      title="Setmana"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 28, border: 'none', cursor: 'pointer',
                        background: viewMode === 'week' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                        color: viewMode === 'week' ? '#22c55e' : '#62666d',
                        transition: 'all 0.15s',
                      }}
                    >
                      <CalendarRange size={14} />
                    </button>
                    <button
                      onClick={() => setViewMode('month')}
                      title="Mes"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 28, border: 'none', cursor: 'pointer',
                        borderLeft: '1px solid rgba(255,255,255,0.06)',
                        background: viewMode === 'month' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                        color: viewMode === 'month' ? '#22c55e' : '#62666d',
                        transition: 'all 0.15s',
                      }}
                    >
                      <CalendarDays size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {viewMode === 'week' ? (
                <>
                  <MicrocycleStrip
                    weekStart={currentWeekStart}
                    sessions={sessions}
                    calendarMatches={calendarMatches}
                    clubName={clubName}
                  />

                  <SessionCalendar
                    weekStart={currentWeekStart}
                    sessions={sessions}
                    calendarMatches={calendarMatches}
                    clubName={clubName}
                    onDeleteSession={handleDeleteSession}
                  />
                </>
              ) : (
                <MonthlyCalendar
                  currentMonth={currentMonth}
                  sessions={sessions}
                  calendarMatches={calendarMatches}
                  clubName={clubName}
                />
              )}
            </>
          )}

          {activeTab === 'biblioteca' && (
            <ExerciseLibrary
              exercises={exercises}
              onExercisesChange={setExercises}
            />
          )}

          {activeTab === 'perioditzacio' && (
            <div style={{ textAlign: 'center', padding: 60, color: '#62666d', fontSize: 13 }}>
              <Layers size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div>Perioditzacio — Properament</div>
            </div>
          )}

          {activeTab === 'analitiques' && (
            <TrainingAnalyticsDash sessions={sessions} exercises={exercises} />
          )}
        </>
      )}
    </div>
  )
}
