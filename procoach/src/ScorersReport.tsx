// import { useState } from 'react';
import { Trophy, Award } from 'lucide-react';
import type { FCFTeamData } from './FCFSetup';

interface ScorersReportProps {
    teamData: FCFTeamData;
}

interface Scorer {
    name: string;
    goals: number;
    assists?: number;
    matches?: number;
    penalty_goals?: number;
}

export default function ScorersReport({ teamData }: ScorersReportProps) {
    // const [activeView, setActiveView] = useState<'goals' | 'assists' | 'penalties'>('goals');

    const data = teamData.data || {};
    const scorers: Scorer[] = data.scorers_from_actas || [];
    const standings = data.standings || [];
    const ourTeam = standings.find((s: any) => s.name === teamData.teamName);

    const sortedScorers = [...scorers].sort((a, b) => b.goals - a.goals);
    const topScorer = sortedScorers[0];
    const totalGoals = sortedScorers.reduce((sum, s) => sum + s.goals, 0);

    if (scorers.length === 0) {
        return (
            <div style={{ padding: '3rem', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
                <Trophy size={48} color="#fbbf24" style={{ margin: '0 auto 1rem' }} />
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Golejadors</h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    No hay datos de goleadores disponibles. Asegúrate de haber hecho scrapeo completo con actas.
                </p>
            </div>
        );
    }

    const getGoalColor = (goals: number, maxGoals: number) => {
        const ratio = goals / maxGoals;
        if (ratio >= 0.8) return '#fbbf24';
        if (ratio >= 0.5) return '#94a3b8';
        if (ratio >= 0.3) return '#cd7f32';
        return 'var(--text-muted)';
    };

    return (
        <div style={{ padding: '2rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px' }}>ESTADÍSTICAS DEL EQUIPO</span>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <Trophy size={28} color="#fbbf24" />
                        Golejadors
                        <span style={{ fontSize: '0.85rem', background: 'rgba(251,191,36,0.12)', color: '#fbbf24', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 600 }}>
                            {totalGoals} goles
                        </span>
                    </h2>
                </div>
            </div>

            {/* Top Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass" style={{ padding: '1rem', borderRadius: '0.75rem', borderTop: '2px solid #fbbf24', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>MÁXIMO GOLEADOR</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{topScorer?.name?.split(', ')[1] || topScorer?.name || '-'}</p>
                    <p style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600 }}>{topScorer?.goals || 0} goles</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '0.75rem', borderTop: '2px solid var(--accent-green)', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL GOLEADORES</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{scorers.length}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>con goles</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '0.75rem', borderTop: '2px solid var(--accent-cyan)', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>POSICIÓN EN LIGA</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{ourTeam?.position || '-'}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ourTeam?.points || 0} puntos</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '0.75rem', borderTop: '2px solid #f59e0b', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>GOLES POR PARTIDO</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{ourTeam?.played ? (totalGoals / ourTeam.played).toFixed(1) : '0.0'}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>de media</p>
                </div>
            </div>

            {/* Scorers Table */}
            <div className="glass" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(90deg, rgba(251,191,36,0.08), transparent)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Award size={18} color="#fbbf24" />
                        Clasificación de Goleadores
                    </h3>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                                <th style={{ ...thStyle, textAlign: 'center', width: '60px' }}>#</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Jugador</th>
                                <th style={{ ...thStyle, textAlign: 'center', width: '100px' }}>Goles</th>
                                <th style={{ ...thStyle, textAlign: 'center', width: '100px' }}>Partidos</th>
                                <th style={{ ...thStyle, textAlign: 'center', width: '100px' }}>Media</th>
                                <th style={{ ...thStyle, textAlign: 'center', width: '120px' }}>Progreso</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedScorers.map((scorer, index) => {
                                const maxGoals = sortedScorers[0]?.goals || 1;
                                const matches = scorer.matches || 1;
                                const avg = scorer.goals / matches;

                                return (
                                    <tr key={index} style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        background: index < 3 ? 'rgba(251,191,36,0.03)' : 'transparent',
                                    }}>
                                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#cd7f32' : 'var(--text-muted)' }}>
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                        </td>
                                        <td style={{ ...tdStyle, fontWeight: 600 }}>
                                            {scorer.name}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                background: 'rgba(251,191,36,0.15)',
                                                color: '#fbbf24',
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '0.5rem',
                                                fontWeight: 700,
                                                minWidth: '40px'
                                            }}>
                                                {scorer.goals}
                                            </span>
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)' }}>
                                            {matches}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)' }}>
                                            {avg.toFixed(2)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center', padding: '0.5rem' }}>
                                            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${(scorer.goals / maxGoals) * 100}%`,
                                                    background: getGoalColor(scorer.goals, maxGoals),
                                                    borderRadius: '3px',
                                                    transition: 'width 0.3s ease'
                                                }} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                💡 Datos extraídos de las actas oficiales de la FCF. Temporada 2025-26.
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '0.75rem',
    fontWeight: 600,
    fontSize: '0.72rem',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
};

const tdStyle: React.CSSProperties = {
    padding: '0.75rem',
};
