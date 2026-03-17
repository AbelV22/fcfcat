'use client'
import { useActionState } from 'react'
import { loginAdmin } from './actions'

const initialState = { error: '' }

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(loginAdmin, initialState)

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 mb-4">
            <span className="text-2xl font-black text-green-400">N</span>
          </div>
          <h1 className="text-2xl font-black text-white">NeoScout</h1>
          <p className="text-sm text-slate-500 mt-1">Accés Admin</p>
        </div>

        {/* Form card */}
        <div className="bg-white/4 border border-white/8 rounded-2xl p-6">
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Contrasenya
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
              />
            </div>

            {state?.error && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{state.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all"
            >
              {isPending ? 'Entrant...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-700 mt-4">
          NeoScout Admin Panel
        </p>
      </div>
    </div>
  )
}
