'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Users } from 'lucide-react'

type PlayerEntry = {
  name: string
  appearances: number
  starts?: number
  goals: number
  yellow_cards: number
  red_cards: number
  minutes_played: number
  risk: boolean
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n').replace(/[ç]/g, 'c').replace(/[·.]/g, '-')
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export default function FullSquadSection({ players, hasMinutes }: { players: PlayerEntry[]; hasMinutes: boolean }) {
  const [expanded, setExpanded] = useState(false)

  if (players.length === 0) return null

  return (
    <div className="card-spotlight rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <Users size={18} className="text-slate-500" />
          <span className="text-sm font-semibold text-white">{players.length} jugadors a la plantilla</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
            {expanded ? 'Amagar' : 'Mostra plantilla completa'}
          </span>
          <ChevronDown
            size={16}
            className={`text-slate-500 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <div
        className="transition-all duration-500 ease-in-out overflow-hidden"
        style={{ maxHeight: expanded ? `${players.length * 44 + 60}px` : '0px' }}
      >
        <div className="px-6 pb-6">
          {/* Header */}
          <div className="grid grid-cols-[1fr_50px_50px_50px_60px] gap-2 text-[10px] text-slate-500 uppercase tracking-wider font-semibold pb-2 border-b border-white/5">
            <span>Nom</span>
            <span className="text-center">PJ</span>
            <span className="text-center">Gols</span>
            <span className="text-center">Grg.</span>
            <span className="text-right">{hasMinutes ? 'Min.' : 'Tit.'}</span>
          </div>
          {/* Rows */}
          {players.map((p, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_50px_50px_50px_60px] gap-2 items-center py-2.5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} ${p.risk ? 'border-l-2 border-amber-400/50 pl-2' : ''}`}
            >
              <Link href={`/jugador/${slugify(p.name)}`} className="text-sm text-slate-200 hover:text-white truncate transition-colors">
                {p.name}
              </Link>
              <span className="text-center text-sm font-bold text-white tabular-nums">{p.appearances}</span>
              <span className={`text-center text-sm font-bold tabular-nums ${p.goals > 0 ? 'text-green-400' : 'text-slate-600'}`}>{p.goals}</span>
              <span className={`text-center text-sm font-bold tabular-nums ${p.risk ? 'text-amber-400' : p.yellow_cards > 0 ? 'text-slate-300' : 'text-slate-600'}`}>{p.yellow_cards}</span>
              <span className="text-right text-sm font-bold text-cyan-400/80 tabular-nums">
                {hasMinutes ? `${p.minutes_played}'` : (p.starts ?? p.appearances)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
