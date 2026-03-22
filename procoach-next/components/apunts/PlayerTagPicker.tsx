'use client'

import { PLAYER_TAGS } from '@/lib/match-notes-types'

const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  amber: { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  blue: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  red: { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  green: { bg: 'rgba(34,197,94,0.12)', text: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  cyan: { bg: 'rgba(6,182,212,0.12)', text: '#22d3ee', border: 'rgba(6,182,212,0.3)' },
  purple: { bg: 'rgba(168,85,247,0.12)', text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
  orange: { bg: 'rgba(249,115,22,0.12)', text: '#fb923c', border: 'rgba(249,115,22,0.3)' },
  emerald: { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.3)' },
  slate: { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
  rose: { bg: 'rgba(244,63,94,0.12)', text: '#fb7185', border: 'rgba(244,63,94,0.3)' },
}

export default function PlayerTagPicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (tags: string[]) => void
}) {
  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((t) => t !== key))
    } else {
      onChange([...selected, key])
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {PLAYER_TAGS.map((tag) => {
        const active = selected.includes(tag.key)
        const colors = TAG_COLORS[tag.color] || TAG_COLORS.slate
        return (
          <button
            key={tag.key}
            onClick={() => toggle(tag.key)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
            style={{
              backgroundColor: active ? colors.bg : 'rgba(255,255,255,0.03)',
              color: active ? colors.text : '#475569',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: active ? colors.border : 'transparent',
            }}
          >
            {tag.label}
          </button>
        )
      })}
    </div>
  )
}
