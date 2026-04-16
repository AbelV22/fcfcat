'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ListOrdered, Users, Calendar, Shield, AlertTriangle,
  TrendingUp, Zap, LogIn, BarChart2, Target, Clock,
  Home, Plane, Ruler, CircleDot, ChevronDown, ChevronUp,
} from 'lucide-react'
import { slugify } from '@/lib/utils'

type TabId = 'resultats' | 'classificacio' | 'disciplina' | 'arbitres' | 'golejadors' | 'penaltis'
type StandingsFilter = 'total' | 'local' | 'visitant'

/** Compute standings from match results, filtered by home/away */
function computeStandings(matches: any[], filter: StandingsFilter) {
  const stats: Record<string, { name: string; slug: string; played: number; won: number; drawn: number; lost: number; goals_for: number; goals_against: number; points: number }> = {}

  for (const m of matches) {
    if (m.home_score === null || m.home_score === undefined) continue

    if (filter === 'total' || filter === 'local') {
      const k = m.home_team
      if (!stats[k]) stats[k] = { name: k, slug: m.home_slug || slugify(k), played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0 }
      stats[k].played++
      stats[k].goals_for += m.home_score
      stats[k].goals_against += m.away_score
      if (m.home_score > m.away_score) { stats[k].won++; stats[k].points += 3 }
      else if (m.home_score === m.away_score) { stats[k].drawn++; stats[k].points += 1 }
      else stats[k].lost++
    }

    if (filter === 'total' || filter === 'visitant') {
      const k = m.away_team
      if (!stats[k]) stats[k] = { name: k, slug: m.away_slug || slugify(k), played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0 }
      stats[k].played++
      stats[k].goals_for += m.away_score
      stats[k].goals_against += m.home_score
      if (m.away_score > m.home_score) { stats[k].won++; stats[k].points += 3 }
      else if (m.home_score === m.away_score) { stats[k].drawn++; stats[k].points += 1 }
      else stats[k].lost++
    }
  }

  return Object.values(stats)
    .sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against) || b.goals_for - a.goals_for)
    .map((t, i) => ({ ...t, position: i + 1 }))
}

function formatDate(d: string) {
  if (!d) return ''
  const [day, month] = d.split('-')
  const months = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
  return `${day} ${months[parseInt(month) - 1] || ''}`
}

function ScoreBadge({ home, away }: { home: number | null; away: number | null }) {
  if (home === null || away === null) {
    return <span style={{ color: '#62666d', fontSize: 12 }}>Pendent</span>
  }
  const homeWin = home > away, awayWin = away > home
  return (
    <span style={{ fontWeight: 510, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
      <span style={{ color: homeWin ? '#22c55e' : awayWin ? '#8a8f98' : '#d0d6e0' }}>{home}</span>
      <span style={{ color: '#62666d', margin: '0 3px' }}>–</span>
      <span style={{ color: awayWin ? '#22c55e' : homeWin ? '#8a8f98' : '#d0d6e0' }}>{away}</span>
    </span>
  )
}

export interface FieldInfo {
  name: string
  team: string | null
  length_m: number
  width_m: number
}

export interface CompetitionTabsProps {
  slug: string
  name: string
  matches: any[]
  teams: any[]
  discipline: { players: any[]; teams: any[]; riskPlayers: any[] }
  standings: any[]
  refereeRanking: any[]
  scorers: any[]
  nextJornadaFixtures: any[]
  nextJornada: number | null
  fcfStandings: any[]
  displayStandings: any[]
  playedMatches: any[]
  totalGoals: number
  totalYellows: number
  totalReds: number
  fields?: FieldInfo[]
  penaltyRanking?: { name: string; slug: string; pens_for: number; pens_against: number; score: number }[]
}

type FieldSize = 'petit' | 'mitja' | 'gran'
function classifyField(length_m: number, width_m: number): FieldSize {
  const area = length_m * width_m
  if (area < 5500) return 'petit'
  if (area <= 6300) return 'mitja'
  return 'gran'
}
const FIELD_SIZE_LABEL: Record<FieldSize, string> = { petit: 'Petit', mitja: 'Mitjà', gran: 'Gran' }

function TeamLink({
  teamSlug, teamName, style,
}: { teamSlug: string; teamName: string; style?: React.CSSProperties }) {
  return (
    <Link
      href={`/equip/${teamSlug}`}
      className="hover:text-[#f7f8f8]"
      style={{ textDecoration: 'none', color: '#d0d6e0', transition: 'color 0.15s', ...style }}
    >
      {teamName}
    </Link>
  )
}

/** Compute last N results for a team from played matches */
function computeForm(teamName: string, playedMatches: any[], count = 5): ('W' | 'D' | 'L')[] {
  const results: ('W' | 'D' | 'L')[] = []
  // playedMatches is sorted most-recent-first
  for (const m of playedMatches) {
    if (results.length >= count) break
    if (m.home_team === teamName) {
      if (m.home_score > m.away_score) results.push('W')
      else if (m.home_score === m.away_score) results.push('D')
      else results.push('L')
    } else if (m.away_team === teamName) {
      if (m.away_score > m.home_score) results.push('W')
      else if (m.home_score === m.away_score) results.push('D')
      else results.push('L')
    }
  }
  return results
}

function FormDots({ results }: { results: ('W' | 'D' | 'L')[] }) {
  const colorMap = { W: '#22c55e', D: '#62666d', L: '#f87171' }
  return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
      {results.map((r, i) => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: colorMap[r] }} />
      ))}
    </div>
  )
}

/** Group matches by jornada, sorted descending */
function groupByJornada(matches: any[]): { jornada: number; dateRange: string; matches: any[] }[] {
  const map = new Map<number, any[]>()
  for (const m of matches) {
    const j = m.jornada || 0
    if (!map.has(j)) map.set(j, [])
    map.get(j)!.push(m)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([jornada, ms]) => {
      // compute date range from matches in this jornada
      const dates = ms.filter((m: any) => m.date).map((m: any) => m.date as string)
      const unique = [...new Set(dates)]
      const dateRange = unique.length > 1
        ? `${formatDate(unique[unique.length - 1])} – ${formatDate(unique[0])}`
        : unique.length === 1 ? formatDate(unique[0]) : ''
      return { jornada, dateRange, matches: ms }
    })
}

export default function CompetitionTabs({
  slug,
  name,
  matches,
  teams,
  discipline,
  standings,
  refereeRanking,
  scorers,
  nextJornadaFixtures,
  nextJornada,
  fcfStandings,
  displayStandings,
  playedMatches,
  totalGoals,
  totalYellows,
  totalReds,
  fields,
  penaltyRanking,
}: CompetitionTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('resultats')
  const [standingsFilter, setStandingsFilter] = useState<StandingsFilter>('total')

  const hasData = fcfStandings.length > 0 || matches.length > 0

  // Jornada grouping for Resultats tab
  const jornadaGroups = useMemo(() => groupByJornada(matches), [matches])
  // Default: expand the 3 most recent jornadas
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const initial = new Set<number>()
    jornadaGroups.slice(0, 3).forEach(g => initial.add(g.jornada))
    return initial
  })

  const toggleJornada = (j: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(j)) next.delete(j)
      else next.add(j)
      return next
    })
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'resultats', label: 'Resultats' },
    { id: 'classificacio', label: 'Classificació' },
    { id: 'golejadors', label: 'Golejadors' },
    { id: 'disciplina', label: 'Disciplina' },
    { id: 'arbitres', label: 'Àrbitres' },
    ...(penaltyRanking && penaltyRanking.some(t => t.pens_for > 0 || t.pens_against > 0)
      ? [{ id: 'penaltis' as TabId, label: 'Penaltis' }]
      : []),
  ]

  if (!hasData) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6" style={{ paddingTop: 24 }}>
        <div style={{ textAlign: 'center', paddingTop: 96, paddingBottom: 96 }}>
          <Calendar size={40} style={{ margin: '0 auto 16px', color: '#62666d', opacity: 0.4 }} />
          <p style={{ fontSize: 15, fontWeight: 510, color: '#8a8f98' }}>Dades actualitzant-se</p>
          <p style={{ fontSize: 13, color: '#62666d', marginTop: 8, maxWidth: 320, margin: '8px auto 0' }}>Les dades d&apos;aquesta competició estaran disponibles properament. Estem processant les actes del sistema FCF.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6" style={{ paddingTop: 0, paddingBottom: 48 }}>

      {/* ─── Tab navigation (underline style) ─── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 24, overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map(t => {
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '12px 16px', fontSize: 13, fontWeight: 510,
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  border: 'none', borderBottom: isActive ? '2px solid #22c55e' : '2px solid transparent',
                  background: 'none',
                  color: isActive ? '#f7f8f8' : '#8a8f98',
                  transition: 'color 0.15s, border-color 0.15s',
                  marginBottom: -1,
                  fontFamily: 'var(--font-inter)',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#d0d6e0' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#8a8f98' }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── TAB: RESULTATS ─── */}
      {activeTab === 'resultats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Next jornada — promoted to top */}
          {nextJornadaFixtures.length > 0 && (
            <div style={{ background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.1)', borderRadius: 8, padding: '16px 20px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={13} style={{ color: '#22c55e' }} />
                {nextJornada !== null ? `Propera Jornada — J${nextJornada}` : 'Pròxims Partits'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {nextJornadaFixtures.map((m: any, i: number) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(34,197,94,0.06)' : undefined }}>
                    <TeamLink teamSlug={m.home_slug || slugify(m.home_team)} teamName={m.home_team} style={{ fontSize: 12, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />
                    <span style={{ fontSize: 11, fontWeight: 510, color: '#22c55e', background: 'rgba(34,197,94,0.08)', padding: '2px 8px', borderRadius: 9999, whiteSpace: 'nowrap' }}>
                      {m.date ? formatDate(m.date) : `J${m.jornada}`}{m.time ? ` ${m.time}` : ''}
                    </span>
                    <TeamLink teamSlug={m.away_slug || slugify(m.away_team)} teamName={m.away_team} style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category stats inline */}
          {playedMatches.length > 0 && (
            <p style={{ fontSize: 12, color: '#8a8f98', lineHeight: 1.5 }}>
              <span style={{ color: '#d0d6e0', fontWeight: 510 }}>{(totalGoals / playedMatches.length).toFixed(2)}</span> gols/p
              <span style={{ color: '#62666d', margin: '0 8px' }}>·</span>
              <span style={{ color: '#d0d6e0', fontWeight: 510 }}>{(totalYellows / playedMatches.length).toFixed(2)}</span> grogues/p
              <span style={{ color: '#62666d', margin: '0 8px' }}>·</span>
              <span style={{ color: '#d0d6e0', fontWeight: 510 }}>{(totalReds / playedMatches.length).toFixed(2)}</span> vermelles/p
              <span style={{ color: '#62666d', margin: '0 8px' }}>·</span>
              <span style={{ color: '#d0d6e0', fontWeight: 510 }}>{playedMatches.filter(m => (m.home_score as number) + (m.away_score as number) === 0).length}</span> sense gol
            </p>
          )}

          {/* Jornada groups */}
          {jornadaGroups.map(group => {
            const isOpen = expanded.has(group.jornada)
            return (
              <div key={group.jornada} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                {/* Jornada header (clickable) */}
                <button
                  onClick={() => toggleJornada(group.jornada)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8' }}>
                    {group.jornada > 0 ? `Jornada ${group.jornada}` : 'Sense jornada'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {group.dateRange && <span style={{ fontSize: 11, color: '#62666d' }}>{group.dateRange}</span>}
                    <span style={{ fontSize: 11, color: '#62666d' }}>{group.matches.length} partits</span>
                    {isOpen ? <ChevronUp size={14} style={{ color: '#62666d' }} /> : <ChevronDown size={14} style={{ color: '#62666d' }} />}
                  </div>
                </button>

                {/* Match rows */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {group.matches.map((m: any, i: number) => (
                      <div
                        key={i}
                        className="hover:bg-white/[0.03]"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 16px',
                          borderTop: i > 0 ? '1px solid rgba(255,255,255,0.03)' : undefined,
                          transition: 'background 0.15s',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
                          <TeamLink teamSlug={m.home_slug || slugify(m.home_team)} teamName={m.home_team} style={{ fontSize: 13, fontWeight: 510, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />
                          <ScoreBadge home={m.home_score} away={m.away_score} />
                          <TeamLink teamSlug={m.away_slug || slugify(m.away_team)} teamName={m.away_team} style={{ fontSize: 13, fontWeight: 510, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />
                        </div>
                        <div className="hidden sm:block" style={{ textAlign: 'right', flexShrink: 0 }}>
                          {m.main_referee && (
                            <Link href={`/arbitre/${slugify(m.main_referee)}`} className="hover:text-[#22c55e]" style={{ display: 'block', fontSize: 11, color: '#62666d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120, textDecoration: 'none' }}>
                              {m.main_referee}
                            </Link>
                          )}
                          <span style={{ fontSize: 10, color: '#62666d' }}>
                            {formatDate(m.date)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── TAB: CLASSIFICACIÓ ─── */}
      {activeTab === 'classificacio' && (() => {
        const showStandings = standingsFilter === 'total'
          ? displayStandings
          : computeStandings(playedMatches, standingsFilter)
        const isComputed = standingsFilter !== 'total'
        const totalTeams = showStandings.length

        const teamFieldMap = new Map<string, { size: FieldSize; area: number; length: number; width: number }>()
        if (fields) {
          for (const f of fields) {
            if (f.team && f.length_m && f.width_m) {
              teamFieldMap.set(f.team, {
                size: classifyField(f.length_m, f.width_m),
                area: f.length_m * f.width_m,
                length: f.length_m,
                width: f.width_m,
              })
            }
          }
        }

        const fieldSizeStats: Record<FieldSize, { matches: number; homeWins: number; awayWins: number; draws: number; goals: number; yellows: number; reds: number }> = {
          petit: { matches: 0, homeWins: 0, awayWins: 0, draws: 0, goals: 0, yellows: 0, reds: 0 },
          mitja: { matches: 0, homeWins: 0, awayWins: 0, draws: 0, goals: 0, yellows: 0, reds: 0 },
          gran: { matches: 0, homeWins: 0, awayWins: 0, draws: 0, goals: 0, yellows: 0, reds: 0 },
        }
        let hasFieldStats = false
        if (teamFieldMap.size > 0) {
          for (const m of playedMatches) {
            const f = teamFieldMap.get(m.home_team)
            if (!f || m.home_score === null || m.home_score === undefined) continue
            hasFieldStats = true
            const s = fieldSizeStats[f.size]
            s.matches++
            s.goals += (m.home_score + m.away_score)
            if (m.home_score > m.away_score) s.homeWins++
            else if (m.home_score === m.away_score) s.draws++
            else s.awayWins++
            if (m.yellows !== undefined) s.yellows += m.yellows
            if (m.reds !== undefined) s.reds += m.reds
          }
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {displayStandings.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 64, color: '#62666d' }}>
                <BarChart2 size={36} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <p>No hi ha prou dades per mostrar la classificació.</p>
              </div>
            ) : (
              <>
                {/* Filter buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  {fcfStandings.length > 0 && standingsFilter === 'total' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#22c55e' }}>
                      <ListOrdered size={11} />
                      <span>Classificació oficial FCF</span>
                    </div>
                  )}
                  {isComputed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#62666d' }}>
                      <BarChart2 size={11} />
                      <span>Calculada a partir de les actes</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: 4, marginLeft: 'auto' }}>
                    {([
                      { id: 'total' as StandingsFilter, label: 'Total', icon: <ListOrdered size={11} /> },
                      { id: 'local' as StandingsFilter, label: 'Local', icon: <Home size={11} /> },
                      { id: 'visitant' as StandingsFilter, label: 'Visitant', icon: <Plane size={11} /> },
                    ]).map(f => (
                      <button
                        key={f.id}
                        onClick={() => setStandingsFilter(f.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px', borderRadius: 4, fontSize: 12, fontWeight: 510,
                          cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                          background: standingsFilter === f.id ? '#22c55e' : 'transparent',
                          color: standingsFilter === f.id ? '#fff' : '#8a8f98',
                          fontFamily: 'var(--font-inter)',
                        }}
                      >
                        {f.icon}
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 10, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ textAlign: 'left', paddingBottom: 10, paddingLeft: 8, fontWeight: 510, width: 32 }}>#</th>
                        <th style={{ textAlign: 'left', paddingBottom: 10, fontWeight: 510 }}>Equip</th>
                        <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510 }}>PJ</th>
                        <th className="hidden sm:table-cell" style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510 }}>G</th>
                        <th className="hidden sm:table-cell" style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510 }}>E</th>
                        <th className="hidden sm:table-cell" style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510 }}>P</th>
                        <th className="hidden md:table-cell" style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510 }}>GF</th>
                        <th className="hidden md:table-cell" style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510 }}>GC</th>
                        <th className="hidden sm:table-cell" style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510 }}>Dif.</th>
                        <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510, color: '#f7f8f8' }}>Pts</th>
                        <th className="hidden lg:table-cell" style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510 }}>Forma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showStandings.map((t: any, i: number) => {
                        const isPromoZone = i < 4
                        const isReleZone = i >= totalTeams - 4
                        const zoneBorder = isPromoZone ? '2px solid #22c55e' : isReleZone ? '2px solid #f87171' : '2px solid transparent'
                        const form = computeForm(t.name, playedMatches, 5)
                        return (
                          <tr key={t.slug || i} className="hover:bg-white/[0.02]" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}>
                            <td style={{ padding: '10px 0 10px 8px', color: '#62666d', fontSize: 11, fontWeight: 510, borderLeft: zoneBorder }}>{i + 1}</td>
                            <td style={{ padding: '10px 0' }}>
                              <TeamLink teamSlug={t.slug} teamName={t.name} style={{ fontWeight: 510 }} />
                            </td>
                            <td style={{ padding: '10px 0', textAlign: 'center', color: '#8a8f98' }}>{t.played}</td>
                            <td className="hidden sm:table-cell" style={{ padding: '10px 0', textAlign: 'center', color: '#22c55e' }}>{t.won}</td>
                            <td className="hidden sm:table-cell" style={{ padding: '10px 0', textAlign: 'center', color: '#d0d6e0' }}>{t.drawn}</td>
                            <td className="hidden sm:table-cell" style={{ padding: '10px 0', textAlign: 'center', color: '#8a8f98' }}>{t.lost}</td>
                            <td className="hidden md:table-cell" style={{ padding: '10px 0', textAlign: 'center', color: '#8a8f98' }}>{t.goals_for}</td>
                            <td className="hidden md:table-cell" style={{ padding: '10px 0', textAlign: 'center', color: '#8a8f98' }}>{t.goals_against}</td>
                            <td className="hidden sm:table-cell" style={{ padding: '10px 0', textAlign: 'center', color: '#8a8f98' }}>
                              {(t.goals_for - t.goals_against) > 0 ? `+${t.goals_for - t.goals_against}` : t.goals_for - t.goals_against}
                            </td>
                            <td style={{ padding: '10px 0', textAlign: 'center', fontWeight: 510, color: '#f7f8f8' }}>{t.points}</td>
                            <td className="hidden lg:table-cell" style={{ padding: '10px 0' }}>
                              <FormDots results={form} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p style={{ fontSize: 10, color: '#62666d', marginTop: 12, textAlign: 'center' }}>
                    {standingsFilter === 'total' && fcfStandings.length > 0
                      ? '* Classificació oficial FCF.'
                      : `* Classificació ${standingsFilter === 'local' ? 'com a local' : standingsFilter === 'visitant' ? 'com a visitant' : ''} calculada a partir de les actes disponibles.`}
                  </p>
                </div>
              </>
            )}

            {/* Field Size Insights */}
            {hasFieldStats && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px' }}>
                <h3 style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ruler size={13} style={{ color: '#8a8f98' }} />
                  Rendiment segons mida del camp
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 10 }}>
                  {(['petit', 'mitja', 'gran'] as FieldSize[]).map(size => {
                    const s = fieldSizeStats[size]
                    if (s.matches === 0) return null
                    const homeWinPct = ((s.homeWins / s.matches) * 100).toFixed(0)
                    const drawPct = ((s.draws / s.matches) * 100).toFixed(0)
                    const awayWinPct = ((s.awayWins / s.matches) * 100).toFixed(0)
                    const goalsPerMatch = (s.goals / s.matches).toFixed(2)
                    return (
                      <div key={size} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8' }}>{FIELD_SIZE_LABEL[size]}</span>
                          <span style={{ fontSize: 11, color: '#62666d' }}>{s.matches} partits</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {[
                            { label: 'Victòria local', value: `${homeWinPct}%`, color: '#22c55e' },
                            { label: 'Empat', value: `${drawPct}%`, color: '#d0d6e0' },
                            { label: 'Victòria visitant', value: `${awayWinPct}%`, color: '#8a8f98' },
                          ].map(row => (
                            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                              <span style={{ color: '#8a8f98' }}>{row.label}</span>
                              <span style={{ fontWeight: 510, color: row.color }}>{row.value}</span>
                            </div>
                          ))}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#8a8f98' }}>Gols/partit</span>
                            <span style={{ fontWeight: 510, color: '#f7f8f8' }}>{goalsPerMatch}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p style={{ fontSize: 10, color: '#62666d', marginTop: 12, textAlign: 'center' }}>
                  Camp petit: &lt;5.500m² · Mitjà: 5.500–6.300m² · Gran: &gt;6.300m²
                </p>
              </div>
            )}
          </div>
        )
      })()}

      {/* ─── TAB: GOLEJADORS ─── */}
      {activeTab === 'golejadors' && (
        <div>
          {scorers.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 64, color: '#62666d' }}>
              <Target size={36} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ fontSize: 15, fontWeight: 510, color: '#8a8f98' }}>Golejadors no disponibles</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>Les dades de gols s&apos;actualitzen amb les actes de partits.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8' }}>Taula de Golejadors</h3>
                <span style={{ fontSize: 11, color: '#62666d' }}>{scorers.length} jugadors amb gols</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 10, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ textAlign: 'left', paddingBottom: 10, paddingLeft: 8, fontWeight: 510, width: 32 }}>#</th>
                      <th style={{ textAlign: 'left', paddingBottom: 10, fontWeight: 510 }}>Jugador</th>
                      <th className="hidden sm:table-cell" style={{ textAlign: 'left', paddingBottom: 10, fontWeight: 510 }}>Equip</th>
                      <th className="hidden md:table-cell" style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510 }}>Partits</th>
                      <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510, color: '#22c55e' }}>Gols</th>
                      <th className="hidden sm:table-cell" style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510 }}>G/P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorers.slice(0, 30).map((s, i) => (
                      <tr
                        key={i}
                        className="hover:bg-white/[0.02]"
                        style={{
                          borderTop: '1px solid rgba(255,255,255,0.05)',
                          transition: 'background 0.15s',
                          background: i < 3 ? 'rgba(34,197,94,0.04)' : undefined,
                        }}
                      >
                        <td style={{ padding: '10px 0 10px 8px', color: '#62666d', fontSize: 11, fontWeight: 510 }}>{i + 1}</td>
                        <td style={{ padding: '10px 0' }}>
                          {s.slug ? (
                            <Link href={`/jugador/${s.slug}`} className="hover:text-[#22c55e]" style={{ fontWeight: 510, color: '#d0d6e0', textDecoration: 'none', transition: 'color 0.15s' }}>
                              {s.name}
                            </Link>
                          ) : (
                            <span style={{ fontWeight: 510, color: '#d0d6e0' }}>{s.name}</span>
                          )}
                        </td>
                        <td className="hidden sm:table-cell" style={{ padding: '10px 0', color: '#8a8f98' }}>
                          <TeamLink teamSlug={s.teamSlug || slugify(s.team)} teamName={s.team} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 180 }} />
                        </td>
                        <td className="hidden md:table-cell" style={{ padding: '10px 0', textAlign: 'center', color: '#62666d' }}>{s.matches}</td>
                        <td style={{ padding: '10px 0', textAlign: 'center' }}>
                          <span style={{ fontWeight: 510, color: '#22c55e', fontSize: 15 }}>{s.goals}</span>
                        </td>
                        <td className="hidden sm:table-cell" style={{ padding: '10px 0', textAlign: 'center', color: '#8a8f98' }}>
                          {s.goals_per_match > 0 ? s.goals_per_match.toFixed(2) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB: DISCIPLINA ─── */}
      {activeTab === 'disciplina' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {discipline.riskPlayers.length > 0 && (
            <div style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 8, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <AlertTriangle size={15} style={{ color: '#fbbf24' }} />
                <h2 style={{ fontSize: 13, fontWeight: 510, color: '#fbbf24' }}>Risc de sanció — 4+ targetes grogues</h2>
                <span style={{ marginLeft: 'auto', fontSize: 11, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', padding: '2px 8px', borderRadius: 9999 }}>
                  {discipline.riskPlayers.length} jugadors
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 6 }}>
                {discipline.riskPlayers.slice(0, 18).map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.1)', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                      <p style={{ fontSize: 11, color: '#62666d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.team}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 10 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 510, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', padding: '2px 6px', borderRadius: 9999 }}>
                        🟨 {p.yellows}
                      </span>
                      {p.reds > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 510, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 6px', borderRadius: 9999 }}>
                          🟥 {p.reds}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(251,191,36,0.1)', padding: '10px 14px', background: 'rgba(251,191,36,0.03)', borderRadius: 6 }}>
                <p style={{ fontSize: 12, color: '#fbbf24' }}>
                  <strong>Vols rebre un avís automàtic</strong> quan un jugador rival acumuli targetes?{' '}
                  <Link href="/entrenador" className="hover:text-[#22c55e]" style={{ textDecoration: 'underline', color: '#fbbf24' }}>Registra el teu equip gratis →</Link>
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 24 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', marginBottom: 12 }}>Jugadors amb més targetes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {discipline.players.slice(0, 15).map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 510, color: '#d0d6e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                      <p style={{ fontSize: 11, color: '#62666d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.team}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 10 }}>
                      {p.yellows > 0 && <span style={{ fontSize: 11, fontWeight: 510, color: '#fbbf24' }}>🟨 {p.yellows}</span>}
                      {p.reds > 0 && <span style={{ fontSize: 11, fontWeight: 510, color: '#f87171' }}>🟥 {p.reds}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', marginBottom: 12 }}>Equips més sancionats</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {discipline.teams.slice(0, 15).map((t, i) => (
                  <Link
                    key={i}
                    href={`/equip/${t.slug}`}
                    className="hover:bg-white/[0.04]"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 12px', textDecoration: 'none', transition: 'background 0.15s' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 510, color: '#d0d6e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 10 }}>
                      {t.yellows > 0 && <span style={{ fontSize: 11, fontWeight: 510, color: '#fbbf24' }}>🟨 {t.yellows}</span>}
                      {t.reds > 0 && <span style={{ fontSize: 11, fontWeight: 510, color: '#f87171' }}>🟥 {t.reds}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: ÀRBITRES ─── */}
      {activeTab === 'arbitres' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {refereeRanking.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 64, color: '#62666d' }}>
              <Shield size={36} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p>No hi ha dades d&apos;àrbitres per a aquesta competició.</p>
            </div>
          ) : (
            <>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 16px' }}>
                <p style={{ fontSize: 13, color: '#d0d6e0' }}>
                  <Shield size={13} style={{ display: 'inline', marginRight: 8, color: '#8a8f98' }} />
                  <strong style={{ color: '#f7f8f8' }}>Informació exclusiva que FCF no publica.</strong>
                  {' '}Veu les estadístiques de targetes de cada àrbitre, els seus partits recents i el seu perfil de sancions.
                </p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 10, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ textAlign: 'left', paddingBottom: 10, fontWeight: 510 }}>Àrbitre</th>
                      <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510 }}>Partits</th>
                      <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510, color: '#fbbf24' }}>🟨</th>
                      <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510, color: '#f87171' }}>🟥</th>
                      <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510 }}>G/Part</th>
                      <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510 }}>R/Part</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refereeRanking.map((r, i) => (
                      <tr key={r.slug || i} className="hover:bg-white/[0.02]" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '10px 0' }}>
                          <Link href={`/arbitre/${r.slug}`} className="hover:text-[#22c55e]" style={{ fontWeight: 510, color: '#d0d6e0', textDecoration: 'none', transition: 'color 0.15s' }}>
                            {r.name}
                          </Link>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'center', color: '#8a8f98' }}>{r.matches}</td>
                        <td style={{ padding: '10px 0', textAlign: 'center', color: '#fbbf24' }}>{r.yellows}</td>
                        <td style={{ padding: '10px 0', textAlign: 'center', color: '#f87171' }}>{r.reds}</td>
                        <td style={{ padding: '10px 0', textAlign: 'center' }}>
                          <span style={{ fontWeight: 510, fontSize: 13, color: r.yellows_per_match >= 4 ? '#f87171' : r.yellows_per_match >= 3 ? '#fbbf24' : '#d0d6e0' }}>
                            {r.yellows_per_match}
                          </span>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'center' }}>
                          <span style={{ fontWeight: 510, fontSize: 13, color: r.reds_per_match >= 0.5 ? '#f87171' : '#8a8f98' }}>
                            {r.reds_per_match}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '24px 28px', textAlign: 'center' }}>
                <Shield size={24} style={{ margin: '0 auto 12px', color: '#8a8f98' }} />
                <h3 style={{ fontSize: 16, fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', marginBottom: 8 }}>Vols saber qui t&apos;arbitrarà el proper partit?</h3>
                <p style={{ fontSize: 13, color: '#8a8f98', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
                  Registra el teu equip i rep un informe arbitral complet amb historial de targetes, tendències i comparativa amb la categoria.
                </p>
                <Link
                  href="/entrenador"
                  className="hover:bg-[#34d399]"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 24px', borderRadius: 6,
                    background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 510,
                    textDecoration: 'none', transition: 'background 0.15s',
                  }}
                >
                  <Zap size={14} />
                  Registra el teu equip — Gratis
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB: PENALTIS ─── */}
      {activeTab === 'penaltis' && penaltyRanking && (() => {
        const teamsWithPens = penaltyRanking.filter(t => t.pens_for > 0 || t.pens_against > 0)
        const totalPens = penaltyRanking.reduce((s, t) => s + t.pens_for, 0)

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {teamsWithPens.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 64, color: '#62666d' }}>
                <CircleDot size={36} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <p style={{ fontSize: 15, fontWeight: 510, color: '#8a8f98' }}>No hi ha dades de penaltis</p>
                <p style={{ fontSize: 13, marginTop: 8 }}>Les dades de penaltis s&apos;actualitzen amb les actes de partits.</p>
              </div>
            ) : (
              <>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 16px' }}>
                  <p style={{ fontSize: 13, color: '#d0d6e0' }}>
                    <CircleDot size={13} style={{ display: 'inline', marginRight: 8, color: '#8a8f98' }} />
                    <strong style={{ color: '#f7f8f8' }}>Classificació de Penaltis.</strong>
                    {' '}Cada penalti a favor suma +1 i cada penalti en contra resta −1. Total de {totalPens} penaltis pitats a la competició.
                  </p>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 10, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ textAlign: 'left', paddingBottom: 10, paddingLeft: 8, fontWeight: 510, width: 32 }}>#</th>
                        <th style={{ textAlign: 'left', paddingBottom: 10, fontWeight: 510 }}>Equip</th>
                        <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510, color: '#22c55e' }}>A favor</th>
                        <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510, color: '#f87171' }}>En contra</th>
                        <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510, color: '#f7f8f8' }}>Punts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamsWithPens.map((t, i) => (
                        <tr key={t.slug} className="hover:bg-white/[0.02]" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '10px 0 10px 8px', color: '#62666d', fontSize: 11, fontWeight: 510 }}>{i + 1}</td>
                          <td style={{ padding: '10px 0' }}>
                            <Link href={`/equip/${t.slug}`} className="hover:text-[#f7f8f8]" style={{ fontWeight: 510, color: '#d0d6e0', textDecoration: 'none' }}>
                              {t.name}
                            </Link>
                          </td>
                          <td style={{ padding: '10px 0', textAlign: 'center', fontWeight: 510, color: '#22c55e' }}>{t.pens_for}</td>
                          <td style={{ padding: '10px 0', textAlign: 'center', fontWeight: 510, color: '#f87171' }}>{t.pens_against}</td>
                          <td style={{ padding: '10px 0', textAlign: 'center' }}>
                            <span style={{ fontWeight: 510, fontSize: 15, color: t.score > 0 ? '#22c55e' : t.score < 0 ? '#f87171' : '#8a8f98' }}>
                              {t.score > 0 ? `+${t.score}` : t.score}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* Bottom CTA */}
      <div style={{ marginTop: 48, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '32px 28px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)',
          borderRadius: 9999, fontSize: 11, fontWeight: 510, color: '#22c55e',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16,
        }}>
          <Zap size={11} />
          100% GRATIS · Sense targeta de crèdit
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', marginBottom: 8 }}>La plataforma per als entrenadors de {name}</h3>
        <p style={{ fontSize: 13, color: '#8a8f98', marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
          Accedeix als informes arbitrals complets del teu equip, estadístiques detallades de jugadors i anàlisi de rivals. Tot en un sol lloc.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/entrenador"
            className="hover:bg-[#34d399]"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', borderRadius: 6,
              background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 510,
              textDecoration: 'none', transition: 'background 0.15s',
            }}
          >
            <LogIn size={14} />
            Afegeix el teu equip — Gratis
          </Link>
          <Link
            href="/cerca"
            className="hover:bg-white/[0.07]"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 6,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#d0d6e0', fontSize: 14, fontWeight: 510,
              textDecoration: 'none', transition: 'all 0.15s',
            }}
          >
            <Users size={14} />
            Explorar jugadors
          </Link>
        </div>
      </div>
    </div>
  )
}
