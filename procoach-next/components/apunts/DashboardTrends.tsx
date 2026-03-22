'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users } from 'lucide-react'
import type { MatchNote } from '@/lib/match-notes-types'
import { computeTrends, fetchPlayerAggregations, type TrendPoint, type PlayerAgg } from '@/lib/match-notes-aggregations'
import MiniLineChart from './MiniLineChart'
import RadarChart from './RadarChart'

export default function DashboardTrends({ notes }: { notes: MatchNote[] }) {
  const trends = computeTrends(notes)
  const [players, setPlayers] = useState<PlayerAgg[]>([])
  const [compareA, setCompareA] = useState<string | null>(null)
  const [compareB, setCompareB] = useState<string | null>(null)

  useEffect(() => {
    fetchPlayerAggregations('').then((data) => {
      setPlayers(data)
      if (data.length >= 2) {
        setCompareA(data[0].name)
        setCompareB(data[1].name)
      }
    }).catch(() => {})
  }, [])

  if (trends.length < 2) {
    return (
      <div className="text-center py-16">
        <TrendingUp size={32} className="text-slate-700 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Necessites almenys 2 apunts completats per veure tendències.</p>
      </div>
    )
  }

  // Performance over time (3=W, 1=D, 0=L -> rolling)
  const performanceData = trends.map((t) => ({
    label: t.opponent.split(' ').pop() || '',
    value: t.result === 'W' ? 3 : t.result === 'D' ? 1 : 0,
  }))

  // Rating over time
  const ratingData = trends
    .filter((t) => t.rating !== null)
    .map((t) => ({
      label: t.opponent.split(' ').pop() || '',
      value: t.rating!,
    }))

  // Goals per match
  const goalsData = trends.map((t) => ({
    label: t.opponent.split(' ').pop() || '',
    value: t.goalsFor,
  }))

  // Results by formation
  const formationResults = new Map<string, { w: number; d: number; l: number }>()
  for (const t of trends) {
    if (!t.formation) continue
    const f = formationResults.get(t.formation) || { w: 0, d: 0, l: 0 }
    if (t.result === 'W') f.w++
    else if (t.result === 'D') f.d++
    else f.l++
    formationResults.set(t.formation, f)
  }

  // Player comparison
  const playerA = players.find((p) => p.name === compareA)
  const playerB = players.find((p) => p.name === compareB)
  const maxGoals = Math.max(...players.map((p) => p.goals), 1)
  const maxAssists = Math.max(...players.map((p) => p.assists), 1)

  function getRadarValues(p: PlayerAgg) {
    return [
      p.goals / maxGoals,
      p.assists / maxAssists,
      p.avgRating / 10,
      p.attended / Math.max(p.totalNotes, 1),
      1 - Math.min((p.yellows + p.reds * 2) / 10, 1),
      p.matchesRated / Math.max(p.totalNotes, 1),
    ]
  }

  return (
    <div className="space-y-4">
      {/* Performance trend */}
      <div className="glass-card rounded-2xl p-5">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Rendiment al llarg del temps</h4>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[9px] text-green-400">V=3</span>
          <span className="text-[9px] text-amber-400">E=1</span>
          <span className="text-[9px] text-red-400">D=0</span>
        </div>
        <MiniLineChart data={performanceData} maxValue={3} color="#22c55e" height={90} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rating trend */}
        {ratingData.length >= 2 && (
          <div className="glass-card rounded-2xl p-5">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Valoració global</h4>
            <MiniLineChart data={ratingData} maxValue={10} color="#06b6d4" height={80} />
          </div>
        )}

        {/* Goals trend */}
        <div className="glass-card rounded-2xl p-5">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Gols per partit</h4>
          <MiniLineChart data={goalsData} color="#f59e0b" height={80} />
        </div>
      </div>

      {/* Form strip */}
      <div className="glass-card rounded-2xl p-5">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Ratxa de resultats</h4>
        <div className="flex gap-1.5 flex-wrap">
          {trends.map((t, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1"
              title={`${t.opponent} ${t.goalsFor}-${t.goalsAgainst}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                  t.result === 'W'
                    ? 'bg-green-500/20 text-green-400'
                    : t.result === 'D'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {t.result}
              </div>
              <span className="text-[8px] text-slate-600 truncate w-8 text-center">
                {t.goalsFor}-{t.goalsAgainst}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Results by formation */}
      {formationResults.size > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Resultats per formació</h4>
          <div className="space-y-2">
            {Array.from(formationResults.entries()).map(([formation, r]) => {
              const total = r.w + r.d + r.l
              return (
                <div key={formation} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-white w-14">{formation}</span>
                  <div className="flex-1 h-5 rounded-full overflow-hidden flex">
                    {r.w > 0 && (
                      <div
                        className="h-full bg-green-500/40 flex items-center justify-center text-[8px] text-green-300 font-bold"
                        style={{ width: `${(r.w / total) * 100}%` }}
                      >
                        {r.w}V
                      </div>
                    )}
                    {r.d > 0 && (
                      <div
                        className="h-full bg-amber-500/40 flex items-center justify-center text-[8px] text-amber-300 font-bold"
                        style={{ width: `${(r.d / total) * 100}%` }}
                      >
                        {r.d}E
                      </div>
                    )}
                    {r.l > 0 && (
                      <div
                        className="h-full bg-red-500/40 flex items-center justify-center text-[8px] text-red-300 font-bold"
                        style={{ width: `${(r.l / total) * 100}%` }}
                      >
                        {r.l}D
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-600 w-6">{total}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Player comparison */}
      {players.length >= 2 && (
        <div className="glass-card rounded-2xl p-5">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={12} /> Comparador de jugadors
          </h4>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <select
              value={compareA || ''}
              onChange={(e) => setCompareA(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-green-500/20 rounded-lg text-white text-xs focus:outline-none"
            >
              {players.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
            <select
              value={compareB || ''}
              onChange={(e) => setCompareB(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-cyan-500/20 rounded-lg text-white text-xs focus:outline-none"
            >
              {players.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          {playerA && playerB && (
            <div>
              <RadarChart
                axes={[
                  { label: 'Gols', value: 0 },
                  { label: 'Assist.', value: 0 },
                  { label: 'Valoració', value: 0 },
                  { label: 'Assistència', value: 0 },
                  { label: 'Disciplina', value: 0 },
                  { label: 'Regularitat', value: 0 },
                ]}
                layers={[
                  { values: getRadarValues(playerA), color: '#22c55e', label: playerA.name },
                  { values: getRadarValues(playerB), color: '#06b6d4', label: playerB.name },
                ]}
                size={220}
              />
              <div className="flex justify-center gap-6 mt-2">
                <span className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400" /> {playerA.name}
                </span>
                <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> {playerB.name}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
