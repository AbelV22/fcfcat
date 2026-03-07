import { useEffect } from 'react';
import { X, Printer, Shield, Gavel, AlertTriangle, Target, Clock, Users } from 'lucide-react';
import type { FCFTeamData } from './FCFSetup';

interface PrintReportProps {
    teamData: FCFTeamData;
    onClose: () => void;
}

export default function PrintReport({ teamData, onClose }: PrintReportProps) {
    const intelligence = teamData.data?.team_intelligence ?? {};
    const standings = teamData.data?.standings ?? [];
    const ourStanding = standings.find((s: any) => s.name === teamData.teamName) || {};
    const nextMatch = teamData.data?.next_match ?? null;
    const rivalName = nextMatch?.rival_name || teamData.data?.meta?.rival || 'Próximo Rival';
    const rivalIntelligence = teamData.data?.rival_report ?? teamData.data?.rival_intelligence ?? {};
    const refName = nextMatch?.referee;
    const refData = refName ? teamData.data?.referee_reports?.[refName] : null;

    // Squad alerts
    const myPlayers = Object.values(teamData.data?.team_intelligence?.players || {}) as any[];
    const alerts = myPlayers
        .filter((p: any) => {
            const isSanctioned = (teamData.data?.sanctions || [])
                .some((s: any) => (s.player || '').toUpperCase().trim() === (p.name || '').toUpperCase().trim() && s.matches_suspended === 0);
            const cycleYellows = (p.yellow_cards || 0) % 5;
            return isSanctioned || (cycleYellows >= 4 && p.yellow_cards > 0);
        })
        .slice(0, 4);

    // Conditional insights - real data
    const conditionalInsights = rivalIntelligence.conditional_insights || [];

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const groupLabel = teamData.group.replace('grup-', 'Grup ').replace('grup-unic', 'Únic');

    return (
        <>
            {/* Print CSS */}
            <style>{`
        @media print {
          body > * { display: none !important; }
          .print-overlay { display: block !important; position: static !important; background: white !important; }
          .print-overlay * { color: #000 !important; background: transparent !important; border-color: #ccc !important; }
          .no-print { display: none !important; }
          .print-overlay { padding: 0 !important; }
          .print-card { border: 1px solid #ddd !important; box-shadow: none !important; page-break-inside: avoid; }
        }
      `}</style>

            {/* Overlay */}
            <div
                className="print-overlay"
                style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(9,15,26,0.97)',
                    backdropFilter: 'blur(10px)',
                    overflowY: 'auto',
                    padding: '2rem',
                }}
            >
                {/* Toolbar */}
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 900, margin: '0 auto 1.5rem', }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>📋 Informe Pre-Partido</h2>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={() => window.print()}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-green)', color: '#000', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.25rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            <Printer size={18} /> Imprimir / PDF
                        </button>
                        <button
                            onClick={onClose}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            <X size={18} /> Cerrar
                        </button>
                    </div>
                </div>

                {/* Report content */}
                <div style={{ maxWidth: 900, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

                    {/* Header */}
                    <div className="print-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.1))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '1rem', padding: '1.5rem 2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Shield size={40} color="var(--accent-green)" />
                            <div>
                                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.2rem' }}>INFORME PRE-PARTIDO</h1>
                                <p style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600 }}>{teamData.teamName} · {teamData.competitionName} · {groupLabel}</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>PRÓXIMO PARTIDO</p>
                            <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{nextMatch?.date || '—'}</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{nextMatch?.time || ''}</p>
                        </div>
                    </div>

                    {/* Row 1: Rival + Árbitro */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

                        {/* Rival */}
                        <div className="print-card" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1.25rem' }}>
                            <h3 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.75rem' }}>⚔️ RIVAL</h3>
                            <p style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>{rivalName}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <Pill label="Posición" value={`${rivalIntelligence.standing?.position || '?'}º`} color="var(--accent-cyan)" />
                                <Pill label="Puntos" value={`${rivalIntelligence.standing?.points || 0}pts`} color="white" />
                                <Pill label="GF / GC" value={`${rivalIntelligence.standing?.goals_for || 0} / ${rivalIntelligence.standing?.goals_against || 0}`} color="var(--accent-green)" />
                            </div>
                            {/* Last 5 results */}
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.4rem' }}>ÚLTIMOS 5 PARTIDOS</p>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                {(rivalIntelligence.recent_results || []).slice(0, 5).map((r: any, i: number) => {
                                    const won = r.rival_side === 'home' ? r.home_score > r.away_score : r.away_score > r.home_score;
                                    const draw = r.home_score === r.away_score;
                                    const color = won ? 'var(--accent-green)' : draw ? '#f59e0b' : '#ef4444';
                                    const letter = won ? 'V' : draw ? 'E' : 'D';
                                    return (
                                        <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: letter === 'V' ? '#000' : '#fff' }}>{letter}</div>
                                    );
                                })}
                                {!(rivalIntelligence.recent_results?.length) && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin datos</span>}
                            </div>
                        </div>

                        {/* Árbitro */}
                        <div className="print-card" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '1rem', padding: '1.25rem' }}>
                            <h3 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Gavel size={14} color="#a78bfa" /> ÁRBITRO ASIGNADO</h3>
                            <p style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{refName || 'Por asignar'}</p>
                            {refData ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <Pill label="Partidos" value={`${refData.matches}`} color="white" />
                                        <Pill label="Amarillas/PJ" value={`${refData.yellows_per_match}`} color={refData.yellows_per_match >= 5 ? '#f59e0b' : 'var(--accent-green)'} />
                                        <Pill label="Tarjetas Visit." value={`${refData.away_player_card_pct}%`} color={refData.away_player_card_pct > 50 ? '#f59e0b' : 'var(--accent-cyan)'} />
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: refData.away_player_card_pct > 50 ? '#f59e0b' : 'var(--text-muted)', fontWeight: refData.away_player_card_pct > 50 ? 600 : 400 }}>
                                        {refData.away_player_card_pct > 50 ? '⚠️ Árbitro casero: suele pitar más al visitante.' : '✅ Árbitro equilibrado / neutral.'}
                                    </p>
                                    {refData.second_half_card_pct > 60 && (
                                        <p style={{ fontSize: '0.75rem', color: '#a78bfa', marginTop: '0.35rem' }}>⚠️ {refData.second_half_card_pct}% de tarjetas van en 2ª parte.</p>
                                    )}
                                </>
                            ) : (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin historial disponible en FCF {groupLabel}.</p>
                            )}
                        </div>
                    </div>

                    {/* Row 2: XI Probable + Goleadores */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

                        {/* XI Probable */}
                        <div className="print-card" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1.25rem' }}>
                            <h3 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={14} color="var(--accent-cyan)" /> XI PROBABLE ({rivalName})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                {(rivalIntelligence.probable_xi || []).slice(0, 11).map((p: any, i: number) => {
                                    const rec = rivalIntelligence.record || {};
                                    const total = (rec.wins || 0) + (rec.draws || 0) + (rec.losses || 0) || 1;
                                    const pct = Math.round((p.starts / total) * 100);
                                    return (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0.4rem', background: i < 3 ? 'rgba(6,182,212,0.06)' : 'transparent', borderRadius: '0.3rem' }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 22 }}>#{p.dorsal || '?'}</span>
                                            <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: i < 3 ? 600 : 400 }}>{p.name}</span>
                                            <span style={{ fontSize: '0.7rem', color: pct >= 85 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>{p.starts}/{total}</span>
                                        </div>
                                    );
                                })}
                                {!(rivalIntelligence.probable_xi?.length) && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin datos de alineaciones.</p>}
                            </div>
                        </div>

                        {/* Goleadores + Alertas tarjetas rival */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="print-card" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1.25rem', flex: 1 }}>
                                <h3 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Target size={14} color="var(--accent-cyan)" /> MÁXIMOS GOLEADORES</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    {(rivalIntelligence.top_scorers || []).slice(0, 5).map((s: any, i: number) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.7rem', color: i === 0 ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: 700, width: 16 }}>#{i + 1}</span>
                                            <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: i === 0 ? 600 : 400 }}>{s.name}</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{s.goals}⚽</span>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{s.pct_of_total}%</span>
                                        </div>
                                    ))}
                                    {!(rivalIntelligence.top_scorers?.length) && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin datos.</p>}
                                </div>
                            </div>

                            <div className="print-card" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '1rem', padding: '1.25rem', flex: 1 }}>
                                <h3 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><AlertTriangle size={14} color="#f59e0b" /> APERCIBIDOS RIVAL</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    {(rivalIntelligence.cards || []).filter((p: any) => p.apercibido).slice(0, 4).map((p: any, i: number) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ width: 10, height: 14, background: '#f59e0b', borderRadius: 1, flexShrink: 0 }}></span>
                                            <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600 }}>{p.name}</span>
                                            <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', padding: '0.05rem 0.3rem', borderRadius: '0.25rem', fontWeight: 700 }}>APERC.</span>
                                        </div>
                                    ))}
                                    {!(rivalIntelligence.cards?.some((p: any) => p.apercibido)) && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin apercibidos.</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Insights tácticos del rival + Alertas nuestras */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

                        {/* Insights */}
                        <div className="print-card" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '1rem', padding: '1.25rem' }}>
                            <h3 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.75rem' }}>💡 INSIGHTS TÁCTICOS — {rivalName}</h3>
                            {conditionalInsights.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {conditionalInsights.slice(0, 5).map((insight: any, i: number) => {
                                        const color = insight.pct >= 70 ? 'var(--accent-green)' : insight.pct >= 50 ? '#f59e0b' : '#ef4444';
                                        return (
                                            <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', borderLeft: `3px solid ${color}` }}>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{insight.condition}</p>
                                                <p style={{ fontSize: '0.9rem', fontWeight: 700, color }}>{insight.result}</p>
                                                {insight.detail && <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{insight.detail}</p>}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {/* Fallback insights from available data */}
                                    {rivalIntelligence.goals_by_period?.['0-15']?.conceded > 2 && (
                                        <InsightBlock color="var(--accent-green)" condition="Vulnerables en inicio de partido" result={`${rivalIntelligence.goals_by_period['0-15'].conceded} goles encajados en los primeros 15 min.`} />
                                    )}
                                    {rivalIntelligence.top_scorers?.[0] && (
                                        <InsightBlock color="#ef4444" condition="Jugador clave a anular" result={`${rivalIntelligence.top_scorers[0].name}: ${rivalIntelligence.top_scorers[0].goals} goles (${rivalIntelligence.top_scorers[0].pct_of_total}% del total).`} />
                                    )}
                                    {rivalIntelligence.standing?.goals_against > 25 && (
                                        <InsightBlock color="var(--accent-green)" condition="Defensa débil" result={`${rivalIntelligence.standing.goals_against} goles encajados → presionar arriba.`} />
                                    )}
                                    {rivalIntelligence.standing?.goals_for < 15 && (
                                        <InsightBlock color="var(--accent-cyan)" condition="Ataque poco productivo" result={`Solo ${rivalIntelligence.standing.goals_for} goles a favor → no tienen referencia ofensiva clara.`} />
                                    )}
                                    {rivalIntelligence.cards?.some((p: any) => p.apercibido) && (
                                        <InsightBlock color="#f59e0b" condition="Estrategia de juego duro" result={`Tienen ${rivalIntelligence.cards.filter((p: any) => p.apercibido).length} jugador(es) apercibido(s): provocarles puede forzar ausencias.`} />
                                    )}
                                    {conditionalInsights.length === 0 && !rivalIntelligence.top_scorers?.length && (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selecciona un rival en la pestaña "Scouting Rival" para generar insights automáticos.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Alertas plantilla propia */}
                        <div className="print-card" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '1rem', padding: '1.25rem' }}>
                            <h3 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginBottom: '0.75rem' }}>⚠️ ALERTAS MI PLANTILLA</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {alerts.map((p: any, i: number) => {
                                    const cycleYellows = (p.yellow_cards || 0) % 5;
                                    const isSanctioned = (teamData.data?.sanctions || [])
                                        .some((s: any) => (s.player || '').toUpperCase().trim() === (p.name || '').toUpperCase().trim() && s.matches_suspended === 0);
                                    return (
                                        <div key={i} style={{ padding: '0.5rem 0.6rem', borderRadius: '0.4rem', borderLeft: `3px solid ${isSanctioned ? '#ef4444' : '#f59e0b'}`, background: 'rgba(0,0,0,0.2)' }}>
                                            <p style={{ fontSize: '0.82rem', fontWeight: 600 }}>{p.name}</p>
                                            <p style={{ fontSize: '0.7rem', color: isSanctioned ? '#ef4444' : '#f59e0b' }}>
                                                {isSanctioned ? '🚫 SANCIONADO' : `${p.yellow_cards} amarillas (${cycleYellows}/5)`}
                                            </p>
                                        </div>
                                    );
                                })}
                                {alerts.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>✅ Sin alertas de disciplina.</p>}
                            </div>

                            {/* Our form */}
                            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.4rem' }}>NUESTRA RACHA</p>
                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                    {(intelligence.form || []).slice(-5).map((r: string, i: number) => {
                                        const color = r === 'W' ? 'var(--accent-green)' : r === 'D' ? '#f59e0b' : '#ef4444';
                                        const letter = r === 'W' ? 'V' : r === 'D' ? 'E' : 'D';
                                        return <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: r === 'W' ? '#000' : '#fff' }}>{letter}</div>;
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        ProCoach FCF · Informe generado automáticamente con datos de las actas oficiales FCF · {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
            </div>
        </>
    );
}

function Pill({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '0.4rem', padding: '0.4rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color }}>{value}</p>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{label}</p>
        </div>
    );
}

function InsightBlock({ condition, result, color }: { condition: string; result: string; color: string }) {
    return (
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', borderLeft: `3px solid ${color}` }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{condition}</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color }}>{result}</p>
        </div>
    );
}
