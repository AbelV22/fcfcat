'use client'

export default function RatingSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const getColor = (v: number) => {
    if (v <= 3) return { bg: 'rgba(239,68,68,0.15)', text: '#f87171', bar: '#ef4444' }
    if (v <= 5) return { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', bar: '#f59e0b' }
    if (v <= 8) return { bg: 'rgba(34,197,94,0.15)', text: '#4ade80', bar: '#22c55e' }
    return { bg: 'rgba(6,182,212,0.15)', text: '#22d3ee', bar: '#06b6d4' }
  }

  const colors = getColor(value)

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <div className="h-2 rounded-full bg-white/8 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${(value / 10) * 100}%`,
              background: `linear-gradient(to right, ${colors.bar}, ${colors.bar}dd)`,
            }}
          />
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-5 h-5 rounded text-[9px] font-bold transition-all ${
              n === value
                ? 'text-white scale-110'
                : n <= value
                ? 'opacity-60'
                : 'opacity-20'
            }`}
            style={{
              backgroundColor: n <= value ? colors.bar + '40' : 'rgba(255,255,255,0.03)',
              color: n <= value ? colors.text : '#475569',
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
