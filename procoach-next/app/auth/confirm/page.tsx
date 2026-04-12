'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * /auth/confirm — Client-side email confirmation page.
 *
 * The confirmation email links HERE (not to Supabase's /verify endpoint).
 * Because this is a client-side page, email link scanners (Microsoft Safe Links,
 * Google, etc.) cannot execute the JavaScript needed to verify the token.
 * The token is only consumed when a real user's browser loads this page.
 */

function ConfirmInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const tokenHash = searchParams.get('token_hash') || ''
  const type = (searchParams.get('type') || 'email') as EmailOtpType

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  // Auto-verify on mount via useEffect-like pattern
  const [started, setStarted] = useState(false)
  if (!started) {
    setStarted(true)
    if (!tokenHash) {
      setStatus('error')
      setErrorMsg('Enllaç invàlid. No s\'ha trobat el codi de verificació.')
    } else {
      // Verify the token
      supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        .then(async ({ data, error }) => {
          if (error || !data?.user) {
            setStatus('error')
            const msg = error?.message?.toLowerCase() || ''
            if (msg.includes('expired') || msg.includes('not found')) {
              setErrorMsg('L\'enllaç ha caducat o ja s\'ha utilitzat. Torna a registrar-te.')
            } else {
              setErrorMsg('Error de verificació. Torna-ho a intentar.')
            }
            return
          }

          // Record referral if user signed up with a referral code
          const refCode = data.user.user_metadata?.referral_code
          if (refCode) {
            try {
              await fetch('/api/referral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  referral_code: refCode,
                  referred_user_id: data.user.id,
                }),
              })
            } catch {
              // Non-critical
            }
          }

          // Create referral code for the new user
          try {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
            let code = ''
            for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]

            await supabase.from('user_referral_codes')
              .insert({ user_id: data.user.id, referral_code: code })
          } catch {
            // Non-critical — callback or API will handle
          }

          // Sync team cookies
          try {
            await fetch('/api/sync-team', { method: 'POST' })
          } catch {
            // Non-critical
          }

          setStatus('success')
          // Auto-redirect to dashboard after a short delay
          setTimeout(() => router.push('/dashboard'), 1500)
        })
    }
  }

  if (status === 'verifying') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-lg bg-green-500/15 flex items-center justify-center mx-auto mb-5">
          <Loader2 size={28} className="text-green-400 animate-spin" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Verificant el teu compte...</h2>
        <p className="text-[#8a8f98] text-sm">Un moment, si us plau.</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-lg bg-red-500/15 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Error de verificació</h2>
        <p className="text-[#8a8f98] text-sm mb-6">{errorMsg}</p>
        <div className="flex flex-col gap-3">
          <Link
            href="/registre"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r bg-[#22c55e] text-white font-semibold rounded-xl transition-all text-sm"
          >
            Torna a registrar-te
          </Link>
          <Link href="/login" className="text-sm text-green-400 hover:text-green-300">
            Ja tens compte? Inicia sessió
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-lg bg-green-500/15 flex items-center justify-center mx-auto mb-5">
        <CheckCircle size={28} className="text-green-400" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">Compte confirmat!</h2>
      <p className="text-[#8a8f98] text-sm mb-4">Redirigint al panell d&apos;entrenador...</p>
      <div className="w-4 h-4 border-2 border-white/30 border-t-green-400 rounded-full animate-spin mx-auto" />
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-[#0f1011] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Image src="/logo_neoscout.png" alt="NeoScout" width={64} height={64} className="mx-auto mb-4 rounded-lg" />
          </div>
          <div className="glass-card rounded-lg p-8">
            <Suspense fallback={
              <div className="text-center py-8">
                <div className="w-4 h-4 border-2 border-white/30 border-t-green-400 rounded-full animate-spin mx-auto" />
              </div>
            }>
              <ConfirmInner />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
