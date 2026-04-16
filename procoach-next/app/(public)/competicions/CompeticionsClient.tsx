'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight, Layers } from 'lucide-react'

type Team = { slug: string; name: string }
type CompetitionGroup = { group: string; teams: Team[] }
type Competition = { slug: string; name: string; groups: CompetitionGroup[]; teamCount: number }
type Category = { key: string; label: string; competitions: Competition[] }

interface Props {
  categories: Category[]
}

function norm(text: string) {
  return (text || '')
    .toLowerCase()
    .normalize('NFC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/·/g, '')
}

function prettyGroup(group: string) {
  // 'grup-3' → 'Grup 3'
  const m = /^grup-?(\d+)$/i.exec(group)
  return m ? `Grup ${m[1]}` : group.replace(/-/g, ' ')
}

export default function CompeticionsClient({ categories }: Props) {
  const router = useRouter()
  const [activeCat, setActiveCat] = useState<string>(categories[0]?.key || 'adult')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const current = categories.find(c => c.key === activeCat) || categories[0]

  const q = norm(query.trim())

  // Filter competitions and teams by query across the active category
  const filtered = useMemo(() => {
    if (!current) return [] as Competition[]
    if (!q) return current.competitions
    return current.competitions
      .map(c => {
        const compMatches = norm(c.name).includes(q)
        const groups = c.groups
          .map(g => ({
            ...g,
            teams: compMatches ? g.teams : g.teams.filter(t => norm(t.name).includes(q)),
          }))
          .filter(g => g.teams.length > 0)
        if (groups.length === 0) return null
        const teamCount = groups.reduce((n, g) => n + g.teams.length, 0)
        return { ...c, groups, teamCount }
      })
      .filter((c): c is Competition => !!c)
  }, [current, q])

  const totalTeams = (current?.competitions || []).reduce((n, c) => n + c.teamCount, 0)

  function toggle(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const autoExpandAll = !!q // when searching, show everything expanded

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/cerca?type=equip&q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div style={{ fontFamily: 'var(--font-inter)' }}>
      {/* Hero */}
      <div style={{ background: '#0f1011', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '32px 0 24px' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', marginBottom: 6 }}>
            Busca el teu equip
          </h1>
          <p style={{ fontSize: 13, color: '#8a8f98', marginBottom: 20 }}>
            Totes les competicions i grups del futbol català amb dades a NeoScout.
          </p>

          <form onSubmit={handleSubmit} style={{ position: 'relative', maxWidth: 520 }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#62666d', pointerEvents: 'none' }}
            />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              type="search"
              placeholder="Filtra per nom d'equip o competició..."
              style={{
                width: '100%',
                paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                background: 'rgba(255,255,255,0.03)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
                border: 'none', borderRadius: 6,
                color: '#f7f8f8', fontSize: 14, outline: 'none',
                boxSizing: 'border-box', fontFamily: 'var(--font-inter)',
              }}
              onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(34,197,94,0.3)')}
              onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)')}
            />
          </form>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6" style={{ paddingTop: 24, paddingBottom: 80 }}>
        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto', paddingBottom: 2 }}>
          {categories.map(cat => {
            const active = cat.key === activeCat
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveCat(cat.key); setExpanded(new Set()) }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px',
                  borderRadius: 9999,
                  border: active ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.08)',
                  background: active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                  color: active ? '#22c55e' : '#8a8f98',
                  fontSize: 13, fontWeight: 510,
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  fontFamily: 'var(--font-inter)', transition: 'all 0.15s',
                }}
              >
                {cat.label}
                <span style={{ fontSize: 11, color: active ? '#22c55e' : '#62666d' }}>
                  {cat.competitions.length}
                </span>
              </button>
            )
          })}
        </div>

        {!q && (
          <p style={{ fontSize: 11, fontWeight: 510, color: '#62666d', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            {current?.label} · {filtered.length} competicions · {totalTeams} equips
          </p>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 8, margin: '0 auto 16px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Search size={20} style={{ color: '#62666d' }} />
            </div>
            <p style={{ fontSize: 14, color: '#8a8f98', marginBottom: 6 }}>Cap resultat en aquesta categoria</p>
            <p style={{ fontSize: 12, color: '#62666d' }}>Prova amb un altre nom o canvia de categoria</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(comp => {
            const open = autoExpandAll || expanded.has(comp.slug)
            return (
              <section
                key={comp.slug}
                style={{
                  background: '#08090a',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                <header
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => toggle(comp.slug)}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#22c55e',
                  }}>
                    <Layers size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 510, color: '#f7f8f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {comp.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#62666d', marginTop: 1 }}>
                      {comp.groups.length} {comp.groups.length === 1 ? 'grup' : 'grups'} · {comp.teamCount} equips
                    </div>
                  </div>
                  <Link
                    href={`/competicio/${comp.slug}`}
                    onClick={e => e.stopPropagation()}
                    style={{
                      fontSize: 12, fontWeight: 510, color: '#22c55e',
                      padding: '6px 10px', borderRadius: 6,
                      background: 'rgba(34,197,94,0.08)',
                      border: '1px solid rgba(34,197,94,0.15)',
                      textDecoration: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    Veure
                  </Link>
                  <ChevronRight
                    size={16}
                    style={{
                      color: '#62666d', flexShrink: 0,
                      transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s',
                    }}
                  />
                </header>

                {open && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '8px 10px 12px' }}>
                    {comp.groups.map(g => (
                      <div key={g.group} style={{ marginTop: 8 }}>
                        <div style={{
                          fontSize: 11, fontWeight: 510, color: '#8a8f98',
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                          padding: '6px 4px',
                        }}>
                          {prettyGroup(g.group)} · {g.teams.length} {g.teams.length === 1 ? 'equip' : 'equips'}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden' }}>
                          {g.teams.map(t => (
                            <Link
                              key={t.slug}
                              href={`/equip/${t.slug}`}
                              className="hover:bg-white/[0.03]"
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 12px', background: '#0c0d0e',
                                textDecoration: 'none', transition: 'background 0.15s',
                              }}
                            >
                              <div style={{
                                width: 26, height: 26, borderRadius: 5, flexShrink: 0,
                                background: 'rgba(34,197,94,0.06)',
                                border: '1px solid rgba(34,197,94,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 510, color: '#22c55e',
                              }}>
                                {t.name[0]}
                              </div>
                              <span style={{
                                fontSize: 12, color: '#d0d6e0',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                flex: 1, minWidth: 0,
                              }}>
                                {t.name}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
