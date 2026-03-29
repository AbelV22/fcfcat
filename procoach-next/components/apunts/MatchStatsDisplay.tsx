'use client'

import { Crosshair, Waypoints, Shield, Flag, Hand as GloveIcon, Target, Clock } from 'lucide-react'
import type { MatchNote, MatchNoteEvent } from '@/lib/match-notes-types'
import { computeAutoStats } from '@/lib/match-stats-utils'

type EventEntry = Omit<MatchNoteEvent, 'id' | 'match_note_id'>

// ─── Bar Chart Row ───────────────────────────────────────
function StatBar({
  label, forVal, againstVal, higherIsBetter = true,
}: {
  label: string; forVal: number; againstVal: number; higherIsBetter?: boolean
}) {
  const max = Math.max(forVal, againstVal, 1)
  const forPct = (forVal / max) * 100
  const againstPct = (againstVal / max) * 100
  const forWins = higherIsBetter ? forVal > againstVal : forVal < againstVal
  const rivalWins = higherIsBetter ? againstVal > forVal : againstVal < forVal

  return (
    <div className="flex items-center gap-2 py-1">
      <span
        className={`text-xs font-bold w-6 text-right ${forWins ? 'text-green-400' : 'text-slate-400'}`}
      >
        {forVal}
      </span>
      <div className="flex-1 flex gap-0.5">
        <div className="flex-1 flex justify-end">
          <div
            className={`h-4 rounded-l transition-all ${forWins ? 'bg-green-500/40' : 'bg-slate-500/20'}`}
            style={{ width: `${forPct}%`, minWidth: forVal > 0 ? '4px' : '0' }}
          />
        </div>
        <div className="flex-1 flex justify-start">
          <div
            className={`h-4 rounded-r transition-all ${rivalWins ? 'bg-red-500/30' : 'bg-slate-500/20'}`}
            style={{ width: `${againstPct}%`, minWidth: againstVal > 0 ? '4px' : '0' }}
          />
        </div>
      </div>
      <span
        className={`text-xs font-bold w-6 text-left ${rivalWins ? 'text-red-400' : 'text-slate-400'}`}
      >
        {againstVal}
      </span>
    </div>
  )
}

function StatLabel({ text }: { text: string }) {
  return <p className="text-[10px] text-slate-500 text-center mb-0.5 mt-1">{text}</p>
}

function SingleStat({ label, value, color = 'white' }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-bold text-${color}`}>{value}</span>
    </div>
  )
}

function SectionHeader({ title, icon: Icon, color }: { title: string; icon: typeof Target; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
      <Icon size={13} style={{ color }} />
      <h4 className="text-xs font-semibold text-white uppercase tracking-wider">{title}</h4>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────
export default function MatchStatsDisplay({
  note,
  events,
}: {
  note: MatchNote
  events: EventEntry[]
}) {
  const auto = computeAutoStats(events)

  // Use manual values as override when available, fallback to auto
  const getStat = (manualFor: number | null, autoFor: number, manualAgainst?: number | null, autoAgainst?: number) => ({
    forVal: manualFor ?? autoFor,
    againstVal: manualAgainst ?? autoAgainst ?? 0,
  })

  const corners = getStat(note.corners_for, auto.corners_for, note.corners_against, auto.corners_against)
  const fouls = getStat(note.fouls_for, auto.fouls_committed, note.fouls_against, auto.fouls_suffered)
  const offsides = getStat(note.offsides_for, auto.offsides_for, note.offsides_against, auto.offsides_against)

  return (
    <div className="glass-card rounded-xl p-4">
      {/* Header with result */}
      <div className="flex items-center justify-center gap-6 mb-4 pb-3 border-b border-white/5">
        <div className="text-center">
          <p className="text-3xl font-black text-green-400">{auto.goals_total_for}</p>
          <p className="text-[9px] text-slate-500">Nosaltres</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-600">vs</p>
          <div className="flex gap-3 mt-1">
            <div className="text-center">
              <p className="text-xs font-bold text-slate-400">{auto.goals_1h_for}-{auto.goals_1h_against}</p>
              <p className="text-[8px] text-slate-600">1a part</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-slate-400">{auto.goals_2h_for}-{auto.goals_2h_against}</p>
              <p className="text-[8px] text-slate-600">2a part</p>
            </div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-3xl font-black text-red-400">{auto.goals_total_against}</p>
          <p className="text-[9px] text-slate-500">Rival</p>
        </div>
      </div>

      {/* ─── Atac ─── */}
      <SectionHeader title="Atac" icon={Crosshair} color="#4ade80" />
      <StatLabel text="Tirs a porta" />
      <StatBar label="Tirs a porta" forVal={auto.shots_on_target_for} againstVal={auto.shots_on_target_against} />
      <StatLabel text="Tirs fora" />
      <StatBar label="Tirs fora" forVal={auto.shots_off_target_for} againstVal={auto.shots_off_target_against} higherIsBetter={false} />
      {(auto.shots_woodwork_for > 0 || auto.shots_woodwork_against > 0) && (
        <>
          <StatLabel text="Tirs al pal" />
          <StatBar label="Tirs al pal" forVal={auto.shots_woodwork_for} againstVal={auto.shots_woodwork_against} />
        </>
      )}
      {(note.shots_blocked_for || note.shots_blocked_against) && (
        <>
          <StatLabel text="Tirs bloquejats" />
          <StatBar label="Tirs bloquejats" forVal={note.shots_blocked_for ?? 0} againstVal={note.shots_blocked_against ?? 0} />
        </>
      )}
      {(note.dribbles_completed || note.dribbles_attempted) && (
        <div className="flex items-center justify-between py-1 mt-1">
          <span className="text-[10px] text-slate-500">Regates</span>
          <span className="text-xs font-bold text-white">{note.dribbles_completed ?? 0}/{note.dribbles_attempted ?? 0}</span>
        </div>
      )}

      {/* ─── Distribucio ─── */}
      <SectionHeader title="Distribucio" icon={Waypoints} color="#06b6d4" />
      {(note.total_passes_for || note.total_passes_against) && (
        <>
          <StatLabel text="Passades totals" />
          <StatBar label="Passades" forVal={note.total_passes_for ?? 0} againstVal={note.total_passes_against ?? 0} />
        </>
      )}
      {note.pass_accuracy != null && (
        <div className="flex items-center justify-between py-1">
          <span className="text-[10px] text-slate-500">Precisio passada</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${note.pass_accuracy}%` }} />
            </div>
            <span className="text-xs font-bold text-cyan-400">{note.pass_accuracy}%</span>
          </div>
        </div>
      )}
      {auto.crosses_for > 0 && <SingleStat label="Centrades" value={auto.crosses_for} color="cyan-400" />}
      {auto.chances_created > 0 && <SingleStat label="Ocasions creades" value={auto.chances_created} color="cyan-400" />}
      {auto.assists > 0 && <SingleStat label="Assistencies" value={auto.assists} color="cyan-400" />}

      {/* ─── Defensa ─── */}
      <SectionHeader title="Defensa" icon={Shield} color="#f59e0b" />
      {auto.recoveries > 0 && <SingleStat label="Recuperacions" value={auto.recoveries} color="emerald-400" />}
      {auto.turnovers > 0 && <SingleStat label="Perdues" value={auto.turnovers} color="red-400" />}
      {(auto.duels_won > 0 || auto.duels_lost > 0) && (
        <>
          <StatLabel text="Duels" />
          <StatBar label="Duels" forVal={auto.duels_won} againstVal={auto.duels_lost} />
        </>
      )}
      {(note.tackles_for || note.tackles_against) && (
        <>
          <StatLabel text="Entrades" />
          <StatBar label="Entrades" forVal={note.tackles_for ?? 0} againstVal={note.tackles_against ?? 0} />
        </>
      )}
      {note.clearances != null && note.clearances > 0 && <SingleStat label="Despejos" value={note.clearances} />}
      {(note.aerial_duels_won || note.aerial_duels_lost) && (
        <div className="flex items-center justify-between py-1">
          <span className="text-[10px] text-slate-500">Duels aeris</span>
          <span className="text-xs font-bold text-white">{note.aerial_duels_won ?? 0}W / {note.aerial_duels_lost ?? 0}L</span>
        </div>
      )}

      {/* ─── Pilota aturada ─── */}
      <SectionHeader title="Pilota aturada" icon={Flag} color="#0ea5e9" />
      <StatLabel text="Corners" />
      <StatBar label="Corners" forVal={corners.forVal} againstVal={corners.againstVal} />
      <StatLabel text="Fores de joc" />
      <StatBar label="Offsides" forVal={offsides.forVal} againstVal={offsides.againstVal} higherIsBetter={false} />
      <StatLabel text="Faltes" />
      <StatBar label="Faltes" forVal={fouls.forVal} againstVal={fouls.againstVal} higherIsBetter={false} />
      <StatLabel text="Targetes grogues" />
      <StatBar label="Grogues" forVal={auto.yellow_cards_for} againstVal={auto.yellow_cards_against} higherIsBetter={false} />
      {(auto.red_cards_for > 0 || auto.red_cards_against > 0) && (
        <>
          <StatLabel text="Targetes vermelles" />
          <StatBar label="Vermelles" forVal={auto.red_cards_for} againstVal={auto.red_cards_against} higherIsBetter={false} />
        </>
      )}

      {/* ─── Porteria ─── */}
      <SectionHeader title="Porteria" icon={GloveIcon} color="#14b8a6" />
      <SingleStat label="Parades" value={note.saves ?? auto.saves_from_events} color="teal-400" />
      <SingleStat label="Gols encaixats" value={auto.goals_total_against} color="red-400" />
      {note.high_claims != null && note.high_claims > 0 && (
        <SingleStat label="Sortides per alt" value={note.high_claims} color="teal-400" />
      )}
    </div>
  )
}
