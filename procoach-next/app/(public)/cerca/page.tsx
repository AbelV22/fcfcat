import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, Shield, Users, Trophy } from 'lucide-react'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import { getAllReferees, getAllPlayers, getAllTeams } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Cerca — Equips, Jugadors i Àrbitres',
  description: 'Busca qualsevol equip, jugador o àrbitre del futbol català.',
}

interface Props {
  searchParams: Promise<{ q?: string; type?: string }>
}

export default async function CercaPage({ searchParams }: Props) {
  const { q = '', type = 'all' } = await searchParams
  const query = q.toLowerCase().trim()

  const referees = getAllReferees()
  const players = getAllPlayers()
  const teams = getAllTeams()

  const filteredRefs = query
    ? referees.filter(r => r.name.toLowerCase().includes(query)).slice(0, 20)
    : (type === 'arbitre' ? referees.slice(0, 30) : [])

  const filteredPlayers = query
    ? players.filter(p => p.name.toLowerCase().includes(query)).slice(0, 20)
    : (type === 'jugador' ? players.slice(0, 30) : [])

  const filteredTeams = query
    ? teams.filter(t => t.name.toLowerCase().includes(query)).slice(0, 20)
    : (type === 'equip' ? teams.slice(0, 30) : [])

  const total = filteredRefs.length + filteredPlayers.length + filteredTeams.length

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <PublicHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">

        <h1 className="text-3xl font-black text-white mb-2">Cerca</h1>
        {query && (
          <p className="text-slate-400 mb-6">
            {total} resultats per a <strong className="text-white">"{q}"</strong>
          </p>
        )}

        {/* Type tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { key: 'all', label: 'Tot', icon: <Search size={14} /> },
            { key: 'arbitre', label: 'Àrbitres', icon: <Shield size={14} /> },
            { key: 'jugador', label: 'Jugadors', icon: <Users size={14} /> },
            { key: 'equip', label: 'Equips', icon: <Trophy size={14} /> },
          ].map(tab => (
            <Link
              key={tab.key}
              href={`/cerca?q=${encodeURIComponent(q)}&type=${tab.key}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${type === tab.key
                  ? 'bg-green-600 text-white'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/8'
                }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Results */}
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
                {filteredPlayers.map(player => (
                  <Link
                    key={`${player.slug}-${player.teamSlug}`}
                    href={`/jugador/${player.slug}`}
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
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-slate-500" />
              </div>
              <p className="text-slate-400 mb-2">
                {query ? `No s'han trobat resultats per "${q}"` : 'Escriu per cercar equipos, jugadors o àrbitres'}
              </p>
              <p className="text-sm text-slate-600">Prova amb un nom parcial o canvia la categoria</p>
            </div>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
