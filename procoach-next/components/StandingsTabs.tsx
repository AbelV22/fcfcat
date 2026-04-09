'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ListOrdered, Flame, Home, Plane } from 'lucide-react'
import type { FormStandingEntry, StandingEntry } from '@/lib/supabase-data'

type TabId = 'general' | 'local' | 'visitant' | 'racha'

const TABS: { id: TabId; label: string; icon: typeof ListOrdered }[] = [
  { id: 'general', label: 'General', icon: ListOrdered },
  { id: 'local', label: 'Local', icon: Home },
  { id: 'visitant', label: 'Visitant', icon: Plane },
  { id: 'racha', label: 'Racha (5)', icon: Flame },
]

function computeSplitStandings(standings: StandingEntry[], mode: 'local' | 'visitant') {
  return standings
    .map((s) => {
      const wins = mode === 'local' ? s.home_won : s.away_won
      const draws = mode === 'local' ? s.home_drawn : s.away_drawn
      const losses = mode === 'local' ? s.home_lost : s.away_lost
      const played = wins + draws + losses
      const points = wins * 3 + draws
      return { ...s, played, wins, draws, losses, points }
    })
    .sort((a, b) => b.points - a.points || (b.wins - a.wins) || a.name.localeCompare(b.name))
    .map((s, i) => ({ ...s, position: i + 1 }))
}

export default function StandingsTabs({
  standings,
  formStandings,
  teamSlug,
}: {
  standings: StandingEntry[]
  formStandings: FormStandingEntry[]
  teamSlug: string
}) {
  const [tab, setTab] = useState<TabId>('general')

  const homeStandings = useMemo(() => computeSplitStandings(standings, 'local'), [standings])
  const awayStandings = useMemo(() => computeSplitStandings(standings, 'visitant'), [standings])

  if (standings.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <ListOrdered size={40} className="text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">No s&apos;ha trobat la classificacio.</p>
      </div>
    )
  }

  const showGfGa = tab === 'general'
  const activeStandings =
    tab === 'local' ? homeStandings :
    tab === 'visitant' ? awayStandings :
    standings

  const accentColor =
    tab === 'local' ? 'cyan' :
    tab === 'visitant' ? 'purple' :
    tab === 'racha' ? 'orange' : 'green'

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              tab === id
                ? 'bg-white/10 text-white'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Main standings table (General, Local, Visitant) */}
      {tab !== 'racha' && (
        <div className="glass-card rounded-2xl p-4 sm:p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-white/10">
                <th className="text-center py-3 px-1.5 sm:px-2 w-8">#</th>
                <th className="text-left py-3 px-1.5 sm:px-2">Equip</th>
                <th className="text-center py-3 px-1.5 sm:px-2">PJ</th>
                <th className="text-center py-3 px-1.5 sm:px-2">PG</th>
                <th className="text-center py-3 px-1.5 sm:px-2">PE</th>
                <th className="text-center py-3 px-1.5 sm:px-2">PP</th>
                {showGfGa && (
                  <>
                    <th className="text-center py-3 px-1.5 sm:px-2">GF</th>
                    <th className="text-center py-3 px-1.5 sm:px-2">GC</th>
                    <th className="text-center py-3 px-1.5 sm:px-2">Dif</th>
                  </>
                )}
                <th className="text-center py-3 px-1.5 sm:px-2 font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {activeStandings.map((s, i) => {
                const isMyTeam = s.slug === teamSlug
                const diff = s.gf - s.ga
                return (
                  <tr
                    key={s.slug}
                    className={`border-b border-white/5 transition-colors ${isMyTeam ? `bg-${accentColor}-500/10` : 'hover:bg-white/3'}`}
                    style={isMyTeam ? { backgroundColor: `color-mix(in srgb, var(--color-${accentColor}-500, #22c55e) 10%, transparent)` } : undefined}
                  >
                    <td className={`py-3 px-1.5 sm:px-2 text-center font-bold ${isMyTeam ? `text-${accentColor}-400` : i < 3 ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {s.position}
                    </td>
                    <td className="py-3 px-1.5 sm:px-2">
                      <Link
                        href={`/equip/${s.slug}`}
                        className={`hover:text-green-400 transition-colors ${isMyTeam ? 'text-white font-bold' : 'text-slate-200'}`}
                      >
                        <span className="hidden sm:inline">{s.name}</span>
                        <span className="sm:hidden">{s.name.length > 16 ? s.name.slice(0, 14) + '...' : s.name}</span>
                        {isMyTeam && <span className="ml-1.5 text-green-400 text-xs">(tu)</span>}
                      </Link>
                    </td>
                    <td className="py-3 px-1.5 sm:px-2 text-center text-slate-300">{s.played}</td>
                    <td className="py-3 px-1.5 sm:px-2 text-center text-green-400">{s.wins}</td>
                    <td className="py-3 px-1.5 sm:px-2 text-center text-amber-400">{s.draws}</td>
                    <td className="py-3 px-1.5 sm:px-2 text-center text-red-400">{s.losses}</td>
                    {showGfGa && (
                      <>
                        <td className="py-3 px-1.5 sm:px-2 text-center text-slate-300">{s.gf}</td>
                        <td className="py-3 px-1.5 sm:px-2 text-center text-slate-400">{s.ga}</td>
                        <td className={`py-3 px-1.5 sm:px-2 text-center font-bold ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </td>
                      </>
                    )}
                    <td className={`py-3 px-1.5 sm:px-2 text-center font-black text-lg ${isMyTeam ? `text-${accentColor}-400` : 'text-white'}`}
                      style={isMyTeam ? { color: `var(--color-${accentColor}-400, #4ade80)` } : undefined}
                    >
                      {s.points}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form standings (Racha tab) */}
      {tab === 'racha' && formStandings.length > 0 && (
        <div className="glass-card rounded-2xl p-4 sm:p-6 overflow-x-auto">
          <p className="text-slate-400 text-sm mb-4">Classificacio basada en els punts obtinguts als ultims 5 partits jugats</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-white/10">
                <th className="text-center py-3 px-1.5 sm:px-2 w-8">#</th>
                <th className="text-left py-3 px-1.5 sm:px-2">Equip</th>
                <th className="text-center py-3 px-1.5 sm:px-2">Ultims 5</th>
                <th className="text-center py-3 px-1.5 sm:px-2">PJ</th>
                <th className="text-center py-3 px-1.5 sm:px-2">PG</th>
                <th className="text-center py-3 px-1.5 sm:px-2">PE</th>
                <th className="text-center py-3 px-1.5 sm:px-2">PP</th>
                <th className="text-center py-3 px-1.5 sm:px-2">GF</th>
                <th className="text-center py-3 px-1.5 sm:px-2">GC</th>
                <th className="text-center py-3 px-1.5 sm:px-2 font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {formStandings.map((s, i) => {
                const isMyTeam = s.slug === teamSlug
                return (
                  <tr
                    key={s.slug}
                    className={`border-b border-white/5 transition-colors ${isMyTeam ? 'bg-orange-500/10' : 'hover:bg-white/3'}`}
                  >
                    <td className={`py-3 px-1.5 sm:px-2 text-center font-bold ${isMyTeam ? 'text-orange-400' : i < 3 ? 'text-orange-400/70' : 'text-slate-500'}`}>
                      {s.position}
                    </td>
                    <td className="py-3 px-1.5 sm:px-2">
                      <Link
                        href={`/equip/${s.slug}`}
                        className={`hover:text-green-400 transition-colors ${isMyTeam ? 'text-white font-bold' : 'text-slate-200'}`}
                      >
                        <span className="hidden sm:inline">{s.name}</span>
                        <span className="sm:hidden">{s.name.length > 16 ? s.name.slice(0, 14) + '...' : s.name}</span>
                        {isMyTeam && <span className="ml-1.5 text-green-400 text-xs">(tu)</span>}
                      </Link>
                    </td>
                    <td className="py-3 px-1.5 sm:px-2">
                      <div className="flex gap-1 justify-center">
                        {s.form.slice().reverse().map((r, fi) => (
                          <span
                            key={fi}
                            className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${
                              r === 'W' ? 'bg-green-500/20 text-green-400' :
                              r === 'D' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {r === 'W' ? 'V' : r === 'D' ? 'E' : 'D'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-1.5 sm:px-2 text-center text-slate-300">{s.played}</td>
                    <td className="py-3 px-1.5 sm:px-2 text-center text-green-400">{s.wins}</td>
                    <td className="py-3 px-1.5 sm:px-2 text-center text-amber-400">{s.draws}</td>
                    <td className="py-3 px-1.5 sm:px-2 text-center text-red-400">{s.losses}</td>
                    <td className="py-3 px-1.5 sm:px-2 text-center text-slate-300">{s.gf}</td>
                    <td className="py-3 px-1.5 sm:px-2 text-center text-slate-400">{s.ga}</td>
                    <td className={`py-3 px-1.5 sm:px-2 text-center font-black text-lg ${isMyTeam ? 'text-orange-400' : 'text-white'}`}>
                      {s.points}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'racha' && formStandings.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Flame size={40} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No hi ha dades de racha disponibles.</p>
        </div>
      )}
    </>
  )
}
