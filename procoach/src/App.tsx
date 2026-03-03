import { useState } from 'react';
import {
  BarChart2, Calendar, Shield, Users, Video,
  Settings, Bell, Search, AlertTriangle,
  TrendingUp, Crosshair, Map, Award, Gavel, Clock, Target,
  UserCheck, Zap, Activity, Eye, ChevronLeft, ChevronRight,
  Database
} from 'lucide-react';
import './App.css';
import TrainingPlanner from './TrainingPlanner';
import TeamManagement from './TeamManagement';
import FCFSetup, { type FCFTeamData } from './FCFSetup';
import IntelligenceView from './IntelligenceView';

// ─── TYPES ────────────────────────────────────────────
interface NavItemProps { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: string; isSidebarOpen?: boolean }
interface StatCardProps { title: string; value: string; subtitle: string; trend: string; positive: boolean }
interface InsightItemProps { type: 'danger' | 'warning' | 'success' | 'info'; text: string }
interface ProgressBarProps { label: string; leftVal: string; rightVal: string; leftPct: number; rightPct: number; reverseColors?: boolean }
interface AlertItemProps { name: string; issue: string; time: string; isRed?: boolean; isYellow?: boolean }
interface MiniTableRowProps { pos: number; name: string; pts: number; gf: number; gc: number; highlight?: boolean; isOpponent?: boolean }
interface PlayerDotProps { x: string; y: string; num: string; color: string }

// ─── APP ──────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [fcfTeamData, setFcfTeamData] = useState<FCFTeamData | null>(null);

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
          <NavItem icon={<Gavel size={20} />} label="Árbitro" active={activeTab === 'referee'} onClick={() => setActiveTab('referee')} badge="Nuevo" isSidebarOpen={isSidebarOpen} />
          <NavItem icon={<Map size={20} />} label="Entrenamientos" active={activeTab === 'training'} onClick={() => setActiveTab('training')} badge="Nuevo" isSidebarOpen={isSidebarOpen} />
          <NavItem icon={<Video size={20} />} label="Video Análisis" active={activeTab === 'video'} onClick={() => setActiveTab('video')} isSidebarOpen={isSidebarOpen} />
          <NavItem icon={<Calendar size={20} />} label="Calendario" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} isSidebarOpen={isSidebarOpen} />
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.5rem 0' }} />
          <NavItem icon={<Database size={20} />} label="FCF Intelligence" active={activeTab === 'fcf'} onClick={() => setActiveTab('fcf')} badge={fcfTeamData ? '✓' : 'NEW'} isSidebarOpen={isSidebarOpen} />
        </div>
        <div style={{ padding: isSidebarOpen ? '1.5rem' : '1.5rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}>
          <NavItem icon={<Settings size={20} />} label="Configuración" active={false} onClick={() => { }} isSidebarOpen={isSidebarOpen} />
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, height: '100vh', overflowY: 'auto', position: 'relative' }}>
        {/* Header */}
        <header style={{ padding: '1.25rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 40 }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Hola, Míster 👋</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fundació Acadèmia F. L'Hospitalet A — Segona Catalana · Grup 3</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '2rem', padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Search size={18} color="var(--text-muted)" />
              <input placeholder="Buscar jugador, rival..." style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', marginLeft: '0.5rem', fontSize: '0.85rem', width: '180px' }} />
            </div>
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <Bell size={22} color="var(--text-muted)" />
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', width: '9px', height: '9px', borderRadius: '50%', border: '2px solid #0f172a' }}></span>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 10px rgba(16,185,129,0.3)', cursor: 'pointer' }}>M</div>
          </div>
        </header>

        {/* ── Dynamic Content ── */}
        {activeTab === 'fcf' ? (
          fcfTeamData ? (
            <IntelligenceView
              teamData={fcfTeamData}
              onReset={() => setFcfTeamData(null)}
            />
          ) : (
            <FCFSetup onComplete={(data) => { setFcfTeamData(data); }} />
          )
        ) : activeTab === 'training' ? (
          <TrainingPlanner />
        ) : activeTab === 'team' ? (
          <TeamManagement />
        ) : (
          <div style={{ padding: '2rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>

            {/* ── Row 1: Key Numbers ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <StatCard title="Tu Posición en Liga" value="6º" subtitle="29 pts · 20 PJ" trend="+1 desde la última jornada" positive />
              <StatCard title="Tus Goles F / C" value="48 / 31" subtitle="+17 diferencia" trend="2.4 GF / partido" positive />
              <StatCard title="Tu Racha (Últ. 5)" value="D-V-D-E-V" subtitle="7 de 15 pts posibles" trend="Recuperando puntos" positive />
              <StatCard title="Tu Fair Play (Joc Net)" value="50 pts" subtitle="5ª posición del grupo" trend="3 Rojas · 41 Amarillas" positive={false} />
            </div>

            {/* ── Row 2: Main Scouting + Sidebar ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* ── MAIN: Next match scouting ── */}
              <div className="glass" style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid rgba(6,182,212,0.3)' }}>
                {/* Header bar */}
                <div style={{ background: 'linear-gradient(90deg, rgba(6,182,212,0.1), transparent)', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '0.25rem', display: 'block' }}>PRÓXIMO RIVAL · SCOUTING FCF</span>
                    <h3 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      AE Prat B (9º)
                      <span style={{ fontSize: '0.8rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 600 }}>⚠ Necesita Puntos</span>
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Domingo 12:00h</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Julio Méndez</p>
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
                      <InsightItem type="danger" text="Llegan tras una remontada (Prat B 3-1 contra Sarrià)." />
                      <InsightItem type="warning" text="Suelen encajar pronto: 7 goles en contra en los primeros 15 min." />
                      <InsightItem type="info" text="H. Gómez (dorsal 4): Vuelve de sanción por roja directa." />
                      <InsightItem type="success" text="La segunda peor defensa del top 10 (38 GF)." />
                      <InsightItem type="warning" text="Peligro: A. Ruiz (9 goles, 28% de los goles del equipo)." />
                    </ul>

                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Comparativa Directa (Tu Acadèmia vs AE Prat B)</h4>
                      <ProgressBar label="Goles a Favor" leftVal="48" rightVal="32" leftPct={60} rightPct={40} />
                      <div style={{ height: '0.5rem' }}></div>
                      <ProgressBar label="Goles en Contra" leftVal="31" rightVal="38" leftPct={45} rightPct={55} reverseColors />
                      <div style={{ height: '0.5rem' }}></div>
                      <ProgressBar label="Puntos" leftVal="29" rightVal="24" leftPct={55} rightPct={45} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SIDEBAR: Clasificación ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem' }}>Clasificación Grup 3</h3>
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
                    <MiniTableRow pos={1} name="Racing Vallbona" pts={45} gf={60} gc={18} />
                    <MiniTableRow pos={2} name="Sp. Gavà 2013" pts={42} gf={55} gc={22} />
                    <MiniTableRow pos={3} name="UD Unif. Bellvitge" pts={38} gf={50} gc={25} />
                    <MiniTableRow pos={4} name="CF Barceloneta" pts={32} gf={44} gc={30} />
                    <MiniTableRow pos={5} name="S. Montserratina" pts={30} gf={40} gc={33} />
                    <MiniTableRow pos={6} name="Fund. Acadèmia" pts={29} gf={48} gc={31} highlight />
                    <MiniTableRow pos={7} name="CP Sarrià" pts={28} gf={36} gc={30} />
                    <MiniTableRow pos={8} name="FC Santboià B" pts={26} gf={35} gc={42} />
                    <MiniTableRow pos={9} name="AE Prat B" pts={24} gf={32} gc={38} isOpponent />
                    <MiniTableRow pos={10} name="EE Guineueta" pts={22} gf={28} gc={40} />
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Row 3: Scorers + Goal Minutes + Referee ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* ── Top Scorers Rival ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={18} color="var(--accent-cyan)" /> Goleadores de la AE Prat B</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <ScorerRow rank={1} name="A. Ruiz" goals={9} pct={28} matches={19} />
                  <ScorerRow rank={2} name="C. Gómez" goals={5} pct={16} matches={15} />
                  <ScorerRow rank={3} name="M. Castro" goals={4} pct={13} matches={20} />
                  <ScorerRow rank={4} name="P. Silva" goals={4} pct={13} matches={18} />
                  <ScorerRow rank={5} name="Otros (6 jug.)" goals={10} pct={30} matches={0} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>Total Goles Favor: 32. Datos extraídos de actas FCF.</p>
              </div>

              {/* ── Goal Minutes Distribution ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={18} color="#f59e0b" /> Goles por Franja (AE Prat B)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <GoalMinuteBar label="0-15'" scored={2} conceded={7} maxVal={10} />
                  <GoalMinuteBar label="16-30'" scored={5} conceded={5} maxVal={10} />
                  <GoalMinuteBar label="31-45'" scored={4} conceded={6} maxVal={10} />
                  <GoalMinuteBar label="46-60'" scored={7} conceded={5} maxVal={10} />
                  <GoalMinuteBar label="61-75'" scored={6} conceded={9} maxVal={10} />
                  <GoalMinuteBar label="76-90'" scored={8} conceded={6} maxVal={10} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--accent-green)', borderRadius: 2, marginRight: 4 }}></span>Marcados (Total 32)</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#ef4444', borderRadius: 2, marginRight: 4 }}></span>Encajados (Total 38)</span>
                </div>
                <p style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.5rem', textAlign: 'center' }}>⚠ Sufren mucho a balón parado en la reanudación (61-75')</p>
              </div>

              {/* ── Referee Report ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Gavel size={18} color="#a78bfa" /> Informe del Árbitro Asignado</h3>
                <div style={{ background: 'rgba(167,139,250,0.08)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '0.75rem', border: '1px solid rgba(167,139,250,0.2)' }}>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>M. Rodríguez Silva</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Delegació: Baix Llobregat</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <RefStat label="Partidos Temp." value="14" />
                  <RefStat label="Amarillas/Part." value="5.1" warning />
                  <RefStat label="Rojas/Part." value="0.4" />
                  <RefStat label="Penaltis/Part." value="0.6" warning />
                </div>
                <div style={{ fontSize: '0.8rem' }}>
                  <p style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }}></span>
                    <span style={{ color: 'rgba(255,255,255,0.85)' }}>Árbitro casero: Suele pitar más faltas al visitante.</span>
                  </p>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)', boxShadow: '0 0 6px var(--accent-cyan)' }}></span>
                    <span style={{ color: 'rgba(255,255,255,0.85)' }}>Último Acta: Prat B 2-2 Guineueta</span>
                  </p>
                </div>
              </div>
            </div>

            {/* ── Row 4: Rival Cards + Squad Alerts + Recent Results ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              {/* ── Rival Yellow Cards ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} color="#f59e0b" /> Tarjetas de la AE Prat B</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <CardRow name="J. Fernández (5)" yellows={4} reds={1} apercibido />
                  <CardRow name="D. Blanco (8)" yellows={4} reds={0} apercibido />
                  <CardRow name="A. Ruiz (9)" yellows={3} reds={0} />
                  <CardRow name="M. Castro (11)" yellows={2} reds={0} />
                  <CardRow name="S. Martín (3)" yellows={2} reds={1} />
                  <CardRow name="L. Torres (2)" yellows={1} reds={0} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>Suman 41 amarillas · 4 rojas directas en toda la liga</p>
              </div>

              {/* ── My Squad Alerts ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} color="var(--accent-green)" /> Alertas (Tu Plantilla)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <AlertItem name="Marc Garcia (8)" issue="4 Tarjetas Amarillas" time="Apercibido" isYellow />
                  <AlertItem name="Alex Fernández (5)" issue="Sancionado 1 partido (resolución FCF)" time="NO PUEDE JUGAR" isRed />
                  <AlertItem name="David López (11)" issue="3 Tarjetas Amarillas" time="A 2 de sanción" isYellow />
                  <AlertItem name="Sergio Ruiz (2)" issue="Sancionado 2 partidos" time="Falta 1 partido" isRed />
                </div>
              </div>

              {/* ── Rival Recent Results ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={18} color="var(--accent-cyan)" /> Últimos Resultados AE Prat B</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <ResultRow jornada="J20" home="Bellvitge" away="Prat B" scoreH={2} scoreA={0} rivalSide="away" />
                  <ResultRow jornada="J19" home="Prat B" away="Racing Vallb." scoreH={1} scoreA={1} rivalSide="home" />
                  <ResultRow jornada="J18" home="Barceloneta" away="Prat B" scoreH={3} scoreA={2} rivalSide="away" />
                  <ResultRow jornada="J17" home="Prat B" away="Montserratina" scoreH={1} scoreA={0} rivalSide="home" />
                  <ResultRow jornada="J16" home="Prat B" away="Gavà 2013" scoreH={2} scoreA={4} rivalSide="home" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                  <MiniStat label="Casa (Liga)" value="4V 4E 2D" />
                  <MiniStat label="Fuera (Liga)" value="2V 2E 6D" />
                </div>
              </div>
            </div>

            {/* ── Row 5: Most-Played Players + Referee Deep Dive + Conditional Insights ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>

              {/* ── Titulares Más Habituales ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Eye size={18} color="var(--accent-cyan)" /> Titulares Habituales (AE Prat B)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <AppearanceRow name="A. Ruiz" dorsal={9} apps={19} total={20} />
                  <AppearanceRow name="J. Fernández" dorsal={5} apps={18} total={20} />
                  <AppearanceRow name="M. Castro" dorsal={11} apps={17} total={20} />
                  <AppearanceRow name="D. Blanco" dorsal={8} apps={17} total={20} />
                  <AppearanceRow name="C. Gómez" dorsal={7} apps={15} total={20} />
                  <AppearanceRow name="S. Martín" dorsal={3} apps={14} total={20} />
                  <AppearanceRow name="L. Torres" dorsal={2} apps={13} total={20} />
                  <AppearanceRow name="P. Silva" dorsal={10} apps={12} total={20} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>Datos: titularidades en actas FCF (20 jornadas).</p>
              </div>

              {/* ── Informe Completo del Árbitro ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Gavel size={18} color="#a78bfa" /> Historial del Árbitro</h3>
                <div style={{ background: 'rgba(167,139,250,0.08)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid rgba(167,139,250,0.15)' }}>
                  <p style={{ fontWeight: 700, fontSize: '1rem' }}>M. Rodríguez Silva</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Delegació Baix Llobregat · 14 partidos esta temporada</p>
                </div>
                {/* Last 5 matches */}
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '0.5rem' }}>ÚLTIMOS 5 PARTIDOS DIRIGIDOS</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
                  <RefMatchRow teams="Prat B 2-2 Guineueta" yellows={6} reds={0} />
                  <RefMatchRow teams="Sarrià 1-0 Bellvitge" yellows={7} reds={1} />
                  <RefMatchRow teams="Gavà 3-1 Barceloneta" yellows={4} reds={0} />
                  <RefMatchRow teams="Montserratina 0-0 Racing" yellows={8} reds={1} />
                  <RefMatchRow teams="Guineueta 2-3 Gavà" yellows={5} reds={0} />
                </div>
                {/* Bias stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.4rem', padding: '0.5rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: '#f59e0b' }}>62%</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Tarjetas al visitante</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.4rem', padding: '0.5rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444' }}>3 / 14</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Partidos con expulsión</p>
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600 }}>⚠ Pita más en 2ª parte: 65% de las tarjetas van después del min. 45.</p>
              </div>

              {/* ── Insights Avanzados del Rival ── */}
              <div className="glass" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} color="var(--accent-green)" /> Insights Avanzados (AE Prat B)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <ConditionalInsight
                    condition="Cuando encajan en los primeros 30 min..."
                    result="Pierden el 75% de esos partidos"
                    detail="6 de 8 partidos → Derrota"
                    color="var(--accent-green)"
                  />
                  <ConditionalInsight
                    condition="Cuando van perdiendo al descanso..."
                    result="Solo han remontado 1 de 7 veces"
                    detail="14% de remontadas"
                    color="var(--accent-green)"
                  />
                  <ConditionalInsight
                    condition="Puntos ganados con goles en los últ. 15 min"
                    result="+6 puntos extra"
                    detail="3 empates convertidos en victoria"
                    color="var(--accent-cyan)"
                  />
                  <ConditionalInsight
                    condition="Puntos perdidos por goles encajados en últ. 15 min"
                    result="−4 puntos perdidos"
                    detail="2 victorias → empate, 1 empate → derrota"
                    color="#ef4444"
                  />
                  <ConditionalInsight
                    condition="Cuando marcan primero..."
                    result="Ganan el 80% de las veces"
                    detail="8 de 10 partidos"
                    color="#f59e0b"
                  />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>Análisis: basado en las 20 actas registradas de esta temporada.</p>
              </div>
            </div>
          </div>
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

export default App;

