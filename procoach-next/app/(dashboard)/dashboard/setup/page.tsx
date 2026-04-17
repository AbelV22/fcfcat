'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, X, CheckCircle } from 'lucide-react'
import Image from 'next/image'

type TeamOption = { name: string; group: string; slug: string }

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
  const [teamSlug, setTeamSlug] = useState('')
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [teamSearch, setTeamSearch] = useState('')
  const [teamOpen, setTeamOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const teamRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!competition) { setTeams([]); setTeam(''); setTeamSlug(''); setTeamSearch(''); return }
    let cancelled = false
    setTeamsLoading(true)
    setTeam('')
    setTeamSlug('')
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

  const handleSave = () => {
    if (!team || !competition || !teamSlug) return
    setSaving(true)
    setError('')

    const maxAge = 60 * 60 * 24 * 365
    document.cookie = `ns_team_slug=${encodeURIComponent(teamSlug)}; path=/; max-age=${maxAge}`
    document.cookie = `ns_team_name=${encodeURIComponent(team)}; path=/; max-age=${maxAge}`
    document.cookie = `ns_competition=${encodeURIComponent(competition)}; path=/; max-age=${maxAge}`

    window.location.href = '/dashboard'
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 lg:py-8">
        <div className="text-center mb-10">
          <Image src="/logo_neoscout.png" alt="NeoScout" width={64} height={64} className="mx-auto mb-4 rounded-lg" />
          <h1 className="text-2xl font-medium text-white mb-2">Configura el teu equip</h1>
          <p className="text-[#8a8f98] text-sm">Selecciona competicio i equip per activar totes les funcionalitats del dashboard.</p>
        </div>

        <div className="v2-card p-8 space-y-5">
          {/* Competition */}
          <div>
            <label className="block text-sm font-medium text-[#d0d6e0] mb-1.5">Competicio</label>
            <select
              value={competition}
              onChange={e => setCompetition(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-green-500/50 transition-all text-sm"
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
            <label className="block text-sm font-medium text-[#d0d6e0] mb-1.5">Equip</label>
            <div className="relative" ref={teamRef}>
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#62666d] z-10" />
              <input
                type="text"
                disabled={!competition}
                value={team || teamSearch}
                onChange={e => { setTeamSearch(e.target.value); setTeam(''); setTeamSlug(''); setTeamOpen(true) }}
                onFocus={() => competition && setTeamOpen(true)}
                placeholder={!competition ? 'Selecciona primer la competicio' : teamsLoading ? 'Carregant equips...' : `Cerca entre ${teams.length} equips...`}
                className="w-full pl-11 pr-10 py-3 bg-white/5 border border-white/[0.06] rounded-lg text-white placeholder-[#62666d] focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              />
              {team ? (
                <button type="button" onClick={() => { setTeam(''); setTeamSlug(''); setTeamSearch('') }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#62666d] hover:text-[#d0d6e0]">
                  <X size={16} />
                </button>
              ) : (
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#62666d] pointer-events-none" />
              )}
              {teamOpen && competition && !teamsLoading && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white/[0.04] border border-white/[0.06] rounded-lg shadow-xl">
                  {filteredTeams.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-[#62666d]">{teamSearch ? 'Cap equip trobat' : 'No hi ha equips'}</div>
                  ) : filteredTeams.map(t => (
                    <button key={t.slug || `${t.name}-${t.group}`} type="button"
                      onClick={() => { setTeam(t.name); setTeamSlug(t.slug); setTeamSearch(t.name); setTeamOpen(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between">
                      <span>{t.name}</span>
                      {t.group && <span className="text-xs text-[#62666d] ml-2">{t.group}</span>}
                    </button>
                  ))}
                </div>
              )}
              {teamOpen && teamsLoading && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white/[0.04] border border-white/[0.06] rounded-lg shadow-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-[#8a8f98]">
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-green-400 rounded-full animate-spin" />
                    Carregant equips...
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !team || !teamSlug}
            className="w-full py-3 bg-[#22c55e] hover:bg-[#34d399]
                       disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg
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
    </div>
  )
}
