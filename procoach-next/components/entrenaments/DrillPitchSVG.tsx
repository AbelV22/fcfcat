'use client'

interface DrillPitchSVGProps {
  mode?: 'full' | 'half'
  width?: number
  height?: number
  children?: React.ReactNode
  onClick?: (e: React.MouseEvent<SVGSVGElement>) => void
  onPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void
  onPointerMove?: (e: React.PointerEvent<SVGSVGElement>) => void
  onPointerUp?: (e: React.PointerEvent<SVGSVGElement>) => void
  className?: string
  style?: React.CSSProperties
  interactive?: boolean
}

const FULL_W = 340
const FULL_H = 520
const HALF_W = 340
const HALF_H = 280

export default function DrillPitchSVG({
  mode = 'full',
  children,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  className = '',
  style,
  interactive = false,
}: DrillPitchSVGProps) {
  const W = mode === 'full' ? FULL_W : HALF_W
  const H = mode === 'full' ? FULL_H : HALF_H
  const M = 10 // margin

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      style={{ width: '100%', touchAction: interactive ? 'none' : undefined, ...style }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Pitch background */}
      <rect x={0} y={0} width={W} height={H} fill="#1a472a" rx={4} />

      {/* Grass stripes */}
      {Array.from({ length: mode === 'full' ? 8 : 4 }).map((_, i) => (
        <rect
          key={i}
          x={M}
          y={M + i * ((H - M * 2) / (mode === 'full' ? 8 : 4))}
          width={W - M * 2}
          height={(H - M * 2) / (mode === 'full' ? 8 : 4)}
          fill={i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'}
        />
      ))}

      {/* Boundary */}
      <rect
        x={M} y={M} width={W - M * 2} height={H - M * 2}
        fill="none" stroke="#2d6b3f" strokeWidth={1.5}
      />

      {mode === 'full' ? (
        <>
          {/* Center line */}
          <line x1={M} y1={H / 2} x2={W - M} y2={H / 2} stroke="#2d6b3f" strokeWidth={1.5} />
          {/* Center circle */}
          <circle cx={W / 2} cy={H / 2} r={45} fill="none" stroke="#2d6b3f" strokeWidth={1.5} />
          <circle cx={W / 2} cy={H / 2} r={3} fill="#2d6b3f" />

          {/* Top penalty area */}
          <rect x={W / 2 - 80} y={M} width={160} height={65} fill="none" stroke="#2d6b3f" strokeWidth={1.5} />
          <rect x={W / 2 - 35} y={M} width={70} height={25} fill="none" stroke="#2d6b3f" strokeWidth={1.5} />
          <circle cx={W / 2} cy={M + 50} r={3} fill="#2d6b3f" />
          <path d={`M ${W / 2 - 35} ${M + 65} A 35 35 0 0 0 ${W / 2 + 35} ${M + 65}`} fill="none" stroke="#2d6b3f" strokeWidth={1.5} />

          {/* Bottom penalty area */}
          <rect x={W / 2 - 80} y={H - M - 65} width={160} height={65} fill="none" stroke="#2d6b3f" strokeWidth={1.5} />
          <rect x={W / 2 - 35} y={H - M - 25} width={70} height={25} fill="none" stroke="#2d6b3f" strokeWidth={1.5} />
          <circle cx={W / 2} cy={H - M - 50} r={3} fill="#2d6b3f" />
          <path d={`M ${W / 2 - 35} ${H - M - 65} A 35 35 0 0 1 ${W / 2 + 35} ${H - M - 65}`} fill="none" stroke="#2d6b3f" strokeWidth={1.5} />
        </>
      ) : (
        <>
          {/* Half pitch: bottom line is center, top has penalty area */}
          <circle cx={W / 2} cy={H - M} r={45} fill="none" stroke="#2d6b3f" strokeWidth={1.5} />
          <circle cx={W / 2} cy={H - M} r={3} fill="#2d6b3f" />

          {/* Top penalty area */}
          <rect x={W / 2 - 80} y={M} width={160} height={65} fill="none" stroke="#2d6b3f" strokeWidth={1.5} />
          <rect x={W / 2 - 35} y={M} width={70} height={25} fill="none" stroke="#2d6b3f" strokeWidth={1.5} />
          <circle cx={W / 2} cy={M + 50} r={3} fill="#2d6b3f" />
          <path d={`M ${W / 2 - 35} ${M + 65} A 35 35 0 0 0 ${W / 2 + 35} ${M + 65}`} fill="none" stroke="#2d6b3f" strokeWidth={1.5} />
        </>
      )}

      {/* Player gradient definition */}
      <defs>
        <linearGradient id="playerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#22c55e" stopOpacity={0.9} />
        </linearGradient>
        <linearGradient id="opponentGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#f97316" stopOpacity={0.9} />
        </linearGradient>
      </defs>

      {children}
    </svg>
  )
}

/** Convert client coords to SVG-relative coords (0-1 range) */
export function clientToSVG(
  e: React.PointerEvent | React.MouseEvent,
  svgEl: SVGSVGElement,
  mode: 'full' | 'half' = 'full',
): { x: number; y: number } {
  const rect = svgEl.getBoundingClientRect()
  const W = mode === 'full' ? FULL_W : HALF_W
  const H = mode === 'full' ? FULL_H : HALF_H
  const svgX = ((e.clientX - rect.left) / rect.width) * W
  const svgY = ((e.clientY - rect.top) / rect.height) * H
  return {
    x: Math.max(0, Math.min(W, svgX)),
    y: Math.max(0, Math.min(H, svgY)),
  }
}

export { FULL_W, FULL_H, HALF_W, HALF_H }
