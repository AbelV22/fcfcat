'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, X, Sparkles, Copy, Check } from 'lucide-react'
import type { TrainingExercise, ExerciseCategory } from '@/lib/training-types'
import { CATEGORY_LABELS } from '@/lib/training-types'
import { toggleExerciseFavorite, deleteExercise, cloneTemplate, fetchUserExercises } from '@/lib/training-data'
import { createClient } from '@/lib/supabase-client'
import ExerciseCard from './ExerciseCard'
import ExerciseDetailModal from './ExerciseDetailModal'

const CATEGORIES: (ExerciseCategory | 'all' | 'favorites')[] = [
  'all', 'favorites', 'warmup', 'rondo', 'possession', 'finishing',
  'defensive_shape', 'ssg', 'set_pieces', 'conditioning', 'cooldown',
  'tactical', 'technical', 'mixed',
]

type Source = 'mine' | 'templates'

interface Props {
  exercises: TrainingExercise[]
  onExercisesChange: (exercises: TrainingExercise[]) => void
  onSelectExercise?: (exercise: TrainingExercise) => void
  selectionMode?: boolean
}

export default function ExerciseLibrary({ exercises, onExercisesChange, onSelectExercise, selectionMode }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<ExerciseCategory | 'all' | 'favorites'>('all')
  const [selectedExercise, setSelectedExercise] = useState<TrainingExercise | null>(null)
  const [source, setSource] = useState<Source>('mine')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [cloningId, setCloningId] = useState<string | null>(null)
  const [justCloned, setJustCloned] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null)
    })
  }, [])

  // Split into own vs templates
  const { own, templates } = useMemo(() => {
    const own: TrainingExercise[] = []
    const templates: TrainingExercise[] = []
    for (const ex of exercises) {
      // Templates live server-side with user_id = NULL and is_template = true
      if (ex.user_id === null || (ex.is_template && ex.user_id !== currentUserId)) {
        templates.push(ex)
      } else {
        own.push(ex)
      }
    }
    return { own, templates }
  }, [exercises, currentUserId])

  const visible = source === 'mine' ? own : templates

  const filtered = useMemo(() => {
    let result = visible
    if (activeCategory === 'favorites') {
      result = result.filter(e => e.is_favorite)
    } else if (activeCategory !== 'all') {
      result = result.filter(e => e.category === activeCategory)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return result
  }, [visible, activeCategory, search])

  const handleToggleFavorite = useCallback(async (id: string, fav: boolean) => {
    try {
      await toggleExerciseFavorite(id, fav)
      onExercisesChange(exercises.map(e => e.id === id ? { ...e, is_favorite: fav } : e))
    } catch (err) {
      console.error('Error toggling favorite:', err)
    }
  }, [exercises, onExercisesChange])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Eliminar aquest exercici?')) return
    try {
      await deleteExercise(id)
      onExercisesChange(exercises.filter(e => e.id !== id))
    } catch (err) {
      console.error('Error deleting exercise:', err)
    }
  }, [exercises, onExercisesChange])

  const handleClick = useCallback((exercise: TrainingExercise) => {
    if (selectionMode && onSelectExercise) {
      onSelectExercise(exercise)
    } else {
      setSelectedExercise(exercise)
    }
  }, [selectionMode, onSelectExercise])

  const handleCloneTemplate = useCallback(async (templateId: string) => {
    try {
      setCloningId(templateId)
      await cloneTemplate(templateId)
      setJustCloned(templateId)
      setTimeout(() => setJustCloned(null), 2000)
      // Reload the list so the new own copy appears in "Els meus"
      const fresh = await fetchUserExercises()
      onExercisesChange(fresh)
    } catch (err) {
      console.error('Error cloning template:', err)
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Error: ${msg}`)
    } finally {
      setCloningId(null)
    }
  }, [onExercisesChange])

  const counts = { mine: own.length, templates: templates.length }

  return (
    <div>
      {/* Source tabs — Els meus | Plantilles NeoScout */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 12,
        padding: 4,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        {([
          { key: 'mine' as const, label: 'Els meus', count: counts.mine, icon: null },
          { key: 'templates' as const, label: 'Plantilles NeoScout', count: counts.templates, icon: Sparkles },
        ]).map(tab => {
          const active = source === tab.key
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => { setSource(tab.key); setActiveCategory('all') }}
              style={{
                flex: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '7px 12px',
                borderRadius: 6,
                background: active ? 'rgba(34,197,94,0.12)' : 'transparent',
                border: 'none',
                color: active ? '#22c55e' : '#8a8f98',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-inter)',
                transition: 'all 0.15s',
              }}
            >
              {Icon && <Icon size={14} />}
              {tab.label}
              <span style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 8,
                background: active ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                color: active ? '#22c55e' : '#62666d',
              }}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Header with search and add button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          flex: 1, position: 'relative', display: 'flex', alignItems: 'center',
        }}>
          <Search size={15} style={{ position: 'absolute', left: 10, color: '#62666d' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={source === 'mine' ? 'Cercar els meus exercicis...' : 'Cercar plantilles NeoScout...'}
            style={{
              width: '100%', padding: '8px 10px 8px 32px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6, color: '#f7f8f8', fontSize: 13,
              fontFamily: 'var(--font-inter)',
              outline: 'none',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 8, background: 'none', border: 'none', color: '#62666d', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        {!selectionMode && source === 'mine' && (
          <Link
            href="/dashboard/entrenaments/biblioteca/nou"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '8px 14px', background: '#22c55e', color: '#08090a',
              borderRadius: 6, fontWeight: 510, fontSize: 13,
              textDecoration: 'none', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-inter)',
            }}
          >
            <Plus size={15} />
            Nou
          </Link>
        )}
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat
          const label = cat === 'all' ? 'Tots' : cat === 'favorites' ? '★ Preferits' : CATEGORY_LABELS[cat]
          // Hide "Preferits" in templates tab (they're not favoritable)
          if (cat === 'favorites' && source === 'templates') return null
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '5px 12px', borderRadius: 9999,
                background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                border: isActive ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.06)',
                color: isActive ? '#22c55e' : '#8a8f98',
                fontSize: 12, fontWeight: 510, cursor: 'pointer',
                whiteSpace: 'nowrap', fontFamily: 'var(--font-inter)',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#62666d', fontSize: 13 }}>
          {source === 'mine' && own.length === 0 ? (
            <div>
              <div style={{
                padding: 24, borderRadius: 8, marginBottom: 16,
                background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)',
              }}>
                <Sparkles size={28} style={{ color: '#22c55e', margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 15, fontWeight: 510, color: '#f7f8f8', marginBottom: 6 }}>
                  Comença amb les plantilles NeoScout
                </p>
                <p style={{ color: '#8a8f98', marginBottom: 16, fontSize: 13, maxWidth: 360, margin: '0 auto 16px' }}>
                  Tenim {counts.templates} exercicis llestos per usar. Copia&apos;ls a la teva biblioteca o crea els teus propis.
                </p>
                <button
                  onClick={() => setSource('templates')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 20px', background: '#22c55e', color: '#08090a',
                    borderRadius: 6, fontWeight: 510, fontSize: 14, border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  <Sparkles size={16} />
                  Veure plantilles
                </button>
              </div>
              <p style={{ color: '#62666d', fontSize: 12, marginBottom: 8 }}>O crea el teu primer exercici:</p>
              <Link
                href="/dashboard/entrenaments/biblioteca/nou"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 6, fontWeight: 510, fontSize: 13, color: '#d0d6e0',
                  textDecoration: 'none', fontFamily: 'var(--font-inter)',
                }}
              >
                <Plus size={15} />
                Crear exercici
              </Link>
            </div>
          ) : (
            'Cap exercici trobat'
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}>
          {filtered.map(ex => {
            const isTemplate = source === 'templates'
            return (
              <div key={ex.id} style={{ position: 'relative' }}>
                <ExerciseCard
                  exercise={ex}
                  onToggleFavorite={isTemplate ? undefined : handleToggleFavorite}
                  onDelete={isTemplate ? undefined : handleDelete}
                  onClick={handleClick}
                />
                {isTemplate && (
                  <button
                    onClick={e => { e.stopPropagation(); handleCloneTemplate(ex.id) }}
                    disabled={cloningId === ex.id || justCloned === ex.id}
                    title="Copiar a la meva biblioteca"
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '5px 9px',
                      background: justCloned === ex.id ? 'rgba(34,197,94,0.9)' : 'rgba(34,197,94,0.12)',
                      border: '1px solid rgba(34,197,94,0.4)',
                      color: justCloned === ex.id ? '#08090a' : '#22c55e',
                      fontSize: 11, fontWeight: 600,
                      borderRadius: 6,
                      cursor: cloningId === ex.id ? 'wait' : 'pointer',
                      backdropFilter: 'blur(4px)',
                      fontFamily: 'var(--font-inter)',
                    }}
                  >
                    {justCloned === ex.id ? <Check size={12} /> : <Copy size={12} />}
                    {justCloned === ex.id ? 'Copiat' : cloningId === ex.id ? '...' : 'Copiar'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedExercise && !selectionMode && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
          onUpdate={updated => {
            setSelectedExercise(prev => prev ? { ...prev, ...updated } : prev)
            onExercisesChange(exercises.map(e => e.id === selectedExercise.id ? { ...e, ...updated } : e))
          }}
        />
      )}
    </div>
  )
}
