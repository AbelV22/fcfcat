import { useState, useRef } from 'react';
import TacticalBoard from './TacticalBoard';
import { Clock, Trash2, Save, GripVertical, Map, ListChecks, Download, ArrowRight } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/* ── Types ── */
interface Exercise {
    id: string;
    title: string;
    category: string;
    duration: number;
    color: string;
    description: string;
    intensity: 'baja' | 'media' | 'alta';
    players: string;
    icon: string;
}

/* ── Data ── */
const CATEGORIES = [
    { key: 'all', label: 'Todos' },
    { key: 'Calentamiento', label: '🔥 Calentamiento' },
    { key: 'Posesión', label: '🎯 Posesión' },
    { key: 'Finalización', label: '⚽ Finalización' },
    { key: 'Táctico', label: '🧠 Táctico' },
    { key: 'Físico', label: '💪 Físico' },
];

const DEFAULT_EXERCISES: Exercise[] = [
    { id: 'ex1', title: 'Rueda de Pases en Y', category: 'Calentamiento', duration: 10, color: '#10b981', description: 'Circulación de balón con desmarques en forma de Y y apoyo al pivote.', intensity: 'baja', players: '10-16', icon: '🔥' },
    { id: 'ex2', title: 'Rondo 4v2+1 Comodín', category: 'Posesión', duration: 15, color: '#0ea5e9', description: 'Posesión en espacio reducido con comodín exterior que genera superioridad.', intensity: 'media', players: '7-9', icon: '🎯' },
    { id: 'ex3', title: 'Ataque vs Defensa 3v2', category: 'Finalización', duration: 20, color: '#ef4444', description: 'Superioridad ofensiva con centros desde banda y finalización al primer toque.', intensity: 'alta', players: '8-12', icon: '⚽' },
    { id: 'ex4', title: 'Partido Modificado 7v7', category: 'Táctico', duration: 25, color: '#f59e0b', description: 'Partido con líneas obligatorias de pase y zonas restringidas para generar amplitud.', intensity: 'alta', players: '14-18', icon: '🧠' },
    { id: 'ex5', title: 'Circuito Físico Integrado', category: 'Físico', duration: 15, color: '#8b5cf6', description: 'Estaciones de fuerza con balón, sprints y cambios de dirección.', intensity: 'alta', players: '10-22', icon: '💪' },
    { id: 'ex6', title: 'Rondo 3v1 Dinámico', category: 'Calentamiento', duration: 10, color: '#10b981', description: 'Activación con cambio de defensor al perder el balón. Transiciones rápidas.', intensity: 'baja', players: '8-16', icon: '🔥' },
    { id: 'ex7', title: 'Posesión 7v7+3', category: 'Posesión', duration: 20, color: '#0ea5e9', description: 'Dominio de balón en espacio completo con 3 comodines y cambio de orientación.', intensity: 'media', players: '17-20', icon: '🎯' },
    { id: 'ex8', title: 'Centros y Remates', category: 'Finalización', duration: 15, color: '#ef4444', description: 'Ejercicio de combinación banda-centro con remate coordinado desde segunda línea.', intensity: 'media', players: '8-14', icon: '⚽' },
    { id: 'ex9', title: 'Transiciones 4v4', category: 'Táctico', duration: 20, color: '#f59e0b', description: 'Transición ataque-defensa instantánea tras pérdida. Pressing alto obligatorio.', intensity: 'alta', players: '8-12', icon: '🧠' },
    { id: 'ex10', title: 'Oleadas de Velocidad', category: 'Físico', duration: 12, color: '#8b5cf6', description: 'Sprint progresivo 20-30-40m con recuperación activa entre series.', intensity: 'alta', players: '10-22', icon: '💪' },
    { id: 'ex11', title: 'Movilidad Articular', category: 'Calentamiento', duration: 8, color: '#10b981', description: 'Rutina de movilidad dinámica: cadera, tobillo, hombros y columna.', intensity: 'baja', players: '10-22', icon: '🔥' },
    { id: 'ex12', title: 'Oleada Ofensiva Dirigida', category: 'Táctico', duration: 25, color: '#f59e0b', description: 'Ataque posicional por oleadas con movimientos de fijación y desmarque.', intensity: 'alta', players: '16-22', icon: '🧠' },
];

/* ── Component ── */
export default function TrainingPlanner() {
    const [subTab, setSubTab] = useState<'board' | 'planner' | 'week'>('board');
    const [session, setSession] = useState<Exercise[]>([]);
    const [exercisesLib, setExercisesLib] = useState<Exercise[]>(DEFAULT_EXERCISES);
    const [activeCategory, setActiveCategory] = useState('all');
    const [isExporting, setIsExporting] = useState(false);
    const sessionRef = useRef<HTMLDivElement>(null);
    const [weekPlan, setWeekPlan] = useState<Record<string, { type: 'match' | 'rest' | 'training', label?: string }>>({
        'Lunes': { type: 'rest' },
        'Martes': { type: 'training', label: 'Sesión Fuerza-Resistencia' },
        'Miércoles': { type: 'training', label: 'Sesión Técnico-Táctica' },
        'Jueves': { type: 'rest' },
        'Viernes': { type: 'training', label: 'Sesión Pre-partido / ABP' },
        'Sábado': { type: 'rest' },
        'Domingo': { type: 'match', label: 'Partido vs. CE Sabadell' }
    });
    const [rpe, setRpe] = useState<number>(0);
    const [sessionNotes, setSessionNotes] = useState('');

    const totalDuration = session.reduce((a, c) => a + c.duration, 0);
    const target = 90;
    const pct = Math.min((totalDuration / target) * 100, 100);
    const filtered = activeCategory === 'all' ? exercisesLib : exercisesLib.filter(e => e.category === activeCategory);

    const handleSaveBoardAsExercise = (data: { title: string, category: string }) => {
        const catIcons: Record<string, string> = { 'Calentamiento': '🔥', 'Posesión': '🎯', 'Finalización': '⚽', 'Táctico': '🧠', 'Físico': '💪' };
        const catColors: Record<string, string> = { 'Calentamiento': '#10b981', 'Posesión': '#0ea5e9', 'Finalización': '#ef4444', 'Táctico': '#f59e0b', 'Físico': '#8b5cf6' };

        const newEx: Exercise = {
            id: crypto.randomUUID(),
            title: data.title,
            category: data.category,
            duration: 15,
            color: catColors[data.category] || '#ffffff',
            description: 'Ejercicio creado desde la Pizarra Táctica de ProCoach.',
            intensity: 'media',
            players: '10-22',
            icon: catIcons[data.category] || '📋'
        };

        setExercisesLib(prev => [newEx, ...prev]);
        setSubTab('planner');
        setActiveCategory(data.category);
    };

    const addToSession = (ex: Exercise) => setSession(s => [...s, { ...ex, id: crypto.randomUUID() }]);
    const removeFromSession = (id: string) => setSession(s => s.filter(e => e.id !== id));

    const handleDragStart = (e: React.DragEvent, ex: Exercise) => {
        e.dataTransfer.setData('application/json', JSON.stringify(ex));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        try { addToSession(JSON.parse(e.dataTransfer.getData('application/json'))); } catch { }
    };

    const handleExportPDF = async () => {
        if (!sessionRef.current || session.length === 0) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(sessionRef.current, { scale: 2, backgroundColor: '#0f172a' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`procoach-sesion-${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (error) {
            console.error('Error exportando PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const intensityDot = (i: string) => i === 'alta' ? '🔴' : i === 'media' ? '🟡' : '🟢';

    return (
        <div style={{ height: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* ── Tab Bar ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 2rem', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.25)', borderRadius: '0.6rem', padding: '3px' }}>
                    <TabBtn active={subTab === 'board'} onClick={() => setSubTab('board')} icon={<Map size={15} />} label="Pizarra Táctica" />
                    <TabBtn active={subTab === 'planner'} onClick={() => setSubTab('planner')} icon={<ListChecks size={15} />} label="Planificar Sesión" badge={session.length > 0 ? String(session.length) : undefined} />
                    <TabBtn active={subTab === 'week'} onClick={() => setSubTab('week')} icon={<Clock size={15} />} label="Microciclo Semanal" />
                </div>
                {subTab === 'planner' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {session.length > 0 && (
                            <>
                                <button onClick={() => setSession([])} style={{ ...smallBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)' }}>
                                    <Trash2 size={13} /> Vaciar
                                </button>
                                <button onClick={handleExportPDF} disabled={isExporting} style={{ ...smallBtn, background: 'rgba(255,255,255,0.05)', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Download size={13} /> {isExporting ? 'Exportando...' : 'Exportar PDF'}
                                </button>
                            </>
                        )}
                        <button style={{ ...smallBtn, background: 'var(--gradient-primary)', border: 'none', color: 'white', fontWeight: 700, boxShadow: '0 2px 10px rgba(16,185,129,0.25)' }}>
                            <Save size={13} /> Guardar
                        </button>
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

                {/* ═══ TAB 1: Pizarra Táctica (full space) ═══ */}
                {subTab === 'board' && (
                    <div style={{ height: '100%', padding: '0.75rem 2rem 1rem' }}>
                        <TacticalBoard onSaveExercise={handleSaveBoardAsExercise} />
                    </div>
                )}

                {/* ═══ TAB 2: Planificar Sesión (2 columns) ═══ */}
                {subTab === 'planner' && (
                    <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 0, overflow: 'hidden' }}>

                        {/* ── Left: Exercise Library ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            {/* Category filters */}
                            <div style={{ display: 'flex', gap: '0.3rem', padding: '0.75rem 1.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.key}
                                        onClick={() => setActiveCategory(cat.key)}
                                        style={{
                                            background: activeCategory === cat.key ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                                            border: activeCategory === cat.key ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                            color: activeCategory === cat.key ? 'var(--accent-green)' : 'var(--text-muted)',
                                            padding: '0.3rem 0.7rem', borderRadius: '2rem', fontSize: '0.72rem',
                                            cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s', whiteSpace: 'nowrap'
                                        }}
                                    >{cat.label}</button>
                                ))}
                            </div>

                            {/* Exercise Grid */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                                    {filtered.map(ex => (
                                        <div
                                            key={ex.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, ex)}
                                            onClick={() => addToSession(ex)}
                                            className="exercise-card"
                                            style={{
                                                background: 'rgba(15,23,42,0.6)',
                                                padding: '0.85rem',
                                                borderRadius: '0.65rem',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                borderLeft: `3px solid ${ex.color}`,
                                                cursor: 'pointer',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {/* Ambient glow */}
                                            <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', background: `radial-gradient(ellipse at top right, ${ex.color}0a, transparent 70%)`, pointerEvents: 'none' }} />

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem', position: 'relative' }}>
                                                <p style={{ fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.25, paddingRight: '0.5rem' }}>{ex.title}</p>
                                                <span style={{ fontSize: '1.1rem', flexShrink: 0, opacity: 0.8 }}>{ex.icon}</span>
                                            </div>
                                            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.35, position: 'relative' }}>{ex.description}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                                                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.6rem', color: ex.color, background: `${ex.color}15`, padding: '0.1rem 0.4rem', borderRadius: '1rem', fontWeight: 700, border: `1px solid ${ex.color}25` }}>{ex.category}</span>
                                                    <span style={{ fontSize: '0.58rem', opacity: 0.7 }}>{intensityDot(ex.intensity)} {ex.intensity}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>👥{ex.players}</span>
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: ex.color }}>{ex.duration}'</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Right: Session Timeline ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                            {/* Progress header */}
                            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Clock size={16} color="#f59e0b" />
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Sesión</span>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{session.length} ejercicio{session.length !== 1 ? 's' : ''}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                    <span style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-1px', color: totalDuration > target ? '#ef4444' : 'white' }}>{totalDuration}'</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ {target} min objetivo</span>
                                </div>
                                <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', width: `${pct}%`, borderRadius: 3,
                                        background: totalDuration > target ? 'linear-gradient(90deg, #ef4444, #f97316)' : 'linear-gradient(90deg, var(--accent-green), var(--accent-cyan))',
                                        transition: 'width 0.3s ease',
                                        boxShadow: totalDuration > target ? '0 0 8px rgba(239,68,68,0.4)' : '0 0 8px rgba(16,185,129,0.3)'
                                    }} />
                                </div>
                                {/* Category breakdown */}
                                {totalDuration > 0 && (
                                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                        {['Calentamiento', 'Posesión', 'Finalización', 'Táctico', 'Físico'].map(cat => {
                                            const mins = session.filter(s => s.category === cat).reduce((a, c) => a + c.duration, 0);
                                            if (!mins) return null;
                                            const c = DEFAULT_EXERCISES.find(e => e.category === cat)?.color || '#888';
                                            return <span key={cat} style={{ fontSize: '0.58rem', fontWeight: 600, color: c, background: `${c}12`, padding: '0.1rem 0.35rem', borderRadius: '1rem' }}>{cat} {mins}'</span>;
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Timeline / Drop Zone */}
                            <div
                                ref={sessionRef}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column' }}
                            >
                                {session.length === 0 ? (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                                            <GripVertical size={20} color="rgba(255,255,255,0.12)" />
                                        </div>
                                        <p style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.2rem' }}>Sesión vacía</p>
                                        <p style={{ fontSize: '0.7rem', maxWidth: 200, lineHeight: 1.4 }}>Haz clic en un ejercicio o arrástralo hasta aquí</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        {session.map((ex, i) => {
                                            const cumEnd = session.slice(0, i + 1).reduce((a, c) => a + c.duration, 0);
                                            const cumStart = cumEnd - ex.duration;
                                            return (
                                                <div key={ex.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                                                    {/* Timeline node */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 26, flexShrink: 0 }}>
                                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${ex.color}20`, border: `2px solid ${ex.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800, color: ex.color, flexShrink: 0 }}>{i + 1}</div>
                                                        {i < session.length - 1 && <div style={{ width: 2, flex: 1, background: `linear-gradient(${ex.color}40, rgba(255,255,255,0.04))`, marginTop: 1 }} />}
                                                    </div>
                                                    {/* Card */}
                                                    <div style={{ flex: 1, background: `linear-gradient(135deg, ${ex.color}08, transparent)`, border: `1px solid ${ex.color}18`, borderRadius: '0.45rem', padding: '0.5rem 0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                                                        <div>
                                                            <p style={{ fontWeight: 700, fontSize: '0.78rem' }}>{ex.title}</p>
                                                            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{ex.category} · {cumStart}'-{cumEnd}'</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: ex.color }}>{ex.duration}'</span>
                                                            <button onClick={() => removeFromSession(ex.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 2, display: 'flex' }}><Trash2 size={12} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Post-Session Form: RPE & Notes */}
                                        <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>Notas Post-Sesión</span>
                                            </h4>

                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RPE (Esfuerzo Percibido)</span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: rpe > 7 ? '#ef4444' : rpe > 4 ? '#f59e0b' : '#10b981' }}>{rpe} / 10</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="10"
                                                    value={rpe}
                                                    onChange={e => setRpe(parseInt(e.target.value))}
                                                    style={{ width: '100%', accentColor: rpe > 7 ? '#ef4444' : rpe > 4 ? '#f59e0b' : '#10b981' }}
                                                />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                    <span>Muy Suave</span>
                                                    <span>Extremo</span>
                                                </div>
                                            </div>

                                            <textarea
                                                value={sessionNotes}
                                                onChange={e => setSessionNotes(e.target.value)}
                                                placeholder="Ej: Modificamos el último ejercicio porque el campo estaba pesado por la lluvia..."
                                                style={{ width: '100%', minHeight: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.75rem', borderRadius: '0.4rem', outline: 'none', resize: 'vertical', fontSize: '0.8rem', lineHeight: 1.4 }}
                                            />
                                        </div>

                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ TAB 3: Microciclo Semanal ═══ */}
                {subTab === 'week' && (
                    <div style={{ height: '100%', padding: '2rem', overflowY: 'auto' }}>
                        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Planificación Semanal</h2>
                                    <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>Microciclo actual: Semana 24 · Fase Competitiva</p>
                                </div>
                                <button style={{ ...smallBtn, background: 'var(--gradient-primary)', border: 'none', color: 'white', fontWeight: 700, padding: '0.6rem 1rem' }}>
                                    <Save size={15} /> Guardar Microciclo
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {Object.entries(weekPlan).map(([day, plan]) => (
                                    <div key={day} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: '1rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.8rem', padding: '1.25rem', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: day === 'Domingo' ? '#ef4444' : 'white' }}>{day}</div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <select
                                                value={plan.type}
                                                onChange={(e) => setWeekPlan(prev => ({ ...prev, [day]: { ...prev[day], type: e.target.value as any } }))}
                                                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', outline: 'none', width: '130px' }}
                                            >
                                                <option value="training">Entrenamiento</option>
                                                <option value="rest">Descanso</option>
                                                <option value="match">Partido</option>
                                            </select>

                                            {plan.type !== 'rest' && (
                                                <input
                                                    type="text"
                                                    value={plan.label || ''}
                                                    onChange={(e) => setWeekPlan(prev => ({ ...prev, [day]: { ...prev[day], label: e.target.value } }))}
                                                    placeholder={plan.type === 'match' ? 'Rival...' : 'Objetivo de la sesión...'}
                                                    style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px dashed rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem 0', outline: 'none', fontSize: '0.95rem' }}
                                                />
                                            )}
                                        </div>

                                        <div>
                                            {plan.type === 'training' && (
                                                <button style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', border: '1px solid rgba(16,185,129,0.2)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => setSubTab('planner')}>
                                                    Ver Sesión <ArrowRight size={13} />
                                                </button>
                                            )}
                                            {plan.type === 'match' && (
                                                <span style={{ display: 'inline-flex', padding: '0.4rem 0.8rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>Día de Partido</span>
                                            )}
                                            {plan.type === 'rest' && (
                                                <span style={{ display: 'inline-flex', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>Recuperación</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Sub-components ── */
function TabBtn({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: string }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 1rem', borderRadius: '0.45rem',
                background: active ? 'rgba(16,185,129,0.15)' : 'transparent',
                border: active ? '1px solid rgba(16,185,129,0.25)' : '1px solid transparent',
                color: active ? 'white' : 'var(--text-muted)',
                fontSize: '0.82rem', fontWeight: active ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.15s ease',
                boxShadow: active ? '0 2px 8px rgba(16,185,129,0.1)' : 'none'
            }}
        >
            <span style={{ color: active ? 'var(--accent-green)' : 'inherit' }}>{icon}</span>
            {label}
            {badge && <span style={{ background: 'var(--accent-green)', color: 'black', fontSize: '0.6rem', fontWeight: 800, padding: '0.05rem 0.35rem', borderRadius: '1rem', minWidth: 16, textAlign: 'center' }}>{badge}</span>}
        </button>
    );
}

const smallBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.4rem 0.75rem', borderRadius: '0.4rem',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'white', fontSize: '0.75rem', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s'
};
