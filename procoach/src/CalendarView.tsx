// import { useState } from 'react';
import { Calendar, Clock, Home } from 'lucide-react';
import type { FCFTeamData } from './FCFSetup';

interface CalendarViewProps {
    teamData: FCFTeamData;
}

interface Match {
    jornada: number;
    date: string;
    time?: string;
    home_team: string;
    away_team: string;
    home_score?: number | null;
    away_score?: number | null;
    venue?: string;
    referee?: string;
    status?: string;
}

export default function CalendarView({ teamData }: CalendarViewProps) {
    const data = teamData.data || {};
    const matches: Match[] = data.matches || [];
    const ourTeamName = teamData.teamName;

    // Sort matches by jornada
    const sortedMatches = [...matches].sort((a, b) => a.jornada - b.jornada);

    // Calculate stats
    const playedMatches = matches.filter(m => m.home_score !== null && m.away_score !== null);

    const wins = playedMatches.filter(m =>
        (m.home_team === ourTeamName && (m.home_score || 0) > (m.away_score || 0)) ||
        (m.away_team === ourTeamName && (m.away_score || 0) > (m.home_score || 0))
    ).length;

    const draws = playedMatches.filter(m => m.home_score === m.away_score).length;
    const losses = playedMatches.filter(m =>
        (m.home_team === ourTeamName && (m.home_score || 0) < (m.away_score || 0)) ||
        (m.away_team === ourTeamName && (m.away_score || 0) < (m.home_score || 0))
    ).length;

    const goalsFor = playedMatches.reduce((sum, m) => {
        if (m.home_team === ourTeamName) return sum + (m.home_score || 0);
        if (m.away_team === ourTeamName) return sum + (m.away_score || 0);
        return sum;
    }, 0);

    const goalsAgainst = playedMatches.reduce((sum, m) => {
        if (m.home_team === ourTeamName) return sum + (m.away_score || 0);
        if (m.away_team === ourTeamName) return sum + (m.home_score || 0);
        return sum;
    }, 0);

    if (matches.length === 0) {
        return (
            <div style={{ padding: '3rem', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
                <Calendar size={48} color="#3b82f6" style={{ margin: '0 auto 1rem' }} />
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Calendario</h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    No hay datos del calendario disponibles.
                </p>
            </div>
        );
    }

    const getResultColor = (match: Match) => {
        if (match.home_score === null || match.home_score === undefined ||
            match.away_score === null || match.away_score === undefined) return 'var(--text-muted)';
        const isHome = match.home_team === ourTeamName;
        const ourScore = isHome ? match.home_score : match.away_score;
        const rivalScore = isHome ? match.away_score : match.home_score;

        if (ourScore > rivalScore) return 'var(--accent-green)';
        if (ourScore === rivalScore) return '#f59e0b';
        return '#ef4444';
    };

    const getResultText = (match: Match) => {
        if (match.home_score === null) return 'POR JUGAR';
        const isHome = match.home_team === ourTeamName;
        return isHome ? `${match.home_score} - ${match.away_score}` : `${match.away_score} - ${match.home_score}`;
    };

    return (
        <div style={{ padding: '2rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px' }}>CALENDARIO DE PARTIDOS</span>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <Calendar size={28} color="#3b82f6" />
                        Calendario
                        <span style={{ fontSize: '0.85rem', background: 'rgba(59,130,246,0.12)', color: '#3b82f6', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 600 }}>
                            {matches.length} jornadas
                        </span>
                    </h2>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass" style={{ padding: '1rem', borderRadius: '0.75rem', borderTop: '2px solid #3b82f6', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>JUGADOS</p>
                    <p style={{ fontSize: '1.3rem', fontWeight: 700 }}>{playedMatches.length}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ {matches.length}</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '0.75rem', borderTop: '2px solid var(--accent-green)', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>VICTORIAS</p>
                    <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-green)' }}>{wins}</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '0.75rem', borderTop: '2px solid #f59e0b', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>EMPATES</p>
                    <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f59e0b' }}>{draws}</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '0.75rem', borderTop: '2px solid #ef4444', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>DERROTAS</p>
                    <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ef4444' }}>{losses}</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '0.75rem', borderTop: '2px solid var(--accent-cyan)', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>GOLES A FAVOR</p>
                    <p style={{ fontSize: '1.3rem', fontWeight: 700 }}>{goalsFor}</p>
                </div>
                <div className="glass" style={{ padding: '1rem', borderRadius: '0.75rem', borderTop: '2px solid #f59e0b', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>GOLES EN CONTRA</p>
                    <p style={{ fontSize: '1.3rem', fontWeight: 700 }}>{goalsAgainst}</p>
                </div>
            </div>

            {/* Calendar Table */}
            <div className="glass" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(90deg, rgba(59,130,246,0.08), transparent)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={18} color="#3b82f6" />
                        Partidos de la Temporada
                    </h3>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                                <th style={{ ...thStyle, textAlign: 'center', width: '60px' }}>J</th>
                                <th style={{ ...thStyle, textAlign: 'center', width: '100px' }}>Fecha</th>
                                <th style={{ ...thStyle, textAlign: 'center', width: '60px' }}>Casa</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Partido</th>
                                <th style={{ ...thStyle, textAlign: 'center', width: '100px' }}>Resultado</th>
                                <th style={{ ...thStyle, textAlign: 'left', minWidth: '200px' }}>Campo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedMatches.map((match, index) => {
                                const isHome = match.home_team === ourTeamName;
                                const rival = isHome ? match.away_team : match.home_team;

                                return (
                                    <tr key={index} style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        background: match.home_score === null ? 'rgba(59,130,246,0.03)' : 'transparent',
                                    }}>
                                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: '#3b82f6' }}>
                                            {match.jornada}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)' }}>
                                            {match.date}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            {isHome ? <Home size={16} color="var(--accent-green)" /> : <span>Vol</span>}
                                        </td>
                                        <td style={{ ...tdStyle, fontWeight: 600 }}>
                                            {rival}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                background: match.home_score === null ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                                                color: getResultColor(match),
                                                padding: '0.2rem 0.6rem',
                                                borderRadius: '0.5rem',
                                                fontWeight: 700,
                                                minWidth: '80px'
                                            }}>
                                                {getResultText(match)}
                                            </span>
                                        </td>
                                        <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            {match.venue || '-'}
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
                💡 Datos de la FCF. Temporada 2025-26 Segona Catalana Grup 3.
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
