'use client'

interface RadarAxis {
  label: string
  value: number // 0-1
  max?: number
}

interface RadarLayer {
  values: number[] // 0-1 per axis
  color: string
  label?: string
}

export default function RadarChart({
  axes,
  layers,
  size = 200,
}: {
  axes: RadarAxis[]
  layers: RadarLayer[]
  size?: number
}) {
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.38
  const n = axes.length
  if (n < 3) return null

  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2 // Start from top

  const getPoint = (i: number, r: number) => ({
    x: cx + Math.cos(startAngle + i * angleStep) * r,
    y: cy + Math.sin(startAngle + i * angleStep) * r,
  })

  const polygon = (values: number[]) =>
    values
      .map((v, i) => {
        const p = getPoint(i, v * R)
        return `${p.x},${p.y}`
      })
      .join(' ')

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[250px] mx-auto">
      {/* Grid */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, r * R)
            return `${p.x},${p.y}`
          }).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
        />
      ))}

      {/* Axis lines */}
      {axes.map((_, i) => {
        const p = getPoint(i, R)
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.5"
          />
        )
      })}

      {/* Data layers */}
      {layers.map((layer, li) => (
        <g key={li}>
          <polygon
            points={polygon(layer.values)}
            fill={layer.color}
            fillOpacity="0.12"
            stroke={layer.color}
            strokeWidth="1.5"
            strokeOpacity="0.7"
          />
          {layer.values.map((v, i) => {
            const p = getPoint(i, v * R)
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="3"
                fill={layer.color}
              />
            )
          })}
        </g>
      ))}

      {/* Labels */}
      {axes.map((axis, i) => {
        const p = getPoint(i, R + 18)
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="8"
            fill="rgba(255,255,255,0.5)"
            fontWeight="500"
          >
            {axis.label}
          </text>
        )
      })}

      {/* Value labels */}
      {layers.length === 1 &&
        layers[0].values.map((v, i) => {
          const p = getPoint(i, v * R)
          return (
            <text
              key={i}
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              fontSize="7"
              fill={layers[0].color}
              fontWeight="bold"
            >
              {(v * (axes[i].max || 10)).toFixed(1)}
            </text>
          )
        })}
    </svg>
  )
}
