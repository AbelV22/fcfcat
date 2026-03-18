'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trophy, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, User, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { Suspense } from 'react'

const COMPETITIONS = [
  'Primera Catalana', 'Segona Catalana', 'Tercera Catalana', 'Quarta Catalana',
  'Lliga Elit', 'Tercera Federació',
  'Divisió Honor Juvenil', 'Lliga Nacional Juvenil', 'Preferent Juvenil', 'Juvenil Primera Divisió',
  'Divisió Honor Cadet S16', 'Preferent Cadet S16', 'Divisió Honor Cadet S15', 'Preferent Cadet S15',
  'Divisió Honor Infantil S14', 'Preferent Infantil S14', 'Divisió Honor Infantil S13', 'Preferent Infantil S13',
]

function RegistreForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

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

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

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
          data: {
            name: form.name,
            club_name: form.team,
            competition: form.competition,
          },
        },
      })
      if (err) {
        setError(err.message)
        return
      }
      setStep('confirm')
    } catch {
      setError('Error inesperat. Torna-ho a intentar.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'confirm') {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto mb-5">
          <Mail size={28} className="text-green-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Comprova el teu correu</h2>
        <p className="text-slate-400 text-sm mb-6">
          T&apos;hem enviat un enllaç de confirmació a <span className="text-white font-medium">{form.email}</span>.
          Fes clic a l&apos;enllaç per activar el teu compte.
        </p>
        <p className="text-xs text-slate-600">
          Un cop confirmat, podràs{' '}
          <Link href="/login" className="text-green-400 hover:text-green-300">iniciar sessió</Link>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Nom complet</label>
        <div className="relative">
          <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            required
            value={form.name}
            onChange={set('name')}
            placeholder="Nom i cognoms"
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all text-sm"
          />
        </div>
      </div>

      {/* Team */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Equip</label>
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            required
            value={form.team}
            onChange={set('team')}
            placeholder="Ex: CE Mollet A"
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all text-sm"
          />
        </div>
      </div>

      {/* Competition */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Competició</label>
        <select
          required
          value={form.competition}
          onChange={set('competition')}
          className="w-full px-4 py-3 bg-[#1e293b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50 transition-all text-sm"
        >
          <option value="">Selecciona la competició...</option>
          {COMPETITIONS.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Correu electrònic</label>
        <div className="relative">
          <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="email"
            required
            value={form.email}
            onChange={set('email')}
            placeholder="tu@email.com"
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all text-sm"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Contrasenya</label>
        <div className="relative">
          <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type={showPass ? 'text' : 'password'}
            required
            value={form.password}
            onChange={set('password')}
            placeholder="Mínim 6 caràcters"
            minLength={6}
            className="w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500
                   disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl
                   transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/30 mt-2"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            Crear compte — Gratis
            <ArrowRight size={16} />
          </>
        )}
      </button>

      <div className="pt-4 border-t border-white/8 text-center">
        <p className="text-sm text-slate-400">
          Ja tens compte?{' '}
          <Link href="/login" className="text-green-400 hover:text-green-300 font-medium transition-colors">
            Inicia sessió
          </Link>
        </p>
      </div>
    </form>
  )
}

export default function RegistrePage() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <header className="p-4">
        <Link href="/entrenador" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={14} />
          Tornar
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
              <Trophy size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white mb-1">Crea el teu compte</h1>
            <p className="text-slate-400 text-sm">Gratuït. Accés immediat al teu panell d&apos;entrenador.</p>
          </div>

          <div className="glass-card rounded-2xl p-8">
            <Suspense fallback={<div className="text-slate-400 text-sm text-center py-4">Carregant...</div>}>
              <RegistreForm />
            </Suspense>
          </div>

          <p className="text-center text-xs text-slate-600 mt-6">
            Registrant-te acceptes els{' '}
            <Link href="/termes" className="text-slate-500 hover:text-slate-400">termes d&apos;ús</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
