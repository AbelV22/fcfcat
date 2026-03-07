import { useState, useEffect } from 'react';
import {
    Gavel, AlertTriangle, TrendingUp, Clock,
    ChevronDown, Shield, Activity, Users, BarChart2,
} from 'lucide-react';
import type { FCFTeamData } from './FCFSetup';

// ─── Types ─────────────────────────────────────────────
interface RefereeReportProps {
    teamData: FCFTeamData;
    selectedReferee?: string | null;
    onClearSelectedRef?: () => void;
}

interface PopMetric {
    sorted_values: number[];
    count: number;
    mean: number;
    p25: number;
    p50: number;
    p75: number;
}

// ─── Helpers ────────────────────────────────────────────

function pct(value: number | undefined): string {
    if (value === undefined || value === null || isNaN(value)) return '—';
    return `${Math.round(value)}%`;
}

function fmt(value: number | undefined, decimals = 1): string {
    if (value === undefined || value === null || isNaN(value)) return '—';
    return value.toFixed(decimals);
}

/** Returns 0-100 percentile rank of value in a sorted array. */
function percentileRank(value: number, sortedVals: number[]): number {
    if (!sortedVals || sortedVals.length === 0) return 50;
    const below = sortedVals.filter(v => v < value).length;
    return Math.round((below / sortedVals.length) * 100);
}

/** Color for a percentile bar (red = extreme, amber = notable, green = normal). */
function pctColor(pctRank: number, higherIsBad: boolean): string {
    const isBad = higherIsBad ? pctRank >= 80 : pctRank <= 20;
    const isGood = higherIsBad ? pctRank <= 30 : pctRank >= 70;
    if (isBad) return '#ef4444';
    if (isGood) return '#10b981';
    return '#f59e0b';
}

function pctLabel(pctRank: number): string {
    if (pctRank >= 90) return 'Top 10%';
    if (pctRank >= 75) return 'Top 25%';
    if (pctRank >= 50) return 'Por encima de la media';
    if (pctRank >= 25) return 'Por debajo de la media';
    if (pctRank >= 10) return 'Bottom 25%';
    return 'Bottom 10%';
}

// ─── Population Percentile Bar ──────────────────────────
function PercentileBar({
    label, value, displayValue, metric, higherIsBad, popStats,
}: {
    label: string;
    value: number;
    displayValue: string;
    metric: string;
    higherIsBad: boolean;
    popStats: Record<string, PopMetric>;
}) {
    const pop = popStats[metric];
    if (!pop || !pop.sorted_values) return null;
    const rank = percentileRank(value, pop.sorted_values);
    const color = pctColor(rank, higherIsBad);

    return (
        <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color }}>{displayValue}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>media: {fmt(pop.mean)}</span>
                </div>
            </div>
            {/* Bar: shows where the referee sits in the population */}
            <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${rank}%`, background: color,
                    borderRadius: 3, transition: 'width 0.4s ease',
                }} />
                {/* Median marker */}
                <div style={{
                    position: 'absolute', top: -2, height: 10, width: 2,
                    background: 'rgba(255,255,255,0.4)', borderRadius: 1,
                    left: `${percentileRank(pop.p50, pop.sorted_values)}%`,
                }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Percentil {rank}</span>
                <span style={{ fontSize: '0.6rem', color }}>
                    {pctLabel(rank)}
                </span>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────
export default function RefereeReport({ teamData, selectedReferee, onClearSelectedRef }: RefereeReportProps) {
    const data = teamData.data || {};
    const refereeReports: Record<string, any> = data.referee_reports ?? {};
    const popStats: Record<string, PopMetric> = data.referee_population_stats ?? {};
    const refereeNames = Object.keys(refereeReports).sort();

    const [selectedRef, setSelectedRef] = useState<string>(selectedReferee || refereeNames[0] || '');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        if (selectedReferee) {
            const foundRef = refereeNames.find(name =>
                name.trim().toLowerCase() === selectedReferee.trim().toLowerCase()
            );
            if (foundRef) setSelectedRef(foundRef);
            if (onClearSelectedRef) onClearSelectedRef();
        }
    }, [selectedReferee, refereeNames, onClearSelectedRef]);

    if (refereeNames.length === 0) {
        return (
            <div style={{ padding: '3rem', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
                <Gavel size={48} color="#a78bfa" style={{ margin: '0 auto 1rem' }} />
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Informe de Árbitro</h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    No se han encontrado datos de árbitros. Asegúrate de haber hecho un scrape completo con actas.
                </p>
            </div>
        );
    }

    const ref = refereeReports[selectedRef] || {};
    if (!ref.matches || ref.matches === 0) {
        return (
            <div style={{ padding: '3rem', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
                <Gavel size={48} color="#a78bfa" style={{ margin: '0 auto 1rem' }} />
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Sin datos para {selectedRef}</h2>
                <p style={{ color: 'var(--text-muted)' }}>Este árbitro no tiene partidos registrados.</p>
            </div>
        );
    }

    const matchHistory: any[] = ref.match_history ?? [];
    const ourHistory: any[] = ref.our_history ?? [];

    // Derived values (all rounded)
    const yellowsPerMatch = ref.yellows_per_match ?? 0;
    const awayCardPct = ref.away_player_card_pct ?? 0;
    const secondHalfPct = ref.second_half_card_pct ?? 0;
    const firstHalfPct = Math.round(100 - secondHalfPct);
    const secondHalfPctRounded = Math.round(secondHalfPct);
    const expulsionPct = ref.expulsion_pct ?? 0;
    const homeWinPct = ref.home_win_pct ?? (ref.matches > 0 ? Math.round(ref.home_wins / ref.matches * 100) : 0);
    const staffCardsPerMatch = ref.staff_cards_per_match ?? 0;
    const staffCardMatchPct = ref.staff_card_match_pct ?? 0;
    const totalStaffCards = (ref.total_staff_yellows ?? 0) + (ref.total_staff_reds ?? 0);

    // Generate insights
    const insights: { text: string; color: string; icon: string }[] = [];

    if (yellowsPerMatch >= 5) {
        insights.push({ text: `Tarjetero: ${fmt(yellowsPerMatch)} amarillas/partido de media.`, color: '#f59e0b', icon: '⚠' });
    } else if (yellowsPerMatch <= 2.5) {
        insights.push({ text: `Permisivo: solo ${fmt(yellowsPerMatch)} amarillas/partido.`, color: '#10b981', icon: '✅' });
    }

    if (awayCardPct >= 60) {
        insights.push({ text: `Sesgo local: ${Math.round(awayCardPct)}% de tarjetas al visitante.`, color: '#f59e0b', icon: '🏠' });
    } else if (awayCardPct <= 40) {
        insights.push({ text: `Sesgo visitante: solo ${Math.round(awayCardPct)}% de tarjetas al visitante.`, color: 'var(--accent-cyan)', icon: '✈' });
    }

    if (expulsionPct >= 30) {
        insights.push({ text: `Alto riesgo de roja: expulsión en ${Math.round(expulsionPct)}% de partidos.`, color: '#ef4444', icon: '🟥' });
    }

    if (secondHalfPct >= 65) {
        insights.push({ text: `Pita más en 2ª parte: ${secondHalfPctRounded}% de tarjetas tras min 45.`, color: '#a78bfa', icon: '⏱' });
    } else if (secondHalfPct <= 35) {
        insights.push({ text: `Más estricto en 1ª parte: solo ${secondHalfPctRounded}% en 2ª parte.`, color: 'var(--accent-cyan)', icon: '⏱' });
    }

    if (homeWinPct >= 60) {
        insights.push({ text: `El local gana el ${Math.round(homeWinPct)}% de sus partidos.`, color: '#10b981', icon: '🏟' });
    }

    if (totalStaffCards > 0) {
        insights.push({ text: `Sanciona al cuerpo técnico en el ${Math.round(staffCardMatchPct)}% de partidos.`, color: '#f97316', icon: '👔' });
    }

    // Our record
    const ourWins = ourHistory.filter((m: any) => m.our_result === 'V').length;
    const ourDraws = ourHistory.filter((m: any) => m.our_result === 'E').length;
    const ourLosses = ourHistory.filter((m: any) => m.our_result === 'D').length;

    // Population N
    const popN = popStats.yellows_per_match?.count ?? 0;

    return (
        <div style={{ padding: '2rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                        INFORME DEL ÁRBITRO · DATOS FCF REALES · POBLACIÓN: {popN} ÁRBITROS
                    </span>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <Gavel size={24} color="#a78bfa" />
                        {selectedRef}
                        <span style={{ fontSize: '0.85rem', background: 'rgba(167,139,250,0.12)', color: '#a78bfa', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 600 }}>
                            {ref.matches} partidos
                        </span>
                    </h2>
                </div>
                {/* Referee selector */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', color: 'white', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}
                    >
                        Cambiar árbitro <ChevronDown size={16} />
                    </button>
                    {dropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.25rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem', overflow: 'hidden', zIndex: 100, maxHeight: '300px', overflowY: 'auto', minWidth: '250px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                            {refereeNames.map((name: string) => {
                                const r = refereeReports[name];
                                return (
                                    <div
                                        key={name}
                                        onClick={() => { setSelectedRef(name); setDropdownOpen(false); }}
                                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: name === selectedRef ? 'rgba(167,139,250,0.12)' : 'transparent', color: name === selectedRef ? '#a78bfa' : 'rgba(255,255,255,0.8)', display: 'flex', justifyContent: 'space-between' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = name === selectedRef ? 'rgba(167,139,250,0.12)' : 'transparent')}
                                    >
                                        <span>{name}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{r?.matches || 0} pts</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Row 1: Key Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <RefStatBox label="Partidos" value={`${ref.matches}`} sub="Esta temporada" color="#a78bfa" />
                <RefStatBox label="Amarillas/Part." value={fmt(yellowsPerMatch)} sub={`Total: ${ref.total_yellows}`} color={yellowsPerMatch >= 5 ? '#f59e0b' : '#10b981'} />
                <RefStatBox label="Rojas/Part." value={fmt(ref.reds_per_match ?? 0)} sub={`Total: ${ref.total_reds}`} color={(ref.reds_per_match ?? 0) >= 0.5 ? '#ef4444' : '#10b981'} />
                <RefStatBox label="% Tarj. Visitante" value={pct(awayCardPct)} sub={`${(ref.away_yellows ?? 0) + (ref.away_reds ?? 0)} de ${(ref.total_yellows ?? 0) + (ref.total_reds ?? 0)}`} color={awayCardPct >= 55 ? '#f59e0b' : 'var(--accent-cyan)'} />
                <RefStatBox label="Expulsiones" value={`${ref.matches_with_expulsion}/${ref.matches}`} sub={`${Math.round(expulsionPct)}% de partidos`} color={expulsionPct >= 30 ? '#ef4444' : '#10b981'} />
            </div>

            {/* Row 2: Insights + Card Distribution + Our History */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                {/* Insights */}
                <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(167,139,250,0.2)' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={18} color="#a78bfa" /> Perfil del Árbitro
                    </h3>
                    {insights.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {insights.map((ins, i) => (
                                <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', padding: '0.5rem 0.65rem', borderLeft: `3px solid ${ins.color}` }}>
                                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)' }}>{ins.icon} {ins.text}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Árbitro con perfil neutro — sin sesgos destacables.</p>
                    )}
                </div>

                {/* Card Distribution */}
                <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={18} color="#f59e0b" /> Distribución Tarjetas
                    </h3>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '0.5rem' }}>LOCAL vs VISITANTE</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.4rem', padding: '0.5rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>{(ref.home_yellows ?? 0) + (ref.home_reds ?? 0)}</p>
                            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Tarjetas al local</p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <span style={{ fontSize: '0.65rem' }}>🟨 {ref.home_yellows ?? 0}</span>
                                <span style={{ fontSize: '0.65rem' }}>🟥 {ref.home_reds ?? 0}</span>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.4rem', padding: '0.5rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>{(ref.away_yellows ?? 0) + (ref.away_reds ?? 0)}</p>
                            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Tarjetas al visitante</p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <span style={{ fontSize: '0.65rem' }}>🟨 {ref.away_yellows ?? 0}</span>
                                <span style={{ fontSize: '0.65rem' }}>🟥 {ref.away_reds ?? 0}</span>
                            </div>
                        </div>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '0.5rem' }}>TIMING</p>
                    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: '0.25rem' }}>
                        <div style={{ width: `${firstHalfPct}%`, background: 'var(--accent-cyan)', borderRadius: '4px 0 0 4px' }} />
                        <div style={{ width: `${secondHalfPctRounded}%`, background: '#a78bfa', borderRadius: '0 4px 4px 0' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        <span>1ª parte: {firstHalfPct}%</span>
                        <span>2ª parte: {secondHalfPctRounded}%</span>
                    </div>
                </div>

                {/* Our History */}
                <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Shield size={18} color="#10b981" /> Nuestro Historial
                    </h3>
                    {ourHistory.length > 0 ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: '0.75rem' }}>
                                <div>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{ourWins}</p>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Victorias</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{ourDraws}</p>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Empates</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{ourLosses}</p>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Derrotas</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                {ourHistory.map((m: any, i: number) => {
                                    const col = m.our_result === 'V' ? '#10b981' : m.our_result === 'E' ? '#f59e0b' : '#ef4444';
                                    return (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(0,0,0,0.15)', fontSize: '0.75rem' }}>
                                            <span style={{ color: 'var(--text-muted)', width: '20px', fontSize: '0.65rem' }}>J{m.jornada}</span>
                                            <span style={{ flex: 1, textAlign: 'right', fontSize: '0.75rem' }}>{m.home_team}</span>
                                            <span style={{ fontWeight: 700, padding: '0.1rem 0.35rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.2rem', fontSize: '0.75rem' }}>
                                                {m.home_score}-{m.away_score}
                                            </span>
                                            <span style={{ flex: 1, fontSize: '0.75rem' }}>{m.away_team}</span>
                                            <span style={{ width: 16, height: 16, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700, color: m.our_result === 'V' ? '#000' : '#fff' }}>
                                                {m.our_result}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Este árbitro no nos ha pitado todavía.</p>
                    )}
                </div>
            </div>

            {/* Row 3: Population Ranking + Staff Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                {/* Population percentile analysis */}
                <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart2 size={18} color="#6366f1" /> Análisis Poblacional
                    </h3>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Posición de este árbitro respecto a {popN} árbitros de 1ª y 2ª Catalana con ≥3 partidos. La línea blanca indica la mediana.
                    </p>
                    {popN > 0 ? (
                        <>
                            <PercentileBar
                                label="Amarillas / partido"
                                value={yellowsPerMatch}
                                displayValue={fmt(yellowsPerMatch)}
                                metric="yellows_per_match"
                                higherIsBad={true}
                                popStats={popStats}
                            />
                            <PercentileBar
                                label="% tarjetas al visitante"
                                value={awayCardPct}
                                displayValue={pct(awayCardPct)}
                                metric="away_player_card_pct"
                                higherIsBad={false}
                                popStats={popStats}
                            />
                            <PercentileBar
                                label="% tarjetas en 2ª parte"
                                value={secondHalfPct}
                                displayValue={pct(secondHalfPct)}
                                metric="second_half_card_pct"
                                higherIsBad={false}
                                popStats={popStats}
                            />
                            <PercentileBar
                                label="% partidos con expulsión"
                                value={expulsionPct}
                                displayValue={pct(expulsionPct)}
                                metric="expulsion_pct"
                                higherIsBad={true}
                                popStats={popStats}
                            />
                            <PercentileBar
                                label="% victorias del local"
                                value={homeWinPct}
                                displayValue={pct(homeWinPct)}
                                metric="home_win_pct"
                                higherIsBad={false}
                                popStats={popStats}
                            />
                            <PercentileBar
                                label="Tarjetas técnico / partido"
                                value={staffCardsPerMatch}
                                displayValue={fmt(staffCardsPerMatch)}
                                metric="staff_cards_per_match"
                                higherIsBad={true}
                                popStats={popStats}
                            />
                        </>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin datos poblacionales. Re-ejecuta el scraper.</p>
                    )}
                </div>

                {/* Staff Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(249,115,22,0.2)' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={18} color="#f97316" /> Cuerpo Técnico
                        </h3>
                        {totalStaffCards > 0 ? (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', padding: '0.6rem', textAlign: 'center' }}>
                                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f97316' }}>{totalStaffCards}</p>
                                        <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Total tarjetas</p>
                                    </div>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', padding: '0.6rem', textAlign: 'center' }}>
                                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>{ref.total_staff_yellows ?? 0}</p>
                                        <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Amarillas</p>
                                    </div>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', padding: '0.6rem', textAlign: 'center' }}>
                                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444' }}>{ref.total_staff_reds ?? 0}</p>
                                        <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Rojas</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Local / Visitante</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                        {(ref.home_staff_yellows ?? 0) + (ref.home_staff_reds ?? 0)}
                                        <span style={{ color: 'var(--text-muted)', margin: '0 0.3rem' }}>/</span>
                                        {(ref.away_staff_yellows ?? 0) + (ref.away_staff_reds ?? 0)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Partidos con tarjeta al técnico</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                        {ref.matches_with_staff_card ?? 0}/{ref.matches} ({Math.round(staffCardMatchPct)}%)
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Media por partido</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{fmt(staffCardsPerMatch)}</span>
                                </div>
                            </>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Este árbitro no ha amonestado al cuerpo técnico en ninguno de sus {ref.matches} partidos registrados.
                            </p>
                        )}
                    </div>

                    {/* Result bias */}
                    <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={18} color="#a78bfa" /> Resultados en sus Partidos
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                                <div>
                                    <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>{ref.home_wins ?? 0}</p>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Gana Local</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>{ref.draws ?? 0}</p>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Empates</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ef4444' }}>{ref.away_wins ?? 0}</p>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Gana Visit.</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.round(homeWinPct)}%`, background: '#10b981' }} />
                                <div style={{ width: `${ref.matches > 0 ? Math.round((ref.draws ?? 0) / ref.matches * 100) : 0}%`, background: '#f59e0b' }} />
                                <div style={{ width: `${ref.away_win_pct !== undefined ? Math.round(ref.away_win_pct) : (ref.matches > 0 ? Math.round((ref.away_wins ?? 0) / ref.matches * 100) : 0)}%`, background: '#ef4444' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                <span>{Math.round(homeWinPct)}% local</span>
                                <span>{ref.matches > 0 ? Math.round((ref.draws ?? 0) / ref.matches * 100) : 0}% empate</span>
                                <span>{ref.away_win_pct !== undefined ? Math.round(ref.away_win_pct) : (ref.matches > 0 ? Math.round((ref.away_wins ?? 0) / ref.matches * 100) : 0)}% visit.</span>
                            </div>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                            Basado en {ref.matches} partidos esta temporada.
                        </p>
                    </div>
                </div>
            </div>

            {/* Row 4: Match History */}
            <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={18} color="var(--accent-cyan)" /> Últimos Partidos Dirigidos
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {matchHistory.length > 0 ? [...matchHistory].reverse().map((m: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', background: 'rgba(0,0,0,0.15)', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-muted)', width: '20px', fontSize: '0.65rem' }}>J{m.jornada}</span>
                            <span style={{ flex: 1, textAlign: 'right' }}>{m.home_team}</span>
                            <span style={{ fontWeight: 700, padding: '0.1rem 0.4rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.2rem', margin: '0 0.4rem', minWidth: '36px', textAlign: 'center' }}>
                                {m.home_score}-{m.away_score}
                            </span>
                            <span style={{ flex: 1 }}>{m.away_team}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                                    <span style={{ width: 8, height: 11, background: '#f59e0b', borderRadius: 1, display: 'inline-block' }} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{m.yellows}</span>
                                </span>
                                {(m.reds ?? 0) > 0 && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                                        <span style={{ width: 8, height: 11, background: '#ef4444', borderRadius: 1, display: 'inline-block' }} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{m.reds}</span>
                                    </span>
                                )}
                                {(m.staff_cards ?? 0) > 0 && (
                                    <span style={{ fontSize: '0.65rem', color: '#f97316', fontWeight: 600 }}>👔{m.staff_cards}</span>
                                )}
                            </div>
                        </div>
                    )) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin historial de partidos.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Sub-components ─────────────────────────────────────

function RefStatBox({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
    return (
        <div className="glass" style={{ padding: '1rem', borderRadius: '0.75rem', borderTop: `2px solid ${color}`, textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>{label}</p>
            <p style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.5px' }}>{value}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</p>
        </div>
    );
}
