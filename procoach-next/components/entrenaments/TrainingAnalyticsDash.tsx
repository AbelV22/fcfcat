'use client'

import { useMemo } from 'react'
import { Calendar, CheckCircle2, Clock, Zap, TrendingUp } from 'lucide-react'
import type { TrainingSession, TrainingExercise, FocusArea } from '@/lib/training-types'
import {
  INTENSITY_COLORS, INTENSITY_FACTOR, FOCUS_AREA_LABELS,
  calculateLoad,
} from '@/lib/training-types'

interface Props {
  sessions: TrainingSession[]
  exercises: TrainingExercise[]
}

const FOCUS_COLORS: Record<FocusArea, string> = {
  technical: '#3b82f6',
  tactical: '#f59e0b',
  physical: '#ef4444',
  mental: '#a855f7',
}

export default function TrainingAnalyticsDash({ sessions, exercises }: Props) {
  const stats = useMemo(() => {
    const total = sessions.length
    const completed = sessions.filter(s => s.status === 'completed').length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const avgDuration = total > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.duration_min || 0), 0) / total)
      : 0

    // Average intensity as weighted value
    const intensitySum = sessions.reduce((sum, s) => sum + (INTENSITY_FACTOR[s.planned_intensity] || 0), 0)
    const avgIntensity = total > 0 ? (intensitySum / total).toFixed(1) : '0'

    // Focus area distribution
    const focusCounts: Record<string, number> = {}
    sessions.forEach(s => {
      (s.focus_areas || []).forEach(f => {
        focusCounts[f] = (focusCounts[f] || 0) + 1
      })
    })

    // Weekly load (last 8 weeks)
    const weeklyLoad: { week: string; load: number; sessions: number }[] = []
    const now = new Date()
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 - w * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const weekSessions = sessions.filter(s => {
        const parts = s.session_date.split('-')
        if (parts.length !== 3) return false
        const d = new Date(+parts[2], +parts[1] - 1, +parts[0])
        return d >= weekStart && d <= weekEnd
      })

      const load = weekSessions.reduce((sum, s) =>
        sum + calculateLoad(s.duration_min, s.planned_intensity), 0
      )

      weeklyLoad.push({
        week: `S${8 - w}`,
        load,
        sessions: weekSessions.length,
      })
    }

    return { total, completed, completionRate, avgDuration, avgIntensity, focusCounts, weeklyLoad }
  }, [sessions])

  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#62666d', fontSize: 13 }}>
        <TrendingUp size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
        <div>Crea sessions per veure analitiques</div>
      </div>
    )
  }

  const maxLoad = Math.max(...stats.weeklyLoad.map(w => w.load), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        <KPICard icon={Calendar} label="Total sessions" value={String(stats.total)} />
        <KPICard icon={CheckCircle2} label="Completades" value={`${stats.completionRate}%`} accent />
        <KPICard icon={Clock} label="Duracio mitja" value={`${stats.avgDuration} min`} />
        <KPICard icon={Zap} label="Intensitat mitja" value={stats.avgIntensity} />
      </div>

      {/* Focus area donut + Weekly load chart side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}
        className="analytics-charts"
      >
        {/* Focus area donut */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: 16,
        }}>
          <h3 style={{ fontSize: 12, color: '#8a8f98', fontWeight: 510, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Focus
          </h3>
          <svg viewBox="0 0 120 120" style={{ width: '100%', maxWidth: 160, margin: '0 auto', display: 'block' }}>
            {renderDonut(stats.focusCounts, 60, 60, 50, 30)}
          </svg>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' }}>
            {Object.entries(stats.focusCounts).map(([key, count]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8a8f98' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: FOCUS_COLORS[key as FocusArea] || '#8a8f98',
                }} />
                {FOCUS_AREA_LABELS[key as FocusArea] || key} ({count})
              </div>
            ))}
          </div>
        </div>

        {/* Weekly load bar chart */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: 16,
        }}>
          <h3 style={{ fontSize: 12, color: '#8a8f98', fontWeight: 510, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Carrega setmanal
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
            {stats.weeklyLoad.map((w, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', borderRadius: 4,
                  height: Math.max(4, (w.load / maxLoad) * 100),
                  background: w.load > 0
                    ? `linear-gradient(to top, ${INTENSITY_COLORS.medium}, ${INTENSITY_COLORS.low})`
                    : 'rgba(255,255,255,0.04)',
                  transition: 'height 0.3s',
                }} />
                <span style={{ fontSize: 9, color: '#62666d' }}>{w.week}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .analytics-charts {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, accent }: {
  icon: typeof Calendar; label: string; value: string; accent?: boolean
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 8, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={14} style={{ color: accent ? '#22c55e' : '#62666d' }} />
        <span style={{ fontSize: 10, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 510 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 510, color: accent ? '#22c55e' : '#f7f8f8', fontFamily: 'var(--font-inter)' }}>
        {value}
      </div>
    </div>
  )
}

function renderDonut(data: Record<string, number>, cx: number, cy: number, r: number, innerR: number) {
  const total = Object.values(data).reduce((s, v) => s + v, 0)
  if (total === 0) return null

  const entries = Object.entries(data)
  let startAngle = -Math.PI / 2

  return entries.map(([key, value], i) => {
    const angle = (value / total) * Math.PI * 2
    const endAngle = startAngle + angle
    const largeArc = angle > Math.PI ? 1 : 0

    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const ix1 = cx + innerR * Math.cos(endAngle)
    const iy1 = cy + innerR * Math.sin(endAngle)
    const ix2 = cx + innerR * Math.cos(startAngle)
    const iy2 = cy + innerR * Math.sin(startAngle)

    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`

    startAngle = endAngle

    return (
      <path
        key={i}
        d={d}
        fill={FOCUS_COLORS[key as FocusArea] || '#8a8f98'}
        opacity={0.8}
      />
    )
  })
}
