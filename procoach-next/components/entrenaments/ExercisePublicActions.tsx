'use client'

import { useState, useCallback } from 'react'
import { BookmarkPlus, Check, Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { clonePublicExercise } from '@/lib/training-data'
import { SITE_URL } from '@/lib/supabase-config'

interface Props {
  exerciseId: string
  exerciseName: string
  slug: string
  isAuthenticated: boolean
}

export default function ExercisePublicActions({ exerciseId, exerciseName, slug, isAuthenticated }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [whatsAppCopied, setWhatsAppCopied] = useState(false)

  const shareUrl = `${SITE_URL}/e/${slug}`
  const whatsAppText = `Mira aquest exercici de futbol: ${exerciseName}\n${shareUrl}\n\nFet amb NeoScout ⚽`

  const handleSave = useCallback(async () => {
    if (!isAuthenticated) {
      // Redirect to login with clone param
      router.push(`/login?clone=${exerciseId}&redirect=/dashboard/entrenaments`)
      return
    }
    setSaving(true)
    try {
      await clonePublicExercise(exerciseId)
      setSaved(true)
      setTimeout(() => {
        router.push('/dashboard/entrenaments')
      }, 1200)
    } catch (err) {
      console.error('Error saving exercise:', err)
      setSaving(false)
    }
  }, [isAuthenticated, exerciseId, router])

  const handleWhatsApp = useCallback(() => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsAppText)}`, '_blank')
    setWhatsAppCopied(true)
    setTimeout(() => setWhatsAppCopied(false), 3000)
  }, [whatsAppText])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
      {/* Primary CTA */}
      <button
        onClick={handleSave}
        disabled={saving || saved}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700,
          background: saved ? 'rgba(34,197,94,0.15)' : '#22c55e',
          border: saved ? '1px solid rgba(34,197,94,0.3)' : 'none',
          color: saved ? '#22c55e' : '#000',
          cursor: saving || saved ? 'default' : 'pointer',
          transition: 'all 0.2s',
          fontFamily: 'var(--font-inter)',
        }}
      >
        {saved ? (
          <>
            <Check size={18} />
            Guardat! Redirigint...
          </>
        ) : saving ? (
          'Guardant...'
        ) : (
          <>
            <BookmarkPlus size={18} />
            {isAuthenticated ? 'Guardar a la meva biblioteca' : 'Guardar gratis (crea compte)'}
          </>
        )}
      </button>

      {/* WhatsApp share */}
      <button
        onClick={handleWhatsApp}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px 24px', borderRadius: 10, fontSize: 14, fontWeight: 510,
          background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)',
          color: '#25d366',
          cursor: 'pointer',
          transition: 'all 0.15s',
          fontFamily: 'var(--font-inter)',
        }}
      >
        <WhatsAppIcon />
        {whatsAppCopied ? 'Obert!' : 'Compartir per WhatsApp'}
      </button>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
