'use client'

import { useState, useEffect } from 'react'
import { CalendarCheck, Target, Shield, Users, BarChart3 } from 'lucide-react'
import type { MatchNote } from '@/lib/match-notes-types'
import { computeTeamSummary, fetchPlayerAggregations, type TeamSummary, type PlayerAgg } from '@/lib/match-notes-aggregations'

export default function DashboardTeamSummary({ notes }: { notes: MatchNote[] }) {
  const [players, setPlayers] = useState<PlayerAgg[]>([])
  const summary = computeTeamSummary(notes)

  useEffect(() => {
    fetchPlayerAggregations('').then(setPlayers).catch(() => {})
  }, [])

  if (summary.totalMatches === 0) {
    return (
      <div className="text-center py-16">
        <BarChart3 size={32} className="text-[#62666d] mx-auto mb-3" />
        <p className="text-sm text-[#8a8f98]">Crea apunts de partits per veure el resum d&apos;equip.</p>
      </div>
    )
  }

  const topScorers = [...players].sort((a, b) => b.goals - a.goals).slice(0, 5)
  const topAssisters = [...players].sort((a, b) => b.assists - a.assists).slice(0, 5)
  const topRated = [...players].filter((p) => p.matchesRated >= 2).sort((a, b) => b.avgRating - a.avgRating).slice(0, 5)

  return (
    <div className="space-y-4">
      {/* Season summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard icon={CalendarCheck} label="Partits" value={summary.totalMatches} color="green" />
        <StatCard
          icon={Target}
          label="V / E / D"
          value={`${summary.wins}/${summary.draws}/${summary.losses}`}
          color="cyan"
        />
        <StatCard icon={Target} label="Gols F / C" value={`${summary.goalsFor} / ${summary.goalsAgainst}`} color="amber" />
        <StatCard
          icon={Shield}
          label="% Victòries"
          value={`${summary.totalMatches ? Math.round((summary.wins / summary.totalMatches) * 100) : 0}%`}
          color="purple"
        />
      </div>

      {/* Home vs Away */}
      <div className="glass-card rounded-lg p-5">
        <h4 className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider mb-3">Local vs Visitant</h4>
        <div className="grid grid-cols-2 gap-4">
          <SplitBlock label="Local" data={summary.homeAway.home} color="green" />
          <SplitBlock label="Visitant" data={summary.homeAway.away} color="blue" />
        </div>
      </div>

      {/* Formation usage */}
      {summary.formationUsage.length > 0 && (
        <div className="glass-card rounded-lg p-5">
          <h4 className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider mb-3">Formacions més usades</h4>
          <div className="space-y-2">
            {summary.formationUsage.map((f) => {
              const pct = (f.count / summary.totalMatches) * 100
              const winPct = f.count ? Math.round((f.wins / f.count) * 100) : 0
              return (
                <div key={f.formation} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-white w-14 shrink-0">{f.formation}</span>
                  <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500/40 to-[#22c55e]/40"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="absolute right-2 top-0 h-full flex items-center text-[9px] text-[#8a8f98]">
                      {f.count}x
                    </span>
                  </div>
                  <span className="text-[10px] text-green-400 w-10 text-right">{winPct}% V</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Leaderboards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Leaderboard title="Golejadors" items={topScorers.map((p) => ({ name: p.name, value: p.goals, suffix: 'G' }))} color="green" />
        <Leaderboard title="Assistents" items={topAssisters.map((p) => ({ name: p.name, value: p.assists, suffix: 'A' }))} color="cyan" />
        <Leaderboard title="Millor valorats" items={topRated.map((p) => ({ name: p.name, value: p.avgRating, suffix: '★' }))} color="amber" />
      </div>

      {/* Attendance heatmap placeholder */}
      {players.length > 0 && (
        <div className="glass-card rounded-lg p-5">
          <h4 className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={12} /> Assistència dels jugadors
          </h4>
          <div className="space-y-1">
            {players.slice(0, 12).map((p) => {
              const pct = p.totalNotes > 0 ? (p.attended / p.totalNotes) * 100 : 0
              return (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8a8f98] w-28 truncate">{p.name}</span>
                  <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-[#62666d] w-10 text-right">
                    {p.attended}/{p.totalNotes}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof CalendarCheck; label: string; value: string | number; color: string }) {
  return (
    <div className="glass-card rounded-xl p-4 text-center">
      <Icon size={14} className="mx-auto mb-1.5" style={{ color: `var(--color-${color}-400, #4ade80)` }} />
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[10px] text-[#8a8f98]">{label}</p>
    </div>
  )
}

function SplitBlock({ label, data, color }: { label: string; data: { played: number; wins: number; gf: number; ga: number }; color: string }) {
  const winPct = data.played ? Math.round((data.wins / data.played) * 100) : 0
  return (
    <div className="text-center">
      <p className="text-xs font-semibold mb-2" style={{ color: `var(--color-${color}-400, #4ade80)` }}>{label}</p>
      <p className="text-2xl font-black text-white">{winPct}%</p>
      <p className="text-[10px] text-[#8a8f98]">{data.played} partits · {data.gf}GF {data.ga}GC</p>
    </div>
  )
}

function Leaderboard({ title, items, color }: { title: string; items: { name: string; value: number; suffix: string }[]; color: string }) {
  return (
    <div className="glass-card rounded-lg p-4">
      <h4 className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-wider mb-2">{title}</h4>
      {items.length === 0 ? (
        <p className="text-[10px] text-[#62666d]">Sense dades</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={item.name} className="flex items-center gap-2">
              <span className="text-[10px] font-bold w-4 text-[#62666d]">{i + 1}</span>
              <span className="text-xs text-white truncate flex-1">{item.name}</span>
              <span className="text-xs font-bold" style={{ color: `var(--color-${color}-400, #4ade80)` }}>
                {item.value}{item.suffix}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
