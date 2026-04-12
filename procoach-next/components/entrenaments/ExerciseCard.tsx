'use client'

import { Star, Clock, Users, Trash2 } from 'lucide-react'
import type { TrainingExercise } from '@/lib/training-types'
import { CATEGORY_LABELS, INTENSITY_COLORS, INTENSITY_LABELS } from '@/lib/training-types'
import DrillPitchSVG from './DrillPitchSVG'

interface Props {
  exercise: TrainingExercise
  onToggleFavorite?: (id: string, fav: boolean) => void
  onDelete?: (id: string) => void
  onClick?: (exercise: TrainingExercise) => void
  compact?: boolean
}

export default function ExerciseCard({ exercise, onToggleFavorite, onDelete, onClick, compact }: Props) {
  const intensityColor = INTENSITY_COLORS[exercise.intensity] || '#8a8f98'

  return (
    <div
      onClick={() => onClick?.(exercise)}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
    >
      {/* Mini pitch preview */}
      {!compact && (
        <div style={{ height: 100, overflow: 'hidden', position: 'relative' }}>
          <DrillPitchSVG mode="half" style={{ position: 'absolute', top: -10, left: 0, width: '100%' }}>
            {exercise.diagram_data?.elements?.map((el, i) => {
              if (el.type === 'player') {
                return <circle key={i} cx={el.x * 340 / 340} cy={el.y * 280 / 280} r={6} fill="#22c55e" opacity={0.8} />
              }
              if (el.type === 'opponent') {
                return <circle key={i} cx={el.x} cy={el.y} r={6} fill="#ef4444" opacity={0.8} />
              }
              if (el.type === 'ball') {
                return <circle key={i} cx={el.x} cy={el.y} r={4} fill="#f59e0b" />
              }
              return null
            })}
          </DrillPitchSVG>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: compact ? '8px 10px' : '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, marginBottom: 6 }}>
          <h3 style={{
            fontSize: compact ? 12 : 13, fontWeight: 510, color: '#f7f8f8',
            fontFamily: 'var(--font-inter)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {exercise.name}
          </h3>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            {onToggleFavorite && (
              <button
                onClick={e => { e.stopPropagation(); onToggleFavorite(exercise.id, !exercise.is_favorite) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                <Star size={14} fill={exercise.is_favorite ? '#f59e0b' : 'none'} color={exercise.is_favorite ? '#f59e0b' : '#62666d'} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(exercise.id) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#62666d' }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* Category badge */}
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: 'rgba(255,255,255,0.06)', color: '#d0d6e0',
            fontWeight: 510, fontFamily: 'var(--font-inter)',
          }}>
            {CATEGORY_LABELS[exercise.category] || exercise.category}
          </span>

          {/* Duration */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#8a8f98' }}>
            <Clock size={10} />
            {exercise.duration_min}min
          </span>

          {/* Intensity dot */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: intensityColor }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: intensityColor }} />
            {INTENSITY_LABELS[exercise.intensity]}
          </span>

          {/* Players */}
          {exercise.min_players > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#8a8f98' }}>
              <Users size={10} />
              {exercise.min_players}+
            </span>
          )}
        </div>

        {exercise.description && !compact && (
          <p style={{
            fontSize: 11, color: '#62666d', marginTop: 6,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
          }}>
            {exercise.description}
          </p>
        )}
      </div>
    </div>
  )
}
