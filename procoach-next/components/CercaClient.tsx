'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Shield, Users, Trophy } from 'lucide-react'

type TabType = 'all' | 'arbitre' | 'jugador' | 'equip'

interface CercaClientProps {
  referees: any[]
  players: any[]
  teams: any[]
}

/** Strips accents and lowercases for accent-insensitive search.
 *  Works for Catalan/Spanish chars: à, è, í, ï, ó, ú, ñ, ç, l·l, etc.
 *  Strategy: normalize to NFC first (ensures precomposed chars), then NFD
 *  (decomposes into base + combining marks), then strip all combining marks. */
function norm(text: string) {
  return (text || '')
    .toLowerCase()
    .normalize('NFC')   // ensure all chars are precomposed first
    .normalize('NFD')   // decompose: ñ → n + ̃, à → a + ̀, ç → c + ̧
    .replace(/[\u0300-\u036f]/g, '')  // strip all combining diacritical marks
    .replace(/·/g, '')  // strip Catalan middle dot (l·l → ll)
}

function CercaInner({ referees, players, teams }: CercaClientProps) {
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(() => searchParams.get('q') || '')
  const [type, setType] = useState<TabType>(() => {
    const t = searchParams.get('type')
    return t === 'arbitre' || t === 'jugador' || t === 'equip' ? t : 'all'
  })

  const q = norm(query.trim())
  const browsing = !q

  const filteredRefs = useMemo(() => {
    if (type === 'jugador' || type === 'equip') return []
    if (!q) return referees.slice(0, type === 'all' ? 8 : 40)
    return referees.filter(r => norm(r.name).includes(q)).slice(0, 20)
  }, [q, type, referees])

  const filteredPlayers = useMemo(() => {
    if (type === 'arbitre' || type === 'equip') return []
    if (!q) return type === 'jugador' ? players.slice(0, 40) : []
    return players
      .filter(p => norm(p.name).includes(q) || norm(p.team).includes(q))
      .slice(0, 20)
  }, [q, type, players])

  const filteredTeams = useMemo(() => {
    if (type === 'arbitre' || type === 'jugador') return []
    if (!q) return teams.slice(0, type === 'all' ? 8 : 40)
    return teams.filter(t => norm(t.name).includes(q)).slice(0, 20)
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
                &ldquo;{query.trim()}&rdquo;
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
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0
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

        {/* Browse label */}
        {browsing && (
          <p className="text-xs text-slate-500 mb-4 uppercase tracking-wider font-medium">
            {type === 'all' ? 'Explorar' : type === 'arbitre' ? 'Tots els àrbitres' : type === 'jugador' ? 'Tots els jugadors' : 'Tots els equips'}
          </p>
        )}

        <div className="space-y-8">

          {/* Teams */}
          {filteredTeams.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Trophy size={14} className="text-green-400" />
                Equips {!browsing && `(${filteredTeams.length})`}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredTeams.map(team => (
                  <Link
                    key={team.slug}
                    href={`/equip/${team.slug}`}
                    className="glass-card rounded-xl p-3.5 hover:border-green-500/30 transition-all flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-green-600/20 flex items-center justify-center text-green-400 font-bold text-sm shrink-0">
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

          {/* Referees */}
          {filteredRefs.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield size={14} className="text-purple-400" />
                Àrbitres {!browsing && `(${filteredRefs.length})`}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredRefs.map(ref => (
                  <Link
                    key={ref.slug}
                    href={`/arbitre/${ref.slug}`}
                    className="glass-card rounded-xl p-3.5 hover:border-purple-500/30 transition-all flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-sm shrink-0">
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
                Jugadors {!browsing && `(${filteredPlayers.length})`}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredPlayers.map((player, i) => (
                  <Link
                    key={`${player.slug}-${player.teamSlug}-${i}`}
                    href={`/equip/${player.teamSlug}`}
                    className="glass-card rounded-xl p-3.5 hover:border-blue-500/30 transition-all flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
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

          {/* Empty state — only when actually searching */}
          {!browsing && total === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-slate-500" />
              </div>
              <p className="text-slate-400 mb-2">
                No s&apos;han trobat resultats per &ldquo;{query.trim()}&rdquo;
              </p>
              <p className="text-sm text-slate-600">Prova amb un nom parcial o canvia la categoria</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

function SearchFallback() {
  return (
    <div className="bg-gradient-to-b from-[#0a1628] to-[#0f172a] border-b border-white/5">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-4">Cerca</h1>
        <div className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Equip, jugador o àrbitre..."
              disabled
              className="w-full pl-10 pr-4 py-3 bg-white/6 border border-white/12 rounded-xl text-white placeholder-slate-500 text-sm opacity-60"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CercaClient(props: CercaClientProps) {
  return (
    <Suspense fallback={<SearchFallback />}>
      <CercaInner {...props} />
    </Suspense>
  )
}
