'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Shield, Users, Layers } from 'lucide-react'

type TabType = 'all' | 'arbitre' | 'jugador' | 'equip'

interface CercaClientProps {
  referees: any[]
  players: any[]
  teams: any[]
}

/** Strips accents and lowercases for accent-insensitive search. */
function norm(text: string) {
  return (text || '')
    .toLowerCase()
    .normalize('NFC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/·/g, '')
}

const TABS: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'Tot', icon: <Search size={12} /> },
  { key: 'arbitre', label: 'Àrbitres', icon: <Shield size={12} /> },
  { key: 'jugador', label: 'Jugadors', icon: <Users size={12} /> },
  { key: 'equip', label: 'Equips', icon: <Layers size={12} /> },
]

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
    <div style={{ fontFamily: 'var(--font-inter)' }}>
      {/* Search hero */}
      <div style={{ background: '#0f1011', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '32px 0 24px' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h1 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', marginBottom: 20 }}>
            {q ? (
              <>
                <span style={{ fontSize: 14, fontWeight: 400, color: '#62666d', display: 'block', marginBottom: 4 }}>Resultats per a</span>
                &ldquo;{query.trim()}&rdquo;
              </>
            ) : 'Cerca'}
          </h1>

          {/* Search input with shadow-as-border */}
          <div style={{ position: 'relative', maxWidth: 480 }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#62666d', pointerEvents: 'none' }}
            />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              type="search"
              placeholder="Equip, jugador o àrbitre..."
              autoFocus
              style={{
                width: '100%',
                paddingLeft: 40,
                paddingRight: 16,
                paddingTop: 10,
                paddingBottom: 10,
                background: 'rgba(255,255,255,0.03)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: 6,
                color: '#f7f8f8',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-inter)',
              }}
              onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(34,197,94,0.3)')}
              onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)')}
            />
          </div>

          {q && (
            <p style={{ fontSize: 12, color: '#62666d', marginTop: 8 }}>
              {total} resultat{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6" style={{ paddingTop: 24, paddingBottom: 80 }}>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, overflowX: 'auto', paddingBottom: 2 }}>
          {TABS.map(tab => {
            const active = type === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setType(tab.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px',
                  borderRadius: 9999,
                  border: active ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.08)',
                  background: active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                  color: active ? '#22c55e' : '#8a8f98',
                  fontSize: 12,
                  fontWeight: 510,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  fontFamily: 'var(--font-inter)',
                  transition: 'all 0.15s',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Browse label */}
        {browsing && (
          <p style={{ fontSize: 11, fontWeight: 510, color: '#62666d', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
            {type === 'all' ? 'Explorar' : type === 'arbitre' ? 'Tots els àrbitres' : type === 'jugador' ? 'Tots els jugadors' : 'Tots els equips'}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Teams */}
          {filteredTeams.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 510, color: '#62666d', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Equips {!browsing && `(${filteredTeams.length})`}
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                {filteredTeams.map(team => (
                  <Link
                    key={team.slug}
                    href={`/equip/${team.slug}`}
                    className="hover:bg-white/[0.03]"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 14px',
                      background: '#08090a',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                      background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 510, color: '#22c55e',
                    }}>
                      {team.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {team.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#62666d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                        {team.competitionName || team.competition}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Referees */}
          {filteredRefs.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 510, color: '#62666d', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Àrbitres {!browsing && `(${filteredRefs.length})`}
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                {filteredRefs.map(ref => (
                  <Link
                    key={ref.slug}
                    href={`/arbitre/${ref.slug}`}
                    className="hover:bg-white/[0.03]"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 14px',
                      background: '#08090a',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 510, color: '#8a8f98',
                    }}>
                      {ref.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ref.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#62666d', marginTop: 1 }}>
                        {ref.matches} partits · 🟨 {ref.yellows_per_match}/part.
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Players */}
          {filteredPlayers.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 510, color: '#62666d', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Jugadors {!browsing && `(${filteredPlayers.length})`}
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                {filteredPlayers.map((player, i) => (
                  <Link
                    key={`${player.slug}-${player.teamSlug}-${i}`}
                    href={`/jugador/${player.slug}`}
                    className="hover:bg-white/[0.03]"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 14px',
                      background: '#08090a',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 510, color: '#8a8f98',
                    }}>
                      {player.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {player.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#62666d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                        {player.team} · {player.appearances} partits
                      </div>
                    </div>
                    {player.goals > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 510, color: '#22c55e', flexShrink: 0 }}>
                        ⚽ {player.goals}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {!browsing && total === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 8, margin: '0 auto 16px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Search size={20} style={{ color: '#62666d' }} />
              </div>
              <p style={{ fontSize: 14, color: '#8a8f98', marginBottom: 6 }}>
                No s&apos;han trobat resultats per &ldquo;{query.trim()}&rdquo;
              </p>
              <p style={{ fontSize: 12, color: '#62666d' }}>Prova amb un nom parcial o canvia la categoria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SearchFallback() {
  return (
    <div style={{ background: '#0f1011', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '32px 0 24px' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 style={{ fontSize: 28, fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', marginBottom: 20 }}>Cerca</h1>
        <div style={{ position: 'relative', maxWidth: 480 }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#62666d' }} />
          <input
            type="search"
            placeholder="Equip, jugador o àrbitre..."
            disabled
            style={{
              width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
              background: 'rgba(255,255,255,0.03)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
              border: 'none', borderRadius: 6, color: '#f7f8f8', fontSize: 14, opacity: 0.5,
              fontFamily: 'var(--font-inter)', boxSizing: 'border-box',
            }}
          />
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
