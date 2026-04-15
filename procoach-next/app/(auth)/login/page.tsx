'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase-client'
import { SITE_URL } from '@/lib/supabase-config'

function ResendConfirmation() {
  const [resendEmail, setResendEmail] = useState('')
  const [resendSent, setResendSent] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendError, setResendError] = useState('')
  const supabase = createClient()

  const handleResend = async () => {
    if (!resendEmail) return
    setResendLoading(true)
    setResendError('')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: resendEmail,
      options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
    })
    setResendLoading(false)
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('rate limit') || msg.includes('too many')) {
        setResendError("Massa intents. Espera un minut i torna-ho a provar.")
      } else {
        setResendError("No s'ha pogut reenviar. Comprova el correu o torna a registrar-te.")
      }
    } else {
      setResendSent(true)
    }
  }

  if (resendSent) {
    return (
      <p style={{ fontSize: 12, color: '#22c55e', marginTop: 8 }}>
        Correu enviat! Comprova la bústia d&apos;entrada.
      </p>
    )
  }

  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 12, color: '#8a8f98' }}>Introdueix el teu correu per reenviar l&apos;enllaç:</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="email"
          value={resendEmail}
          onChange={e => setResendEmail(e.target.value)}
          placeholder="tu@email.com"
          style={{
            flex: 1, padding: '8px 12px',
            background: 'rgba(255,255,255,0.02)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
            border: 'none', borderRadius: 6,
            color: '#f7f8f8', fontSize: 12, outline: 'none',
            fontFamily: 'var(--font-inter)',
          }}
          onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(34,197,94,0.3)')}
          onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)')}
        />
        <button
          onClick={handleResend}
          disabled={resendLoading || !resendEmail}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.04)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
            border: 'none', borderRadius: 6,
            color: '#d0d6e0', fontSize: 12, cursor: 'pointer',
            opacity: resendLoading || !resendEmail ? 0.4 : 1,
            fontFamily: 'var(--font-inter)',
          }}
        >
          {resendLoading ? (
            <div style={{ width: 12, height: 12, border: '1.5px solid rgba(255,255,255,0.2)', borderTopColor: '#f7f8f8', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          ) : (
            <RefreshCw size={12} />
          )}
          Reenviar
        </button>
      </div>
      {resendError && <p style={{ fontSize: 12, color: '#f87171' }}>{resendError}</p>}
    </div>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const confirmed = searchParams.get('confirmed') === '1'
  const passwordUpdated = searchParams.get('password_updated') === '1'
  const callbackError = searchParams.get('error')
  const cloneId = searchParams.get('clone')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); return }
      await fetch('/api/sync-team', { method: 'POST' }).catch(() => {})
      // If arriving from a shared exercise, clone it automatically after login
      if (cloneId) {
        try {
          const { clonePublicExercise } = await import('@/lib/training-data')
          await clonePublicExercise(cloneId)
        } catch { /* non-critical */ }
        router.push('/dashboard/entrenaments?tab=biblioteca')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
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

  return (
    <div style={{ minHeight: '100vh', background: '#08090a', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-inter)' }}>
      {/* Header */}
      <header style={{ padding: 16 }}>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          color: '#8a8f98', textDecoration: 'none', fontSize: 14,
          transition: 'color 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = '#d0d6e0')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8a8f98')}
        >
          <ArrowLeft size={14} />
          Tornar a l&apos;inici
        </Link>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 448 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Image src="/logo_neoscout.png" alt="NeoScout" width={56} height={56} style={{ borderRadius: 8, margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: 24, fontWeight: 510, color: '#f7f8f8', marginBottom: 6, letterSpacing: '-0.02em' }}>
              Benvingut de nou
            </h1>
            <p style={{ fontSize: 14, color: '#8a8f98' }}>Inicia sessió com a entrenador o ojeador</p>
          </div>

          {/* Confirmation banner */}
          {confirmed && (
            <div style={{
              marginBottom: 16, padding: '12px 16px',
              background: 'rgba(34,197,94,0.06)', boxShadow: '0 0 0 1px rgba(34,197,94,0.15)',
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, color: '#22c55e',
            }}>
              <CheckCircle size={15} style={{ flexShrink: 0 }} />
              Compte confirmat! Ja pots iniciar sessió.
            </div>
          )}

          {/* Password updated banner */}
          {passwordUpdated && (
            <div style={{
              marginBottom: 16, padding: '12px 16px',
              background: 'rgba(34,197,94,0.06)', boxShadow: '0 0 0 1px rgba(34,197,94,0.15)',
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, color: '#22c55e',
            }}>
              <CheckCircle size={15} style={{ flexShrink: 0 }} />
              Contrasenya actualitzada! Inicia sessió amb la nova contrasenya.
            </div>
          )}

          {/* Callback error banner */}
          {callbackError && !confirmed && (
            <div style={{
              marginBottom: 16, padding: '12px 16px',
              background: 'rgba(248,113,113,0.06)', boxShadow: '0 0 0 1px rgba(248,113,113,0.15)',
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#f87171' }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                {callbackError === 'link_expired'
                  ? "L'enllaç de confirmació ha caducat."
                  : callbackError === 'pkce_failed'
                    ? "L'enllaç s'ha obert en un navegador diferent al del registre."
                    : callbackError === 'invalid_link'
                      ? "L'enllaç de confirmació no és vàlid."
                      : callbackError === 'missing_code'
                        ? "Enllaç de confirmació invàlid. Comprova el teu correu."
                        : "No s'ha pogut confirmar el compte."}
              </div>
              {['link_expired', 'pkce_failed', 'confirmation_failed'].includes(callbackError) && (
                <ResendConfirmation />
              )}
            </div>
          )}

          {/* Form card */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            padding: 32,
          }}>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 510, color: '#d0d6e0', marginBottom: 6 }}>
                  Correu electrònic
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#62666d', pointerEvents: 'none' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(34,197,94,0.3)')}
                    onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)')}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 510, color: '#d0d6e0' }}>Contrasenya</label>
                  <Link href="/forgot-password" style={{ fontSize: 12, color: '#22c55e', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#34d399')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#22c55e')}
                  >
                    Has oblidat la contrasenya?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#62666d', pointerEvents: 'none' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
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
                disabled={loading}
                style={{
                  width: '100%', padding: '13px 0',
                  background: '#22c55e', color: '#fff',
                  border: 'none', borderRadius: 6,
                  fontSize: 14, fontWeight: 510,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'var(--font-inter)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#34d399' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#22c55e' }}
              >
                {loading ? (
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                ) : (
                  <>
                    Inicia sessió
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#8a8f98' }}>
                No tens compte?{' '}
                <Link href="/registre" style={{ color: '#22c55e', fontWeight: 510, textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#34d399')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#22c55e')}
                >
                  Crea&apos;l gratuïtament
                </Link>
              </p>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#3a3d42', marginTop: 24 }}>
            Accedint acceptes els{' '}
            <Link href="/termes" style={{ color: '#62666d', textDecoration: 'none' }}>termes d&apos;ús</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
