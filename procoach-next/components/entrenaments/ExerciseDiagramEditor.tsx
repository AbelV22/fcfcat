'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  MousePointer2, User, UserX, ArrowRight, Spline,
  Circle, Square, Type, Triangle, Undo2, Redo2, Trash2, Goal,
} from 'lucide-react'
import DrillPitchSVG, { clientToSVG, FULL_W, FULL_H, HALF_W, HALF_H } from './DrillPitchSVG'
import type { DiagramElement, DiagramData, DiagramElementType } from '@/lib/training-types'
import { generateElementId, DIAGRAM_ELEMENT_COLORS } from '@/lib/training-types'

type Tool = 'select' | DiagramElementType

interface Props {
  value: DiagramData
  onChange: (data: DiagramData) => void
  mode?: 'full' | 'half'
}

const TOOLS: { key: Tool; icon: typeof MousePointer2; label: string }[] = [
  { key: 'select', icon: MousePointer2, label: 'Seleccionar' },
  { key: 'player', icon: User, label: 'Jugador' },
  { key: 'opponent', icon: UserX, label: 'Rival' },
  { key: 'ball', icon: Circle, label: 'Pilota' },
  { key: 'arrow', icon: ArrowRight, label: 'Fletxa' },
  { key: 'curved_arrow', icon: Spline, label: 'Fletxa corba' },
  { key: 'zone', icon: Square, label: 'Zona' },
  { key: 'text', icon: Type, label: 'Text' },
  { key: 'cone', icon: Triangle, label: 'Con' },
  { key: 'goal', icon: Goal, label: 'Porteria' },
]

const DEFAULT_COLORS: Record<string, string> = {
  player: '#22c55e',
  opponent: '#ef4444',
  ball: '#f59e0b',
  arrow: '#ffffff',
  curved_arrow: '#ffffff',
  zone: '#3b82f6',
  text: '#ffffff',
  cone: '#f97316',
  goal: '#ffffff',
}

export default function ExerciseDiagramEditor({ value, onChange, mode = 'full' }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [activeTool, setActiveTool] = useState<Tool>('select')
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
        if (el.type === 'text' || el.type === 'goal') {
          return Math.abs(x - el.x) < 30 && Math.abs(y - el.y) < 15
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
    const newEl: DiagramElement = {
      id: generateElementId(),
      type: activeTool,
      x, y,
      color: activeColor || DEFAULT_COLORS[activeTool] || '#ffffff',
    }

    if (activeTool === 'player') {
      newEl.label = String(playerCounter)
      newEl.color = activeColor || '#22c55e'
      setPlayerCounter(prev => prev + 1)
    } else if (activeTool === 'opponent') {
      newEl.color = activeColor || '#ef4444'
    } else if (activeTool === 'ball') {
      newEl.color = '#f59e0b'
    } else if (activeTool === 'cone') {
      newEl.color = activeColor || '#f97316'
    } else if (activeTool === 'text') {
      const text = prompt('Text:')
      if (!text) return
      newEl.label = text
    } else if (activeTool === 'goal') {
      newEl.label = '⊓'
    }

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
      case 'player':
      case 'opponent': {
        const isPlayer = el.type === 'player'
        return (
          <g key={el.id}>
            {isSelected && (
              <circle cx={el.x} cy={el.y} r={22} fill={el.color || (isPlayer ? '#22c55e' : '#ef4444')} opacity={0.3} />
            )}
            <circle
              cx={el.x} cy={el.y} r={17}
              fill={isPlayer ? 'url(#playerGrad)' : 'url(#opponentGrad)'}
              stroke={el.color || (isPlayer ? '#22c55e' : '#ef4444')}
              strokeWidth={isSelected ? 2.5 : 1.5}
            />
            <text
              x={el.x} y={el.y + 4}
              textAnchor="middle" fill="#fff"
              fontSize={el.label && el.label.length > 2 ? 7 : 9}
              fontWeight={600}
              style={{ pointerEvents: 'none' }}
            >
              {el.label || (isPlayer ? 'J' : 'R')}
            </text>
          </g>
        )
      }

      case 'ball':
        return (
          <g key={el.id}>
            {isSelected && <circle cx={el.x} cy={el.y} r={13} fill="#f59e0b" opacity={0.3} />}
            <circle cx={el.x} cy={el.y} r={8} fill="#f59e0b" stroke="#fbbf24" strokeWidth={1.5} />
            <circle cx={el.x - 2} cy={el.y - 2} r={2} fill="rgba(255,255,255,0.4)" />
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

      case 'goal':
        return (
          <g key={el.id}>
            <rect
              x={el.x - 25} y={el.y - 8}
              width={50} height={16}
              fill="none" stroke={el.color || '#fff'}
              strokeWidth={isSelected ? 2.5 : 2}
              rx={2}
            />
            {/* Net lines */}
            <line x1={el.x - 25} y1={el.y - 8} x2={el.x - 20} y2={el.y + 8} stroke={el.color || '#fff'} strokeWidth={0.5} opacity={0.4} />
            <line x1={el.x - 12} y1={el.y - 8} x2={el.x - 7} y2={el.y + 8} stroke={el.color || '#fff'} strokeWidth={0.5} opacity={0.4} />
            <line x1={el.x} y1={el.y - 8} x2={el.x + 5} y2={el.y + 8} stroke={el.color || '#fff'} strokeWidth={0.5} opacity={0.4} />
            <line x1={el.x + 12} y1={el.y - 8} x2={el.x + 17} y2={el.y + 8} stroke={el.color || '#fff'} strokeWidth={0.5} opacity={0.4} />
            <line x1={el.x + 25} y1={el.y - 8} x2={el.x + 25} y2={el.y + 8} stroke={el.color || '#fff'} strokeWidth={0.5} opacity={0.4} />
          </g>
        )

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
      <div className="flex lg:hidden" style={{ gap: 2, overflowX: 'auto', paddingBottom: 4 }}>
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
              style={{ ...toolBtnStyle(isActive), minWidth: 40, minHeight: 40 }}
            >
              <Icon size={16} />
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
