'use client'

/**
 * Read-only premium renderer for diagram elements.
 * Used by ExerciseDetailModal, public exercise page, ExerciseCard preview, etc.
 * Keep visuals identical to the editor but without selection/drag affordances.
 */

import type { DiagramElement } from '@/lib/training-types'

interface Props {
  elements: DiagramElement[]
}

export default function DiagramElementView({ elements }: Props) {
  return (
    <>
      {/* Shared SVG defs (gradients, filters) — scoped with unique IDs */}
      <defs>
        <linearGradient id="dev-cone-body" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor="#fb923c" />
          <stop offset="55%"  stopColor="#f97316" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <radialGradient id="dev-cone-base" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"   stopColor="#431407" />
          <stop offset="100%" stopColor="#1c0a02" />
        </radialGradient>
        <filter id="dev-elem-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
          <feOffset dx="0" dy="1.5" result="off" />
          <feMerge>
            <feMergeNode in="off" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {elements.map((el, i) => (
        <DiagramElement key={el.id || i} el={el} />
      ))}
    </>
  )
}

function DiagramElement({ el }: { el: DiagramElement }) {
  switch (el.type) {
    // ────────────────────────────── Player ──────────────────────────────
    case 'player': {
      const isA = el.team !== 'b'
      const baseColor = el.color || (isA ? '#3b82f6' : '#ef4444')
      const ox = el.x - 14
      const oy = el.y - 14
      return (
        <g filter="url(#dev-elem-shadow)">
          <g transform={`translate(${ox} ${oy})`}>
            {/* Jersey body */}
            <path
              d="M7 2 L3.5 4.5 L1.5 9 L4.5 11 L6 9.5 L6 21 Q6 22 7 22 L21 22 Q22 22 22 21 L22 9.5 L23.5 11 L26.5 9 L24.5 4.5 L21 2 L18 3.5 Q14 5.5 10 3.5 Z"
              fill={baseColor}
              stroke="rgba(0,0,0,0.55)"
              strokeWidth={1}
              strokeLinejoin="round"
            />
            {/* Collar */}
            <path d="M10 3.5 Q14 7 18 3.5" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={0.8} />
            {/* Side highlight */}
            <path d="M6 9.5 L6 21 Q6 22 7 22 L10 22 L10 9.5 Z" fill="rgba(255,255,255,0.1)" />
            {/* Number */}
            <text
              x={14} y={16}
              textAnchor="middle" dominantBaseline="middle"
              fill="#fff"
              fontSize={el.label && el.label.length > 2 ? 7 : 10}
              fontWeight={700}
              style={{ pointerEvents: 'none' }}
            >
              {el.label || '1'}
            </text>
          </g>
        </g>
      )
    }

    // ────────────────────────────── Opponent ────────────────────────────
    case 'opponent': {
      const oppColor = el.color || '#0ea5e9'
      return (
        <g filter="url(#dev-elem-shadow)">
          <circle cx={el.x} cy={el.y} r={17} fill={oppColor} stroke="rgba(0,0,0,0.45)" strokeWidth={1.5} />
          <line x1={el.x - 6} y1={el.y - 6} x2={el.x + 6} y2={el.y + 6} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={el.x + 6} y1={el.y - 6} x2={el.x - 6} y2={el.y + 6} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
        </g>
      )
    }

    // ────────────────────────────── Ball ────────────────────────────────
    case 'ball':
      return (
        <g transform={`translate(${el.x} ${el.y})`} filter="url(#dev-elem-shadow)">
          <circle r={10} fill="#f5f5f5" stroke="#111" strokeWidth={0.9} />
          <polygon points="0,-4.5 4.3,-1.4 2.6,3.6 -2.6,3.6 -4.3,-1.4" fill="#111" />
          <line x1={0} y1={-4.5} x2={0} y2={-9.5} stroke="#111" strokeWidth={0.8} />
          <line x1={4.3} y1={-1.4} x2={9} y2={-3} stroke="#111" strokeWidth={0.8} />
          <line x1={2.6} y1={3.6} x2={5.6} y2={8} stroke="#111" strokeWidth={0.8} />
          <line x1={-2.6} y1={3.6} x2={-5.6} y2={8} stroke="#111" strokeWidth={0.8} />
          <line x1={-4.3} y1={-1.4} x2={-9} y2={-3} stroke="#111" strokeWidth={0.8} />
          <circle cx={-3} cy={-4} r={2} fill="rgba(255,255,255,0.55)" />
        </g>
      )

    // ────────────────────────────── Cone (3D premium) ───────────────────
    case 'cone': {
      // Realistic training cone: tapered body with gradient, reflective white
      // stripe, elliptical base with shadow underneath.
      const cx = el.x
      const cy = el.y
      const useGradient = !el.color || el.color === '#f97316'
      const bodyFill = useGradient ? 'url(#dev-cone-body)' : el.color
      return (
        <g>
          {/* Ground shadow */}
          <ellipse cx={cx} cy={cy + 8} rx={9} ry={2.2} fill="rgba(0,0,0,0.45)" />
          {/* Base plate */}
          <ellipse cx={cx} cy={cy + 7} rx={8.5} ry={2} fill={useGradient ? 'url(#dev-cone-base)' : el.color} opacity={0.9} />
          {/* Cone body (triangle with subtle curve via path) */}
          <path
            d={`M ${cx} ${cy - 12} Q ${cx + 1} ${cy - 6} ${cx + 8} ${cy + 6}
                L ${cx - 8} ${cy + 6}
                Q ${cx - 1} ${cy - 6} ${cx} ${cy - 12} Z`}
            fill={bodyFill}
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={0.6}
            strokeLinejoin="round"
          />
          {/* Reflective band (typical training cone) */}
          <path
            d={`M ${cx - 5.2} ${cy - 1} L ${cx + 5.2} ${cy - 1} L ${cx + 4.4} ${cy + 1.2} L ${cx - 4.4} ${cy + 1.2} Z`}
            fill="rgba(255,255,255,0.85)"
          />
          {/* Light edge highlight */}
          <path
            d={`M ${cx - 0.5} ${cy - 11} Q ${cx - 3} ${cy - 3} ${cx - 5.5} ${cy + 5.5}`}
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth={1}
            strokeLinecap="round"
          />
        </g>
      )
    }

    // ────────────────────────────── Arrow ───────────────────────────────
    case 'arrow': {
      const tipX = el.x2 || el.x
      const tipY = el.y2 || el.y
      const angle = Math.atan2(tipY - el.y, tipX - el.x)
      const aLen = 11
      const c = el.color || '#ffffff'
      return (
        <g>
          <line
            x1={el.x} y1={el.y} x2={tipX} y2={tipY}
            stroke={c}
            strokeWidth={2.2}
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.55))' }}
          />
          <polygon
            points={`${tipX},${tipY} ${tipX - aLen * Math.cos(angle - 0.4)},${tipY - aLen * Math.sin(angle - 0.4)} ${tipX - aLen * Math.cos(angle + 0.4)},${tipY - aLen * Math.sin(angle + 0.4)}`}
            fill={c}
            style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.55))' }}
          />
        </g>
      )
    }

    // ────────────────────────────── Curved arrow ────────────────────────
    case 'curved_arrow': {
      const cx = el.cx ?? (el.x + (el.x2 || el.x)) / 2
      const cy = el.cy ?? (el.y + (el.y2 || el.y)) / 2
      const tipX = el.x2 || el.x
      const tipY = el.y2 || el.y
      const angle = Math.atan2(tipY - cy, tipX - cx)
      const aLen = 11
      const c = el.color || '#ffffff'
      return (
        <g>
          <path
            d={`M ${el.x} ${el.y} Q ${cx} ${cy} ${tipX} ${tipY}`}
            fill="none"
            stroke={c}
            strokeWidth={2.2}
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.55))' }}
          />
          <polygon
            points={`${tipX},${tipY} ${tipX - aLen * Math.cos(angle - 0.4)},${tipY - aLen * Math.sin(angle - 0.4)} ${tipX - aLen * Math.cos(angle + 0.4)},${tipY - aLen * Math.sin(angle + 0.4)}`}
            fill={c}
            style={{ filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.55))' }}
          />
        </g>
      )
    }

    // ────────────────────────────── Zone ────────────────────────────────
    case 'zone':
      return (
        <rect
          x={el.x} y={el.y}
          width={el.width || 60} height={el.height || 40}
          fill={el.color || '#3b82f6'}
          opacity={el.opacity || 0.18}
          stroke={el.color || '#3b82f6'}
          strokeWidth={1.2}
          strokeDasharray="4,3"
          rx={4}
        />
      )

    // ────────────────────────────── Text label ──────────────────────────
    case 'text':
      return (
        <text
          x={el.x} y={el.y}
          fill={el.color || '#ffffff'}
          fontSize={13}
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            letterSpacing: '0.02em',
            paintOrder: 'stroke',
            stroke: 'rgba(0,0,0,0.55)',
            strokeWidth: 3,
            strokeLinejoin: 'round',
          }}
        >
          {el.label || ''}
        </text>
      )

    // ────────────────────────────── Goal ────────────────────────────────
    case 'goal': {
      const isLarge = el.size !== 'small'
      const halfW = isLarge ? 30 : 15
      const h = isLarge ? 11 : 7
      const netCount = isLarge ? 6 : 3
      const c = el.color || '#ffffff'
      return (
        <g>
          {/* Net backing */}
          <rect
            x={el.x - halfW} y={el.y - h}
            width={halfW * 2} height={h * 2}
            fill="rgba(255,255,255,0.06)"
            stroke={c}
            strokeWidth={2}
            rx={2}
          />
          {/* Horizontal net strands */}
          <line x1={el.x - halfW + 1} y1={el.y} x2={el.x + halfW - 1} y2={el.y} stroke={c} strokeWidth={0.4} opacity={0.4} />
          {/* Vertical net strands */}
          {Array.from({ length: netCount }).map((_, i) => {
            const gx = el.x - halfW + (halfW * 2) * (i + 1) / (netCount + 1)
            const offset = isLarge ? 2.5 : 1.5
            return (
              <line key={i}
                x1={gx} y1={el.y - h + 1}
                x2={gx + offset} y2={el.y + h - 1}
                stroke={c} strokeWidth={0.5} opacity={0.5}
              />
            )
          })}
          {/* Posts (thicker edges) */}
          <line x1={el.x - halfW} y1={el.y - h} x2={el.x - halfW} y2={el.y + h} stroke={c} strokeWidth={2.5} />
          <line x1={el.x + halfW} y1={el.y - h} x2={el.x + halfW} y2={el.y + h} stroke={c} strokeWidth={2.5} />
          <line x1={el.x - halfW} y1={el.y - h} x2={el.x + halfW} y2={el.y - h} stroke={c} strokeWidth={2.5} />
        </g>
      )
    }

    default:
      return null
  }
}
