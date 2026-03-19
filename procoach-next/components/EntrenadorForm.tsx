'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, ChevronRight, Zap } from 'lucide-react'

interface Team {
  slug: string
  name: string
  competition: string
  competitionName: string
}

interface Props {
  teams: Team[]
}

const COMPETITION_DISPLAY: Record<string, string> = {
  'tercera-federacio': 'Tercera Federació',
  'lliga-elit': 'Lliga Elit',
  'primera-catalana': 'Primera Catalana',
  'segona-catalana': 'Segona Catalana',
  'tercera-catalana': 'Tercera Catalana',
  'quarta-catalana': 'Quarta Catalana',
  'divisio-honor-juvenil': "Divisió Honor Juvenil",
  'lliga-nacional-juvenil': 'Lliga Nacional Juvenil',
  'preferent-juvenils': 'Preferent Juvenil',
  'juvenil-primera-divisio': 'Juvenil Primera Divisió',
  'divisio-honor-cadet-s16': "Divisió Honor Cadet S16",
  'preferent-cadet-s16': 'Preferent Cadet S16',
  'divisio-honor-cadet-s15': "Divisió Honor Cadet S15",
  'preferent-cadet-s15': 'Preferent Cadet S15',
  'divisio-honor-infantil-s14': "Divisió Honor Infantil S14",
  'preferent-infantil-s14': 'Preferent Infantil S14',
  'divisio-honor-infantil-s13': "Divisió Honor Infantil S13",
  'preferent-infantil-s13': 'Preferent Infantil S13',
}

// All selectable competitions (includes some not yet in DB)
const ALL_COMPETITIONS = [
  'Primera Catalana', 'Segona Catalana', 'Tercera Catalana', 'Quarta Catalana',
  'Lliga Elit', 'Tercera Federació',
  'Divisió Honor Juvenil', 'Lliga Nacional Juvenil', 'Preferent Juvenil', 'Juvenil Primera Divisió',
  'Divisió Honor Cadet S16', 'Preferent Cadet S16', 'Divisió Honor Cadet S15', 'Preferent Cadet S15',
  'Divisió Honor Infantil S14', 'Preferent Infantil S14', 'Divisió Honor Infantil S13', 'Preferent Infantil S13',
]

function norm(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export default function EntrenadorForm({ teams }: Props) {
  const [form, setForm] = useState({ team: '', competition: '', email: '', name: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    const q = norm(form.team.trim())
    if (q.length < 2) return []
    return teams.filter(t => norm(t.name).includes(q)).slice(0, 8)
  }, [form.team, teams])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectTeam(team: Team) {
    const compDisplay = team.competitionName || COMPETITION_DISPLAY[team.competition] || ''
    const matchedComp = ALL_COMPETITIONS.find(c => norm(c) === norm(compDisplay))
    setForm(f => ({
      ...f,
      team: team.name,
      competition: matchedComp || f.competition,
    }))
    setShowSuggestions(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.team || !form.competition || !form.email) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center py-8">
        <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
        <h3 className="text-2xl font-bold mb-2">Rebut!</h3>
        <p className="text-slate-400">
          T&apos;avisarem en 24h quan el teu equip estigui activat.<br />
          Mentrestant, explora la plataforma.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 mt-6 text-green-400 hover:text-green-300 transition-colors">
          Explorar NeoScout <ChevronRight size={16} />
        </Link>
      </div>
    )
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-2 text-center">Registra el teu equip</h2>
      <p className="text-slate-400 text-center text-sm mb-8">Gratuït. Sense compromisos. L&apos;equip s&apos;activa en menys de 24h.</p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">

        {/* Team name with autocomplete */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Nom de l&apos;equip *</label>
          <div ref={wrapperRef} className="relative">
            <input
              type="text"
              value={form.team}
              onChange={e => {
                setForm(f => ({ ...f, team: e.target.value }))
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Ex: CE Mollet A"
              required
              autoComplete="off"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
            />

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a2744] border border-white/12 rounded-xl shadow-2xl overflow-hidden">
                {suggestions.map(team => (
                  <button
                    key={team.slug}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); selectTeam(team) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/8 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-green-600/20 flex items-center justify-center text-green-400 font-bold text-xs shrink-0">
                      {team.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{team.name}</div>
                      <div className="text-xs text-slate-500 truncate">{team.competitionName || team.competition}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">Escriu almenys 2 caràcters per veure suggeriments</p>
        </div>

        {/* Competition */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Competició *</label>
          <select
            value={form.competition}
            onChange={e => setForm(f => ({ ...f, competition: e.target.value }))}
            required
            className="w-full px-4 py-3 bg-[#1e293b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50 transition-all"
          >
            <option value="">Selecciona la competició...</option>
            {ALL_COMPETITIONS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {form.competition && (
            <p className="text-xs text-green-500/70 mt-1 flex items-center gap-1">
              <Zap size={10} /> Competició seleccionada
            </p>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">El teu nom *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nom i cognoms"
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="entrenador@exemple.com"
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/30 text-lg mt-2"
        >
          {loading ? 'Enviant...' : 'Afegeix el teu equip — Gratis'}
        </button>
        <p className="text-xs text-slate-600 text-center">
          Sense spam. Les teves dades no es compartiran amb tercers.
        </p>
      </form>
    </>
  )
}
