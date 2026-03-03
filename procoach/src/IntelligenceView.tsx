import { useState } from 'react';
import {
  Trophy, Users, Target, AlertTriangle, TrendingUp,
  CheckCircle2, Zap, Clock, RotateCcw, ChevronDown, ChevronUp,
  Award
} from 'lucide-react';
import type { FCFTeamData } from './FCFSetup';

interface IntelligenceViewProps {
  teamData: FCFTeamData;
  onReset: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function badge(result: string) {
  const r = result?.trim()?.toUpperCase();
  const map: Record<string, { bg: string; color: string; label: string }> = {
    W: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'V' },
    D: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'E' },
    L: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'D' },
  };
  const m = map[r] ?? { bg: 'rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.5)', label: r };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 22, height: 22, borderRadius: 4,
      background: m.bg, color: m.color,
      fontSize: '0.65rem', fontWeight: 800,
    }}>
      {m.label}
    </span>
  );
}

function PctBar({ value, max, color = '#10b981' }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function SectionCard({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: 'rgba(15,23,42,0.8)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '1rem',
      overflow: 'hidden',
      marginBottom: '1rem',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ color: '#10b981' }}>{icon}</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white', letterSpacing: '0.2px' }}>{title}</span>
        </div>
        {open ? <ChevronUp size={16} color="rgba(148,163,184,0.5)" /> : <ChevronDown size={16} color="rgba(148,163,184,0.5)" />}
      </button>
      {open && <div style={{ padding: '1.25rem' }}>{children}</div>}
    </div>
  );
}

function StatChip({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${accent ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '0.625rem',
      padding: '0.75rem 1rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: accent ? '#10b981' : 'white', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.6)', marginTop: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function IntelligenceView({ teamData, onReset }: IntelligenceViewProps) {
  const { data } = teamData;
  const standings: any[] = data?.standings ?? [];
  const actas: any[] = data?.actas ?? [];
  const scorers: any[] = data?.scorers_from_actas ?? data?.scorers ?? [];
  const sanctions: any[] = data?.sanctions ?? [];
  const meta = data?.meta ?? {};
  const validation = data?.validation ?? {};
  const teamIntel = data?.team_intelligence ?? {};
  const teamInsights: any[] = data?.team_insights ?? [];
  const rivalIntel = data?.rival_intelligence;
  const rivalInsights: any[] = data?.rival_insights ?? [];

  const players = Object.entries(teamIntel?.players ?? {}) as [string, any][];
  const results: any[] = teamIntel?.results ?? [];
  const form: string[] = teamIntel?.form ?? [];
  const goalsByPeriod: Record<string, number> = teamIntel?.goals_by_period ?? {};
  const maxPeriodGoals = Math.max(...Object.values(goalsByPeriod), 1);

  // Find our team in standings
  const ourStanding = standings.find(s => {
    const n = (s.name ?? '').toLowerCase();
    return teamData.team.toLowerCase().split(' ').some(w => w.length > 3 && n.includes(w.toLowerCase()));
  });

  const compPretty = teamData.competitionName || teamData.competition.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const groupPretty = teamData.group.replace('grup-', 'Grup ').replace('grup-unic', 'Grup Únic');
  const seasonLabel = teamData.season === '2526' ? '2025-26' : teamData.season === '2425' ? '2024-25' : teamData.season;

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Header band ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05))',
        border: '1px solid rgba(16,185,129,0.15)',
        borderRadius: '1rem',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <span style={{
              padding: '0.2rem 0.625rem',
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '2rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#10b981',
              letterSpacing: '0.5px',
            }}>
              FCF INTEL · EN VIVO
            </span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.5)' }}>
              {meta.scraped_at ? new Date(meta.scraped_at).toLocaleString('ca-ES') : ''}
            </span>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
            {teamData.teamName}
          </h2>
          <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
            {compPretty} · {groupPretty} · {seasonLabel}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Precisió</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
              {(validation.accuracy_pct ?? 0).toFixed(1)}%
            </div>
          </div>
          <button
            onClick={onReset}
            title="Canviar equip"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 0.875rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem',
              color: 'rgba(148,163,184,0.7)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(148,163,184,0.7)'; }}
          >
            <RotateCcw size={14} /> Canviar equip
          </button>
        </div>
      </div>

      {/* ── Quick stats ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatChip label="Posició" value={ourStanding?.position ?? '—'} accent />
        <StatChip label="Punts" value={ourStanding?.points ?? teamIntel?.wins != null ? (teamIntel.wins * 3 + teamIntel.draws) : '—'} />
        <StatChip label="PJ" value={ourStanding?.played ?? results.length} />
        <StatChip label="GF/GC" value={`${teamIntel?.goals_scored ?? 0}/${teamIntel?.goals_conceded ?? 0}`} />
        <StatChip label="Actes" value={actas.length} />
      </div>

      {/* ── Form strip ───────────────────────────────────────────────────── */}
      {form.length > 0 && (
        <div style={{
          background: 'rgba(15,23,42,0.8)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '1rem',
          padding: '0.875rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
            Forma recent
          </span>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {form.slice(-10).map((r, i) => <span key={i}>{badge(r)}</span>)}
          </div>
        </div>
      )}

      {/* ── 2-col layout ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem' }}>

        {/* Left column */}
        <div>

          {/* Classificació */}
          <SectionCard title="Classificació" icon={<Trophy size={16} />}>
            {standings.length === 0
              ? <p style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.8rem' }}>No hi ha dades.</p>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {['#', 'Equip', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'Pts'].map(h => (
                        <th key={h} style={{ padding: '0.35rem 0.5rem', textAlign: h === 'Equip' ? 'left' : 'center', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s: any) => {
                      const isOurs = ourStanding && s.name === ourStanding.name;
                      return (
                        <tr key={s.position} style={{
                          background: isOurs ? 'rgba(16,185,129,0.08)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}>
                          <td style={{ padding: '0.45rem 0.5rem', textAlign: 'center', color: 'rgba(148,163,184,0.6)', fontWeight: isOurs ? 700 : 400 }}>{s.position}</td>
                          <td style={{ padding: '0.45rem 0.5rem', fontWeight: isOurs ? 700 : 400, color: isOurs ? '#10b981' : 'white', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {isOurs ? '⭐ ' : ''}{s.name}
                          </td>
                          {['played', 'won', 'drawn', 'lost', 'goals_for', 'goals_against', 'points'].map(k => (
                            <td key={k} style={{ padding: '0.45rem 0.5rem', textAlign: 'center', fontWeight: k === 'points' && isOurs ? 800 : k === 'points' ? 700 : 400, color: k === 'points' ? (isOurs ? '#10b981' : 'rgba(255,255,255,0.9)') : 'rgba(255,255,255,0.7)' }}>
                              {s[k] ?? 0}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            }
          </SectionCard>

          {/* Plantilla */}
          <SectionCard title={`Plantilla (${players.length} jugadors)`} icon={<Users size={16} />}>
            {players.length === 0
              ? <p style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.8rem' }}>Necessita actes per mostrar la plantilla.</p>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {['#', 'Jugador', 'PJ', 'Min', 'Gols', 'Cards'].map(h => (
                        <th key={h} style={{ padding: '0.35rem 0.5rem', textAlign: h === 'Jugador' ? 'left' : 'center', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {players
                      .sort(([, a], [, b]) => (b.appearances ?? 0) - (a.appearances ?? 0))
                      .map(([name, stats]) => (
                        <tr key={name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center', color: 'rgba(148,163,184,0.5)', fontSize: '0.72rem' }}>
                            {stats.dorsal ? `#${stats.dorsal}` : ''}
                          </td>
                          <td style={{ padding: '0.4rem 0.5rem', fontWeight: 500 }}>{name}</td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center', color: 'rgba(148,163,184,0.8)' }}>{stats.appearances ?? 0}</td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center', color: 'rgba(148,163,184,0.8)' }}>{stats.minutes_played ?? 0}'</td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center', fontWeight: (stats.goals ?? 0) > 0 ? 700 : 400, color: (stats.goals ?? 0) > 0 ? '#10b981' : 'rgba(148,163,184,0.6)' }}>
                            {stats.goals ?? 0}
                          </td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>
                            {(stats.yellow_cards ?? 0) > 0 && (
                              <span style={{ display: 'inline-block', width: 8, height: 11, background: '#f59e0b', borderRadius: 1, marginRight: 2 }} />
                            )}
                            {(stats.red_cards ?? 0) > 0 && (
                              <span style={{ display: 'inline-block', width: 8, height: 11, background: '#ef4444', borderRadius: 1 }} />
                            )}
                            {(stats.yellow_cards ?? 0) === 0 && (stats.red_cards ?? 0) === 0 && (
                              <span style={{ color: 'rgba(148,163,184,0.3)', fontSize: '0.7rem' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )
            }
          </SectionCard>

          {/* Resultats */}
          {results.length > 0 && (
            <SectionCard title="Resultats recents" icon={<Clock size={16} />} defaultOpen={false}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {results.slice(-8).reverse().map((r: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '0.5rem',
                    fontSize: '0.8rem',
                  }}>
                    <span style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.7rem', width: 36, flexShrink: 0 }}>
                      {r.date ? r.date.slice(5, 10) : ''}
                    </span>
                    <span style={{ flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.home_team}</span>
                    <span style={{ fontWeight: 700, background: 'rgba(0,0,0,0.3)', padding: '0.15rem 0.5rem', borderRadius: '0.25rem', minWidth: 42, textAlign: 'center', fontSize: '0.875rem' }}>
                      {r.home_score ?? '?'} – {r.away_score ?? '?'}
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.away_team}</span>
                    {badge(r.result ?? '')}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

        </div>

        {/* Right column */}
        <div>

          {/* Insights */}
          <SectionCard title="Intel·ligència" icon={<Zap size={16} />}>
            {teamInsights.length === 0
              ? <p style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.8rem' }}>Necessita més actes per generar insights.</p>
              : teamInsights.map((ins: any, i: number) => (
                <div key={i} style={{
                  padding: '0.75rem',
                  background: 'rgba(16,185,129,0.04)',
                  border: '1px solid rgba(16,185,129,0.1)',
                  borderLeft: '3px solid #10b981',
                  borderRadius: '0 0.5rem 0.5rem 0',
                  marginBottom: '0.5rem',
                }}>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '0.2rem' }}>{ins.label}</div>
                  {ins.value && <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', lineHeight: 1, marginBottom: '0.2rem' }}>{ins.value}</div>}
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>{ins.detail}</div>
                </div>
              ))
            }
          </SectionCard>

          {/* Goals by period */}
          {Object.keys(goalsByPeriod).length > 0 && (
            <SectionCard title="Gols per període" icon={<TrendingUp size={16} />} defaultOpen={false}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', padding: '0.5rem 0' }}>
                {Object.entries(goalsByPeriod).map(([period, count]) => {
                  const h = Math.max(8, (count / maxPeriodGoals) * 80);
                  return (
                    <div key={period} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981' }}>{count}</span>
                      <div style={{ width: '100%', height: `${h}px`, background: 'linear-gradient(180deg, #10b981, #06b6d4)', borderRadius: '3px 3px 0 0' }} />
                      <span style={{ fontSize: '0.6rem', color: 'rgba(148,163,184,0.5)' }}>{period}'</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Top scorers */}
          <SectionCard title={`Golejadors (${scorers.length})`} icon={<Award size={16} />} defaultOpen={false}>
            {scorers.length === 0
              ? <p style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.8rem' }}>No hi ha dades.</p>
              : scorers.slice(0, 12).map((s: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.45rem' }}>
                  <span style={{ width: 20, textAlign: 'center', fontSize: '0.72rem', color: 'rgba(148,163,184,0.5)' }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.team}</div>
                  </div>
                  <PctBar value={s.goals} max={scorers[0]?.goals ?? 1} />
                  <span style={{ width: 24, textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: '0.85rem', flexShrink: 0 }}>{s.goals}</span>
                </div>
              ))
            }
          </SectionCard>

          {/* Sancions */}
          <SectionCard title={`Sancions (${sanctions.length})`} icon={<AlertTriangle size={16} />} defaultOpen={false}>
            {sanctions.length === 0
              ? <p style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.8rem' }}>Sense sancions actives.</p>
              : sanctions.slice(0, 10).map((s: any, i: number) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.625rem',
                  background: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.1)',
                  borderRadius: '0.5rem',
                  marginBottom: '0.375rem',
                  fontSize: '0.78rem',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.player}</div>
                    <div style={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.team}</div>
                  </div>
                  <span style={{
                    padding: '0.2rem 0.4rem',
                    background: 'rgba(239,68,68,0.15)',
                    color: '#ef4444',
                    borderRadius: '0.25rem',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {s.matches_suspended ?? 1}P
                  </span>
                </div>
              ))
            }
          </SectionCard>

          {/* Rival scouting */}
          {rivalIntel && (
            <SectionCard title={`Scouting: ${rivalIntel.team_name}`} icon={<Target size={16} />} defaultOpen>
              {rivalInsights.length === 0
                ? <p style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.8rem' }}>Sense prou dades del rival.</p>
                : rivalInsights.map((ins: any, i: number) => (
                  <div key={i} style={{
                    padding: '0.65rem 0.75rem',
                    background: 'rgba(245,158,11,0.04)',
                    border: '1px solid rgba(245,158,11,0.1)',
                    borderLeft: '3px solid #f59e0b',
                    borderRadius: '0 0.5rem 0.5rem 0',
                    marginBottom: '0.4rem',
                  }}>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '0.15rem' }}>{ins.label}</div>
                    {ins.value && <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1, marginBottom: '0.15rem' }}>{ins.value}</div>}
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{ins.detail}</div>
                  </div>
                ))
              }
            </SectionCard>
          )}

          {/* Validation */}
          <SectionCard title="Qualitat de dades" icon={<CheckCircle2 size={16} />} defaultOpen={false}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <StatChip label="Precisió" value={`${(validation.accuracy_pct ?? 0).toFixed(1)}%`} accent />
              <StatChip label="Checks OK" value={`${validation.passed ?? 0}/${validation.total_checks ?? 0}`} />
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${validation.accuracy_pct ?? 0}%`, background: 'linear-gradient(90deg, #10b981, #06b6d4)', borderRadius: 4 }} />
            </div>
            {(validation.errors ?? []).slice(0, 3).map((e: string, i: number) => (
              <div key={i} style={{ fontSize: '0.72rem', color: 'rgba(239,68,68,0.7)', marginTop: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(239,68,68,0.3)' }}>{e}</div>
            ))}
          </SectionCard>

        </div>
      </div>
    </div>
  );
}
