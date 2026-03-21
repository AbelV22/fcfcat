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
}

const EMPTY: Record<string, string | boolean> = {
  name: '', fcf_venue: '', team: '', city: '', length_m: '', width_m: '', confirmed: true, notes: '',
}

export default function CampsForm({ teams, fields }: Props) {
  const [state, formAction, isPending] = useActionState(saveField, {})
  const [form, setForm] = useState<Record<string, string | boolean>>(EMPTY)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [teamQuery, setTeamQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Reset form after successful save
  useEffect(() => {
    if ((state as { success?: string })?.success) {
      setForm(EMPTY)
      setEditingName(null)
      setTeamQuery('')
    }
  }, [state])

  const filteredTeams = teamQuery.length >= 2
    ? teams.filter(t => t.name.toLowerCase().includes(teamQuery.toLowerCase())).slice(0, 8)
    : []

  function selectTeam(t: TeamOption) {
    const existing = fields.find(f => f.team?.toLowerCase() === t.name.toLowerCase())
    if (existing) {
      setForm({
        name: existing.name,
        fcf_venue: existing.fcf_venue ?? '',
        team: t.name,
        city: existing.city ?? '',
        length_m: String(existing.length_m),
        width_m: String(existing.width_m),
        confirmed: existing.confirmed,
        notes: existing.notes ?? '',
      })
      setEditingName(existing.name)
    } else {
      setForm(f => ({ ...f, team: t.name }))
    }
    setTeamQuery(t.name)
    setShowSuggestions(false)
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
    document.getElementById('camps-form-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  function resetForm() {
    setForm(EMPTY)
    setEditingName(null)
    setTeamQuery('')
  }

  function set(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const area = form.length_m && form.width_m
    ? parseFloat(form.length_m as string) * parseFloat(form.width_m as string)
    : null

  return (
    <div className="space-y-6">

      {/* ── Existing fields table ── */}
      <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
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
              <tr className="border-b border-white/8 text-slate-500 text-[11px] uppercase tracking-wider">
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
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-600">
                    Cap camp registrat encara.
                  </td>
                </tr>
              )}
              {fields.map((f, i) => {
                const a = f.length_m * f.width_m
                const aColor = a < 5500 ? 'text-red-400' : a < 6300 ? 'text-amber-400' : 'text-green-400'
                const isEditing = editingName === f.name
                return (
                  <tr key={i} className={`transition-colors ${isEditing ? 'bg-green-500/8 border-l-2 border-green-500/50' : 'hover:bg-white/3'}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{f.name}</div>
                      {f.fcf_venue && (
                        <div className="text-[10px] text-slate-600 mt-0.5 truncate max-w-[180px]" title={f.fcf_venue}>
                          {f.fcf_venue}
                        </div>
                      )}
                      {f.city && <div className="text-[10px] text-slate-600">{f.city}</div>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {f.team
                        ? <span className="text-slate-400 text-[11px]">{f.team}</span>
                        : <span className="text-slate-700 italic text-[11px]">sense assignar</span>}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-300 tabular-nums">{f.length_m}</td>
                    <td className="px-3 py-3 text-center text-slate-300 tabular-nums">{f.width_m}</td>
                    <td className={`px-3 py-3 text-center font-bold tabular-nums ${aColor}`}>
                      {a.toLocaleString('ca-ES')}
                    </td>
                    <td className="px-3 py-3 text-center hidden sm:table-cell">
                      {f.confirmed ? <span className="text-green-400">✓</span> : <span className="text-slate-700">·</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => startEdit(f)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/8 transition-all"
                      >
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
      <div id="camps-form-section" className="bg-white/4 border border-white/8 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-white text-sm">
              {editingName ? `Editant: ${editingName}` : 'Afegir nou camp'}
            </h2>
            {editingName && (
              <p className="text-[11px] text-slate-500 mt-0.5">Els canvis sobreescriuran l&apos;entrada existent</p>
            )}
          </div>
          {editingName && (
            <button
              onClick={resetForm}
              className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 rounded-lg transition-colors"
            >
              ✕ Cancel·lar edició
            </button>
          )}
        </div>

        {(state as { success?: string })?.success && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/25">
            <p className="text-sm text-green-400">{(state as { success: string }).success}</p>
          </div>
        )}
        {(state as { error?: string })?.error && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25">
            <p className="text-sm text-red-400">{(state as { error: string }).error}</p>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          {/* Hidden inputs for controlled state */}
          <input type="hidden" name="name" value={form.name as string} />
          <input type="hidden" name="team" value={form.team as string} />
          <input type="hidden" name="confirmed" value={form.confirmed ? 'on' : ''} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Team search */}
            <div className="sm:col-span-2 relative">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Equip <span className="text-slate-600 font-normal normal-case">(cerca per assignar estadi)</span>
              </label>
              <input
                type="text"
                value={teamQuery}
                onChange={e => {
                  setTeamQuery(e.target.value)
                  set('team', e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Cerca equip... ex: MATARONESA"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
                autoComplete="off"
              />
              {showSuggestions && filteredTeams.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-[#0f172a] border border-white/15 rounded-xl shadow-xl overflow-hidden">
                  {filteredTeams.map(t => {
                    const hasField = fields.some(f => f.team?.toLowerCase() === t.name.toLowerCase())
                    return (
                      <button
                        key={t.slug}
                        type="button"
                        onMouseDown={() => selectTeam(t)}
                        className="w-full text-left px-4 py-2.5 hover:bg-white/8 transition-colors flex items-center justify-between gap-3"
                      >
                        <span className="text-sm text-slate-200 truncate">{t.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-600">{t.competitionName}</span>
                          {hasField && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded font-semibold">camp ✓</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {form.team && (
                <p className="text-[11px] text-slate-600 mt-1">
                  Equip assignat: <span className="text-slate-400">{form.team as string}</span>
                </p>
              )}
            </div>

            {/* Field name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Nom del camp <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name as string}
                onChange={e => set('name', e.target.value)}
                placeholder="ex: Camp Municipal de Futbol de Mataró"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
              />
            </div>

            {/* FCF venue */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Cadena venue FCF <span className="text-slate-600 font-normal normal-case">(tal com apareix a les actes)</span>
              </label>
              <input
                name="fcf_venue"
                type="text"
                value={form.fcf_venue as string}
                onChange={e => set('fcf_venue', e.target.value)}
                placeholder="ex: Camp de Futbol Mpal. Pubilla Casas"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
              />
            </div>

            {/* Length */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Longitud (m) <span className="text-red-400">*</span>
              </label>
              <input
                name="length_m"
                type="number"
                min={50} max={120} step={0.5}
                value={form.length_m as string}
                onChange={e => set('length_m', e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
              />
            </div>

            {/* Width */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Amplada (m) <span className="text-red-400">*</span>
              </label>
              <input
                name="width_m"
                type="number"
                min={40} max={90} step={0.5}
                value={form.width_m as string}
                onChange={e => set('width_m', e.target.value)}
                placeholder="62"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
              />
            </div>

            {/* Live area preview */}
            {area && !isNaN(area) && (
              <div className="sm:col-span-2 flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/8">
                <div className="text-xs text-slate-500">Àrea calculada:</div>
                <div className={`font-bold tabular-nums text-sm ${area < 5500 ? 'text-red-400' : area < 6300 ? 'text-amber-400' : 'text-green-400'}`}>
                  {area.toLocaleString('ca-ES')} m²
                </div>
                <div className="text-xs text-slate-600">
                  {area < 5500 ? '· Camp petit' : area < 6300 ? '· Camp mitjà' : '· Camp gran'}
                </div>
              </div>
            )}

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Ciutat</label>
              <input
                name="city"
                type="text"
                value={form.city as string}
                onChange={e => set('city', e.target.value)}
                placeholder="ex: Mataró"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
              />
            </div>

            {/* Confirmed */}
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.confirmed as boolean}
                  onChange={e => set('confirmed', e.target.checked)}
                  className="w-4 h-4 rounded accent-green-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-300 block">Confirmat</span>
                  <span className="text-[10px] text-slate-600">Dimensions verificades</span>
                </div>
              </label>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Notes</label>
              <textarea
                name="notes"
                rows={2}
                value={form.notes as string}
                onChange={e => set('notes', e.target.value)}
                placeholder="Font de dades, observacions..."
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending || !(form.name as string) || !(form.length_m as string) || !(form.width_m as string)}
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all"
            >
              {isPending ? 'Desant...' : editingName ? 'Actualitzar camp' : 'Desar camp'}
            </button>
            {editingName && (
              <button type="button" onClick={resetForm} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Cancel·lar
              </button>
            )}
          </div>
        </form>
      </div>

    </div>
  )
}
