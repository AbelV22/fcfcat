'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trophy, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Error inesperat. Torna-ho a intentar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Header mini */}
      <header className="p-4">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={14} />
          Tornar a l'inici
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
              <Trophy size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white mb-1">Benvingut de nou</h1>
            <p className="text-slate-400 text-sm">Inicia sessió com a entrenador o ojeador</p>
          </div>

          {/* Form */}
          <div className="glass-card rounded-2xl p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Correu electrònic
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500
                               focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-300">Contrasenya</label>
                  <Link href="/forgot-password" className="text-xs text-green-400 hover:text-green-300 transition-colors">
                    Has oblidat la contrasenya?
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500
                               focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all text-sm"
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
                           transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/30"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Inicia sessió
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/8 text-center">
              <p className="text-sm text-slate-400">
                No tens compte?{' '}
                <Link href="/registre" className="text-green-400 hover:text-green-300 font-medium transition-colors">
                  Crea&apos;l gratuïtament
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-6">
            Accedint acceptes els{' '}
            <Link href="/termes" className="text-slate-500 hover:text-slate-400">termes d&apos;ús</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
