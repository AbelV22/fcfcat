'use client'

import { useState, useEffect } from 'react'
import { User, Target, Zap, Star, Shield, AlertTriangle } from 'lucide-react'
import type { MatchNote } from '@/lib/match-notes-types'
import { GOAL_TYPE_LABELS, PLAYER_TAGS } from '@/lib/match-notes-types'
import { fetchPlayerAggregations, type PlayerAgg } from '@/lib/match-notes-aggregations'
import RadarChart from './RadarChart'
import MiniLineChart from './MiniLineChart'
import DonutChart from './DonutChart'

const GOAL_TYPE_COLORS: Record<string, string> = {
  right_foot: '#22c55e',
  left_foot: '#06b6d4',
  header: '#f59e0b',
  penalty: '#ef4444',
  free_kick: '#8b5cf6',
  own_goal: '#6b7280',
}

const tagMap = Object.fromEntries(PLAYER_TAGS.map((t) => [t.key, t.label]))

export default function DashboardPlayerCard({ notes }: { notes: MatchNote[] }) {
  const [players, setPlayers] = useState<PlayerAgg[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlayerAggregations('')
      .then((data) => {
        setPlayers(data)
        if (data.length > 0) setSelected(data[0].name)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div className="text-center py-16">
        <User size={32} className="text-slate-700 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Crea apunts de partits per veure estadístiques de jugadors.</p>
      </div>
    )
  }

  const player = players.find((p) => p.name === selected) || players[0]

  // Normalize values for radar (0-1 scale)
  const maxGoals = Math.max(...players.map((p) => p.goals), 1)
  const maxAssists = Math.max(...players.map((p) => p.assists), 1)
  const maxPreAssists = Math.max(...players.map((p) => p.preAssists), 1)

  const radarAxes = [
    { label: 'Gols', value: player.goals / maxGoals, max: maxGoals },
    { label: 'Assist.', value: player.assists / maxAssists, max: maxAssists },
    { label: 'Pre-assist.', value: player.preAssists / Math.max(maxPreAssists, 1), max: maxPreAssists },
    { label: 'Valoració', value: player.avgRating / 10, max: 10 },
    { label: 'Assistència', value: player.attended / Math.max(player.totalNotes, 1), max: player.totalNotes },
    { label: 'Disciplina', value: 1 - Math.min((player.yellows + player.reds * 2) / 10, 1), max: 10 },
  ]

  const goalTypeSegments = Object.entries(player.goalTypes).map(([type, count]) => ({
    label: GOAL_TYPE_LABELS[type as keyof typeof GOAL_TYPE_LABELS] || type,
    value: count,
    color: GOAL_TYPE_COLORS[type] || '#94a3b8',
  }))

  const ratingData = player.ratingHistory.map((r) => ({
    label: r.opponent.split(' ').pop() || r.date.slice(0, 5),
    value: r.rating,
  }))

  return (
    <div>
      {/* Player selector */}
      <div className="mb-6">
        <select
          value={selected || ''}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-green-500/50"
        >
          {players.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} — {p.goals}G {p.assists}A ★{p.avgRating}
            </option>
          ))}
        </select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {[
          { icon: Target, label: 'Gols', value: player.goals, color: 'green' },
          { icon: Zap, label: 'Assist.', value: player.assists, color: 'cyan' },
          { icon: Star, label: 'Valoració', value: player.avgRating, color: 'amber' },
          { icon: Shield, label: 'Groga', value: player.yellows, color: 'yellow' },
          { icon: AlertTriangle, label: 'Vermella', value: player.reds, color: 'red' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card rounded-xl p-3 text-center">
            <Icon size={13} className={`mx-auto mb-1`} style={{ color: `var(--color-${color}-400, #4ade80)` }} />
            <p className="text-lg font-black text-white">{value}</p>
            <p className="text-[9px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Radar */}
        <div className="glass-card rounded-2xl p-5">
          <h4 className="text-xs font-semibold text-slate-500 mb-3">Perfil del jugador</h4>
          <RadarChart
            axes={radarAxes}
            layers={[{ values: radarAxes.map((a) => a.value), color: '#22c55e' }]}
          />
        </div>

        {/* Rating trend */}
        {ratingData.length >= 2 && (
          <div className="glass-card rounded-2xl p-5">
            <h4 className="text-xs font-semibold text-slate-500 mb-3">Tendència de valoració</h4>
            <MiniLineChart data={ratingData} maxValue={10} color="#22c55e" />
          </div>
        )}

        {/* Goal types donut */}
        {goalTypeSegments.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h4 className="text-xs font-semibold text-slate-500 mb-3">Tipus de gol</h4>
            <DonutChart segments={goalTypeSegments} centerLabel={`${player.goals}`} />
          </div>
        )}

        {/* Tags frequency */}
        {Object.keys(player.tags).length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h4 className="text-xs font-semibold text-slate-500 mb-3">Etiquetes freqüents</h4>
            <div className="space-y-1.5">
              {Object.entries(player.tags)
                .sort(([, a], [, b]) => b - a)
                .map(([tag, count]) => (
                  <div key={tag} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{tagMap[tag] || tag}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500"
                          style={{ width: `${(count / player.matchesRated) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-600 w-4 text-right">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
