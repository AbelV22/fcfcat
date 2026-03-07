import React, { useState, useRef, useCallback } from 'react';
import { Users, Activity, ShieldCheck, Download, CalendarCheck, TrendingUp, Presentation, X } from 'lucide-react';
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
        doubleYellows: number;
        yellows: number;
        reds: number;
        avgRpe: number;
    };
    image?: string;
}

interface MatchResult {
    jornada: number;
    date: string;
    home_team: string;
    away_team: string;
    home_score?: number;
    away_score?: number;
}

// ─── FORMATION SYSTEM ─────────────────────────────────
type FormationKey = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1';
interface SlotDef { x: string; y: string; label: string; posGroup: Player['position']; }

const FORMATION_SLOTS: Record<FormationKey, Record<string, SlotDef>> = {
    '4-3-3': {
        GK:  { x: '50%', y: '87%', label: 'POR', posGroup: 'POR' },
        LB:  { x: '11%', y: '70%', label: 'LAT', posGroup: 'DEF' },
        CB1: { x: '34%', y: '74%', label: 'DC',  posGroup: 'DEF' },
        CB2: { x: '66%', y: '74%', label: 'DC',  posGroup: 'DEF' },
        RB:  { x: '89%', y: '70%', label: 'LAT', posGroup: 'DEF' },
        CM1: { x: '22%', y: '50%', label: 'MC',  posGroup: 'MED' },
        CM2: { x: '50%', y: '46%', label: 'MC',  posGroup: 'MED' },
        CM3: { x: '78%', y: '50%', label: 'MC',  posGroup: 'MED' },
        LW:  { x: '14%', y: '22%', label: 'EI',  posGroup: 'DEL' },
        ST:  { x: '50%', y: '16%', label: 'DC',  posGroup: 'DEL' },
        RW:  { x: '86%', y: '22%', label: 'ED',  posGroup: 'DEL' },
    },
    '4-4-2': {
        GK:  { x: '50%', y: '87%', label: 'POR', posGroup: 'POR' },
        LB:  { x: '11%', y: '70%', label: 'LAT', posGroup: 'DEF' },
        CB1: { x: '34%', y: '74%', label: 'DC',  posGroup: 'DEF' },
        CB2: { x: '66%', y: '74%', label: 'DC',  posGroup: 'DEF' },
        RB:  { x: '89%', y: '70%', label: 'LAT', posGroup: 'DEF' },
        LM:  { x: '10%', y: '48%', label: 'MC',  posGroup: 'MED' },
        CM1: { x: '35%', y: '51%', label: 'MC',  posGroup: 'MED' },
        CM2: { x: '65%', y: '51%', label: 'MC',  posGroup: 'MED' },
        RM:  { x: '90%', y: '48%', label: 'MC',  posGroup: 'MED' },
        ST1: { x: '33%', y: '18%', label: 'DC',  posGroup: 'DEL' },
        ST2: { x: '67%', y: '18%', label: 'DC',  posGroup: 'DEL' },
    },
    '3-5-2': {
        GK:  { x: '50%', y: '87%', label: 'POR', posGroup: 'POR' },
        CB1: { x: '22%', y: '72%', label: 'DC',  posGroup: 'DEF' },
        CB2: { x: '50%', y: '76%', label: 'DC',  posGroup: 'DEF' },
        CB3: { x: '78%', y: '72%', label: 'DC',  posGroup: 'DEF' },
        LWB: { x: '8%',  y: '52%', label: 'CAR', posGroup: 'MED' },
        CM1: { x: '28%', y: '48%', label: 'MC',  posGroup: 'MED' },
        CM2: { x: '50%', y: '44%', label: 'MC',  posGroup: 'MED' },
        CM3: { x: '72%', y: '48%', label: 'MC',  posGroup: 'MED' },
        RWB: { x: '92%', y: '52%', label: 'CAR', posGroup: 'MED' },
        ST1: { x: '33%', y: '18%', label: 'DC',  posGroup: 'DEL' },
        ST2: { x: '67%', y: '18%', label: 'DC',  posGroup: 'DEL' },
    },
    '4-2-3-1': {
        GK:  { x: '50%', y: '87%', label: 'POR', posGroup: 'POR' },
        LB:  { x: '11%', y: '70%', label: 'LAT', posGroup: 'DEF' },
        CB1: { x: '34%', y: '74%', label: 'DC',  posGroup: 'DEF' },
        CB2: { x: '66%', y: '74%', label: 'DC',  posGroup: 'DEF' },
        RB:  { x: '89%', y: '70%', label: 'LAT', posGroup: 'DEF' },
        DM1: { x: '35%', y: '56%', label: 'MCD', posGroup: 'MED' },
        DM2: { x: '65%', y: '56%', label: 'MCD', posGroup: 'MED' },
        LM:  { x: '14%', y: '38%', label: 'MCI', posGroup: 'MED' },
        AM:  { x: '50%', y: '34%', label: 'CAM', posGroup: 'MED' },
        RM:  { x: '86%', y: '38%', label: 'MCI', posGroup: 'MED' },
        ST:  { x: '50%', y: '16%', label: 'DC',  posGroup: 'DEL' },
    },
};

const inferPos = (dorsal: number): Player['position'] => {
    if (dorsal === 1 || dorsal === 13) return 'POR';
    if ((dorsal >= 2 && dorsal <= 5) || dorsal === 12 || dorsal === 14 || dorsal === 15) return 'DEF';
    if ((dorsal >= 9 && dorsal <= 11) || dorsal === 19 || dorsal === 20 || dorsal === 21) return 'DEL';
    if ((dorsal >= 6 && dorsal <= 8) || (dorsal >= 16 && dorsal <= 18)) return 'MED';
    return 'MED';
};

const shortName = (fullName: string): string => {
    const [sur, first = ''] = fullName.includes(',')
        ? fullName.split(',').map(s => s.trim())
        : [fullName, ''];
    return `${sur.split(' ')[0]}${first ? ' ' + first[0] + '.' : ''}`;
};

const SHAM_ROSTER: Player[] = [
    { id: '1', number: 1, name: 'David Valdés', position: 'POR', status: 'Disponible', stats: { matches: 20, minutes: 1800, goals: 0, doubleYellows: 0, yellows: 1, reds: 0, avgRpe: 5.5 } },
    { id: '2', number: 2, name: 'Sergio Ruiz', position: 'DEF', status: 'Sancionado', stats: { matches: 15, minutes: 1250, goals: 1, doubleYellows: 1, yellows: 6, reds: 1, avgRpe: 7.2 } },
    { id: '3', number: 3, name: 'Héctor Bellerín', position: 'DEF', status: 'Disponible', stats: { matches: 18, minutes: 1500, goals: 0, doubleYellows: 0, yellows: 3, reds: 0, avgRpe: 6.8 } },
    { id: '4', number: 4, name: 'Marc Bartra', position: 'DEF', status: 'Lesionado', stats: { matches: 10, minutes: 800, goals: 2, doubleYellows: 0, yellows: 2, reds: 0, avgRpe: 8.0 } },
    { id: '6', number: 6, name: 'Oriol Romeu', position: 'MED', status: 'Disponible', stats: { matches: 20, minutes: 1750, goals: 1, doubleYellows: 0, yellows: 5, reds: 0, avgRpe: 7.5 } },
    { id: '8', number: 8, name: 'Marc Garcia', position: 'MED', status: 'Disponible', stats: { matches: 19, minutes: 1600, goals: 4, doubleYellows: 0, yellows: 4, reds: 0, avgRpe: 7.1 } },
    { id: '10', number: 10, name: 'Aleix García', position: 'MED', status: 'Disponible', stats: { matches: 20, minutes: 1780, goals: 6, doubleYellows: 0, yellows: 2, reds: 0, avgRpe: 6.9 } },
    { id: '7', number: 7, name: 'Ferran Torres', position: 'DEL', status: 'Disponible', stats: { matches: 17, minutes: 1400, goals: 12, doubleYellows: 0, yellows: 1, reds: 0, avgRpe: 7.8 } },
    { id: '9', number: 9, name: 'Gerard Moreno', position: 'DEL', status: 'Duda', stats: { matches: 12, minutes: 950, goals: 8, doubleYellows: 0, yellows: 0, reds: 0, avgRpe: 8.2 } },
];

// ─── JORNADA HISTORY HELPER ───────────────────────────
interface JornadaEvent {
    jornada: number;
    date: string;
    opponent: string;
    score: string;
    isHome: boolean;
    goals: { minute: string }[];
    yellows: { minute: string; is_double_yellow_dismissal?: boolean }[];
    reds: { minute: string }[];
}

function normName(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
}

function getPlayerJornadaHistory(playerName: string, teamName: string, actas: any[]): JornadaEvent[] {
    const teamKey = normName(teamName);
    const playerKey = normName(playerName);
    const events: JornadaEvent[] = [];

    for (const acta of actas) {
        const htKey = normName(acta.home_team || '');
        const atKey = normName(acta.away_team || '');

        // Check if our team played in this acta
        let side: 'home' | 'away' | null = null;
        if (htKey === teamKey || (teamKey.length > 5 && htKey.includes(teamKey.slice(0, 8)))) {
            side = 'home';
        } else if (atKey === teamKey || (teamKey.length > 5 && atKey.includes(teamKey.slice(0, 8)))) {
            side = 'away';
        }
        if (!side) continue;

        const goals = (acta.goals || []).filter((g: any) =>
            g.team === side && normName(g.player || '') === playerKey
        );
        const yellows = (acta.yellow_cards || []).filter((y: any) =>
            y.team === side && normName(y.player || '') === playerKey
        );
        const reds = (acta.red_cards || []).filter((r: any) =>
            r.team === side && normName(r.player || '') === playerKey
        );

        if (goals.length || yellows.length || reds.length) {
            events.push({
                jornada: acta.jornada,
                date: acta.date || '',
                opponent: side === 'home' ? (acta.away_team || '') : (acta.home_team || ''),
                score: `${acta.home_score ?? '?'}-${acta.away_score ?? '?'}`,
                isHome: side === 'home',
                goals,
                yellows,
                reds,
            });
        }
    }

    return events.sort((a, b) => a.jornada - b.jornada);
}

export default function TeamManagement({
    fcfPlayers = {},
    results = [],
    actas = [],
    teamName = '',
}: {
    fcfPlayers?: Record<string, any>;
    results?: MatchResult[];
    actas?: any[];
    teamName?: string;
}) {
    const [subTab, setSubTab] = useState<'roster' | 'attendance' | 'lineup'>('roster');
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const lineupRef = useRef<HTMLDivElement>(null);
    const [formation, setFormation] = useState<FormationKey>('4-3-3');
    const [lineupMap, setLineupMap] = useState<Record<string, Player | null>>({});
    const [bench, setBench] = useState<Player[]>([]);
    const [activeSlot, setActiveSlot] = useState<string | null>(null);

    const lastJornada = React.useMemo(() => {
        if (!results || results.length === 0) return 0;
        return Math.max(...results.map(r => r.jornada));
    }, [results]);

    // A player is suspended for the NEXT match if the card that triggered
    // the sanction was received in the last played jornada (lastJornada).
    // Yellow accumulation: every 5th accumulable yellow = 1-match suspension.
    // Red / double-yellow: 1-match suspension.
    const isSuspended = (data: any): boolean => {
        const yellowJornadas: number[] = data.yellow_card_jornadas || [];
        const redJornadas: number[] = data.red_card_jornadas || [];
        const doubleYellowJornadas: number[] = data.double_yellow_jornadas || [];

        // Every 5th yellow (index 4, 9, 14…) triggers a 1-match suspension
        for (let i = 4; i < yellowJornadas.length; i += 5) {
            if (yellowJornadas[i] === lastJornada) return true;
        }
        // Direct red: 1-match suspension
        if (redJornadas.some(j => j === lastJornada)) return true;
        // Double-yellow dismissal: 1-match suspension
        if (doubleYellowJornadas.some(j => j === lastJornada)) return true;

        return false;
    };

    const roster: Player[] = Object.keys(fcfPlayers).length > 0
        ? Object.entries(fcfPlayers).map(([name, data]: [string, any], i) => ({
            id: String(i + 1),
            number: data.dorsal || 0,
            name: name,
            position: inferPos(data.dorsal || 0),
            status: (isSuspended(data) ? 'Sancionado' : 'Disponible') as 'Sancionado' | 'Disponible',
            stats: {
                matches: data.appearances || 0,
                minutes: data.minutes_played || 0,
                goals: data.goals || 0,
                doubleYellows: data.double_yellows || 0,
                yellows: data.yellow_cards || 0,
                reds: data.red_cards || 0,
                avgRpe: parseFloat((6 + Math.random() * 2).toFixed(1))
            }
        })).sort((a, b) => b.stats.minutes - a.stats.minutes)
        : SHAM_ROSTER;

    // ── Lineup logic ──────────────────────────────────────
    const assignedIds = React.useMemo(() => new Set([
        ...Object.values(lineupMap).filter(Boolean).map(p => p!.id),
        ...bench.map(p => p.id),
    ]), [lineupMap, bench]);

    const poolPlayers = roster.filter(p =>
        p.status !== 'Lesionado' && p.status !== 'Sancionado' && !assignedIds.has(p.id)
    );

    const changeFormation = (f: FormationKey) => {
        setFormation(f); setLineupMap({}); setBench([]); setActiveSlot(null);
    };

    const handleSlotClick = (slotKey: string) => {
        if (lineupMap[slotKey]) {
            // Click occupied slot → remove player back to pool
            setLineupMap(prev => { const n = { ...prev }; delete n[slotKey]; return n; });
            setActiveSlot(null);
        } else {
            setActiveSlot(prev => prev === slotKey ? null : slotKey);
        }
    };

    const handlePoolPlayerClick = (player: Player) => {
        const slots = FORMATION_SLOTS[formation];
        if (activeSlot) {
            setLineupMap(prev => ({ ...prev, [activeSlot]: player }));
            // Auto-advance to next empty slot of same position group
            const pg = slots[activeSlot]?.posGroup;
            const next = Object.keys(slots).find(k => !lineupMap[k] && k !== activeSlot && slots[k].posGroup === pg)
                ?? Object.keys(slots).find(k => !lineupMap[k] && k !== activeSlot)
                ?? null;
            setActiveSlot(next);
        } else {
            // Auto-assign: first empty slot matching position, else any empty
            const target = Object.keys(slots).find(k => !lineupMap[k] && slots[k].posGroup === player.position)
                ?? Object.keys(slots).find(k => !lineupMap[k]);
            if (target) setLineupMap(prev => ({ ...prev, [target]: player }));
        }
    };

    const handleAddBench = (player: Player) => {
        if (bench.length < 9) setBench(prev => [...prev, player]);
    };

    const startingCount = Object.values(lineupMap).filter(Boolean).length;

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
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>GF</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>🟨🟨</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>🟨 / 🟥</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roster.map(p => (
                                            <tr key={p.id}
                                                onClick={() => setSelectedPlayer(prev => prev === p.name ? null : p.name)}
                                                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s', cursor: 'pointer', background: selectedPlayer === p.name ? 'rgba(6,182,212,0.08)' : 'transparent' }}
                                                onMouseEnter={e => { if (selectedPlayer !== p.name) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = selectedPlayer === p.name ? 'rgba(6,182,212,0.08)' : 'transparent'; }}>
                                                <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{p.number}</td>
                                                <td style={{ padding: '1rem', fontWeight: 600 }}>{p.name} {actas.length > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>↗</span>}</td>
                                                <td style={{ padding: '1rem' }}><PosBadge pos={p.position} /></td>
                                                <td style={{ padding: '1rem' }}><StatusBadge status={p.status} /></td>
                                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>{p.stats.minutes}'</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>{p.stats.goals}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>{p.stats.doubleYellows > 0 ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>{p.stats.doubleYellows}</span> : <span style={{ color: 'var(--text-muted)' }}>0</span>}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>{p.stats.yellows}</span> - <span style={{ color: '#ef4444', fontWeight: 700 }}>{p.stats.reds}</span>
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
                                            {roster.map((p, i) => (
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
                                            <span style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{roster.length - (roster.filter(p => p.status === 'Sancionado' || p.status === 'Lesionado').length)}</span>
                                            <span style={{ color: 'var(--text-muted)', marginBottom: '0.4rem', fontSize: '0.9rem' }}>/ {roster.length}</span>
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
                            {/* ── Header ── */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.3rem' }}>Alineación (Matchday)</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                                        {startingCount}/11 titulares · Banquillo: {bench.length}/9
                                        {activeSlot && <span style={{ color: 'var(--accent-cyan)', marginLeft: '0.75rem' }}>
                                            ← Selecciona un jugador para <strong>{FORMATION_SLOTS[formation][activeSlot]?.label}</strong>
                                        </span>}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {/* Formation selector */}
                                    <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        {(['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'] as FormationKey[]).map(f => (
                                            <button key={f} onClick={() => changeFormation(f)} style={{ background: formation === f ? 'rgba(255,255,255,0.12)' : 'transparent', border: 'none', color: formation === f ? 'white' : 'var(--text-muted)', fontWeight: formation === f ? 700 : 500, padding: '0.35rem 0.75rem', borderRadius: '0.35rem', cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.15s' }}>{f}</button>
                                        ))}
                                    </div>
                                    <button onClick={handleExportLineup} style={{ background: 'var(--gradient-primary)', border: 'none', color: 'white', fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                                        <Download size={14} /> Exportar
                                    </button>
                                </div>
                            </div>

                            {/* ── Main grid: Pitch | Panel ── */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 270px', gap: '1.5rem', alignItems: 'start' }}>

                                {/* ── Left: Pitch + Bench ── */}
                                <div>
                                    {/* Pitch */}
                                    <div ref={lineupRef} style={{ position: 'relative', width: '100%', aspectRatio: '450 / 600', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', cursor: 'default' }}>
                                        {/* SVG pitch background */}
                                        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'450\' height=\'600\' viewBox=\'0 0 450 600\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'450\' height=\'600\' fill=\'%230e9f6e\'/%3E%3Crect x=\'2\' y=\'2\' width=\'446\' height=\'596\' fill=\'none\' stroke=\'rgba(255,255,255,0.35)\' stroke-width=\'3\'/%3E%3Cline x1=\'0\' y1=\'300\' x2=\'450\' y2=\'300\' stroke=\'rgba(255,255,255,0.35)\' stroke-width=\'2\'/%3E%3Ccircle cx=\'225\' cy=\'300\' r=\'45\' fill=\'none\' stroke=\'rgba(255,255,255,0.35)\' stroke-width=\'2\'/%3E%3Ccircle cx=\'225\' cy=\'300\' r=\'2\' fill=\'rgba(255,255,255,0.5)\'/%3E%3Crect x=\'100\' y=\'2\' width=\'250\' height=\'95\' fill=\'none\' stroke=\'rgba(255,255,255,0.35)\' stroke-width=\'2\'/%3E%3Crect x=\'155\' y=\'2\' width=\'140\' height=\'35\' fill=\'none\' stroke=\'rgba(255,255,255,0.35)\' stroke-width=\'2\'/%3E%3Cpath d=\'M170,97 A55,55 0 0,0 280,97\' fill=\'none\' stroke=\'rgba(255,255,255,0.35)\' stroke-width=\'2\'/%3E%3Ccircle cx=\'225\' cy=\'68\' r=\'2\' fill=\'rgba(255,255,255,0.4)\'/%3E%3Crect x=\'100\' y=\'503\' width=\'250\' height=\'95\' fill=\'none\' stroke=\'rgba(255,255,255,0.35)\' stroke-width=\'2\'/%3E%3Crect x=\'155\' y=\'563\' width=\'140\' height=\'35\' fill=\'none\' stroke=\'rgba(255,255,255,0.35)\' stroke-width=\'2\'/%3E%3Cpath d=\'M170,503 A55,55 0 0,1 280,503\' fill=\'none\' stroke=\'rgba(255,255,255,0.35)\' stroke-width=\'2\'/%3E%3Ccircle cx=\'225\' cy=\'532\' r=\'2\' fill=\'rgba(255,255,255,0.4)\'/%3E%3C/svg%3E")', backgroundSize: '100% 100%' }} />

                                        {/* Formation label */}
                                        <div style={{ position: 'absolute', top: '0.6rem', right: '0.8rem', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', borderRadius: '0.4rem', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{formation}</div>

                                        {/* Slots */}
                                        {Object.entries(FORMATION_SLOTS[formation]).map(([slotKey, slot]) => {
                                            const player = lineupMap[slotKey] ?? null;
                                            const isActive = activeSlot === slotKey;
                                            return (
                                                <div key={slotKey} onClick={() => handleSlotClick(slotKey)}
                                                    style={{ position: 'absolute', top: slot.y, left: slot.x, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', zIndex: 10, cursor: 'pointer' }}>
                                                    {player ? (
                                                        /* Filled slot */
                                                        <>
                                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'white', border: `3px solid ${isActive ? '#ef4444' : 'rgba(15,23,42,0.8)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', boxShadow: '0 3px 10px rgba(0,0,0,0.5)', transition: 'border-color 0.15s', position: 'relative' }}>
                                                                {player.number}
                                                                <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, background: '#ef4444', borderRadius: '50%', fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, opacity: 0, transition: 'opacity 0.15s' }} className="slot-remove">✕</span>
                                                            </div>
                                                            <div style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', padding: '0.12rem 0.45rem', borderRadius: '0.3rem', fontSize: '0.6rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {shortName(player.name)}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        /* Empty slot */
                                                        <>
                                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: isActive ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.08)', border: `2px dashed ${isActive ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: isActive ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.5)', boxShadow: isActive ? '0 0 12px rgba(6,182,212,0.4)' : 'none', transition: 'all 0.15s' }}>
                                                                {isActive ? '●' : '+'}
                                                            </div>
                                                            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: isActive ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.5)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                                                                {slot.label}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* ── Bench strip ── */}
                                    <div style={{ marginTop: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Banquillo</span>
                                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{bench.length}/9</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', minHeight: '36px' }}>
                                            {bench.map(p => (
                                                <div key={p.id} onClick={() => setBench(prev => prev.filter(b => b.id !== p.id))}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2rem', padding: '0.2rem 0.6rem 0.2rem 0.4rem', cursor: 'pointer', fontSize: '0.72rem', transition: 'background 0.15s' }}
                                                    title="Quitar del banquillo">
                                                    <span style={{ fontWeight: 800, color: 'var(--accent-cyan)', minWidth: '18px', textAlign: 'center' }}>{p.number}</span>
                                                    <span style={{ fontWeight: 600, color: 'white' }}>{shortName(p.name)}</span>
                                                    <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.6rem', marginLeft: '0.15rem' }}>✕</span>
                                                </div>
                                            ))}
                                            {bench.length === 0 && <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', alignSelf: 'center' }}>Añade jugadores desde el panel →</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Right: Player panel ── */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>

                                    {/* Hint when slot is active */}
                                    {activeSlot && (
                                        <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '0.6rem', padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                                            Asignando posición <strong>{FORMATION_SLOTS[formation][activeSlot]?.label}</strong> · Pulsa el slot para cancelar
                                        </div>
                                    )}

                                    {/* Available pool */}
                                    <div className="glass" style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ padding: '0.6rem 0.85rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Presentation size={14} color="var(--accent-cyan)" /> Disponibles</span>
                                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: '1rem' }}>{poolPlayers.length}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {poolPlayers.map(p => {
                                                const posColors: Record<string, string> = { POR: '#f59e0b', DEF: '#38bdf8', MED: '#10b981', DEL: '#ef4444' };
                                                const c = posColors[p.position] || '#10b981';
                                                return (
                                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.85rem', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                        {/* Pos dot */}
                                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} title={p.position} />
                                                        {/* Dorsal */}
                                                        <span style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '0.72rem', width: '18px', flexShrink: 0 }}>{p.number}</span>
                                                        {/* Name */}
                                                        <span style={{ fontWeight: 600, fontSize: '0.75rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName(p.name)}</span>
                                                        {/* Actions */}
                                                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                                            <button onClick={() => handlePoolPlayerClick(p)} title="Añadir al once"
                                                                style={{ background: activeSlot ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)', border: 'none', color: activeSlot ? '#000' : 'rgba(255,255,255,0.7)', padding: '0.2rem 0.45rem', borderRadius: '0.3rem', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700, transition: 'all 0.15s' }}>
                                                                XI
                                                            </button>
                                                            <button onClick={() => handleAddBench(p)} disabled={bench.length >= 9} title="Añadir al banquillo"
                                                                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: bench.length >= 9 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', padding: '0.2rem 0.45rem', borderRadius: '0.3rem', cursor: bench.length >= 9 ? 'not-allowed' : 'pointer', fontSize: '0.65rem', fontWeight: 700 }}>
                                                                BN
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {poolPlayers.length === 0 && (
                                                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {startingCount === 11 ? '✅ Once completo' : 'Sin jugadores disponibles'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bajas */}
                                    {roster.filter(p => p.status === 'Lesionado' || p.status === 'Sancionado').length > 0 && (
                                        <div className="glass" style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid rgba(239,68,68,0.15)', opacity: 0.8 }}>
                                            <div style={{ padding: '0.6rem 0.85rem', borderBottom: '1px solid rgba(239,68,68,0.1)', fontSize: '0.78rem', fontWeight: 700, color: '#ef4444' }}>
                                                Bajas · {roster.filter(p => p.status === 'Lesionado' || p.status === 'Sancionado').length}
                                            </div>
                                            {roster.filter(p => p.status === 'Lesionado' || p.status === 'Sancionado').map(p => (
                                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.85rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <span style={{ fontWeight: 800, color: 'rgba(239,68,68,0.6)', fontSize: '0.72rem', width: '18px' }}>{p.number}</span>
                                                    <span style={{ flex: 1, fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName(p.name)}</span>
                                                    <span style={{ fontSize: '0.6rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.1rem 0.35rem', borderRadius: '0.2rem', flexShrink: 0 }}>{p.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* ── Player Jornada Drawer ── */}
            {selectedPlayer && actas.length > 0 && (() => {
                const pData = fcfPlayers[selectedPlayer] || {};
                const history = getPlayerJornadaHistory(selectedPlayer, teamName, actas);
                const posColors: Record<string, string> = { POR: '#f59e0b', DEF: '#38bdf8', MED: '#10b981', DEL: '#ef4444' };
                const pos = inferPos(pData.dorsal || 0);
                return (
                    <div style={{
                        position: 'fixed', right: 0, top: '65px', bottom: 0, width: '420px', zIndex: 200,
                        background: 'rgba(10,14,26,0.97)', backdropFilter: 'blur(16px)',
                        borderLeft: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
                        animation: 'slideInRight 0.2s ease',
                    }}>
                        {/* Header */}
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: `rgba(${pos === 'POR' ? '245,158,11' : pos === 'DEF' ? '56,189,248' : pos === 'MED' ? '16,185,129' : '239,68,68'},0.15)`, border: `2px solid ${posColors[pos]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', color: posColors[pos] }}>
                                {pData.dorsal || '?'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPlayer}</div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    <span style={{ fontSize: '0.7rem', background: `rgba(${pos === 'POR' ? '245,158,11' : pos === 'DEF' ? '56,189,248' : pos === 'MED' ? '16,185,129' : '239,68,68'},0.15)`, color: posColors[pos], padding: '0.1rem 0.45rem', borderRadius: '1rem', fontWeight: 700 }}>{pos}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{pData.appearances || 0} partidos · {pData.minutes_played || 0}'</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedPlayer(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: '0.4rem', padding: '0.3rem 0.5rem', cursor: 'pointer' }}>
                                <X size={14} />
                            </button>
                        </div>

                        {/* Stats strip */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                            {[
                                { label: 'Goles', value: pData.goals || 0, color: '#10b981' },
                                { label: 'Amarillas', value: pData.yellow_cards || 0, color: '#f59e0b' },
                                { label: '🟨🟨', value: pData.double_yellows || 0, color: '#f59e0b' },
                                { label: 'Rojas', value: pData.red_cards || 0, color: '#ef4444' },
                            ].map(s => (
                                <div key={s.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', padding: '0.6rem 0.3rem' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.value > 0 ? s.color : 'rgba(255,255,255,0.2)' }}>{s.value}</div>
                                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Jornada history */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                                Historial por Jornada
                            </div>

                            {history.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    Sin eventos registrados en las actas
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {history.map(ev => (
                                        <div key={ev.jornada} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.6rem', padding: '0.75rem 1rem' }}>
                                            {/* Row 1: Jornada + Date + Opponent */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <span style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', fontWeight: 800, fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '0.3rem', flexShrink: 0 }}>
                                                    J{ev.jornada}
                                                </span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{ev.date}</span>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {ev.isHome ? 'vs' : '@'} {ev.opponent.split(',')[0]}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                                                    {ev.score}
                                                </span>
                                            </div>
                                            {/* Row 2: Events */}
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                {ev.goals.map((g, i) => (
                                                    <span key={`g${i}`} style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '1rem', padding: '0.15rem 0.55rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                                        ⚽ {g.minute}'
                                                    </span>
                                                ))}
                                                {ev.yellows.map((y, i) => (
                                                    <span key={`y${i}`} style={{ background: y.is_double_yellow_dismissal ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: y.is_double_yellow_dismissal ? '#ef4444' : '#f59e0b', border: `1px solid ${y.is_double_yellow_dismissal ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: '1rem', padding: '0.15rem 0.55rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                                        {y.is_double_yellow_dismissal ? '🟨🟨' : '🟨'} {y.minute}'
                                                    </span>
                                                ))}
                                                {ev.reds.map((r, i) => (
                                                    <span key={`r${i}`} style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '1rem', padding: '0.15rem 0.55rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                                        🟥 {r.minute}'
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
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

