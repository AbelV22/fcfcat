import React, { useState, useEffect } from 'react';
import {
  BarChart2, Calendar, Shield, Users, Video,
  Settings, Bell, Search, AlertTriangle,
  TrendingUp, Crosshair, Map, Award, Gavel, Clock, Target,
  UserCheck, Zap, Activity, Eye, ChevronLeft, ChevronRight,
  Database, Layout, Printer, Plus, Tag, ExternalLink, Trash2
} from 'lucide-react';
import './App.css';
import { useAuth } from './AuthContext';
import TrainingPlanner from './TrainingPlanner';
import TeamManagement from './TeamManagement';
import FCFSetup, { type FCFTeamData } from './FCFSetup';
import IntelligenceView from './IntelligenceView';
import RivalReport from './RivalReport';
import RivalPlayersTable from './RivalPlayersTable';
import RefereeReport from './RefereeReport';
import ScorersReport from './ScorersReport';
import CalendarView from './CalendarView';
import FieldsManager from './FieldsManager';
import TacticalBoard from './TacticalBoard';
import PrintReport from './PrintReport';

// ─── TYPES ────────────────────────────────────────────
interface NavItemProps { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: string; isSidebarOpen?: boolean }
interface StatCardProps { title: string; value: string; subtitle: string; trend: string; positive: boolean }
interface InsightItemProps { type: 'danger' | 'warning' | 'success' | 'info'; text: string }
interface ProgressBarProps { label: string; leftVal: string; rightVal: string; leftPct: number; rightPct: number; reverseColors?: boolean }
interface AlertItemProps { name: string; issue: string; time: string; isRed?: boolean; isYellow?: boolean }
interface MiniTableRowProps { pos: number; name: string; pts: number; gf: number; gc: number; highlight?: boolean; isOpponent?: boolean }
interface PlayerDotProps { x: string; y: string; num: string; color: string }

// ─── APP ──────────────────────────────────────────────
// ─── VIDEO STORAGE ────────────────────────────────────
interface VideoEntry { id: string; url: string; title: string; rival: string; jornada: string; tags: string[]; createdAt: string; }

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [fcfTeamData, setFcfTeamData] = useState<FCFTeamData | null>(null);
  const [showRivalPlayersModal, setShowRivalPlayersModal] = useState(false);
  const [selectedReferee, setSelectedReferee] = useState<string | null>(null);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const { signOut, user } = useAuth();
  const [videos, setVideos] = useState<VideoEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('procoach_videos') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('procoach_videos', JSON.stringify(videos));
  }, [videos]);

  const addVideo = (v: Omit<VideoEntry, 'id' | 'createdAt'>) => {
    setVideos(prev => [{ ...v, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...prev]);
  };
  const removeVideo = (id: string) => setVideos(prev => prev.filter(v => v.id !== id));

  if (!fcfTeamData) {
    return (
      <div className="app-container" style={{ backgroundColor: '#090f1a' }}>
        <FCFSetup onComplete={(data) => setFcfTeamData(data)} />
      </div>
    );
  }

  const standings = fcfTeamData.data?.standings ?? [];
  const intelligence = fcfTeamData.data?.team_intelligence ?? {};
  const ourStanding = standings.find((s: any) => s.name === fcfTeamData.teamName) || {};
  const played = ourStanding.played || 0;
  const pts = ourStanding.points || 0;
  const gf = ourStanding.goals_for || 0;
  const gc = ourStanding.goals_against || 0;
  const diff = gf - gc;
  const form: string[] = intelligence.form || [];
  const recentForm = form.slice(-5).join('-');
  const ptsPossible = form.slice(-5).length * 3;
  const ptsWon = form.slice(-5).reduce((acc: number, r: string) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);

  // Rival data
  const nextMatch = fcfTeamData.data?.next_match ?? null;
  const matchRival = nextMatch?.rival_name || fcfTeamData.data?.meta?.rival || "Próximo Rival";
  const rivalIntelligence = fcfTeamData.data?.rival_report ?? fcfTeamData.data?.rival_intelligence ?? {};
  const rivalPlayers = rivalIntelligence.players ?? {};

  return (
    <div className="app-container" style={{ flexDirection: 'row', backgroundColor: '#090f1a' }}>
      <div className="glow-bg"></div>
      <div className="glow-bg" style={{ top: 'auto', bottom: '-200px', left: '-100px', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, rgba(15,23,42,0) 70%)' }}></div>

      {/* ── Sidebar ── */}
      <aside style={{ width: isSidebarOpen ? '260px' : '80px', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', backgroundColor: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ padding: isSidebarOpen ? '2rem 1.5rem' : '2rem 0', display: 'flex', alignItems: 'center', justifyContent: isSidebarOpen ? 'flex-start' : 'center', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
          <Shield color="var(--accent-green)" size={isSidebarOpen ? 32 : 28} style={{ flexShrink: 0 }} />
          {isSidebarOpen && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', transition: 'opacity 0.2s' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>Pro<span style={{ color: 'var(--accent-green)' }}>Coach</span></h1>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '1px' }}>PREMIUM EDITION</span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ position: 'absolute', right: '-12px', top: '2.5rem', background: 'var(--accent-green)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 60, boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}
          >
            {isSidebarOpen ? <ChevronLeft size={16} color="black" /> : <ChevronRight size={16} color="black" />}
          </button>
        </div>
        <div style={{ padding: isSidebarOpen ? '1.5rem' : '1.5rem 0', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: isSidebarOpen ? 'stretch' : 'center' }}>
          {isSidebarOpen ? (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '1px', whiteSpace: 'nowrap' }}>MENÚ PRINCIPAL</p>
          ) : (
            <div style={{ height: '1.5rem', marginBottom: '0.5rem' }}></div>
          )}
          <NavItem icon={<BarChart2 size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} isSidebarOpen={isSidebarOpen} />
          <NavItem icon={<Crosshair size={20} />} label="Scouting Rival" active={activeTab === 'scouting'} onClick={() => setActiveTab('scouting')} badge="FCF" isSidebarOpen={isSidebarOpen} />
          <NavItem icon={<Users size={20} />} label="Mi Plantilla" active={activeTab === 'team'} onClick={() => setActiveTab('team')} isSidebarOpen={isSidebarOpen} />
          <NavItem icon={<Award size={20} />} label="Golejadors" active={activeTab === 'scorers'} onClick={() => setActiveTab('scorers')} isSidebarOpen={isSidebarOpen} />
          <NavItem icon={<Gavel size={20} />} label="Árbitro" active={activeTab === 'referee'} onClick={() => setActiveTab('referee')} badge="FCF" isSidebarOpen={isSidebarOpen} />
          <NavItem icon={<Layout size={20} />} label="Pizarra Táctica" active={activeTab === 'tactical'} onClick={() => setActiveTab('tactical')} isSidebarOpen={isSidebarOpen} />
          <NavItem icon={<Map size={20} />} label="Entrenamientos" active={activeTab === 'training'} onClick={() => setActiveTab('training')} isSidebarOpen={isSidebarOpen} />
          <NavItem icon={<Video size={20} />} label="Video Análisis" active={activeTab === 'video'} onClick={() => setActiveTab('video')} isSidebarOpen={isSidebarOpen} />
          <NavItem icon={<Calendar size={20} />} label="Calendario" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} isSidebarOpen={isSidebarOpen} />
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.5rem 0' }} />
          <NavItem icon={<Database size={20} />} label="FCF Intelligence" active={activeTab === 'fcf'} onClick={() => setActiveTab('fcf')} badge={fcfTeamData ? '✓' : 'NEW'} isSidebarOpen={isSidebarOpen} />
        </div>
        <div style={{ padding: isSidebarOpen ? '1.5rem' : '1.5rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}>
          <NavItem icon={<Settings size={20} />} label="Configuración" active={activeTab === 'fields'} onClick={() => setActiveTab('fields')} isSidebarOpen={isSidebarOpen} />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, height: '100vh', overflowY: 'auto', position: 'relative' }}>
        {/* Header */}
        <header style={{ padding: '1.25rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 40 }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Hola, Míster 👋</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{fcfTeamData.teamName} — {fcfTeamData.competitionName} · {fcfTeamData.group.replace('grup-', 'Grup ').replace('grup-unic', 'Únic')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {activeTab === 'dashboard' && (
              <button
                onClick={() => setShowPrintReport(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '0.5rem', padding: '0.5rem 0.9rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; }}
              >
                <Printer size={16} /> Informe Pre-Partido
              </button>
            )}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '2rem', padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Search size={18} color="var(--text-muted)" />
              <input placeholder="Buscar jugador, rival..." style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', marginLeft: '0.5rem', fontSize: '0.85rem', width: '180px' }} />
            </div>
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <Bell size={22} color="var(--text-muted)" />
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', width: '9px', height: '9px', borderRadius: '50%', border: '2px solid #0f172a' }}></span>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 10px rgba(16,185,129,0.3)', cursor: 'pointer' }}>
              {user?.email?.[0]?.toUpperCase() || 'M'}
            </div>
            <button
              onClick={signOut}
              style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, marginLeft: '0.5rem', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Salir
            </button>
          </div>
        </header>

        {/* ── Dynamic Content ── */}
        {activeTab === 'fcf' ? (
          <IntelligenceView
            teamData={fcfTeamData}
            onReset={() => setFcfTeamData(null)}
          />
        ) : activeTab === 'scouting' ? (
          <RivalReport teamData={fcfTeamData} />
        ) : activeTab === 'scorers' ? (
          <ScorersReport teamData={fcfTeamData} />
        ) : activeTab === 'calendar' ? (
          <CalendarView teamData={fcfTeamData} />
        ) : activeTab === 'referee' ? (
          <RefereeReport teamData={fcfTeamData} selectedReferee={selectedReferee} onClearSelectedRef={() => setSelectedReferee(null)} />
        ) : activeTab === 'tactical' ? (
          <TacticalBoard />
        ) : activeTab === 'training' ? (
          <TrainingPlanner />
        ) : activeTab === 'video' ? (
          <VideoAnalysis videos={videos} onAdd={addVideo} onRemove={removeVideo} teamData={fcfTeamData} />
        ) : activeTab === 'fields' ? (
          <FieldsManager />
        ) : activeTab === 'team' ? (
          <TeamManagement
            fcfPlayers={fcfTeamData.data?.team_intelligence?.players || {}}
            results={fcfTeamData.data?.matches || []}
            actas={fcfTeamData.data?.actas || []}
            teamName={fcfTeamData.data?.team_intelligence?.team_name || fcfTeamData.data?.meta?.team || ''}
          />
        ) : (
          <div style={{ padding: '2rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>

            {/* ── Row 1: Key Numbers ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <StatCard title="Tu Posición en Liga" value={`${ourStanding.position || '-'}º`} subtitle={`${pts} pts · ${played} PJ`} trend="Posición actual" positive />
              <StatCard title="Tus Goles F / C" value={`${gf} / ${gc}`} subtitle={`${diff > 0 ? '+' : ''}${diff} diferencia`} trend={`${played ? (gf / played).toFixed(1) : 0} GF / partido`} positive={diff >= 0} />
              <StatCard title="Tu Racha (Últ. 5)" value={recentForm || "-"} subtitle={`${ptsWon} de ${ptsPossible} pts posibles`} trend="Últimos 5 partidos" positive={ptsWon >= (ptsPossible / 2)} />
              <StatCard title="Tarjetas" value={`🟨 ${intelligence.total_yellows ?? 0} · 🟥 ${intelligence.total_reds ?? 0}`} subtitle="Tarjetas acumuladas" trend={`${played ? ((intelligence.total_yellows ?? 0) / played).toFixed(1) : 0} amarillas/partido`} positive={(intelligence.total_reds ?? 0) < 2} />
            </div>

            {/* ── Row 2: Main Scouting + Sidebar ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* ── MAIN: Next match scouting ── */}
              <div
                className="glass"
                style={{
                  borderRadius: '1rem',
                  overflow: 'hidden',
                  border: '1px solid rgba(6,182,212,0.3)',
                  cursor: Object.keys(rivalPlayers).length > 0 ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => Object.keys(rivalPlayers).length > 0 && setShowRivalPlayersModal(true)}
                onMouseEnter={e => {
                  if (Object.keys(rivalPlayers).length > 0) {
                    e.currentTarget.style.borderColor = 'rgba(6,182,212,0.6)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Header bar */}
                <div style={{ background: 'linear-gradient(90deg, rgba(6,182,212,0.1), transparent)', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '0.25rem', display: 'block' }}>
                      PRÓXIMO RIVAL · SCOUTING FCF {Object.keys(rivalPlayers).length > 0 && <span style={{ color: 'var(--accent-cyan)' }}>· Clic para ver plantilla</span>}
                    </span>
                    <h3 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {matchRival} {rivalIntelligence.standing?.position ? `(${rivalIntelligence.standing.position}º)` : ''}
                      {rivalIntelligence.standing?.position > 12 && <span style={{ fontSize: '0.8rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 600 }}>⚠ Necesita Puntos</span>}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{nextMatch?.date && nextMatch?.time ? `${nextMatch.date} ${nextMatch.time}` : 'Próximo Partido'}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{nextMatch?.referee || 'Árbitro por asignar'}</p>
                  </div>
                </div>

                {/* Content grid */}
                <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {/* Left: Probable lineup */}
                  <div>
                    <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <UserCheck size={16} /> ALINEACIÓN PROBABLE (por actas FCF)
                    </h4>
                    {/* Mini pitch */}
                    <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '0.5rem', position: 'relative', height: '200px', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '8%', bottom: '8%', left: '8%', right: '8%', border: '1.5px solid rgba(255,255,255,0.08)' }}></div>
                      <div style={{ position: 'absolute', top: '8%', bottom: '8%', left: '50%', width: '1.5px', background: 'rgba(255,255,255,0.08)' }}></div>
                      {/* Portero */}
                      <PlayerDot x="12%" y="50%" num="1" color="#f59e0b" />
                      {/* Defensa L4 */}
                      <PlayerDot x="30%" y="20%" num="2" color="#ef4444" />
                      <PlayerDot x="25%" y="40%" num="4" color="#ef4444" />
                      <PlayerDot x="25%" y="60%" num="5" color="#ef4444" />
                      <PlayerDot x="30%" y="80%" num="3" color="#ef4444" />
                      {/* Medio L3 */}
                      <PlayerDot x="50%" y="25%" num="8" color="#ef4444" />
                      <PlayerDot x="45%" y="50%" num="6" color="#ef4444" />
                      <PlayerDot x="50%" y="75%" num="10" color="#ef4444" />
                      {/* Delantera L3 */}
                      <PlayerDot x="75%" y="25%" num="7" color="#ef4444" />
                      <PlayerDot x="85%" y="50%" num="9" color="#ef4444" />
                      <PlayerDot x="75%" y="75%" num="11" color="#ef4444" />
                      <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.6)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Basado en 5 últimas actas</div>
                    </div>
                  </div>

                  {/* Right: Alertas + comparativa */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Zap size={16} /> ALERTAS CLAVE DEL RIVAL
                    </h4>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', listStyle: 'none', flex: 1 }}>
                      {rivalIntelligence.recent_results?.[0]?.result === 'V' && <InsightItem type="success" text={`Vienen de ganar (${rivalIntelligence.recent_results[0].home_score}-${rivalIntelligence.recent_results[0].away_score} vs ${rivalIntelligence.recent_results[0].home_team === matchRival ? rivalIntelligence.recent_results[0].away_team : rivalIntelligence.recent_results[0].home_team}).`} />}
                      {rivalIntelligence.goals_by_period?.["0-15"]?.conceded > 3 && <InsightItem type="warning" text={`Suelen encajar pronto: ${rivalIntelligence.goals_by_period["0-15"].conceded} goles en contra en los primeros 15 min.`} />}
                      {rivalIntelligence.top_scorers?.[0] && <InsightItem type="danger" text={`Peligro: ${rivalIntelligence.top_scorers[0].name} (${rivalIntelligence.top_scorers[0].goals} goles, ${rivalIntelligence.top_scorers[0].pct_of_total}% del equipo).`} />}
                      {rivalIntelligence.cards?.some((p: any) => p.apercibido) && <InsightItem type="info" text={`${rivalIntelligence.cards.find((p: any) => p.apercibido).name}: Apercibido de sanción.`} />}
                      {rivalIntelligence.standing?.goals_against > 30 && <InsightItem type="warning" text={`Defensa vulnerable: ${rivalIntelligence.standing.goals_against} goles encajados.`} />}
                    </ul>

                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Comparativa Directa (Tu Acadèmia vs {matchRival})</h4>
                      <ProgressBar label="Goles a Favor" leftVal={`${ourStanding.goals_for || 0}`} rightVal={`${rivalIntelligence.standing?.goals_for || 0}`} leftPct={ourStanding.goals_for > rivalIntelligence.standing?.goals_for ? 60 : 40} rightPct={ourStanding.goals_for > rivalIntelligence.standing?.goals_for ? 40 : 60} />
                      <div style={{ height: '0.5rem' }}></div>
                      <ProgressBar label="Goles en Contra" leftVal={`${ourStanding.goals_against || 0}`} rightVal={`${rivalIntelligence.standing?.goals_against || 0}`} leftPct={ourStanding.goals_against < rivalIntelligence.standing?.goals_against ? 45 : 55} rightPct={ourStanding.goals_against < rivalIntelligence.standing?.goals_against ? 55 : 45} reverseColors />
                      <div style={{ height: '0.5rem' }}></div>
                      <ProgressBar label="Puntos" leftVal={`${ourStanding.points || 0}`} rightVal={`${rivalIntelligence.standing?.points || 0}`} leftPct={ourStanding.points > rivalIntelligence.standing?.points ? 55 : 45} rightPct={ourStanding.points > rivalIntelligence.standing?.points ? 45 : 55} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SIDEBAR: Clasificación ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem' }}>Clasificación {fcfTeamData.group.replace('grup-', 'Grup ').replace('grup-unic', 'Únic')}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', cursor: 'pointer' }}>Ver toda</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', flex: 1 }}>
                  <thead><tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                    <th style={{ paddingBottom: '0.5rem', fontWeight: 500, width: '25px' }}>Pos</th>
                    <th style={{ paddingBottom: '0.5rem', fontWeight: 500 }}>Equipo</th>
                    <th style={{ paddingBottom: '0.5rem', fontWeight: 500, textAlign: 'right' }}>Pts</th>
                    <th style={{ paddingBottom: '0.5rem', fontWeight: 500, textAlign: 'right' }}>GF</th>
                    <th style={{ paddingBottom: '0.5rem', fontWeight: 500, textAlign: 'right' }}>GC</th>
                  </tr></thead>
                  <tbody>
                    {standings.slice(0, 10).map((s: any) => (
                      <MiniTableRow key={s.position} pos={s.position} name={s.name} pts={s.points} gf={s.goals_for} gc={s.goals_against} highlight={s.name === fcfTeamData.teamName} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Row 3: Scorers + Goal Minutes + Referee ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* ── Top Scorers Rival ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={18} color="var(--accent-cyan)" /> Goleadores de {matchRival}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(rivalIntelligence.top_scorers || []).slice(0, 5).map((s: any, i: number) => (
                    <ScorerRow key={i} rank={i + 1} name={s.name} goals={s.goals} pct={s.pct_of_total} matches={s.appearances} />
                  ))}
                  {(!rivalIntelligence.top_scorers || rivalIntelligence.top_scorers.length === 0) && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No hay datos de goleadores.</p>}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>Total Goles Favor: {rivalIntelligence.standing?.goals_for || 0}. Datos extraídos de actas FCF.</p>
              </div>

              {/* ── Goal Minutes Distribution ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={18} color="#f59e0b" /> Goles por Franja ({matchRival})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.entries(rivalIntelligence.goals_by_period || {}).map(([period, counts]: [string, any]) => (
                    <GoalMinuteBar key={period} label={period} scored={counts.scored} conceded={counts.conceded} maxVal={10} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--accent-green)', borderRadius: 2, marginRight: 4 }}></span>Marcados (Total {rivalIntelligence.record?.goals_scored || 0})</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#ef4444', borderRadius: 2, marginRight: 4 }}></span>Encajados (Total {rivalIntelligence.record?.goals_conceded || 0})</span>
                </div>
                {rivalIntelligence.goals_by_period?.["61-75"]?.conceded > 7 && <p style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.5rem', textAlign: 'center' }}>⚠ Sufren mucho a balón parado en la reanudación (61-75')</p>}
              </div>

              {/* ── Referee Report ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 onClick={() => nextMatch?.referee && setSelectedReferee(nextMatch.referee) || setActiveTab('referee')} style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <Gavel size={18} color="#a78bfa" /> Informe del Árbitro Asignado
                </h3>
                <div style={{ background: 'rgba(167,139,250,0.08)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '0.75rem', border: '1px solid rgba(167,139,250,0.2)' }}>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{nextMatch?.referee || 'Por asignar'}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fcfTeamData.data?.referee_reports?.[nextMatch?.referee] ? `${fcfTeamData.data.referee_reports[nextMatch.referee].matches} partidos dirigidos` : 'Sin historial disponible'}</p>
                </div>
                {fcfTeamData.data?.referee_reports?.[nextMatch?.referee] ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <RefStat label="Partidos Temp." value={`${fcfTeamData.data.referee_reports[nextMatch.referee].matches}`} />
                      <RefStat label="Amarillas/Part." value={`${fcfTeamData.data.referee_reports[nextMatch.referee].yellows_per_match}`} warning={fcfTeamData.data.referee_reports[nextMatch.referee].yellows_per_match >= 5} />
                      <RefStat label="Rojas/Part." value={`${fcfTeamData.data.referee_reports[nextMatch.referee].reds_per_match}`} />
                      <RefStat label="Penaltis/Part." value="-" />
                    </div>
                    <div style={{ fontSize: '0.8rem' }}>
                      <p style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: fcfTeamData.data.referee_reports[nextMatch.referee].away_player_card_pct > 50 ? '#f59e0b' : 'var(--accent-cyan)', boxShadow: `0 0 6px ${fcfTeamData.data.referee_reports[nextMatch.referee].away_player_card_pct > 50 ? '#f59e0b' : 'var(--accent-cyan)'}` }}></span>
                        <span style={{ color: 'rgba(255,255,255,0.85)' }}>{fcfTeamData.data.referee_reports[nextMatch.referee].away_player_card_pct > 50 ? 'Árbitro casero: Suele pitar más al visitante.' : 'Árbitro neutral/visitante.'}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin datos históricos de este árbitro.</p>
                )}
              </div>
            </div>

            {/* ── Row 4: Rival Cards + Squad Alerts + Recent Results ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              {/* ── Rival Yellow Cards ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} color="#f59e0b" /> Tarjetas de {matchRival}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {(rivalIntelligence.cards || []).slice(0, 6).map((p: any, i: number) => (
                    <CardRow key={i} name={`${p.name}${p.dorsal ? ` (${p.dorsal})` : ''}`} yellows={p.yellows} reds={(p.reds || 0) + (p.double_yellows || 0)} apercibido={p.apercibido} />
                  ))}
                  {(!rivalIntelligence.cards || rivalIntelligence.cards.length === 0) && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin datos de tarjetas.</p>}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  Total: {(rivalIntelligence.cards || []).reduce((s: number, p: any) => s + (p.yellows || 0), 0)} amarillas · {(rivalIntelligence.cards || []).reduce((s: number, p: any) => s + (p.reds || 0) + (p.double_yellows || 0), 0)} rojas
                </p>
              </div>

              {/* ── My Squad Alerts ── */}
              {(() => {
                // Build set of jornadas our team has actually played (from actas)
                const ourTeamName = fcfTeamData.teamName;
                const playedJornadas: number[] = (fcfTeamData.data?.actas || [])
                  .filter((a: any) => a.home_team === ourTeamName || a.away_team === ourTeamName)
                  .map((a: any) => a.jornada as number);

                // A sanction is active if:
                // - matches_suspended === 0: pending/not yet assigned → active for next match
                // - matches_suspended > 0: count our team's played matches AFTER that jornada;
                //   if fewer than suspension_length have passed → still active
                const activeSanctionNames = new Set(
                  (fcfTeamData.data?.sanctions || [])
                    .filter((s: any) => {
                      if (s.matches_suspended === 0) return true;
                      const matchesAfter = playedJornadas.filter(j => j > s.matches_suspended).length;
                      const reasonText = `${s.reason || ''} ${s.notes || ''}`;
                      const suspLenMatch = reasonText.match(/(\d+) part/i);
                      const suspLen = suspLenMatch ? parseInt(suspLenMatch[1]) : 1;
                      return matchesAfter < suspLen;
                    })
                    .map((s: any) => (s.player || '').toUpperCase().trim())
                );
                const myPlayers = Object.values(fcfTeamData.data?.team_intelligence?.players || {}) as any[];
                // In FCF, yellow card ban cycle is every 5 yellows. yellows_in_cycle = yellow_cards % 5
                // (0 means just served/reset, 4 means apercibido)
                const alerts = myPlayers
                  .filter((p: any) => {
                    const isSanctioned = activeSanctionNames.has((p.name || '').toUpperCase().trim());
                    const cycleYellows = (p.yellow_cards || 0) % 5;
                    const isApercibido = cycleYellows >= 4 && p.yellow_cards > 0;
                    return isSanctioned || isApercibido;
                  })
                  .sort((a: any, b: any) => {
                    const aS = activeSanctionNames.has((a.name || '').toUpperCase().trim()) ? 10 : 0;
                    const bS = activeSanctionNames.has((b.name || '').toUpperCase().trim()) ? 10 : 0;
                    return (bS + b.yellow_cards) - (aS + a.yellow_cards);
                  })
                  .slice(0, 5);
                return (
                  <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} color="var(--accent-green)" /> Alertas (Tu Plantilla)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {alerts.map((p: any, i: number) => {
                        const isSanctioned = activeSanctionNames.has((p.name || '').toUpperCase().trim());
                        const cycleYellows = (p.yellow_cards || 0) % 5;
                        const issue = isSanctioned
                          ? `Sancionado (FCF) · ${p.yellow_cards} amarillas acum.`
                          : `${p.yellow_cards} Tarjetas Amarillas (${cycleYellows}/5 en ciclo)`;
                        const toNext = 5 - cycleYellows;
                        const time = isSanctioned ? 'NO PUEDE JUGAR' : cycleYellows >= 4 ? 'Apercibido' : `A ${toNext} de sanción`;
                        return <AlertItem key={i} name={`${p.name}${p.dorsal ? ` (${p.dorsal})` : ''}`} issue={issue} time={time} isRed={isSanctioned} isYellow={!isSanctioned} />;
                      })}
                      {alerts.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin alertas de disciplina.</p>}
                    </div>
                  </div>
                );
              })()}

              {/* ── Rival Recent Results ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={18} color="var(--accent-cyan)" /> Últimos Resultados {matchRival}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {(rivalIntelligence.recent_results || []).map((r: any, i: number) => (
                    <ResultRow key={i} jornada={`J${r.jornada}`} home={r.home_team} away={r.away_team} scoreH={r.home_score} scoreA={r.away_score} rivalSide={r.rival_side} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  <MiniStat label="Casa (Liga)" value={rivalIntelligence.standing?.home_record || '-'} />
                  <MiniStat label="Fuera (Liga)" value={rivalIntelligence.standing?.away_record || '-'} />
                </div>
              </div>
            </div>

            {/* ── Row 5: Most-Played Players + Referee Deep Dive + Conditional Insights ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>

              {/* ── Titulares Más Habituales ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Eye size={18} color="var(--accent-cyan)" /> Titulares Habituales ({matchRival})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {(() => {
                    const rec = rivalIntelligence.record || {};
                    const totalMatches = (rec.wins || 0) + (rec.draws || 0) + (rec.losses || 0) || 20;
                    return (rivalIntelligence.probable_xi || []).slice(0, 8).map((p: any, i: number) => (
                      <AppearanceRow key={i} name={p.name} dorsal={p.dorsal || 0} apps={p.starts} total={totalMatches} />
                    ));
                  })()}
                  {(!rivalIntelligence.probable_xi || rivalIntelligence.probable_xi.length === 0) && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin datos de titulares.</p>}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  Datos: titularidades en actas FCF ({((rivalIntelligence.record?.wins || 0) + (rivalIntelligence.record?.draws || 0) + (rivalIntelligence.record?.losses || 0)) || '?'} jornadas).
                </p>
              </div>

              {/* ── Informe Completo del Árbitro ── */}
              {(() => {
                const refName = nextMatch?.referee;
                const refData = refName ? fcfTeamData.data?.referee_reports?.[refName] : null;
                return (
                  <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Gavel size={18} color="#a78bfa" /> Historial del Árbitro</h3>
                    <div style={{ background: 'rgba(167,139,250,0.08)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid rgba(167,139,250,0.15)' }}>
                      <p style={{ fontWeight: 700, fontSize: '1rem' }}>{refName || 'Por asignar'}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{refData ? `${refData.matches} partidos dirigidos esta temporada` : 'Sin datos históricos en FCF Grup 3'}</p>
                    </div>
                    {refData ? (
                      <>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '0.5rem' }}>ÚLTIMOS 5 PARTIDOS DIRIGIDOS</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
                          {(refData.match_history || []).slice(-5).reverse().map((m: any, i: number) => (
                            <RefMatchRow key={i} teams={`${m.home_team.split(',')[0]} ${m.home_score}-${m.away_score} ${m.away_team.split(',')[0]}`} yellows={m.yellows} reds={m.reds} />
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.4rem', padding: '0.5rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '1rem', fontWeight: 700, color: refData.away_player_card_pct > 50 ? '#f59e0b' : 'var(--accent-cyan)' }}>{refData.away_player_card_pct}%</p>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Tarjetas al visitante</p>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.4rem', padding: '0.5rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444' }}>{refData.matches_with_expulsion} / {refData.matches}</p>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Partidos con expulsión</p>
                          </div>
                        </div>
                        {refData.second_half_card_pct > 60 && <p style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600 }}>⚠ Pita más en 2ª parte: {refData.second_half_card_pct}% de las tarjetas van después del min. 45.</p>}
                      </>
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        No hay datos de este árbitro en las actas scrapeadas del Grup 3.
                        {refName && <span style={{ display: 'block', marginTop: '0.25rem', cursor: 'pointer', color: '#a78bfa' }} onClick={() => { setSelectedReferee(refName); setActiveTab('referee'); }}>Ver informe completo →</span>}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* ── Insights Avanzados del Rival (datos reales) ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} color="var(--accent-green)" /> Insights Avanzados ({matchRival})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(() => {
                    const insights = rivalIntelligence.conditional_insights || [];
                    if (insights.length > 0) {
                      return insights.slice(0, 5).map((ins: any, i: number) => {
                        const color = ins.pct >= 70 ? 'var(--accent-green)' : ins.pct >= 50 ? '#f59e0b' : '#ef4444';
                        return <ConditionalInsight key={i} condition={ins.condition} result={ins.result} detail={ins.detail || `${ins.sample} partidos analizados`} color={color} />;
                      });
                    }
                    // Fallback: inferir desde datos disponibles
                    const fallbacks: React.ReactNode[] = [];
                    if (rivalIntelligence.goals_by_period?.['0-15']?.conceded > 2)
                      fallbacks.push(<ConditionalInsight key="a" condition="Vulnerables al inicio" result={`${rivalIntelligence.goals_by_period['0-15'].conceded} goles concedidos en los primeros 15 min.`} detail="Presionar muy arriba desde el pitido inicial" color="var(--accent-green)" />);
                    if (rivalIntelligence.top_scorers?.[0])
                      fallbacks.push(<ConditionalInsight key="b" condition="Amenaza principal" result={`${rivalIntelligence.top_scorers[0].name}: ${rivalIntelligence.top_scorers[0].goals} goles (${rivalIntelligence.top_scorers[0].pct_of_total}% del equipo)`} detail="Control estrecho sobre este jugador" color="#ef4444" />);
                    if (rivalIntelligence.standing?.goals_against > 25)
                      fallbacks.push(<ConditionalInsight key="c" condition="Defensa permeable" result={`${rivalIntelligence.standing.goals_against} goles encajados en total`} detail="Transiciones rápidas para explotar su defensa" color="var(--accent-green)" />);
                    if (rivalIntelligence.cards?.some((p: any) => p.apercibido))
                      fallbacks.push(<ConditionalInsight key="d" condition="Jugadores al límite de sanción" result={`${rivalIntelligence.cards.filter((p: any) => p.apercibido).length} jugador(es) apercibido(s)`} detail="Provocar situaciones de presión sobre ellos" color="#f59e0b" />);
                    if (rivalIntelligence.goals_by_period?.['76-90']?.scored > 3)
                      fallbacks.push(<ConditionalInsight key="e" condition="Peligrosos al final" result={`${rivalIntelligence.goals_by_period['76-90'].scored} goles marcados entre min. 76-90`} detail="No bajar la guardia en el tramo final" color="#f59e0b" />);
                    if (fallbacks.length === 0)
                      return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selecciona un rival en "Scouting Rival" para ver insights automáticos.</p>;
                    return fallbacks;
                  })()}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>Análisis basado en las actas FCF de esta temporada.</p>
              </div>
            </div>
          </div>
        )}
        {/* ── Rival Players Modal ── */}
        {showRivalPlayersModal && Object.keys(rivalPlayers).length > 0 && (
          <RivalPlayersTable
            players={rivalPlayers}
            rivalName={matchRival}
            onClose={() => setShowRivalPlayersModal(false)}
          />
        )}
        {/* ── Print Report Modal ── */}
        {showPrintReport && (
          <PrintReport teamData={fcfTeamData} onClose={() => setShowPrintReport(false)} />
        )}
      </main>
    </div>
  );
}

// ─── COMPONENTS ───────────────────────────────────────

function NavItem({ icon, label, active, onClick, badge, isSidebarOpen = true }: NavItemProps) {
  return (
    <div onClick={onClick} title={!isSidebarOpen ? label : ''} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: isSidebarOpen ? 'space-between' : 'center', padding: isSidebarOpen ? '0.65rem 0.9rem' : '0.65rem 0', width: isSidebarOpen ? 'auto' : '48px', borderRadius: '0.5rem', cursor: 'pointer', background: active ? 'linear-gradient(90deg, rgba(16,185,129,0.15), transparent)' : 'transparent', borderLeft: active ? '3px solid var(--accent-green)' : '3px solid transparent', color: active ? 'white' : 'var(--text-muted)', transition: 'all 0.2s ease', fontWeight: active ? 600 : 500, fontSize: '0.9rem' }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'white' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-muted)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', justifyContent: isSidebarOpen ? 'flex-start' : 'center', width: '100%' }}>
        <span style={{ color: active ? 'var(--accent-green)' : 'inherit', display: 'flex', justifyContent: 'center', width: isSidebarOpen ? 'auto' : '100%' }}>{icon}</span>
        {isSidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
      </div>
      {isSidebarOpen && badge && <span style={{ fontSize: '0.6rem', background: 'var(--gradient-primary)', color: 'white', padding: '0.1rem 0.35rem', borderRadius: '1rem', fontWeight: 700 }}>{badge}</span>}
      {!isSidebarOpen && badge && <span style={{ position: 'absolute', top: 6, right: 8, width: 6, height: 6, background: 'var(--accent-green)', borderRadius: '50%' }}></span>}
    </div>
  );
}

function StatCard({ title, value, subtitle, trend, positive }: StatCardProps) {
  return (
    <div className="glass" style={{ padding: '1.25rem', borderRadius: '1rem', borderTop: `2px solid ${positive ? 'var(--accent-green)' : '#ef4444'}` }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>{title}</p>
      <h3 style={{ fontSize: '1.75rem', letterSpacing: '-1px', marginBottom: '0.15rem' }}>{value}</h3>
      <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>{subtitle}</p>
      <p style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: positive ? 'var(--accent-green)' : '#ef4444' }}>
        <TrendingUp size={12} style={positive ? {} : { transform: 'rotate(180deg)' }} />{trend}
      </p>
    </div>
  );
}

function InsightItem({ type, text }: InsightItemProps) {
  const c: Record<string, string> = { danger: '#ef4444', warning: '#f59e0b', success: 'var(--accent-green)', info: 'var(--accent-cyan)' };
  return (<li style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.8rem' }}>
    <span style={{ marginTop: '0.3rem', width: 5, height: 5, borderRadius: '50%', background: c[type], flexShrink: 0, boxShadow: `0 0 6px ${c[type]}` }}></span>
    <span style={{ color: 'rgba(255,255,255,0.9)' }}>{text}</span>
  </li>);
}

function ProgressBar({ label, leftVal, rightVal, leftPct, rightPct, reverseColors }: ProgressBarProps) {
  const c1 = reverseColors ? '#ef4444' : 'var(--accent-green)';
  const c2 = reverseColors ? 'var(--accent-green)' : 'var(--text-muted)';
  return (<div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
      <span style={{ color: c1, fontWeight: 700 }}>{leftVal}</span><span style={{ color: 'var(--text-muted)' }}>{label}</span><span style={{ color: c2, fontWeight: 700 }}>{rightVal}</span>
    </div>
    <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', gap: 2 }}>
      <div style={{ width: `${leftPct}%`, background: c1 }}></div><div style={{ width: `${rightPct}%`, background: c2 }}></div>
    </div>
  </div>);
}

function AlertItem({ name, issue, time, isRed, isYellow }: AlertItemProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.4rem', borderLeft: `3px solid ${isRed ? '#ef4444' : isYellow ? '#f59e0b' : 'var(--accent-cyan)'}` }}>
      <div><p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{name}</p><p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{issue}</p></div>
      <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: isRed ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', borderRadius: '0.25rem', color: isRed ? '#ef4444' : 'inherit', fontWeight: isRed ? 700 : 400 }}>{time}</span>
    </div>
  );
}

function MiniTableRow({ pos, name, pts, gf, gc, highlight, isOpponent }: MiniTableRowProps) {
  return (
    <tr style={{ background: highlight ? 'rgba(16,185,129,0.08)' : isOpponent ? 'rgba(239,68,68,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <td style={{ padding: '0.5rem 0', fontWeight: highlight ? 700 : 400, color: highlight ? 'var(--accent-green)' : 'inherit' }}>{pos}</td>
      <td style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {name}
        {highlight && <span style={{ fontSize: '0.55rem', background: 'var(--accent-green)', color: 'black', padding: '0 0.25rem', borderRadius: '1rem', fontWeight: 700 }}>TÚ</span>}
        {isOpponent && <span style={{ fontSize: '0.55rem', background: '#ef4444', color: 'white', padding: '0 0.25rem', borderRadius: '1rem', fontWeight: 700 }}>RIVAL</span>}
      </td>
      <td style={{ padding: '0.5rem 0', fontWeight: 700, textAlign: 'right' }}>{pts}</td>
      <td style={{ padding: '0.5rem 0', textAlign: 'right', color: 'var(--accent-green)' }}>{gf}</td>
      <td style={{ padding: '0.5rem 0', textAlign: 'right', color: '#ef4444' }}>{gc}</td>
    </tr>
  );
}

function PlayerDot({ x, y, num, color }: PlayerDotProps) {
  return (<div style={{ position: 'absolute', left: x, top: y, width: 22, height: 22, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: 700, border: '2px solid rgba(0,0,0,0.4)', transform: 'translate(-50%, -50%)', boxShadow: `0 0 8px ${color}40` }}>{num}</div>);
}

function ScorerRow({ rank, name, goals, pct, matches }: { rank: number; name: string; goals: number; pct: number; matches: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.5rem', background: rank === 1 ? 'rgba(6,182,212,0.08)' : 'transparent', borderRadius: '0.4rem' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: rank === 1 ? 'var(--accent-cyan)' : 'var(--text-muted)', width: '18px' }}>#{rank}</span>
      <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: rank === 1 ? 600 : 400 }}>{name}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{goals}⚽</span>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: '35px', textAlign: 'right' }}>{pct}%</span>
      {matches > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({matches} PJ)</span>}
    </div>
  );
}

function GoalMinuteBar({ label, scored, conceded, maxVal }: { label: string; scored: number; conceded: number; maxVal: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '40px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(scored / maxVal) * 100}%`, background: 'var(--accent-green)', borderRadius: 3 }}></div>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(conceded / maxVal) * 100}%`, background: '#ef4444', borderRadius: 3 }}></div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', width: '50px', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', fontWeight: 600 }}>{scored}</span>
        <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>{conceded}</span>
      </div>
    </div>
  );
}

function CardRow({ name, yellows, reds, apercibido }: { name: string; yellows: number; reds: number; apercibido?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.5rem', background: apercibido ? 'rgba(245,158,11,0.08)' : 'transparent', borderRadius: '0.4rem', borderLeft: apercibido ? '3px solid #f59e0b' : '3px solid transparent' }}>
      <span style={{ fontSize: '0.85rem', fontWeight: apercibido ? 600 : 400 }}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
          <span style={{ width: 10, height: 14, background: '#f59e0b', borderRadius: 1, display: 'inline-block' }}></span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>×{yellows}</span>
        </span>
        {reds > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
          <span style={{ width: 10, height: 14, background: '#ef4444', borderRadius: 1, display: 'inline-block' }}></span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>×{reds}</span>
        </span>}
        {apercibido && <span style={{ fontSize: '0.6rem', background: '#f59e0b', color: '#000', padding: '0.05rem 0.3rem', borderRadius: '1rem', fontWeight: 700 }}>APERC.</span>}
      </div>
    </div>
  );
}

function ResultRow({ jornada, home, away, scoreH, scoreA, rivalSide }: { jornada: string; home: string; away: string; scoreH: number; scoreA: number; rivalSide: 'home' | 'away' }) {
  const won = rivalSide === 'home' ? scoreH > scoreA : scoreA > scoreH;
  const draw = scoreH === scoreA;
  const color = won ? 'var(--accent-green)' : draw ? '#f59e0b' : '#ef4444';
  const letter = won ? 'V' : draw ? 'E' : 'D';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.8rem' }}>
      <span style={{ color: 'var(--text-muted)', width: '25px', fontSize: '0.7rem' }}>{jornada}</span>
      <span style={{ flex: 1, textAlign: 'right', fontWeight: rivalSide === 'home' ? 600 : 400, fontSize: '0.8rem' }}>{home}</span>
      <span style={{ fontWeight: 700, padding: '0.15rem 0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.25rem', minWidth: '42px', textAlign: 'center' }}>{scoreH} - {scoreA}</span>
      <span style={{ flex: 1, fontWeight: rivalSide === 'away' ? 600 : 400, fontSize: '0.8rem' }}>{away}</span>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: letter === 'V' ? '#000' : '#fff' }}>{letter}</span>
    </div>
  );
}

function RefStat({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.4rem', padding: '0.5rem 0.6rem', textAlign: 'center' }}>
      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: warning ? '#f59e0b' : 'var(--text-main)' }}>{value}</p>
      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (<div style={{ textAlign: 'center' }}><p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</p><p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{value}</p></div>);
}

function AppearanceRow({ name, dorsal, apps, total }: { name: string; dorsal: number; apps: number; total: number }) {
  const pct = Math.round((apps / total) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: pct >= 90 ? 'rgba(6,182,212,0.06)' : 'transparent' }}>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: '28px', flexShrink: 0 }}>#{dorsal}</span>
      <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: pct >= 85 ? 600 : 400 }}>{name}</span>
      <div style={{ width: '60px', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 85 ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.2)', borderRadius: 3 }}></div>
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, width: '40px', textAlign: 'right', color: pct >= 90 ? 'var(--accent-cyan)' : 'inherit' }}>{apps}/{total}</span>
    </div>
  );
}

function RefMatchRow({ teams, yellows, reds }: { teams: string; yellows: number; reds: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: 'rgba(0,0,0,0.15)', fontSize: '0.8rem' }}>
      <span style={{ flex: 1 }}>{teams}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
          <span style={{ width: 8, height: 11, background: '#f59e0b', borderRadius: 1, display: 'inline-block' }}></span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{yellows}</span>
        </span>
        {reds > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
          <span style={{ width: 8, height: 11, background: '#ef4444', borderRadius: 1, display: 'inline-block' }}></span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{reds}</span>
        </span>}
      </div>
    </div>
  );
}

function ConditionalInsight({ condition, result, detail, color }: { condition: string; result: string; detail: string; color: string }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', borderLeft: `3px solid ${color}` }}>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{condition}</p>
      <p style={{ fontSize: '0.9rem', fontWeight: 700, color }}>{result}</p>
      <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{detail}</p>
    </div>
  );
}

// ─── VIDEO ANALYSIS COMPONENT ──────────────────────────
const VIDEO_TAGS = ['Defensa', 'Ataque', 'Balón Parado', 'Contraataque', 'Presión', 'Gol', 'Táctica', 'Error Rival'] as const;

function VideoAnalysis({ videos, onAdd, onRemove, teamData }: {
  videos: VideoEntry[];
  onAdd: (v: Omit<VideoEntry, 'id' | 'createdAt'>) => void;
  onRemove: (id: string) => void;
  teamData: FCFTeamData | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [form, setForm] = useState({ url: '', title: '', rival: '', jornada: '', tags: [] as string[] });

  const rivals = teamData?.data?.standings?.map((s: any) => s.name).filter((n: string) => n !== teamData?.teamName) || [];

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    return match ? match[1] : null;
  };

  const handleSubmit = () => {
    if (!form.url.trim() || !form.title.trim()) return;
    onAdd({ url: form.url, title: form.title, rival: form.rival, jornada: form.jornada, tags: form.tags });
    setForm({ url: '', title: '', rival: '', jornada: '', tags: [] });
    setShowForm(false);
  };

  const toggleTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }));
  };

  const filtered = filterTag ? videos.filter(v => v.tags.includes(filterTag)) : videos;

  return (
    <div style={{ padding: '2rem 3rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Video size={24} color="#8b5cf6" /> Video Análisis
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Gestiona tus vídeos de partidos y tácticas. Se guardan en el navegador.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.25rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
        >
          <Plus size={18} /> Añadir vídeo
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass" style={{ borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid rgba(139,92,246,0.3)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#8b5cf6' }}>➕ Nuevo Vídeo</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>URL del vídeo (YouTube, etc.)</label>
              <input
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Rival</label>
              <select
                value={form.rival}
                onChange={e => setForm(f => ({ ...f, rival: e.target.value }))}
                style={{ width: '100%', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
              >
                <option value="">Sin rival</option>
                {rivals.map((r: string) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Jornada</label>
              <input
                value={form.jornada}
                onChange={e => setForm(f => ({ ...f, jornada: e.target.value }))}
                placeholder="J12"
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Título</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ej: Análisis defensivo Jornada 12 vs AE Prat"
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Tag size={12} /> Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {VIDEO_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  style={{ padding: '0.25rem 0.6rem', borderRadius: '1rem', border: `1px solid ${form.tags.includes(tag) ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`, background: form.tags.includes(tag) ? 'rgba(139,92,246,0.25)' : 'transparent', color: form.tags.includes(tag) ? '#a78bfa' : 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleSubmit} style={{ background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.4rem', padding: '0.5rem 1.25rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Guardar</button>
            <button onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Filter Tags */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setFilterTag(null)}
          style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', border: `1px solid ${!filterTag ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`, background: !filterTag ? 'rgba(139,92,246,0.2)' : 'transparent', color: !filterTag ? '#a78bfa' : 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
        >Todos ({videos.length})</button>
        {VIDEO_TAGS.map(tag => {
          const count = videos.filter(v => v.tags.includes(tag)).length;
          if (count === 0) return null;
          return (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', border: `1px solid ${filterTag === tag ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`, background: filterTag === tag ? 'rgba(139,92,246,0.2)' : 'transparent', color: filterTag === tag ? '#a78bfa' : 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
            >{tag} ({count})</button>
          );
        })}
      </div>

      {/* Video Grid */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <Video size={48} color="rgba(139,92,246,0.3)" style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No hay vídeos guardados</p>
          <p style={{ fontSize: '0.85rem' }}>Añade tu primer vídeo pulsando el botón de arriba.</p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filtered.map(video => {
          const ytId = getYouTubeId(video.url);
          return (
            <div key={video.id} className="glass" style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid rgba(139,92,246,0.15)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* Thumbnail */}
              <div style={{ position: 'relative', paddingTop: '56.25%', background: 'rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                {ytId ? (
                  <img
                    src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                    alt={video.title}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                  />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Video size={40} color="rgba(139,92,246,0.5)" />
                  </div>
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
                {/* Open link button */}
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '0.4rem', padding: '0.3rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'white', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  <ExternalLink size={12} /> Ver
                </a>
              </div>
              {/* Info */}
              <div style={{ padding: '0.9rem' }}>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem', lineHeight: 1.3 }}>{video.title}</p>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                  {video.rival && <span>⚔️ {video.rival}</span>}
                  {video.jornada && <span>📅 {video.jornada}</span>}
                  <span style={{ marginLeft: 'auto' }}>{new Date(video.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {video.tags.map(tag => (
                      <span key={tag} style={{ fontSize: '0.65rem', background: 'rgba(139,92,246,0.2)', color: '#a78bfa', padding: '0.1rem 0.4rem', borderRadius: '1rem' }}>{tag}</span>
                    ))}
                  </div>
                  <button
                    onClick={() => onRemove(video.id)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '0.25rem', borderRadius: '0.25rem', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;

