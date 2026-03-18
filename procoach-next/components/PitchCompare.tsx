import type { FieldDims } from '@/lib/team-report'

interface PitchCompareProps {
  homePitch: FieldDims | null
  rivalPitch: FieldDims | null
  homeTeamName: string
  rivalTeamName: string
}

function fieldCategory(area: number): { label: string; color: string; bg: string } {
  if (area < 5500) return { label: 'Camp Petit', color: 'text-red-400', bg: 'bg-red-500/20 border border-red-500/30' }
  if (area < 6300) return { label: 'Camp Mitjà', color: 'text-amber-400', bg: 'bg-amber-500/20 border border-amber-500/30' }
  return { label: 'Camp Gran', color: 'text-green-400', bg: 'bg-green-500/20 border border-green-500/30' }
}

/** Draw one pitch worth of lines (penalty areas, halfway line, centre circle, etc.)
 *  centred inside a canvas of (canvasW × canvasH).
 *  All measurements in SVG units derived from metre-to-px scale. */
function pitchMarkings(
  length_m: number,
  width_m: number,
  scale: number,
  canvasW: number,
  canvasH: number,
  color: string,
  strokeWidth: number,
  fillColor?: string,
  fillOpacity?: number,
) {
  const pW = width_m * scale
  const pH = length_m * scale
  const ox = (canvasW - pW) / 2   // top-left X
  const oy = (canvasH - pH) / 2   // top-left Y
  const cx = canvasW / 2
  const cy = canvasH / 2

  const penD = 16.5 * scale
  const penW = Math.min(40.32 * scale, pW * 0.95)
  const goalD = 5.5 * scale
  const goalW = Math.min(18.32 * scale, pW * 0.6)
  const cr = 9.15 * scale
  const sw = strokeWidth
  const fill = fillColor ?? 'none'
  const fo = fillOpacity ?? 1

  return (
    <g>
      {/* Field fill */}
      <rect x={ox} y={oy} width={pW} height={pH} fill={fill} fillOpacity={fo} rx={2} />
      {/* Boundary */}
      <rect x={ox} y={oy} width={pW} height={pH} fill="none" stroke={color} strokeWidth={sw} />
      {/* Halfway line */}
      <line x1={ox} y1={cy} x2={ox + pW} y2={cy} stroke={color} strokeWidth={sw * 0.75} />
      {/* Centre circle */}
      <circle cx={cx} cy={cy} r={cr} fill="none" stroke={color} strokeWidth={sw * 0.75} />
      {/* Centre spot */}
      <circle cx={cx} cy={cy} r={sw * 1.2} fill={color} />
      {/* Top penalty area */}
      <rect x={cx - penW / 2} y={oy} width={penW} height={penD} fill="none" stroke={color} strokeWidth={sw * 0.75} />
      {/* Top goal area */}
      <rect x={cx - goalW / 2} y={oy} width={goalW} height={goalD} fill="none" stroke={color} strokeWidth={sw * 0.6} />
      {/* Top penalty spot */}
      <circle cx={cx} cy={oy + 11 * scale} r={sw} fill={color} />
      {/* Bottom penalty area */}
      <rect x={cx - penW / 2} y={oy + pH - penD} width={penW} height={penD} fill="none" stroke={color} strokeWidth={sw * 0.75} />
      {/* Bottom goal area */}
      <rect x={cx - goalW / 2} y={oy + pH - goalD} width={goalW} height={goalD} fill="none" stroke={color} strokeWidth={sw * 0.6} />
      {/* Bottom penalty spot */}
      <circle cx={cx} cy={oy + pH - 11 * scale} r={sw} fill={color} />
    </g>
  )
}

export function PitchCompare({
  homePitch,
  rivalPitch,
  homeTeamName,
  rivalTeamName,
}: PitchCompareProps) {
  // Nothing to show if both are missing
  if (!homePitch && !rivalPitch) return null

  // Canvas sized to the LARGER pitch so both fit
  const DISPLAY_H = 160
  const maxL = Math.max(homePitch?.length_m ?? 1, rivalPitch?.length_m ?? 1)
  const maxW = Math.max(homePitch?.width_m ?? 1, rivalPitch?.width_m ?? 1)
  const scale = Math.min(DISPLAY_H / maxL, 220 / maxW)

  const canvasH = Math.ceil(maxL * scale) + 4
  const canvasW = Math.ceil(maxW * scale) + 4

  const homeArea = homePitch ? homePitch.length_m * homePitch.width_m : null
  const rivalArea = rivalPitch ? rivalPitch.length_m * rivalPitch.width_m : null

  let diffPct = 0
  let diffMsg = ''
  let diffColor = 'text-slate-400'
  if (homeArea && rivalArea) {
    diffPct = Math.round(Math.abs(rivalArea - homeArea) / homeArea * 100)
    if (diffPct === 0) {
      diffMsg = 'Els dos camps tenen la mateixa mida'
      diffColor = 'text-slate-400'
    } else if (rivalArea < homeArea) {
      diffMsg = `El camp del rival és ${diffPct}% més petit que el vostre`
      diffColor = 'text-amber-400'
    } else {
      diffMsg = `El camp del rival és ${diffPct}% més gran que el vostre`
      diffColor = 'text-cyan-400'
    }
  }

  // Determine draw order: bigger pitch behind, smaller in front
  const homeIsBigger = (homeArea ?? 0) >= (rivalArea ?? 0)

  const homeCat = homeArea ? fieldCategory(homeArea) : null
  const rivalCat = rivalArea ? fieldCategory(rivalArea) : null

  // Stripe pattern for the grass background
  const stripeCount = Math.ceil(canvasH / 12)

  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          className="text-cyan-400" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="12" y1="3" x2="12" y2="21" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <h3 className="font-bold text-white text-sm">Comparativa de Camps</h3>
        <span className="ml-auto text-[10px] text-slate-500">a la mateixa escala</span>
      </div>

      {/* Overlay SVG */}
      <div className="flex justify-center mb-5">
        <svg
          width={canvasW}
          height={canvasH}
          viewBox={`0 0 ${canvasW} ${canvasH}`}
          style={{ maxWidth: '100%', height: 'auto' }}
          aria-label="Comparativa visual de camps"
        >
          {/* Dark background */}
          <rect width={canvasW} height={canvasH} fill="#0f172a" rx={4} />

          {/* Grass background stripes (only if we have at least one pitch) */}
          {(homePitch || rivalPitch) && Array.from({ length: stripeCount }).map((_, i) => (
            <rect key={i} x={0} y={i * 24} width={canvasW} height={12} fill="#0d2010" />
          ))}

          {homeIsBigger ? (
            <>
              {/* Home pitch BEHIND (bigger → drawn first) */}
              {homePitch && pitchMarkings(
                homePitch.length_m, homePitch.width_m, scale, canvasW, canvasH,
                '#4ade80',   // green-400
                1.5,
                '#15803d',   // green-700 fill
                0.85,
              )}
              {/* Rival pitch ON TOP (smaller → drawn second, outline only) */}
              {rivalPitch && pitchMarkings(
                rivalPitch.length_m, rivalPitch.width_m, scale, canvasW, canvasH,
                '#fb923c',   // orange-400
                2,
                '#431407',   // dark orange fill
                0.5,
              )}
            </>
          ) : (
            <>
              {/* Rival pitch BEHIND (bigger) */}
              {rivalPitch && pitchMarkings(
                rivalPitch.length_m, rivalPitch.width_m, scale, canvasW, canvasH,
                '#fb923c',   // orange-400
                1.5,
                '#431407',
                0.85,
              )}
              {/* Home pitch ON TOP (smaller) */}
              {homePitch && pitchMarkings(
                homePitch.length_m, homePitch.width_m, scale, canvasW, canvasH,
                '#4ade80',   // green-400
                2,
                '#14532d',   // dark green fill
                0.7,
              )}
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span className="text-xs text-slate-300 font-medium truncate max-w-[120px]" title={homeTeamName}>
            {homeTeamName.split(' ').slice(0, 3).join(' ')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-orange-400" />
          <span className="text-xs text-slate-300 font-medium truncate max-w-[120px]" title={rivalTeamName}>
            {rivalTeamName.split(' ').slice(0, 3).join(' ')}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 text-center">
        {/* Home */}
        <div className="bg-green-500/5 border border-green-500/15 rounded-xl px-3 py-2.5">
          {homePitch ? (
            <>
              <p className="text-xs font-black text-white tabular-nums">
                {homePitch.length_m} × {homePitch.width_m} m
              </p>
              <p className="text-[11px] text-slate-400 tabular-nums">
                {(homePitch.length_m * homePitch.width_m).toLocaleString('ca-ES')} m²
              </p>
              {homeCat && (
                <span className={`inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${homeCat.bg} ${homeCat.color}`}>
                  {homeCat.label}
                </span>
              )}
              {homePitch.field_name && (
                <p className="text-[9px] text-slate-600 mt-1 truncate" title={homePitch.field_name}>
                  {homePitch.field_name}
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-slate-600">Sense dades</p>
          )}
        </div>

        {/* Rival */}
        <div className="bg-orange-500/5 border border-orange-500/15 rounded-xl px-3 py-2.5">
          {rivalPitch ? (
            <>
              <p className="text-xs font-black text-white tabular-nums">
                {rivalPitch.length_m} × {rivalPitch.width_m} m
              </p>
              <p className="text-[11px] text-slate-400 tabular-nums">
                {(rivalPitch.length_m * rivalPitch.width_m).toLocaleString('ca-ES')} m²
              </p>
              {rivalCat && (
                <span className={`inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${rivalCat.bg} ${rivalCat.color}`}>
                  {rivalCat.label}
                </span>
              )}
              {rivalPitch.field_name && (
                <p className="text-[9px] text-slate-600 mt-1 truncate" title={rivalPitch.field_name}>
                  {rivalPitch.field_name}
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-slate-600">Sense dades</p>
          )}
        </div>
      </div>

      {/* Diff message */}
      {diffMsg && (
        <div className="mt-3 pt-3 border-t border-white/5 text-center">
          <p className={`text-xs font-semibold ${diffColor}`}>
            {diffPct > 0 ? `⚠️ ` : '✅ '}{diffMsg}
          </p>
        </div>
      )}

      {(!homePitch || !rivalPitch) && (
        <div className="mt-3 pt-3 border-t border-white/5 text-center">
          <p className="text-[11px] text-slate-600">
            Mides del camp de {!homePitch ? homeTeamName : rivalTeamName} no disponibles — afegeix-les a{' '}
            <span className="text-slate-500">/admin/camps</span>
          </p>
        </div>
      )}
    </div>
  )
}
