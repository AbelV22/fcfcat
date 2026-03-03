import { useState, useRef } from 'react';
import { Users, Activity, ShieldCheck, Download, CalendarCheck, TrendingUp, Presentation } from 'lucide-react';
import html2canvas from 'html2canvas';

// ─── TYPES ────────────────────────────────────────────
interface Player {
    id: string;
    number: number;
    name: string;
    position: 'POR' | 'DEF' | 'MED' | 'DEL';
    status: 'Disponible' | 'Lesionado' | 'Sancionado' | 'Duda';
    stats: {
        matches: number;
        minutes: number;
        goals: number;
        assists: number;
        yellows: number;
        reds: number;
        avgRpe: number;
    };
    image?: string;
}

const SHAM_ROSTER: Player[] = [
    { id: '1', number: 1, name: 'David Valdés', position: 'POR', status: 'Disponible', stats: { matches: 20, minutes: 1800, goals: 0, assists: 0, yellows: 1, reds: 0, avgRpe: 5.5 } },
    { id: '2', number: 2, name: 'Sergio Ruiz', position: 'DEF', status: 'Sancionado', stats: { matches: 15, minutes: 1250, goals: 1, assists: 2, yellows: 6, reds: 1, avgRpe: 7.2 } },
    { id: '3', number: 3, name: 'Héctor Bellerín', position: 'DEF', status: 'Disponible', stats: { matches: 18, minutes: 1500, goals: 0, assists: 5, yellows: 3, reds: 0, avgRpe: 6.8 } },
    { id: '4', number: 4, name: 'Marc Bartra', position: 'DEF', status: 'Lesionado', stats: { matches: 10, minutes: 800, goals: 2, assists: 0, yellows: 2, reds: 0, avgRpe: 8.0 } },
    { id: '6', number: 6, name: 'Oriol Romeu', position: 'MED', status: 'Disponible', stats: { matches: 20, minutes: 1750, goals: 1, assists: 1, yellows: 5, reds: 0, avgRpe: 7.5 } },
    { id: '8', number: 8, name: 'Marc Garcia', position: 'MED', status: 'Disponible', stats: { matches: 19, minutes: 1600, goals: 4, assists: 7, yellows: 4, reds: 0, avgRpe: 7.1 } },
    { id: '10', number: 10, name: 'Aleix García', position: 'MED', status: 'Disponible', stats: { matches: 20, minutes: 1780, goals: 6, assists: 10, yellows: 2, reds: 0, avgRpe: 6.9 } },
    { id: '7', number: 7, name: 'Ferran Torres', position: 'DEL', status: 'Disponible', stats: { matches: 17, minutes: 1400, goals: 12, assists: 3, yellows: 1, reds: 0, avgRpe: 7.8 } },
    { id: '9', number: 9, name: 'Gerard Moreno', position: 'DEL', status: 'Duda', stats: { matches: 12, minutes: 950, goals: 8, assists: 2, yellows: 0, reds: 0, avgRpe: 8.2 } },
];

export default function TeamManagement() {
    const [subTab, setSubTab] = useState<'roster' | 'attendance' | 'lineup'>('roster');
    const lineupRef = useRef<HTMLDivElement>(null);

    const handleExportLineup = async () => {
        if (!lineupRef.current) return;
        try {
            const canvas = await html2canvas(lineupRef.current, { backgroundColor: '#090f1a', scale: 2 });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `alineacion-fcf-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to export lineup', err);
        }
    };

    return (
        <div style={{ height: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* ── Tab Bar ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 2rem', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.25)', borderRadius: '0.6rem', padding: '3px' }}>
                    <TabBtn active={subTab === 'roster'} onClick={() => setSubTab('roster')} icon={<Users size={15} />} label="Plantilla (Roster)" />
                    <TabBtn active={subTab === 'attendance'} onClick={() => setSubTab('attendance')} icon={<Activity size={15} />} label="Asistencia & Carga (RPE)" />
                    <TabBtn active={subTab === 'lineup'} onClick={() => setSubTab('lineup')} icon={<ShieldCheck size={15} />} label="Alineación (Matchday)" />
                </div>
                {subTab === 'lineup' && (
                    <button onClick={handleExportLineup} style={{ background: 'var(--gradient-primary)', border: 'none', color: 'white', fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', outline: 'none' }}>
                        <Download size={14} /> Exportar Imagen
                    </button>
                )}
            </div>

            {/* ── Content ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 3rem' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

                    {subTab === 'roster' && (
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Gestión de Plantilla</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Métricas y estado general de los jugadores.</p>

                            <div className="glass" style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                            <th style={{ padding: '1rem', width: '50px' }}>#</th>
                                            <th style={{ padding: '1rem' }}>Jugador</th>
                                            <th style={{ padding: '1rem' }}>Posición</th>
                                            <th style={{ padding: '1rem' }}>Estado</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Mins</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>GF / A</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>🟨 / 🟥</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Avg RPE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SHAM_ROSTER.map(p => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{p.number}</td>
                                                <td style={{ padding: '1rem', fontWeight: 600 }}>{p.name}</td>
                                                <td style={{ padding: '1rem' }}><PosBadge pos={p.position} /></td>
                                                <td style={{ padding: '1rem' }}><StatusBadge status={p.status} /></td>
                                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>{p.stats.minutes}'</td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>{p.stats.goals} / {p.stats.assists}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>{p.stats.yellows}</span> - <span style={{ color: '#ef4444', fontWeight: 700 }}>{p.stats.reds}</span>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <span style={{ fontWeight: 800, color: p.stats.avgRpe > 7.5 ? '#ef4444' : p.stats.avgRpe > 6 ? '#f59e0b' : 'var(--accent-green)' }}>
                                                        {p.stats.avgRpe}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {subTab === 'attendance' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>Control de Asistencia & Carga</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Registro de disponibilidad diaria y percepción de esfuerzo (RPE).</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.3rem 0.8rem', background: 'var(--accent-green)', color: 'black', borderRadius: '0.3rem', cursor: 'pointer' }}>Hoy (3 Mar)</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.3rem 0.8rem', color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>Ayer</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
                                {/* Left: Players list */}
                                <div className="glass" style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                <th style={{ padding: '0.75rem 1rem' }}>Jugador</th>
                                                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Asistencia</th>
                                                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>RPE (0-10)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {SHAM_ROSTER.map((p, i) => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', width: '20px' }}>{p.number}</span>
                                                        {p.name}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                                                            <button style={{ background: i % 4 === 1 ? 'transparent' : 'rgba(16,185,129,0.2)', border: i % 4 === 1 ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--accent-green)', color: i % 4 === 1 ? 'var(--text-muted)' : 'var(--accent-green)', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>✔</button>
                                                            <button style={{ background: i % 4 === 1 ? 'rgba(239,68,68,0.2)' : 'transparent', border: i % 4 === 1 ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)', color: i % 4 === 1 ? '#ef4444' : 'var(--text-muted)', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>❌</button>
                                                            <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>🏥</button>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                        {i % 4 !== 1 ? (
                                                            <input type="range" min="0" max="10" defaultValue={Math.floor(Math.random() * 4) + 5} style={{ width: '80px', accentColor: 'var(--accent-green)' }} />
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>N/A</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Right: Summary */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CalendarCheck size={16} color="var(--accent-cyan)" /> Resumen de Asistencia</h3>
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                            <span style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{SHAM_ROSTER.length - 2}</span>
                                            <span style={{ color: 'var(--text-muted)', marginBottom: '0.4rem', fontSize: '0.9rem' }}>/ {SHAM_ROSTER.length}</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden', display: 'flex' }}>
                                            <div style={{ width: '75%', background: 'var(--accent-green)' }}></div>
                                            <div style={{ width: '15%', background: '#ef4444' }}></div>
                                            <div style={{ width: '10%', background: '#f59e0b' }}></div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            <span>Asistencias</span><span>Faltas</span><span>Lesionados</span>
                                        </div>
                                    </div>

                                    <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={16} color="#f59e0b" /> Carga General (RPE)</h3>
                                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                            <span style={{ fontSize: '3rem', fontWeight: 800, color: '#f59e0b', textShadow: '0 0 20px rgba(245,158,11,0.3)' }}>6.8</span>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Esfuerzo Medio Percibido</p>
                                        </div>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', textAlign: 'center', background: 'rgba(6,182,212,0.1)', padding: '0.5rem', borderRadius: '0.4rem' }}>
                                            Carga óptima. 3 jugadores por encima de 8 (Riesgo alto).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {subTab === 'lineup' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>Alineación (Matchday)</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Diseña el once inicial y expórtalo como imagen para compartir con el equipo o en redes sociales.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.3rem 0.8rem', background: 'var(--accent-cyan)', color: 'black', borderRadius: '0.3rem', cursor: 'pointer' }}>4-3-3</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.3rem 0.8rem', color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>4-4-2</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 350px) 1fr', gap: '2rem' }}>
                                {/* Left: Available Players */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                    <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Presentation size={16} color="var(--accent-cyan)" /> Disponibles</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            {SHAM_ROSTER.filter(p => p.status !== 'Lesionado' && p.status !== 'Sancionado').map(p => (
                                                <div key={p.id} draggable style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'grab' }}>
                                                    <span style={{ fontWeight: 800, color: 'var(--accent-cyan)', width: '18px' }}>{p.number}</span>
                                                    <span style={{ fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name.split(' ')[0]} {p.name.split(' ')[1]?.[0]}.</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)', opacity: 0.6 }}>
                                        <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Bajas Confirmadas</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {SHAM_ROSTER.filter(p => p.status === 'Lesionado' || p.status === 'Sancionado').map(p => (
                                                <div key={p.id} style={{ background: 'rgba(239,68,68,0.05)', border: `1px solid rgba(239,68,68,0.2)`, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontWeight: 800, color: '#ef4444', width: '18px' }}>{p.number}</span>
                                                    <span style={{ fontWeight: 600, flex: 1, color: 'var(--text-muted)' }}>{p.name}</span>
                                                    <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.1rem 0.3rem', borderRadius: '0.2rem' }}>{p.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Pitch Export Area */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div ref={lineupRef} style={{ width: '450px', height: '650px', position: 'relative', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', background: '#10b981' }}>
                                        {/* Pitch Background Image using SVG Data URI for perfect scaling */}
                                        <div style={{
                                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.9,
                                            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'450\' height=\'650\' viewBox=\'0 0 450 650\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'450\' height=\'650\' fill=\'%230e9f6e\'/%3E%3Cpath d=\'M0,0 L450,0 L450,650 L0,650 Z\' fill=\'none\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'4\'/%3E%3Cpath d=\'M0,325 L450,325\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'2\'/%3E%3Ccircle cx=\'225\' cy=\'325\' r=\'45\' fill=\'none\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'2\'/%3E%3Crect x=\'100\' y=\'0\' width=\'250\' height=\'110\' fill=\'none\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'2\'/%3E%3Crect x=\'160\' y=\'0\' width=\'130\' height=\'40\' fill=\'none\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'2\'/%3E%3Cpath d=\'M165,110 A 60 60 0 0 0 285 110\' fill=\'none\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'2\'/%3E%3Ccircle cx=\'225\' cy=\'80\' r=\'2\' fill=\'rgba(255,255,255,0.4)\'/%3E%3Crect x=\'100\' y=\'540\' width=\'250\' height=\'110\' fill=\'none\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'2\'/%3E%3Crect x=\'160\' y=\'610\' width=\'130\' height=\'40\' fill=\'none\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'2\'/%3E%3Cpath d=\'M165,540 A 60 60 0 0 1 285 540\' fill=\'none\' stroke=\'rgba(255,255,255,0.4)\' stroke-width=\'2\'/%3E%3Ccircle cx=\'225\' cy=\'570\' r=\'2\' fill=\'rgba(255,255,255,0.4)\'/%3E%3C/svg%3E")', backgroundSize: 'cover'
                                        }}>
                                        </div>

                                        {/* Overlay Header */}
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '1rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>MATCHDAY</h1>
                                                <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>vs CE Sabadell</p>
                                            </div>
                                            <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(5px)', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }}></div>
                                        </div>

                                        {/* Fixed Mock Lineup 4-3-3 */}
                                        <LineupDot x="50%" y="85%" num={1} name="D. Valdés" />

                                        <LineupDot x="15%" y="65%" num={3} name="Bellerín" />
                                        <LineupDot x="35%" y="70%" num={4} name="Bartra" />
                                        <LineupDot x="65%" y="70%" num={5} name="S. Ruiz" />
                                        <LineupDot x="85%" y="65%" num={2} name="Araujo" />

                                        <LineupDot x="50%" y="55%" num={6} name="O. Romeu" />
                                        <LineupDot x="30%" y="45%" num={8} name="M. Garcia" />
                                        <LineupDot x="70%" y="45%" num={10} name="A. García" />

                                        <LineupDot x="20%" y="25%" num={7} name="F. Torres" />
                                        <LineupDot x="80%" y="25%" num={11} name="Raphinha" />
                                        <LineupDot x="50%" y="20%" num={9} name="G. Moreno" />

                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

// ─── UTILS ────────────────────────────────────────────

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem', borderRadius: '0.4rem', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', fontWeight: active ? 700 : 500,
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: active ? 'white' : 'var(--text-muted)',
                boxShadow: active ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
            }}
        >
            <span style={{ color: active ? 'var(--accent-green)' : 'inherit' }}>{icon}</span> {label}
        </div>
    );
}

function PosBadge({ pos }: { pos: Player['position'] }) {
    const colors = {
        'POR': { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
        'DEF': { bg: 'rgba(56, 189, 248, 0.1)', text: '#38bdf8' },
        'MED': { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
        'DEL': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' }
    };
    return (
        <span style={{ background: colors[pos].bg, color: colors[pos].text, padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 800 }}>
            {pos}
        </span>
    );
}

function StatusBadge({ status }: { status: Player['status'] }) {
    const sMap = {
        'Disponible': { b: 'rgba(16, 185, 129, 0.15)', t: '#10b981' },
        'Lesionado': { b: 'rgba(239, 68, 68, 0.15)', t: '#ef4444' },
        'Sancionado': { b: 'rgba(239, 68, 68, 0.15)', t: '#ef4444' },
        'Duda': { b: 'rgba(245, 158, 11, 0.15)', t: '#f59e0b' }
    };
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: sMap[status].b, color: sMap[status].t, padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.7rem', fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sMap[status].t, boxShadow: `0 0 6px ${sMap[status].t}` }} />
            {status}
        </span>
    );
}

function LineupDot({ x, y, num, name }: { x: string; y: string; num: number; name: string }) {
    return (
        <div style={{ position: 'absolute', top: y, left: x, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', zIndex: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'white', border: '2px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                {num}
            </div>
            <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.65rem', fontWeight: 700, color: 'white', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>
                {name}
            </div>
        </div>
    );
}
