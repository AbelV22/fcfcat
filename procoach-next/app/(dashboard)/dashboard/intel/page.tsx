import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'
import { getFullTeamReportDB, hasMinutesData } from '@/lib/supabase-data'
import { Users, Target, Home, Plane, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

function FormDot({ result }: { result: 'W' | 'D' | 'L' | null }) {
  const bg = result === 'W' ? '#22c55e' : result === 'D' ? '#62666d' : result === 'L' ? '#f87171' : 'rgba(255,255,255,0.08)'
  const color = result ? '#fff' : '#62666d'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: 8, fontSize: 11, fontWeight: 510,
      background: bg, color,
    }}>
      {result ?? '?'}
    </span>
  )
}

type SplitStats = { played: number; wins: number; draws: number; losses: number; gf: number; ga: number; points: number }

function StatBlock({ label, record, icon }: { label: string; record: SplitStats; icon: React.ReactNode }) {
  const winRate = record.played > 0 ? Math.round((record.wins / record.played) * 100) : 0
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        {icon}
        <span style={{ fontWeight: 510, color: '#f7f8f8', fontSize: 13 }}>{label}</span>
      </div>
      <div className="grid grid-cols-4" style={{ gap: 8, marginBottom: 12 }}>
        {[
          { v: record.played, l: 'PJ', c: '#f7f8f8' },
          { v: record.wins, l: 'G', c: '#22c55e' },
          { v: record.draws, l: 'E', c: '#8a8f98' },
          { v: record.losses, l: 'P', c: '#f87171' },
        ].map(s => (
          <div key={s.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 510, color: s.c, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
            <div style={{ fontSize: 10, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#8a8f98', marginBottom: 6 }}>
        <span>Gols: {record.gf}-{record.ga}</span>
        <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{record.points} pts</span>
      </div>
      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#22c55e', borderRadius: 2, width: `${winRate}%` }} />
      </div>
      <div style={{ fontSize: 10, color: '#62666d', marginTop: 4 }}>{winRate}% victòries</div>
    </div>
  )
}

export default async function IntelPage() {
  const isAdmin = await isAdminUser()
  const team = await getDashboardTeam()
  if (!team) redirect('/dashboard/setup')
  if (!isAdmin) {
    const { createClient } = await import('@/lib/supabase-server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
  }

  const report = await getFullTeamReportDB(team.slug, team.competition || undefined)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6" style={{ paddingTop: 24, paddingBottom: 48, fontFamily: 'var(--font-inter)' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', marginBottom: 4 }}>{report?.name || team.name}</h1>
          <p style={{ fontSize: 13, color: '#8a8f98' }}>{team.competition} — Temporada 2025/26</p>
        </div>

        {!report ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 48, textAlign: 'center' }}>
            <p style={{ color: '#8a8f98', fontSize: 14 }}>No s&apos;han trobat dades per a aquest equip. Comprova la configuració.</p>
            <Link href="/dashboard/setup" style={{ color: '#22c55e', fontSize: 13, marginTop: 8, display: 'inline-block', textDecoration: 'none' }}>Canviar equip</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Overall record */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <TrendingUp size={16} style={{ color: '#8a8f98' }} />
                <h2 style={{ fontSize: 15, fontWeight: 510, color: '#f7f8f8' }}>Registre General</h2>
                {report.position && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, padding: '2px 10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 9999, color: '#22c55e', fontWeight: 510 }}>
                    #{report.position}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5" style={{ gap: 10, marginBottom: 14 }}>
                {[
                  { v: report.played, l: 'Partits', c: '#f7f8f8' },
                  { v: report.wins, l: 'Victòries', c: '#22c55e' },
                  { v: report.draws, l: 'Empats', c: '#8a8f98' },
                  { v: report.losses, l: 'Derrotes', c: '#f87171' },
                  { v: report.points, l: 'Punts', c: '#f7f8f8' },
                ].map(s => (
                  <div key={s.l} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '12px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 510, color: s.c, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                    <div style={{ fontSize: 10, color: '#62666d', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: '#8a8f98' }}>
                Gols: <span style={{ color: '#22c55e', fontWeight: 510 }}>{report.gf}</span> - <span style={{ color: '#f87171', fontWeight: 510 }}>{report.ga}</span>
                {' '}(dif: {report.gf - report.ga > 0 ? '+' : ''}{report.gf - report.ga})
              </p>
            </div>

            {/* Home / Away splits */}
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
              <StatBlock label="Local" record={report.home} icon={<Home size={14} style={{ color: '#8a8f98' }} />} />
              <StatBlock label="Visitant" record={report.away} icon={<Plane size={14} style={{ color: '#8a8f98' }} />} />
            </div>

            {/* Form */}
            {report.form.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 510, color: '#f7f8f8', marginBottom: 14 }}>Últims resultats</h2>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
                  {report.form.slice(-10).map((m, i) => (
                    <FormDot key={i} result={m.result} />
                  ))}
                </div>
                <div>
                  {report.form.slice(-10).reverse().map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: '#62666d', fontSize: 11, width: 48, flexShrink: 0 }}>{m.date ? m.date.split('-').slice(0, 2).join('/') : ''}</span>
                      <span style={{ color: '#62666d', fontSize: 11 }}>J{m.jornada}</span>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 510,
                        background: m.isHome ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
                        color: m.isHome ? '#22c55e' : '#8a8f98',
                      }}>
                        {m.isHome ? 'L' : 'V'}
                      </span>
                      <span style={{ color: '#f7f8f8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.opponent}</span>
                      <span style={{ fontWeight: 510, fontVariantNumeric: 'tabular-nums' }}>
                        {m.goalsFor !== null && m.goalsAgainst !== null ? (
                          <>
                            <span style={{ color: m.result === 'W' ? '#22c55e' : m.result === 'L' ? '#f87171' : '#d0d6e0' }}>{m.goalsFor}</span>
                            <span style={{ color: '#62666d', margin: '0 2px' }}>-</span>
                            <span style={{ color: m.result === 'L' ? '#22c55e' : m.result === 'W' ? '#f87171' : '#d0d6e0' }}>{m.goalsAgainst}</span>
                          </>
                        ) : <span style={{ color: '#62666d' }}>-</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goal timing */}
            {report.goalBuckets.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Target size={16} style={{ color: '#8a8f98' }} />
                  <h2 style={{ fontSize: 15, fontWeight: 510, color: '#f7f8f8' }}>Distribució de Gols per Minut</h2>
                </div>
                <div className="grid grid-cols-6" style={{ gap: 8 }}>
                  {report.goalBuckets.map(b => (
                    <div key={b.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#62666d', marginBottom: 8 }}>{b.label}</div>
                      <div style={{ position: 'relative', height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                        <div style={{ width: 20, background: 'rgba(34,197,94,0.4)', borderRadius: '3px 3px 0 0', height: Math.max(4, b.scored * 12) }} />
                        <div style={{ width: 20, background: 'rgba(248,113,113,0.4)', borderRadius: '0 0 3px 3px', height: Math.max(4, b.conceded * 12) }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 510 }}>{b.scored}</span>
                        <span style={{ color: '#f87171', fontSize: 11, fontWeight: 510 }}>{b.conceded}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, fontSize: 11, color: '#62666d' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: 3, background: '#22c55e' }} /> Marcats</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: 3, background: '#f87171' }} /> Encaixats</span>
                </div>
              </div>
            )}

            {/* Penalty stats */}
            {report.penaltyStats && (report.penaltyStats.penalties_scored > 0 || report.penaltyStats.penalties_conceded > 0) && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Target size={16} style={{ color: '#8a8f98' }} />
                  <h2 style={{ fontSize: 15, fontWeight: 510, color: '#f7f8f8' }}>Penals</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 10 }}>
                  {[
                    { v: report.penaltyStats.penalties_scored, l: 'A favor', c: '#22c55e' },
                    { v: report.penaltyStats.penalties_conceded, l: 'En contra', c: '#f87171' },
                    { v: report.penaltyStats.penalties_per_match, l: 'Penals/partit', c: '#f7f8f8' },
                    { v: `${report.penaltyStats.matches_with_penalty_pct}%`, l: 'Partits amb penal', c: '#8a8f98' },
                  ].map(s => (
                    <div key={s.l} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 510, color: s.c, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                      <div style={{ fontSize: 10, color: '#62666d', marginTop: 2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Squad */}
            {report.players.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Users size={16} style={{ color: '#8a8f98' }} />
                  <h2 style={{ fontSize: 15, fontWeight: 510, color: '#f7f8f8' }}>Plantilla ({report.players.length} jugadors)</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 10, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ textAlign: 'left', paddingBottom: 8, paddingLeft: 4, fontWeight: 510 }}>Jugador</th>
                        <th style={{ textAlign: 'center', paddingBottom: 8, fontWeight: 510 }}>PJ</th>
                        <th style={{ textAlign: 'center', paddingBottom: 8, fontWeight: 510 }}>Gols</th>
                        <th style={{ textAlign: 'center', paddingBottom: 8, fontWeight: 510 }}>Tar.</th>
                        <th style={{ textAlign: 'center', paddingBottom: 8, fontWeight: 510 }}>{!hasMinutesData(report.competition, report.players) ? 'Tit.' : 'Min'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.players
                        .sort((a, b) => (b.appearances ?? 0) - (a.appearances ?? 0))
                        .map((p, i) => (
                        <tr key={i} className="hover:bg-white/[0.02]" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '8px 4px', color: '#f7f8f8', fontWeight: 510, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                            {(p.yellow_cards ?? 0) >= 4 && <span style={{ marginLeft: 4, color: '#fbbf24', fontSize: 11 }} title="Apercebit">!</span>}
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'center', color: '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>{p.appearances ?? 0}</td>
                          <td style={{ padding: '8px 4px', textAlign: 'center', color: '#22c55e', fontWeight: 510, fontVariantNumeric: 'tabular-nums' }}>{p.goals ?? 0}</td>
                          <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                            {(p.yellow_cards ?? 0) > 0 && <span style={{ color: '#fbbf24', fontSize: 11, marginRight: 4 }}>{p.yellow_cards}🟡</span>}
                            {(p.red_cards ?? 0) > 0 && <span style={{ color: '#f87171', fontSize: 11 }}>{p.red_cards}🔴</span>}
                            {(p.yellow_cards ?? 0) === 0 && (p.red_cards ?? 0) === 0 && <span style={{ color: '#62666d' }}>-</span>}
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'center', color: '#8a8f98', fontVariantNumeric: 'tabular-nums' }}>
                            {!hasMinutesData(report.competition, report.players)
                              ? (p.starts > 0 ? p.starts : '-')
                              : (p.minutes_played ?? '-')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  )
}
