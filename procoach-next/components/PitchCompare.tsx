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

interface PitchSVGProps {
  length_m: number
  width_m: number
  /** Rendered height in px — width scales proportionally */
  renderHeight: number
}

function PitchSVG({ length_m, width_m, renderHeight }: PitchSVGProps) {
  // Pitch is drawn portrait: length runs vertically, width horizontally
  const scale = renderHeight / length_m
  const W = Math.round(width_m * scale)
  const H = renderHeight

  // Field markings in metres
  const penaltyDepth = 16.5 * scale
  const penaltyWidth = 40.32 * scale
  const goalAreaDepth = 5.5 * scale
  const goalAreaWidth = 18.32 * scale
  const centerRadius = 9.15 * scale

  const cx = W / 2
  const cy = H / 2

  // Penalty area X offset (centred on pitch)
  const penaltyX = (W - penaltyWidth) / 2
  const goalAreaX = (W - goalAreaWidth) / 2

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {/* Pitch background */}
      <rect x={0} y={0} width={W} height={H} fill="#15803d" rx={2} />

      {/* Subtle stripe pattern */}
      {Array.from({ length: Math.ceil(H / (10 * scale)) }).map((_, i) => (
        <rect
          key={i}
          x={0}
          y={i * 10 * scale * 2}
          width={W}
          height={10 * scale}
          fill="rgba(0,0,0,0.06)"
        />
      ))}

      {/* Pitch border */}
      <rect x={1} y={1} width={W - 2} height={H - 2} fill="none" stroke="white" strokeWidth={1.5} />

      {/* Halfway line */}
      <line x1={0} y1={cy} x2={W} y2={cy} stroke="white" strokeWidth={1} />

      {/* Centre circle */}
      <circle cx={cx} cy={cy} r={centerRadius} fill="none" stroke="white" strokeWidth={1} />

      {/* Centre spot */}
      <circle cx={cx} cy={cy} r={2} fill="white" />

      {/* Top penalty area */}
      <rect
        x={penaltyX}
        y={0}
        width={penaltyWidth}
        height={penaltyDepth}
        fill="none"
        stroke="white"
        strokeWidth={1}
      />
      {/* Top goal area */}
      <rect
        x={goalAreaX}
        y={0}
        width={goalAreaWidth}
        height={goalAreaDepth}
        fill="none"
        stroke="white"
        strokeWidth={1}
      />
      {/* Top penalty spot */}
      <circle cx={cx} cy={11 * scale} r={1.5} fill="white" />

      {/* Bottom penalty area */}
      <rect
        x={penaltyX}
        y={H - penaltyDepth}
        width={penaltyWidth}
        height={penaltyDepth}
        fill="none"
        stroke="white"
        strokeWidth={1}
      />
      {/* Bottom goal area */}
      <rect
        x={goalAreaX}
        y={H - goalAreaDepth}
        width={goalAreaWidth}
        height={goalAreaDepth}
        fill="none"
        stroke="white"
        strokeWidth={1}
      />
      {/* Bottom penalty spot */}
      <circle cx={cx} cy={H - 11 * scale} r={1.5} fill="white" />
    </svg>
  )
}

export function PitchCompare({
  homePitch,
  rivalPitch,
  homeTeamName,
  rivalTeamName,
}: PitchCompareProps) {
  const SVG_HEIGHT = 110

  // Scale: longest pitch fills SVG_HEIGHT, other scales proportionally
  const maxLength = Math.max(
    homePitch?.length_m ?? 0,
    rivalPitch?.length_m ?? 0,
    1,
  )
  const scale = SVG_HEIGHT / maxLength

  const homeArea = homePitch ? homePitch.length_m * homePitch.width_m : null
  const rivalArea = rivalPitch ? rivalPitch.length_m * rivalPitch.width_m : null

  let diffMsg: string | null = null
  if (homeArea && rivalArea) {
    const pct = Math.round(Math.abs(rivalArea - homeArea) / homeArea * 100)
    if (pct === 0) {
      diffMsg = 'Els dos camps tenen la mateixa mida'
    } else if (rivalArea < homeArea) {
      diffMsg = `El camp del rival és ${pct}% més petit`
    } else {
      diffMsg = `El camp del rival és ${pct}% més gran`
    }
  }

  function PitchSlot({
    pitch,
    label,
    teamName,
  }: {
    pitch: FieldDims | null
    label: string
    teamName: string
  }) {
    if (!pitch) {
      return (
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
          <div
            className="flex items-center justify-center rounded bg-white/5 border border-white/10"
            style={{ width: 60, height: SVG_HEIGHT }}
          >
            <span className="text-[9px] text-slate-600 text-center px-1 leading-tight">Sense dades del camp</span>
          </div>
          <p className="text-[10px] text-slate-600 text-center max-w-[90px] leading-tight truncate">{teamName}</p>
        </div>
      )
    }

    const renderH = Math.round(pitch.length_m * scale)
    const area = pitch.length_m * pitch.width_m
    const cat = fieldCategory(area)

    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
        <div
          className="flex items-end justify-center"
          style={{ height: SVG_HEIGHT }}
        >
          <PitchSVG
            length_m={pitch.length_m}
            width_m={pitch.width_m}
            renderHeight={renderH}
          />
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-white tabular-nums">
            {pitch.length_m}×{pitch.width_m} m
          </p>
          <p className="text-[10px] text-slate-400 tabular-nums">{area.toLocaleString('ca-ES')} m²</p>
          <span className={`inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>
            {cat.label}
          </span>
          {pitch.field_name && (
            <p className="text-[9px] text-slate-600 mt-1 max-w-[90px] truncate" title={pitch.field_name}>
              {pitch.field_name}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        {/* BarChart2 icon as inline SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-cyan-400"
          aria-hidden="true"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
          <line x1="2" y1="20" x2="22" y2="20" />
        </svg>
        <h3 className="font-bold text-white text-sm">Comparativa de Camps</h3>
      </div>

      {/* Pitch grid */}
      <div className="flex justify-around items-start gap-4">
        <PitchSlot pitch={homePitch} label="El teu camp" teamName={homeTeamName} />
        <div className="flex items-center self-center pt-4">
          <span className="text-slate-600 text-xs font-bold">VS</span>
        </div>
        <PitchSlot pitch={rivalPitch} label="Camp del rival" teamName={rivalTeamName} />
      </div>

      {/* Difference message */}
      {diffMsg && (
        <div className="mt-4 pt-3 border-t border-white/5 text-center">
          <p className="text-xs text-slate-400">{diffMsg}</p>
        </div>
      )}

      {(!homePitch || !rivalPitch) && (
        <div className="mt-3 pt-3 border-t border-white/5 text-center">
          <p className="text-[11px] text-slate-600">
            Dades de camp no disponibles per a {!homePitch ? homeTeamName : rivalTeamName}
          </p>
        </div>
      )}
    </div>
  )
}
