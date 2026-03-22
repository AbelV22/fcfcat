'use client'

interface Segment {
  label: string
  value: number
  color: string
}

export default function DonutChart({
  segments,
  size = 140,
  centerLabel,
}: {
  segments: Segment[]
  size?: number
  centerLabel?: string
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null

  const cx = size / 2
  const cy = size / 2
  const R = size * 0.4
  const thickness = size * 0.12

  let cumAngle = -Math.PI / 2

  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const angle = (seg.value / total) * Math.PI * 2
      const startAngle = cumAngle
      const endAngle = cumAngle + angle
      cumAngle = endAngle

      const x1 = cx + Math.cos(startAngle) * R
      const y1 = cy + Math.sin(startAngle) * R
      const x2 = cx + Math.cos(endAngle) * R
      const y2 = cy + Math.sin(endAngle) * R
      const largeArc = angle > Math.PI ? 1 : 0

      const midAngle = startAngle + angle / 2
      const labelX = cx + Math.cos(midAngle) * (R + 18)
      const labelY = cy + Math.sin(midAngle) * (R + 18)

      return {
        ...seg,
        path: `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
        labelX,
        labelY,
        pct: Math.round((seg.value / total) * 100),
      }
    })

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[180px] mx-auto">
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />

      {/* Segments */}
      {arcs.map((arc, i) => (
        <path
          key={i}
          d={arc.path}
          fill="none"
          stroke={arc.color}
          strokeWidth={thickness}
          strokeLinecap="round"
        />
      ))}

      {/* Center label */}
      {centerLabel && (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="bold" fill="white">
          {centerLabel}
        </text>
      )}

      {/* Segment labels */}
      {arcs.map((arc, i) => (
        <g key={i}>
          <text
            x={arc.labelX}
            y={arc.labelY - 4}
            textAnchor="middle"
            fontSize="7"
            fill={arc.color}
            fontWeight="bold"
          >
            {arc.pct}%
          </text>
          <text
            x={arc.labelX}
            y={arc.labelY + 5}
            textAnchor="middle"
            fontSize="6"
            fill="rgba(255,255,255,0.4)"
          >
            {arc.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
