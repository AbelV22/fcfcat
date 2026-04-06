'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase-client'
import { SITE_URL } from '@/lib/supabase-config'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${SITE_URL}/auth/callback?type=recovery`,
      })
      if (err) { setError(err.message); return }
      setSent(true)
    } catch {
      setError('Error inesperat. Torna-ho a intentar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <header className="p-4">
        <Link href="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={14} />
          Tornar al login
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Image src="/logo_neoscout.png" alt="NeoScout" width={64} height={64} className="mx-auto mb-4 rounded-2xl" />
            <h1 className="text-2xl font-black text-white mb-1">Recupera la contrasenya</h1>
            <p className="text-slate-400 text-sm">T&apos;enviarem un enllaç per restablir-la</p>
          </div>

          <div className="glass-card rounded-2xl p-8">
            {sent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto mb-5">
                  <Mail size={28} className="text-green-400" />
                </div>
                <h2 className="text-xl font-black text-white mb-2">Comprova el teu correu</h2>
                <p className="text-slate-400 text-sm mb-6">
                  T&apos;hem enviat un enllaç de recuperació a{' '}
                  <span className="text-white font-medium">{email}</span>.
                  Fes clic a l&apos;enllaç per restablir la contrasenya.
                </p>
                <div className="flex items-center gap-2 justify-center text-xs text-slate-500">
                  <CheckCircle size={13} className="text-green-500" />
                  Revisa també la carpeta de spam
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
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
                      Envia l&apos;enllaç
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
