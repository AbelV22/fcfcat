'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trophy, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, User, Search, ChevronDown, X } from 'lucide-react'
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

  const competitionLabel = COMPETITIONS.find(c => c.slug === form.competition)?.label || ''

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
            competition: form.competition, // slug, not label
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
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nom i cognoms"
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all text-sm"
          />
        </div>
      </div>

      {/* Competition — select FIRST so teams can filter */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Competició</label>
        <select
          required
          value={form.competition}
          onChange={e => setForm(f => ({ ...f, competition: e.target.value }))}
          className="w-full px-4 py-3 bg-[#1e293b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50 transition-all text-sm"
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

      {/* Team — searchable combobox, enabled after competition is selected */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Equip</label>
        <div className="relative" ref={teamRef}>
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
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
            className="w-full pl-11 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          />
          {form.team ? (
            <button
              type="button"
              onClick={clearTeam}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={16} />
            </button>
          ) : (
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          )}

          {/* Dropdown */}
          {teamOpen && form.competition && !teamsLoading && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-[#1e293b] border border-white/10 rounded-xl shadow-xl">
              {filteredTeams.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500">
                  {teamSearch ? 'Cap equip trobat' : 'No hi ha equips'}
                </div>
              ) : (
                filteredTeams.map(t => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => selectTeam(t.name)}
                    className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between"
                  >
                    <span>{t.name}</span>
                    {t.group && <span className="text-xs text-slate-500 ml-2">{t.group}</span>}
                  </button>
                ))
              )}
            </div>
          )}
          {teamOpen && teamsLoading && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1e293b] border border-white/10 rounded-xl shadow-xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-green-400 rounded-full animate-spin" />
                Carregant equips...
              </div>
            </div>
          )}
        </div>
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
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
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
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
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
        disabled={loading || !form.team}
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
