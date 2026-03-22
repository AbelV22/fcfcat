'use client'

interface DataPoint {
  label: string
  value: number
}

export default function MiniLineChart({
  data,
  color = '#22c55e',
  height = 80,
  showDots = true,
  showLabels = true,
  maxValue,
}: {
  data: DataPoint[]
  color?: string
  height?: number
  showDots?: boolean
  showLabels?: boolean
  maxValue?: number
}) {
  if (data.length < 2) return null

  const W = 300
  const H = height
  const PAD_X = 10
  const PAD_Y = 12
  const plotW = W - PAD_X * 2
  const plotH = H - PAD_Y * 2

  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1)
  const min = 0

  const getX = (i: number) => PAD_X + (i / (data.length - 1)) * plotW
  const getY = (v: number) => PAD_Y + plotH - ((v - min) / (max - min)) * plotH

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }))
  const line = points.map((p) => `${p.x},${p.y}`).join(' ')

  // Area fill path
  const areaPath = `M ${points[0].x},${PAD_Y + plotH} ` +
    points.map((p) => `L ${p.x},${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x},${PAD_Y + plotH} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Area gradient */}
      <defs>
        <linearGradient id={`areaGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontal guide lines */}
      {[0.25, 0.5, 0.75].map((r) => (
        <line
          key={r}
          x1={PAD_X}
          y1={PAD_Y + plotH * (1 - r)}
          x2={W - PAD_X}
          y2={PAD_Y + plotH * (1 - r)}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.5"
        />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#areaGrad-${color.replace('#', '')})`} />

      {/* Line */}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {showDots &&
        points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
        ))}

      {/* Labels */}
      {showLabels &&
        data.map((d, i) => (
          <text
            key={i}
            x={points[i].x}
            y={H - 1}
            textAnchor="middle"
            fontSize="6"
            fill="rgba(255,255,255,0.3)"
          >
            {d.label}
          </text>
        ))}
    </svg>
  )
}
