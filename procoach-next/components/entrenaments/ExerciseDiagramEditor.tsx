'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  MousePointer2, UserX, ArrowRight, Spline,
  Square, Type, Triangle, Undo2, Redo2, Trash2,
} from 'lucide-react'
import DrillPitchSVG, { clientToSVG, FULL_W, FULL_H, HALF_W, HALF_H } from './DrillPitchSVG'
import type { DiagramElement, DiagramData } from '@/lib/training-types'
import { generateElementId, DIAGRAM_ELEMENT_COLORS } from '@/lib/training-types'

type ToolKey =
  | 'select'
  | 'player_a'
  | 'player_b'
  | 'opponent'
  | 'ball'
  | 'arrow'
  | 'curved_arrow'
  | 'zone'
  | 'text'
  | 'cone'
  | 'goal_large'
  | 'goal_small'

interface Props {
  value: DiagramData
  onChange: (data: DiagramData) => void
  mode?: 'full' | 'half'
}

// ─── Toolbar icons (inline SVG premium) ─────────────────
const JerseyIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M7 3 L4 5 L2 9 L4.5 11 L6 10 L6 20 Q6 21 7 21 L17 21 Q18 21 18 20 L18 10 L19.5 11 L22 9 L20 5 L17 3 L14.5 4.5 Q12 6 9.5 4.5 Z"
      fill={color}
      stroke="#0b0d10"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
)
const JerseyAIcon = (props: { size?: number }) => <JerseyIcon color="#3b82f6" {...props} />
const JerseyBIcon = (props: { size?: number }) => <JerseyIcon color="#ef4444" {...props} />

const BallIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" fill="#ffffff" stroke="#111" strokeWidth="1.2" />
    <polygon points="12,8 15.2,10.3 14,14 10,14 8.8,10.3" fill="#111" />
    <line x1="12" y1="8" x2="12" y2="4" stroke="#111" strokeWidth="0.9" />
    <line x1="15.2" y1="10.3" x2="19" y2="9.2" stroke="#111" strokeWidth="0.9" />
    <line x1="14" y1="14" x2="16.4" y2="17.8" stroke="#111" strokeWidth="0.9" />
    <line x1="10" y1="14" x2="7.6" y2="17.8" stroke="#111" strokeWidth="0.9" />
    <line x1="8.8" y1="10.3" x2="5" y2="9.2" stroke="#111" strokeWidth="0.9" />
  </svg>
)

const GoalLargeIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="8" width="20" height="8" fill="none" stroke="currentColor" strokeWidth="1.6" rx="1" />
    <line x1="6" y1="8" x2="6.8" y2="16" stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
    <line x1="10" y1="8" x2="10.8" y2="16" stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
    <line x1="14" y1="8" x2="14.8" y2="16" stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
    <line x1="18" y1="8" x2="18.8" y2="16" stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
  </svg>
)

const GoalSmallIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="7" y="10" width="10" height="6" fill="none" stroke="currentColor" strokeWidth="1.6" rx="1" />
    <line x1="10" y1="10" x2="10.6" y2="16" stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
    <line x1="14" y1="10" x2="14.6" y2="16" stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
  </svg>
)

type ToolIconComponent = React.ComponentType<{ size?: number }>

const TOOLS: { key: ToolKey; icon: ToolIconComponent; label: string }[] = [
  { key: 'select',       icon: MousePointer2, label: 'Seleccionar' },
  { key: 'player_a',     icon: JerseyAIcon,   label: 'Equip A' },
  { key: 'player_b',     icon: JerseyBIcon,   label: 'Equip B' },
  { key: 'opponent',     icon: UserX,         label: 'Rival' },
  { key: 'ball',         icon: BallIcon,      label: 'Pilota' },
  { key: 'arrow',        icon: ArrowRight,    label: 'Fletxa' },
  { key: 'curved_arrow', icon: Spline,        label: 'Fletxa corba' },
  { key: 'zone',         icon: Square,        label: 'Zona' },
  { key: 'text',         icon: Type,          label: 'Text' },
  { key: 'cone',         icon: Triangle,      label: 'Con' },
  { key: 'goal_large',   icon: GoalLargeIcon, label: 'Porteria gran' },
  { key: 'goal_small',   icon: GoalSmallIcon, label: 'Porteria petita' },
]

const DEFAULT_COLORS: Record<string, string> = {
  player_a: '#3b82f6',
  player_b: '#ef4444',
  opponent: '#0ea5e9',
  ball: '#ffffff',
  arrow: '#ffffff',
  curved_arrow: '#ffffff',
  zone: '#3b82f6',
  text: '#ffffff',
  cone: '#f97316',
  goal_large: '#ffffff',
  goal_small: '#ffffff',
}

export default function ExerciseDiagramEditor({ value, onChange, mode = 'full' }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [activeTool, setActiveTool] = useState<ToolKey>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeColor, setActiveColor] = useState('#22c55e')
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 })
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number } | null>(null)
  const [playerCounter, setPlayerCounter] = useState(1)
  const [history, setHistory] = useState<DiagramData[]>([value])
  const [historyIndex, setHistoryIndex] = useState(0)

  const W = mode === 'full' ? FULL_W : FULL_H
  const H = mode === 'full' ? FULL_H : HALF_H

  const pushHistory = useCallback((data: DiagramData) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(data)
      return newHistory.length > 50 ? newHistory.slice(-50) : newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      onChange(history[newIndex])
    }
  }, [history, historyIndex, onChange])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      onChange(history[newIndex])
    }
  }, [history, historyIndex, onChange])

  const updateElements = useCallback((elements: DiagramElement[]) => {
    const data = { elements }
    onChange(data)
    pushHistory(data)
  }, [onChange, pushHistory])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedId) {
        e.preventDefault()
        updateElements(value.elements.filter(el => el.id !== selectedId))
        setSelectedId(null)
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
  }, [selectedId, value.elements, updateElements, undo, redo])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const getSVGCoords = useCallback((e: React.PointerEvent | React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    return clientToSVG(e as React.PointerEvent, svgRef.current, mode)
  }, [mode])

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const { x, y } = getSVGCoords(e)

    if (activeTool === 'select') {
      // Check if clicking on an existing element
      const clicked = [...value.elements].reverse().find(el => {
        if (el.type === 'player' || el.type === 'opponent' || el.type === 'ball' || el.type === 'cone') {
          const r = el.type === 'ball' ? 8 : el.type === 'cone' ? 10 : 17
          return Math.hypot(x - el.x, y - el.y) < r + 5
        }
        if (el.type === 'text') {
          return Math.abs(x - el.x) < 30 && Math.abs(y - el.y) < 15
        }
        if (el.type === 'goal') {
          const halfW = el.size === 'small' ? 14 : 28
          const h = el.size === 'small' ? 7 : 10
          return Math.abs(x - el.x) < halfW + 5 && Math.abs(y - el.y) < h + 5
        }
        if (el.type === 'zone') {
          return x >= el.x && x <= el.x + (el.width || 60) && y >= el.y && y <= el.y + (el.height || 40)
        }
        if (el.type === 'arrow' || el.type === 'curved_arrow') {
          // Rough hit test: near start or end
          const d1 = Math.hypot(x - el.x, y - el.y)
          const d2 = Math.hypot(x - (el.x2 || el.x), y - (el.y2 || el.y))
          return d1 < 15 || d2 < 15
        }
        return false
      })

      if (clicked) {
        setSelectedId(clicked.id)
        setDragging(clicked.id)
        setDragOffset({ dx: x - clicked.x, dy: y - clicked.y })
        ;(e.target as SVGSVGElement).setPointerCapture(e.pointerId)
      } else {
        setSelectedId(null)
      }
      return
    }

    // Drawing tools
    if (activeTool === 'arrow' || activeTool === 'curved_arrow' || activeTool === 'zone') {
      setDrawStart({ x, y })
      setDrawPreview({ x, y })
      ;(e.target as SVGSVGElement).setPointerCapture(e.pointerId)
      return
    }

    // Point-placement tools
    const id = generateElementId()
    let newEl: DiagramElement | null = null

    if (activeTool === 'player_a') {
      newEl = { id, type: 'player', x, y, team: 'a', color: activeColor || '#3b82f6', label: String(playerCounter) }
      setPlayerCounter(prev => prev + 1)
    } else if (activeTool === 'player_b') {
      newEl = { id, type: 'player', x, y, team: 'b', color: activeColor || '#ef4444', label: String(playerCounter) }
      setPlayerCounter(prev => prev + 1)
    } else if (activeTool === 'opponent') {
      newEl = { id, type: 'opponent', x, y, color: activeColor || '#0ea5e9' }
    } else if (activeTool === 'ball') {
      newEl = { id, type: 'ball', x, y }
    } else if (activeTool === 'cone') {
      newEl = { id, type: 'cone', x, y, color: activeColor || '#f97316' }
    } else if (activeTool === 'text') {
      const text = prompt('Text:')
      if (!text) return
      newEl = { id, type: 'text', x, y, color: activeColor || '#ffffff', label: text }
    } else if (activeTool === 'goal_large') {
      newEl = { id, type: 'goal', x, y, size: 'large', color: activeColor || '#ffffff' }
    } else if (activeTool === 'goal_small') {
      newEl = { id, type: 'goal', x, y, size: 'small', color: activeColor || '#ffffff' }
    }

    if (!newEl) return
    updateElements([...value.elements, newEl])
  }, [activeTool, value.elements, getSVGCoords, activeColor, playerCounter, updateElements])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const { x, y } = getSVGCoords(e)

    if (dragging) {
      const el = value.elements.find(el => el.id === dragging)
      if (!el) return
      const newElements = value.elements.map(e =>
        e.id === dragging
          ? {
              ...e,
              x: x - dragOffset.dx,
              y: y - dragOffset.dy,
              ...(e.x2 !== undefined ? { x2: (e.x2 || 0) + (x - dragOffset.dx - e.x), y2: (e.y2 || 0) + (y - dragOffset.dy - e.y) } : {}),
            }
          : e
      )
      onChange({ elements: newElements })
      return
    }

    if (drawStart) {
      setDrawPreview({ x, y })
    }
  }, [dragging, drawStart, dragOffset, value.elements, onChange, getSVGCoords])

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (dragging) {
      setDragging(null)
      pushHistory({ elements: value.elements })
      return
    }

    if (drawStart && drawPreview) {
      const { x: x1, y: y1 } = drawStart
      const { x: x2, y: y2 } = drawPreview

      if (Math.hypot(x2 - x1, y2 - y1) < 5) {
        setDrawStart(null)
        setDrawPreview(null)
        return
      }

      if (activeTool === 'arrow') {
        updateElements([...value.elements, {
          id: generateElementId(),
          type: 'arrow',
          x: x1, y: y1, x2, y2,
          color: activeColor || '#ffffff',
        }])
      } else if (activeTool === 'curved_arrow') {
        const mx = (x1 + x2) / 2
        const my = (y1 + y2) / 2
        const dx = x2 - x1
        const dy = y2 - y1
        updateElements([...value.elements, {
          id: generateElementId(),
          type: 'curved_arrow',
          x: x1, y: y1, x2, y2,
          cx: mx - dy * 0.3, cy: my + dx * 0.3,
          color: activeColor || '#ffffff',
        }])
      } else if (activeTool === 'zone') {
        const zx = Math.min(x1, x2)
        const zy = Math.min(y1, y2)
        updateElements([...value.elements, {
          id: generateElementId(),
          type: 'zone',
          x: zx, y: zy,
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1),
          color: activeColor || '#3b82f6',
          opacity: 0.15,
        }])
      }

      setDrawStart(null)
      setDrawPreview(null)
    }
  }, [dragging, drawStart, drawPreview, activeTool, value.elements, activeColor, updateElements, pushHistory])

  const deleteSelected = useCallback(() => {
    if (selectedId) {
      updateElements(value.elements.filter(el => el.id !== selectedId))
      setSelectedId(null)
    }
  }, [selectedId, value.elements, updateElements])

  const clearAll = useCallback(() => {
    if (confirm('Eliminar tots els elements?')) {
      updateElements([])
      setSelectedId(null)
      setPlayerCounter(1)
    }
  }, [updateElements])

  const renderElement = (el: DiagramElement) => {
    const isSelected = el.id === selectedId

    switch (el.type) {
      case 'player': {
        const isA = el.team !== 'b'
        const baseColor = el.color || (isA ? '#3b82f6' : '#ef4444')
        const ox = el.x - 14
        const oy = el.y - 14
        return (
          <g key={el.id}>
            {isSelected && <circle cx={el.x} cy={el.y} r={22} fill={baseColor} opacity={0.25} />}
            <g transform={`translate(${ox} ${oy})`}>
              {/* Jersey body */}
              <path
                d="M7 2 L3.5 4.5 L1.5 9 L4.5 11 L6 9.5 L6 21 Q6 22 7 22 L21 22 Q22 22 22 21 L22 9.5 L23.5 11 L26.5 9 L24.5 4.5 L21 2 L18 3.5 Q14 5.5 10 3.5 Z"
                fill={baseColor}
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="1"
                strokeLinejoin="round"
              />
              {/* Collar */}
              <path
                d="M10 3.5 Q14 7 18 3.5"
                fill="none"
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="0.8"
              />
              {/* Highlight stripe */}
              <path
                d="M6 9.5 L6 21 Q6 22 7 22 L10 22 L10 9.5 Z"
                fill="rgba(255,255,255,0.08)"
              />
              {/* Number */}
              <text
                x="14" y="16"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={el.label && el.label.length > 2 ? 7 : 10}
                fontWeight={700}
                style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
              >
                {el.label || (isA ? '1' : '1')}
              </text>
            </g>
          </g>
        )
      }

      case 'opponent': {
        const oppColor = el.color || '#0ea5e9'
        return (
          <g key={el.id}>
            {isSelected && <circle cx={el.x} cy={el.y} r={22} fill={oppColor} opacity={0.25} />}
            <circle cx={el.x} cy={el.y} r={17} fill={oppColor} stroke="rgba(0,0,0,0.4)" strokeWidth={isSelected ? 2.5 : 1.5} />
            {/* X mark */}
            <line x1={el.x - 6} y1={el.y - 6} x2={el.x + 6} y2={el.y + 6} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
            <line x1={el.x + 6} y1={el.y - 6} x2={el.x - 6} y2={el.y + 6} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        )
      }

      case 'ball':
        return (
          <g key={el.id} transform={`translate(${el.x} ${el.y})`}>
            {isSelected && <circle r={14} fill="#fff" opacity={0.2} />}
            <circle r={10} fill="#f0f0f0" stroke="#1a1a1a" strokeWidth={0.8} />
            {/* Central pentagon */}
            <polygon points="0,-4.5 4.3,-1.4 2.6,3.6 -2.6,3.6 -4.3,-1.4" fill="#1a1a1a" />
            {/* Seam lines from pentagon vertices to edge */}
            <line x1="0" y1="-4.5" x2="0" y2="-9.5" stroke="#1a1a1a" strokeWidth="0.8" />
            <line x1="4.3" y1="-1.4" x2="9" y2="-3" stroke="#1a1a1a" strokeWidth="0.8" />
            <line x1="2.6" y1="3.6" x2="5.6" y2="8" stroke="#1a1a1a" strokeWidth="0.8" />
            <line x1="-2.6" y1="3.6" x2="-5.6" y2="8" stroke="#1a1a1a" strokeWidth="0.8" />
            <line x1="-4.3" y1="-1.4" x2="-9" y2="-3" stroke="#1a1a1a" strokeWidth="0.8" />
            {/* Highlight */}
            <circle cx={-3} cy={-4} r={2} fill="rgba(255,255,255,0.5)" />
          </g>
        )

      case 'cone':
        return (
          <g key={el.id}>
            {isSelected && <circle cx={el.x} cy={el.y} r={16} fill={el.color || '#f97316'} opacity={0.3} />}
            <polygon
              points={`${el.x},${el.y - 10} ${el.x - 8},${el.y + 6} ${el.x + 8},${el.y + 6}`}
              fill={el.color || '#f97316'}
              stroke={isSelected ? '#fff' : 'none'}
              strokeWidth={1}
              opacity={0.9}
            />
          </g>
        )

      case 'arrow': {
        const angle = Math.atan2((el.y2 || el.y) - el.y, (el.x2 || el.x) - el.x)
        const tipX = el.x2 || el.x
        const tipY = el.y2 || el.y
        const aLen = 10
        return (
          <g key={el.id}>
            <line
              x1={el.x} y1={el.y} x2={tipX} y2={tipY}
              stroke={el.color || '#fff'}
              strokeWidth={isSelected ? 3 : 2}
              strokeDasharray={el.type === 'arrow' ? undefined : '6,3'}
            />
            <polygon
              points={`${tipX},${tipY} ${tipX - aLen * Math.cos(angle - 0.4)},${tipY - aLen * Math.sin(angle - 0.4)} ${tipX - aLen * Math.cos(angle + 0.4)},${tipY - aLen * Math.sin(angle + 0.4)}`}
              fill={el.color || '#fff'}
            />
          </g>
        )
      }

      case 'curved_arrow': {
        const cx = el.cx ?? (el.x + (el.x2 || el.x)) / 2
        const cy = el.cy ?? (el.y + (el.y2 || el.y)) / 2
        const tipX = el.x2 || el.x
        const tipY = el.y2 || el.y
        // Approximate angle at endpoint of quadratic bezier
        const angle = Math.atan2(tipY - cy, tipX - cx)
        const aLen = 10
        return (
          <g key={el.id}>
            <path
              d={`M ${el.x} ${el.y} Q ${cx} ${cy} ${tipX} ${tipY}`}
              fill="none"
              stroke={el.color || '#fff'}
              strokeWidth={isSelected ? 3 : 2}
            />
            <polygon
              points={`${tipX},${tipY} ${tipX - aLen * Math.cos(angle - 0.4)},${tipY - aLen * Math.sin(angle - 0.4)} ${tipX - aLen * Math.cos(angle + 0.4)},${tipY - aLen * Math.sin(angle + 0.4)}`}
              fill={el.color || '#fff'}
            />
            {/* Control point handle (visible when selected) */}
            {isSelected && (
              <circle cx={cx} cy={cy} r={5} fill="rgba(255,255,255,0.5)" stroke="#fff" strokeWidth={1} />
            )}
          </g>
        )
      }

      case 'zone':
        return (
          <rect
            key={el.id}
            x={el.x} y={el.y}
            width={el.width || 60} height={el.height || 40}
            fill={el.color || '#3b82f6'}
            opacity={el.opacity || 0.15}
            stroke={isSelected ? '#fff' : (el.color || '#3b82f6')}
            strokeWidth={isSelected ? 2 : 1}
            strokeDasharray={isSelected ? '4,2' : undefined}
            rx={3}
          />
        )

      case 'text':
        return (
          <text
            key={el.id}
            x={el.x} y={el.y}
            fill={el.color || '#fff'}
            fontSize={14}
            fontWeight={600}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ textDecoration: isSelected ? 'underline' : undefined }}
          >
            {el.label || 'Text'}
          </text>
        )

      case 'goal': {
        const isLarge = el.size !== 'small'
        const halfW = isLarge ? 30 : 15
        const h = isLarge ? 11 : 7
        const netCount = isLarge ? 5 : 3
        const c = el.color || '#fff'
        return (
          <g key={el.id}>
            <rect
              x={el.x - halfW} y={el.y - h}
              width={halfW * 2} height={h * 2}
              fill="rgba(255,255,255,0.04)"
              stroke={c}
              strokeWidth={isSelected ? 2.5 : 2}
              rx={2}
            />
            {Array.from({ length: netCount }).map((_, i) => {
              const gx = el.x - halfW + (halfW * 2) * (i + 1) / (netCount + 1)
              const offset = isLarge ? 3 : 2
              return (
                <line key={i}
                  x1={gx} y1={el.y - h}
                  x2={gx + offset} y2={el.y + h}
                  stroke={c} strokeWidth={0.5} opacity={0.45}
                />
              )
            })}
            {isSelected && (
              <rect
                x={el.x - halfW - 3} y={el.y - h - 3}
                width={halfW * 2 + 6} height={h * 2 + 6}
                fill="none" stroke="#fff" strokeWidth={1} strokeDasharray="3,2" opacity={0.5} rx={3}
              />
            )}
          </g>
        )
      }

      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Top toolbar: undo/redo/delete/clear + color picker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={undo} disabled={historyIndex <= 0} title="Desfer" style={toolbarBtnStyle(false, historyIndex <= 0)}>
            <Undo2 size={15} />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Refer" style={toolbarBtnStyle(false, historyIndex >= history.length - 1)}>
            <Redo2 size={15} />
          </button>
          <button onClick={deleteSelected} disabled={!selectedId} title="Eliminar" style={toolbarBtnStyle(false, !selectedId)}>
            <Trash2 size={15} />
          </button>
          <button onClick={clearAll} title="Netejar tot" style={toolbarBtnStyle(false, value.elements.length === 0)}>
            <Trash2 size={15} style={{ color: '#ef4444' }} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {DIAGRAM_ELEMENT_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setActiveColor(c)}
              style={{
                width: 20, height: 20, borderRadius: 4,
                background: c,
                border: activeColor === c ? '2px solid #fff' : '2px solid transparent',
                cursor: 'pointer', transition: 'border 0.15s',
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {/* Tool palette - desktop: vertical left, mobile: horizontal bottom via CSS */}
        <div className="hidden lg:flex" style={{ flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          {TOOLS.map(t => {
            const Icon = t.icon
            const isActive = activeTool === t.key
            return (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTool(t.key)
                  if (t.key !== 'select') setActiveColor(DEFAULT_COLORS[t.key] || activeColor)
                }}
                title={t.label}
                style={toolBtnStyle(isActive)}
              >
                <Icon size={16} />
              </button>
            )
          })}
        </div>

        {/* SVG canvas */}
        <div
          style={{ flex: 1, position: 'relative' }}
          ref={el => {
            if (el) {
              const svg = el.querySelector('svg')
              if (svg) svgRef.current = svg
            }
          }}
        >
          <DrillPitchSVG
            mode={mode}
            interactive
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ borderRadius: 8, cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
          >
            {/* Render all elements */}
            {value.elements.map(renderElement)}

            {/* Draw preview */}
            {drawStart && drawPreview && (
              <>
                {activeTool === 'arrow' && (
                  <line
                    x1={drawStart.x} y1={drawStart.y}
                    x2={drawPreview.x} y2={drawPreview.y}
                    stroke={activeColor} strokeWidth={2} strokeDasharray="4,2" opacity={0.6}
                  />
                )}
                {activeTool === 'curved_arrow' && (
                  <line
                    x1={drawStart.x} y1={drawStart.y}
                    x2={drawPreview.x} y2={drawPreview.y}
                    stroke={activeColor} strokeWidth={2} strokeDasharray="4,2" opacity={0.6}
                  />
                )}
                {activeTool === 'zone' && (
                  <rect
                    x={Math.min(drawStart.x, drawPreview.x)}
                    y={Math.min(drawStart.y, drawPreview.y)}
                    width={Math.abs(drawPreview.x - drawStart.x)}
                    height={Math.abs(drawPreview.y - drawStart.y)}
                    fill={activeColor} opacity={0.1}
                    stroke={activeColor} strokeWidth={1} strokeDasharray="4,2"
                    rx={3}
                  />
                )}
              </>
            )}
          </DrillPitchSVG>
        </div>
      </div>

      {/* Mobile tool palette */}
      <div className="lg:hidden" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, paddingBottom: 4 }}>
        {TOOLS.map(t => {
          const Icon = t.icon
          const isActive = activeTool === t.key
          return (
            <button
              key={t.key}
              onClick={() => {
                setActiveTool(t.key)
                if (t.key !== 'select') setActiveColor(DEFAULT_COLORS[t.key] || activeColor)
              }}
              style={{ ...toolBtnStyle(isActive), width: '100%', minHeight: 36 }}
            >
              <Icon size={14} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function toolBtnStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: 6, border: 'none',
    background: active ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
    color: active ? '#22c55e' : '#8a8f98',
    cursor: 'pointer', transition: 'all 0.15s',
  }
}

function toolbarBtnStyle(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 6, border: 'none',
    background: 'rgba(255,255,255,0.04)',
    color: disabled ? '#62666d' : '#8a8f98',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s',
  }
}
