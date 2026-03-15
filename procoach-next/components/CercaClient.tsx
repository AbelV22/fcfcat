'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Shield, Users, Trophy, ArrowRight } from 'lucide-react'

type TabType = 'all' | 'arbitre' | 'jugador' | 'equip'

interface CercaClientProps {
  referees: any[]
  players: any[]
  teams: any[]
}

export default function CercaClient({ referees, players, teams }: CercaClientProps) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TabType>('all')

  const q = query.toLowerCase().trim()

  const filteredRefs = useMemo(() => {
    if (!q) return type === 'arbitre' ? referees.slice(0, 30) : []
    return referees.filter(r => r.name.toLowerCase().includes(q)).slice(0, 20)
  }, [q, type, referees])

  const filteredPlayers = useMemo(() => {
    if (!q) return type === 'jugador' ? players.slice(0, 30) : []
    return players.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20)
  }, [q, type, players])

  const filteredTeams = useMemo(() => {
    if (!q) return type === 'equip' ? teams.slice(0, 30) : []
    return teams.filter(t => t.name.toLowerCase().includes(q)).slice(0, 20)
  }, [q, type, teams])

  const total = filteredRefs.length + filteredPlayers.length + filteredTeams.length

  return (
    <>
      {/* Search hero */}
      <div className="bg-gradient-to-b from-[#0a1628] to-[#0f172a] border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-4">
            {q ? (
              <>
                <span className="text-slate-400 font-normal text-lg sm:text-xl block mb-1">Resultats per a</span>
                &ldquo;{query}&rdquo;
              </>
            ) : 'Cerca'}
          </h1>

          <div className="flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                type="search"
                placeholder="Equip, jugador o àrbitre..."
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-white/6 border border-white/12 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/60 focus:bg-white/8 transition-all text-sm"
              />
            </div>
            <div className="px-4 py-3 bg-green-600 text-white rounded-xl shrink-0 font-medium text-sm flex items-center">
              <ArrowRight size={16} />
            </div>
          </div>

          {q && (
            <p className="text-slate-500 text-sm mt-2">
              {total} resultat{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Type tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { key: 'all' as TabType, label: 'Tot', icon: <Search size={13} /> },
            { key: 'arbitre' as TabType, label: 'Àrbitres', icon: <Shield size={13} /> },
            { key: 'jugador' as TabType, label: 'Jugadors', icon: <Users size={13} /> },
            { key: 'equip' as TabType, label: 'Equips', icon: <Trophy size={13} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setType(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0
                ${type === tab.key
                  ? 'bg-green-600 text-white shadow-lg shadow-green-900/30'
                  : 'bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:bg-white/8'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-8">

          {/* Referees */}
          {filteredRefs.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield size={14} className="text-purple-400" />
                Àrbitres ({filteredRefs.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredRefs.map(ref => (
                  <Link
                    key={ref.slug}
                    href={`/arbitre/${ref.slug}`}
                    className="glass-card rounded-xl p-4 hover:border-purple-500/30 transition-all flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-sm shrink-0">
                      {ref.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{ref.name}</div>
                      <div className="text-xs text-slate-500">{ref.matches} partits · 🟨 {ref.yellows_per_match}/part</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Players */}
          {filteredPlayers.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users size={14} className="text-blue-400" />
                Jugadors ({filteredPlayers.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredPlayers.map((player, i) => (
                  <Link
                    key={`${player.slug}-${player.teamSlug}-${i}`}
                    href={`/equip/${player.teamSlug}`}
                    className="glass-card rounded-xl p-4 hover:border-blue-500/30 transition-all flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                      {player.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{player.name}</div>
                      <div className="text-xs text-slate-500 truncate">{player.team} · {player.appearances} partits</div>
                    </div>
                    {player.goals > 0 && (
                      <div className="text-sm font-bold text-green-400 shrink-0">⚽ {player.goals}</div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Teams */}
          {filteredTeams.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Trophy size={14} className="text-green-400" />
                Equips ({filteredTeams.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredTeams.map(team => (
                  <Link
                    key={team.slug}
                    href={`/equip/${team.slug}`}
                    className="glass-card rounded-xl p-4 hover:border-green-500/30 transition-all flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-600/20 flex items-center justify-center text-green-400 font-bold text-sm shrink-0">
                      {team.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{team.name}</div>
                      <div className="text-xs text-slate-500 truncate">{team.competitionName || team.competition}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {total === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-slate-500" />
              </div>
              <p className="text-slate-400 mb-2">
                {q ? `No s'han trobat resultats per "${query}"` : 'Escriu per cercar equips, jugadors o àrbitres'}
              </p>
              <p className="text-sm text-slate-600">Prova amb un nom parcial o canvia la categoria</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
