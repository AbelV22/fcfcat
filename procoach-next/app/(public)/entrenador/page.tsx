'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Shield, TrendingUp, Users, ListOrdered, Bell, BarChart2 } from 'lucide-react'

const COMPETITIONS = [
  'Primera Catalana', 'Segona Catalana', 'Tercera Catalana', 'Quarta Catalana',
  'Lliga Elit', 'Tercera Federació',
  'Divisió Honor Juvenil', 'Lliga Nacional Juvenil', 'Preferent Juvenil', 'Juvenil Primera Divisió',
  'Divisió Honor Cadet S16', 'Preferent Cadet S16', 'Divisió Honor Cadet S15', 'Preferent Cadet S15',
  'Divisió Honor Infantil S14', 'Preferent Infantil S14', 'Divisió Honor Infantil S13', 'Preferent Infantil S13',
]

const FEATURES = [
  { icon: Shield, text: 'Informe de l\'àrbitre que us arbitrarà — historial i tendències' },
  { icon: TrendingUp, text: 'Anàlisi tàctica del rival: formació, gols i targetes' },
  { icon: Users, text: 'Plantilla i estadístiques individuals dels teus jugadors' },
  { icon: ListOrdered, text: 'Classificació i resultats en temps real' },
  { icon: Bell, text: 'Avís automàtic quan es confirmi l\'àrbitre del proper partit' },
  { icon: BarChart2, text: 'Comparativa del rendiment per jornada' },
]

const STATS = [
  { value: '15.000+', label: 'Partits analitzats' },
  { value: '200+', label: 'Àrbitres al sistema' },
  { value: '14', label: 'Categories FCF' },
  { value: '100%', label: 'Gratis per entrenadors' },
]

export default function EntrenadorPage() {
  const [form, setForm] = useState({ team: '', competition: '', email: '', name: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.team || !form.competition || !form.email) return
    const params = new URLSearchParams({
      team: form.team,
      competition: form.competition,
      email: form.email,
      ...(form.name ? { name: form.name } : {}),
    })
    window.location.href = `/registre?${params.toString()}`
  }

  return (
    <div style={{ fontFamily: 'var(--font-inter)', color: '#f7f8f8' }}>

      {/* Hero */}
      <div style={{ background: '#0f1011', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6" style={{ paddingTop: 56, paddingBottom: 56 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)',
            borderRadius: 9999, padding: '4px 12px', marginBottom: 24,
            fontSize: 11, fontWeight: 510, color: '#22c55e', letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            <Shield size={11} />
            Informe arbitral · Gratis
          </div>
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 510,
            letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 20, color: '#f7f8f8',
          }}>
            El partit es guanya{' '}
            <span style={{ color: '#22c55e' }}>entre setmana</span>
          </h1>
          <p style={{ fontSize: 16, color: '#8a8f98', lineHeight: 1.6, marginBottom: 8, maxWidth: 520 }}>
            Accedeix a l&apos;informe de l&apos;àrbitre que us arbitrarà, analitza el proper rival i prepara cada partit amb dades reals de la FCF.
          </p>
          <p style={{ fontSize: 14, color: '#62666d', marginBottom: 36 }}>
            14 categories · Dades oficials FCF · Totalment gratuït per a entrenadors
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href="#registre"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 6,
                background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 510,
                textDecoration: 'none', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#34d399')}
              onMouseLeave={e => (e.currentTarget.style.background = '#22c55e')}
            >
              Descobreix el teu àrbitre — Gratis
            </a>
            <Link
              href="/cerca"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 6,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#d0d6e0', fontSize: 14, fontWeight: 510, textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
            >
              Explorar la plataforma
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6" style={{ paddingTop: 56, paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 56 }}>

        {/* Features */}
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 510, letterSpacing: '-0.02em', color: '#f7f8f8', marginBottom: 8 }}>
            Tot el que obtens gratis
          </h2>
          <p style={{ fontSize: 14, color: '#8a8f98', marginBottom: 28 }}>
            Registra el teu equip i accedeix immediatament, sense targeta de crèdit.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '16px 18px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                }}
              >
                <f.icon size={15} style={{ color: '#8a8f98', marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#d0d6e0', lineHeight: 1.5, margin: 0 }}>{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden',
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ background: '#08090a', padding: '20px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 510, color: '#22c55e', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: '#62666d', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Registration form */}
        <div id="registre" style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: '32px 28px',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 510, letterSpacing: '-0.02em', color: '#f7f8f8', marginBottom: 6, textAlign: 'center' }}>
            Descobreix el teu àrbitre
          </h2>
          <p style={{ fontSize: 13, color: '#8a8f98', marginBottom: 28, textAlign: 'center' }}>
            Registra&apos;t gratis i accedeix a informes arbitrals, anàlisi de rivals i molt més.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 440, margin: '0 auto' }}>
            {/* Team name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 510, color: '#8a8f98', marginBottom: 6 }}>
                Nom de l&apos;equip *
              </label>
              <input
                type="text"
                value={form.team}
                onChange={e => setForm(f => ({ ...f, team: e.target.value }))}
                placeholder="Ex: CE Mollet A"
                required
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 6, border: 'none',
                  background: 'rgba(255,255,255,0.03)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
                  color: '#f7f8f8', fontSize: 14, outline: 'none',
                  fontFamily: 'var(--font-inter)', boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(34,197,94,0.3)')}
                onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)')}
              />
            </div>
            {/* Competition */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 510, color: '#8a8f98', marginBottom: 6 }}>
                Competició *
              </label>
              <select
                value={form.competition}
                onChange={e => setForm(f => ({ ...f, competition: e.target.value }))}
                required
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 6, border: 'none',
                  background: '#191a1b', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
                  color: form.competition ? '#f7f8f8' : '#62666d',
                  fontSize: 14, outline: 'none', fontFamily: 'var(--font-inter)',
                  boxSizing: 'border-box', cursor: 'pointer',
                }}
                onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(34,197,94,0.3)')}
                onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)')}
              >
                <option value="">Selecciona la competició...</option>
                {COMPETITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 510, color: '#8a8f98', marginBottom: 6 }}>
                El teu nom *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nom i cognoms"
                required
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 6, border: 'none',
                  background: 'rgba(255,255,255,0.03)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
                  color: '#f7f8f8', fontSize: 14, outline: 'none',
                  fontFamily: 'var(--font-inter)', boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(34,197,94,0.3)')}
                onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)')}
              />
            </div>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 510, color: '#8a8f98', marginBottom: 6 }}>
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="entrenador@exemple.com"
                required
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 6, border: 'none',
                  background: 'rgba(255,255,255,0.03)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
                  color: '#f7f8f8', fontSize: 14, outline: 'none',
                  fontFamily: 'var(--font-inter)', boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(34,197,94,0.3)')}
                onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06)')}
              />
            </div>
            <button
              type="submit"
              style={{
                width: '100%', padding: '11px 20px', marginTop: 4,
                borderRadius: 6, border: 'none', cursor: 'pointer',
                background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 510,
                fontFamily: 'var(--font-inter)', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#34d399')}
              onMouseLeave={e => (e.currentTarget.style.background = '#22c55e')}
            >
              Continuar i crear compte →
            </button>
            <p style={{ fontSize: 11, color: '#62666d', textAlign: 'center', margin: 0 }}>
              Sense spam. Les teves dades no es compartiran amb tercers.
            </p>
          </form>
        </div>

      </div>
    </div>
  )
}
