import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import { COMPETITION_NAMES, slugify, loadTeamData } from '@/lib/data'
import { getFullTeamReportDB, resolveLegacyTeamSlug, hasMinutesData, type FullTeamReportDB, type RivalDataDB, type RefereeStatsDB, type FieldDimsDB } from '@/lib/supabase-data'
import { parseTeamSlug } from '@/lib/team-slug'
import { PitchCompare } from '@/components/PitchCompare'
import { RivalScoutCard } from '@/components/RivalScoutCard'
import { AdminGate, AdminBadge, AdminBlurValue, AdminUpgradeLink } from '@/components/AdminGate'
import ScrapeProgressBanner from '@/components/ScrapeProgressBanner'
import TeamReportActions, { type PDFReportData } from '@/components/TeamReportActions'
import {
  Users, ListOrdered, Shield, ChevronRight, AlertTriangle,
  Calendar, Target, Clock, Home, Plane, BarChart2,
  ArrowRight, Crosshair, Ban, Lock, Star, TrendingUp,
} from 'lucide-react'

// SSR — rendered on each request, no filesystem access
export const dynamic = 'force-dynamic'

// ─── Paywall components ────────────────────────────────────────────────────

function RegisterBlur({ children, label = "Registra't gratis per veure aquesta secció" }: {
  children: React.ReactNode
  label?: string
}) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>{children}</div>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(8,9,10,0.95) 0%, rgba(8,9,10,0.6) 60%, transparent 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        paddingBottom: 24, paddingLeft: 16, paddingRight: 16, textAlign: 'center',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
        }}>
          <Lock size={15} style={{ color: '#22c55e' }} />
        </div>
        <p style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 12, color: '#8a8f98', marginBottom: 12 }}>Gratis per a entrenadors i tècnics</p>
        <Link
          href="/entrenador"
          className="hover:bg-[#34d399]"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 6,
            background: '#22c55e', color: '#fff', fontSize: 13, fontWeight: 510,
            textDecoration: 'none', transition: 'background 0.15s',
          }}
        >
          Registra&apos;t gratis <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // The slug itself carries the competition (baseSlug-{compCode}-g{n}); only
  // fall back to a JSON-based hint for legacy /data/teams/*.json lookups.
  const jsonData = loadTeamData(slug)
  const competitionHint: string | undefined = jsonData?.meta?.competition || undefined
  const report = await getFullTeamReportDB(slug, competitionHint)
  if (report) {
    const compName = COMPETITION_NAMES[report.competition] || report.competition || ''
    const title = `${report.name} — Resultats, Plantilla i Estadístiques${compName ? ` | ${compName}` : ''}`
    const description = `Tot sobre ${report.name}: resultats, classificació, plantilla, propers rivals, estadístiques de gols i targetes. ${compName} temporada 2025/26. Dades oficials FCF.`
    return {
      title,
      description,
      keywords: [report.name, compName, 'resultats', 'classificació', 'plantilla', 'estadístiques', 'futbol català', 'FCF'].filter(Boolean),
      alternates: { canonical: `https://neoscout.es/equip/${slug}` },
      openGraph: {
        title: `${report.name} — Estadístiques i Resultats`,
        description,
        url: `https://neoscout.es/equip/${slug}`,
        type: 'website',
      },
    }
  }
  return { title: 'Equip no trobat | NeoScout' }
}

// ─── Sub-components ────────────────────────────────────────────────────────

const RESULT_LABEL: Record<string, string> = { W: 'V', D: 'E', L: 'D' }

function FormDot({ result }: { result: 'W' | 'D' | 'L' | null }) {
  const bg =
    result === 'W' ? '#22c55e' :
    result === 'D' ? '#62666d' :
    result === 'L' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 26, height: 26, borderRadius: '50%',
      background: bg, color: '#fff', fontSize: 10, fontWeight: 510,
    }}>
      {result ? RESULT_LABEL[result] : '?'}
    </span>
  )
}

function ScoreBadge({ gf, ga }: { gf: number | null; ga: number | null }) {
  if (gf === null || ga === null) return <span style={{ color: '#62666d', fontSize: 13 }}>–</span>
  const win = gf > ga, lose = gf < ga
  return (
    <span style={{ fontSize: 13, fontWeight: 510, fontVariantNumeric: 'tabular-nums' }}>
      <span style={{ color: win ? '#22c55e' : lose ? '#8a8f98' : '#d0d6e0' }}>{gf}</span>
      <span style={{ color: '#62666d', margin: '0 2px' }}>–</span>
      <span style={{ color: lose ? '#22c55e' : win ? '#8a8f98' : '#d0d6e0' }}>{ga}</span>
    </span>
  )
}

function formatDate(d: string) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) {
    const months = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
    const day = parts[0], month = parts[1]
    return `${day} ${months[parseInt(month, 10) - 1] || month}`
  }
  return d
}

type SplitStats = { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number }

function SplitRecordCard({
  label, record, icon,
}: {
  label: string
  record: SplitStats
  icon: React.ReactNode
}) {
  const winRate = record.played > 0 ? Math.round((record.wins / record.played) * 100) : 0
  return (
    <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {icon}
        <span style={{ fontWeight: 510, color: '#f7f8f8', fontSize: 13 }}>{label}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { v: record.played, l: 'PJ', color: '#f7f8f8' },
          { v: record.wins, l: 'V', color: '#22c55e' },
          { v: record.draws, l: 'E', color: '#d0d6e0' },
          { v: record.losses, l: 'D', color: '#8a8f98' },
        ].map(s => (
          <div key={s.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 510, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
            <div style={{ fontSize: 10, color: '#62666d', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#8a8f98', marginBottom: 6 }}>
        <span>Gols: {record.gf}–{record.ga}</span>
        <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{record.points} pts</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${winRate}%`, height: '100%', background: '#22c55e', borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: 10, color: '#62666d', marginTop: 4 }}>{winRate}% victòries</div>
    </div>
  )
}

function MiniTable({ standings, teamSlug }: { standings: FullTeamReportDB['standings']; teamSlug: string }) {
  if (standings.length === 0) return null
  const myIdx = standings.findIndex(s => s.slug === teamSlug)
  const startIdx = Math.max(0, Math.min(myIdx - 2, standings.length - 5))
  const rows = standings.slice(startIdx, startIdx + 5)
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <ListOrdered size={14} style={{ color: '#8a8f98' }} />
        <h3 style={{ fontWeight: 510, color: '#f7f8f8', fontSize: 13 }}>Classificació</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map(s => {
          const isMyTeam = s.slug === teamSlug
          return (
            <div
              key={s.slug}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, fontSize: 12,
                ...(isMyTeam
                  ? { background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }
                  : {}),
              }}
            >
              <span style={{ width: 16, textAlign: 'right', fontSize: 11, color: isMyTeam ? '#22c55e' : '#62666d', fontWeight: isMyTeam ? 510 : 400 }}>{s.position}</span>
              <Link href={`/equip/${s.slug}`} className="hover:text-[#f7f8f8]" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', color: isMyTeam ? '#f7f8f8' : '#d0d6e0', fontWeight: isMyTeam ? 510 : 400 }}>{s.name}</Link>
              <span style={{ color: '#62666d', width: 20, textAlign: 'center' }}>{s.played}</span>
              <span style={{ fontWeight: 510, color: isMyTeam ? '#22c55e' : '#f7f8f8', width: 24, textAlign: 'center' }}>{s.points}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NextMatchInfoCard({ nextMatch, competition }: {
  nextMatch: NonNullable<FullTeamReportDB['nextMatch']>
  competition: string
}) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Crosshair size={15} style={{ color: '#8a8f98' }} />
        <h3 style={{ fontWeight: 510, color: '#f7f8f8', fontSize: 14 }}>
          Proper Rival — J{nextMatch.jornada}
        </h3>
        <span style={{
          marginLeft: 'auto', fontSize: 11, padding: '3px 8px', borderRadius: 9999, fontWeight: 510,
          ...(nextMatch.isHome
            ? { color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }
            : { color: '#8a8f98', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }),
        }}>
          {nextMatch.isHome ? '🏠 Local' : '✈️ Visita'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 8,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 510, color: '#22c55e', margin: '0 auto 8px',
          }}>T</div>
          <div style={{ fontSize: 11, color: '#8a8f98' }}>El teu equip</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0 16px' }}>
          <div style={{ fontSize: 20, fontWeight: 510, color: '#62666d', marginBottom: 2 }}>VS</div>
          <div style={{ fontSize: 11, color: '#8a8f98' }}>{formatDate(nextMatch.date)}</div>
          {nextMatch.time && <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 510 }}>{nextMatch.time}h</div>}
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 510, color: '#8a8f98', margin: '0 auto 8px',
          }}>
            {nextMatch.opponent.charAt(0)}
          </div>
          <div style={{ fontSize: 11, fontWeight: 510, color: '#d0d6e0', lineHeight: 1.3 }}>{nextMatch.opponent}</div>
        </div>
      </div>
      {nextMatch.referee && (
        <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={12} style={{ color: '#8a8f98', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#8a8f98', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Àrbitre: <span style={{ color: '#d0d6e0', fontWeight: 510 }}>{nextMatch.referee}</span>
          </span>
        </div>
      )}
    </div>
  )
}

function SquadTable({ players, teamSlug, hasMinutes }: { players: FullTeamReportDB['players']; teamSlug: string; hasMinutes: boolean }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Users size={14} style={{ color: '#8a8f98' }} />
        <h3 style={{ fontWeight: 510, color: '#f7f8f8', fontSize: 13 }}>Plantilla — {players.length} jugadors</h3>
      </div>
      <div style={{ overflowX: 'auto', margin: '0 -20px' }}>
        <div style={{ minWidth: 380, padding: '0 20px' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#62666d', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ textAlign: 'left', paddingBottom: 10, fontWeight: 510 }}>Jugador</th>
                <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510, width: 40 }}>PJ</th>
                <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510, width: 40 }}>⚽</th>
                <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510, width: 40 }}>🟨</th>
                <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510, width: 40 }}>🟥</th>
                <th style={{ textAlign: 'center', paddingBottom: 10, fontWeight: 510, width: 64 }}>{hasMinutes ? 'Min' : 'Tit.'}</th>
              </tr>
            </thead>
            <tbody>
              {players.slice(0, 30).map((p, i) => (
                <tr
                  key={i}
                  className="hover:bg-white/[0.02]"
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    ...(p.risk ? { background: 'rgba(251,191,36,0.04)' } : {}),
                  }}
                >
                  <td style={{ padding: '8px 12px 8px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Link href={`/jugador/${slugify(p.name)}--${teamSlug}`} className="hover:text-[#22c55e]" style={{ fontWeight: 510, color: '#d0d6e0', fontSize: 13, textDecoration: 'none', transition: 'color 0.15s' }}>{p.name}</Link>
                      {p.risk && (
                        <span style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 9999, fontWeight: 510, flexShrink: 0 }}>RISC</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'center', color: '#8a8f98', fontSize: 12 }}>{p.appearances > 0 ? p.appearances : <span style={{ color: '#62666d' }}>–</span>}</td>
                  <td style={{ padding: '8px 0', textAlign: 'center' }}>
                    {p.goals > 0 ? <span style={{ color: '#22c55e', fontWeight: 510, fontSize: 12 }}>{p.goals}</span> : <span style={{ color: '#62666d', fontSize: 12 }}>–</span>}
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'center' }}>
                    {p.yellow_cards > 0
                      ? <span style={{ fontWeight: 510, fontSize: 12, color: [4, 9, 14].includes(p.yellow_cards) ? '#fbbf24' : '#8a8f98' }}>{p.yellow_cards}</span>
                      : <span style={{ color: '#62666d', fontSize: 12 }}>–</span>}
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'center' }}>
                    {p.red_cards > 0 ? <span style={{ color: '#f87171', fontWeight: 510, fontSize: 12 }}>{p.red_cards}</span> : <span style={{ color: '#62666d', fontSize: 12 }}>–</span>}
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'center', color: '#8a8f98', fontSize: 12 }}>
                    {hasMinutes
                      ? (p.minutes_played > 0 ? `${p.minutes_played}'` : '–')
                      : (p.starts > 0 ? p.starts : '–')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {players.some(p => p.risk) && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <AlertTriangle size={12} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 11, color: '#fbbf24' }}>
            Jugador amb 4, 9 o 14 grogues. La propera groga implica 1 partit de suspensió.
          </p>
        </div>
      )}
    </div>
  )
}

function RecentMatches({ form }: { form: FullTeamReportDB['form'] }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Calendar size={14} style={{ color: '#8a8f98' }} />
        <h3 style={{ fontWeight: 510, color: '#f7f8f8', fontSize: 13 }}>Partits recents</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {form.map((m, i) => (
          <div key={i} className="hover:bg-white/[0.02]" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 6, transition: 'background 0.15s' }}>
            <FormDot result={m.result} />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'auto auto 1fr', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 10, color: '#62666d', width: 24 }}>{m.isHome ? 'LOC' : 'VIS'}</span>
              <ScoreBadge gf={m.goalsFor} ga={m.goalsAgainst} />
              <Link href={`/equip/${m.opponentSlug}`} className="hover:text-[#f7f8f8]" style={{ fontSize: 12, color: '#d0d6e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>
                {m.opponent}
              </Link>
            </div>
            <span style={{ fontSize: 10, color: '#62666d', flexShrink: 0 }}>{formatDate(m.date)}</span>
            {m.referee && (
              <Link href={`/arbitre/${slugify(m.referee)}`} className="hover:text-[#22c55e] hidden md:block" style={{ fontSize: 10, color: '#62666d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, maxWidth: 90, textDecoration: 'none' }}>
                {m.referee.split(',')[0]}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Field Analysis Component ──────────────────────────────────────────────

function StatBar({
  teamVal, rivalVal, label, teamLabel, rivalLabel,
}: {
  teamVal: number | null
  rivalVal: number | null
  label: string
  teamLabel: string
  rivalLabel: string
  colorTeam?: string
  colorRival?: string
}) {
  if (teamVal === null && rivalVal === null) {
    return (
      <div>
        <div style={{ fontSize: 11, color: '#62666d', fontWeight: 510, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 11, color: '#62666d', fontStyle: 'italic' }}>Sense dades</div>
      </div>
    )
  }
  const tv = teamVal ?? 0
  const rv = rivalVal ?? 0
  const total = tv + rv || 1
  const teamPct = Math.round((tv / total) * 100)
  const rivalPct = 100 - teamPct

  return (
    <div>
      <div style={{ fontSize: 11, color: '#62666d', fontWeight: 510, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: '#22c55e', fontWeight: 510, width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{tv}</span>
        <div style={{ flex: 1, display: 'flex', borderRadius: 9999, overflow: 'hidden', height: 6, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ width: `${teamPct}%`, background: '#22c55e', height: '100%' }} />
          <div style={{ width: `${rivalPct}%`, background: 'rgba(255,255,255,0.15)', height: '100%' }} />
        </div>
        <span style={{ color: '#8a8f98', fontWeight: 510, width: 32, fontVariantNumeric: 'tabular-nums' }}>{rv}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#62666d' }}>
        <span>{teamLabel}</span>
        <span>{rivalLabel}</span>
      </div>
    </div>
  )
}

function WinRateBar({
  home, label, teamLabel, rivalLabel,
}: {
  home: { team: SplitStats | null; rival: SplitStats | null }
  label: string
  teamLabel: string
  rivalLabel: string
}) {
  const t = home.team
  const r = home.rival
  const tRate = t && t.played > 0 ? Math.round((t.wins / t.played) * 100) : null
  const rRate = r && r.played > 0 ? Math.round((r.wins / r.played) * 100) : null

  if (tRate === null && rRate === null) {
    return (
      <div>
        <div style={{ fontSize: 11, color: '#62666d', fontWeight: 510, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 11, color: '#62666d', fontStyle: 'italic' }}>Sense dades</div>
      </div>
    )
  }

  const tv = tRate ?? 0
  const rv = rRate ?? 0
  const tRecord = t ? `${t.wins}V-${t.draws}E-${t.losses}D` : '–'
  const rRecord = r ? `${r.wins}V-${r.draws}E-${r.losses}D` : '–'

  return (
    <div>
      <div style={{ fontSize: 11, color: '#62666d', fontWeight: 510, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, marginBottom: 2 }}>
        <span style={{ color: '#22c55e', fontWeight: 510, width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{tv}%</span>
        <div style={{ flex: 1, height: 6, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ width: `${tv}%`, height: '100%', background: '#22c55e' }} />
        </div>
        <span style={{ color: '#8a8f98', fontWeight: 510, width: 32, fontVariantNumeric: 'tabular-nums' }}>{rv}%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#62666d', marginBottom: 4 }}>
        <span>{tRecord}</span>
        <span>{rRecord}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
        <span style={{ width: 32 }} />
        <div style={{ flex: 1, height: 6, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ width: `${rv}%`, height: '100%', background: 'rgba(255,255,255,0.2)' }} />
        </div>
        <span style={{ width: 32 }} />
      </div>
    </div>
  )
}

function FieldAnalysisSection({
  report, rival,
}: {
  report: FullTeamReportDB
  rival: FullTeamReportDB['rival'] & {}
}) {
  const teamApercibits = report.players.filter(p => p.risk)
  const rivalApercibits = rival.apercibits || []
  const rivalAvgYellow = rival.players.length > 0
    ? (rival.players.reduce((s, p) => s + p.yellow_cards, 0) / rival.players.length).toFixed(1)
    : null

  const sectionLabel: React.CSSProperties = {
    fontSize: 10, color: '#62666d', fontWeight: 510, textTransform: 'uppercase',
    letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: 8, marginBottom: 12,
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <BarChart2 size={15} style={{ color: '#8a8f98', flexShrink: 0 }} />
        <h3 style={{ fontWeight: 510, color: '#f7f8f8', fontSize: 14 }}>
          Anàlisi de Camp —{' '}
          <span style={{ color: '#22c55e' }}>{report.name}</span>
          <span style={{ color: '#62666d' }}> vs </span>
          <span style={{ color: '#8a8f98' }}>{rival.name}</span>
        </h3>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, fontSize: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e' }} />
          <span style={{ color: '#22c55e', fontWeight: 510 }}>{report.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ color: '#8a8f98', fontWeight: 510 }}>{rival.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 32 }}>
        {/* Attack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={sectionLabel}>ATAC</div>
          <StatBar
            label="Gols marcats"
            teamVal={report.gf ?? null}
            rivalVal={rival.gf ?? null}
            teamLabel={report.name}
            rivalLabel={rival.name}
          />
          <StatBar
            label="Gols encaixats"
            teamVal={report.ga ?? null}
            rivalVal={rival.ga ?? null}
            teamLabel={report.name}
            rivalLabel={rival.name}
          />
        </div>

        {/* Performance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={sectionLabel}>RENDIMENT</div>
          <WinRateBar
            home={{ team: report.home, rival: rival.home }}
            label="Rendiment local"
            teamLabel={report.name}
            rivalLabel={rival.name}
          />
          <WinRateBar
            home={{ team: report.away, rival: rival.away }}
            label="Rendiment visitant"
            teamLabel={report.name}
            rivalLabel={rival.name}
          />
        </div>

        {/* Risk players */}
        <div>
          <div style={sectionLabel}>JUGADORS EN RISC</div>
          {teamApercibits.length === 0 && rivalApercibits.length === 0 ? (
            <div style={{ fontSize: 11, color: '#62666d', fontStyle: 'italic' }}>Cap jugador en risc</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: '#22c55e', marginBottom: 6, fontWeight: 510 }}>{report.name}</div>
                {teamApercibits.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#62666d' }}>–</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {teamApercibits.slice(0, 3).map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                        <span>🟨</span>
                        <span style={{ color: '#d0d6e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.name}</span>
                        <span style={{ color: '#fbbf24', fontWeight: 510, flexShrink: 0 }}>{p.yellow_cards}</span>
                      </div>
                    ))}
                    {teamApercibits.length > 3 && (
                      <div style={{ fontSize: 10, color: '#62666d' }}>+{teamApercibits.length - 3} més</div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#8a8f98', marginBottom: 6, fontWeight: 510 }}>{rival.name}</div>
                {rivalApercibits.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#62666d' }}>–</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {rivalApercibits.slice(0, 3).map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                        <span>🟨</span>
                        <span style={{ color: '#d0d6e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.name}</span>
                        <span style={{ color: '#fbbf24', fontWeight: 510, flexShrink: 0 }}>{p.yellow_cards}</span>
                      </div>
                    ))}
                    {rivalApercibits.length > 3 && (
                      <div style={{ fontSize: 10, color: '#62666d' }}>+{rivalApercibits.length - 3} més</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cards summary */}
        <div>
          <div style={sectionLabel}>TARGETES</div>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: '#22c55e', marginBottom: 6, fontWeight: 510 }}>{report.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#8a8f98' }}>
                <div>🟨 Total: <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{report.players.reduce((s, p) => s + p.yellow_cards, 0)}</span></div>
                <div>🟥 Total: <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{report.players.reduce((s, p) => s + p.red_cards, 0)}</span></div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#8a8f98', marginBottom: 6, fontWeight: 510 }}>{rival.name}</div>
              {rivalAvgYellow !== null ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#8a8f98' }}>
                  <div>🟨 Total: <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{rival.players.reduce((s, p) => s + p.yellow_cards, 0)}</span></div>
                  <div>🟥 Total: <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{rival.players.reduce((s, p) => s + p.red_cards, 0)}</span></div>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#62666d', fontStyle: 'italic' }}>Sense dades</div>
              )}
            </div>
          </div>
        </div>

        {/* Penalty comparison */}
        {(report.penaltyStats || rival.penaltyStats) && (
          <div>
            <div style={sectionLabel}>PENALS</div>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: '#22c55e', marginBottom: 6, fontWeight: 510 }}>{report.name}</div>
                {report.penaltyStats ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#8a8f98' }}>
                    <div>A favor: <span style={{ color: '#22c55e', fontWeight: 510 }}>{report.penaltyStats.penalties_scored}</span></div>
                    <div>En contra: <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{report.penaltyStats.penalties_conceded}</span></div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#62666d' }}>–</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#8a8f98', marginBottom: 6, fontWeight: 510 }}>{rival.name}</div>
                {rival.penaltyStats ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#8a8f98' }}>
                    <div>A favor: <span style={{ color: '#22c55e', fontWeight: 510 }}>{rival.penaltyStats.penalties_scored}</span></div>
                    <div>En contra: <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{rival.penaltyStats.penalties_conceded}</span></div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#62666d', fontStyle: 'italic' }}>Sense dades</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PercentileBar({ value, label }: { value: number; label: string }) {
  const color = value >= 70 ? '#f87171' : value >= 40 ? '#fbbf24' : '#22c55e'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#8a8f98' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 510, color }}>{value}%ile</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
    </div>
  )
}

const COMPETITION_LABELS: Record<string, string> = {
  'primera-catalana': 'Primera Cat.',
  'segona-catalana': 'Segona Cat.',
  'tercera-catalana': 'Tercera Cat.',
  'quarta-catalana': 'Quarta Cat.',
  'preferent-juvenils': 'Pref. Juvenils',
  'juvenil-primera-divisio': 'Juv. 1a Div.',
}

/** Inner content of the deep report — extracted so AdminGate can reuse without duplication */
function RefereeDeepContent({ referee, firstHalfPct, secondHalfPct, totalHalfCards, awayBias }: {
  referee: RefereeStatsDB
  firstHalfPct: number
  secondHalfPct: number
  totalHalfCards: number
  awayBias: number | null
}) {
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <TrendingUp size={14} style={{ color: '#8a8f98' }} />
        <h4 style={{ fontSize: 12, fontWeight: 510, color: '#8a8f98', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Anàlisi complet</h4>
      </div>
      <div>
        <p style={{ fontSize: 10, color: '#62666d', fontWeight: 510, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Percentils vs àrbitres FCF</p>
        <PercentileBar value={referee.yellows_percentile} label="Duresa (grogues/part)" />
        <PercentileBar value={referee.reds_percentile} label="Expulsions (vermelles/part)" />
      </div>
      {referee.home_bias !== null && (
        <div>
          <p style={{ fontSize: 10, color: '#62666d', fontWeight: 510, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Biaix local / visitant</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8a8f98', marginBottom: 6 }}>
            <span>Local</span><span>Visitant</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${referee.home_bias}%`, background: '#22c55e', height: '100%' }} />
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', height: '100%' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 510, color: '#22c55e' }}>{referee.home_yellows} ({referee.home_bias}%)</span>
            <span style={{ fontSize: 11, fontWeight: 510, color: '#8a8f98' }}>{referee.away_yellows} ({awayBias}%)</span>
          </div>
        </div>
      )}
      {totalHalfCards > 0 && (
        <div>
          <p style={{ fontSize: 10, color: '#62666d', fontWeight: 510, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Timing de targetes</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: '1a meitat', value: referee.first_half_cards, pct: firstHalfPct },
              { label: '2a meitat', value: referee.second_half_cards, pct: secondHalfPct },
            ].map(h => (
              <div key={h.label} style={{ padding: '10px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#62666d', marginBottom: 4 }}>{h.label}</div>
                <div style={{ fontSize: 16, fontWeight: 510, color: '#f7f8f8' }}>{h.value}</div>
                <div style={{ fontSize: 10, color: '#62666d' }}>{h.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {referee.competitionBreakdown.length > 0 && (
        <div>
          <p style={{ fontSize: 10, color: '#62666d', fontWeight: 510, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Per competició</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {referee.competitionBreakdown.slice(0, 4).map(c => (
              <div key={c.competition} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 12, color: '#d0d6e0' }}>{COMPETITION_LABELS[c.competition] || c.competition}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                  <span style={{ color: '#62666d' }}>{c.matches} partits</span>
                  <span style={{ color: '#fbbf24', fontWeight: 510 }}>🟨 {c.matches > 0 ? (c.yellows / c.matches).toFixed(1) : '0'}/part</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {referee.recentMatches.length > 0 && (
        <div>
          <p style={{ fontSize: 10, color: '#62666d', fontWeight: 510, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Últims {Math.min(referee.recentMatches.length, 10)} partits</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {referee.recentMatches.slice(0, 10).map((m, i) => (
              <div key={i} className="hover:bg-white/[0.03]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', transition: 'background 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 10, color: '#62666d', flexShrink: 0, width: 24 }}>J{m.jornada}</span>
                  <span style={{ fontSize: 11, color: '#d0d6e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.home_team} vs {m.away_team}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 510, color: '#f7f8f8', fontVariantNumeric: 'tabular-nums' }}>{m.home_score ?? '?'}–{m.away_score ?? '?'}</span>
                  {m.yellows > 0 && <span style={{ fontSize: 10, color: '#fbbf24' }}>🟨{m.yellows}</span>}
                  {m.reds > 0 && <span style={{ fontSize: 10, color: '#f87171' }}>🟥{m.reds}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RefereeDeepReport({ referee }: { referee: RefereeStatsDB }) {
  const strictLevel =
    referee.yellows_per_match >= 5 ? 'Molt estricte' :
    referee.yellows_per_match >= 3.5 ? 'Estricte' :
    referee.yellows_per_match >= 2 ? 'Moderat' : 'Permissiu'
  const strictColor =
    referee.yellows_per_match >= 5 ? '#f87171' :
    referee.yellows_per_match >= 3.5 ? '#fbbf24' :
    referee.yellows_per_match >= 2 ? '#fbbf24' : '#22c55e'

  const totalHalfCards = referee.first_half_cards + referee.second_half_cards
  const firstHalfPct = totalHalfCards > 0 ? Math.round((referee.first_half_cards / totalHalfCards) * 100) : 0
  const secondHalfPct = totalHalfCards > 0 ? Math.round((referee.second_half_cards / totalHalfCards) * 100) : 0
  const awayBias = referee.home_bias !== null ? 100 - referee.home_bias : null

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
      {/* Section A — always visible: basic identity + key stats */}
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Shield size={14} style={{ color: '#8a8f98' }} />
          <h3 style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8' }}>Àrbitre del proper partit</h3>
          <AdminBadge />
        </div>

        {/* Identity row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ color: '#22c55e', fontWeight: 510, fontSize: 14 }}>{referee.name.split(',')[0]?.charAt(0) || '?'}</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ fontWeight: 510, color: '#d0d6e0', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{referee.name}</p>
              {referee.predicted && (
                <span style={{ fontSize: 9, fontWeight: 510, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 9999, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', flexShrink: 0 }}>
                  Probable
                </span>
              )}
            </div>
            <p style={{ fontSize: 11, color: '#62666d' }}>{referee.matches} partits · {referee.avg_goals_per_match.toFixed(1)} gols/part</p>
          </div>
          <Link href={`/arbitre/${referee.slug}`} className="hover:text-[#22c55e]" style={{ flexShrink: 0, fontSize: 11, color: '#8a8f98', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Perfil →
          </Link>
        </div>

        {/* Key stats grid — always visible */}
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 8 }}>
          {[
            { label: 'Grogues/part', value: referee.yellows_per_match.toFixed(1), prefix: '🟨 ' },
            { label: 'Vermelles/part', value: referee.reds_per_match.toFixed(2), prefix: '🟥 ' },
            { label: 'Amb expulsió', value: `${referee.matches_with_red_pct}%` },
            { label: 'Tendència', value: strictLevel, customColor: strictColor },
          ].map(({ label, value, prefix, customColor }) => (
            <div key={label} style={{ padding: '10px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#62666d', marginBottom: 4 }}>{prefix || ''}{label}</div>
              <span style={{ fontSize: 13, fontWeight: 510, color: customColor || '#f7f8f8' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

      {/* Section B — deep analysis, now public */}
      <RefereeDeepContent referee={referee} firstHalfPct={firstHalfPct} secondHalfPct={secondHalfPct} totalHalfCards={totalHalfCards} awayBias={awayBias} />
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function EquipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Legacy URL without a disambiguation suffix (pre-migration bookmarks, old
  // Google results): look up the canonical slug and 301-redirect so links
  // resolve to a single, correct team page.
  const parsed = parseTeamSlug(slug)
  if (!parsed.competition) {
    const canonical = await resolveLegacyTeamSlug(slug)
    if (canonical && canonical !== slug) {
      permanentRedirect(`/equip/${canonical}`)
    }
  }

  const jsonData = loadTeamData(slug)
  const competitionHint: string | undefined = jsonData?.meta?.competition || undefined
  const report = await getFullTeamReportDB(slug, competitionHint)

  if (!report) {
    return (
      <div style={{ fontFamily: 'var(--font-inter)' }}>
        <div className="max-w-2xl mx-auto px-4" style={{ paddingTop: 96, paddingBottom: 96, textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 8,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          }}>
            <Users size={28} style={{ color: '#22c55e' }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 510, color: '#f7f8f8', marginBottom: 12, letterSpacing: '-0.02em' }}>Equip no trobat</h1>
          <p style={{ fontSize: 14, color: '#8a8f98', marginBottom: 32 }}>Aquest equip no apareix a les dades de la temporada actual de la FCF.</p>
          <Link href="/cerca" className="hover:bg-[#34d399]" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', borderRadius: 6, background: '#22c55e', color: '#fff',
            fontSize: 14, fontWeight: 510, textDecoration: 'none', transition: 'background 0.15s',
          }}>
            Torna a la cerca
          </Link>
        </div>
      </div>
    )
  }

  const compName = COMPETITION_NAMES[report.competition] || report.competition
  const apercibits = report.players.filter(p => p.risk)
  const topScorers = [...report.players].sort((a, b) => b.goals - a.goals).filter(p => p.goals > 0).slice(0, 5)
  const PRIORITY = new Set([
    'lliga-elit', 'primera-catalana', 'segona-catalana', 'tercera-catalana', 'quarta-catalana',
    'preferent-juvenils', 'juvenil-primera-divisio', 'divisio-honor-juvenil', 'lliga-nacional-juvenil',
    'segona-catalana-juvenil', 'tercera-catalana-juvenil',
    'divisio-honor-cadet-s16', 'preferent-cadet-s16', 'cadet-primera-divisio-s16', 'cadet-segona-divisio-s16',
    'divisio-honor-cadet-s15', 'preferent-cadet-s15', 'cadet-primera-divisio-s15', 'cadet-segona-divisio-s15',
    'divisio-honor-infantil-s14', 'preferent-infantil-s14', 'primera-divisio-infantil-s14',
    'divisio-honor-infantil-s13', 'preferent-infantil-s13', 'infantil-primera-divisio-s13',
  ])
  const isPriority = PRIORITY.has(report.competition)

  const teamJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: report.name,
    sport: "Football",
    url: `https://neoscout.es/equip/${slug}`,
    memberOf: { "@type": "SportsOrganization", name: compName },
    member: report.players.slice(0, 25).map((p: any) => ({
      "@type": "Person",
      name: p.name,
      ...(p.goals > 0 ? { description: `${p.goals} gols` } : {}),
    })),
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "NeoScout", item: "https://neoscout.es" },
      { "@type": "ListItem", position: 2, name: compName, item: `https://neoscout.es/competicio/${report.competition}` },
      { "@type": "ListItem", position: 3, name: report.name, item: `https://neoscout.es/equip/${slug}` },
    ],
  }

  return (
    <div style={{ fontFamily: 'var(--font-inter)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {!isPriority && (
        <div style={{ background: 'rgba(251,191,36,0.06)', borderBottom: '1px solid rgba(251,191,36,0.12)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6" style={{ paddingTop: 10, paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={13} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#fbbf24' }}>
              <span style={{ fontWeight: 510 }}>Fase beta:</span>{' '}
              NeoScout prioritza Segona i Tercera Catalana. Les dades d&apos;altres categories poden no estar completament actualitzades.
            </p>
          </div>
        </div>
      )}

      {/* ─── Hero ─── */}
      <div style={{ background: '#0f1011', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6" style={{ paddingTop: 40, paddingBottom: 40 }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#62666d', marginBottom: 20 }}>
            <Link href="/" className="hover:text-[#d0d6e0]" style={{ color: '#62666d', textDecoration: 'none' }}>Inici</Link>
            <ChevronRight size={11} />
            {report.competition && (
              <>
                <Link href={`/competicio/${report.competition}`} className="hover:text-[#d0d6e0]" style={{ color: '#62666d', textDecoration: 'none' }}>{compName}</Link>
                <ChevronRight size={11} />
              </>
            )}
            <span style={{ color: '#8a8f98' }}>{report.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 8, flexShrink: 0,
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 510, color: '#22c55e',
            }}>
              {report.name.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 'clamp(18px, 2.5vw, 30px)', fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2 }}>{report.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {compName && (
                  <Link href={`/competicio/${report.competition}`} className="hover:text-[#f7f8f8]" style={{ fontSize: 13, color: '#22c55e', textDecoration: 'none' }}>{compName}</Link>
                )}
                {report.position && (
                  <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999, color: '#8a8f98', fontWeight: 510 }}>#{report.position} class.</span>
                )}
              </div>
              {report.form.length > 0 && (
                <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 4, marginTop: 8 }}>
                  {report.form.slice(0, 5).reverse().map((f, i) => <FormDot key={i} result={f.result} />)}
                </div>
              )}
            </div>
          </div>

          {report.form.length > 0 && (
            <div className="flex sm:hidden" style={{ alignItems: 'center', gap: 4, marginTop: 12 }}>
              <span style={{ fontSize: 11, color: '#62666d', marginRight: 4 }}>Forma:</span>
              {report.form.slice(0, 5).reverse().map((f, i) => <FormDot key={i} result={f.result} />)}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <TeamReportActions
              teamName={report.name}
              teamSlug={slug}
              competition={compName}
              reportData={{
                name: report.name,
                competition: report.competition,
                position: report.position,
                played: report.played, wins: report.wins, draws: report.draws, losses: report.losses, gf: report.gf, ga: report.ga, points: report.points,
                home: report.home,
                away: report.away,
                form: report.form.map(f => ({ date: f.date, jornada: f.jornada, opponent: f.opponent, isHome: f.isHome, goalsFor: f.goalsFor, goalsAgainst: f.goalsAgainst, result: f.result, referee: f.referee })),
                rival: report.rival ? {
                  name: report.rival.name,
                  played: report.rival.played, wins: report.rival.wins, draws: report.rival.draws, losses: report.rival.losses, gf: report.rival.gf, ga: report.rival.ga, points: report.rival.points,
                  position: report.rival.position,
                  home: report.rival.home,
                  away: report.rival.away,
                  form: report.rival.form.map(f => ({ date: f.date, jornada: f.jornada, opponent: f.opponent, isHome: f.isHome, goalsFor: f.goalsFor, goalsAgainst: f.goalsAgainst, result: f.result, referee: f.referee })),
                  topScorers: report.rival.topScorers,
                  apercibits: report.rival.apercibits,
                  mostMinutes: report.rival.mostMinutes,
                  goalBuckets: report.rival.goalBuckets,
                  insights: report.rival.insights,
                } : null,
                headToHead: report.headToHead.map(h => ({ date: h.date, jornada: h.jornada, opponent: h.opponent, isHome: h.isHome, goalsFor: h.goalsFor, goalsAgainst: h.goalsAgainst, result: h.result, referee: h.referee })),
                nextMatch: report.nextMatch ? { opponent: report.nextMatch.opponent, date: report.nextMatch.date, jornada: report.nextMatch.jornada, isHome: report.nextMatch.isHome, time: report.nextMatch.time, referee: report.nextMatch.referee } : null,
                homePitch: report.homePitch ? { length_m: report.homePitch.length_m, width_m: report.homePitch.width_m, field_name: report.homePitch.field_name } : null,
                rivalPitch: report.rivalPitch ? { length_m: report.rivalPitch.length_m, width_m: report.rivalPitch.width_m, field_name: report.rivalPitch.field_name } : null,
                formPosition: report.formStandings?.find(f => f.slug === slug)?.position ?? null,
                rivalFormPosition: report.rival ? (report.formStandings?.find(f => f.slug === report.rival!.slug)?.position ?? null) : null,
              } satisfies PDFReportData}
            />
          </div>

          {/* Stats strip */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, overflowX: 'auto', paddingBottom: 2 }}>
            {[
              { v: report.played, l: 'PJ', color: '#f7f8f8' },
              { v: report.wins, l: 'Victòries', color: '#22c55e' },
              { v: report.draws, l: 'Empats', color: '#d0d6e0' },
              { v: report.losses, l: 'Derrotes', color: '#8a8f98' },
              { v: `${report.gf}–${report.ga}`, l: 'Gols', color: '#f7f8f8' },
              { v: report.points, l: 'Punts', color: '#f7f8f8' },
            ].map(s => (
              <div key={s.l} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 14px', textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 510, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                <div style={{ fontSize: 10, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Main content ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6" style={{ paddingTop: 32, paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Row 1: Home/Away + Table */}
        <div className="grid grid-cols-2 lg:grid-cols-3" style={{ gap: 12 }}>
          <SplitRecordCard label="Com a Local" record={report.home} icon={<Home size={13} style={{ color: '#8a8f98' }} />} />
          <SplitRecordCard label="Com a Visitant" record={report.away} icon={<Plane size={13} style={{ color: '#8a8f98' }} />} />
          <div style={{ gridColumn: 'span 2 / span 2' }} className="lg:col-span-1">
            <MiniTable standings={report.standings} teamSlug={slug} />
          </div>
        </div>

        {/* Row 2: Next match card */}
        {report.nextMatch && (
          <NextMatchInfoCard nextMatch={report.nextMatch} competition={report.competition} />
        )}

        {/* Row 3: Rival Scout Card — now public */}
        {report.nextMatch && report.rival && (
          <RivalScoutCard
            rival={report.rival as any}
            nextMatch={report.nextMatch as any}
            headToHead={report.headToHead as any}
            hasMinutes={hasMinutesData(report.competition, report.players)}
          />
        )}

        {/* Row 3b: Pitch Compare */}
        {(report.homePitch || report.rivalPitch) && report.rival && (
          <PitchCompare
            homePitch={report.homePitch}
            rivalPitch={report.rivalPitch}
            homeTeamName={report.name}
            rivalTeamName={report.rival.name}
          />
        )}

        {/* Row 3c: Field Analysis */}
        {report.rival && (
          <FieldAnalysisSection report={report} rival={report.rival} />
        )}

        {/* Row 4: Referee card (real stats) */}
        {report.referee && (
          <RefereeDeepReport referee={report.referee} />
        )}
        {report.nextMatch?.referee && !report.referee && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Shield size={14} style={{ color: '#8a8f98' }} />
              <h3 style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8' }}>Àrbitre del proper partit</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#22c55e', fontWeight: 510, fontSize: 14 }}>{report.nextMatch.referee.split(',')[0]?.charAt(0) || '?'}</span>
              </div>
              <div>
                <p style={{ fontWeight: 510, color: '#d0d6e0', fontSize: 13 }}>{report.nextMatch.referee}</p>
                <p style={{ fontSize: 11, color: '#62666d' }}>Sense dades d&apos;actes disponibles encara</p>
              </div>
            </div>
          </div>
        )}

        {/* Row 5: Sanctions + Apercibits + Scorers */}
        {(apercibits.length > 0 || topScorers.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
            {apercibits.length > 0 && (
              <div style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)', borderRadius: 8, padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <AlertTriangle size={14} style={{ color: '#fbbf24' }} />
                  <h3 style={{ fontSize: 13, fontWeight: 510, color: '#fbbf24' }}>Apercibits del teu equip</h3>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#fbbf24', background: 'rgba(251,191,36,0.08)', padding: '2px 8px', borderRadius: 9999 }}>{apercibits.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {apercibits.slice(0, 4).map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 6, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.08)' }}>
                      <div style={{ minWidth: 0 }}>
                        <Link href={`/jugador/${slugify(p.name)}--${slug}`} className="hover:text-[#22c55e]" style={{ fontSize: 13, fontWeight: 510, color: '#d0d6e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', display: 'block' }}>{p.name}</Link>
                        <p style={{ fontSize: 11, color: '#62666d' }}>{p.appearances} partits{hasMinutesData(report.competition, report.players) && p.minutes_played > 0 ? ` · ${p.minutes_played}'` : ''}</p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 510, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', padding: '2px 8px', borderRadius: 9999, marginLeft: 10, flexShrink: 0 }}>🟨 {p.yellow_cards}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topScorers.length > 0 && (
              <div style={{ background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.1)', borderRadius: 8, padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Target size={14} style={{ color: '#22c55e' }} />
                  <h3 style={{ fontSize: 13, fontWeight: 510, color: '#22c55e' }}>Golejadors de l&apos;equip</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topScorers.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.08)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: 10, fontWeight: 510, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                        <div style={{ minWidth: 0 }}>
                          <Link href={`/jugador/${slugify(p.name)}--${slug}`} className="hover:text-[#22c55e]" style={{ fontSize: 13, fontWeight: 510, color: '#d0d6e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', display: 'block' }}>{p.name}</Link>
                          <p style={{ fontSize: 11, color: '#62666d' }}>{p.appearances} partits{hasMinutesData(report.competition, report.players) && p.minutes_played > 0 ? ` · ${p.minutes_played}'` : ''}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 510, color: '#22c55e', marginLeft: 10, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{p.goals} ⚽</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Row 6: Full squad */}
        {report.players.length > 0 ? (
          <SquadTable players={report.players} teamSlug={slug} hasMinutes={hasMinutesData(report.competition, report.players)} />
        ) : isPriority ? (
          <ScrapeProgressBanner
            slug={slug}
            competition={report.competition}
            group={report.group}
            teamName={report.name}
          />
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '32px', textAlign: 'center' }}>
            <Users size={24} style={{ color: '#62666d', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: '#8a8f98', fontWeight: 510 }}>Plantilla no disponible</p>
            <p style={{ fontSize: 12, color: '#62666d', marginTop: 4 }}>Les dades detallades de plantilla provenen de les actes oficials de la FCF.</p>
          </div>
        )}

        {/* Row 7: Recent results */}
        {report.form.length > 0 && <RecentMatches form={report.form} />}

      </div>

    </div>
  )
}
