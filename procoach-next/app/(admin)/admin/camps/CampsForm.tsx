'use client'
import { useActionState } from 'react'
import { saveField } from './actions'

const initialState: { error?: string; success?: string } = {}

export default function CampsForm() {
  const [state, formAction, isPending] = useActionState(saveField, initialState)

  return (
    <div className="bg-white/4 border border-white/8 rounded-2xl p-5 sm:p-6">
      <h2 className="font-bold text-white text-sm mb-5">Afegir / Actualitzar Camp</h2>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Field name */}
          <div className="sm:col-span-2">
            <label htmlFor="name" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Nom del camp <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="ex: Camp Municipal de Futbol de ..."
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
            />
          </div>

          {/* FCF venue string */}
          <div className="sm:col-span-2">
            <label htmlFor="fcf_venue" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Cadena de venue FCF (opcional)
            </label>
            <input
              id="fcf_venue"
              name="fcf_venue"
              type="text"
              placeholder="ex: Camp de Futbol Mpal. Pubilla Casas"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
            />
            <p className="text-[10px] text-slate-600 mt-1">Tal com apareix a les actes de la FCF (sense adreça)</p>
          </div>

          {/* Team name */}
          <div className="sm:col-span-2">
            <label htmlFor="team" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Nom exacte de l'equip FCF (opcional)
            </label>
            <input
              id="team"
              name="team"
              type="text"
              placeholder="ex: FUNDACIÓ ACADEMIA F. L'HOSPITALET A"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
            />
            <p className="text-[10px] text-slate-600 mt-1">Tal com apareix a les actes (majúscules). Permet associar camp a equip directament.</p>
          </div>

          {/* Length */}
          <div>
            <label htmlFor="length_m" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Longitud (m) <span className="text-red-400">*</span>
            </label>
            <input
              id="length_m"
              name="length_m"
              type="number"
              required
              min={50}
              max={120}
              step={0.5}
              placeholder="100"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
            />
          </div>

          {/* Width */}
          <div>
            <label htmlFor="width_m" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Amplada (m) <span className="text-red-400">*</span>
            </label>
            <input
              id="width_m"
              name="width_m"
              type="number"
              required
              min={40}
              max={90}
              step={0.5}
              placeholder="62"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Ciutat
            </label>
            <input
              id="city"
              name="city"
              type="text"
              placeholder="ex: L'Hospitalet de Llobregat"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
            />
          </div>

          {/* Confirmed */}
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                name="confirmed"
                type="checkbox"
                defaultChecked
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
            <label htmlFor="notes" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Notes (opcional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Font de dades, observacions..."
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all"
          >
            {isPending ? 'Desant...' : 'Desar camp'}
          </button>
          <p className="text-xs text-slate-600">
            Si ja existeix un camp amb el mateix nom, s'actualitzarà.
          </p>
        </div>
      </form>
    </div>
  )
}
