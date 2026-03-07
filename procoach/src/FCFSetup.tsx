import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, CheckCircle2, Loader2, AlertCircle,
  ArrowLeft, Zap, RotateCcw, X
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────
export interface FCFTeamData {
  team: string;
  teamName: string;
  season: string;
  competition: string;
  competitionName: string;
  group: string;
  tier: number;
  jobId: string;
  data: any;
}

interface FCFSetupProps {
  onComplete: (data: FCFTeamData) => void;
}

type Step = 'welcome' | 'search' | 'searching' | 'confirm' | 'scraping' | 'done' | 'error' | 'loading-saved';

interface SearchResult {
  found: boolean;
  team_name?: string;
  competition?: string;
  competition_name?: string;
  group?: string;
  tier?: number;
  season?: string;
}

interface JobStatus {
  status: 'running' | 'done' | 'error';
  step: string;
  progress: number;
  actas_done?: number;
  actas_total?: number;
  error?: string;
  elapsed?: number;
}

// ─── Competition list for cycling animation ─────────────────────────────────
const COMPETITIONS = [
  'Divisió d\'Honor', 'Superior Catalana', 'Premier Catalana',
  'Preferent Catalana', 'Primera Catalana', 'Segona Catalana',
  'Tercera Catalana', 'Quarta Catalana', 'Regional',
  'Superior Regional', 'Primera Regional', 'Segona Regional',
  'Tercera Regional', 'Quarta Regional',
];

// ─── Scraping pipeline steps ────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { id: 'standings', label: 'Classificació · Golejadors · Sancions', threshold: 30 },
  { id: 'calendar', label: 'Calendari i resultats', threshold: 38 },
  { id: 'actas', label: 'Actes de partits (+ temps)', threshold: 85 },
  { id: 'intel', label: 'Intel·ligència i validació', threshold: 100 },
];

// ─── CSS animations injected once ──────────────────────────────────────────
const STYLES = `
  @keyframes fcf-spin { to { transform: rotate(360deg); } }
  @keyframes fcf-pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(16,185,129,0.3), 0 0 60px rgba(16,185,129,0.1); }
    50% { box-shadow: 0 0 40px rgba(16,185,129,0.6), 0 0 100px rgba(16,185,129,0.2); }
  }
  @keyframes fcf-ball-spin {
    0% { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(180deg) scale(1.05); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes fcf-fade-in {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fcf-slide-in {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes fcf-check-pop {
    0% { transform: scale(0.3) rotate(-20deg); opacity: 0; }
    60% { transform: scale(1.15) rotate(5deg); }
    80% { transform: scale(0.95) rotate(-2deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes fcf-bar-fill {
    from { width: 0%; }
  }
  @keyframes fcf-radar-ring {
    0% { transform: scale(0.5); opacity: 0.8; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  @keyframes fcf-ticker {
    0% { opacity: 0; transform: translateY(4px); }
    15% { opacity: 1; transform: translateY(0); }
    85% { opacity: 1; }
    100% { opacity: 0; }
  }
  @keyframes fcf-success-ring {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2); opacity: 0; }
  }
  @keyframes fcf-progress-shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  .fcf-spin { animation: fcf-spin 1s linear infinite; }
  .fcf-ball { animation: fcf-ball-spin 2s ease-in-out infinite; display: inline-block; }
  .fcf-fade { animation: fcf-fade-in 0.4s ease forwards; }
  .fcf-check { animation: fcf-check-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
`;

// ─── Sub-components ─────────────────────────────────────────────────────────
function GlowCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(15,23,42,0.9)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '1.25rem',
      padding: '2.5rem',
      width: '100%',
      maxWidth: 480,
      position: 'relative',
      overflow: 'hidden',
      animation: 'fcf-fade-in 0.35s ease forwards',
      ...style,
    }}>
      {/* Top glow accent */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '60%', height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)',
      }} />
      {children}
    </div>
  );
}

function GradientButton({ onClick, disabled, children, style }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode; style?: React.CSSProperties;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        padding: '0.9rem 1.5rem',
        borderRadius: '0.75rem',
        border: 'none',
        background: disabled ? 'rgba(255,255,255,0.05)' : hover
          ? 'linear-gradient(135deg, #0ea571, #0596b3)'
          : 'linear-gradient(135deg, #10b981, #06b6d4)',
        color: disabled ? 'rgba(255,255,255,0.3)' : 'white',
        fontSize: '1rem',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        letterSpacing: '0.2px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        boxShadow: disabled ? 'none' : hover
          ? '0 8px 25px rgba(16,185,129,0.4)'
          : '0 4px 15px rgba(16,185,129,0.25)',
        transform: hover && !disabled ? 'translateY(-1px)' : 'none',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        padding: '0.7rem 1.5rem',
        borderRadius: '0.75rem',
        border: `1px solid ${hover ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
        background: hover ? 'rgba(255,255,255,0.05)' : 'transparent',
        color: hover ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)',
        fontSize: '0.875rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
      }}
    >
      {children}
    </button>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.875rem',
      padding: '0.75rem 1rem',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '0.625rem',
      border: '1px solid rgba(255,255,255,0.06)',
      animation: 'fcf-slide-in 0.3s ease forwards',
    }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.7)', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>{value}</div>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function FCFSetup({ onComplete }: FCFSetupProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [teamInput, setTeamInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [season, setSeason] = useState('2526');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [_jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [compIndex, setCompIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [doneMetrics, setDoneMetrics] = useState({ actas: 0, players: 0, accuracy: 0 });
  const [savedInfo, setSavedInfo] = useState<{
    team_name: string; competition_name: string; group: string;
    season: string; competition: string; tier: number; scraped_at: string;
  } | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Inject styles once + check for saved data
  useEffect(() => {
    if (!document.getElementById('fcf-styles')) {
      const tag = document.createElement('style');
      tag.id = 'fcf-styles';
      tag.textContent = STYLES;
      document.head.appendChild(tag);
    }
    // Check if there's already saved data from a previous scrape
    fetch('/api/saved')
      .then(r => r.json())
      .then(d => { if (d.found) setSavedInfo(d); })
      .catch(() => {});
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Cycle competition names while searching
  useEffect(() => {
    if (step !== 'searching') return;
    const t = setInterval(() => setCompIndex(i => (i + 1) % COMPETITIONS.length), 1200);
    return () => clearInterval(t);
  }, [step]);

  // Focus input on search step
  useEffect(() => {
    if (step === 'search') setTimeout(() => inputRef.current?.focus(), 100);
  }, [step]);

  // Elapsed timer during scraping
  useEffect(() => {
    if (step === 'scraping') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [step]);

  // Poll job status
  const startPolling = useCallback((jid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/job/${jid}`);
        const status: JobStatus = await res.json();
        setJobStatus(status);

        if (status.status === 'done') {
          if (pollRef.current) clearInterval(pollRef.current);
          // Fetch full data
          const dataRes = await fetch(`/api/job/${jid}/data`);
          const fullData = await dataRes.json();

          const actas = fullData.actas?.length ?? 0;
          const players = Object.keys(fullData.team_intelligence?.players ?? {}).length;
          const accuracy = fullData.validation?.accuracy_pct ?? 0;
          setDoneMetrics({ actas, players, accuracy });
          setStep('done');

          setTimeout(() => {
            onComplete({
              team: teamInput,
              teamName: searchResult?.team_name ?? teamInput,
              season: searchResult?.season ?? season,
              competition: searchResult?.competition ?? '',
              competitionName: searchResult?.competition_name ?? '',
              group: searchResult?.group ?? '',
              tier: searchResult?.tier ?? 0,
              jobId: jid,
              data: fullData,
            });
          }, 2200);
        } else if (status.status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current);
          setErrorMsg(status.error ?? 'Error desconocido');
          setStep('error');
        }
      } catch (e) {
        // network error — keep trying
      }
    }, 1500);
  }, [teamInput, searchResult, season, onComplete]);

  // ── Handlers ──
  const handleLoadSaved = async () => {
    if (!savedInfo) return;
    setStep('loading-saved');
    try {
      const res = await fetch('/api/team/saved');
      const fullData = await res.json();
      const actas = fullData.actas?.length ?? 0;
      const players = Object.keys(fullData.team_intelligence?.players ?? {}).length;
      const accuracy = fullData.validation?.accuracy_pct ?? 0;
      setDoneMetrics({ actas, players, accuracy });
      setStep('done');
      setTimeout(() => {
        onComplete({
          team: savedInfo.team_name,
          teamName: savedInfo.team_name,
          season: savedInfo.season,
          competition: savedInfo.competition,
          competitionName: savedInfo.competition_name,
          group: savedInfo.group,
          tier: savedInfo.tier,
          jobId: 'saved',
          data: fullData,
        });
      }, 1200);
    } catch {
      setErrorMsg('No se pudo cargar los datos guardados.');
      setStep('error');
    }
  };

  const handleSearch = async () => {
    if (!teamInput.trim()) return;
    setStep('searching');
    setCompIndex(0);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: teamInput.trim(), season }),
      });
      const data: SearchResult = await res.json();
      setSearchResult(data);
      if (data.found) {
        setStep('confirm');
      } else {
        setErrorMsg(`No se encontró "${teamInput}" en ninguna competición de Futbol 11 para la temporada ${season === '2526' ? '2025-26' : '2024-25'}. Prueba con un nombre más corto o sin acentos.`);
        setStep('error');
      }
    } catch (e) {
      setErrorMsg('No se pudo conectar con la API. ¿Está corriendo el servidor Python?');
      setStep('error');
    }
  };

  const handleStartScrape = async () => {
    if (!searchResult?.found) return;
    setStep('scraping');
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team: searchResult.team_name,
          season,
          competition: searchResult.competition,
          group: searchResult.group,
        }),
      });
      const { job_id } = await res.json();
      setJobId(job_id);
      startPolling(job_id);
    } catch (e) {
      setErrorMsg('No se pudo iniciar el scraping. ¿Está corriendo el servidor Python?');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('search');
    setSearchResult(null);
    setJobId(null);
    setJobStatus(null);
    setErrorMsg('');
  };

  const progress = jobStatus?.progress ?? 0;
  const seasonLabel = season === '2526' ? '2025-26' : '2024-25';

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '100%', height: '100%', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', bottom: '-100px', left: '-100px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '-50px', right: '-50px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ═══ WELCOME ═══════════════════════════════════════════════════════ */}
      {step === 'welcome' && (
        <GlowCard>
          {/* Ball with pulse */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(16,185,129,0.1)',
              animation: 'fcf-pulse-glow 2.5s ease-in-out infinite',
              marginBottom: '1.5rem',
            }}>
              <span style={{ fontSize: '2.5rem' }}>⚽</span>
            </div>

            <h2 style={{
              fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem',
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', letterSpacing: '-0.5px', lineHeight: 1.2,
            }}>
              Conecta tu equipo FCF
            </h2>

            <p style={{ color: 'rgba(148,163,184,0.9)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '1.75rem' }}>
              Introduce tu equipo y recibirás análisis en tiempo real de tu liga, rivales y plantilla. Datos directos de <span style={{ color: '#06b6d4', fontWeight: 600 }}>fcf.cat</span>.
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
              {['🏅 14 competicions F11', '📋 Actes en temps real', '🎯 Scouting de rivals'].map(f => (
                <span key={f} style={{
                  padding: '0.35rem 0.75rem',
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: '2rem',
                  fontSize: '0.75rem',
                  color: '#10b981',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}>
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Saved data shortcut */}
          {savedInfo && (
            <div style={{ marginBottom: '0.75rem' }}>
              <button
                onClick={handleLoadSaved}
                style={{
                  width: '100%', padding: '0.75rem 1.25rem', borderRadius: '0.75rem',
                  border: '1px solid rgba(16,185,129,0.4)',
                  background: 'rgba(16,185,129,0.08)',
                  color: 'white', fontSize: '0.875rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.14)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.7)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#10b981' }}>⚡ Cargar datos guardados</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(148,163,184,0.7)', marginTop: '0.1rem' }}>
                    {savedInfo.team_name} · {savedInfo.competition_name}
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.5)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {savedInfo.scraped_at ? new Date(savedInfo.scraped_at).toLocaleDateString('es-ES') : ''}
                </div>
              </button>
              <p style={{ textAlign: 'center', color: 'rgba(148,163,184,0.35)', fontSize: '0.7rem', marginTop: '0.4rem' }}>
                — o busca otro equipo —
              </p>
            </div>
          )}

          <GradientButton onClick={() => setStep('search')}>
            <Search size={18} /> Buscar mi equipo
          </GradientButton>

          <p style={{ textAlign: 'center', color: 'rgba(148,163,184,0.4)', fontSize: '0.72rem', marginTop: '1rem' }}>
            Solo Futbol 11 · Temporada 2025-26 y 2024-25
          </p>
        </GlowCard>
      )}

      {/* ═══ SEARCH ════════════════════════════════════════════════════════ */}
      {step === 'search' && (
        <GlowCard>
          <button
            onClick={() => setStep('welcome')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'none', border: 'none', color: 'rgba(148,163,184,0.6)',
              fontSize: '0.8rem', cursor: 'pointer', padding: '0 0 1.5rem 0',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.6)')}
          >
            <ArrowLeft size={14} /> Volver
          </button>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.3px' }}>
            ¿Cómo se llama tu equipo?
          </h2>
          <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
            Buscaremos en las 14 competicions de Futbol 11 de la FCF
          </p>

          {/* Input */}
          <input
            ref={inputRef}
            value={teamInput}
            onChange={e => setTeamInput(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={e => e.key === 'Enter' && teamInput.trim() && handleSearch()}
            placeholder="Racing Vallbona, CE Badalona, AE Prat..."
            style={{
              width: '100%',
              padding: '1rem 1.25rem',
              borderRadius: '0.75rem',
              border: `2px solid ${inputFocused ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}`,
              background: 'rgba(0,0,0,0.3)',
              color: 'white',
              fontSize: '1.05rem',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxShadow: inputFocused ? '0 0 0 3px rgba(16,185,129,0.1)' : 'none',
              marginBottom: '1rem',
              boxSizing: 'border-box',
            }}
          />

          {/* Season toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(148,163,184,0.7)', whiteSpace: 'nowrap' }}>Temporada:</span>
            {[{ v: '2526', l: '2025-26' }, { v: '2425', l: '2024-25' }].map(s => (
              <button
                key={s.v}
                onClick={() => setSeason(s.v)}
                style={{
                  padding: '0.35rem 0.875rem',
                  borderRadius: '2rem',
                  border: `1px solid ${season === s.v ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.1)'}`,
                  background: season === s.v ? 'rgba(16,185,129,0.12)' : 'transparent',
                  color: season === s.v ? '#10b981' : 'rgba(148,163,184,0.7)',
                  fontSize: '0.8rem',
                  fontWeight: season === s.v ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {s.l}
              </button>
            ))}
          </div>

          <GradientButton onClick={handleSearch} disabled={!teamInput.trim()}>
            <Search size={18} /> Buscar →
          </GradientButton>

          <p style={{ textAlign: 'center', color: 'rgba(148,163,184,0.35)', fontSize: '0.72rem', marginTop: '0.875rem' }}>
            Pulsa Enter para buscar
          </p>
        </GlowCard>
      )}

      {/* ═══ SEARCHING ═════════════════════════════════════════════════════ */}
      {step === 'searching' && (
        <GlowCard style={{ textAlign: 'center' }}>
          {/* Radar rings */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {[0, 0.6, 1.2].map(delay => (
              <div key={delay} style={{
                position: 'absolute',
                width: 70, height: 70, borderRadius: '50%',
                border: '2px solid rgba(16,185,129,0.4)',
                animation: `fcf-radar-ring 2.4s ease-out ${delay}s infinite`,
              }} />
            ))}
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(16,185,129,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1,
            }}>
              <Loader2 size={28} color="#10b981" className="fcf-spin" />
            </div>
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Buscando "{teamInput}"...
          </h2>
          <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
            Comprobando las 14 competicions...
          </p>

          {/* Competition ticker */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '0.625rem',
            padding: '0.875rem 1.25rem',
            marginBottom: '1.25rem',
            minHeight: '52px',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px rgba(16,185,129,0.8)',
              flexShrink: 0,
              animation: 'fcf-spin 1s ease-in-out infinite',
            }} />
            <span key={compIndex} style={{
              fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)',
              animation: 'fcf-ticker 1.2s ease forwards',
            }}>
              {COMPETITIONS[compIndex]}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center', marginBottom: '1rem' }}>
            {COMPETITIONS.map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i <= compIndex ? '#10b981' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          <p style={{ color: 'rgba(148,163,184,0.45)', fontSize: '0.72rem' }}>
            Suele tardar 15-30 segundos
          </p>
        </GlowCard>
      )}

      {/* ═══ CONFIRM ═══════════════════════════════════════════════════════ */}
      {step === 'confirm' && searchResult?.found && (
        <GlowCard>
          {/* Success icon */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
              <div style={{
                position: 'absolute', inset: -8, borderRadius: '50%',
                border: '2px solid rgba(16,185,129,0.4)',
                animation: 'fcf-success-ring 1.5s ease-out 0.3s both',
              }} />
              <CheckCircle2 size={52} color="#10b981" className="fcf-check" />
            </div>

            <div style={{
              display: 'inline-block',
              padding: '0.3rem 0.875rem',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '2rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#10b981',
              marginBottom: '0.875rem',
              letterSpacing: '0.3px',
            }}>
              EQUIP TROBAT · NIVELL {searchResult.tier}
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '0.25rem' }}>
              {searchResult.team_name}
            </h2>
          </div>

          {/* Info rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.75rem' }}>
            <InfoRow icon="🏆" label="Competició" value={searchResult.competition_name ?? ''} />
            <InfoRow icon="👥" label="Grup" value={(searchResult.group ?? '').replace('grup-', 'Grup ').replace('grup-unic', 'Únic')} />
            <InfoRow icon="📅" label="Temporada" value={seasonLabel} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <GradientButton onClick={handleStartScrape}>
              <Zap size={18} /> Iniciar anàlisi complet
            </GradientButton>
            <GhostButton onClick={() => setStep('search')}>
              <X size={14} /> No és el meu equip — tornar a buscar
            </GhostButton>
          </div>
        </GlowCard>
      )}

      {/* ═══ SCRAPING ══════════════════════════════════════════════════════ */}
      {step === 'scraping' && (
        <GlowCard style={{ maxWidth: 520 }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span className="fcf-ball" style={{ fontSize: '2.5rem', display: 'inline-block', marginBottom: '1rem' }}>⚽</span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.4rem' }}>
              Descarregant dades de FCF...
            </h2>
            <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.82rem', minHeight: '1.2em' }}>
              {jobStatus?.step ?? 'Inicialitzant...'}
            </p>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(148,163,184,0.6)' }}>Progrés</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>{progress}%</span>
            </div>
            <div style={{
              height: 10, borderRadius: 5,
              background: 'rgba(255,255,255,0.05)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: 5,
                background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                transition: 'width 0.8s ease',
                backgroundSize: '200% auto',
                animation: 'fcf-progress-shimmer 2s linear infinite',
              }} />
            </div>
          </div>

          {/* Actas count */}
          {(jobStatus?.actas_total ?? 0) > 0 && (
            <div style={{
              textAlign: 'center',
              padding: '0.5rem',
              background: 'rgba(16,185,129,0.06)',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              border: '1px solid rgba(16,185,129,0.1)',
            }}>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                Actes processades: {jobStatus?.actas_done ?? 0} / {jobStatus?.actas_total ?? 0}
              </span>
            </div>
          )}

          {/* Pipeline steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {PIPELINE_STEPS.map((ps, i) => {
              const done = progress >= ps.threshold;
              const active = !done && (i === 0 || progress >= PIPELINE_STEPS[i - 1].threshold);
              return (
                <div key={ps.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0.875rem',
                  borderRadius: '0.5rem',
                  background: done ? 'rgba(16,185,129,0.06)' : active ? 'rgba(255,255,255,0.03)' : 'transparent',
                  border: `1px solid ${done ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)'}`,
                  transition: 'all 0.4s',
                }}>
                  {done
                    ? <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                    : active
                      ? <Loader2 size={16} color="#06b6d4" className="fcf-spin" style={{ flexShrink: 0 }} />
                      : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                  }
                  <span style={{
                    fontSize: '0.8rem',
                    color: done ? '#10b981' : active ? 'white' : 'rgba(148,163,184,0.4)',
                    fontWeight: active || done ? 600 : 400,
                    transition: 'color 0.3s',
                  }}>
                    {ps.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.72rem' }}>
              Normalment tarda 2-4 minuts. No tanquis aquesta finestra.
            </p>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700,
              color: 'rgba(148,163,184,0.5)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </span>
          </div>
        </GlowCard>
      )}

      {/* ═══ DONE ══════════════════════════════════════════════════════════ */}
      {step === 'done' && (
        <GlowCard style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.25rem' }}>
            {[0, 0.3, 0.6].map(d => (
              <div key={d} style={{
                position: 'absolute', inset: -12, borderRadius: '50%',
                border: '2px solid rgba(16,185,129,0.3)',
                animation: `fcf-success-ring 1.5s ease-out ${d}s both`,
              }} />
            ))}
            <CheckCircle2 size={64} color="#10b981" className="fcf-check" />
          </div>

          <h2 style={{
            fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            ¡Anàlisi completat!
          </h2>
          <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Carregant el teu dashboard...
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            {[
              { v: doneMetrics.actas, l: 'actes' },
              { v: doneMetrics.players, l: 'jugadors' },
              { v: `${doneMetrics.accuracy.toFixed(0)}%`, l: 'precisió' },
            ].map(m => (
              <div key={m.l} style={{
                flex: 1,
                padding: '0.75rem',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.15)',
                borderRadius: '0.75rem',
              }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{m.v}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.6)' }}>{m.l}</div>
              </div>
            ))}
          </div>
        </GlowCard>
      )}

      {/* ═══ LOADING SAVED ════════════════════════════════════════════════ */}
      {step === 'loading-saved' && (
        <GlowCard style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', marginBottom: '1.5rem', animation: 'fcf-pulse-glow 2s ease-in-out infinite' }}>
            <Loader2 size={32} color="#10b981" className="fcf-spin" />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>Cargando datos guardados...</h2>
          <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.85rem' }}>
            {savedInfo?.team_name}
          </p>
        </GlowCard>
      )}

      {/* ═══ ERROR ═════════════════════════════════════════════════════════ */}
      {step === 'error' && (
        <GlowCard>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              marginBottom: '1rem',
            }}>
              <AlertCircle size={28} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              {searchResult && !searchResult.found ? 'Equip no trobat' : 'Error al descarregar'}
            </h2>
          </div>

          <div style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: '0.625rem',
            padding: '0.875rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.82rem',
            color: 'rgba(255,200,200,0.8)',
            lineHeight: 1.6,
          }}>
            {errorMsg}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <GradientButton onClick={handleRetry}>
              <RotateCcw size={16} /> Tornar a cercar
            </GradientButton>
            <GhostButton onClick={() => setStep('welcome')}>
              Tornar a l'inici
            </GhostButton>
          </div>
        </GlowCard>
      )}
    </div>
  );
}
