'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Share2, Copy, Check, Lock, ExternalLink } from 'lucide-react'
import { publishExercise, unpublishExercise } from '@/lib/training-data'
import type { TrainingExercise } from '@/lib/training-types'
import { SITE_URL } from '@/lib/supabase-config'

interface Props {
  exercise: TrainingExercise
  onUpdate?: (updated: Partial<TrainingExercise>) => void
}

export default function ExerciseShareButton({ exercise, onUpdate }: Props) {
  const [isPublic, setIsPublic] = useState(exercise.is_public ?? false)
  const [slug, setSlug] = useState(exercise.share_slug ?? null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const shareUrl = slug ? `${SITE_URL}/e/${slug}` : null

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleShareClick = useCallback(async () => {
    if (isPublic && shareUrl) {
      setOpen(prev => !prev)
      return
    }
    // First time: publish and copy link
    setLoading(true)
    try {
      const newSlug = await publishExercise(exercise.id)
      const url = `${SITE_URL}/e/${newSlug}`
      setSlug(newSlug)
      setIsPublic(true)
      onUpdate?.({ is_public: true, share_slug: newSlug })
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      setOpen(true)
    } catch (err) {
      console.error('Error publishing exercise:', err)
    } finally {
      setLoading(false)
    }
  }, [isPublic, shareUrl, exercise.id, onUpdate])

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
    setOpen(false)
  }, [shareUrl])

  const handleWhatsApp = useCallback(() => {
    if (!shareUrl) return
    const text = `Mira aquest exercici: ${exercise.name}\n${shareUrl}\n\nFet amb NeoScout ⚽`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
    setOpen(false)
  }, [shareUrl, exercise.name])

  const handleUnpublish = useCallback(async () => {
    if (!confirm("Desactivar el link de compartició? Les persones amb el link ja no podran veure l'exercici.")) return
    setLoading(true)
    try {
      await unpublishExercise(exercise.id)
      setIsPublic(false)
      onUpdate?.({ is_public: false })
    } catch (err) {
      console.error('Error unpublishing exercise:', err)
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }, [exercise.id, onUpdate])

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={handleShareClick}
        disabled={loading}
        title={isPublic ? 'Compartit' : 'Compartir exercici'}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 510,
          background: isPublic ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
          border: isPublic ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.06)',
          color: isPublic ? '#22c55e' : '#8a8f98',
          cursor: loading ? 'wait' : 'pointer',
          transition: 'all 0.15s',
          fontFamily: 'var(--font-inter)',
        }}
      >
        {copied ? <Check size={14} /> : <Share2 size={14} />}
        {copied ? 'Link copiat!' : isPublic ? 'Compartit' : 'Compartir'}
      </button>

      {open && shareUrl && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6,
          background: '#1a1d23', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: 6, minWidth: 220, zIndex: 50,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {/* Link preview */}
          <div style={{
            padding: '8px 10px', marginBottom: 4,
            background: 'rgba(255,255,255,0.04)', borderRadius: 6,
            fontSize: 11, color: '#62666d', fontFamily: 'var(--font-inter)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {shareUrl}
          </div>

          <DropdownItem icon={Copy} label="Copiar link" onClick={handleCopy} />
          <DropdownItem icon={ExternalLink} label="Obrir en nova pestanya" onClick={() => { window.open(shareUrl, '_blank'); setOpen(false) }} />
          <DropdownItem
            icon={() => (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M5.339 3h13.322C20.496 3 22 4.504 22 6.339v11.322C22 19.496 20.496 21 18.661 21H5.339C3.504 21 2 19.496 2 17.661V6.339C2 4.504 3.504 3 5.339 3z" fillOpacity={0.15} />
              </svg>
            )}
            label="Enviar per WhatsApp"
            onClick={handleWhatsApp}
            color="#22c55e"
          />

          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />

          <DropdownItem icon={Lock} label="Desactivar compartició" onClick={handleUnpublish} color="#ef4444" />
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  icon: Icon, label, onClick, color,
}: {
  icon: React.ComponentType<{ size?: number }> | (() => React.ReactNode)
  label: string
  onClick: () => void
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 6, border: 'none', background: 'none',
        color: color || '#d0d6e0', fontSize: 13, cursor: 'pointer',
        fontFamily: 'var(--font-inter)', textAlign: 'left',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}
