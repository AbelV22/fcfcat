import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/**
 * GET /auth/callback
 * Supabase redirects here after the user clicks the confirmation link in their email.
 * Exchanges the auth code for a session, then redirects to /login.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    if (data?.user) {
      // Auto-create referral code for new user so they appear in admin immediately
      try {
        const { data: existing } = await supabase
          .from('user_referral_codes')
          .select('user_id')
          .eq('user_id', data.user.id)
          .single()

        if (!existing) {
          const refCode = generateCode()
          const { error } = await supabase
            .from('user_referral_codes')
            .insert({ user_id: data.user.id, referral_code: refCode })

          if (error?.code === '23505') {
            // Code collision — retry once
            await supabase
              .from('user_referral_codes')
              .insert({ user_id: data.user.id, referral_code: generateCode() })
          }
        }
      } catch {
        // Non-critical
      }

      // Record referral if user signed up with a referral code
      const userRefCode = data.user.user_metadata?.referral_code
      if (userRefCode) {
        try {
          await fetch(`${origin}/api/referral`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referral_code: userRefCode,
              referred_user_id: data.user.id,
            }),
          })
        } catch {
          // Non-critical — don't block login
        }
      }
    }
  }

  // Redirect to login page after email confirmation
  return NextResponse.redirect(`${origin}/login?confirmed=1`)
}
