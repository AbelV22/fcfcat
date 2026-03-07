import { useState, useEffect, useCallback } from 'react';
import fieldsDB from './data/fields_database.json';
import {
    Download, Upload, CheckCircle, AlertCircle,
    Search, Ruler, MapPin
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────
interface TeamField {
    name: string;
    slug: string;
    group: string;
    position: number;
    fcf_venue: string | null;
    city: string | null;
    length_m: number | null;
    width_m: number | null;
    surface: string | null;
    confirmed: boolean;
}

interface FieldsData {
    competition: string;
    season: string;
    groups: Record<string, { teams: TeamField[] }>;
    last_updated: string;
}

const STORAGE_KEY = 'fcf_fields_dimensions';

// ─── Helpers ──────────────────────────────────────────
function parseVenueParts(fcf_venue: string | null): { name: string; address: string } {
    if (!fcf_venue) return { name: '—', address: '' };
    const parts = fcf_venue.split('  ');
    return {
        name: parts[0]?.trim() || fcf_venue,
        address: parts.slice(1).join(', ').trim(),
    };
}

function extractCity(fcf_venue: string | null): string {
    if (!fcf_venue) return '—';
    const parts = fcf_venue.split(',');
    return parts[parts.length - 1]?.trim() || '—';
}

// ─── Main Component ───────────────────────────────────
export default function FieldsManager() {
    const [data, setData] = useState<FieldsData>(fieldsDB as any);
    const [activeGroup, setActiveGroup] = useState<string>('');
    const [search, setSearch] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [tempValue, setTempValue] = useState('');

    // Load saved dimensions from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const dims: Record<string, { length_m: number | null; width_m: number | null; surface: string | null }> = JSON.parse(saved);
                setData(prev => {
                    const updated = { ...prev, groups: { ...prev.groups } };
                    for (const gk of Object.keys(updated.groups)) {
                        updated.groups[gk] = {
                            ...updated.groups[gk],
                            teams: updated.groups[gk].teams.map(t => {
                                const key = `${t.group}/${t.slug}`;
                                if (dims[key]) {
                                    return { ...t, ...dims[key], confirmed: dims[key].length_m != null && dims[key].width_m != null };
                                }
                                return t;
                            }),
                        };
                    }
                    return updated;
                });
            } catch { /* ignore */ }
        }
        // Set first available group
        const groups = Object.keys(fieldsDB.groups);
        if (groups.length > 0) setActiveGroup(groups[0]);
    }, []);

    // Save to localStorage
    const saveDimensions = useCallback((newData: FieldsData) => {
        const dims: Record<string, any> = {};
        for (const gk of Object.keys(newData.groups)) {
            for (const t of newData.groups[gk].teams) {
                if (t.length_m != null || t.width_m != null || t.surface) {
                    dims[`${t.group}/${t.slug}`] = {
                        length_m: t.length_m,
                        width_m: t.width_m,
                        surface: t.surface,
                    };
                }
            }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dims));
    }, []);

    const updateField = (group: string, slug: string, field: 'length_m' | 'width_m' | 'surface', value: number | string | null) => {
        setData(prev => {
            const updated = { ...prev, groups: { ...prev.groups } };
            updated.groups[group] = {
                ...updated.groups[group],
                teams: updated.groups[group].teams.map(t => {
                    if (t.slug === slug) {
                        const newT = { ...t, [field]: value };
                        newT.confirmed = newT.length_m != null && newT.width_m != null;
                        return newT;
                    }
                    return t;
                }),
            };
            saveDimensions(updated);
            return updated;
        });
    };

    const handleCellClick = (cellId: string, currentValue: number | null) => {
        setEditingCell(cellId);
        setTempValue(currentValue != null ? String(currentValue) : '');
    };

    const handleCellBlur = (group: string, slug: string, field: 'length_m' | 'width_m') => {
        const num = tempValue.trim() ? parseFloat(tempValue) : null;
        if (num !== null && (isNaN(num) || num < 10 || num > 150)) {
            setEditingCell(null);
            return;
        }
        updateField(group, slug, field, num);
        setEditingCell(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, group: string, slug: string, field: 'length_m' | 'width_m') => {
        if (e.key === 'Enter') handleCellBlur(group, slug, field);
        if (e.key === 'Escape') setEditingCell(null);
    };

    // Stats
    const allTeams = Object.values(data.groups).flatMap(g => g.teams);
    const totalTeams = allTeams.length;
    const withDimensions = allTeams.filter(t => t.length_m != null && t.width_m != null).length;
    const withVenue = allTeams.filter(t => t.fcf_venue).length;
    const pctComplete = totalTeams > 0 ? Math.round((withDimensions / totalTeams) * 100) : 0;

    // Filter
    const groups = Object.keys(data.groups);
    const searchLower = search.toLowerCase();

    const getFilteredTeams = (group: string): TeamField[] => {
        const teams = data.groups[group]?.teams || [];
        if (!search) return teams;
        return teams.filter(t =>
            t.name.toLowerCase().includes(searchLower) ||
            (t.fcf_venue && t.fcf_venue.toLowerCase().includes(searchLower))
        );
    };

    const displayGroups = showAll ? groups : (activeGroup ? [activeGroup] : groups.slice(0, 1));

    // Export
    const handleExport = () => {
        const exportData = { ...data, last_updated: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fields_database.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Import
    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const imported = JSON.parse(ev.target?.result as string);
                    if (imported.groups) {
                        setData(imported);
                        saveDimensions(imported);
                    }
                } catch { alert('Error al importar el archivo JSON'); }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    return (
        <div style={{ padding: '2rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Ruler size={28} color="var(--accent-green)" />
                        Campos de Segona Catalana
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {data.competition} · Temporada {data.season} · {groups.length} grupos · {totalTeams} equipos
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={handleImport} style={{ ...btnStyle, background: 'rgba(255,255,255,0.05)' }}>
                        <Upload size={16} /> Importar
                    </button>
                    <button onClick={handleExport} style={{ ...btnStyle, background: 'var(--gradient-primary)', color: '#000', fontWeight: 700 }}>
                        <Download size={16} /> Exportar JSON
                    </button>
                </div>
            </div>

            {/* ── Progress bar ── */}
            <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <div>
                            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-green)' }}>{withDimensions}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}> / {totalTeams} campos con dimensiones</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>{withVenue}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}> con nombre FCF</span>
                        </div>
                    </div>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: pctComplete === 100 ? 'var(--accent-green)' : 'var(--accent-cyan)' }}>
                        {pctComplete}%
                    </span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', borderRadius: '4px',
                        width: `${pctComplete}%`,
                        background: pctComplete === 100 ? 'var(--accent-green)' : 'linear-gradient(90deg, var(--accent-green), var(--accent-cyan))',
                        transition: 'width 0.5s ease',
                    }} />
                </div>
            </div>

            {/* ── Controls: Group selector + search ── */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {groups.map(g => {
                    const gTeams = data.groups[g]?.teams || [];
                    const gDone = gTeams.filter(t => t.length_m != null && t.width_m != null).length;
                    const isActive = activeGroup === g && !showAll;
                    return (
                        <button
                            key={g}
                            onClick={() => { setActiveGroup(g); setShowAll(false); }}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '2rem', cursor: 'pointer',
                                fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
                                background: isActive ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
                                color: isActive ? '#000' : gDone === gTeams.length && gTeams.length > 0 ? 'var(--accent-green)' : 'var(--text-muted)',
                                border: `1px solid ${isActive ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)'}`,
                            }}
                        >
                            {g.replace('grup-', 'G')} ({gDone}/{gTeams.length})
                        </button>
                    );
                })}
                <button
                    onClick={() => setShowAll(!showAll)}
                    style={{
                        padding: '0.5rem 1rem', borderRadius: '2rem', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 600,
                        background: showAll ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                        color: showAll ? '#000' : 'var(--text-muted)',
                        border: `1px solid ${showAll ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)'}`,
                    }}
                >
                    Todos
                </button>

                <div style={{ marginLeft: 'auto', position: 'relative', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '2rem', padding: '0.4rem 0.8rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar equipo o campo..."
                        style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', marginLeft: '0.4rem', fontSize: '0.8rem', width: '180px' }}
                    />
                </div>
            </div>

            {/* ── Tables ── */}
            {displayGroups.map(group => {
                const teams = getFilteredTeams(group);
                if (teams.length === 0) return null;

                return (
                    <div key={group} className="glass" style={{ borderRadius: '1rem', marginBottom: '1.25rem', overflow: 'hidden' }}>
                        {/* Group header */}
                        <div style={{
                            padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: 'linear-gradient(90deg, rgba(16,185,129,0.08), transparent)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <MapPin size={18} color="var(--accent-green)" />
                                {group.replace('grup-', 'Grup ')} — Segona Catalana
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {teams.filter(t => t.confirmed).length}/{teams.length} completados
                            </span>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                                        <th style={thStyle}>#</th>
                                        <th style={{ ...thStyle, textAlign: 'left', minWidth: '200px' }}>Equipo</th>
                                        <th style={{ ...thStyle, textAlign: 'left', minWidth: '250px' }}>Campo FCF</th>
                                        <th style={{ ...thStyle, textAlign: 'left', minWidth: '120px' }}>Ciudad</th>
                                        <th style={{ ...thStyle, textAlign: 'center', width: '90px' }}>Largo (m)</th>
                                        <th style={{ ...thStyle, textAlign: 'center', width: '90px' }}>Ancho (m)</th>
                                        <th style={{ ...thStyle, textAlign: 'center', width: '70px' }}>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teams.map(team => {
                                        const venue = parseVenueParts(team.fcf_venue);
                                        const city = extractCity(team.fcf_venue);
                                        const lengthId = `${team.group}/${team.slug}/length`;
                                        const widthId = `${team.group}/${team.slug}/width`;

                                        return (
                                            <tr key={team.slug} style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                background: team.confirmed ? 'rgba(16,185,129,0.03)' : 'transparent',
                                                transition: 'background 0.2s',
                                            }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = team.confirmed ? 'rgba(16,185,129,0.03)' : 'transparent')}
                                            >
                                                <td style={{ ...tdStyle, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>{team.position}</td>
                                                <td style={{ ...tdStyle, fontWeight: 600 }}>{team.name}</td>
                                                <td style={tdStyle}>
                                                    <div style={{ lineHeight: 1.4 }}>
                                                        <span style={{ color: team.fcf_venue ? 'rgba(255,255,255,0.9)' : 'var(--text-muted)' }}>
                                                            {venue.name}
                                                        </span>
                                                        {venue.address && (
                                                            <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                                {venue.address}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{city}</td>

                                                {/* Length input */}
                                                <td style={{ ...tdStyle, textAlign: 'center', padding: '0.3rem 0.5rem' }}>
                                                    {editingCell === lengthId ? (
                                                        <input
                                                            autoFocus
                                                            type="number"
                                                            value={tempValue}
                                                            onChange={e => setTempValue(e.target.value)}
                                                            onBlur={() => handleCellBlur(team.group, team.slug, 'length_m')}
                                                            onKeyDown={e => handleKeyDown(e, team.group, team.slug, 'length_m')}
                                                            style={inputStyle}
                                                            min={10} max={150} step={1}
                                                        />
                                                    ) : (
                                                        <div
                                                            onClick={() => handleCellClick(lengthId, team.length_m)}
                                                            style={{
                                                                ...clickableCell,
                                                                color: team.length_m != null ? 'white' : 'var(--text-muted)',
                                                                borderColor: team.length_m != null ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)',
                                                            }}
                                                        >
                                                            {team.length_m != null ? team.length_m : '—'}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Width input */}
                                                <td style={{ ...tdStyle, textAlign: 'center', padding: '0.3rem 0.5rem' }}>
                                                    {editingCell === widthId ? (
                                                        <input
                                                            autoFocus
                                                            type="number"
                                                            value={tempValue}
                                                            onChange={e => setTempValue(e.target.value)}
                                                            onBlur={() => handleCellBlur(team.group, team.slug, 'width_m')}
                                                            onKeyDown={e => handleKeyDown(e, team.group, team.slug, 'width_m')}
                                                            style={inputStyle}
                                                            min={10} max={120} step={1}
                                                        />
                                                    ) : (
                                                        <div
                                                            onClick={() => handleCellClick(widthId, team.width_m)}
                                                            style={{
                                                                ...clickableCell,
                                                                color: team.width_m != null ? 'white' : 'var(--text-muted)',
                                                                borderColor: team.width_m != null ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)',
                                                            }}
                                                        >
                                                            {team.width_m != null ? team.width_m : '—'}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                    {team.confirmed ? (
                                                        <CheckCircle size={18} color="var(--accent-green)" />
                                                    ) : (
                                                        <AlertCircle size={18} color="rgba(255,255,255,0.2)" />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            {/* ── Footer tip ── */}
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                💡 Haz clic en cualquier celda de "Largo" o "Ancho" para introducir las dimensiones.
                Los datos se guardan automáticamente en tu navegador.
                Usa "Exportar JSON" para guardar el archivo actualizado.
            </div>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────
const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.6rem 1.2rem', borderRadius: '0.5rem',
    border: '1px solid rgba(255,255,255,0.1)', color: 'white',
    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
    transition: 'all 0.2s',
};

const thStyle: React.CSSProperties = {
    padding: '0.75rem 0.75rem', fontWeight: 600, fontSize: '0.72rem',
    letterSpacing: '0.5px', textTransform: 'uppercase' as const,
};

const tdStyle: React.CSSProperties = {
    padding: '0.6rem 0.75rem',
};

const inputStyle: React.CSSProperties = {
    width: '70px', padding: '0.35rem 0.4rem', borderRadius: '0.35rem',
    border: '2px solid var(--accent-green)', background: 'rgba(0,0,0,0.4)',
    color: 'white', fontSize: '0.85rem', textAlign: 'center' as const,
    outline: 'none', fontWeight: 600,
};

const clickableCell: React.CSSProperties = {
    cursor: 'pointer', padding: '0.35rem 0.5rem', borderRadius: '0.35rem',
    border: '1px dashed rgba(255,255,255,0.1)', transition: 'all 0.2s',
    fontWeight: 600, fontSize: '0.85rem', minWidth: '50px',
};
