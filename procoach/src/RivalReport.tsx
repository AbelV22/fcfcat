import { useState } from 'react';
import {
    Crosshair, Target, AlertTriangle, TrendingUp, Clock,
    Zap, Activity, ChevronDown, UserCheck, Shield, Ruler,
} from 'lucide-react';
import type { FCFTeamData } from './FCFSetup';
import fieldsData from './data/fields.json';
import FieldComparison from './FieldComparison';

// ─── Field lookup ───────────────────────────────────────────────────────────
function normalizeTeam(name: string): string {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

function getTeamField(teamName: string): { field_name: string | null; fcf_venue: string | null; city: string | null; length_m: number | null; width_m: number | null } | null {
    const venues = (fieldsData as any).team_venues as Record<string, any>;
    if (venues[teamName]) return venues[teamName];
    const norm = normalizeTeam(teamName);
    for (const [key, val] of Object.entries(venues)) {
        if (normalizeTeam(key) === norm) return val as any;
    }
    for (const [key, val] of Object.entries(venues)) {
        const kn = normalizeTeam(key);
        const words = norm.split(' ').filter(w => w.length > 4);
        if (words.length > 0 && words.every(w => kn.includes(w))) return val as any;
    }
    return null;
}

// ─── Types ─────────────────────────────────────────────
interface RivalReportProps {
    teamData: FCFTeamData;
}

// ─── Helpers ───────────────────────────────────────────
const resultLetter = (r: string) =>
    r === 'W' ? 'V' : r === 'L' ? 'D' : r;


// ─── Main Component ───────────────────────────────────
export default function RivalReport({ teamData }: RivalReportProps) {
    const data = teamData.data || {};
    const standings: any[] = data.standings ?? [];
    const groupTeams: string[] = data.group_teams ?? standings.map((s: any) => s.name);
    const ourTeamName = teamData.teamName;

    // Filter out our own team
    const rivals = groupTeams.filter((t: string) => t !== ourTeamName);

    const [selectedRival, setSelectedRival] = useState<string>(
        data.next_match?.rival_name || data.meta?.rival || rivals[0] || ''
    );
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Get rival data — use the pre-computed rival_report if available,
    // otherwise compute from rival_intelligence
    const rivalReport = data.rival_report ?? null;
    const rivalIntel = data.rival_intelligence ?? null;
    const rivalInsights = data.rival_insights ?? [];

    // Determine which data to show
    // If we have rival_report, use it. Otherwise fall back to rival_intelligence.
    const report = rivalReport;
    const intel = rivalIntel;

    const hasReport = !!report;
    const hasIntel = !!intel;

    if (!hasReport && !hasIntel) {
        return (
            <div style={{ padding: '3rem', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
                <Crosshair size={48} color="var(--accent-cyan)" style={{ margin: '0 auto 1rem' }} />
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Informe de Rival</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    Para generar el informe del rival, vuelve al inicio y haz una nueva búsqueda indicando el nombre del rival.
                </p>
                <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '0.75rem', padding: '1.5rem', maxWidth: '500px', margin: '0 auto' }}>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                        <strong>Equipos del grupo:</strong>
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'center' }}>
                        {rivals.map((t: string) => (
                            <span key={t} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', background: 'rgba(255,255,255,0.06)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>{t}</span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- Data extraction ---
    const standing = report?.standing ?? {};
    const probableXI = report?.probable_xi ?? [];
    const topScorers = report?.top_scorers ?? [];
    const cards = report?.cards ?? [];
    const goalsByPeriod = report?.goals_by_period ?? intel?.goals_by_period ?? {};
    const form = report?.form ?? intel?.form?.slice(-5) ?? [];
    const record = report?.record ?? {
        wins: intel?.wins ?? 0,
        draws: intel?.draws ?? 0,
        losses: intel?.losses ?? 0,
        goals_scored: intel?.goals_scored ?? 0,
        goals_conceded: intel?.goals_conceded ?? 0,
    };
    const recentResults = report?.recent_results ?? [];
    const h2h = report?.h2h ?? { matches: [], our_wins: 0, draws: 0, rival_wins: 0 };
    const comparison = report?.comparison ?? null;
    const sanctions = report?.sanctions ?? [];
    const totalYellows = report?.total_yellows ?? intel?.total_yellows ?? 0;
    const totalReds = report?.total_reds ?? intel?.total_reds ?? 0;
    const totalMatches = standing.played ?? (record.wins + record.draws + record.losses);
    const rivalName = data.meta?.rival || selectedRival;

    // Find max goals in any period for chart scaling
    const periods = ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90'];
    const maxGoalPeriod = Math.max(
        ...periods.map(p => Math.max(goalsByPeriod[p]?.scored ?? 0, goalsByPeriod[p]?.conceded ?? 0)),
        1
    );

    // Danger alert generation
    const alerts: { type: 'danger' | 'warning' | 'info' | 'success'; text: string }[] = [];

    // Recent form alert
    const recentLosses = form.filter((f: string) => f === 'L' || f === 'D').length;
    const recentWins = form.filter((f: string) => f === 'W' || f === 'V').length;
    if (recentWins >= 3) {
        alerts.push({ type: 'danger', text: `En racha: ${recentWins} victorias en los últimos ${form.length} partidos.` });
    } else if (recentLosses >= 3) {
        alerts.push({ type: 'success', text: `En mala racha: ${recentLosses} derrotas en los últimos ${form.length} partidos.` });
    }

    // Weak periods
    const weakestPeriod = periods.reduce((max, p) =>
        (goalsByPeriod[p]?.conceded ?? 0) > (goalsByPeriod[max]?.conceded ?? 0) ? p : max, '0-15');
    if ((goalsByPeriod[weakestPeriod]?.conceded ?? 0) > 2) {
        alerts.push({ type: 'warning', text: `Vulnerables en min ${weakestPeriod}: ${goalsByPeriod[weakestPeriod]?.conceded} goles encajados.` });
    }

    // Dangerous scorer
    if (topScorers.length > 0 && topScorers[0].pct_of_total >= 20) {
        alerts.push({ type: 'warning', text: `Peligro: ${topScorers[0].name} (#${topScorers[0].dorsal}) — ${topScorers[0].goals} goles (${topScorers[0].pct_of_total}% del equipo).` });
    }

    // Apercibidos
    const apercibidos = cards.filter((c: any) => c.apercibido);
    if (apercibidos.length > 0) {
        alerts.push({ type: 'info', text: `${apercibidos.length} jugador(es) apercibido(s) con 4+ amarillas: ${apercibidos.map((c: any) => c.name).join(', ')}.` });
    }

    // Sanctions
    if (sanctions.length > 0) {
        alerts.push({ type: 'info', text: `${sanctions.length} jugador(es) sancionado(s): ${sanctions.map((s: any) => `${s.player} (${s.matches}p)`).join(', ')}.` });
    }

    // Strong period for scoring
    const strongPeriod = periods.reduce((max, p) =>
        (goalsByPeriod[p]?.scored ?? 0) > (goalsByPeriod[max]?.scored ?? 0) ? p : max, '0-15');
    if ((goalsByPeriod[strongPeriod]?.scored ?? 0) > 2) {
        alerts.push({ type: 'danger', text: `Más peligrosos en min ${strongPeriod}: ${goalsByPeriod[strongPeriod]?.scored} goles marcados.` });
    }

    // ── Conditional insights from the API ──
    const conditionalInsights = rivalInsights.length > 0 ? rivalInsights : [];

    // ─────── RENDER ────────────────────────────────────────

    return (
        <div style={{ padding: '2rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>

            {/* ── Header with rival selector ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px' }}>INFORME SCOUTING · DATOS FCF REALES</span>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <Crosshair size={24} color="var(--accent-cyan)" />
                        {rivalName}
                        {standing.position && (
                            <span style={{ fontSize: '0.85rem', background: 'rgba(6,182,212,0.12)', color: 'var(--accent-cyan)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 600 }}>
                                {standing.position}º — {standing.points} pts
                            </span>
                        )}
                    </h2>
                </div>
                {/* Rival dropdown */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', color: 'white', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}
                    >
                        Cambiar rival <ChevronDown size={16} />
                    </button>
                    {dropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.25rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', overflow: 'hidden', zIndex: 100, maxHeight: '300px', overflowY: 'auto', minWidth: '220px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                            {rivals.map((t: string) => (
                                <div
                                    key={t}
                                    onClick={() => { setSelectedRival(t); setDropdownOpen(false); }}
                                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: t === selectedRival ? 'rgba(6,182,212,0.12)' : 'transparent', color: t === selectedRival ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.8)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = t === selectedRival ? 'rgba(6,182,212,0.12)' : 'transparent')}
                                >
                                    {t}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Comparativa de camps ── */}
            <FieldComparison ourTeamName={ourTeamName} rivalTeamName={rivalName} />

            {/* ── Row 1: Key Stats ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <StatBox label="Posición" value={`${standing.position || '-'}º`} sub={`${standing.points ?? '-'} pts`} color="var(--accent-cyan)" />
                <StatBox label="Racha (Últ. 5)" value={form.map((f: string) => resultLetter(f)).join('-') || '-'} sub={`${record.wins}V ${record.draws}E ${record.losses}D`} color="#f59e0b" />
                <StatBox label="GF / GC" value={`${record.goals_scored} / ${record.goals_conceded}`} sub={`Dif: ${record.goals_scored - record.goals_conceded > 0 ? '+' : ''}${record.goals_scored - record.goals_conceded}`} color={record.goals_scored > record.goals_conceded ? '#10b981' : '#ef4444'} />
                <StatBox label="Casa" value={standing.home_record || '-'} sub="Rendimiento local" color="#10b981" />
                <StatBox label="Fuera" value={standing.away_record || '-'} sub="Rendimiento visitante" color="#a78bfa" />
            </div>

            {/* ── Campo rival ── */}
            {(() => {
                const field = getTeamField(rivalName);
                const hasData = field && field.length_m !== null && field.width_m !== null;
                const UEFA_L = 105, UEFA_W = 68;
                const area = hasData ? field!.length_m! * field!.width_m! : null;
                const uefaArea = UEFA_L * UEFA_W;
                return (
                    <div style={{
                        background: 'rgba(15,23,42,0.8)',
                        border: '1px solid rgba(6,182,212,0.15)',
                        borderRadius: '0.75rem',
                        padding: '0.75rem 1.25rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.25rem',
                        flexWrap: 'wrap',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
                            <Ruler size={14} />
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Campo rival
                            </span>
                        </div>

                        {hasData ? (
                            <>
                                {/* Mini pitch */}
                                {(() => {
                                    const scale = 0.48;
                                    const pw = field!.width_m! * scale;
                                    const ph = field!.length_m! * scale * 0.5;
                                    return (
                                        <div style={{
                                            width: pw, height: ph,
                                            border: '1.5px solid rgba(6,182,212,0.4)',
                                            borderRadius: 2,
                                            background: 'rgba(6,182,212,0.05)',
                                            flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            position: 'relative',
                                        }}>
                                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(6,182,212,0.25)' }} />
                                            <div style={{ width: pw * 0.35, height: ph * 0.5, border: '1px solid rgba(6,182,212,0.25)', borderRadius: 1 }} />
                                        </div>
                                    );
                                })()}
                                <div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', lineHeight: 1.1 }}>
                                        {field!.length_m} × {field!.width_m}
                                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(148,163,184,0.6)', marginLeft: '0.25rem' }}>m</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.5)', marginTop: '0.1rem' }}>
                                        {area?.toLocaleString()} m²
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.5)' }}>
                                    <div>vs UEFA ({UEFA_L}×{UEFA_W})</div>
                                    <div style={{ marginTop: '0.15rem' }}>
                                        <span style={{ color: area! < uefaArea ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                                            {area! < uefaArea ? '▼' : '▲'} {Math.abs(Math.round((area! / uefaArea - 1) * 100))}%
                                        </span>
                                        {' '}{area! < uefaArea ? 'menor' : 'mayor'}
                                    </div>
                                </div>
                                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                                        {field!.field_name || field!.fcf_venue}
                                    </div>
                                    {field!.city && (
                                        <div style={{ fontSize: '0.65rem', color: 'rgba(148,163,184,0.4)', marginTop: '0.1rem' }}>{field!.city}</div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{ fontSize: '0.78rem', color: 'rgba(148,163,184,0.4)' }}>
                                {field ? (
                                    <>
                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{field.fcf_venue}</span>
                                        {field.city && <span> · {field.city}</span>}
                                        <span style={{ color: '#f59e0b' }}> · Dimensiones no disponibles</span>
                                    </>
                                ) : 'Información del campo no disponible'}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ── Row 2: Main — Probable XI + Alerts ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                {/* Probable XI */}
                <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(6,182,212,0.2)' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <UserCheck size={18} color="var(--accent-cyan)" /> XI Probable (por actas FCF)
                    </h3>
                    {probableXI.length > 0 ? (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                {probableXI.map((p: any, i: number) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: '0.4rem', background: i < 11 ? (p.pct >= 90 ? 'rgba(6,182,212,0.08)' : 'transparent') : 'transparent' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: '28px' }}>#{p.dorsal || '?'}</span>
                                        <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: p.pct >= 85 ? 600 : 400 }}>{p.name}</span>
                                        <div style={{ width: '50px', height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${p.pct}%`, background: p.pct >= 85 ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.2)', borderRadius: 3 }} />
                                        </div>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, width: '40px', textAlign: 'right', color: p.pct >= 90 ? 'var(--accent-cyan)' : 'inherit' }}>
                                            {p.starts}/{totalMatches}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                                Datos: titularidades en actas FCF ({totalMatches} jornadas).
                            </p>
                        </>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay datos de alineaciones para este rival.</p>
                    )}
                </div>

                {/* Alerts */}
                <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Zap size={18} color="#f59e0b" /> Alertas Clave del Rival
                    </h3>
                    {alerts.length > 0 ? (
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', listStyle: 'none' }}>
                            {alerts.map((a, i) => {
                                const c: Record<string, string> = { danger: '#ef4444', warning: '#f59e0b', success: '#10b981', info: 'var(--accent-cyan)' };
                                return (
                                    <li key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.8rem' }}>
                                        <span style={{ marginTop: '0.3rem', width: 5, height: 5, borderRadius: '50%', background: c[a.type], flexShrink: 0, boxShadow: `0 0 6px ${c[a.type]}` }} />
                                        <span style={{ color: 'rgba(255,255,255,0.9)' }}>{a.text}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin alertas relevantes.</p>
                    )}

                    {/* H2H mini */}
                    {h2h.matches.length > 0 && (
                        <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>HEAD-TO-HEAD esta temporada</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                                <div>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{h2h.our_wins}</p>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Tus V</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{h2h.draws}</p>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Empates</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>{h2h.rival_wins}</p>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Sus V</p>
                                </div>
                            </div>
                            {h2h.matches.map((m: any, i: number) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', marginTop: '0.25rem', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: 'var(--text-muted)', width: '20px' }}>J{m.jornada}</span>
                                    <span style={{ flex: 1, textAlign: 'right' }}>{m.home_team}</span>
                                    <span style={{ fontWeight: 700, padding: '0.1rem 0.4rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.2rem' }}>{m.home_score} - {m.away_score}</span>
                                    <span style={{ flex: 1 }}>{m.away_team}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Row 3: Scorers + Goal Periods + Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                {/* Top Scorers */}
                <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Target size={18} color="var(--accent-cyan)" /> Goleadores
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {topScorers.length > 0 ? topScorers.map((s: any, i: number) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: '0.4rem', background: i === 0 ? 'rgba(6,182,212,0.08)' : 'transparent' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: i === 0 ? 'var(--accent-cyan)' : 'var(--text-muted)', width: '18px' }}>#{i + 1}</span>
                                <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: i === 0 ? 600 : 400 }}>
                                    {s.name} {s.dorsal ? `(${s.dorsal})` : ''}
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{s.goals}⚽</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', width: '30px', textAlign: 'right' }}>{s.pct_of_total}%</span>
                            </div>
                        )) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin datos de goleadores.</p>
                        )}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                        Total GF: {record.goals_scored}. Datos de actas FCF.
                    </p>
                </div>

                {/* Goal Periods */}
                <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={18} color="#f59e0b" /> Goles por Franja
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {periods.map(p => {
                            const scored = goalsByPeriod[p]?.scored ?? 0;
                            const conceded = goalsByPeriod[p]?.conceded ?? 0;
                            return (
                                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: '38px', flexShrink: 0 }}>{p}'</span>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(scored / maxGoalPeriod) * 100}%`, background: '#10b981', borderRadius: 3 }} />
                                        </div>
                                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(conceded / maxGoalPeriod) * 100}%`, background: '#ef4444', borderRadius: 3 }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem', width: '40px', justifyContent: 'flex-end' }}>
                                        <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>{scored}</span>
                                        <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 600 }}>{conceded}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        <span><span style={{ display: 'inline-block', width: 7, height: 7, background: '#10b981', borderRadius: 2, marginRight: 3 }} />Marcados ({record.goals_scored})</span>
                        <span><span style={{ display: 'inline-block', width: 7, height: 7, background: '#ef4444', borderRadius: 2, marginRight: 3 }} />Encajados ({record.goals_conceded})</span>
                    </div>
                </div>

                {/* Cards */}
                <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={18} color="#f59e0b" /> Tarjetas
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {cards.length > 0 ? cards.map((c: any, i: number) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.5rem', borderRadius: '0.4rem', background: c.apercibido ? 'rgba(245,158,11,0.08)' : 'transparent', borderLeft: c.apercibido ? '3px solid #f59e0b' : '3px solid transparent' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: c.apercibido ? 600 : 400 }}>
                                    {c.name} {c.dorsal ? `(${c.dorsal})` : ''}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                                        <span style={{ width: 9, height: 13, background: '#f59e0b', borderRadius: 1, display: 'inline-block' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>×{c.yellows}</span>
                                    </span>
                                    {c.reds > 0 && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                                            <span style={{ width: 9, height: 13, background: '#ef4444', borderRadius: 1, display: 'inline-block' }} />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>×{c.reds}</span>
                                        </span>
                                    )}
                                    {c.apercibido && <span style={{ fontSize: '0.55rem', background: '#f59e0b', color: '#000', padding: '0.05rem 0.25rem', borderRadius: '1rem', fontWeight: 700 }}>APERC.</span>}
                                </div>
                            </div>
                        )) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin datos de tarjetas.</p>
                        )}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                        Total: {totalYellows} amarillas · {totalReds} rojas
                    </p>
                </div>
            </div>

            {/* ── Row 4: Recent Results + Comparison + Insights ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>

                {/* Recent Results */}
                <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} color="var(--accent-cyan)" /> Últimos Resultados
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {recentResults.length > 0 ? recentResults.map((r: any, i: number) => {
                            const won = r.result === 'V' || r.result === 'W';
                            const draw = r.result === 'E' || r.result === 'D';
                            const col = won ? '#10b981' : draw ? '#f59e0b' : '#ef4444';
                            const letter = won ? 'V' : draw ? 'E' : 'D';
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.78rem' }}>
                                    <span style={{ color: 'var(--text-muted)', width: '22px', fontSize: '0.65rem' }}>J{r.jornada}</span>
                                    <span style={{ flex: 1, textAlign: 'right', fontWeight: r.rival_side === 'home' ? 600 : 400, fontSize: '0.78rem' }}>{r.home_team}</span>
                                    <span style={{ fontWeight: 700, padding: '0.1rem 0.4rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.2rem', minWidth: '36px', textAlign: 'center', fontSize: '0.78rem' }}>{r.home_score}-{r.away_score}</span>
                                    <span style={{ flex: 1, fontWeight: r.rival_side === 'away' ? 600 : 400, fontSize: '0.78rem' }}>{r.away_team}</span>
                                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: won ? '#000' : '#fff' }}>{letter}</span>
                                </div>
                            );
                        }) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin resultados recientes.</p>
                        )}
                    </div>
                    {standing.home_record && (
                        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                            <div style={{ textAlign: 'center' }}><p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Casa</p><p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{standing.home_record}</p></div>
                            <div style={{ textAlign: 'center' }}><p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Fuera</p><p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{standing.away_record}</p></div>
                        </div>
                    )}
                </div>

                {/* Comparison */}
                <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Shield size={18} color="#10b981" /> Comparativa Directa
                    </h3>
                    {comparison ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <CompBar label="Posición" leftVal={`${comparison.our_position}º`} rightVal={`${comparison.rival_position}º`} leftPct={100 - (comparison.our_position / 20 * 100)} rightPct={100 - (comparison.rival_position / 20 * 100)} reverse />
                            <CompBar label="Puntos" leftVal={`${comparison.our_points}`} rightVal={`${comparison.rival_points}`} leftPct={comparison.our_points} rightPct={comparison.rival_points} />
                            <CompBar label="Goles F" leftVal={`${comparison.our_gf}`} rightVal={`${comparison.rival_gf}`} leftPct={comparison.our_gf} rightPct={comparison.rival_gf} />
                            <CompBar label="Goles C" leftVal={`${comparison.our_gc}`} rightVal={`${comparison.rival_gc}`} leftPct={comparison.our_gc} rightPct={comparison.rival_gc} reverse />
                            <CompBar label="Diferencia" leftVal={`${comparison.our_diff > 0 ? '+' : ''}${comparison.our_diff}`} rightVal={`${comparison.rival_diff > 0 ? '+' : ''}${comparison.rival_diff}`} leftPct={Math.max(comparison.our_diff + 30, 0)} rightPct={Math.max(comparison.rival_diff + 30, 0)} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', paddingTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: '#10b981', fontWeight: 600 }}>← {ourTeamName}</span>
                                <span style={{ color: '#ef4444', fontWeight: 600 }}>{rivalName} →</span>
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No hay datos de clasificación para comparar.</p>
                    )}
                </div>

                {/* Conditional Insights */}
                <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={18} color="#10b981" /> Insights del Rival
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {conditionalInsights.length > 0 ? conditionalInsights.map((ins: any, i: number) => {
                            const insightColor = ins.type === 'home_record' ? '#10b981'
                                : ins.type === 'away_record' ? '#a78bfa'
                                    : ins.type === 'recent_form' ? '#f59e0b'
                                        : ins.type === 'strongest_period' ? '#ef4444'
                                            : ins.type === 'weakest_period' ? '#10b981'
                                                : 'var(--accent-cyan)';
                            return (
                                <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', padding: '0.5rem 0.65rem', borderLeft: `3px solid ${insightColor}` }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: insightColor }}>{ins.label}</p>
                                    <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>{ins.detail}</p>
                                </div>
                            );
                        }) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin insights condicionales disponibles.</p>
                        )}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                        Análisis basado en {totalMatches} actas de la temporada.
                    </p>
                </div>
            </div>
        </div>
    );
}


// ─── Sub-components ─────────────────────────────────────

function StatBox({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
    return (
        <div className="glass" style={{ padding: '1rem', borderRadius: '0.75rem', borderTop: `2px solid ${color}`, textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>{label}</p>
            <p style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.5px' }}>{value}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</p>
        </div>
    );
}

function CompBar({ label, leftVal, rightVal, leftPct, rightPct, reverse }: { label: string; leftVal: string; rightVal: string; leftPct: number; rightPct: number; reverse?: boolean }) {
    const total = leftPct + rightPct || 1;
    const lW = (leftPct / total) * 100;
    const rW = (rightPct / total) * 100;
    const lBetter = reverse ? leftPct < rightPct : leftPct > rightPct;
    const rBetter = reverse ? rightPct < leftPct : rightPct > leftPct;
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.15rem' }}>
                <span style={{ fontWeight: 700, color: lBetter ? '#10b981' : 'var(--text-muted)' }}>{leftVal}</span>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 700, color: rBetter ? '#ef4444' : 'var(--text-muted)' }}>{rightVal}</span>
            </div>
            <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', gap: 1 }}>
                <div style={{ width: `${lW}%`, background: lBetter ? '#10b981' : 'rgba(255,255,255,0.15)' }} />
                <div style={{ width: `${rW}%`, background: rBetter ? '#ef4444' : 'rgba(255,255,255,0.15)' }} />
            </div>
        </div>
    );
}
