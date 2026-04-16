'use client'

import { X, Clock, Users, Tag } from 'lucide-react'
import type { TrainingExercise } from '@/lib/training-types'
import { CATEGORY_LABELS, INTENSITY_LABELS, INTENSITY_COLORS } from '@/lib/training-types'
import DrillPitchSVG from './DrillPitchSVG'
import Link from 'next/link'
import ExerciseShareButton from './ExerciseShareButton'

interface Props {
  exercise: TrainingExercise
  onClose: () => void
  onUpdate?: (updated: Partial<TrainingExercise>) => void
}

export default function ExerciseDetailModal({ exercise, onClose, onUpdate }: Props) {
  const intensityColor = INTENSITY_COLORS[exercise.intensity]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 560,
        maxHeight: '85vh', overflowY: 'auto',
        background: '#0f1011',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8, padding: 0,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky', top: 0, background: '#0f1011', zIndex: 1,
          gap: 8,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 510, color: '#f7f8f8', fontFamily: 'var(--font-inter)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {exercise.name}
          </h2>
          <ExerciseShareButton exercise={exercise} onUpdate={onUpdate} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8a8f98', cursor: 'pointer', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Pitch diagram */}
        {exercise.diagram_data?.elements?.length > 0 && (
          <div style={{ padding: '16px 16px 0' }}>
            <DrillPitchSVG mode="full" style={{ borderRadius: 8 }}>
              {exercise.diagram_data.elements.map((el, i) => {
                switch (el.type) {
                  case 'player':
                    return (
                      <g key={i}>
                        <circle cx={el.x} cy={el.y} r={17} fill="url(#playerGrad)" stroke={el.color || '#22c55e'} strokeWidth={1.5} />
                        <text x={el.x} y={el.y + 4} textAnchor="middle" fill="#fff" fontSize={9} fontWeight={600}>{el.label || 'J'}</text>
                      </g>
                    )
                  case 'opponent':
                    return (
                      <g key={i}>
                        <circle cx={el.x} cy={el.y} r={17} fill="url(#opponentGrad)" stroke={el.color || '#ef4444'} strokeWidth={1.5} />
                        <text x={el.x} y={el.y + 4} textAnchor="middle" fill="#fff" fontSize={9} fontWeight={600}>{el.label || 'R'}</text>
                      </g>
                    )
                  case 'ball':
                    return <circle key={i} cx={el.x} cy={el.y} r={8} fill="#f59e0b" stroke="#fbbf24" strokeWidth={1.5} />
                  case 'arrow':
                    return (
                      <line key={i} x1={el.x} y1={el.y} x2={el.x2 || el.x} y2={el.y2 || el.y}
                        stroke={el.color || '#fff'} strokeWidth={2} markerEnd="url(#arrowhead)" />
                    )
                  case 'curved_arrow':
                    return (
                      <path key={i}
                        d={`M ${el.x} ${el.y} Q ${el.cx ?? el.x} ${el.cy ?? el.y} ${el.x2 ?? el.x} ${el.y2 ?? el.y}`}
                        fill="none" stroke={el.color || '#fff'} strokeWidth={2} />
                    )
                  case 'zone':
                    return (
                      <rect key={i} x={el.x} y={el.y} width={el.width || 60} height={el.height || 40}
                        fill={el.color || '#3b82f6'} opacity={el.opacity || 0.15} rx={3} />
                    )
                  case 'cone':
                    return (
                      <polygon key={i}
                        points={`${el.x},${el.y - 10} ${el.x - 8},${el.y + 6} ${el.x + 8},${el.y + 6}`}
                        fill={el.color || '#f97316'} opacity={0.9} />
                    )
                  case 'text':
                    return (
                      <text key={i} x={el.x} y={el.y} fill={el.color || '#fff'}
                        fontSize={14} fontWeight={600} textAnchor="middle" dominantBaseline="middle">
                        {el.label || 'Text'}
                      </text>
                    )
                  case 'goal':
                    return (
                      <rect key={i} x={el.x - 25} y={el.y - 8} width={50} height={16}
                        fill="none" stroke={el.color || '#fff'} strokeWidth={2} rx={2} />
                    )
                  default:
                    return null
                }
              })}
            </DrillPitchSVG>
          </div>
        )}

        {/* Details */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Meta badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              fontSize: 12, color: '#d0d6e0', fontWeight: 510,
            }}>
              {CATEGORY_LABELS[exercise.category]}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              fontSize: 12, color: intensityColor, fontWeight: 510,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: intensityColor }} />
              {INTENSITY_LABELS[exercise.intensity]}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              fontSize: 12, color: '#8a8f98',
            }}>
              <Clock size={12} />
              {exercise.duration_min} min
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              fontSize: 12, color: '#8a8f98',
            }}>
              <Users size={12} />
              {exercise.min_players}+ jugadors
            </span>
          </div>

          {/* Description */}
          {exercise.description && (
            <div>
              <div style={{ fontSize: 11, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Descripcio</div>
              <p style={{ fontSize: 13, color: '#d0d6e0', lineHeight: 1.5 }}>{exercise.description}</p>
            </div>
          )}

          {/* Tactical objective */}
          {exercise.tactical_objective && (
            <div>
              <div style={{ fontSize: 11, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Objectiu tactic</div>
              <p style={{ fontSize: 13, color: '#d0d6e0', lineHeight: 1.5 }}>{exercise.tactical_objective}</p>
            </div>
          )}

          {/* Equipment */}
          {exercise.equipment.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Material</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {exercise.equipment.map((eq, i) => (
                  <span key={i} style={{
                    padding: '3px 8px', borderRadius: 4,
                    background: 'rgba(255,255,255,0.04)', fontSize: 12, color: '#8a8f98',
                  }}>
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {exercise.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {exercise.tags.map((tag, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '3px 8px', borderRadius: 4,
                  background: 'rgba(34,197,94,0.06)', fontSize: 11, color: '#22c55e',
                }}>
                  <Tag size={10} />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Edit button */}
          <Link
            href={`/dashboard/entrenaments/biblioteca/nou?edit=${exercise.id}`}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 16px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6, color: '#d0d6e0', fontSize: 13, fontWeight: 510,
              textDecoration: 'none', fontFamily: 'var(--font-inter)',
              marginTop: 4,
            }}
          >
            Editar exercici
          </Link>
        </div>
      </div>
    </div>
  )
}
