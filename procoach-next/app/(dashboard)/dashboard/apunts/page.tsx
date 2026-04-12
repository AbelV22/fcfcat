'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, ArrowLeft, ListOrdered, ClipboardList, Calendar,
  Users, TrendingUp, BarChart3, Trash2, CheckCircle2,
  FileEdit, CircleDot, Home, Plane, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchUserMatchNotes, fetchTeamMatches, deleteMatchNote } from '@/lib/match-notes-data'
import type { MatchNote } from '@/lib/match-notes-types'
import DashboardPlayerCard from '@/components/apunts/DashboardPlayerCard'
import DashboardTeamSummary from '@/components/apunts/DashboardTeamSummary'
import DashboardTrends from '@/components/apunts/DashboardTrends'

type Tab = 'apunts' | 'jugadors' | 'equip' | 'tendencies'

interface CalendarMatch {
  id: string
  home_team: string
  away_team: string
  match_date: string
  home_score: number | null
  away_score: number | null
  jornada: number | null
  status: string | null
  competition: string | null
  group_name: string | null
}

interface MergedMatch {
  calendarMatch: CalendarMatch | null
  note: MatchNote | null
  opponent: string
  matchDate: string
  isHome: boolean
  goalsFor: number | null
  goalsAgainst: number | null
  jornada: number | null
  isPast: boolean
  competition: string | null
  group_name: string | null
}

const TABS: { key: Tab; label: string; icon: typeof ClipboardList }[] = [
  { key: 'apunts', label: 'Calendari', icon: Calendar },
  { key: 'jugadors', label: 'Jugadors', icon: Users },
  { key: 'equip', label: 'Equip', icon: BarChart3 },
  { key: 'tendencies', label: 'Tendències', icon: TrendingUp },
]

export default function ApuntsPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<MatchNote[]>([])
  const [calendarMatches, setCalendarMatches] = useState<CalendarMatch[]>([])
  const [merged, setMerged] = useState<MergedMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('apunts')
  const [clubName, setClubName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function load() {
      const adminDetected = document.cookie.includes('ns_admin=1')
      setIsAdmin(adminDetected)
      let name = ''

      if (!adminDetected) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }
        name = user.user_metadata?.club_name || ''
      } else {
        // In admin mode, use real team name from cookie set in /dashboard/setup
        const teamCookie = document.cookie.match(/(?:^|;\s*)ns_team_name=([^;]+)/)
        name = teamCookie ? decodeURIComponent(teamCookie[1]) : ''
      }
      setClubName(name)

      // Fetch notes and matches independently so one failure doesn't block the other
      const [notesResult, matchesResult] = await Promise.allSettled([
        adminDetected
          ? fetch('/api/admin/match-notes').then(r => r.ok ? r.json() : [])
          : fetchUserMatchNotes(),
        name ? fetchTeamMatches(name) : Promise.resolve([]),
      ])

      const notesData = notesResult.status === 'fulfilled' ? notesResult.value : []
      const matchesData = matchesResult.status === 'fulfilled' ? matchesResult.value : []

      if (notesResult.status === 'rejected') console.error('Error loading notes:', notesResult.reason)
      if (matchesResult.status === 'rejected') console.error('Error loading matches:', matchesResult.reason)

      setNotes(notesData)
      setCalendarMatches(matchesData)

      // Merge calendar + notes
      const mergedList = mergeCalendarWithNotes(matchesData, notesData, name)
      setMerged(mergedList)
      setLoading(false)
    }
    load()
  }, [router])

  function mergeCalendarWithNotes(
    matches: CalendarMatch[],
    notes: MatchNote[],
    teamName: string
  ): MergedMatch[] {
    const today = new Date().toISOString().slice(0, 10)
    const notesByOpponentDate = new Map<string, MatchNote>()

    for (const n of notes) {
      // Normalize date to YYYY-MM-DD for matching
      const d = n.match_date[4] === '-' ? n.match_date : n.match_date.split('-').reverse().join('-')
      notesByOpponentDate.set(`${n.opponent.toLowerCase()}|${d}`, n)
    }

    const result: MergedMatch[] = []
    const usedNoteIds = new Set<string>()

    // From calendar matches
    for (const m of matches) {
      const isHome = m.home_team.toLowerCase().includes(teamName.toLowerCase())
      const opponent = isHome ? m.away_team : m.home_team
      const dateISO = m.match_date[4] === '-' ? m.match_date : m.match_date.split('-').reverse().join('-')

      // Find matching note
      const key = `${opponent.toLowerCase()}|${dateISO}`
      const note = notesByOpponentDate.get(key) || null
      if (note) usedNoteIds.add(note.id)

      result.push({
        calendarMatch: m,
        note,
        opponent,
        matchDate: dateISO,
        isHome,
        goalsFor: isHome ? m.home_score : m.away_score,
        goalsAgainst: isHome ? m.away_score : m.home_score,
        jornada: m.jornada,
        isPast: dateISO <= today,
        competition: m.competition,
        group_name: m.group_name,
      })
    }

    // Notes without calendar match (manually added)
    for (const n of notes) {
      if (usedNoteIds.has(n.id)) continue
      const d = n.match_date[4] === '-' ? n.match_date : n.match_date.split('-').reverse().join('-')
      result.push({
        calendarMatch: null,
        note: n,
        opponent: n.opponent,
        matchDate: d,
        isHome: n.is_home,
        goalsFor: n.goals_for,
        goalsAgainst: n.goals_against,
        jornada: null,
        isPast: d <= today,
        competition: null,
        group_name: null,
      })
    }

    // Sort by date descending (most recent first)
    result.sort((a, b) => b.matchDate.localeCompare(a.matchDate))
    return result
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Segur que vols eliminar aquests apunts?')) return
    try {
      if (isAdmin) {
        await fetch(`/api/admin/match-notes?id=${id}`, { method: 'DELETE' })
      } else {
        await deleteMatchNote(id)
      }
      setNotes(notes.filter((n) => n.id !== id))
      setMerged(merged.map((m) => m.note?.id === id ? { ...m, note: null } : m))
    } catch (err) {
      console.error('Error deleting note:', err)
    }
  }

  function handleMatchClick(m: MergedMatch) {
    if (m.note) {
      // Has notes -> go to view
      router.push(`/dashboard/apunts/${m.note.id}`)
    } else {
      // No notes -> go to wizard pre-filled
      const params = new URLSearchParams({
        opponent: m.opponent,
        date: m.matchDate,
        home: m.isHome ? '1' : '0',
        ...(m.goalsFor !== null ? { gf: String(m.goalsFor) } : {}),
        ...(m.goalsAgainst !== null ? { ga: String(m.goalsAgainst) } : {}),
        ...(m.jornada !== null ? { jornada: String(m.jornada) } : {}),
        ...(m.competition ? { comp: m.competition } : {}),
        ...(m.group_name ? { group: m.group_name } : {}),
      })
      router.push(`/dashboard/apunts/nou?${params.toString()}`)
    }
  }

  function formatDate(d: string) {
    if (!d) return ''
    if (d[4] === '-') {
      const [y, mo, day] = d.split('-')
      return `${day}/${mo}`
    }
    const [day, mo] = d.split('-')
    return `${day}/${mo}`
  }

  function formatFullDate(d: string) {
    if (!d) return ''
    if (d[4] === '-') {
      const [y, mo, day] = d.split('-')
      return `${day}/${mo}/${y}`
    }
    const [day, mo, y] = d.split('-')
    return `${day}/${mo}/${y}`
  }

  const completedNotes = notes.filter((n) => n.status === 'completed')
  const pastMatches = merged.filter((m) => m.isPast)
  const futureMatches = merged.filter((m) => !m.isPast).reverse() // chronological for future

  // Stats
  const totalPast = pastMatches.length
  const completed = pastMatches.filter((m) => m.note?.status === 'completed').length
  const drafts = pastMatches.filter((m) => m.note?.status === 'draft').length
  const pending = totalPast - completed - drafts

  return (
    <div className="min-h-screen bg-[#08090a]">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#0f1011]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-[#8a8f98] hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} />
            Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <ListOrdered size={14} className="text-green-400" />
            <span className="text-sm font-medium text-white">Apunts de Partit</span>
          </div>
          <Link
            href="/dashboard/apunts/nou"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22c55e] hover:bg-[#34d399] text-white text-xs font-medium rounded-lg transition-all"
          >
            <Plus size={12} />
            Nou
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-white/3 rounded-lg p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === key
                  ? 'bg-white/8 text-white'
                  : 'text-[#62666d] hover:text-[#d0d6e0]'
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'apunts' ? (
          <div>
            {/* Progress bar */}
            {totalPast > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#62666d]">Progrés dels apunts</span>
                  <span className="text-xs font-medium text-green-400">{completed}/{totalPast} completats</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
                  {completed > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-[#22c55e]"
                      style={{ width: `${(completed / totalPast) * 100}%` }}
                    />
                  )}
                  {drafts > 0 && (
                    <div
                      className="h-full bg-amber-500/50"
                      style={{ width: `${(drafts / totalPast) * 100}%` }}
                    />
                  )}
                </div>
                <div className="flex gap-4 mt-2">
                  <span className="text-[10px] text-[#62666d] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> {completed} completats
                  </span>
                  <span className="text-[10px] text-[#62666d] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> {drafts} esborranys
                  </span>
                  <span className="text-[10px] text-[#62666d] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-white/10" /> {pending} per omplir
                  </span>
                </div>
              </div>
            )}

            {merged.length === 0 ? (
              <div className="text-center py-16">
                <Calendar size={40} className="text-[#62666d] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No hi ha partits al calendari</h3>
                <p className="text-sm text-[#62666d] mb-6">
                  Configura el teu equip al dashboard per carregar el calendari automàticament, o crea apunts manualment.
                </p>
                <Link
                  href="/dashboard/apunts/nou"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#22c55e] hover:bg-[#34d399] text-white font-medium rounded-lg transition-all"
                >
                  <Plus size={16} />
                  Crear apunts manualment
                </Link>
              </div>
            ) : (
              <>
                {/* Future matches */}
                {futureMatches.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xs font-medium text-[#62666d] uppercase tracking-wider mb-3">
                      Pròxims partits
                    </h3>
                    <div className="space-y-2">
                      {futureMatches.map((m, i) => (
                        <MatchRow key={`future-${i}`} match={m} clubName={clubName} onClick={() => handleMatchClick(m)} onDelete={m.note ? () => handleDelete(m.note!.id) : undefined} formatDate={formatDate} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Past matches */}
                {pastMatches.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-[#62666d] uppercase tracking-wider mb-3">
                      Partits jugats
                    </h3>
                    <div className="space-y-2">
                      {pastMatches.map((m, i) => (
                        <MatchRow key={`past-${i}`} match={m} clubName={clubName} onClick={() => handleMatchClick(m)} onDelete={m.note ? () => handleDelete(m.note!.id) : undefined} formatDate={formatDate} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === 'jugadors' ? (
          <DashboardPlayerCard notes={completedNotes} />
        ) : activeTab === 'equip' ? (
          <DashboardTeamSummary notes={completedNotes} />
        ) : (
          <DashboardTrends notes={completedNotes} />
        )}
      </div>
    </div>
  )
}

function MatchRow({
  match: m,
  clubName,
  onClick,
  onDelete,
  formatDate,
}: {
  match: MergedMatch
  clubName: string
  onClick: () => void
  onDelete?: () => void
  formatDate: (d: string) => string
}) {
  const noteStatus = m.note?.status
  const hasScore = m.goalsFor !== null && m.goalsAgainst !== null

  const statusConfig = noteStatus === 'completed'
    ? { icon: CheckCircle2, label: 'Completat', color: 'green', bg: 'bg-green-500/8 border-green-500/20' }
    : noteStatus === 'draft'
    ? { icon: FileEdit, label: 'Esborrany', color: 'amber', bg: 'bg-amber-500/8 border-amber-500/20' }
    : m.isPast
    ? { icon: CircleDot, label: 'Per omplir', color: 'slate', bg: 'bg-white/3 border-white/[0.06] hover:border-green-500/30' }
    : { icon: Calendar, label: 'Pròxim', color: 'cyan', bg: 'bg-[#22c55e]/5 border-[#22c55e]/15' }

  const StatusIcon = statusConfig.icon

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg border transition-all group text-left ${statusConfig.bg} ${
        !noteStatus && m.isPast ? 'hover:bg-green-500/5' : ''
      }`}
    >
      {/* Jornada */}
      <div className="w-8 text-center shrink-0">
        {m.jornada ? (
          <span className="text-[10px] text-[#62666d] font-mono">J{m.jornada}</span>
        ) : (
          <span className="text-[10px] text-[#62666d]">—</span>
        )}
      </div>

      {/* Date */}
      <div className="w-12 text-center shrink-0">
        <span className="text-xs text-[#8a8f98] font-medium">{formatDate(m.matchDate)}</span>
      </div>

      {/* Home/Away indicator */}
      <div className="shrink-0">
        {m.isHome ? (
          <Home size={12} className="text-green-500/50" />
        ) : (
          <Plane size={12} className="text-blue-500/50" />
        )}
      </div>

      {/* Opponent */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{m.opponent}</p>
      </div>

      {/* Score */}
      <div className="w-14 text-center shrink-0">
        {hasScore ? (
          <span className={`text-sm font-medium ${
            m.goalsFor! > m.goalsAgainst! ? 'text-green-400' :
            m.goalsFor === m.goalsAgainst ? 'text-amber-400' : 'text-red-400'
          }`}>
            {m.goalsFor} - {m.goalsAgainst}
          </span>
        ) : (
          <span className="text-xs text-[#62666d]">— : —</span>
        )}
      </div>

      {/* Status badge */}
      <div className="shrink-0 flex items-center gap-1.5">
        <StatusIcon
          size={14}
          style={{ color: `var(--color-${statusConfig.color}-400, #94a3b8)` }}
        />
        <span className="text-[10px] font-medium hidden sm:inline" style={{ color: `var(--color-${statusConfig.color}-400, #94a3b8)` }}>
          {statusConfig.label}
        </span>
      </div>

      {/* Arrow / Delete */}
      <div className="shrink-0 flex items-center gap-1">
        {onDelete && (
          <span
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="text-[#62666d] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1 cursor-pointer"
          >
            <Trash2 size={12} />
          </span>
        )}
        <ChevronRight size={14} className="text-[#62666d] group-hover:text-[#8a8f98] transition-colors" />
      </div>
    </button>
  )
}
