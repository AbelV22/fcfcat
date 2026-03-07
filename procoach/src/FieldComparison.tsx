import fieldsData from './data/fields.json';

// ─── Field lookup ─────────────────────────────────────────────────────────────
function normalizeTeam(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

interface FieldVenue {
  field_name: string | null;
  fcf_venue: string | null;
  city: string | null;
  length_m: number | null;
  width_m: number | null;
}

function lookupField(teamName: string): FieldVenue | null {
  const venues = (fieldsData as any).team_venues as Record<string, FieldVenue>;
  if (venues[teamName]) return venues[teamName];
  const norm = normalizeTeam(teamName);
  for (const [key, val] of Object.entries(venues)) {
    if (normalizeTeam(key) === norm) return val;
  }
  for (const [key, val] of Object.entries(venues)) {
    const words = norm.split(' ').filter(w => w.length > 4);
    if (words.length > 0 && words.every(w => normalizeTeam(key).includes(w))) return val;
  }
  return null;
}

// ─── SVG Pitch ────────────────────────────────────────────────────────────────
const GREEN = '#10b981';
const CYAN = '#06b6d4';

interface PitchProps {
  cx: number; cy: number;
  l: number; w: number;        // SVG dimensions (already scaled)
  scale: number;               // px per real meter (for markings)
  color: string;
  zIndex?: 'back' | 'front';
}

function PitchShape({ cx, cy, l, w, scale, color, zIndex = 'back' }: PitchProps) {
  const x0 = cx - l / 2, y0 = cy - w / 2;
  const x1 = cx + l / 2, y1 = cy + w / 2;

  // FIFA standard markings (in meters → scaled)
  const paDepth = 16.5 * scale;   // penalty area depth
  const paWidth = 40.32 * scale;  // penalty area width
  const gaDepth = 5.5 * scale;    // goal area depth
  const gaWidth = 18.32 * scale;  // goal area width
  const ccR = 9.15 * scale;       // center circle radius
  const penX = 11 * scale;        // penalty spot distance

  const isFront = zIndex === 'front';
  const strokeW = isFront ? 2.5 : 1.8;
  const strokeOp = isFront ? 0.95 : 0.65;
  const fillOp = isFront ? 0.12 : 0.05;
  const markOp = strokeOp * 0.55;

  return (
    <g>
      {/* Fill */}
      <rect x={x0} y={y0} width={l} height={w} fill={color} fillOpacity={fillOp} rx={3} />

      {/* Main outline */}
      <rect x={x0} y={y0} width={l} height={w} fill="none"
        stroke={color} strokeOpacity={strokeOp} strokeWidth={strokeW} rx={3} />

      {/* Center line */}
      <line x1={cx} y1={y0} x2={cx} y2={y1}
        stroke={color} strokeOpacity={markOp} strokeWidth={1.2} />

      {/* Center circle */}
      <circle cx={cx} cy={cy} r={ccR}
        fill="none" stroke={color} strokeOpacity={markOp} strokeWidth={1} />
      <circle cx={cx} cy={cy} r={3}
        fill={color} fillOpacity={strokeOp} />

      {/* Left penalty area */}
      <rect x={x0} y={cy - paWidth / 2} width={paDepth} height={paWidth}
        fill="none" stroke={color} strokeOpacity={markOp} strokeWidth={0.8} />
      {/* Left goal area */}
      <rect x={x0} y={cy - gaWidth / 2} width={gaDepth} height={gaWidth}
        fill="none" stroke={color} strokeOpacity={markOp * 0.8} strokeWidth={0.7} />
      {/* Left penalty spot */}
      <circle cx={x0 + penX} cy={cy} r={2}
        fill={color} fillOpacity={strokeOp * 0.6} />

      {/* Right penalty area */}
      <rect x={x1 - paDepth} y={cy - paWidth / 2} width={paDepth} height={paWidth}
        fill="none" stroke={color} strokeOpacity={markOp} strokeWidth={0.8} />
      {/* Right goal area */}
      <rect x={x1 - gaDepth} y={cy - gaWidth / 2} width={gaDepth} height={gaWidth}
        fill="none" stroke={color} strokeOpacity={markOp * 0.8} strokeWidth={0.7} />
      {/* Right penalty spot */}
      <circle cx={x1 - penX} cy={cy} r={2}
        fill={color} fillOpacity={strokeOp * 0.6} />

      {/* Corner arcs (small) */}
      {[
        { x: x0, y: y0, sweep: '1' },
        { x: x1, y: y0, sweep: '1' },
        { x: x0, y: y1, sweep: '1' },
        { x: x1, y: y1, sweep: '1' },
      ].map(({ x, y }, i) => {
        const r = 4 * scale;
        const sx = i % 2 === 0 ? x + r : x - r;
        const sy = i < 2 ? y : y;
        const ex = i % 2 === 0 ? x : x;
        const ey = i < 2 ? y + r : y - r;
        return (
          <path
            key={i}
            d={`M ${sx} ${sy} A ${r} ${r} 0 0 ${i % 2 === 0 ? (i < 2 ? '0' : '1') : (i < 2 ? '1' : '0')} ${ex} ${ey}`}
            fill="none"
            stroke={color}
            strokeOpacity={markOp * 0.7}
            strokeWidth={0.7}
          />
        );
      })}
    </g>
  );
}

// ─── Tactical insight generator ───────────────────────────────────────────────
function getTacticalInsights(
  ourL: number, ourW: number,
  rivalL: number, rivalW: number,
): { icon: string; text: string; sub: string; color: string }[] {
  const insights: { icon: string; text: string; sub: string; color: string }[] = [];
  const dL = rivalL - ourL;  // positive = rival longer
  const dW = rivalW - ourW;  // positive = rival wider

  // Width insights
  if (dW <= -5) {
    insights.push({ icon: '⟺', text: 'Campo rival significativamente más estrecho', sub: `${Math.abs(dW)}m menos de ancho. Menor espacio en bandas, juego más centralizado y físico. La presión alta y el juego directo ganan protagonismo.`, color: '#f59e0b' });
  } else if (dW <= -2) {
    insights.push({ icon: '⟺', text: 'Campo rival algo más estrecho', sub: `${Math.abs(dW)}m menos de ancho. Jugadas combinativas por dentro tienen más impacto. Extremos con menos espacio.`, color: '#f59e0b' });
  } else if (dW >= 5) {
    insights.push({ icon: '⟺', text: 'Campo rival significativamente más ancho', sub: `${dW}m más de ancho. Más espacio para bandas y centros. Los equipos atléticos y con buenas llegadas laterales se benefician.`, color: '#06b6d4' });
  } else if (dW >= 2) {
    insights.push({ icon: '⟺', text: 'Campo rival algo más ancho', sub: `${dW}m más de ancho. Ligeramente más espacio en bandas.`, color: '#06b6d4' });
  }

  // Length insights
  if (dL <= -5) {
    insights.push({ icon: '↕', text: 'Campo rival significativamente más corto', sub: `${Math.abs(dL)}m menos de largo. Transiciones más cortas, la presión alta es más efectiva. Menos desgaste para defensas con pelota.`, color: '#f59e0b' });
  } else if (dL >= 5) {
    insights.push({ icon: '↕', text: 'Campo rival significativamente más largo', sub: `${dL}m más de largo. Mayor desgaste físico, más espacio en profundidad para los delanteros. El pressing constante es más exigente.`, color: '#06b6d4' });
  }

  // Area difference
  const ourArea = ourL * ourW;
  const rivalArea = rivalL * rivalW;
  const pctDiff = Math.round((rivalArea / ourArea - 1) * 100);
  if (Math.abs(pctDiff) >= 8) {
    const bigger = pctDiff > 0;
    insights.push({
      icon: '▭',
      text: `Superficie total ${bigger ? 'mayor' : 'menor'} (${bigger ? '+' : ''}${pctDiff}%)`,
      sub: `${ourArea.toLocaleString()} m² (vuestro) vs ${rivalArea.toLocaleString()} m² (rival). ${bigger ? 'El campo es más grande de lo que vuestro equipo está acostumbrado.' : 'El campo es más pequeño de lo que vuestro equipo está acostumbrado.'}`,
      color: bigger ? '#06b6d4' : '#a78bfa',
    });
  }

  if (insights.length === 0) {
    insights.push({ icon: '≈', text: 'Campos similares en dimensiones', sub: 'Las diferencias son mínimas. El factor campo no debería ser determinante tácticamente.', color: '#10b981' });
  }

  return insights;
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  ourTeamName: string;
  rivalTeamName: string;
}

export default function FieldComparison({ ourTeamName, rivalTeamName }: Props) {
  const ourRaw = lookupField(ourTeamName);
  const rivalRaw = lookupField(rivalTeamName);

  const our = ourRaw?.length_m != null && ourRaw?.width_m != null ? ourRaw as FieldVenue & { length_m: number; width_m: number } : null;
  const rival = rivalRaw?.length_m != null && rivalRaw?.width_m != null ? rivalRaw as FieldVenue & { length_m: number; width_m: number } : null;

  // SVG layout
  const SVG_W = 680, SVG_H = 380;
  const PAD = 52;
  const DRAW_W = SVG_W - 2 * PAD;
  const DRAW_H = SVG_H - 2 * PAD;
  const cx = SVG_W / 2, cy = SVG_H / 2;

  const maxL = Math.max(our?.length_m ?? 90, rival?.length_m ?? 90);
  const maxW = Math.max(our?.width_m ?? 60, rival?.width_m ?? 60);
  const scale = Math.min(DRAW_W / maxL, DRAW_H / maxW);

  // Determine which to draw first (larger = back)
  const ourArea = our ? our.length_m * our.width_m : 0;
  const rivalArea = rival ? rival.length_m * rival.width_m : 0;
  const ourIsLarger = ourArea >= rivalArea;

  const ourL = our ? our.length_m * scale : 0;
  const ourW = our ? our.width_m * scale : 0;
  const rivalL = rival ? rival.length_m * scale : 0;
  const rivalW = rival ? rival.width_m * scale : 0;

  const hasComparison = our && rival;
  const insights = hasComparison ? getTacticalInsights(our.length_m, our.width_m, rival.length_m, rival.width_m) : [];

  return (
    <div style={{
      background: 'rgba(15,23,42,0.9)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '1.25rem',
      overflow: 'hidden',
      marginBottom: '1.5rem',
    }}>

      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white', letterSpacing: '0.2px' }}>
            Comparativa de Camps
          </span>
          <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.6)' }}>
            escala real
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: GREEN, opacity: 0.8, display: 'inline-block' }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ourTeamName.split(' ').slice(0, 3).join(' ')}
              {our ? ` · ${our.length_m}×${our.width_m}` : ' · Sin datos'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: CYAN, opacity: 0.8, display: 'inline-block' }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rivalTeamName.split(' ').slice(0, 3).join(' ')}
              {rival ? ` · ${rival.length_m}×${rival.width_m}` : ' · Sin datos'}
            </span>
          </div>
        </div>
      </div>

      {/* SVG comparison */}
      <div style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)' }}>
        {(our || rival) ? (
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            aria-label="Comparativa de dimensions de camp"
          >
            {/* Grid lines (background) */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width={SVG_W} height={SVG_H} fill="url(#grid)" />

            {/* Pitch shapes — larger first (background), smaller on top */}
            {hasComparison ? (
              ourIsLarger ? (
                <>
                  <PitchShape cx={cx} cy={cy} l={ourL} w={ourW} scale={scale} color={GREEN} zIndex="back" />
                  <PitchShape cx={cx} cy={cy} l={rivalL} w={rivalW} scale={scale} color={CYAN} zIndex="front" />
                </>
              ) : (
                <>
                  <PitchShape cx={cx} cy={cy} l={rivalL} w={rivalW} scale={scale} color={CYAN} zIndex="back" />
                  <PitchShape cx={cx} cy={cy} l={ourL} w={ourW} scale={scale} color={GREEN} zIndex="front" />
                </>
              )
            ) : our ? (
              <PitchShape cx={cx} cy={cy} l={ourL} w={ourW} scale={scale} color={GREEN} zIndex="front" />
            ) : rival ? (
              <PitchShape cx={cx} cy={cy} l={rivalL} w={rivalW} scale={scale} color={CYAN} zIndex="front" />
            ) : null}

            {/* Dimension arrows and labels for our team */}
            {our && (
              <>
                {/* Length arrow (top edge) */}
                <g>
                  <line
                    x1={cx - ourL / 2} y1={cy - ourW / 2 - 16}
                    x2={cx + ourL / 2} y2={cy - ourW / 2 - 16}
                    stroke={GREEN} strokeOpacity={0.7} strokeWidth={1}
                    markerStart="none" markerEnd="none"
                  />
                  <line x1={cx - ourL / 2} y1={cy - ourW / 2 - 20} x2={cx - ourL / 2} y2={cy - ourW / 2 - 12} stroke={GREEN} strokeOpacity={0.7} strokeWidth={1} />
                  <line x1={cx + ourL / 2} y1={cy - ourW / 2 - 20} x2={cx + ourL / 2} y2={cy - ourW / 2 - 12} stroke={GREEN} strokeOpacity={0.7} strokeWidth={1} />
                  <text x={cx} y={cy - ourW / 2 - 22} textAnchor="middle" fill={GREEN} fillOpacity={0.9} fontSize="11" fontWeight="700">
                    {our.length_m}m
                  </text>
                </g>
                {/* Width arrow (right edge) */}
                <g>
                  <line
                    x1={cx + ourL / 2 + 16} y1={cy - ourW / 2}
                    x2={cx + ourL / 2 + 16} y2={cy + ourW / 2}
                    stroke={GREEN} strokeOpacity={0.7} strokeWidth={1}
                  />
                  <line x1={cx + ourL / 2 + 12} y1={cy - ourW / 2} x2={cx + ourL / 2 + 20} y2={cy - ourW / 2} stroke={GREEN} strokeOpacity={0.7} strokeWidth={1} />
                  <line x1={cx + ourL / 2 + 12} y1={cy + ourW / 2} x2={cx + ourL / 2 + 20} y2={cy + ourW / 2} stroke={GREEN} strokeOpacity={0.7} strokeWidth={1} />
                  <text x={cx + ourL / 2 + 28} y={cy + 4} textAnchor="start" fill={GREEN} fillOpacity={0.9} fontSize="11" fontWeight="700">
                    {our.width_m}m
                  </text>
                </g>
              </>
            )}

            {/* Dimension labels for rival (bottom-left) */}
            {rival && hasComparison && (
              <>
                {/* Length arrow (bottom edge) */}
                <g>
                  <line
                    x1={cx - rivalL / 2} y1={cy + rivalW / 2 + 16}
                    x2={cx + rivalL / 2} y2={cy + rivalW / 2 + 16}
                    stroke={CYAN} strokeOpacity={0.7} strokeWidth={1}
                  />
                  <line x1={cx - rivalL / 2} y1={cy + rivalW / 2 + 12} x2={cx - rivalL / 2} y2={cy + rivalW / 2 + 20} stroke={CYAN} strokeOpacity={0.7} strokeWidth={1} />
                  <line x1={cx + rivalL / 2} y1={cy + rivalW / 2 + 12} x2={cx + rivalL / 2} y2={cy + rivalW / 2 + 20} stroke={CYAN} strokeOpacity={0.7} strokeWidth={1} />
                  <text x={cx} y={cy + rivalW / 2 + 34} textAnchor="middle" fill={CYAN} fillOpacity={0.9} fontSize="11" fontWeight="700">
                    {rival.length_m}m
                  </text>
                </g>
                {/* Width arrow (left edge) */}
                <g>
                  <line
                    x1={cx - rivalL / 2 - 16} y1={cy - rivalW / 2}
                    x2={cx - rivalL / 2 - 16} y2={cy + rivalW / 2}
                    stroke={CYAN} strokeOpacity={0.7} strokeWidth={1}
                  />
                  <line x1={cx - rivalL / 2 - 20} y1={cy - rivalW / 2} x2={cx - rivalL / 2 - 12} y2={cy - rivalW / 2} stroke={CYAN} strokeOpacity={0.7} strokeWidth={1} />
                  <line x1={cx - rivalL / 2 - 20} y1={cy + rivalW / 2} x2={cx - rivalL / 2 - 12} y2={cy + rivalW / 2} stroke={CYAN} strokeOpacity={0.7} strokeWidth={1} />
                  <text x={cx - rivalL / 2 - 30} y={cy + 4} textAnchor="end" fill={CYAN} fillOpacity={0.9} fontSize="11" fontWeight="700">
                    {rival.width_m}m
                  </text>
                </g>
              </>
            )}

            {/* Field name labels */}
            {our && (
              <text
                x={cx} y={cy - ourW / 2 + 18}
                textAnchor="middle" fill={GREEN} fillOpacity={0.6}
                fontSize="9.5" fontWeight="600" letterSpacing="0.5"
              >
                {our.field_name || our.fcf_venue || 'Camp propi'}
              </text>
            )}
            {rival && hasComparison && (
              <text
                x={cx} y={cy + rivalW / 2 - 10}
                textAnchor="middle" fill={CYAN} fillOpacity={0.6}
                fontSize="9.5" fontWeight="600" letterSpacing="0.5"
              >
                {rival.field_name || rival.fcf_venue || 'Camp rival'}
              </text>
            )}
          </svg>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(148,163,184,0.4)', fontSize: '0.85rem' }}>
            No hay datos de dimensiones disponibles para ninguno de los dos equipos.
          </div>
        )}
      </div>

      {/* Stats comparison table */}
      {(our || rival) && (
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Header row */}
            {[
              { label: our ? (our.field_name || 'Camp propi') : 'Camp propi', color: GREEN, align: 'left' },
              { label: 'Estadística', color: 'rgba(148,163,184,0.5)', align: 'center' },
              { label: rival ? (rival.field_name || 'Camp rival') : 'Camp rival', color: CYAN, align: 'right' },
            ].map(({ label, color, align }, i) => (
              <div key={i} style={{
                padding: '0.6rem 0.875rem',
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                fontSize: '0.72rem',
                fontWeight: 700,
                color,
                textAlign: align as any,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {label}
              </div>
            ))}

            {/* Data rows */}
            {[
              {
                stat: 'Largo',
                ourVal: our ? `${our.length_m} m` : '—',
                rivalVal: rival ? `${rival.length_m} m` : '—',
                diff: our && rival ? rival.length_m - our.length_m : null,
              },
              {
                stat: 'Ancho',
                ourVal: our ? `${our.width_m} m` : '—',
                rivalVal: rival ? `${rival.width_m} m` : '—',
                diff: our && rival ? rival.width_m - our.width_m : null,
              },
              {
                stat: 'Superfície',
                ourVal: our ? `${(our.length_m * our.width_m).toLocaleString()} m²` : '—',
                rivalVal: rival ? `${(rival.length_m * rival.width_m).toLocaleString()} m²` : '—',
                diff: our && rival ? rival.length_m * rival.width_m - our.length_m * our.width_m : null,
              },
            ].map(({ stat, ourVal, rivalVal, diff }, ri) => (
              <div key={ri} style={{ display: 'contents' }}>
                <div style={{
                  padding: '0.6rem 0.875rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'white',
                  background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  borderBottom: ri < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  textAlign: 'left',
                }}>
                  {ourVal}
                </div>
                <div style={{
                  padding: '0.6rem 0.875rem',
                  fontSize: '0.7rem',
                  color: 'rgba(148,163,184,0.5)',
                  background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  borderBottom: ri < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.1rem',
                }}>
                  <span style={{ fontWeight: 600 }}>{stat}</span>
                  {diff !== null && diff !== 0 && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: diff > 0 ? CYAN : GREEN,
                    }}>
                      {diff > 0 ? '+' : ''}{ri === 2 ? diff.toLocaleString() : diff} {ri === 2 ? 'm²' : 'm'}
                    </span>
                  )}
                  {diff === 0 && <span style={{ fontSize: '0.65rem', color: '#10b981' }}>= igual</span>}
                </div>
                <div style={{
                  padding: '0.6rem 0.875rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'white',
                  background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  borderBottom: ri < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  textAlign: 'right',
                }}>
                  {rivalVal}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tactical insights */}
      {insights.length > 0 && (
        <div style={{ padding: '0 1.5rem 1.25rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(148,163,184,0.4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '0.625rem' }}>
            Implicaciones tàctiques
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {insights.map((ins, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.625rem 0.875rem',
                background: `${ins.color}0d`,
                border: `1px solid ${ins.color}22`,
                borderRadius: '0.625rem',
                alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1.3 }}>{ins.icon}</span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: ins.color, marginBottom: '0.2rem' }}>
                    {ins.text}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'rgba(148,163,184,0.7)', lineHeight: 1.5 }}>
                    {ins.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
