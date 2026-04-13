'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Star, X, Download } from 'lucide-react'
import type { TrainingExercise, ExerciseCategory } from '@/lib/training-types'
import { CATEGORY_LABELS } from '@/lib/training-types'
import { toggleExerciseFavorite, deleteExercise, upsertExercise } from '@/lib/training-data'
import { SEED_EXERCISES } from '@/lib/training-seed-exercises'
import ExerciseCard from './ExerciseCard'
import ExerciseDetailModal from './ExerciseDetailModal'

const CATEGORIES: (ExerciseCategory | 'all' | 'favorites')[] = [
  'all', 'favorites', 'warmup', 'rondo', 'possession', 'finishing',
  'defensive_shape', 'ssg', 'set_pieces', 'conditioning', 'cooldown',
  'tactical', 'technical', 'mixed',
]

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
  const [importing, setImporting] = useState(false)

  const handleImportSeed = useCallback(async () => {
    try {
      setImporting(true)
      const imported: TrainingExercise[] = []
      for (const seed of SEED_EXERCISES) {
        const id = await upsertExercise({ ...seed, is_template: true })
        imported.push({ ...seed, id, user_id: '', is_favorite: false, is_template: true, created_at: '', updated_at: '' } as TrainingExercise)
      }
      onExercisesChange([...exercises, ...imported])
    } catch (err) {
      console.error('Error importing seed exercises:', err)
      alert('Error al importar exercicis')
    } finally {
      setImporting(false)
    }
  }, [exercises, onExercisesChange])

  const filtered = useMemo(() => {
    let result = exercises
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
  }, [exercises, activeCategory, search])

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

  return (
    <div>
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
            placeholder="Cercar exercicis..."
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
        {!selectionMode && (
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
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat
          const label = cat === 'all' ? 'Tots' : cat === 'favorites' ? '★ Preferits' : CATEGORY_LABELS[cat]
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
          {exercises.length === 0 ? (
            <div>
              <div style={{
                padding: 24, borderRadius: 8, marginBottom: 16,
                background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)',
              }}>
                <Download size={28} style={{ color: '#22c55e', margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 15, fontWeight: 510, color: '#f7f8f8', marginBottom: 6 }}>
                  Biblioteca d&apos;exercicis
                </p>
                <p style={{ color: '#8a8f98', marginBottom: 16, fontSize: 13, maxWidth: 360, margin: '0 auto 16px' }}>
                  Importa {SEED_EXERCISES.length} exercicis predefinits amb diagrames: escalfaments, rondos, possessio, finalitzacio, defensa, jocs reduits i mes.
                </p>
                <button
                  onClick={handleImportSeed}
                  disabled={importing}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 20px', background: '#22c55e', color: '#08090a',
                    borderRadius: 6, fontWeight: 510, fontSize: 14, border: 'none',
                    cursor: importing ? 'not-allowed' : 'pointer',
                    opacity: importing ? 0.6 : 1,
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  <Download size={16} />
                  {importing ? `Important... (${SEED_EXERCISES.length} exercicis)` : `Importar ${SEED_EXERCISES.length} exercicis`}
                </button>
              </div>
              <p style={{ color: '#62666d', fontSize: 12, marginBottom: 8 }}>O crea els teus propis:</p>
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
          {filtered.map(ex => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
              onClick={handleClick}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedExercise && !selectionMode && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </div>
  )
}
