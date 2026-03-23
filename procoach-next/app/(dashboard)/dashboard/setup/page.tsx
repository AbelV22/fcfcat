'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, ChevronDown, X, CheckCircle, Trophy } from 'lucide-react'
import { saveTeamSelection } from './actions'

const COMPETITIONS: { label: string; slug: string }[] = [
  { label: 'Primera Catalana',          slug: 'primera-catalana' },
  { label: 'Segona Catalana',           slug: 'segona-catalana' },
  { label: 'Tercera Catalana',          slug: 'tercera-catalana' },
  { label: 'Quarta Catalana',           slug: 'quarta-catalana' },
  { label: 'Lliga Elit',                slug: 'lliga-elit' },
  { label: 'Tercera Federació',         slug: 'tercera-federacio' },
  { label: "Divisió d'Honor Juvenil",   slug: 'divisio-honor-juvenil' },
  { label: 'Lliga Nacional Juvenil',    slug: 'lliga-nacional-juvenil' },
  { label: 'Preferent Juvenil',         slug: 'preferent-juvenils' },
  { label: 'Juvenil Primera Divisió',   slug: 'juvenil-primera-divisio' },
  { label: "Divisió d'Honor Cadet S16", slug: 'divisio-honor-cadet-s16' },
  { label: 'Preferent Cadet S16',       slug: 'preferent-cadet-s16' },
  { label: "Divisió d'Honor Cadet S15", slug: 'divisio-honor-cadet-s15' },
  { label: 'Preferent Cadet S15',       slug: 'preferent-cadet-s15' },
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

export default function SetupPage() {
  const router = useRouter()
  const [competition, setCompetition] = useState('')
  const [team, setTeam] = useState('')
  const [teams, setTeams] = useState<{ name: string; group: string }[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [teamSearch, setTeamSearch] = useState('')
  const [teamOpen, setTeamOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const teamRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!competition) { setTeams([]); setTeam(''); setTeamSearch(''); return }
    let cancelled = false
    setTeamsLoading(true)
    setTeam('')
    setTeamSearch('')
    fetch(`/api/teams?competition=${encodeURIComponent(competition)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setTeams(d.teams || []) })
      .catch(() => { if (!cancelled) setTeams([]) })
      .finally(() => { if (!cancelled) setTeamsLoading(false) })
    return () => { cancelled = true }
  }, [competition])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (teamRef.current && !teamRef.current.contains(e.target as Node)) setTeamOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredTeams = teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()))

  const handleSave = async () => {
    if (!team || !competition) return
    setSaving(true)
    setError('')
    const fd = new FormData()
    fd.set('team', team)
    fd.set('competition', competition)
    const result = await saveTeamSelection(fd)
    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <header className="border-b border-white/8 bg-[#0a1628]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} />
            Tornar al Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
            <Trophy size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Configura el teu equip</h1>
          <p className="text-slate-400 text-sm">Selecciona competicio i equip per activar totes les funcionalitats del dashboard.</p>
        </div>

        <div className="glass-card rounded-2xl p-8 space-y-5">
          {/* Competition */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Competicio</label>
            <select
              value={competition}
              onChange={e => setCompetition(e.target.value)}
              className="w-full px-4 py-3 bg-[#1e293b] border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50 transition-all text-sm"
            >
              <option value="">Selecciona la competicio...</option>
              {CATEGORY_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {COMPETITIONS.filter(c => group.slugs.includes(c.slug)).map(c => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Team selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Equip</label>
            <div className="relative" ref={teamRef}>
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
              <input
                type="text"
                disabled={!competition}
                value={team || teamSearch}
                onChange={e => { setTeamSearch(e.target.value); setTeam(''); setTeamOpen(true) }}
                onFocus={() => competition && setTeamOpen(true)}
                placeholder={!competition ? 'Selecciona primer la competicio' : teamsLoading ? 'Carregant equips...' : `Cerca entre ${teams.length} equips...`}
                className="w-full pl-11 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              />
              {team ? (
                <button type="button" onClick={() => { setTeam(''); setTeamSearch('') }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  <X size={16} />
                </button>
              ) : (
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              )}
              {teamOpen && competition && !teamsLoading && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-[#1e293b] border border-white/10 rounded-xl shadow-xl">
                  {filteredTeams.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">{teamSearch ? 'Cap equip trobat' : 'No hi ha equips'}</div>
                  ) : filteredTeams.map(t => (
                    <button key={t.name} type="button"
                      onClick={() => { setTeam(t.name); setTeamSearch(t.name); setTeamOpen(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between">
                      <span>{t.name}</span>
                      {t.group && <span className="text-xs text-slate-500 ml-2">{t.group}</span>}
                    </button>
                  ))}
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

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">{error}</div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !team}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500
                       disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl
                       transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/30"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle size={16} />
                Desar configuracio
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}
