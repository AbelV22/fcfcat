'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { upsertExercise, fetchUserExercises } from '@/lib/training-data'
import type { TrainingExercise, ExerciseCategory, Intensity, DiagramData } from '@/lib/training-types'
import { CATEGORY_LABELS, INTENSITY_LABELS, EQUIPMENT_OPTIONS } from '@/lib/training-types'
import ExerciseDiagramEditor from '@/components/entrenaments/ExerciseDiagramEditor'
import { SEED_EXERCISES } from '@/lib/training-seed-exercises'

export default function NouExerciciPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [name, setName] = useState('')
  const [category, setCategory] = useState<ExerciseCategory>('rondo')
  const [description, setDescription] = useState('')
  const [durationMin, setDurationMin] = useState(15)
  const [intensity, setIntensity] = useState<Intensity>('medium')
  const [minPlayers, setMinPlayers] = useState(6)
  const [equipment, setEquipment] = useState<string[]>([])
  const [tacticalObjective, setTacticalObjective] = useState('')
  const [diagramData, setDiagramData] = useState<DiagramData>({ elements: [] })
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!editId)
  const [showSeed, setShowSeed] = useState(false)
  const [hasExercises, setHasExercises] = useState(true)

  // Load exercise for editing
  useEffect(() => {
    async function load() {
      if (editId) {
        try {
          const exercises = await fetchUserExercises()
          const ex = exercises.find(e => e.id === editId)
          if (ex) {
            setName(ex.name)
            setCategory(ex.category)
            setDescription(ex.description || '')
            setDurationMin(ex.duration_min)
            setIntensity(ex.intensity)
            setMinPlayers(ex.min_players)
            setEquipment(ex.equipment)
            setTacticalObjective(ex.tactical_objective || '')
            setDiagramData(ex.diagram_data || { elements: [] })
            setTags(ex.tags.join(', '))
          }
          setHasExercises(exercises.length > 0)
        } catch (err) {
          console.error(err)
        } finally {
          setLoading(false)
        }
      } else {
        // Check if user has exercises (for seed prompt)
        try {
          const exercises = await fetchUserExercises()
          setHasExercises(exercises.length > 0)
          if (exercises.length === 0) setShowSeed(true)
        } catch { /* ignore */ }
      }
    }
    load()
  }, [editId])

  const handleSave = async () => {
    if (!name.trim()) return
    try {
      setSaving(true)
      await upsertExercise({
        id: editId || undefined,
        name: name.trim(),
        category,
        description: description.trim() || null,
        duration_min: durationMin,
        intensity,
        min_players: minPlayers,
        equipment,
        tactical_objective: tacticalObjective.trim() || null,
        diagram_data: diagramData,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      router.push('/dashboard/entrenaments?tab=biblioteca')
    } catch (err) {
      console.error('Error saving exercise:', err)
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleSeedImport = async () => {
    try {
      setSaving(true)
      for (const seed of SEED_EXERCISES) {
        await upsertExercise({
          ...seed,
          is_template: true,
        })
      }
      router.push('/dashboard/entrenaments?tab=biblioteca')
    } catch (err) {
      console.error('Error seeding:', err)
      alert('Error al importar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#62666d' }}>Carregant...</div>
    )
  }

  return (
    <div style={{ padding: '16px 16px 32px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link
          href="/dashboard/entrenaments"
          style={{ color: '#8a8f98', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 style={{
          fontFamily: 'var(--font-headline)', fontSize: 20, fontWeight: 800,
          color: '#f7f8f8', letterSpacing: '-0.5px',
        }}>
          {editId ? 'Editar exercici' : 'Nou exercici'}
        </h1>
      </div>

      {/* Seed import banner */}
      {showSeed && !hasExercises && (
        <div style={{
          padding: 16, borderRadius: 8, marginBottom: 20,
          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 510, color: '#22c55e', marginBottom: 6 }}>
            Importar exercicis predefinits?
          </div>
          <p style={{ fontSize: 13, color: '#d0d6e0', marginBottom: 12 }}>
            Tenim {SEED_EXERCISES.length} exercicis amb diagrames llestos per usar. Els pots modificar o eliminar.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSeedImport}
              disabled={saving}
              style={{
                padding: '8px 16px', background: '#22c55e', color: '#08090a',
                borderRadius: 6, fontWeight: 510, fontSize: 13, border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font-inter)',
              }}
            >
              {saving ? 'Important...' : 'Importar'}
            </button>
            <button
              onClick={() => setShowSeed(false)}
              style={{
                padding: '8px 16px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6, color: '#8a8f98', fontSize: 13, cursor: 'pointer',
              }}
            >
              No, crear el meu
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Name + Category row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
          <div>
            <label style={labelStyle}>Nom *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Rondo 4v2..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Categoria *</label>
            <select value={category} onChange={e => setCategory(e.target.value as ExerciseCategory)} style={inputStyle}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Descripcio</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Explicacio de l'exercici..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Duration + Intensity + Players row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <label style={labelStyle}>Duracio (min)</label>
            <input
              type="number"
              value={durationMin}
              onChange={e => setDurationMin(Number(e.target.value))}
              min={1} max={120}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Intensitat</label>
            <select value={intensity} onChange={e => setIntensity(e.target.value as Intensity)} style={inputStyle}>
              {Object.entries(INTENSITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Min. jugadors</label>
            <input
              type="number"
              value={minPlayers}
              onChange={e => setMinPlayers(Number(e.target.value))}
              min={1} max={30}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Equipment */}
        <div>
          <label style={labelStyle}>Material</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {EQUIPMENT_OPTIONS.map(eq => {
              const selected = equipment.includes(eq)
              return (
                <button
                  key={eq}
                  type="button"
                  onClick={() => setEquipment(prev => selected ? prev.filter(e => e !== eq) : [...prev, eq])}
                  style={{
                    padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 510,
                    background: selected ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                    border: selected ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    color: selected ? '#22c55e' : '#8a8f98',
                    cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  {eq}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tactical objective */}
        <div>
          <label style={labelStyle}>Objectiu tactic</label>
          <input
            type="text"
            value={tacticalObjective}
            onChange={e => setTacticalObjective(e.target.value)}
            placeholder="Ex: Conservacio de pilota sota pressio"
            style={inputStyle}
          />
        </div>

        {/* Tags */}
        <div>
          <label style={labelStyle}>Etiquetes (separades per coma)</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="rondo, possessio, pressio"
            style={inputStyle}
          />
        </div>

        {/* Diagram editor */}
        <div>
          <label style={labelStyle}>Diagrama</label>
          <ExerciseDiagramEditor
            value={diagramData}
            onChange={setDiagramData}
            mode="full"
          />
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', background: '#22c55e', color: '#08090a',
              borderRadius: 6, fontWeight: 510, fontSize: 14, border: 'none',
              cursor: !name.trim() || saving ? 'not-allowed' : 'pointer',
              opacity: !name.trim() || saving ? 0.5 : 1,
              fontFamily: 'var(--font-inter)',
            }}
          >
            <Save size={16} />
            {saving ? 'Guardant...' : editId ? 'Actualitzar' : 'Guardar exercici'}
          </button>
          <Link
            href="/dashboard/entrenaments"
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '10px 16px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6, color: '#8a8f98', fontSize: 13,
              textDecoration: 'none', fontFamily: 'var(--font-inter)',
            }}
          >
            Cancel·lar
          </Link>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#62666d',
  textTransform: 'uppercase', letterSpacing: '0.04em',
  marginBottom: 4, fontWeight: 510,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 6, color: '#f7f8f8', fontSize: 13,
  fontFamily: 'var(--font-inter)', outline: 'none',
}
