'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, Search, Plus, Home, Plane, Zap } from 'lucide-react'
import { fetchTeamMatches } from '@/lib/match-notes-data'

interface MatchData {
  opponent: string
  match_date: string
  is_home: boolean
  goals_for: number | null
  goals_against: number | null
  jornada: number | null
  competition: string | null
  group_name: string | null
}

interface FcfMatch {
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

export default function StepSelectMatch({
  clubName,
  value,
  onChange,
}: {
  clubName: string
  value: MatchData | null
  onChange: (data: MatchData) => void
}) {
  const [matches, setMatches] = useState<FcfMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [manualMode, setManualMode] = useState(false)
  const [manualForm, setManualForm] = useState({ opponent: '', date: '', isHome: true })
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!clubName) {
      setLoading(false)
      setManualMode(true)
      return
    }
    fetchTeamMatches(clubName)
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoading(false))
  }, [clubName])

  const today = new Date().toISOString().slice(0, 10)

  const recentMatches = matches
    .filter((m) => {
      if (!m.match_date) return false
      const d = m.match_date.includes('-') && m.match_date.length === 10
        ? (m.match_date[4] === '-' ? m.match_date : m.match_date.split('-').reverse().join('-'))
        : m.match_date
      return d <= today
    })
    .slice(0, 10)

  const upcomingMatches = matches
    .filter((m) => {
      if (!m.match_date) return false
      const d = m.match_date.includes('-') && m.match_date.length === 10
        ? (m.match_date[4] === '-' ? m.match_date : m.match_date.split('-').reverse().join('-'))
        : m.match_date
      return d > today
    })
    .reverse()
    .slice(0, 5)

  const filteredRecent = search
    ? recentMatches.filter(
        (m) =>
          m.home_team.toLowerCase().includes(search.toLowerCase()) ||
          m.away_team.toLowerCase().includes(search.toLowerCase())
      )
    : recentMatches

  const filteredUpcoming = search
    ? upcomingMatches.filter(
        (m) =>
          m.home_team.toLowerCase().includes(search.toLowerCase()) ||
          m.away_team.toLowerCase().includes(search.toLowerCase())
      )
    : upcomingMatches

  function selectMatch(m: FcfMatch) {
    const isHome = m.home_team.toLowerCase().includes(clubName.toLowerCase())
    const opponent = isHome ? m.away_team : m.home_team

    // Normalize date to DD-MM-YYYY
    let dateStr = m.match_date
    if (dateStr && dateStr[4] === '-') {
      const [y, mo, d] = dateStr.split('-')
      dateStr = `${d}-${mo}-${y}`
    }

    onChange({
      opponent,
      match_date: dateStr,
      is_home: isHome,
      goals_for: isHome ? m.home_score : m.away_score,
      goals_against: isHome ? m.away_score : m.home_score,
      jornada: m.jornada ?? null,
      competition: m.competition ?? null,
      group_name: m.group_name ?? null,
    })
  }

  function selectManual() {
    if (!manualForm.opponent || !manualForm.date) return
    const [y, mo, d] = manualForm.date.split('-')
    onChange({
      opponent: manualForm.opponent,
      match_date: `${d}-${mo}-${y}`,
      is_home: manualForm.isHome,
      goals_for: null,
      goals_against: null,
      jornada: null,
      competition: null,
      group_name: null,
    })
  }

  const isSelected = (m: FcfMatch) => {
    if (!value) return false
    const isHome = m.home_team.toLowerCase().includes(clubName.toLowerCase())
    const opponent = isHome ? m.away_team : m.home_team
    return value.opponent === opponent && value.match_date.includes(m.match_date.slice(0, 5))
  }

  function formatDate(d: string) {
    if (!d) return ''
    if (d[4] === '-') {
      const [y, mo, day] = d.split('-')
      return `${day}/${mo}/${y}`
    }
    const [day, mo, y] = d.split('-')
    return `${day}/${mo}/${y}`
  }

  // Check if a match has acta data available (has scores)
  function hasActa(m: FcfMatch) {
    return m.home_score !== null && m.away_score !== null
  }

  function MatchCard({ m }: { m: FcfMatch }) {
    const isHome = m.home_team.toLowerCase().includes(clubName.toLowerCase())
    const opponent = isHome ? m.away_team : m.home_team
    const selected = isSelected(m)
    const hasScore = m.home_score !== null && m.away_score !== null
    const goalsFor = isHome ? m.home_score : m.away_score
    const goalsAgainst = isHome ? m.away_score : m.home_score
    const actaAvailable = hasActa(m)

    return (
      <button
        onClick={() => selectMatch(m)}
        className={`w-full text-left p-4 rounded-xl border transition-all ${
          selected
            ? 'bg-green-500/10 border-green-500/40'
            : 'bg-white/3 border-white/8 hover:border-white/20 hover:bg-white/5'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isHome ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-semibold">LOCAL</span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-semibold">VISITANT</span>
            )}
            {m.jornada && <span className="text-[10px] text-slate-600">J{m.jornada}</span>}
            {actaAvailable && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold flex items-center gap-0.5">
                <Zap size={8} />
                ACTA
              </span>
            )}
          </div>
          {hasScore && (
            <span className={`text-sm font-bold ${
              goalsFor! > goalsAgainst! ? 'text-green-400' : goalsFor === goalsAgainst ? 'text-amber-400' : 'text-red-400'
            }`}>
              {goalsFor} - {goalsAgainst}
            </span>
          )}
        </div>
        <p className="font-semibold text-white text-sm mb-1">{opponent}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Calendar size={10} />
          {formatDate(m.match_date)}
        </div>
      </button>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Selecciona el partit</h2>
      <p className="text-sm text-slate-400 mb-2">
        Tria un partit del calendari o afegeix-ne un manualment.
      </p>
      <p className="text-xs text-amber-400/80 mb-6 flex items-center gap-1.5">
        <Zap size={11} />
        Els partits amb <span className="font-bold">ACTA</span> es pre-carreguen automaticament amb gols, targetes i substitucions.
      </p>

      {/* Search */}
      {!manualMode && matches.length > 0 && (
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cercar rival..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500/50 transition-all"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : manualMode ? (
        /* Manual entry form */
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
            <Plus size={14} className="text-green-400" />
            Afegir partit manualment
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Rival</label>
              <input
                type="text"
                placeholder="Nom de l'equip rival"
                value={manualForm.opponent}
                onChange={(e) => setManualForm({ ...manualForm, opponent: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Data del partit</label>
              <input
                type="date"
                value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-green-500/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Condicio</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setManualForm({ ...manualForm, isHome: true })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    manualForm.isHome
                      ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                      : 'bg-white/5 text-slate-500 border border-white/10'
                  }`}
                >
                  <Home size={14} />
                  Local
                </button>
                <button
                  onClick={() => setManualForm({ ...manualForm, isHome: false })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    !manualForm.isHome
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'bg-white/5 text-slate-500 border border-white/10'
                  }`}
                >
                  <Plane size={14} />
                  Visitant
                </button>
              </div>
            </div>
            <button
              onClick={selectManual}
              disabled={!manualForm.opponent || !manualForm.date}
              className="w-full py-2.5 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 disabled:opacity-30 text-white text-sm font-semibold rounded-xl transition-all"
            >
              Seleccionar
            </button>
          </div>
          {matches.length > 0 && (
            <button
              onClick={() => setManualMode(false)}
              className="mt-4 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Tornar al calendari
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming matches */}
          {filteredUpcoming.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin size={12} /> Proxims
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredUpcoming.map((m) => (
                  <MatchCard key={m.id} m={m} />
                ))}
              </div>
            </div>
          )}

          {/* Recent matches */}
          {filteredRecent.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar size={12} /> Recents
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredRecent.map((m) => (
                  <MatchCard key={m.id} m={m} />
                ))}
              </div>
            </div>
          )}

          {/* Manual add button */}
          <button
            onClick={() => setManualMode(true)}
            className="w-full py-3 border border-dashed border-white/15 rounded-xl text-sm text-slate-400 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            Afegir manualment
          </button>
        </div>
      )}

      {/* Selected match preview */}
      {value && (
        <div className="mt-6 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
          <p className="text-xs text-green-400 font-semibold mb-1">Partit seleccionat</p>
          <p className="text-white font-bold">
            {value.is_home ? clubName : value.opponent} vs {value.is_home ? value.opponent : clubName}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {formatDate(value.match_date)} · {value.is_home ? 'Local' : 'Visitant'}
            {value.goals_for !== null && ` · ${value.goals_for} - ${value.goals_against}`}
          </p>
        </div>
      )}
    </div>
  )
}
