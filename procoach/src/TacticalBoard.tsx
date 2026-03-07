import { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, Triangle, ArrowRight, Minus, Square, User, Play, Square as Stop, Camera, Pause, Film } from 'lucide-react';

type ItemType = 'playerA' | 'playerB' | 'ball' | 'cone' | 'minigoal' | 'pole' | 'mannequin';
type ToolMode = 'select' | 'playerA' | 'playerB' | 'ball' | 'cone' | 'arrow' | 'dashed' | 'zone' | 'minigoal' | 'pole' | 'mannequin';
type ZoomMode = 'full' | 'half' | 'penalty';
type AnimMode = 'idle' | 'recording' | 'playing';

interface BoardItem {
    id: string;
    type: ItemType;
    x: number;
    y: number;
    label?: string;
}

interface DrawnItem {
    id: string;
    type: 'arrow' | 'dashed' | 'zone';
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
}

interface Frame {
    items: BoardItem[];
    drawn: DrawnItem[];
}

// Viewport definitions: which portion of the field [0-100] is visible
const VIEWPORTS: Record<ZoomMode, { x: number; y: number; w: number; h: number }> = {
    full: { x: 0, y: 0, w: 100, h: 100 },
    half: { x: 0, y: 0, w: 52, h: 100 },   // left half + slight margin
    penalty: { x: 0, y: 26, w: 21, h: 48 },   // left penalty area
};

let playerACount = 1;
let playerBCount = 1;

export default function TacticalBoard({ onSaveExercise }: { onSaveExercise?: (data: { title: string, category: string }) => void }) {
    const [items, setItems] = useState<BoardItem[]>([]);
    const [drawnItems, setDrawnItems] = useState<DrawnItem[]>([]);
    const [currentDrawing, setCurrentDrawing] = useState<DrawnItem | null>(null);
    const boardRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<ToolMode>('select');
    const [zoomMode, setZoomMode] = useState<ZoomMode>('full');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [saveCategory, setSaveCategory] = useState('Táctico');

    // Animation state
    const [animMode, setAnimMode] = useState<AnimMode>('idle');
    const [frames, setFrames] = useState<Frame[]>([]);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [animSpeed, setAnimSpeed] = useState(1); // 0.5, 1, 2
    const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [displayedItems, setDisplayedItems] = useState<BoardItem[]>([]);
    const [isAnimPanelOpen, setIsAnimPanelOpen] = useState(false);

    useEffect(() => {
        if (items.length === 0) {
            playerACount = 1;
            playerBCount = 1;
            const teamA: BoardItem[] = [
                { id: 'a1', type: 'playerA', x: 8, y: 50, label: '1' },
                { id: 'a2', type: 'playerA', x: 20, y: 20, label: '2' },
                { id: 'a3', type: 'playerA', x: 17, y: 40, label: '4' },
                { id: 'a4', type: 'playerA', x: 17, y: 60, label: '5' },
                { id: 'a5', type: 'playerA', x: 20, y: 80, label: '3' },
                { id: 'a6', type: 'playerA', x: 33, y: 30, label: '8' },
                { id: 'a7', type: 'playerA', x: 30, y: 50, label: '6' },
                { id: 'a8', type: 'playerA', x: 33, y: 70, label: '10' },
                { id: 'a9', type: 'playerA', x: 42, y: 22, label: '7' },
                { id: 'a10', type: 'playerA', x: 44, y: 50, label: '9' },
                { id: 'a11', type: 'playerA', x: 42, y: 78, label: '11' },
            ];
            const teamB: BoardItem[] = [
                { id: 'b1', type: 'playerB', x: 92, y: 50, label: '1' },
                { id: 'b2', type: 'playerB', x: 80, y: 20, label: '2' },
                { id: 'b3', type: 'playerB', x: 83, y: 40, label: '4' },
                { id: 'b4', type: 'playerB', x: 83, y: 60, label: '5' },
                { id: 'b5', type: 'playerB', x: 80, y: 80, label: '3' },
                { id: 'b6', type: 'playerB', x: 68, y: 20, label: '7' },
                { id: 'b7', type: 'playerB', x: 70, y: 40, label: '8' },
                { id: 'b8', type: 'playerB', x: 70, y: 60, label: '6' },
                { id: 'b9', type: 'playerB', x: 68, y: 80, label: '11' },
                { id: 'b10', type: 'playerB', x: 57, y: 38, label: '9' },
                { id: 'b11', type: 'playerB', x: 57, y: 62, label: '10' },
            ];
            const ball: BoardItem = { id: 'ball1', type: 'ball', x: 50, y: 50 };
            const initialItems = [...teamA, ...teamB, ball];
            setItems(initialItems);
            setDisplayedItems(initialItems);
            playerACount = 12;
            playerBCount = 12;
        }
    }, []);

    // Keep displayedItems in sync with items when not playing
    useEffect(() => {
        if (animMode !== 'playing') {
            setDisplayedItems(items);
        }
    }, [items, animMode]);

    // Convert screen coordinates → field coordinates (accounting for viewport)
    const screenToField = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
        if (!boardRef.current) return { x: 0, y: 0 };
        const rect = boardRef.current.getBoundingClientRect();
        const vp = VIEWPORTS[zoomMode];
        // Percentage within the rendered viewport area
        const pctX = (clientX - rect.left) / rect.width;
        const pctY = (clientY - rect.top) / rect.height;
        // Map back to field coordinates
        return {
            x: vp.x + pctX * vp.w,
            y: vp.y + pctY * vp.h,
        };
    }, [zoomMode]);

    const handlePointerDownField = (e: React.PointerEvent) => {
        if (!boardRef.current) return;
        const { x, y } = screenToField(e.clientX, e.clientY);

        if (['playerA', 'playerB', 'ball', 'cone', 'mannequin', 'pole', 'minigoal'].includes(activeTool)) {
            let label: string | undefined;
            if (activeTool === 'playerA') label = String(playerACount++);
            else if (activeTool === 'playerB') label = String(playerBCount++);
            setItems(prev => [...prev, { id: crypto.randomUUID(), type: activeTool as ItemType, x, y, label }]);
        } else if (['arrow', 'dashed', 'zone'].includes(activeTool)) {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            setCurrentDrawing({
                id: crypto.randomUUID(),
                type: activeTool as 'arrow' | 'dashed' | 'zone',
                startX: x, startY: y, endX: x, endY: y,
                color: activeTool === 'zone' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255,255,255,0.85)'
            });
        }
    };

    const clearBoard = () => {
        setItems([]);
        setDrawnItems([]);
        setFrames([]);
        setCurrentFrame(0);
        setAnimMode('idle');
        playerACount = 1;
        playerBCount = 1;
    };

    const handlePointerDownItem = (id: string, e: React.PointerEvent) => {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        e.preventDefault();
        setDraggingId(id);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!boardRef.current) return;
        const { x, y } = screenToField(e.clientX, e.clientY);

        if (draggingId) {
            setItems(prev => prev.map(item =>
                item.id === draggingId
                    ? { ...item, x: Math.max(1, Math.min(99, x)), y: Math.max(2, Math.min(98, y)) }
                    : item
            ));
        } else if (currentDrawing) {
            setCurrentDrawing(prev => prev
                ? { ...prev, endX: Math.max(0, Math.min(100, x)), endY: Math.max(0, Math.min(100, y)) }
                : null
            );
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (draggingId) {
            setDraggingId(null);
        } else if (currentDrawing) {
            if (Math.abs(currentDrawing.endX - currentDrawing.startX) > 1 || Math.abs(currentDrawing.endY - currentDrawing.startY) > 1) {
                setDrawnItems(prev => [...prev, currentDrawing]);
            }
            setCurrentDrawing(null);
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        }
    };

    // ── Compute CSS transform for the field based on viewport ──
    const getFieldTransform = () => {
        const vp = VIEWPORTS[zoomMode];
        const scaleX = 100 / vp.w;
        const scaleY = 100 / vp.h;
        const scale = Math.min(scaleX, scaleY); // uniform scale
        const translateX = -(vp.x / 100) * scale * 100;
        const translateY = -(vp.y / 100) * scale * 100;
        return `scale(${scale}) translate(${translateX / scale}%, ${translateY / scale}%)`;
    };

    // ── Animation functions ──
    const handleStartRecording = () => {
        setAnimMode('recording');
        setFrames([]);
        setCurrentFrame(0);
        setIsAnimPanelOpen(true);
    };

    const handleStopRecording = () => {
        setAnimMode('idle');
    };

    const handleSaveFrame = () => {
        const newFrame: Frame = {
            items: items.map(it => ({ ...it })),
            drawn: drawnItems.map(d => ({ ...d })),
        };
        setFrames(prev => {
            const updated = [...prev, newFrame];
            setCurrentFrame(updated.length - 1);
            return updated;
        });
    };

    const stopPlay = useCallback(() => {
        if (animTimerRef.current) clearTimeout(animTimerRef.current);
        setAnimMode('idle');
        if (frames.length > 0) {
            setItems(frames[frames.length - 1].items.map(it => ({ ...it })));
        }
    }, [frames]);

    const handlePlayAnimation = useCallback(() => {
        if (frames.length < 2) return;
        setAnimMode('playing');

        let frameIdx = 0;
        const FRAME_DURATION = 1200 / animSpeed; // ms per frame

        const playNext = () => {
            if (frameIdx >= frames.length) {
                setAnimMode('idle');
                return;
            }
            const frame = frames[frameIdx];
            setDisplayedItems(frame.items.map(it => ({ ...it })));
            setDrawnItems(frame.drawn.map(d => ({ ...d })));
            setCurrentFrame(frameIdx);
            frameIdx++;
            animTimerRef.current = setTimeout(playNext, FRAME_DURATION);
        };
        playNext();
    }, [frames, animSpeed]);

    const handleGoToFrame = (idx: number) => {
        if (frames[idx]) {
            setCurrentFrame(idx);
            setItems(frames[idx].items.map(it => ({ ...it })));
            setDrawnItems(frames[idx].drawn.map(d => ({ ...d })));
        }
    };

    useEffect(() => {
        return () => {
            if (animTimerRef.current) clearTimeout(animTimerRef.current);
        };
    }, []);

    const renderItems = animMode === 'playing' ? displayedItems : items;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', borderRadius: '1rem', overflow: 'hidden' }}>

            {/* ── View & Save Controls (top-right) ── */}
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', zIndex: 40, alignItems: 'center' }}>
                {onSaveExercise && (
                    <button
                        onClick={() => setShowSaveModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'linear-gradient(135deg, var(--accent-green), var(--accent-cyan))', border: 'none', color: 'black', padding: '0.25rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', transition: 'all 0.2s' }}
                    >
                        💾 Guardar como Ejercicio
                    </button>
                )}
                {/* Zoom mode selector */}
                <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.55)', padding: '0.25rem', borderRadius: '0.5rem', backdropFilter: 'blur(10px)' }}>
                    {(['full', 'half', 'penalty'] as ZoomMode[]).map(mode => (
                        <button key={mode} onClick={() => setZoomMode(mode)} style={{
                            background: zoomMode === mode ? 'rgba(255,255,255,0.2)' : 'transparent',
                            border: zoomMode === mode ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                            color: zoomMode === mode ? 'white' : 'rgba(255,255,255,0.6)',
                            padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                            {mode === 'full' ? '11v11' : mode === 'half' ? 'Medio' : 'Área'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Save Modal Overlay ── */}
            {showSaveModal && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '1rem', width: '300px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800 }}>Guardar Pizarra</h3>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Título del Ejercicio</label>
                        <input
                            value={saveTitle} onChange={e => setSaveTitle(e.target.value)}
                            placeholder="Ej: Salida de balón 4v3" autoFocus
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.6rem', borderRadius: '0.5rem', marginBottom: '1rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Categoría</label>
                        <select
                            value={saveCategory} onChange={e => setSaveCategory(e.target.value)}
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.6rem', borderRadius: '0.5rem', marginBottom: '1.5rem', outline: 'none', boxSizing: 'border-box' }}
                        >
                            {['Calentamiento', 'Posesión', 'Finalización', 'Táctico', 'Físico'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowSaveModal(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                            <button
                                onClick={() => { if (saveTitle && onSaveExercise) { onSaveExercise({ title: saveTitle, category: saveCategory }); setShowSaveModal(false); } }}
                                style={{ background: 'var(--gradient-primary)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 700 }}
                            >
                                Añadir a Batería
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── FIELD WRAPPER (clips the viewport) ── */}
            <div
                ref={wrapperRef}
                style={{
                    flex: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '0.75rem',
                    border: '3px solid rgba(255,255,255,0.08)',
                }}
            >
                {/* ── FIELD SCALED CONTAINER ── */}
                <div
                    ref={boardRef}
                    onPointerDown={handlePointerDownField}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        touchAction: 'none',
                        cursor: activeTool === 'select' ? 'default' : 'crosshair',
                        transformOrigin: 'top left',
                        transform: getFieldTransform(),
                        transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    {/* Grass base + stripe pattern */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #1a6b26 0%, #1e7a2d 50%, #1a6b26 100%)' }}></div>
                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 8.33%)', pointerEvents: 'none' }}></div>
                    {/* Mowed stripe effect */}
                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, transparent 0%, transparent 8.33%, rgba(0,0,0,0.04) 8.33%, rgba(0,0,0,0.04) 16.66%)', pointerEvents: 'none' }}></div>
                    {/* Vignette */}
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%)', pointerEvents: 'none' }}></div>

                    {/* ── Field Lines ── */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 1050 680" preserveAspectRatio="none">
                        <g stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" fill="none">
                            <rect x="30" y="30" width="990" height="620" rx="2" />
                            <line x1="525" y1="30" x2="525" y2="650" />
                            <circle cx="525" cy="340" r="91.5" />
                            <circle cx="525" cy="340" r="3" fill="rgba(255,255,255,0.6)" />
                            {/* Left penalty area */}
                            <rect x="30" y="138" width="165" height="404" />
                            {/* Left goal area */}
                            <rect x="30" y="228" width="55" height="224" />
                            <circle cx="143" cy="340" r="3" fill="rgba(255,255,255,0.6)" />
                            <path d="M 195 255 A 91.5 91.5 0 0 1 195 425" />
                            {/* Right penalty area */}
                            <rect x="855" y="138" width="165" height="404" />
                            {/* Right goal area */}
                            <rect x="965" y="228" width="55" height="224" />
                            <circle cx="907" cy="340" r="3" fill="rgba(255,255,255,0.6)" />
                            <path d="M 855 255 A 91.5 91.5 0 0 0 855 425" />
                            {/* Corner arcs */}
                            <path d="M 30 42 A 12 12 0 0 1 42 30" />
                            <path d="M 1008 30 A 12 12 0 0 1 1020 42" />
                            <path d="M 1020 638 A 12 12 0 0 1 1008 650" />
                            <path d="M 42 650 A 12 12 0 0 1 30 638" />
                            {/* Goals */}
                            <rect x="5" y="280" width="25" height="120" rx="4" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="4 2" />
                            <rect x="1020" y="280" width="25" height="120" rx="4" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="4 2" />
                        </g>
                    </svg>

                    {/* ── Drawn Items Overlay ── */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }} viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                <polygon points="0 0, 6 2, 0 4" fill="rgba(255,255,255,0.85)" />
                            </marker>
                        </defs>
                        {[...drawnItems, currentDrawing].filter(Boolean).map(item => {
                            if (!item) return null;
                            if (item.type === 'zone') {
                                const x = Math.min(item.startX, item.endX);
                                const y = Math.min(item.startY, item.endY);
                                const width = Math.abs(item.endX - item.startX);
                                const height = Math.abs(item.endY - item.startY);
                                return <rect key={item.id} x={x} y={y} width={width} height={height} fill={item.color} stroke="rgba(255,255,255,0.4)" strokeWidth="0.2" strokeDasharray="1 1" />;
                            }
                            const isDashed = item.type === 'dashed';
                            return (
                                <line
                                    key={item.id}
                                    x1={item.startX} y1={item.startY}
                                    x2={item.endX} y2={item.endY}
                                    stroke={item.color}
                                    strokeWidth="0.4"
                                    strokeDasharray={isDashed ? "1 1" : "none"}
                                    markerEnd={!isDashed ? "url(#arrowhead)" : undefined}
                                />
                            );
                        })}
                    </svg>

                    {/* ── Draggable Items ── */}
                    {renderItems.map(item => (
                        <DraggableElement
                            key={item.id}
                            item={item}
                            onPointerDown={(e) => handlePointerDownItem(item.id, e)}
                            dragging={draggingId === item.id}
                            animating={animMode === 'playing'}
                        />
                    ))}
                </div>

                {/* ── Animation badge overlay ── */}
                {animMode === 'recording' && (
                    <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(239,68,68,0.9)', color: 'white', padding: '0.3rem 0.7rem', borderRadius: '2rem', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', zIndex: 35, backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(239,68,68,0.4)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', display: 'inline-block', animation: 'pulse 1s ease-in-out infinite' }} />
                        GRABANDO · {frames.length} fotograma{frames.length !== 1 ? 's' : ''}
                    </div>
                )}
                {animMode === 'playing' && (
                    <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(16,185,129,0.9)', color: 'black', padding: '0.3rem 0.7rem', borderRadius: '2rem', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', zIndex: 35 }}>
                        <Play size={12} /> Fotograma {currentFrame + 1} / {frames.length}
                    </div>
                )}
            </div>

            {/* ── Animation Panel (above toolbar, visible when isAnimPanelOpen) ── */}
            {isAnimPanelOpen && (
                <div style={{
                    position: 'absolute',
                    bottom: '5.5rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(10,15,30,0.95)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '1rem',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    zIndex: 29,
                    minWidth: '340px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Film size={14} style={{ color: '#f59e0b' }} /> Panel de Animación
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Velocidad:</span>
                            {[0.5, 1, 2].map(s => (
                                <button key={s} onClick={() => setAnimSpeed(s)} style={{ background: animSpeed === s ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)', border: animSpeed === s ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent', color: animSpeed === s ? '#f59e0b' : 'rgba(255,255,255,0.5)', padding: '0.15rem 0.4rem', borderRadius: '0.3rem', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}>{s}×</button>
                            ))}
                        </div>
                    </div>

                    {/* Frame slider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: 24 }}>F{currentFrame + 1}</span>
                        <input
                            type="range" min={0} max={Math.max(0, frames.length - 1)} value={currentFrame}
                            onChange={e => handleGoToFrame(parseInt(e.target.value))}
                            disabled={frames.length === 0}
                            style={{ flex: 1, accentColor: '#f59e0b', cursor: frames.length === 0 ? 'not-allowed' : 'pointer' }}
                        />
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: 24 }}>{frames.length}</span>
                    </div>

                    {/* Controls row */}
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {animMode === 'idle' && (
                            <AnimBtn icon={<span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />} label="Grabar" onClick={handleStartRecording} color="#ef4444" />
                        )}
                        {animMode === 'recording' && (
                            <>
                                <AnimBtn icon={<Camera size={13} />} label="Guardar fotograma" onClick={handleSaveFrame} color="#f59e0b" />
                                <AnimBtn icon={<Stop size={13} />} label="Parar grabación" onClick={handleStopRecording} color="#94a3b8" />
                            </>
                        )}
                        {animMode !== 'playing' && frames.length >= 2 && (
                            <AnimBtn icon={<Play size={13} />} label="Reproducir" onClick={handlePlayAnimation} color="#10b981" />
                        )}
                        {animMode === 'playing' && (
                            <AnimBtn icon={<Pause size={13} />} label="Detener" onClick={stopPlay} color="#f59e0b" />
                        )}
                        {frames.length > 0 && animMode === 'idle' && (
                            <AnimBtn icon={<Trash2 size={13} />} label="Borrar fotogramas" onClick={() => { setFrames([]); setCurrentFrame(0); }} color="#ef4444" />
                        )}
                    </div>
                    {frames.length < 2 && animMode !== 'recording' && (
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                            Pulsa "Grabar", mueve jugadores y guarda al menos 2 fotogramas para reproducir.
                        </p>
                    )}
                </div>
            )}

            {/* ── FLOATING TOOLBAR ── */}
            <div style={{
                position: 'absolute',
                bottom: '1.25rem',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(10,15,30,0.92)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '0.5rem 0.75rem',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
                zIndex: 30
            }}>
                <ToolButton icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /></svg>} label="Mover" active={activeTool === 'select'} onClick={() => setActiveTool('select')} />

                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 0.25rem' }}></div>

                <ToolButton
                    icon={<div style={{ width: 16, height: 16, borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', border: '2px solid white', boxShadow: '0 0 8px rgba(239,68,68,0.4)' }}></div>}
                    label="Equipo A" active={activeTool === 'playerA'} onClick={() => setActiveTool(activeTool === 'playerA' ? 'select' : 'playerA')}
                />
                <ToolButton
                    icon={<div style={{ width: 16, height: 16, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: '2px solid white', boxShadow: '0 0 8px rgba(59,130,246,0.4)' }}></div>}
                    label="Equipo B" active={activeTool === 'playerB'} onClick={() => setActiveTool(activeTool === 'playerB' ? 'select' : 'playerB')}
                />
                <ToolButton
                    icon={<span style={{ fontSize: '0.9rem' }}>⚽</span>}
                    label="Balón" active={activeTool === 'ball'} onClick={() => setActiveTool(activeTool === 'ball' ? 'select' : 'ball')}
                />
                <ToolButton icon={<Triangle size={14} fill="#f97316" color="#f97316" />} label="Cono" active={activeTool === 'cone'} onClick={() => setActiveTool(activeTool === 'cone' ? 'select' : 'cone')} />
                <ToolButton icon={<User size={14} />} label="Muñeco" active={activeTool === 'mannequin'} onClick={() => setActiveTool(activeTool === 'mannequin' ? 'select' : 'mannequin')} />
                <ToolButton icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" /></svg>} label="Pica" active={activeTool === 'pole'} onClick={() => setActiveTool(activeTool === 'pole' ? 'select' : 'pole')} />
                <ToolButton icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" /><path d="M4 14h16" /></svg>} label="Mini Portería" active={activeTool === 'minigoal'} onClick={() => setActiveTool(activeTool === 'minigoal' ? 'select' : 'minigoal')} />

                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 0.25rem' }}></div>

                <ToolButton icon={<ArrowRight size={14} />} label="Flecha" active={activeTool === 'arrow'} onClick={() => setActiveTool(activeTool === 'arrow' ? 'select' : 'arrow')} />
                <ToolButton icon={<Minus size={14} strokeDasharray="4 4" />} label="Línea Discontinua" active={activeTool === 'dashed'} onClick={() => setActiveTool(activeTool === 'dashed' ? 'select' : 'dashed')} />
                <ToolButton icon={<Square size={13} />} label="Zona" active={activeTool === 'zone'} onClick={() => setActiveTool(activeTool === 'zone' ? 'select' : 'zone')} />

                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 0.25rem' }}></div>

                {/* Animate toggle */}
                <ToolButton
                    icon={<Film size={14} />}
                    label="Animar"
                    active={isAnimPanelOpen}
                    onClick={() => setIsAnimPanelOpen(v => !v)}
                    highlight
                />

                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 0.25rem' }}></div>

                <ToolButton icon={<Trash2 size={15} />} label="Borrar todo" active={false} onClick={clearBoard} danger />
            </div>

            {/* Pulse animation keyframe */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
        </div>
    );
}

/* ── Tool Button Component ── */
function ToolButton({ icon, label, active, onClick, danger, highlight }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; danger?: boolean; highlight?: boolean }) {
    return (
        <button
            onClick={onClick}
            title={label}
            style={{
                background: active ? (highlight ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)') : 'rgba(255,255,255,0.04)',
                border: active ? `1px solid ${highlight ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'}` : '1px solid transparent',
                width: '40px',
                height: '36px',
                borderRadius: '0.5rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                color: danger ? '#ef4444' : active ? (highlight ? '#f59e0b' : 'var(--accent-green)') : 'rgba(255,255,255,0.7)',
                padding: 0
            }}
        >
            {icon}
        </button>
    );
}

/* ── Animation Button ── */
function AnimBtn({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color: string }) {
    return (
        <button onClick={onClick} style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            background: `${color}18`, border: `1px solid ${color}35`,
            color, padding: '0.35rem 0.7rem', borderRadius: '0.5rem',
            fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.15s'
        }}>
            {icon} {label}
        </button>
    );
}

/* ── Draggable Element ── */
function DraggableElement({ item, onPointerDown, dragging, animating }: { item: BoardItem; onPointerDown: (e: React.PointerEvent) => void; dragging: boolean; animating?: boolean }) {
    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${item.x}%`,
        top: `${item.y}%`,
        transform: `translate(-50%, -50%) scale(${dragging ? 1.2 : 1})`,
        cursor: dragging ? 'grabbing' : animating ? 'default' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        zIndex: dragging ? 100 : 10,
        transition: dragging ? 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)' : animating ? 'left 0.9s ease-in-out, top 0.9s ease-in-out, transform 0.15s' : 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.15s ease',
        filter: dragging ? 'brightness(1.2)' : 'none',
    };

    if (item.type === 'playerA' || item.type === 'playerB') {
        const isA = item.type === 'playerA';
        const gradient = isA ? 'linear-gradient(145deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%)';
        const glow = isA ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)';
        return (
            <div onPointerDown={onPointerDown} style={baseStyle}>
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', width: '22px', height: '6px', background: 'rgba(0,0,0,0.35)', borderRadius: '50%', filter: 'blur(2px)' }}></div>
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: gradient,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '-0.5px',
                        border: '2.5px solid rgba(255,255,255,0.95)',
                        boxShadow: dragging
                            ? `0 0 20px ${glow}, 0 12px 24px rgba(0,0,0,0.5)`
                            : `0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.1)`,
                        fontFamily: "'Inter', sans-serif"
                    }}>
                        {item.label}
                    </div>
                </div>
            </div>
        );
    }

    if (item.type === 'ball') {
        return (
            <div onPointerDown={onPointerDown} style={baseStyle}>
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: '-3px', left: '50%', transform: 'translateX(-50%)', width: '18px', height: '5px', background: 'rgba(0,0,0,0.3)', borderRadius: '50%', filter: 'blur(2px)' }}></div>
                    <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #e2e8f0 60%, #94a3b8 100%)',
                        border: '1px solid rgba(0,0,0,0.15)',
                        boxShadow: dragging
                            ? '0 0 16px rgba(255,255,255,0.4), 0 8px 16px rgba(0,0,0,0.4)'
                            : '0 2px 6px rgba(0,0,0,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{ width: 8, height: 8, background: 'rgba(0,0,0,0.08)', clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (item.type === 'cone') {
        return (
            <div onPointerDown={onPointerDown} style={baseStyle}>
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: '-2px', left: '50%', transform: 'translateX(-50%)', width: '20px', height: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '50%', filter: 'blur(1px)' }}></div>
                    <svg width="22" height="24" viewBox="0 0 22 24" style={{ filter: dragging ? 'drop-shadow(0 6px 8px rgba(0,0,0,0.5))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
                        <ellipse cx="11" cy="22" rx="9" ry="2" fill="#c2410c" />
                        <polygon points="11,1 2,22 20,22" fill="url(#coneGrad)" stroke="#ea580c" strokeWidth="0.5" />
                        <defs>
                            <linearGradient id="coneGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#fb923c" />
                                <stop offset="100%" stopColor="#ea580c" />
                            </linearGradient>
                        </defs>
                        <ellipse cx="11" cy="1.5" rx="2" ry="1.5" fill="#fdba74" />
                    </svg>
                </div>
            </div>
        );
    }

    if (item.type === 'mannequin') {
        return (
            <div onPointerDown={onPointerDown} style={baseStyle}>
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: '-2px', left: '50%', transform: 'translateX(-50%)', width: '22px', height: '5px', background: 'rgba(0,0,0,0.4)', borderRadius: '50%', filter: 'blur(2px)' }}></div>
                    <svg width="24" height="32" viewBox="0 0 24 32" style={{ filter: dragging ? 'drop-shadow(0 6px 8px rgba(0,0,0,0.5))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                        <path d="M12 2C9.5 2 8 4 8 6C8 7.5 9 9 12 9C15 9 16 7.5 16 6C16 4 14.5 2 12 2Z" fill="#ef4444" />
                        <path d="M6 10C4 10 3 12 3 14V17C3 18 4 19 6 19H7V30C7 31 8 32 9 32H15C16 32 17 31 17 30V19H18C20 19 21 18 21 17V14C21 12 20 10 18 10H6Z" fill="#ef4444" />
                        <path d="M4.5 12C4.5 12 6 11 12 11C18 11 19.5 12 19.5 12" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
                    </svg>
                </div>
            </div>
        );
    }

    if (item.type === 'pole') {
        return (
            <div onPointerDown={onPointerDown} style={baseStyle}>
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: '-1px', left: '50%', transform: 'translateX(-50%)', width: '16px', height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', filter: 'blur(1px)' }}></div>
                    <svg width="16" height="36" viewBox="0 0 16 36" style={{ filter: dragging ? 'drop-shadow(0 6px 8px rgba(0,0,0,0.5))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                        <rect x="7" y="2" width="2" height="32" fill="#eab308" />
                        <rect x="4" y="34" width="8" height="2" fill="#333" rx="1" />
                    </svg>
                </div>
            </div>
        );
    }

    if (item.type === 'minigoal') {
        return (
            <div onPointerDown={onPointerDown} style={baseStyle}>
                <svg width="40" height="20" viewBox="0 0 40 20" style={{ filter: dragging ? 'drop-shadow(0 8px 12px rgba(0,0,0,0.6))' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}>
                    <path d="M4 4 L10 18 L30 18 L36 4 Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" strokeDasharray="2 2" />
                    <rect x="2" y="2" width="4" height="18" fill="#e2e8f0" rx="1" />
                    <rect x="34" y="2" width="4" height="18" fill="#e2e8f0" rx="1" />
                    <rect x="4" y="2" width="32" height="4" fill="#cbd5e1" />
                </svg>
            </div>
        );
    }

    return null;
}
