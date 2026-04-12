'use client'
import { useActionState, useState, useEffect } from 'react'
import { saveField } from './actions'

interface FieldEntry {
  name: string
  fcf_venue: string | null
  team: string | null
  city: string
  address: string | null
  length_m: number
  width_m: number
  confirmed: boolean
  notes: string
}

interface TeamOption {
  name: string
  slug: string
  competition: string
  competitionName: string
}

interface Props {
  teams: TeamOption[]
  fields: FieldEntry[]
  teamVenueMap: Record<string, string>
}

const EMPTY = { name: '', fcf_venue: '', team: '', city: '', length_m: '', width_m: '', confirmed: true as boolean, notes: '' }

// Extract city from FCF venue string: "CAMP DE FUTBOL  c/ Carrer, 1, Mataró" → "Mataró"
function extractCity(venue: string): string {
  const parts = venue.split(',')
  if (parts.length >= 2) return parts[parts.length - 1].trim()
  return ''
}

// Generate a friendly field name from FCF venue string
function venueToName(venue: string): string {
  // "CAMP DE FUTBOL MPAL. DEL CAMI DEL MIG  c/ Marathon, 91, Matar" → "Camp de Futbol Mpal. del Cami del Mig"
  const namePart = venue.split('  ')[0].trim()
  return namePart.split(' ').map((w, i) => {
    const lower = ['de', 'del', 'dels', 'de', 'la', 'les', 'el', 'els', 'i', 'a', 'en']
    return i === 0 || !lower.includes(w.toLowerCase())
      ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      : w.toLowerCase()
  }).join(' ')
}

export default function CampsForm({ teams, fields, teamVenueMap }: Props) {
  const [state, formAction, isPending] = useActionState(saveField, {} as { error?: string; success?: string })
  const [form, setForm] = useState<typeof EMPTY>(EMPTY)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [teamQuery, setTeamQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    if (state?.success) {
      setForm(EMPTY)
      setEditingName(null)
      setTeamQuery('')
    }
  }, [state])

  const filteredTeams = teamQuery.length >= 2
    ? teams.filter(t => t.name.toLowerCase().includes(teamQuery.toLowerCase())).slice(0, 12)
    : []

  // Allow manual entry: user typed a name but no exact match exists in the list
  const canUseManualName = teamQuery.trim().length >= 3 && !form.team
  const exactMatchExists = teams.some(t => t.name.toLowerCase() === teamQuery.trim().toLowerCase())

  // Find all teams that share the same FCF venue (same club, same field)
  function getClubMates(venue: string | null): string[] {
    if (!venue) return []
    const venueNorm = venue.split('  ')[0].trim().toLowerCase()
    return Object.entries(teamVenueMap)
      .filter(([, v]) => v.split('  ')[0].trim().toLowerCase() === venueNorm)
      .map(([name]) => name)
  }

  function useManualName() {
    const name = teamQuery.trim()
    if (!name) return
    // Try to detect venue from the map (case-insensitive partial match)
    const venueKey = Object.keys(teamVenueMap).find(k => k.toLowerCase() === name.toLowerCase())
    const detectedVenue = venueKey ? teamVenueMap[venueKey] : ''

    // Check if another team from the same club already has a field saved
    const clubMates = getClubMates(detectedVenue || null)
    const sharedField = clubMates.length > 0
      ? fields.find(f => clubMates.some(mate => f.team?.toLowerCase() === mate.toLowerCase()))
      : null

    // Also try name-based club detection (e.g. "CLUB X A" → "CLUB X B")
    const namePrefix = name.replace(/\s+[A-Z]$/, '') // strip trailing letter suffix
    const nameBasedField = !sharedField && namePrefix !== name
      ? fields.find(f => f.team && f.team.replace(/\s+[A-Z]$/, '') === namePrefix)
      : null

    const reuseField = sharedField || nameBasedField

    if (reuseField) {
      setForm({
        name: reuseField.name,
        fcf_venue: reuseField.fcf_venue ?? detectedVenue,
        team: name,
        city: reuseField.city ?? '',
        length_m: String(reuseField.length_m),
        width_m: String(reuseField.width_m),
        confirmed: reuseField.confirmed,
        notes: reuseField.notes ?? '',
      })
      setEditingName(reuseField.name)
    } else {
      const city = detectedVenue ? extractCity(detectedVenue) : ''
      const suggestedName = detectedVenue ? venueToName(detectedVenue) : ''
      setForm({
        ...EMPTY,
        team: name,
        fcf_venue: detectedVenue,
        city,
        name: suggestedName,
      })
      setEditingName(null)
    }
    setTeamQuery(name)
    setShowSuggestions(false)
    setTimeout(() => document.getElementById('camps-form-section')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function selectTeam(t: TeamOption) {
    // Check if this team already has a field saved
    const existingField = fields.find(f => f.team?.toLowerCase() === t.name.toLowerCase())
    if (existingField) {
      setForm({
        name: existingField.name,
        fcf_venue: existingField.fcf_venue ?? '',
        team: t.name,
        city: existingField.city ?? '',
        length_m: String(existingField.length_m),
        width_m: String(existingField.width_m),
        confirmed: existingField.confirmed,
        notes: existingField.notes ?? '',
      })
      setEditingName(existingField.name)
    } else {
      // Auto-fill from FCF venue map
      const detectedVenue = teamVenueMap[t.name] ?? ''

      // Check if another team from the same club already has a field saved (same venue)
      const clubMates = getClubMates(detectedVenue)
      let sharedField = clubMates.length > 0
        ? fields.find(f => clubMates.some(mate => f.team?.toLowerCase() === mate.toLowerCase()))
        : null

      // Fallback: name-based club detection (e.g. "CLUB X A" → "CLUB X B")
      if (!sharedField) {
        const namePrefix = t.name.replace(/\s+[A-Z]$/, '')
        if (namePrefix !== t.name) {
          sharedField = fields.find(f => f.team && f.team.replace(/\s+[A-Z]$/, '') === namePrefix) ?? null
        }
      }

      if (sharedField) {
        // Same club — reuse the existing field data
        setForm({
          name: sharedField.name,
          fcf_venue: sharedField.fcf_venue ?? detectedVenue,
          team: t.name,
          city: sharedField.city ?? '',
          length_m: String(sharedField.length_m),
          width_m: String(sharedField.width_m),
          confirmed: sharedField.confirmed,
          notes: sharedField.notes ?? '',
        })
        setEditingName(sharedField.name)
      } else {
        const city = detectedVenue ? extractCity(detectedVenue) : ''
        const suggestedName = detectedVenue ? venueToName(detectedVenue) : ''
        setForm({
          ...EMPTY,
          team: t.name,
          fcf_venue: detectedVenue,
          city,
          name: suggestedName,
        })
        setEditingName(null)
      }
    }
    setTeamQuery(t.name)
    setShowSuggestions(false)
    setTimeout(() => document.getElementById('camps-form-section')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function startEdit(f: FieldEntry) {
    setEditingName(f.name)
    setTeamQuery(f.team ?? '')
    setForm({
      name: f.name,
      fcf_venue: f.fcf_venue ?? '',
      team: f.team ?? '',
      city: f.city ?? '',
      length_m: String(f.length_m),
      width_m: String(f.width_m),
      confirmed: f.confirmed,
      notes: f.notes ?? '',
    })
    setTimeout(() => document.getElementById('camps-form-section')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function resetForm() {
    setForm(EMPTY)
    setEditingName(null)
    setTeamQuery('')
  }

  function set(key: keyof typeof EMPTY, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const area = form.length_m && form.width_m
    ? parseFloat(form.length_m) * parseFloat(form.width_m)
    : null

  const hasTeamSelected = !!form.team
  const hasDetectedVenue = hasTeamSelected && !!form.fcf_venue
  const hasNoVenueData = hasTeamSelected && !teamVenueMap[form.team]

  // Club mates: other teams sharing the same venue OR same name prefix
  const venueClubMates = hasDetectedVenue ? getClubMates(form.fcf_venue).filter(n => n !== form.team) : []
  // Name-based mates: "CLUB X B" when current is "CLUB X A"
  const namePrefix = form.team ? form.team.replace(/\s+[A-Z]$/, '') : ''
  const nameClubMates = namePrefix && namePrefix !== form.team
    ? [...teams.map(t => t.name), ...fields.filter(f => f.team).map(f => f.team!)]
        .filter(n => n !== form.team && n.replace(/\s+[A-Z]$/, '') === namePrefix)
    : []
  const clubMates = [...new Set([...venueClubMates, ...nameClubMates])]
  const sharedFieldFrom = clubMates.find(mate => fields.some(f => f.team?.toLowerCase() === mate.toLowerCase()))

  return (
    <div className="space-y-6">

      {/* ── Table ── */}
      <div className="bg-white/4 border border-white/8 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <h2 className="font-bold text-white text-sm">Camps registrats ({fields.length})</h2>
          <button
            onClick={resetForm}
            className="text-xs px-3 py-1.5 bg-green-600/20 text-green-400 border border-green-500/25 rounded-lg font-semibold hover:bg-green-600/30 transition-colors"
          >
            + Nou camp
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 text-[#8a8f98] text-[11px] uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Camp</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Equip</th>
                <th className="text-center px-3 py-3 font-medium">Long.</th>
                <th className="text-center px-3 py-3 font-medium">Amp.</th>
                <th className="text-center px-3 py-3 font-medium">m²</th>
                <th className="text-center px-3 py-3 font-medium hidden sm:table-cell">✓</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {fields.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#62666d]">Cap camp registrat encara.</td>
                </tr>
              )}
              {fields.map((f, i) => {
                const a = f.length_m * f.width_m
                const aColor = a < 5500 ? 'text-red-400' : a < 6300 ? 'text-amber-400' : 'text-green-400'
                const isEditing = editingName === f.name
                return (
                  <tr key={i} className={`transition-colors ${isEditing ? 'bg-green-500/8 border-l-2 border-green-500/50' : 'hover:bg-white/3'}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#d0d6e0]">{f.name}</div>
                      {f.fcf_venue && <div className="text-[10px] text-[#62666d] mt-0.5 truncate max-w-[200px]" title={f.fcf_venue}>{f.fcf_venue.split('  ')[0]}</div>}
                      {f.city && <div className="text-[10px] text-[#62666d]">{f.city}</div>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {f.team
                        ? <span className="text-[#8a8f98] text-[11px]">{f.team}</span>
                        : <span className="text-[#62666d] italic text-[11px]">sense assignar</span>}
                    </td>
                    <td className="px-3 py-3 text-center text-[#d0d6e0] tabular-nums">{f.length_m}</td>
                    <td className="px-3 py-3 text-center text-[#d0d6e0] tabular-nums">{f.width_m}</td>
                    <td className={`px-3 py-3 text-center font-bold tabular-nums ${aColor}`}>{a.toLocaleString('ca-ES')}</td>
                    <td className="px-3 py-3 text-center hidden sm:table-cell">
                      {f.confirmed ? <span className="text-green-400">✓</span> : <span className="text-[#62666d]">·</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => startEdit(f)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#8a8f98] hover:text-white border border-white/8 transition-all">
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Form ── */}
      <div id="camps-form-section" className="bg-white/4 border border-white/8 rounded-lg p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-white text-sm">
              {editingName ? `Editant: ${editingName}` : 'Afegir / actualitzar camp'}
            </h2>
            <p className="text-[11px] text-[#8a8f98] mt-0.5">
              Cerca l&apos;equip per detectar automàticament el seu camp
            </p>
          </div>
          {(editingName || form.team) && (
            <button onClick={resetForm} className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[#8a8f98] border border-white/10 rounded-lg transition-colors">
              ✕ Netejar
            </button>
          )}
        </div>

        {state?.success && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/25">
            <p className="text-sm text-green-400">{state.success}</p>
          </div>
        )}
        {state?.error && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25">
            <p className="text-sm text-red-400">{state.error}</p>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="name" value={form.name} />
          <input type="hidden" name="team" value={form.team} />
          <input type="hidden" name="confirmed" value={form.confirmed ? 'on' : ''} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Step 1 — Team search */}
            <div className="sm:col-span-2 relative">
              <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5 uppercase tracking-wide">
                1. Selecciona l&apos;equip <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={teamQuery}
                onChange={e => { setTeamQuery(e.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Escriu el nom de l'equip... ex: MATARONESA"
                autoComplete="off"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#62666d] text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
              />
              {showSuggestions && (filteredTeams.length > 0 || canUseManualName) && (
                <div className="absolute z-20 top-full mt-1 w-full bg-[#0d1a2e] border border-white/15 rounded-xl shadow-xl overflow-hidden">
                  {filteredTeams.map(t => {
                    const hasField = fields.some(f => f.team?.toLowerCase() === t.name.toLowerCase())
                    const hasVenue = !!teamVenueMap[t.name]
                    // Check if a club mate already has a field saved
                    const mates = getClubMates(teamVenueMap[t.name] ?? null).filter(n => n !== t.name)
                    const mateHasField = !hasField && mates.some(mate => fields.some(f => f.team?.toLowerCase() === mate.toLowerCase()))
                    return (
                      <button
                        key={t.slug}
                        type="button"
                        onMouseDown={() => selectTeam(t)}
                        className="w-full text-left px-4 py-2.5 hover:bg-white/8 transition-colors flex items-center justify-between gap-3 border-b border-white/5 last:border-0"
                      >
                        <span className="text-sm text-[#d0d6e0] truncate">{t.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-[#62666d]">{t.competitionName}</span>
                          {hasField && <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded font-semibold">camp ✓</span>}
                          {mateHasField && <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded font-semibold">mateix club ✓</span>}
                          {hasVenue && !hasField && !mateHasField && <span className="text-[10px] px-1.5 py-0.5 bg-[#22c55e]/20 text-[#22c55e] rounded font-semibold">venue ✓</span>}
                        </div>
                      </button>
                    )
                  })}
                  {/* Manual entry option when no exact match */}
                  {canUseManualName && !exactMatchExists && (
                    <button
                      type="button"
                      onMouseDown={useManualName}
                      className="w-full text-left px-4 py-2.5 hover:bg-amber-500/10 transition-colors flex items-center justify-between gap-3 border-t border-white/10 bg-amber-500/5"
                    >
                      <span className="text-sm text-amber-300">
                        Usar &quot;{teamQuery.trim()}&quot; com a nom d&apos;equip
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-semibold">manual</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Step 2 — Detected venue */}
            {hasTeamSelected && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5 uppercase tracking-wide">
                  2. Venue detectat a les actes FCF
                </label>
                {hasDetectedVenue ? (
                  <div className="px-3 py-2.5 bg-[#22c55e]/8 border border-[#22c55e]/20 rounded-xl">
                    <div className="flex items-start gap-2">
                      <span className="text-[#22c55e] mt-0.5 shrink-0">✓</span>
                      <div>
                        <p className="text-sm text-[#d0d6e0] font-medium">{form.fcf_venue.split('  ')[0]}</p>
                        {form.fcf_venue.includes('  ') && (
                          <p className="text-[11px] text-[#8a8f98] mt-0.5">{form.fcf_venue.split('  ').slice(1).join('').trim()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                    <p className="text-xs text-amber-400/80">
                      No s&apos;ha trobat venue per a aquest equip a les actes. Introdueix-lo manualment.
                    </p>
                    <input
                      name="fcf_venue"
                      type="text"
                      value={form.fcf_venue}
                      onChange={e => set('fcf_venue', e.target.value)}
                      placeholder="ex: CAMP DE FUTBOL MPAL. ..."
                      className="mt-2 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#62666d] text-sm focus:outline-none focus:border-amber-500/50 transition-all"
                    />
                  </div>
                )}
                {hasDetectedVenue && <input type="hidden" name="fcf_venue" value={form.fcf_venue} />}

                {/* Club mates indicator */}
                {clubMates.length > 0 && (
                  <div className="mt-2 px-3 py-2.5 bg-purple-500/8 border border-purple-500/20 rounded-xl">
                    <p className="text-xs font-semibold text-purple-400 mb-1">
                      Mateix club — {clubMates.length + 1} equips comparteixen aquest camp:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] px-2 py-0.5 bg-purple-500/15 text-purple-300 rounded-md font-medium">{form.team}</span>
                      {clubMates.map(mate => {
                        const hasSaved = fields.some(f => f.team?.toLowerCase() === mate.toLowerCase())
                        return (
                          <span key={mate} className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${hasSaved ? 'bg-green-500/15 text-green-300' : 'bg-purple-500/10 text-purple-400/70'}`}>
                            {mate} {hasSaved && '✓'}
                          </span>
                        )
                      })}
                    </div>
                    {sharedFieldFrom && (
                      <p className="text-[11px] text-purple-400/60 mt-1.5">
                        Dimensions copiades de {sharedFieldFrom}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — Field name (auto-suggested, editable) */}
            {hasTeamSelected && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5 uppercase tracking-wide">
                  3. Nom del camp <span className="text-red-400">*</span>
                  {hasDetectedVenue && <span className="text-[#62666d] font-normal normal-case ml-1">(generat automàticament, pots editar-lo)</span>}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="ex: Camp Municipal de Futbol de Mataró"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#62666d] text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
                />
              </div>
            )}

            {/* Step 4 — Dimensions */}
            {hasTeamSelected && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5 uppercase tracking-wide">
                    4. Longitud (m) <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="length_m"
                    type="number"
                    min={50} max={120} step={0.5}
                    value={form.length_m}
                    onChange={e => set('length_m', e.target.value)}
                    placeholder="ex: 100"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#62666d] text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5 uppercase tracking-wide">
                    Amplada (m) <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="width_m"
                    type="number"
                    min={40} max={90} step={0.5}
                    value={form.width_m}
                    onChange={e => set('width_m', e.target.value)}
                    placeholder="ex: 62"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#62666d] text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
                  />
                </div>

                {area && !isNaN(area) && (
                  <div className="sm:col-span-2 flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/8">
                    <span className="text-xs text-[#8a8f98]">Àrea:</span>
                    <span className={`font-bold tabular-nums text-sm ${area < 5500 ? 'text-red-400' : area < 6300 ? 'text-amber-400' : 'text-green-400'}`}>
                      {area.toLocaleString('ca-ES')} m²
                    </span>
                    <span className="text-xs text-[#62666d]">{area < 5500 ? '· Camp petit' : area < 6300 ? '· Camp mitjà' : '· Camp gran'}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5 uppercase tracking-wide">Ciutat</label>
                  <input
                    name="city"
                    type="text"
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    placeholder="ex: Mataró"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#62666d] text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
                  />
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.confirmed}
                      onChange={e => set('confirmed', e.target.checked)}
                      className="w-4 h-4 rounded accent-green-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-[#d0d6e0] block">Confirmat</span>
                      <span className="text-[10px] text-[#62666d]">Dimensions verificades</span>
                    </div>
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5 uppercase tracking-wide">Notes</label>
                  <textarea
                    name="notes"
                    rows={2}
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    placeholder="Font de dades, observacions..."
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#62666d] text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all resize-none"
                  />
                </div>
              </>
            )}

            {!hasTeamSelected && (
              <div className="sm:col-span-2 py-6 text-center text-[#62666d] text-sm">
                Cerca i selecciona un equip per continuar
              </div>
            )}
          </div>

          {hasTeamSelected && (
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending || !form.name || !form.length_m || !form.width_m}
                className="px-5 py-2.5 bg-gradient-to-r bg-[#22c55e] hover:from-green-500 hover:to-[#22c55e] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all"
              >
                {isPending ? 'Desant...' : editingName ? 'Actualitzar camp' : 'Desar camp'}
              </button>
              {hasNoVenueData && (
                <p className="text-xs text-amber-400/70">Sense venue detectat — introdueix-lo manualment</p>
              )}
            </div>
          )}
        </form>
      </div>

    </div>
  )
}
