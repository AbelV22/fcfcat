'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, User, Search, ChevronDown, X } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase-client'
import { SITE_URL } from '@/lib/supabase-config'
import { Suspense } from 'react'

/* ── Competition options mapped to DB slugs ── */
const COMPETITIONS: { label: string; slug: string }[] = [
  // Adult
  { label: 'Primera Catalana',          slug: 'primera-catalana' },
  { label: 'Segona Catalana',           slug: 'segona-catalana' },
  { label: 'Tercera Catalana',          slug: 'tercera-catalana' },
  { label: 'Quarta Catalana',           slug: 'quarta-catalana' },
  { label: 'Lliga Elit',                slug: 'lliga-elit' },
  { label: 'Tercera Federació',         slug: 'tercera-federacio' },
  // Juvenil
  { label: "Divisió d'Honor Juvenil",   slug: 'divisio-honor-juvenil' },
  { label: 'Lliga Nacional Juvenil',    slug: 'lliga-nacional-juvenil' },
  { label: 'Preferent Juvenil',         slug: 'preferent-juvenils' },
  { label: 'Juvenil Primera Divisió',   slug: 'juvenil-primera-divisio' },
  // Cadet S16
  { label: "Divisió d'Honor Cadet S16", slug: 'divisio-honor-cadet-s16' },
  { label: 'Preferent Cadet S16',       slug: 'preferent-cadet-s16' },
  // Cadet S15
  { label: "Divisió d'Honor Cadet S15", slug: 'divisio-honor-cadet-s15' },
  { label: 'Preferent Cadet S15',       slug: 'preferent-cadet-s15' },
  // Infantil
  { label: "Divisió d'Honor Infantil S14", slug: 'divisio-honor-infantil-s14' },
  { label: 'Preferent Infantil S14',       slug: 'preferent-infantil-s14' },
  { label: "Divisió d'Honor Infantil S13", slug: 'divisio-honor-infantil-s13' },
  { label: 'Preferent Infantil S13',       slug: 'preferent-infantil-s13' },
]

/* ── Translate common Supabase auth errors to Catalan ── */
function translateAuthError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('rate limit') || lower.includes('too many'))
    return "S'han enviat massa correus. Torna-ho a intentar en uns minuts."
  if (lower.includes('already registered') || lower.includes('already been registered'))
    return 'Aquest correu ja està registrat. Prova d\'iniciar sessió.'
  if (lower.includes('invalid email'))
    return 'Correu electrònic no vàlid.'
  if (lower.includes('password') && lower.includes('6'))
    return 'La contrasenya ha de tenir mínim 6 caràcters.'
  if (lower.includes('signup is disabled'))
    return 'El registre està temporalment desactivat.'
  return 'Error inesperat. Torna-ho a intentar.'
}

const CATEGORY_GROUPS: { label: string; slugs: string[] }[] = [
  { label: 'Sènior', slugs: ['primera-catalana', 'segona-catalana', 'tercera-catalana', 'quarta-catalana', 'lliga-elit', 'tercera-federacio'] },
  { label: 'Juvenil', slugs: ['divisio-honor-juvenil', 'lliga-nacional-juvenil', 'preferent-juvenils', 'juvenil-primera-divisio'] },
  { label: 'Cadet', slugs: ['divisio-honor-cadet-s16', 'preferent-cadet-s16', 'divisio-honor-cadet-s15', 'preferent-cadet-s15'] },
  { label: 'Infantil', slugs: ['divisio-honor-infantil-s14', 'preferent-infantil-s14', 'divisio-honor-infantil-s13', 'preferent-infantil-s13'] },
]

function RegistreForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const referralCode = searchParams.get('ref') || ''

  const [form, setForm] = useState({
    name: searchParams.get('name') || '',
    team: searchParams.get('team') || '',
    competition: searchParams.get('competition') || '',
    email: searchParams.get('email') || '',
    password: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'form' | 'confirm'>('form')

  // Team combobox state
  const [teams, setTeams] = useState<{ name: string; group: string }[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [teamSearch, setTeamSearch] = useState('')
  const [teamOpen, setTeamOpen] = useState(false)
  const teamRef = useRef<HTMLDivElement>(null)

  // Fetch teams when competition changes
  useEffect(() => {
    if (!form.competition) {
      setTeams([])
      setForm(f => ({ ...f, team: '' }))
      setTeamSearch('')
      return
    }
    let cancelled = false
    setTeamsLoading(true)
    setForm(f => ({ ...f, team: '' }))
    setTeamSearch('')
    fetch(`/api/teams?competition=${encodeURIComponent(form.competition)}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) setTeams(d.teams || [])
      })
      .catch(() => {
        if (!cancelled) setTeams([])
      })
      .finally(() => {
        if (!cancelled) setTeamsLoading(false)
      })
    return () => { cancelled = true }
  }, [form.competition])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (teamRef.current && !teamRef.current.contains(e.target as Node)) {
        setTeamOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(teamSearch.toLowerCase())
  )

  const selectTeam = (name: string) => {
    setForm(f => ({ ...f, team: name }))
    setTeamSearch(name)
    setTeamOpen(false)
  }

  const clearTeam = () => {
    setForm(f => ({ ...f, team: '' }))
    setTeamSearch('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.team || !form.competition || !form.email || !form.password) return
    if (form.password.length < 6) {
      setError('La contrasenya ha de tenir mínim 6 caràcters.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${SITE_URL}/auth/callback`,
          data: {
            name: form.name,
            club_name: form.team,
            competition: form.competition,
            ...(referralCode ? { referral_code: referralCode } : {}),
          },
        },
      })
      if (err) {
        setError(translateAuthError(err.message))
        return
      }
      setStep('confirm')
    } catch {
      setError('Error inesperat. Torna-ho a intentar.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px 12px 44px',
    background: 'rgba(255,255,255,0.02)',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
    border: 'none', borderRadius: 6,
    color: '#f7f8f8', fontSize: 14, outline: 'none',
    fontFamily: 'var(--font-inter)',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 510,
    color: '#d0d6e0', marginBottom: 6,
  }

  if (step === 'confirm') {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 8,
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Mail size={24} style={{ color: '#22c55e' }} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 510, color: '#f7f8f8', marginBottom: 8, letterSpacing: '-0.02em' }}>
          Comprova el teu correu
        </h2>
        <p style={{ fontSize: 14, color: '#8a8f98', marginBottom: 24, lineHeight: 1.6 }}>
          T&apos;hem enviat un enllaç de confirmació a{' '}
          <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{form.email}</span>.{' '}
          Fes clic a l&apos;enllaç per activar el teu compte.
        </p>
        <p style={{ fontSize: 12, color: '#62666d' }}>
          Un cop confirmat, podràs{' '}
          <Link href="/login" style={{ color: '#22c55e', textDecoration: 'none' }}>iniciar sessió</Link>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Name */}
      <div>
        <label style={labelStyle}>Nom complet</label>
        <div style={{ position: 'relative' }}>
          <User size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#62666d', pointerEvents: 'none' }} />
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nom i cognoms"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(34,197,94,0.3)')}
            onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)')}
          />
        </div>
      </div>

      {/* Competition */}
      <div>
        <label style={labelStyle}>Competició</label>
        <select
          required
          value={form.competition}
          onChange={e => setForm(f => ({ ...f, competition: e.target.value }))}
          style={{
            width: '100%', padding: '12px 16px',
            background: '#0f1011',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
            border: 'none', borderRadius: 6,
            color: form.competition ? '#f7f8f8' : '#62666d',
            fontSize: 14, outline: 'none',
            fontFamily: 'var(--font-inter)',
            appearance: 'auto',
          }}
          onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(34,197,94,0.3)')}
          onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)')}
        >
          <option value="">Selecciona la competició...</option>
          {CATEGORY_GROUPS.map(group => (
            <optgroup key={group.label} label={group.label}>
              {COMPETITIONS.filter(c => group.slugs.includes(c.slug)).map(c => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Team — searchable combobox */}
      <div>
        <label style={labelStyle}>Equip</label>
        <div style={{ position: 'relative' }} ref={teamRef}>
          <Search size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#62666d', pointerEvents: 'none', zIndex: 1 }} />
          <input
            type="text"
            required
            disabled={!form.competition}
            value={form.team ? form.team : teamSearch}
            onChange={e => {
              setTeamSearch(e.target.value)
              setForm(f => ({ ...f, team: '' }))
              setTeamOpen(true)
            }}
            onFocus={() => form.competition && setTeamOpen(true)}
            placeholder={!form.competition ? 'Selecciona primer la competició' : teamsLoading ? 'Carregant equips...' : `Cerca entre ${teams.length} equips...`}
            style={{
              ...inputStyle,
              paddingRight: 40,
              opacity: !form.competition ? 0.4 : 1,
              cursor: !form.competition ? 'not-allowed' : 'text',
            }}
            onFocus={e => { if (form.competition) e.currentTarget.style.boxShadow = '0 0 0 1px rgba(34,197,94,0.3)' }}
            onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)')}
          />
          {form.team ? (
            <button
              type="button"
              onClick={clearTeam}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#62666d', padding: 0, display: 'flex' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#8a8f98')}
              onMouseLeave={e => (e.currentTarget.style.color = '#62666d')}
            >
              <X size={15} />
            </button>
          ) : (
            <ChevronDown size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#62666d', pointerEvents: 'none' }} />
          )}

          {/* Dropdown */}
          {teamOpen && form.competition && !teamsLoading && (
            <div style={{
              position: 'absolute', zIndex: 50, left: 0, right: 0, top: '100%', marginTop: 4,
              maxHeight: 224, overflowY: 'auto',
              background: '#0f1011',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {filteredTeams.length === 0 ? (
                <div style={{ padding: '12px 16px', fontSize: 13, color: '#62666d' }}>
                  {teamSearch ? 'Cap equip trobat' : 'No hi ha equips'}
                </div>
              ) : (
                filteredTeams.map(t => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => selectTeam(t.name)}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '10px 16px', fontSize: 13,
                      color: '#d0d6e0', background: 'none', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontFamily: 'var(--font-inter)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span>{t.name}</span>
                    {t.group && <span style={{ fontSize: 11, color: '#62666d', marginLeft: 8 }}>{t.group}</span>}
                  </button>
                ))
              )}
            </div>
          )}
          {teamOpen && teamsLoading && (
            <div style={{
              position: 'absolute', zIndex: 50, left: 0, right: 0, top: '100%', marginTop: 4,
              background: '#0f1011', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8a8f98' }}>
                <div style={{ width: 14, height: 14, border: '1.5px solid rgba(255,255,255,0.15)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                Carregant equips...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label style={labelStyle}>Correu electrònic</label>
        <div style={{ position: 'relative' }}>
          <Mail size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#62666d', pointerEvents: 'none' }} />
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="tu@email.com"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(34,197,94,0.3)')}
            onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)')}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label style={labelStyle}>Contrasenya</label>
        <div style={{ position: 'relative' }}>
          <Lock size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#62666d', pointerEvents: 'none' }} />
          <input
            type={showPass ? 'text' : 'password'}
            required
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Mínim 6 caràcters"
            minLength={6}
            style={{ ...inputStyle, paddingRight: 44 }}
            onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(34,197,94,0.3)')}
            onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)')}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#62666d', padding: 0, display: 'flex' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#8a8f98')}
            onMouseLeave={e => (e.currentTarget.style.color = '#62666d')}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(248,113,113,0.06)',
          boxShadow: '0 0 0 1px rgba(248,113,113,0.15)',
          borderRadius: 6, fontSize: 13, color: '#f87171',
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !form.team}
        style={{
          width: '100%', padding: '13px 0', marginTop: 4,
          background: '#22c55e', color: '#fff',
          border: 'none', borderRadius: 6,
          fontSize: 14, fontWeight: 510,
          cursor: loading || !form.team ? 'not-allowed' : 'pointer',
          opacity: loading || !form.team ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'var(--font-inter)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!loading && form.team) e.currentTarget.style.background = '#34d399' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#22c55e' }}
      >
        {loading ? (
          <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        ) : (
          <>
            Crear compte — Gratis
            <ArrowRight size={15} />
          </>
        )}
      </button>

      <div style={{ paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#8a8f98' }}>
          Ja tens compte?{' '}
          <Link href="/login" style={{ color: '#22c55e', fontWeight: 510, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#34d399')}
            onMouseLeave={e => (e.currentTarget.style.color = '#22c55e')}
          >
            Inicia sessió
          </Link>
        </p>
      </div>
    </form>
  )
}

export default function RegistrePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#08090a', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-inter)' }}>
      <header style={{ padding: 16 }}>
        <Link href="/entrenador" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          color: '#8a8f98', textDecoration: 'none', fontSize: 14,
          transition: 'color 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = '#d0d6e0')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8a8f98')}
        >
          <ArrowLeft size={14} />
          Tornar
        </Link>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 448 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Image src="/logo_neoscout.png" alt="NeoScout" width={56} height={56} style={{ borderRadius: 8, margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: 24, fontWeight: 510, color: '#f7f8f8', marginBottom: 6, letterSpacing: '-0.02em' }}>
              Crea el teu compte
            </h1>
            <p style={{ fontSize: 14, color: '#8a8f98' }}>Gratuït. Accés immediat al teu panell d&apos;entrenador.</p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            padding: 32,
          }}>
            <Suspense fallback={<div style={{ fontSize: 13, color: '#8a8f98', textAlign: 'center', padding: '16px 0' }}>Carregant...</div>}>
              <RegistreForm />
            </Suspense>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#3a3d42', marginTop: 24 }}>
            Registrant-te acceptes els{' '}
            <Link href="/termes" style={{ color: '#62666d', textDecoration: 'none' }}>termes d&apos;ús</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
