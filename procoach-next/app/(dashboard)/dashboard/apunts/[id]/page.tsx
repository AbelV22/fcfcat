'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Edit3, Calendar, Users, Target, Clock,
  MapPin, Star, MessageSquare,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { fetchMatchNote } from '@/lib/match-notes-data'
import type { MatchNoteFull } from '@/lib/match-notes-types'
import { EVENT_LABELS, GOAL_TYPE_LABELS, TACTICAL_LABELS, PLAYER_TAGS } from '@/lib/match-notes-types'
import MatchStatsDisplay from '@/components/apunts/MatchStatsDisplay'

export default function ViewNotePage() {
  const router = useRouter()
  const params = useParams()
  const noteId = params.id as string
  const [note, setNote] = useState<MatchNoteFull | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const isAdmin = document.cookie.includes('ns_admin=1')
      if (!isAdmin) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }
      }

      try {
        const data = await fetchMatchNote(noteId)
        if (!data) { router.replace('/dashboard/apunts'); return }
        setNote(data)
      } catch { router.replace('/dashboard/apunts') }
      setLoading(false)
    }
    load()
  }, [noteId, router])

  if (loading || !note) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  function formatDate(d: string) {
    if (!d) return ''
    if (d[4] === '-') { const [y, mo, day] = d.split('-'); return `${day}/${mo}/${y}` }
    const [day, mo, y] = d.split('-'); return `${day}/${mo}/${y}`
  }

  const resultColor = note.goals_for !== null && note.goals_against !== null
    ? note.goals_for > note.goals_against ? 'text-green-400' : note.goals_for === note.goals_against ? 'text-amber-400' : 'text-red-400'
    : 'text-slate-400'

  const starters = note.lineups.filter(l => l.is_starter && l.player_name)
  const bench = note.lineups.filter(l => !l.is_starter && l.player_name)
  const tagMap = Object.fromEntries(PLAYER_TAGS.map(t => [t.key, t.label]))

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <header className="border-b border-white/8 bg-[#0a1628]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard/apunts" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /> Apunts
          </Link>
          <span className="text-sm font-semibold text-white">vs {note.opponent}</span>
          <Link
            href={`/dashboard/apunts/nou?edit=${note.id}`}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
          >
            <Edit3 size={12} /> Editar
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="text-center">
          <p className={`text-5xl font-black ${resultColor}`}>
            {note.goals_for ?? '?'} — {note.goals_against ?? '?'}
          </p>
          <p className="text-lg font-bold text-white mt-2">vs {note.opponent}</p>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(note.match_date)}</span>
            <span className={note.is_home ? 'text-green-500/60' : 'text-blue-500/60'}>
              {note.is_home ? 'Local' : 'Visitant'}
            </span>
            {note.formation && <span className="flex items-center gap-1"><Users size={11} /> {note.formation}</span>}
            {note.overall_rating && <span className="flex items-center gap-1"><Star size={11} /> {note.overall_rating}/10</span>}
          </div>
          {note.tactical_approach && (
            <span className="inline-block mt-2 px-3 py-1 bg-white/5 rounded-full text-xs text-slate-400">
              {TACTICAL_LABELS[note.tactical_approach as keyof typeof TACTICAL_LABELS] || note.tactical_approach}
            </span>
          )}
        </div>

        {/* Lineups */}
        {starters.length > 0 && (
          <section className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users size={12} /> Alineació titulars
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {starters.map((l) => (
                <div key={l.player_name} className="flex items-center gap-2 py-1.5 px-2 bg-white/3 rounded-lg">
                  <span className="text-[9px] font-bold text-green-400 w-6">{l.role || '—'}</span>
                  <span className="text-xs text-white truncate">{l.player_name}</span>
                </div>
              ))}
            </div>
            {bench.length > 0 && (
              <>
                <p className="text-[10px] text-slate-600 mt-3 mb-1.5">Banqueta</p>
                <div className="flex flex-wrap gap-1.5">
                  {bench.map((l) => (
                    <span key={l.player_name} className="text-[11px] px-2 py-0.5 bg-white/3 text-slate-400 rounded">
                      {l.player_name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* Events */}
        {note.events.length > 0 && (
          <section className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target size={12} /> Esdeveniments
            </h3>
            <div className="space-y-2">
              {note.events.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-1.5">
                  <span className="text-xs font-mono text-slate-600 w-8 text-right">{e.minute}&apos;</span>
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-white">{e.player_name}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      {EVENT_LABELS[e.event_type]}
                      {e.goal_type && ` · ${GOAL_TYPE_LABELS[e.goal_type]}`}
                      {e.secondary_player && ` → ${e.secondary_player}`}
                    </span>
                    {e.note && <p className="text-[10px] text-slate-600 mt-0.5">{e.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Match Stats */}
        <MatchStatsDisplay note={note} events={note.events} />

        {/* Ratings */}
        {note.ratings.length > 0 && (
          <section className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Star size={12} /> Valoracions
            </h3>
            <div className="space-y-2">
              {note.ratings.sort((a, b) => b.rating - a.rating).map((r) => {
                const rColor = r.rating <= 3 ? '#f87171' : r.rating <= 5 ? '#fbbf24' : r.rating <= 8 ? '#4ade80' : '#22d3ee'
                return (
                  <div key={r.id} className="flex items-start gap-3 py-2 px-3 bg-white/3 rounded-lg">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                      style={{ backgroundColor: rColor + '20', color: rColor }}>
                      {r.rating}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">{r.player_name}</p>
                      {r.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.tags.map((t) => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 bg-white/5 text-slate-500 rounded">
                              {tagMap[t] || t}
                            </span>
                          ))}
                        </div>
                      )}
                      {r.note && <p className="text-[10px] text-slate-500 mt-1">{r.note}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Tactical notes */}
        {(note.key_moments || note.opponent_analysis || note.areas_to_improve) && (
          <section className="glass-card rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={12} /> Notes tàctiques
            </h3>
            {note.key_moments && (
              <div>
                <p className="text-[10px] text-slate-600 mb-1">Moments clau</p>
                <p className="text-xs text-slate-300 whitespace-pre-wrap">{note.key_moments}</p>
              </div>
            )}
            {note.opponent_analysis && (
              <div>
                <p className="text-[10px] text-slate-600 mb-1">Anàlisi del rival</p>
                <p className="text-xs text-slate-300 whitespace-pre-wrap">{note.opponent_analysis}</p>
              </div>
            )}
            {note.areas_to_improve && (
              <div>
                <p className="text-[10px] text-slate-600 mb-1">Àrees de millora</p>
                <p className="text-xs text-slate-300 whitespace-pre-wrap">{note.areas_to_improve}</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
