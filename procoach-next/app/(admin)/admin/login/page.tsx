'use client'
import { useActionState } from 'react'
import { loginAdmin } from './actions'

const initialState = { error: '' }

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(loginAdmin, initialState)

  return (
    <div className="min-h-screen bg-[#0f1011] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-gradient-to-br from-green-500/20 to-[#22c55e]/20 border border-green-500/30 mb-4">
            <span className="text-2xl font-black text-green-400">N</span>
          </div>
          <h1 className="text-2xl font-black text-white">NeoScout</h1>
          <p className="text-sm text-[#8a8f98] mt-1">Accés Admin</p>
        </div>

        {/* Form card */}
        <div className="bg-white/4 border border-white/8 rounded-lg p-6">
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#8a8f98] mb-1.5 uppercase tracking-wide">
                Contrasenya
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#62666d] text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
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
              className="w-full py-2.5 bg-gradient-to-r bg-[#22c55e] hover:from-green-500 hover:to-[#22c55e] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all"
            >
              {isPending ? 'Entrant...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#62666d] mt-4">
          NeoScout Admin Panel
        </p>
      </div>
    </div>
  )
}
