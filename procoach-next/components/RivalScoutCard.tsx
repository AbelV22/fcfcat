'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown, ChevronUp, Target, Clock, AlertTriangle,
  Shield, Users, Home, Plane, Crosshair, BarChart2, Maximize2,
} from 'lucide-react'
import type { RivalReport, GoalBucket, PlayerStat, MatchResult, StandingRow, FieldSizeRecord } from '@/lib/team-report'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) {
    const months = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
    return `${parts[0]} ${months[parseInt(parts[1], 10) - 1] || parts[1]}`
  }
  return d
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n').replace(/[ç]/g, 'c').replace(/[·.]/g, '-')
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function FormDot({ result }: { result: 'W' | 'D' | 'L' | null }) {
  const cls =
    result === 'W' ? 'bg-green-500 text-white' :
    result === 'D' ? 'bg-amber-400 text-white' :
    result === 'L' ? 'bg-red-500 text-white' : 'bg-white/10 text-slate-500'
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${cls}`}>
      {result ?? '?'}
    </span>
  )
}

function ScoreBadge({ gf, ga }: { gf: number | null; ga: number | null }) {
  if (gf === null || ga === null) return <span className="text-slate-500 text-sm">–</span>
  const win = gf > ga, lose = gf < ga
  return (
    <span className="font-bold tabular-nums text-sm">
      <span className={win ? 'text-green-400' : lose ? 'text-red-400' : 'text-slate-300'}>{gf}</span>
      <span className="text-slate-600 mx-0.5">-</span>
      <span className={lose ? 'text-green-400' : win ? 'text-red-400' : 'text-slate-300'}>{ga}</span>
    </span>
  )
}

// Mini bar chart (scored only, for preview)
function MiniGoalBars({ buckets }: { buckets: GoalBucket[] }) {
  const max = Math.max(...buckets.map(b => b.scored), 1)
  return (
    <div className="flex items-end gap-0.5" style={{ height: '32px' }}>
      {buckets.map(b => (
        <div key={b.label} className="flex-1 flex items-end" style={{ height: '100%' }}>
          <div
            className="w-full rounded-t-sm bg-gradient-to-t from-purple-700 to-purple-400 opacity-80"
            style={{ height: `${Math.max((b.scored / max) * 100, b.scored > 0 ? 8 : 1)}%`, minHeight: '1px' }}
          />
        </div>
      ))}
    </div>
  )
}

// Full goal timing chart (scored + conceded)
function FullGoalTimingBar({ buckets }: { buckets: GoalBucket[] }) {
  const max = Math.max(...buckets.flatMap(b => [b.scored, b.conceded]), 1)
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: '80px' }}>
        {buckets.map(b => (
          <div key={b.label} className="flex-1 flex items-end gap-px" style={{ height: '100%' }}>
            <div
              className="flex-1 rounded-t bg-gradient-to-t from-green-700 to-green-400 opacity-80 hover:opacity-100 transition-opacity"
              style={{ height: `${Math.max((b.scored / max) * 100, b.scored > 0 ? 4 : 1)}%`, minHeight: '1px' }}
              title={`Gols marcats: ${b.scored}`}
            />
            <div
              className="flex-1 rounded-t bg-gradient-to-t from-red-800 to-red-500 opacity-70 hover:opacity-100 transition-opacity"
              style={{ height: `${Math.max((b.conceded / max) * 100, b.conceded > 0 ? 4 : 1)}%`, minHeight: '1px' }}
              title={`Gols encaixats: ${b.conceded}`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {buckets.map(b => (
          <div key={b.label} className="flex-1 text-center">
            <div className="text-[9px] text-slate-500">{b.label.replace("'", '')}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {buckets.map(b => (
          <div key={b.label} className="flex-1 text-center">
            <div className="text-[10px] font-bold text-green-400">{b.scored}</div>
            <div className="text-[10px] text-red-400">{b.conceded}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />Marcats</span>
        <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />Encaixats</span>
      </div>
    </div>
  )
}

function SplitBlock({
  label, record, icon,
}: {
  label: string
  record: { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number }
  icon: string
}) {
  const winRate = record.played > 0 ? Math.round((record.wins / record.played) * 100) : 0
  return (
    <div className="bg-black/20 rounded-xl p-3.5 border border-white/5">
      <div className="flex items-center gap-1.5 mb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        <span>{icon}</span>{label}
      </div>
      <div className="grid grid-cols-4 gap-1 mb-2">
        {[
          { v: record.played, l: 'PJ', c: 'text-white' },
          { v: record.wins, l: 'G', c: 'text-green-400' },
          { v: record.draws, l: 'E', c: 'text-amber-400' },
          { v: record.losses, l: 'P', c: 'text-red-400' },
        ].map(s => (
          <div key={s.l} className="text-center">
            <div className={`text-sm font-black ${s.c}`}>{s.v}</div>
            <div className="text-[9px] text-slate-600 uppercase">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        <span>{record.gf}–{record.ga}</span>
        <span className="text-white font-bold">{record.points} pts</span>
      </div>
      <div className="w-full h-1 bg-white/8 rounded-full">
        <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" style={{ width: `${winRate}%` }} />
      </div>
    </div>
  )
}

function RivalSquadTable({ players }: { players: PlayerStat[] }) {
  const sorted = [...players].sort((a, b) => b.appearances - a.appearances).slice(0, 20)
  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/8 text-slate-500 text-[10px] uppercase">
            <th className="text-left py-2 px-3 font-medium">Jugador</th>
            <th className="text-center py-2 px-2 font-medium w-8">PJ</th>
            <th className="text-center py-2 px-2 font-medium w-8">⚽</th>
            <th className="text-center py-2 px-2 font-medium w-8">🟨</th>
            <th className="text-center py-2 px-2 font-medium w-8">🟥</th>
            <th className="text-center py-2 px-2 font-medium w-14 hidden sm:table-cell">Min</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/4">
          {sorted.map((p, i) => (
            <tr key={i} className={`transition-colors ${p.risk ? 'bg-amber-900/8' : 'hover:bg-white/3'}`}>
              <td className="py-2 px-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-200 font-medium">{p.name}</span>
                  {p.risk && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full font-semibold">⚠️</span>
                  )}
                </div>
              </td>
              <td className="py-2 px-2 text-center text-slate-500">{p.appearances || '–'}</td>
              <td className="py-2 px-2 text-center">
                {p.goals > 0 ? <span className="text-green-400 font-bold">{p.goals}</span> : <span className="text-slate-700">–</span>}
              </td>
              <td className="py-2 px-2 text-center">
                {p.yellow_cards > 0
                  ? <span className={p.risk ? 'text-amber-400 font-bold' : 'text-slate-500'}>{p.yellow_cards}</span>
                  : <span className="text-slate-700">–</span>}
              </td>
              <td className="py-2 px-2 text-center">
                {p.red_cards > 0 ? <span className="text-red-400 font-bold">{p.red_cards}</span> : <span className="text-slate-700">–</span>}
              </td>
              <td className="py-2 px-2 text-center text-slate-600 hidden sm:table-cell">
                {p.minutes_played > 0 ? `${p.minutes_played}'` : '–'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Field size breakdown ─────────────────────────────────────────────────────

const FIELD_ICON: Record<string, string> = {
  petit: '▪',
  mig:   '▫',
  gran:  '□',
}

const FIELD_COLOR: Record<string, { border: string; text: string; bar: string; bg: string }> = {
  petit: { border: 'border-violet-500/20', text: 'text-violet-300', bar: 'from-violet-700 to-violet-400', bg: 'bg-violet-500/8' },
  mig:   { border: 'border-sky-500/20',    text: 'text-sky-300',    bar: 'from-sky-700 to-sky-400',    bg: 'bg-sky-500/8'    },
  gran:  { border: 'border-emerald-500/20',text: 'text-emerald-300',bar: 'from-emerald-700 to-emerald-400',bg: 'bg-emerald-500/8'},
}

function FieldSizeCard({ rec }: { rec: FieldSizeRecord }) {
  const wr = rec.plays > 0 ? Math.round((rec.wins / rec.plays) * 100) : 0
  const gd = rec.gf - rec.ga
  const col = FIELD_COLOR[rec.category] ?? FIELD_COLOR.mig
  return (
    <div className={`rounded-xl p-3.5 border ${col.border} ${col.bg}`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm ${col.text}`}>{FIELD_ICON[rec.category]}</span>
          <span className={`text-xs font-black ${col.text}`}>{rec.label}</span>
        </div>
        <span className="text-[9px] text-slate-600">{rec.areaRange}</span>
      </div>

      {/* W/D/L grid */}
      <div className="grid grid-cols-4 gap-1 mb-2.5">
        {[
          { v: rec.plays,  l: 'PJ', c: 'text-white' },
          { v: rec.wins,   l: 'G',  c: 'text-green-400' },
          { v: rec.draws,  l: 'E',  c: 'text-amber-400' },
          { v: rec.losses, l: 'P',  c: 'text-red-400' },
        ].map(s => (
          <div key={s.l} className="text-center">
            <div className={`text-sm font-black ${s.c}`}>{s.v}</div>
            <div className="text-[9px] text-slate-600 uppercase">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Goals + win-rate bar */}
      <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
        <span>{rec.gf}–{rec.ga} <span className={`font-bold ${gd >= 0 ? 'text-green-400' : 'text-red-400'}`}>({gd >= 0 ? '+' : ''}{gd})</span></span>
        <span className={`font-bold ${col.text}`}>{wr}%</span>
      </div>
      <div className="w-full h-1 bg-white/8 rounded-full mb-2">
        <div className={`h-full bg-gradient-to-r ${col.bar} rounded-full`} style={{ width: `${wr}%` }} />
      </div>

      {/* Example field */}
      {rec.exampleVenue && (
        <div className="text-[9px] text-slate-700 truncate">
          Ex: {rec.exampleVenue}{rec.exampleDims ? ` (${rec.exampleDims})` : ''}
        </div>
      )}
    </div>
  )
}

/** Compact inline preview (3 badges) used in the preview section */
function FieldSizeMini({ records }: { records: FieldSizeRecord[] }) {
  if (records.length === 0) return null
  return (
    <div className="mt-3 bg-black/20 rounded-xl px-4 py-3 border border-white/5">
      <div className="flex items-center gap-1.5 mb-2">
        <Maximize2 size={10} className="text-slate-500" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Fora per mida de camp</span>
      </div>
      <div className="flex gap-2">
        {records.map(r => {
          const col = FIELD_COLOR[r.category] ?? FIELD_COLOR.mig
          const wr = r.plays > 0 ? Math.round((r.wins / r.plays) * 100) : 0
          return (
            <div key={r.category} className={`flex-1 rounded-lg p-2.5 border ${col.border} ${col.bg} text-center`}>
              <div className={`text-[9px] font-bold ${col.text} mb-1`}>{r.label}</div>
              <div className="text-xs font-black text-white">
                <span className="text-green-400">{r.wins}</span>
                <span className="text-slate-600 mx-0.5">·</span>
                <span className="text-amber-400">{r.draws}</span>
                <span className="text-slate-600 mx-0.5">·</span>
                <span className="text-red-400">{r.losses}</span>
              </div>
              <div className="text-[9px] text-slate-600 mt-0.5">{r.plays} PJ · {wr}%</div>
              {r.exampleDims && <div className="text-[8px] text-slate-700 mt-0.5">{r.exampleDims}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface NextMatchInfo {
  jornada: number
  date: string
  time?: string
  opponent: string
  opponentSlug?: string
  isHome: boolean
  venue?: string
  referee?: string | null
  referees?: string[]
}

export function RivalScoutCard({
  rival,
  nextMatch,
  headToHead,
}: {
  rival: RivalReport
  nextMatch: NextMatchInfo
  headToHead: MatchResult[]
}) {
  const [expanded, setExpanded] = useState(false)

  const dangerBucket = [...rival.goalBuckets].sort((a, b) => b.scored - a.scored)[0]
  const winRate = rival.played > 0 ? Math.round((rival.wins / rival.played) * 100) : 0
  const gd = rival.gf - rival.ga

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#0a1e36] via-[#0d1a2e] to-[#0f172a]">
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

      {/* ─── Header bar ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 gap-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Crosshair size={12} className="text-cyan-400 shrink-0" />
          <span className="text-[10px] font-black tracking-[0.15em] text-cyan-400 uppercase">
            Informe de Reconeixement
          </span>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[10px] text-slate-500 font-medium">J{nextMatch.jornada}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">{formatDate(nextMatch.date)}{nextMatch.time ? ` · ${nextMatch.time}h` : ''}</span>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
            nextMatch.isHome
              ? 'bg-green-500/15 text-green-400 border border-green-500/20'
              : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
          }`}>
            {nextMatch.isHome ? '🏠 Local' : '✈️ Visita'}
          </span>
        </div>
      </div>

      {/* ─── Preview (always visible) ───────────────────────────────── */}
      <div className="px-4 sm:px-6 py-4 sm:py-5">

        {/* Team identity + quick metrics */}
        <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-5">
          {/* Crest */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/20 flex items-center justify-center text-2xl font-black text-cyan-300">
              {nextMatch.opponent.charAt(0)}
            </div>
            {rival.position && (
              <div className="absolute -bottom-1 -right-1 text-[9px] font-black bg-yellow-500 text-black px-1.5 rounded-full">
                #{rival.position}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-white leading-tight truncate mb-1">{nextMatch.opponent}</h2>

            {/* Stats pills */}
            <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-2.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/6 text-slate-400">
                {rival.played} PJ
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                {rival.wins}V
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                {rival.draws}E
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                {rival.losses}D
              </span>
              {rival.played > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/6 text-slate-300">
                  {rival.gf}–{rival.ga} ({gd >= 0 ? '+' : ''}{gd})
                </span>
              )}
              {rival.points > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {rival.points} pts
                </span>
              )}
            </div>

            {/* Win rate bar */}
            {rival.played > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
                    style={{ width: `${winRate}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">{winRate}%</span>
              </div>
            )}
          </div>

          {/* Form strip — hide on very small screens */}
          {rival.form.length > 0 && (
            <div className="hidden xs:flex shrink-0 flex-col items-end gap-1">
              <span className="text-[9px] text-slate-600 uppercase tracking-wider">Forma</span>
              <div className="flex gap-1">
                {rival.form.slice(0, 5).reverse().map((r, i) => <FormDot key={i} result={r.result} />)}
              </div>
            </div>
          )}
        </div>

        {/* Form strip — mobile only, below identity */}
        {rival.form.length > 0 && (
          <div className="flex xs:hidden items-center gap-1.5 mb-3 -mt-1">
            <span className="text-[10px] text-slate-500">Forma:</span>
            {rival.form.slice(0, 5).reverse().map((r, i) => <FormDot key={i} result={r.result} />)}
          </div>
        )}

        {/* ─── 3-column intel grid ──────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* Golejadors / Amenaces */}
          <div className="bg-black/25 rounded-xl p-4 border border-green-500/10">
            <div className="flex items-center gap-1.5 mb-3">
              <Target size={11} className="text-green-400" />
              <span className="text-[10px] font-black text-green-400 uppercase tracking-wider">Amenaces ofensives</span>
            </div>
            <div className="space-y-1.5">
              {rival.topScorers.length > 0
                ? rival.topScorers.slice(0, 4).map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[9px] text-slate-600 w-3 shrink-0">{i + 1}</span>
                        <span className="text-xs text-slate-200 truncate">{p.name.split(',')[0]}</span>
                      </div>
                      <span className="text-xs font-black text-green-400 shrink-0 ml-2">{p.goals} ⚽</span>
                    </div>
                  ))
                : <p className="text-xs text-slate-600 italic">Sense dades</p>}
            </div>
          </div>

          {/* Timing / Quan marca */}
          <div className="bg-black/25 rounded-xl p-4 border border-purple-500/10">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock size={11} className="text-purple-400" />
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Quan marca</span>
            </div>
            <MiniGoalBars buckets={rival.goalBuckets} />
            <div className="flex gap-0.5 mt-1 mb-2">
              {rival.goalBuckets.map(b => (
                <div key={b.label} className="flex-1 text-center text-[8px] text-slate-700">{b.label.replace("'", '').replace('–', '-')}</div>
              ))}
            </div>
            {dangerBucket && dangerBucket.scored > 0 && (
              <div className="text-[10px] text-slate-400 mt-1">
                Perill màxim: <span className="text-purple-300 font-bold">{dangerBucket.label}</span>
                <span className="text-slate-600 ml-1">({dangerBucket.scored} gols)</span>
              </div>
            )}
          </div>

          {/* Risc targetes */}
          <div className="bg-black/25 rounded-xl p-4 border border-amber-500/10">
            <div className="flex items-center gap-1.5 mb-3">
              <AlertTriangle size={11} className="text-amber-400" />
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Jugadors en risc</span>
            </div>
            <div className="space-y-1.5">
              {rival.apercibits.length > 0
                ? rival.apercibits.slice(0, 4).map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-slate-200 truncate pr-1">{p.name.split(',')[0]}</span>
                      <span className="text-xs font-bold text-amber-400 shrink-0">🟨 {p.yellow_cards}</span>
                    </div>
                  ))
                : <p className="text-xs text-slate-600 italic">Cap jugador en risc</p>}
            </div>
            {rival.apercibits.length > 0 && (
              <p className="text-[9px] text-amber-600/60 mt-2">Una groga els suspèn</p>
            )}
          </div>
        </div>

        {/* Field size mini (only if we have data) */}
        <FieldSizeMini records={rival.awayByFieldSize} />
      </div>

      {/* ─── Expanded full report ───────────────────────────────────── */}
      <div
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{ maxHeight: expanded ? '3000px' : '0px' }}
      >
        <div className="px-4 sm:px-6 pb-2 space-y-5 sm:space-y-6 border-t border-white/5 pt-4 sm:pt-5">

          {/* Goal timing full */}
          <div>
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">
              Timing de gols — Anàlisi complet
            </div>
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
              <FullGoalTimingBar buckets={rival.goalBuckets} />
            </div>
          </div>

          {/* Home / Away splits */}
          {(rival.home.played > 0 || rival.away.played > 0) && (
            <div>
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">
                Rendiment local i visitant
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SplitBlock label="Com a Local" record={rival.home} icon="🏠" />
                <SplitBlock label="Com a Visitant" record={rival.away} icon="✈️" />
              </div>
            </div>
          )}

          {/* Away performance by field size */}
          {rival.awayByFieldSize.length > 0 && (
            <div>
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Maximize2 size={11} />
                Rendiment visitant per mida de camp
              </div>
              <div className={`grid gap-3 ${rival.awayByFieldSize.length === 1 ? 'grid-cols-1 max-w-xs' : rival.awayByFieldSize.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
                {rival.awayByFieldSize.map(rec => <FieldSizeCard key={rec.category} rec={rec} />)}
              </div>
              <p className="text-[9px] text-slate-700 mt-2">
                * Dades basades en camps amb dimensions confirmades. Cobertura parcial — {rival.awayByFieldSize.reduce((s, r) => s + r.plays, 0)} de {rival.away.played} partits fora identificats.
              </p>
            </div>
          )}

          {/* Most minutes */}
          {rival.mostMinutes.length > 0 && (
            <div>
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">
                Jugadors amb més minuts
              </div>
              <div className="bg-black/20 rounded-xl p-4 border border-white/5 grid grid-cols-2 gap-x-6 gap-y-1.5">
                {rival.mostMinutes.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 truncate pr-2">{p.name.split(',')[0]}</span>
                    <span className="text-xs font-bold text-cyan-400 shrink-0">{p.minutes_played}'</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full squad */}
          {rival.players.length > 0 && (
            <div>
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">
                Plantilla completa — {rival.players.length} jugadors
              </div>
              <RivalSquadTable players={rival.players} />
              {rival.players.some(p => p.risk) && (
                <p className="text-[10px] text-amber-500/60 mt-2 flex items-center gap-1">
                  <AlertTriangle size={10} />
                  ⚠️ = jugador apercibut (4, 8 o 12 grogues). La propera groga implica suspensió.
                </p>
              )}
            </div>
          )}

          {/* Head to head */}
          {headToHead.length > 0 && (
            <div>
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <BarChart2 size={11} />
                Historial directe — últims {headToHead.length} enfrontaments
              </div>
              <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-1.5">
                {headToHead.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${
                      m.result === 'W' ? 'bg-green-500 text-white' :
                      m.result === 'D' ? 'bg-amber-400 text-white' :
                      m.result === 'L' ? 'bg-red-500 text-white' : 'bg-white/10 text-slate-500'
                    }`}>{m.result ?? '?'}</span>
                    <span className="text-[10px] text-slate-500 w-14 text-right">{formatDate(m.date)}</span>
                    <div className="flex-1 text-center">
                      <ScoreBadge gf={m.goalsFor} ga={m.goalsAgainst} />
                    </div>
                    <span className={`text-xs ${m.isHome ? 'text-green-400' : 'text-sky-400'}`}>
                      {m.isHome ? '🏠' : '✈️'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Venue + Referee recap */}
          {(nextMatch.venue || nextMatch.referee) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {nextMatch.venue && (
                <div className="bg-black/20 rounded-xl p-3.5 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span>📍</span> Camp
                  </div>
                  <p className="text-sm text-slate-200 font-medium">{nextMatch.venue.split('  ')[0]}</p>
                </div>
              )}
              {nextMatch.referee && (
                <div className="bg-black/20 rounded-xl p-3.5 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Shield size={10} />Àrbitre
                  </div>
                  <p className="text-sm text-slate-200 font-medium">
                    <a href={`/arbitre/${slugify(nextMatch.referee)}`} className="hover:text-cyan-300 transition-colors">
                      {nextMatch.referee.split(',')[0]}
                    </a>
                  </p>
                  {nextMatch.referees && nextMatch.referees.length > 1 && (
                    <p className="text-[10px] text-slate-600 mt-0.5">+{nextMatch.referees.length - 1} assistents</p>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ─── Expand / Collapse button ──────────────────────────────── */}
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full py-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/35 active:bg-cyan-500/15 transition-all duration-200 flex items-center justify-center gap-2.5 group"
        >
          <Crosshair size={13} className="text-cyan-500 group-hover:text-cyan-300 transition-colors" />
          <span className="text-sm font-black text-cyan-400 group-hover:text-cyan-300 tracking-wide transition-colors">
            {expanded ? 'Plegar informe' : 'Veure informe complet del rival'}
          </span>
          {expanded
            ? <ChevronUp size={15} className="text-cyan-500 group-hover:text-cyan-300 transition-colors" />
            : <ChevronDown size={15} className="text-cyan-500 group-hover:text-cyan-300 transition-colors" />}
        </button>
      </div>

      {/* Bottom glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
    </div>
  )
}
